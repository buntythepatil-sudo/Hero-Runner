import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { getCosmeticById } from '../data/cosmetics';
import { getLevelSpec } from '../data/levels';
import {
  CharacterCustomization,
  GamePhase,
  LiveHudState,
  PowerUpType,
  WeatherMode,
} from '../types/game';
import {
  animateCharacterCelebrate,
  animateCharacterRig,
  buildCharacterRig,
  CharacterRig,
} from './characterBuilder';
import {
  BIOME_PALETTES,
  InputState,
  LevelPhysicsRuntime,
} from './levelRuntime';
import { computeSolarState, DynamicCharacterShadow } from './dynamicShadow';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { JungleWeatherSystem } from './weatherSystem';

export interface TouchInputBridge {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  firePressed: boolean;
}

interface JungleGameCanvasProps {
  levelNumber: number;
  runNonce: number;
  phase: GamePhase;
  customization: CharacterCustomization;
  autoRun: boolean;
  weatherMode: WeatherMode;
  touchBridgeRef: React.MutableRefObject<TouchInputBridge>;
  onHudUpdate: (hud: LiveHudState) => void;
  onSessionCoinsChange: (delta: number) => void;
  onBoxHit?: () => void;
  onEnemyDefeated?: () => void;
  onLevelCleared: (elapsedSeconds: number, sessionCoins: number, livesRemaining: number) => void;
  onFinishAnimationComplete: () => void;
  onGameOver: () => void;
}

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _trailVec = new THREE.Vector3();

export const JungleGameCanvas: React.FC<JungleGameCanvasProps> = ({
  levelNumber,
  runNonce,
  phase,
  customization,
  autoRun,
  weatherMode,
  touchBridgeRef,
  onHudUpdate,
  onSessionCoinsChange,
  onBoxHit,
  onEnemyDefeated,
  onLevelCleared,
  onFinishAnimationComplete,
  onGameOver,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Refs synced to animation loop without tearing down WebGL
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;
  const weatherModeRef = useRef(weatherMode);
  weatherModeRef.current = weatherMode;
  const customRef = useRef(customization);
  customRef.current = customization;

  const callbacksRef = useRef({
    onHudUpdate,
    onSessionCoinsChange,
    onBoxHit,
    onEnemyDefeated,
    onLevelCleared,
    onFinishAnimationComplete,
    onGameOver,
  });
  callbacksRef.current = {
    onHudUpdate,
    onSessionCoinsChange,
    onBoxHit,
    onEnemyDefeated,
    onLevelCleared,
    onFinishAnimationComplete,
    onGameOver,
  };

  // Wardrobe orbit drag angle
  const wardrobeYawRef = useRef(Math.PI * 0.92);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);

  // Scene refs for dynamic reload
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    textures: ProceduralTextureSet;
    runtime: LevelPhysicsRuntime;
    rig: CharacterRig;
    weather: JungleWeatherSystem;
    dynamicShadow: DynamicCharacterShadow;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    lives: number;
    sessionCoins: number;
    levelElapsed: number;
    trailSpawnAcc: number;
    finishElapsed: number;
    finishCompleted: boolean;
    finishStartPos: THREE.Vector3;
    loadLevel: (lvl: number) => void;
    rebuildCharacter: (c: CharacterCustomization) => void;
  } | null>(null);

  // Initialize WebGL once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();

    // Even outdoor sunlit sky-to-forest IBL dome (no indoor studio box hotspots)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSkyGeo = new THREE.SphereGeometry(20, 24, 16);
    const envSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        void main() {
          float h = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 groundCol = vec3(0.16, 0.28, 0.14);
          vec3 horizonCol = vec3(0.62, 0.80, 0.72);
          vec3 zenithCol = vec3(0.88, 0.96, 0.98);
          vec3 col = mix(groundCol, horizonCol, smoothstep(0.25, 0.52, h));
          col = mix(col, zenithCol, smoothstep(0.52, 0.95, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const envSkyMesh = new THREE.Mesh(envSkyGeo, envSkyMat);
    envScene.add(envSkyMesh);
    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.52;
    envSkyGeo.dispose();
    envSkyMat.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      68,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      260
    );

    const spec = getLevelSpec(levelNumber);
    const palette = BIOME_PALETTES[spec.biome];
    scene.background = new THREE.Color(palette.skyHex);
    scene.fog = new THREE.FogExp2(palette.fogHex, palette.fogDensity);

    // Even Outdoor Jungle Daylight Rig (soft sky/ground bounce + high steady overhead sun)
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 0.24);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, 1.18);
    scene.add(hemiLight);

    const shadowMapSize = isSoftwareGl ? 1024 : 2048;
    const shadowExtent = 28;
    const sunOffset = new THREE.Vector3(8, 36, 12);
    const sunLight = new THREE.DirectionalLight(palette.sunColor, 1.72);
    sunLight.position.set(sunOffset.x, sunOffset.y, sunOffset.z - 9);
    sunLight.target.position.set(0, 0, -9);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = shadowMapSize;
    sunLight.shadow.mapSize.height = shadowMapSize;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    sunLight.shadow.radius = 2.5;
    sunLight.shadow.bias = -0.00035;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Subtle back-rim fill to keep silhouettes crisp without side-glare bands
    const rimLight = new THREE.DirectionalLight(0xfff0d4, 0.48);
    rimLight.position.set(-8, 18, -18);
    scene.add(rimLight);
    scene.add(rimLight.target);

    const textures = createProceduralTextures(renderer);

    // Dynamic Time-of-Day & Weather-Reactive Projected Shadow beneath Explorer
    const dynamicShadow = new DynamicCharacterShadow();
    scene.add(dynamicShadow.mesh);

    let runtime = new LevelPhysicsRuntime(spec, textures);
    scene.add(runtime.levelGroup);

    let rig = buildCharacterRig(customRef.current);
    scene.add(rig.root);

    const weather = new JungleWeatherSystem();
    weather.resetForLevel(spec.biome, levelNumber, weatherModeRef.current);
    scene.add(weather.group);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const loadLevel = (lvl: number) => {
      if (!engineRef.current) return;
      const newSpec = getLevelSpec(lvl);
      const pal = BIOME_PALETTES[newSpec.biome];
      scene.background = new THREE.Color(pal.skyHex);
      scene.fog = new THREE.FogExp2(pal.fogHex, pal.fogDensity);
      hemiLight.color.setHex(pal.hemiSky);
      hemiLight.groundColor.setHex(pal.hemiGround);
      sunLight.color.setHex(pal.sunColor);
      soundEngine.updateEnvironment({
        biome: newSpec.biome,
        phase: phaseRef.current,
        playerY: 1,
        speedHoriz: 0,
        nearWater: newSpec.biome === 'waterfall',
      });

      scene.remove(engineRef.current.runtime.levelGroup);
      engineRef.current.runtime.dispose();

      runtime = new LevelPhysicsRuntime(newSpec, textures);
      scene.add(runtime.levelGroup);
      engineRef.current.runtime = runtime;
      engineRef.current.weather.resetForLevel(newSpec.biome, lvl, weatherModeRef.current);
      engineRef.current.lives = 3;
      engineRef.current.sessionCoins = 0;
      engineRef.current.levelElapsed = 0;
      engineRef.current.trailSpawnAcc = 0;
      engineRef.current.finishElapsed = 0;
      engineRef.current.finishCompleted = false;
      engineRef.current.finishStartPos.set(0, 1.1, 0);

      rig.root.position.set(0, 1.1, 0);
      rig.root.rotation.set(0, 0, 0);
      camera.position.set(0, 5.75, 9.6);
      camera.lookAt(0, 1.05, -8.5);
      clearAllInputs();
    };

    const rebuildCharacter = (c: CharacterCustomization) => {
      if (!engineRef.current) return;
      const prevPos = engineRef.current.rig.root.position.clone();
      scene.remove(engineRef.current.rig.root);
      engineRef.current.rig.dispose();
      rig = buildCharacterRig(c);
      rig.root.position.copy(prevPos);
      scene.add(rig.root);
      engineRef.current.rig = rig;
    };

    engineRef.current = {
      scene,
      camera,
      renderer,
      textures,
      runtime,
      rig,
      weather,
      dynamicShadow,
      sunLight,
      hemiLight,
      lives: 3,
      sessionCoins: 0,
      levelElapsed: 0,
      trailSpawnAcc: 0,
      finishElapsed: 0,
      finishCompleted: false,
      finishStartPos: new THREE.Vector3(0, 1.1, 0),
      loadLevel,
      rebuildCharacter,
    };

    // Keyboard Listeners & Input Reset Guard
    const keys: Record<string, boolean> = {};
    let jumpJustPressed = false;
    let fireJustPressed = false;

    const clearAllInputs = () => {
      for (const k of Object.keys(keys)) {
        keys[k] = false;
      }
      jumpJustPressed = false;
      fireJustPressed = false;
      const tb = touchBridgeRef.current;
      tb.left = false;
      tb.right = false;
      tb.forward = false;
      tb.backward = false;
      tb.sprint = false;
      tb.jumpPressed = false;
      tb.jumpHeld = false;
      tb.firePressed = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (phaseRef.current === 'playing') e.preventDefault();
      }
      if (!keys[e.code] && (e.code === 'Space' || e.code === 'KeyK')) {
        jumpJustPressed = true;
      }
      if (!keys[e.code] && (e.code === 'KeyF' || e.code === 'KeyJ')) {
        fireJustPressed = true;
      }
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    const onVisibilityChange = () => {
      if (document.hidden) clearAllInputs();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllInputs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', onResize);

    // Camera initial placement slightly further behind character
    camera.position.set(0, 5.75, 9.6);
    camera.lookAt(0, 1.05, -8.5);

    const clock = new THREE.Clock();
    let frameId = 0;
    let hudEmitTimer = 0;
    let totalTime = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed || !engineRef.current) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      totalTime += dt;
      const eng = engineRef.current;
      const rt = eng.runtime;
      const activePhase = phaseRef.current;

      if (activePhase === 'playing') {
        eng.levelElapsed += dt;
        const tb = touchBridgeRef.current;
        const input: InputState = {
          forward: Boolean(keys.KeyW || keys.ArrowUp || tb.forward),
          backward: Boolean(keys.KeyS || keys.ArrowDown || tb.backward),
          left: Boolean(keys.KeyA || keys.ArrowLeft || tb.left),
          right: Boolean(keys.KeyD || keys.ArrowRight || tb.right),
          sprint: Boolean(keys.ShiftLeft || keys.ShiftRight || tb.sprint),
          jumpPressed: jumpJustPressed || tb.jumpPressed,
          jumpHeld: Boolean(keys.Space || keys.KeyK || tb.jumpHeld),
          firePressed: fireJustPressed || tb.firePressed,
          autoRun: autoRunRef.current,
        };
        jumpJustPressed = false;
        fireJustPressed = false;
        tb.jumpPressed = false;
        tb.firePressed = false;

        rt.triggerJump(input.jumpPressed);

        const trailCosmetic = getCosmeticById(customRef.current.trail);
        const trailHex = trailCosmetic
          ? new THREE.Color(trailCosmetic.primaryHex).getHex()
          : 0xd6d3d1;

        let clearedNow = false;
        const stepInfo = rt.step(dt, input, trailHex, {
          onCoin: (amt) => {
            eng.sessionCoins += amt;
            callbacksRef.current.onSessionCoinsChange(amt);
          },
          onHurt: () => {
            eng.lives = Math.max(0, eng.lives - 1);
            if (eng.lives <= 0) {
              callbacksRef.current.onGameOver();
            }
          },
          onGoal: () => {
            if (phaseRef.current === 'playing' && !clearedNow) {
              clearedNow = true;
              phaseRef.current = 'finishing';
              eng.finishElapsed = 0;
              eng.finishCompleted = false;
              eng.finishStartPos.set(
                rt.playerBody.position.x,
                rt.playerBody.position.y - rt.playerRadius,
                rt.playerBody.position.z
              );
              callbacksRef.current.onLevelCleared(eng.levelElapsed, eng.sessionCoins, eng.lives);
            }
          },
          onPowerUp: (_p: PowerUpType) => {},
          onFellInChasm: () => {
            eng.lives = Math.max(0, eng.lives - 1);
            if (eng.lives <= 0) {
              callbacksRef.current.onGameOver();
            } else {
              rt.respawnOnNearestSafePlatform();
            }
          },
          onBoxHit: () => {
            callbacksRef.current.onBoxHit?.();
          },
          onEnemyDefeated: () => {
            callbacksRef.current.onEnemyDefeated?.();
          },
        }, eng.weather.rainStrength);

        // Sync Rig Position & Orientation
        eng.rig.root.position.set(
          rt.playerBody.position.x,
          stepInfo.footY,
          rt.playerBody.position.z
        );

        // Double jump 360 front flip centered around explorer's waist/center of mass
        const flipProgress = rt.flipAnimTimer > 0 ? 1 - rt.flipAnimTimer / 0.52 : 0;
        if (flipProgress > 0) {
          const eased = flipProgress * flipProgress * (3 - 2 * flipProgress);
          const theta = -eased * Math.PI * 2;
          const centerY = 0.92;
          eng.rig.root.rotation.x = theta;
          eng.rig.root.position.y += centerY * (1 - Math.cos(theta));
          eng.rig.root.position.z -= centerY * Math.sin(theta);
        } else {
          eng.rig.root.rotation.x = 0;
        }

        // Flash on invulnerability
        eng.rig.bodyPivot.visible =
          rt.invulnTimer <= 0 || Math.floor(rt.invulnTimer * 16) % 2 === 0;
        eng.rig.shieldOrb.visible = rt.activePowerUp === 'shield';
        eng.rig.shieldOrb.rotation.y += dt * 1.8;

        animateCharacterRig(
          eng.rig,
          stepInfo.speedHoriz,
          stepInfo.velY,
          rt.grounded,
          totalTime,
          stepInfo.strafeVelX,
          false,
          rt.activePowerUp === 'blaster',
          flipProgress
        );

        // Emit Cosmetic Trail Particles while running/jumping
        if (customRef.current.trail !== 'trail_none' && stepInfo.speedHoriz > 2.2) {
          eng.trailSpawnAcc += dt;
          if (eng.trailSpawnAcc > 0.06) {
            eng.trailSpawnAcc = 0;
            _trailVec.set(
              eng.rig.root.position.x + (Math.random() - 0.5) * 0.4,
              eng.rig.root.position.y + 0.35 + Math.random() * 0.4,
              eng.rig.root.position.z + 0.35
            );
            rt.spawnBurst(_trailVec, trailHex, 2);
          }
        }

        // Shadow updated below after weather & solar calculation for all phases

        // Smooth Portrait Rear-Chase Mario Camera with subtle speed FOV
        const targetFov = 68 + Math.min(7, stepInfo.speedHoriz * 0.5);
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();

        _camTargetPos.set(
          eng.rig.root.position.x * 0.72,
          eng.rig.root.position.y + 5.75,
          eng.rig.root.position.z + 9.6
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 6.0, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 8.5, dt);

        _camLookAt.set(
          eng.rig.root.position.x * 0.65,
          eng.rig.root.position.y + 1.05,
          eng.rig.root.position.z - 8.5
        );
        camera.lookAt(_camLookAt);

        // Emit HUD state at ~15Hz to keep React ultra-fast
        hudEmitTimer += dt;
        if (hudEmitTimer >= 0.066) {
          hudEmitTimer = 0;
          const progress = THREE.MathUtils.clamp(
            -rt.playerBody.position.z / Math.max(1, Math.abs(rt.spec.goalZ)),
            0,
            1
          );
          callbacksRef.current.onHudUpdate({
            level: rt.spec.levelNumber,
            levelName: rt.spec.name,
            biome: rt.spec.biome,
            lives: eng.lives,
            maxLives: 3,
            sessionCoins: eng.sessionCoins,
            progress,
            elapsedTime: eng.levelElapsed,
            speedMps: stepInfo.speedHoriz,
            activePowerUp: rt.activePowerUp,
            powerUpRemaining: rt.powerUpTimer,
            stompCombo: rt.stompCombo,
            weather: eng.weather.getActiveWeather(),
          });
          const platKind = rt.standingPlatform?.spec.kind;
          soundEngine.updateEnvironment({
            biome: rt.spec.biome,
            phase: activePhase,
            playerY: stepInfo.footY,
            speedHoriz: stepInfo.speedHoriz,
            nearWater:
              platKind === 'bridge' ||
              platKind === 'ice' ||
              rt.spec.biome === 'waterfall',
            rainLevel: eng.weather.rainStrength,
          });
        }
      } else if (activePhase === 'finishing') {
        clearAllInputs();
        eng.finishElapsed += dt;
        rt.stepFinishCelebration(dt);
        eng.rig.bodyPivot.visible = true;
        eng.rig.shieldOrb.visible = false;
        eng.rig.root.rotation.x = 0;

        // Smoothly guide explorer into temple sanctuary center, then jump & cheer!
        const moveT = THREE.MathUtils.smoothstep(eng.finishElapsed, 0, 0.45);
        const hopY = animateCharacterCelebrate(eng.rig, eng.finishElapsed, totalTime);
        const targetX = THREE.MathUtils.lerp(eng.finishStartPos.x, 0, moveT);
        const targetZ = THREE.MathUtils.lerp(eng.finishStartPos.z, rt.spec.goalZ - 1.15, moveT);
        const baseY = THREE.MathUtils.lerp(eng.finishStartPos.y, rt.spec.goalY, moveT);
        eng.rig.root.position.set(targetX, baseY + hopY, targetZ);

        // Hero celebration camera sweeping to frame explorer + goal temple arch
        camera.fov = THREE.MathUtils.damp(camera.fov, 60, 4.5, dt);
        camera.updateProjectionMatrix();
        _camTargetPos.set(
          Math.sin(eng.finishElapsed * 0.65) * 2.1,
          rt.spec.goalY + 2.45,
          rt.spec.goalZ + 5.75
        );
        camera.position.lerp(_camTargetPos, Math.min(1, dt * 3.8));
        _camLookAt.set(0, rt.spec.goalY + 1.45, rt.spec.goalZ - 0.8);
        camera.lookAt(_camLookAt);

        if (eng.finishElapsed >= 2.05 && !eng.finishCompleted) {
          eng.finishCompleted = true;
          callbacksRef.current.onFinishAnimationComplete();
        }
      } else if (activePhase === 'wardrobe') {
        clearAllInputs();
        // Orbit around explorer in 3D Wardrobe Studio
        eng.rig.bodyPivot.visible = true;
        eng.rig.root.rotation.x = 0;
        const px = eng.rig.root.position.x;
        const py = eng.rig.root.position.y;
        const pz = eng.rig.root.position.z;

        if (!draggingRef.current) {
          wardrobeYawRef.current += dt * 0.35;
        }
        const dist = 5.1;
        const cx = px + Math.sin(wardrobeYawRef.current) * dist;
        const cz = pz + Math.cos(wardrobeYawRef.current) * dist;
        _camTargetPos.set(cx, py + 1.85, cz);
        camera.position.lerp(_camTargetPos, 0.14);
        // Aim slightly lower so realistic explorer stands clearly in the top half above the bottom wardrobe sheet
        _camLookAt.set(px, py + 0.55, pz);
        camera.lookAt(_camLookAt);
        animateCharacterRig(eng.rig, 0, 0, true, totalTime, 0, true);
      } else {
        clearAllInputs();
        // Menu / paused gentle idle camera behind character
        rt.stepIdleAmbient(dt, eng.weather.rainStrength);
        eng.rig.bodyPivot.visible = true;
        animateCharacterRig(eng.rig, 0, 0, true, totalTime, 0, true);
        _camTargetPos.set(
          eng.rig.root.position.x + Math.sin(totalTime * 0.4) * 1.1,
          eng.rig.root.position.y + 4.4,
          eng.rig.root.position.z + 9.0
        );
        camera.position.lerp(_camTargetPos, 0.08);
        _camLookAt.set(
          eng.rig.root.position.x,
          eng.rig.root.position.y + 1.25,
          eng.rig.root.position.z - 6
        );
        camera.lookAt(_camLookAt);
      }

      // Dynamic Weather (light rain & mist particles + atmosphere tinting)
      const biomePalette = BIOME_PALETTES[rt.spec.biome];
      eng.weather.update(
        dt,
        weatherModeRef.current,
        activePhase === 'playing',
        rt.spec.biome,
        biomePalette,
        eng.rig.root.position.x,
        eng.rig.root.position.y,
        eng.rig.root.position.z,
        scene,
        eng.sunLight,
        eng.hemiLight
      );

      // Solar Time-of-Day Angle & Dynamic Projected Shadow (opacity, softness, stretch & altitude falloff)
      const solar = computeSolarState(rt.spec.biome, rt.spec.levelNumber, eng.levelElapsed);
      const texelSize = (shadowExtent * 2) / shadowMapSize;
      const rawTargetX = eng.rig.root.position.x;
      const rawTargetY = eng.rig.root.position.y;
      const rawTargetZ = eng.rig.root.position.z - 9;
      const snapX = Math.round(rawTargetX / texelSize) * texelSize;
      const snapY = Math.round(rawTargetY / texelSize) * texelSize;
      const snapZ = Math.round(rawTargetZ / texelSize) * texelSize;

      eng.sunLight.target.position.set(snapX, snapY, snapZ);
      eng.sunLight.target.updateMatrixWorld();
      eng.sunLight.position.set(
        snapX + solar.sunOffset.x,
        snapY + solar.sunOffset.y,
        snapZ + solar.sunOffset.z
      );

      rimLight.target.position.copy(eng.rig.root.position);
      rimLight.target.updateMatrixWorld();
      rimLight.position.set(
        eng.rig.root.position.x - 8,
        eng.rig.root.position.y + 18,
        eng.rig.root.position.z - 18
      );

      const shadowFootY =
        activePhase === 'playing'
          ? rt.playerBody.position.y - rt.playerRadius
          : eng.rig.root.position.y;
      const groundHitY = rt.sampleGroundBelow(
        eng.rig.root.position.x,
        shadowFootY + rt.playerRadius,
        eng.rig.root.position.z
      );
      eng.dynamicShadow.update(
        dt,
        eng.rig.root.position.x,
        shadowFootY,
        eng.rig.root.position.z,
        groundHitY,
        solar,
        eng.weather.rainStrength,
        eng.weather.mistStrength,
        biomePalette.sunColor,
        eng.sunLight
      );

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      runtime.dispose();
      rig.dispose();
      weather.dispose();
      dynamicShadow.dispose();
      textures.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
  }, []);

  // Reload level when levelNumber or runNonce changes
  useEffect(() => {
    engineRef.current?.loadLevel(levelNumber);
  }, [levelNumber, runNonce]);

  // Rebuild 3D character rig live when customization changes
  useEffect(() => {
    engineRef.current?.rebuildCharacter(customization);
  }, [customization]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        if (phase === 'wardrobe') {
          draggingRef.current = true;
          lastPointerXRef.current = e.clientX;
        }
      }}
      onPointerMove={(e) => {
        if (phase === 'wardrobe' && draggingRef.current) {
          const dx = e.clientX - lastPointerXRef.current;
          lastPointerXRef.current = e.clientX;
          wardrobeYawRef.current += dx * 0.012;
        }
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    />
  );
};
