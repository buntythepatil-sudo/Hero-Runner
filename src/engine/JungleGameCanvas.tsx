import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { getCosmeticById } from '../data/cosmetics';
import { getLevelSpec } from '../data/levels';
import {
  CharacterCustomization,
  GamePhase,
  GraphicsQuality,
  LiveHudState,
  PowerUpType,
  WeatherMode,
} from '../types/game';
import {
  animateCharacterCelebrate,
  buildCharacterRig,
  CharacterRig,
} from './characterBuilder';
import { updateCharacterKinematics } from './characterKinematics';
import {
  BIOME_PALETTES,
  InputState,
  LevelPhysicsRuntime,
} from './levelRuntime';
import {
  computeSolarState,
  DynamicCharacterShadow,
  DynamicObstacleShadowSystem,
  ObstacleShadowCaster,
} from './dynamicShadow';
import {
  FestivalBackgroundSystem,
  getFestivalBiomePalette,
  getFestivalForLevel,
} from './festivalSystem';
import { FloatingScore3DSystem } from './floatingScore3D';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { JungleWeatherSystem } from './weatherSystem';

const _audioCamForward = new THREE.Vector3(0, -0.15, -1);

export interface TouchInputBridge {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  laneLeftPressed: boolean;
  laneRightPressed: boolean;
  firePressed: boolean;
}

interface JungleGameCanvasProps {
  levelNumber: number;
  runNonce: number;
  phase: GamePhase;
  customization: CharacterCustomization;
  autoRun: boolean;
  weatherMode: WeatherMode;
  graphicsQuality: GraphicsQuality;
  festivalMode: boolean;
  touchBridgeRef: React.MutableRefObject<TouchInputBridge>;
  onHudUpdate: (hud: LiveHudState) => void;
  onSessionCoinsChange: (delta: number) => void;
  onBoxHit?: () => void;
  onEnemyDefeated?: () => void;
  onLevelCleared: (elapsedSeconds: number, sessionCoins: number, livesRemaining: number) => void;
  onFinishAnimationComplete: () => void;
  onGameOver: (sessionCoins: number, progress: number) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _trailVec = new THREE.Vector3();

function triggerLifeLossVibration(isFatal: boolean) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(isFatal ? [160, 55, 130, 55, 190] : [115, 45, 95]);
    } catch {
      // Ignore if vibration is blocked by browser permissions
    }
  }
}

export const JungleGameCanvas: React.FC<JungleGameCanvasProps> = ({
  levelNumber,
  runNonce,
  phase,
  customization,
  autoRun,
  weatherMode,
  graphicsQuality,
  festivalMode,
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
  const graphicsQualityRef = useRef(graphicsQuality);
  graphicsQualityRef.current = graphicsQuality;
  const festivalModeRef = useRef(festivalMode);
  festivalModeRef.current = festivalMode;
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

  // Wardrobe orbit drag angle & mobile gameplay swipe gesture state
  const wardrobeYawRef = useRef(Math.PI * 0.92);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const swipeStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    pivotX: number;
    lastDir: -1 | 0 | 1;
    consumed: boolean;
    sprintTimeout: number | null;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    pivotX: 0,
    lastDir: 0,
    consumed: false,
    sprintTimeout: null,
  });

  // Scene refs for dynamic reload
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    textures: ProceduralTextureSet;
    runtime: LevelPhysicsRuntime;
    rig: CharacterRig;
    weather: JungleWeatherSystem;
    festival: FestivalBackgroundSystem;
    dynamicShadow: DynamicCharacterShadow;
    obstacleShadows: DynamicObstacleShadowSystem;
    floatingScores: FloatingScore3DSystem;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    lives: number;
    sessionCoins: number;
    levelElapsed: number;
    trailSpawnAcc: number;
    finishElapsed: number;
    finishCompleted: boolean;
    finishStartPos: THREE.Vector3;
    deathElapsed: number;
    hitVibrationTimer: number;
    hitVibrationDuration: number;
    camGroundY: number;
    camLookCurrent: THREE.Vector3;
    loadLevel: (lvl: number) => void;
    rebuildCharacter: (c: CharacterCustomization) => void;
    applyGraphicsQuality: (q: GraphicsQuality) => void;
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

    const getTargetPixelRatio = (q: GraphicsQuality) => {
      if (isSoftwareGl) return 1;
      const dpr = window.devicePixelRatio || 1;
      if (q === 'low') return 1;
      if (q === 'medium') return Math.min(dpr, 1.5);
      return Math.min(dpr, 2);
    };

    const getTargetShadowSize = (q: GraphicsQuality) => {
      if (isSoftwareGl || q === 'low') return 512;
      return q === 'medium' ? 1024 : 2048;
    };

    const initialQ = graphicsQualityRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: initialQ === 'low' ? 'default' : 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(getTargetPixelRatio(initialQ));
    renderer.shadowMap.enabled = !isSoftwareGl && initialQ !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();

    // Cinematic sunlit jungle sky-to-canopy IBL dome with golden sun glint & verdant ground bounce
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSkyGeo = new THREE.SphereGeometry(20, 28, 18);
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
          vec3 groundCol = vec3(0.14, 0.30, 0.14);
          vec3 horizonCol = vec3(0.68, 0.84, 0.72);
          vec3 zenithCol = vec3(0.84, 0.95, 1.0);
          vec3 col = mix(groundCol, horizonCol, smoothstep(0.24, 0.50, h));
          col = mix(col, zenithCol, smoothstep(0.50, 0.94, h));
          vec3 sunDir = normalize(vec3(0.24, 0.78, 0.42));
          float sunDot = max(0.0, dot(vWorldDir, sunDir));
          col += vec3(1.0, 0.91, 0.68) * pow(sunDot, 16.0) * 0.65;
          col += vec3(1.0, 0.96, 0.85) * smoothstep(0.985, 0.999, sunDot) * 1.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const envSkyMesh = new THREE.Mesh(envSkyGeo, envSkyMat);
    envScene.add(envSkyMesh);
    const envRT = pmremGenerator.fromScene(envScene, 0.035);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.64;
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

    // Cinematic Outdoor Jungle Daylight Rig (soft emerald bounce + crisp warm sunlight + golden rim)
    const ambientLight = new THREE.AmbientLight(0xfff6e0, 0.28);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, 1.24);
    scene.add(hemiLight);

    let currentShadowMapSize = getTargetShadowSize(initialQ);
    const shadowExtent = 28;
    const sunOffset = new THREE.Vector3(8, 36, 12);
    const sunLight = new THREE.DirectionalLight(palette.sunColor, 1.82);
    sunLight.position.set(sunOffset.x, sunOffset.y, sunOffset.z - 9);
    sunLight.target.position.set(0, 0, -9);
    sunLight.castShadow = !isSoftwareGl && initialQ !== 'low';
    sunLight.shadow.mapSize.width = currentShadowMapSize;
    sunLight.shadow.mapSize.height = currentShadowMapSize;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    sunLight.shadow.radius = 2.6;
    sunLight.shadow.bias = -0.00035;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Warm golden canopy back-rim fill to sculpt character & foliage silhouettes
    const rimLight = new THREE.DirectionalLight(0xffe6b3, 0.62);
    rimLight.position.set(-8, 18, -18);
    scene.add(rimLight);
    scene.add(rimLight.target);

    const textures = createProceduralTextures(renderer);

    // Dynamic Time-of-Day & Weather-Reactive Projected Shadows (Explorer + Moving Obstacles)
    const dynamicShadow = new DynamicCharacterShadow();
    scene.add(dynamicShadow.mesh);

    const obstacleShadows = new DynamicObstacleShadowSystem();
    scene.add(obstacleShadows.group);
    const obstacleShadowCasters: ObstacleShadowCaster[] = [];

    const floatingScores = new FloatingScore3DSystem();
    scene.add(floatingScores.group);

    let runtime = new LevelPhysicsRuntime(spec, textures, initialQ);
    scene.add(runtime.levelGroup);

    let rig = buildCharacterRig(customRef.current);
    scene.add(rig.root);

    const weather = new JungleWeatherSystem();
    weather.resetForLevel(spec.biome, levelNumber, weatherModeRef.current);
    scene.add(weather.group);

    const festival = new FestivalBackgroundSystem();
    festival.setEnabled(festivalModeRef.current, getFestivalForLevel(levelNumber));
    scene.add(festival.group);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const loadLevel = (lvl: number) => {
      if (!engineRef.current) return;
      const newSpec = getLevelSpec(lvl);
      const basePal = BIOME_PALETTES[newSpec.biome];
      const activeFest = getFestivalForLevel(lvl);
      const pal = festivalModeRef.current
        ? getFestivalBiomePalette(basePal, activeFest)
        : basePal;
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

      soundEngine.clearSpatialSources();
      scene.remove(engineRef.current.runtime.levelGroup);
      engineRef.current.runtime.dispose();

      runtime = new LevelPhysicsRuntime(newSpec, textures, graphicsQualityRef.current);
      scene.add(runtime.levelGroup);
      engineRef.current.runtime = runtime;
      engineRef.current.weather.resetForLevel(newSpec.biome, lvl, weatherModeRef.current);
      engineRef.current.festival.setEnabled(festivalModeRef.current, activeFest);
      engineRef.current.obstacleShadows.clear();
      engineRef.current.floatingScores.clear();
      engineRef.current.lives = 3;
      engineRef.current.sessionCoins = 0;
      engineRef.current.levelElapsed = 0;
      engineRef.current.trailSpawnAcc = 0;
      engineRef.current.finishElapsed = 0;
      engineRef.current.finishCompleted = false;
      engineRef.current.finishStartPos.set(0, 1.1, 0);
      engineRef.current.deathElapsed = 0;
      engineRef.current.hitVibrationTimer = 0;
      engineRef.current.hitVibrationDuration = 0.38;
      engineRef.current.camGroundY = 1.1;
      engineRef.current.camLookCurrent.set(0, 2.5, -8.5);

      rig.root.position.set(0, 1.1, 0);
      rig.root.rotation.set(0, 0, 0);
      rig.langoorPet.root.visible = false;
      camera.position.set(0, 6.1, 10.1);
      camera.lookAt(0, 1.45, -8.5);
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

    const applyGraphicsQuality = (q: GraphicsQuality) => {
      renderer.setPixelRatio(getTargetPixelRatio(q));
      const enableShadows = !isSoftwareGl && q !== 'low';
      renderer.shadowMap.enabled = enableShadows;
      sunLight.castShadow = enableShadows;
      const targetShadowSize = getTargetShadowSize(q);
      if (targetShadowSize !== currentShadowMapSize) {
        currentShadowMapSize = targetShadowSize;
        sunLight.shadow.mapSize.set(targetShadowSize, targetShadowSize);
        if (sunLight.shadow.map) {
          sunLight.shadow.map.dispose();
          sunLight.shadow.map = null;
        }
      }
      scene.environmentIntensity = q === 'low' ? 0.48 : q === 'medium' ? 0.58 : 0.64;
      rimLight.intensity = q === 'low' ? 0.42 : 0.62;
      renderer.shadowMap.needsUpdate = true;
    };

    engineRef.current = {
      scene,
      camera,
      renderer,
      textures,
      runtime,
      rig,
      weather,
      festival,
      dynamicShadow,
      obstacleShadows,
      floatingScores,
      sunLight,
      hemiLight,
      lives: 3,
      sessionCoins: 0,
      levelElapsed: 0,
      trailSpawnAcc: 0,
      finishElapsed: 0,
      finishCompleted: false,
      finishStartPos: new THREE.Vector3(0, 1.1, 0),
      deathElapsed: 0,
      hitVibrationTimer: 0,
      hitVibrationDuration: 0.38,
      camGroundY: 1.1,
      camLookCurrent: new THREE.Vector3(0, 2.5, -8.5),
      loadLevel,
      rebuildCharacter,
      applyGraphicsQuality,
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
      tb.laneLeftPressed = false;
      tb.laneRightPressed = false;
      tb.firePressed = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (phaseRef.current === 'playing') e.preventDefault();
      }
      if (
        !keys[e.code] &&
        (e.code === 'Space' ||
          e.code === 'KeyK' ||
          (autoRunRef.current && (e.code === 'ArrowUp' || e.code === 'KeyW')))
      ) {
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
      renderer.setPixelRatio(getTargetPixelRatio(graphicsQualityRef.current));
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', onResize);

    // Camera initial placement framed for 1.25x explorer
    camera.position.set(0, 6.1, 10.1);
    camera.lookAt(0, 1.45, -8.5);

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
      if (document.hidden) {
        clock.getDelta();
        frameId = window.setTimeout(tick, 250);
        return;
      }
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
          backward: Boolean(tb.backward),
          left: Boolean(keys.KeyA || keys.ArrowLeft || tb.left),
          right: Boolean(keys.KeyD || keys.ArrowRight || tb.right),
          sprint: Boolean(keys.ShiftLeft || keys.ShiftRight || tb.sprint),
          jumpPressed: jumpJustPressed || tb.jumpPressed,
          jumpHeld: Boolean(keys.Space || keys.KeyK || tb.jumpHeld),
          laneLeftPressed: tb.laneLeftPressed,
          laneRightPressed: tb.laneRightPressed,
          firePressed: fireJustPressed || tb.firePressed,
          autoRun: autoRunRef.current,
        };
        jumpJustPressed = false;
        fireJustPressed = false;
        tb.jumpPressed = false;
        tb.laneLeftPressed = false;
        tb.laneRightPressed = false;
        tb.firePressed = false;

        rt.triggerJump(input.jumpPressed);

        const trailCosmetic = getCosmeticById(customRef.current.trail);
        const trailHex = trailCosmetic
          ? new THREE.Color(trailCosmetic.primaryHex).getHex()
          : 0xd6d3d1;

        let clearedNow = false;
        let stepCoinsCollected = 0;
        let stepEnemiesDefeated = 0;
        let stepExtraLife = false;
        const stepInfo = rt.step(dt, input, trailHex, {
          onCoin: (amt) => {
            eng.sessionCoins += amt;
            stepCoinsCollected += amt;
            callbacksRef.current.onSessionCoinsChange(amt);
          },
          onHurt: () => {
            eng.lives = Math.max(0, eng.lives - 1);
            const isFatal = eng.lives <= 0;
            eng.hitVibrationDuration = isFatal ? 0.52 : 0.36;
            eng.hitVibrationTimer = eng.hitVibrationDuration;
            triggerLifeLossVibration(isFatal);
            if (isFatal) {
              eng.deathElapsed = 0;
              const progress = THREE.MathUtils.clamp(
                -rt.playerBody.position.z / Math.max(1, Math.abs(rt.spec.goalZ)),
                0,
                1
              );
              callbacksRef.current.onGameOver(eng.sessionCoins, progress);
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
            const isFatal = eng.lives <= 0;
            eng.hitVibrationDuration = isFatal ? 0.52 : 0.36;
            eng.hitVibrationTimer = eng.hitVibrationDuration;
            triggerLifeLossVibration(isFatal);
            if (isFatal) {
              eng.deathElapsed = 0;
              const progress = THREE.MathUtils.clamp(
                -rt.playerBody.position.z / Math.max(1, Math.abs(rt.spec.goalZ)),
                0,
                1
              );
              callbacksRef.current.onGameOver(eng.sessionCoins, progress);
            } else {
              rt.respawnOnNearestSafePlatform();
            }
          },
          onBoxHit: () => {
            callbacksRef.current.onBoxHit?.();
          },
          onEnemyDefeated: () => {
            stepEnemiesDefeated += 1;
            callbacksRef.current.onEnemyDefeated?.();
          },
          onExtraLife: () => {
            if (eng.lives > 0 && eng.lives < 3) {
              eng.lives = Math.min(3, eng.lives + 1);
              stepExtraLife = true;
              return true;
            }
            return false;
          },
        }, eng.weather.rainStrength);

        // Spawn 3D floating text scores above character head for coins, enemy defeats & extra lives
        const scoreAnchorX = rt.playerBody.position.x;
        const scoreAnchorY = stepInfo.footY + 2.55;
        const scoreAnchorZ = rt.playerBody.position.z;
        if (stepExtraLife) {
          eng.floatingScores.spawn('+1 LIFE', scoreAnchorX, scoreAnchorY + 0.35, scoreAnchorZ, 'life');
        }
        if (stepEnemiesDefeated > 0) {
          const scorePts = Math.max(50, stepCoinsCollected * 25);
          const isCombo = rt.stompCombo > 1;
          const label = isCombo ? `+${scorePts} x${rt.stompCombo}` : `+${scorePts} KO`;
          eng.floatingScores.spawn(
            label,
            scoreAnchorX,
            scoreAnchorY + (stepExtraLife ? 0.72 : 0.12),
            scoreAnchorZ,
            isCombo ? 'combo' : 'enemy'
          );
        } else if (stepCoinsCollected > 0) {
          const coinPts = stepCoinsCollected * 25;
          eng.floatingScores.spawn(`+${coinPts}`, scoreAnchorX, scoreAnchorY, scoreAnchorZ, 'coin');
        }

        // Decay impact vibration envelope for tactile screen & character shudder when losing a life
        let vibEnv = 0;
        if (eng.hitVibrationTimer > 0) {
          eng.hitVibrationTimer = Math.max(0, eng.hitVibrationTimer - dt);
          const norm = eng.hitVibrationTimer / Math.max(0.01, eng.hitVibrationDuration);
          vibEnv = norm * norm;
        }

        // Sync Rig Position & Orientation
        const charShudderX = vibEnv > 0 ? Math.sin(totalTime * 88) * 0.095 * vibEnv : 0;
        eng.rig.root.position.set(
          rt.playerBody.position.x + charShudderX,
          stepInfo.footY,
          rt.playerBody.position.z
        );

        // Double jump 360 front flip centered around 1.25x explorer's waist/center of mass
        const flipProgress = rt.flipAnimTimer > 0 ? 1 - rt.flipAnimTimer / 0.52 : 0;
        if (flipProgress > 0) {
          const eased = flipProgress * flipProgress * (3 - 2 * flipProgress);
          const theta = -eased * Math.PI * 2;
          const centerY = 0.92 * 1.25;
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

        // Temple Run-style 10-State Character Kinematics & Quaternion Blending
        const kinOut = updateCharacterKinematics(eng.rig, {
          speedHoriz: stepInfo.speedHoriz,
          velY: stepInfo.velY,
          grounded: rt.grounded,
          time: totalTime,
          dt,
          strafeVelX: stepInfo.strafeVelX,
          laneSwitchDir: stepInfo.laneSwitchDir,
          laneSwitchProgress: stepInfo.laneSwitchProgress,
          isSliding: stepInfo.isSliding,
          slideProgress: stepInfo.slideProgress,
          jumpAnticipation: stepInfo.jumpAnticipation,
          landingTimer: stepInfo.landingTimer,
          landingImpact: stepInfo.landingImpact,
          stumbleTimer: stepInfo.stumbleTimer,
          stumbleDir: stepInfo.stumbleDir,
          isDead: eng.lives <= 0,
          deathElapsed: eng.deathElapsed,
          hasBlaster: rt.activePowerUp === 'blaster',
          flipProgress,
          isSwinging: stepInfo.isSwinging,
          vineAngle: stepInfo.vineAngle,
          vineAngVel: stepInfo.vineAngVel,
          hasLangoorPet: stepInfo.hasLangoorPet,
          langoorCheerTimer: stepInfo.langoorCheerTimer,
        });

        // Emit subtle cosmetic trail particles only while running on the ground (none while jumping/airborne)
        if (
          customRef.current.trail !== 'trail_none' &&
          rt.grounded &&
          !stepInfo.isSwinging &&
          stepInfo.speedHoriz > 2.2
        ) {
          eng.trailSpawnAcc += dt;
          if (eng.trailSpawnAcc >= 0.17) {
            eng.trailSpawnAcc = 0;
            _trailVec.set(
              eng.rig.root.position.x + (Math.random() - 0.5) * 0.24,
              eng.rig.root.position.y + (stepInfo.isSliding ? 0.1 : 0.16) + Math.random() * 0.12,
              eng.rig.root.position.z + 0.34
            );
            rt.spawnRunTrail(_trailVec, trailHex);
          }
        } else {
          eng.trailSpawnAcc = 0;
        }

        // Temple Run-Style Smooth Third-Person Follow Camera:
        // - Smooth lane tracking with subtle look-ahead
        // - Gentle rhythmic stride bob while running (never shaky)
        // - Partial jump elevation lift so landing pads & upcoming obstacles stay visible
        // - Subtle low-angle dip when sliding
        // - Soft cushioned recoil on stumble
        if (rt.grounded) {
          eng.camGroundY = THREE.MathUtils.damp(eng.camGroundY, stepInfo.footY, 8.5, dt);
        } else if (stepInfo.isSwinging) {
          eng.camGroundY = THREE.MathUtils.damp(eng.camGroundY, stepInfo.footY - 0.35, 5.5, dt);
        } else if (stepInfo.footY < eng.camGroundY - 2.0) {
          // Follow down quickly when dropping to a lower platform
          eng.camGroundY = THREE.MathUtils.damp(eng.camGroundY, stepInfo.footY, 6.5, dt);
        }

        const airLift = Math.max(0, stepInfo.footY - eng.camGroundY) * 0.54;
        const slideDipY = -0.78 * kinOut.slideWeight;
        const slidePushZ = -0.45 * kinOut.slideWeight;
        const swingPullZ = stepInfo.isSwinging ? 1.35 : 0;
        const strideBobY = kinOut.strideBob * 0.62;
        const stumbleRecoil =
          stepInfo.stumbleTimer > 0
            ? Math.sin((stepInfo.stumbleTimer / 0.52) * Math.PI) * 0.24
            : 0;
        const laneLeadX = THREE.MathUtils.clamp(stepInfo.strafeVelX * 0.055, -0.48, 0.48);

        const targetFov =
          68.0 +
          Math.min(6.2, stepInfo.speedHoriz * 0.44) +
          kinOut.slideWeight * 2.4 +
          (stepInfo.isSwinging ? 3.5 : 0);
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5.5, dt);
        camera.updateProjectionMatrix();

        _camTargetPos.set(
          eng.rig.root.position.x * 0.78 + laneLeadX + stepInfo.stumbleDir * stumbleRecoil * 0.5,
          eng.camGroundY + 6.0 + airLift + slideDipY + strideBobY - stumbleRecoil * 0.3,
          eng.rig.root.position.z + 10.0 + swingPullZ + slidePushZ + stumbleRecoil * 0.85
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 8.8, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 7.2, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 9.5, dt);

        _camLookAt.set(
          eng.rig.root.position.x * 0.68 + laneLeadX * 0.6,
          eng.camGroundY + 1.52 + airLift * 0.46 - 0.4 * kinOut.slideWeight,
          eng.rig.root.position.z - 9.3
        );
        eng.camLookCurrent.x = THREE.MathUtils.damp(eng.camLookCurrent.x, _camLookAt.x, 10, dt);
        eng.camLookCurrent.y = THREE.MathUtils.damp(eng.camLookCurrent.y, _camLookAt.y, 9, dt);
        eng.camLookCurrent.z = THREE.MathUtils.damp(eng.camLookCurrent.z, _camLookAt.z, 12, dt);
        if (vibEnv > 0) {
          const vibX = Math.sin(totalTime * 72) * 0.24 * vibEnv;
          const vibY = Math.cos(totalTime * 61) * 0.16 * vibEnv;
          camera.position.x += vibX * 0.45;
          camera.position.y += vibY * 0.35;
          camera.lookAt(
            eng.camLookCurrent.x + vibX * 0.55,
            eng.camLookCurrent.y + vibY * 0.45,
            eng.camLookCurrent.z
          );
        } else {
          camera.lookAt(eng.camLookCurrent);
        }

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
            hasLangoorPet: rt.hasLangoorPet,
            onVine: stepInfo.isSwinging,
            surpriseAnimalName: rt.surpriseAnimal.getActiveBanner(),
            extraLifeBanner: rt.extraLifeNoticeTimer > 0,
            festivalId: festivalModeRef.current ? getFestivalForLevel(rt.spec.levelNumber).id : null,
            festivalName: festivalModeRef.current ? getFestivalForLevel(rt.spec.levelNumber).name : null,
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
        eng.rig.langoorPet.root.visible = rt.hasLangoorPet;
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
          Math.sin(eng.finishElapsed * 0.65) * 2.25,
          rt.spec.goalY + 2.78,
          rt.spec.goalZ + 6.3
        );
        camera.position.lerp(_camTargetPos, Math.min(1, dt * 3.8));
        _camLookAt.set(0, rt.spec.goalY + 1.75, rt.spec.goalZ - 0.8);
        camera.lookAt(_camLookAt);

        if (eng.finishElapsed >= 2.05 && !eng.finishCompleted) {
          eng.finishCompleted = true;
          callbacksRef.current.onFinishAnimationComplete();
        }
      } else if (activePhase === 'wardrobe') {
        clearAllInputs();
        // Orbit around 1.25x explorer in 3D Wardrobe Studio
        eng.rig.bodyPivot.visible = true;
        eng.rig.root.rotation.x = 0;
        const px = eng.rig.root.position.x;
        const py = eng.rig.root.position.y;
        const pz = eng.rig.root.position.z;

        if (!draggingRef.current) {
          wardrobeYawRef.current += dt * 0.35;
        }
        const dist = 5.8;
        const cx = px + Math.sin(wardrobeYawRef.current) * dist;
        const cz = pz + Math.cos(wardrobeYawRef.current) * dist;
        _camTargetPos.set(cx, py + 2.25, cz);
        camera.position.lerp(_camTargetPos, 0.14);
        // Aim slightly lower so realistic 1.25x explorer stands clearly in the top half above the bottom wardrobe sheet
        _camLookAt.set(px, py + 0.8, pz);
        camera.lookAt(_camLookAt);
        updateCharacterKinematics(eng.rig, {
          speedHoriz: 0,
          velY: 0,
          grounded: true,
          time: totalTime,
          dt,
          strafeVelX: 0,
          laneSwitchDir: 0,
          laneSwitchProgress: 0,
          isSliding: false,
          slideProgress: 0,
          jumpAnticipation: 0,
          landingTimer: 0,
          landingImpact: 0,
          stumbleTimer: 0,
          stumbleDir: 1,
          isDead: false,
          deathElapsed: 0,
          hasBlaster: false,
          flipProgress: 0,
          isWardrobeIdle: true,
          hasLangoorPet: false,
        });
      } else if (activePhase === 'gameOver') {
        clearAllInputs();
        eng.deathElapsed += dt;
        rt.stepIdleAmbient(dt, eng.weather.rainStrength);
        eng.rig.bodyPivot.visible = true;
        eng.rig.shieldOrb.visible = false;
        eng.rig.root.rotation.x = 0;
        updateCharacterKinematics(eng.rig, {
          speedHoriz: 0,
          velY: 0,
          grounded: true,
          time: totalTime,
          dt,
          strafeVelX: 0,
          laneSwitchDir: 0,
          laneSwitchProgress: 0,
          isSliding: false,
          slideProgress: 0,
          jumpAnticipation: 0,
          landingTimer: 0,
          landingImpact: 0,
          stumbleTimer: 0,
          stumbleDir: 1,
          isDead: true,
          deathElapsed: eng.deathElapsed,
          hasBlaster: false,
          flipProgress: 0,
          hasLangoorPet: rt.hasLangoorPet,
        });
        _camTargetPos.set(
          eng.rig.root.position.x + 1.5,
          eng.rig.root.position.y + 3.98,
          eng.rig.root.position.z + 7.3
        );
        camera.position.lerp(_camTargetPos, Math.min(1, dt * 3.5));
        _camLookAt.set(
          eng.rig.root.position.x,
          eng.rig.root.position.y + 0.65,
          eng.rig.root.position.z - 0.5
        );
        if (eng.hitVibrationTimer > 0) {
          eng.hitVibrationTimer = Math.max(0, eng.hitVibrationTimer - dt);
          const norm = eng.hitVibrationTimer / Math.max(0.01, eng.hitVibrationDuration);
          const vibEnv = norm * norm;
          const vibX = Math.sin(totalTime * 72) * 0.28 * vibEnv;
          const vibY = Math.cos(totalTime * 61) * 0.19 * vibEnv;
          camera.position.x += vibX * 0.45;
          camera.position.y += vibY * 0.35;
          camera.lookAt(_camLookAt.x + vibX * 0.55, _camLookAt.y + vibY * 0.45, _camLookAt.z);
        } else {
          camera.lookAt(_camLookAt);
        }
      } else {
        clearAllInputs();
        // Menu / paused gentle idle camera behind 1.25x explorer
        rt.stepIdleAmbient(dt, eng.weather.rainStrength);
        eng.rig.bodyPivot.visible = true;
        updateCharacterKinematics(eng.rig, {
          speedHoriz: 0,
          velY: 0,
          grounded: true,
          time: totalTime,
          dt,
          strafeVelX: 0,
          laneSwitchDir: 0,
          laneSwitchProgress: 0,
          isSliding: false,
          slideProgress: 0,
          jumpAnticipation: 0,
          landingTimer: 0,
          landingImpact: 0,
          stumbleTimer: 0,
          stumbleDir: 1,
          isDead: false,
          deathElapsed: 0,
          hasBlaster: false,
          flipProgress: 0,
          isWardrobeIdle: true,
          hasLangoorPet: activePhase === 'paused' ? rt.hasLangoorPet : false,
        });
        _camTargetPos.set(
          eng.rig.root.position.x + Math.sin(totalTime * 0.4) * 1.12,
          eng.rig.root.position.y + 4.8,
          eng.rig.root.position.z + 9.7
        );
        camera.position.lerp(_camTargetPos, 0.08);
        _camLookAt.set(
          eng.rig.root.position.x,
          eng.rig.root.position.y + 1.55,
          eng.rig.root.position.z - 6
        );
        camera.lookAt(_camLookAt);
      }

      // Dynamic Weather + Optional Festival Mode Background Transformation
      const baseBiomePalette = BIOME_PALETTES[rt.spec.biome];
      const isFestivalActive = festivalModeRef.current;
      const activeFestival = getFestivalForLevel(rt.spec.levelNumber);
      const effectivePalette = isFestivalActive
        ? getFestivalBiomePalette(baseBiomePalette, activeFestival)
        : baseBiomePalette;

      eng.hemiLight.color.setHex(effectivePalette.hemiSky);
      eng.hemiLight.groundColor.setHex(effectivePalette.hemiGround);
      eng.sunLight.color.setHex(effectivePalette.sunColor);

      eng.weather.update(
        dt,
        weatherModeRef.current,
        activePhase === 'playing',
        rt.spec.biome,
        effectivePalette,
        eng.rig.root.position.x,
        eng.rig.root.position.y,
        eng.rig.root.position.z,
        scene,
        eng.sunLight,
        eng.hemiLight
      );

      // Update GPU foliage vertex shader wind uniforms (trees, bushes, ferns, grass, vines)
      rt.updateFoliageWind(
        dt,
        weatherModeRef.current,
        eng.weather.getActiveWeather(),
        eng.weather.rainStrength,
        eng.weather.mistStrength
      );

      if (isFestivalActive) {
        eng.sunLight.intensity =
          activeFestival.sunIntensity -
          eng.weather.rainStrength * 0.36 -
          eng.weather.mistStrength * 0.2;
        eng.hemiLight.intensity =
          activeFestival.hemiIntensity +
          eng.weather.mistStrength * 0.1 -
          eng.weather.rainStrength * 0.1;
      }

      eng.festival.update(
        dt,
        isFestivalActive,
        activeFestival,
        eng.rig.root.position.x,
        eng.rig.root.position.y,
        eng.rig.root.position.z
      );

      // Solar Time-of-Day Angle & Dynamic Projected Shadows (Character + All Moving Obstacles)
      const isFestivalNight = isFestivalActive && activeFestival.isNight;
      const solar = computeSolarState(
        rt.spec.biome,
        rt.spec.levelNumber,
        eng.levelElapsed,
        isFestivalNight
      );
      const texelSize = (shadowExtent * 2) / Math.max(512, currentShadowMapSize);
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

      const shadowFootY =
        activePhase === 'playing'
          ? rt.playerBody.position.y - rt.playerRadius
          : eng.rig.root.position.y;
      const groundHitY = rt.sampleGroundBelow(
        eng.rig.root.position.x,
        shadowFootY + rt.playerRadius,
        eng.rig.root.position.z
      );
      const playerSpeedHoriz =
        activePhase === 'playing'
          ? Math.hypot(rt.playerBody.velocity.x, rt.playerBody.velocity.z)
          : 0;

      eng.dynamicShadow.update(
        dt,
        eng.rig.root.position.x,
        shadowFootY,
        eng.rig.root.position.z,
        groundHitY,
        solar,
        eng.weather.rainStrength,
        eng.weather.mistStrength,
        effectivePalette.sunColor,
        eng.sunLight,
        {
          biome: rt.spec.biome,
          isSliding: activePhase === 'playing' && rt.slideTimer > 0,
          isSwinging: activePhase === 'playing' && rt.activeVine !== null,
          speedHoriz: playerSpeedHoriz,
          isFestivalNight,
          elapsed: eng.levelElapsed,
          rimLight,
        }
      );

      // Dynamic Time-of-Day & Weather-Reactive Shadows for Moving Obstacles, Boulders & Creatures
      const casterCount = rt.collectMovingObstacleShadows(
        obstacleShadowCasters,
        eng.rig.root.position.z
      );
      eng.obstacleShadows.update(
        obstacleShadowCasters,
        casterCount,
        solar,
        eng.weather.rainStrength,
        eng.weather.mistStrength,
        rt.spec.biome,
        isFestivalNight
      );

      // Animate 3D floating score text upward drift & fade-out tweens
      eng.floatingScores.update(dt, eng.rig.root.position.z);

      // Keep Web Audio 3D AudioListener anchored to explorer & oriented with camera view
      camera.getWorldDirection(_audioCamForward);
      soundEngine.updateListener(
        eng.rig.root.position.x,
        eng.rig.root.position.y + 1.4,
        eng.rig.root.position.z + 1.0,
        _audioCamForward.x,
        _audioCamForward.y,
        _audioCamForward.z,
        0,
        1,
        0
      );

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(0);
        } catch {
          // Ignore
        }
      }
      soundEngine.clearSpatialSources();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (swipeStateRef.current.sprintTimeout !== null) {
        window.clearTimeout(swipeStateRef.current.sprintTimeout);
        swipeStateRef.current.sprintTimeout = null;
      }
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
      festival.dispose();
      dynamicShadow.dispose();
      obstacleShadows.dispose();
      floatingScores.dispose();
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

  // Apply graphics quality settings live (pixel ratio, shadow resolution, lighting)
  useEffect(() => {
    engineRef.current?.applyGraphicsQuality(graphicsQuality);
  }, [graphicsQuality]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full touch-none select-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        if (phase === 'wardrobe') {
          draggingRef.current = true;
          lastPointerXRef.current = e.clientX;
        } else if (phase === 'playing') {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore synthetic or unsupported pointer capture
          }
          const sw = swipeStateRef.current;
          sw.pointerId = e.pointerId;
          sw.startX = e.clientX;
          sw.startY = e.clientY;
          sw.pivotX = e.clientX;
          sw.lastDir = 0;
          sw.consumed = false;
        }
      }}
      onPointerMove={(e) => {
        if (phase === 'wardrobe' && draggingRef.current) {
          const dx = e.clientX - lastPointerXRef.current;
          lastPointerXRef.current = e.clientX;
          wardrobeYawRef.current += dx * 0.012;
          return;
        }
        if (phase === 'playing') {
          const sw = swipeStateRef.current;
          if (sw.pointerId !== e.pointerId) return;

          // If a swipe already fired, allow smooth horizontal steering/reversal without lifting finger
          if (sw.consumed) {
            if (sw.lastDir === -1) {
              if (e.clientX < sw.pivotX) {
                sw.pivotX = e.clientX;
              } else if (e.clientX - sw.pivotX >= 34) {
                touchBridgeRef.current.laneRightPressed = true;
                sw.lastDir = 1;
                sw.pivotX = e.clientX;
              }
            } else if (sw.lastDir === 1) {
              if (e.clientX > sw.pivotX) {
                sw.pivotX = e.clientX;
              } else if (sw.pivotX - e.clientX >= 34) {
                touchBridgeRef.current.laneLeftPressed = true;
                sw.lastDir = -1;
                sw.pivotX = e.clientX;
              }
            } else {
              const steerDx = e.clientX - sw.pivotX;
              if (steerDx <= -32) {
                touchBridgeRef.current.laneLeftPressed = true;
                sw.lastDir = -1;
                sw.pivotX = e.clientX;
              } else if (steerDx >= 32) {
                touchBridgeRef.current.laneRightPressed = true;
                sw.lastDir = 1;
                sw.pivotX = e.clientX;
              }
            }
            return;
          }

          const dx = e.clientX - sw.startX;
          const dy = e.clientY - sw.startY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Crisp horizontal lane swipe (22px) or vertical run/stop swipe (22px up / 26px down)
          if (absDx >= 22 && absDx >= absDy * 0.9) {
            sw.consumed = true;
            sw.pivotX = e.clientX;
            const tb = touchBridgeRef.current;
            if (dx < 0) {
              tb.laneLeftPressed = true;
              sw.lastDir = -1;
            } else {
              tb.laneRightPressed = true;
              sw.lastDir = 1;
            }
          } else if (dy <= -22 && absDy > absDx) {
            sw.consumed = true;
            sw.lastDir = 0;
            sw.pivotX = e.clientX;
            const tb = touchBridgeRef.current;
            const alreadyRunning = autoRunRef.current || tb.forward;
            tb.forward = true;
            if (alreadyRunning) {
              tb.sprint = true;
              if (sw.sprintTimeout !== null) {
                window.clearTimeout(sw.sprintTimeout);
              }
              sw.sprintTimeout = window.setTimeout(() => {
                touchBridgeRef.current.sprint = false;
                sw.sprintTimeout = null;
              }, 1400);
            }
          } else if (dy >= 26 && absDy > absDx) {
            sw.consumed = true;
            sw.lastDir = 0;
            sw.pivotX = e.clientX;
            const tb = touchBridgeRef.current;
            tb.forward = false;
            tb.sprint = false;
            if (sw.sprintTimeout !== null) {
              window.clearTimeout(sw.sprintTimeout);
              sw.sprintTimeout = null;
            }
          }
        }
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        const sw = swipeStateRef.current;
        if (sw.pointerId === e.pointerId) {
          // Catch ultra-fast flicks that complete between pointerdown and pointerup
          if (phase === 'playing' && !sw.consumed) {
            const dx = e.clientX - sw.startX;
            const dy = e.clientY - sw.startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            const tb = touchBridgeRef.current;
            if (absDx >= 18 && absDx >= absDy * 0.9) {
              if (dx < 0) {
                tb.laneLeftPressed = true;
              } else {
                tb.laneRightPressed = true;
              }
            } else if (dy <= -18 && absDy > absDx) {
              const alreadyRunning = autoRunRef.current || tb.forward;
              tb.forward = true;
              if (alreadyRunning) {
                tb.sprint = true;
                if (sw.sprintTimeout !== null) {
                  window.clearTimeout(sw.sprintTimeout);
                }
                sw.sprintTimeout = window.setTimeout(() => {
                  touchBridgeRef.current.sprint = false;
                  sw.sprintTimeout = null;
                }, 1400);
              }
            } else if (dy >= 22 && absDy > absDx) {
              tb.forward = false;
              tb.sprint = false;
              if (sw.sprintTimeout !== null) {
                window.clearTimeout(sw.sprintTimeout);
                sw.sprintTimeout = null;
              }
            }
          }
          sw.pointerId = null;
          sw.lastDir = 0;
          sw.consumed = false;
        }
      }}
      onPointerCancel={(e) => {
        draggingRef.current = false;
        const sw = swipeStateRef.current;
        if (sw.pointerId === e.pointerId) {
          sw.pointerId = null;
          sw.lastDir = 0;
          sw.consumed = false;
        }
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    />
  );
};
