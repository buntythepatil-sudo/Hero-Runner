import * as THREE from 'three';
import { BiomeType } from '../types/game';

export type TimeOfDayPhase = 'morning' | 'midday' | 'golden_hour' | 'twilight';

export interface SolarState {
  dayArc: number;         // 0.22 (morning) .. 0.5 (noon) .. 0.82 (golden hour)
  elevation: number;      // 0.34 (low sun) .. 0.98 (overhead noon)
  azimuth: number;        // radians in XZ plane
  sunDirX: number;        // unit horizontal direction FROM sun toward ground (cast direction)
  sunDirZ: number;
  sunOffset: THREE.Vector3;
  warmth: number;         // 0 at midday, 1 at golden hour / morning
  timeOfDay: TimeOfDayPhase;
  shadowStrength: number; // 0.65..1.05 natural contrast factor for time-of-day
  isNightMode: boolean;
}

export interface CharacterShadowContext {
  biome: BiomeType;
  isSliding?: boolean;
  isSwinging?: boolean;
  speedHoriz?: number;
  isFestivalNight?: boolean;
  elapsed?: number;
  rimLight?: THREE.DirectionalLight;
}

export interface ObstacleShadowCaster {
  x: number;
  y: number;          // bottom/center height of obstacle
  z: number;
  groundY: number;    // surface Y beneath obstacle
  radiusX: number;    // base half-width (or half-length for 'bar')
  radiusZ: number;    // base half-depth (or half-thickness for 'bar')
  rotY: number;       // local Y rotation (used for 'bar' sweepers)
  shape: 'oval' | 'bar';
  intensityMul: number;
  castHeight: number; // approximate obstacle height for sun-angle stretch & offset
}

const _sunOffset = new THREE.Vector3();
const _baseSunColor = new THREE.Color();
const _goldenSunColor = new THREE.Color(0xffb469);
const _overcastSunColor = new THREE.Color(0xcbd5e1);
const _moonSunColor = new THREE.Color(0x9fc2ff);
const _rimWarmColor = new THREE.Color(0xffdca3);
const _rimCoolColor = new THREE.Color(0x9bc5ff);
const _rimColorTmp = new THREE.Color();
const _sharedTint = new THREE.Color();

export function computeSolarState(
  biome: BiomeType,
  levelNumber: number,
  elapsed: number,
  isFestivalNight = false
): SolarState {
  // Biome-authentic starting hour that gently progresses along the solar arc during play
  let baseArc = 0.36 + ((levelNumber - 1) % 4) * 0.08;
  if (biome === 'canopy') baseArc = 0.38 + ((levelNumber - 1) % 3) * 0.06;
  else if (biome === 'ruins') baseArc = 0.56 + ((levelNumber - 1) % 3) * 0.07;
  else if (biome === 'waterfall') baseArc = 0.34 + ((levelNumber - 1) % 3) * 0.05;
  else if (biome === 'volcano') baseArc = 0.68 + ((levelNumber - 1) % 3) * 0.04;

  // Smooth oscillatory diurnal sweep (never plunges into unplayable darkness)
  const dayArc = isFestivalNight
    ? 0.74 + 0.09 * Math.sin(elapsed * 0.015 + levelNumber * 0.7)
    : 0.5 + 0.31 * Math.sin((baseArc - 0.5) * Math.PI + elapsed * 0.018);

  const distFromNoon = Math.abs(dayArc - 0.5) * 2.0; // 0 at noon, ~0.62 at dawn/dusk
  const elevation = isFestivalNight
    ? THREE.MathUtils.clamp(0.46 + 0.08 * Math.cos(elapsed * 0.018), 0.36, 0.58)
    : THREE.MathUtils.clamp(1.0 - distFromNoon * 0.92, 0.35, 0.98);
  const azimuth = (dayArc - 0.5) * 2.25; // East (+X) -> South (+Z) -> West (-X)

  const horizScale = Math.cos(elevation * Math.PI * 0.43) * 35;
  const sunPosX = Math.sin(azimuth) * horizScale + 5;
  const sunPosZ = Math.cos(azimuth) * horizScale * 0.56 + 6;
  const sunPosY = 17 + elevation * 23;

  _sunOffset.set(sunPosX, sunPosY, sunPosZ);

  const horizLen = Math.max(0.001, Math.hypot(sunPosX, sunPosZ));
  const warmth = isFestivalNight
    ? 0.25
    : THREE.MathUtils.clamp((0.88 - elevation) / 0.53, 0, 1);

  let timeOfDay: TimeOfDayPhase = 'midday';
  if (isFestivalNight) {
    timeOfDay = 'twilight';
  } else if (dayArc < 0.38) {
    timeOfDay = 'morning';
  } else if (dayArc > 0.64) {
    timeOfDay = biome === 'volcano' && dayArc > 0.74 ? 'twilight' : 'golden_hour';
  }

  const shadowStrength = isFestivalNight
    ? 0.78
    : THREE.MathUtils.lerp(0.84, 1.04, elevation);

  return {
    dayArc,
    elevation,
    azimuth,
    // Unit direction shadow stretches (away from sun/moon)
    sunDirX: -sunPosX / horizLen,
    sunDirZ: -sunPosZ / horizLen,
    sunOffset: _sunOffset,
    warmth,
    timeOfDay,
    shadowStrength,
    isNightMode: isFestivalNight,
  };
}

/**
 * Computes physically cohesive umbra shadow color tuned for the jungle biome,
 * time-of-day warmth, weather scattering, and moonlit/lantern festival nights.
 */
export function computeShadowTint(
  out: THREE.Color,
  biome: BiomeType,
  solar: SolarState,
  rainStrength: number,
  mistStrength: number,
  isFestivalNight = false
): THREE.Color {
  // Base biome ambient bounce tint inside shadow regions
  let r = 0.022;
  let g = 0.056;
  let b = 0.036;

  if (biome === 'ruins') {
    r = 0.034;
    g = 0.048;
    b = 0.042;
  } else if (biome === 'waterfall') {
    r = 0.018;
    g = 0.05;
    b = 0.068;
  } else if (biome === 'volcano') {
    r = 0.062;
    g = 0.026;
    b = 0.024;
  }

  // Golden hour introduces a subtle cool-violet/warm-indigo contrast in deep jungle shade
  if (!isFestivalNight) {
    const dusk = solar.warmth * (1 - Math.min(1, rainStrength + mistStrength));
    r += dusk * 0.016;
    g -= dusk * 0.008;
    b += dusk * 0.024;
  } else {
    // Moonlit / lantern festival nights carry a rich deep indigo-plum shadow hue
    r = r * 0.65 + 0.03;
    g = g * 0.55 + 0.022;
    b = b * 0.7 + 0.068;
  }

  // Overcast rain & jungle mist scatter cool sky light into shadows
  r += mistStrength * 0.036 + rainStrength * 0.028;
  g += mistStrength * 0.046 + rainStrength * 0.038;
  b += mistStrength * 0.05 + rainStrength * 0.06;

  out.setRGB(
    THREE.MathUtils.clamp(r, 0.012, 0.22),
    THREE.MathUtils.clamp(g, 0.015, 0.24),
    THREE.MathUtils.clamp(b, 0.018, 0.28)
  );
  return out;
}

export class DynamicCharacterShadow {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;

  private currentOpacity = 0.58;
  private currentContactStrength = 0.55;
  private currentSoftness = 0.2;
  private currentStretch = 1.08;
  private currentScaleX = 0.84;
  private currentScaleZ = 0.84;
  private currentCastOffset = 0.2;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(2.6, 2.6);
    this.geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uOpacity: { value: 0.58 },
        uContactStrength: { value: 0.52 },
        uSoftness: { value: 0.22 },
        uCastShift: { value: 0.14 },
        uDappleStrength: { value: 0.0 },
        uWorldPos: { value: new THREE.Vector2(0, 0) },
        uColor: { value: new THREE.Color(0x06100a) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uOpacity;
        uniform float uContactStrength;
        uniform float uSoftness;
        uniform float uCastShift;
        uniform float uDappleStrength;
        uniform vec2 uWorldPos;
        uniform vec3 uColor;

        void main() {
          // Local UV mapped to [-1, 1]; +Y aligns with the sun's cast direction (+Z in mesh local space)
          vec2 p = (vUv - 0.5) * 2.0;

          // Layer 1: Grounded Contact AO Umbra centered right beneath the explorer's feet
          vec2 contactP = vec2(p.x * 1.32, (p.y + uCastShift) * 1.48);
          float dContact = length(contactP);
          float contactEdge = mix(0.46, 0.72, uSoftness);
          float contactAlpha = (1.0 - smoothstep(0.08, contactEdge, dContact)) * uContactStrength;

          // Layer 2: Directional Elongated Body Cast Shadow stretching away from the sun
          vec2 castP = vec2(p.x * 1.12, (p.y - uCastShift * 0.55) * 0.96);
          // Slight humanoid torso taper toward the far cast tip
          float tipTaper = 1.0 + max(0.0, castP.y) * 0.18;
          castP.x *= tipTaper;
          float dCast = length(castP);

          float innerEdge = max(0.02, 0.42 - uSoftness * 0.34);
          float outerEdge = min(0.99, 0.56 + uSoftness * 0.42);
          float castPenumbra = 1.0 - smoothstep(innerEdge, outerEdge, dCast);

          // Subtle organic canopy sunlight dapple modulation in clear jungle biomes
          float dappleWave =
            0.5 + 0.25 * sin(uWorldPos.x * 0.65 + p.x * 2.2) * cos(uWorldPos.y * 0.52 + p.y * 2.4)
                + 0.25 * sin((uWorldPos.x - uWorldPos.y) * 0.38);
          float dappleMul = mix(1.0, 0.88 + 0.18 * dappleWave, uDappleStrength);

          float combined = max(castPenumbra, contactAlpha) * uOpacity * dappleMul;
          if (combined < 0.004) discard;
          gl_FragColor = vec4(uColor, combined);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
  }

  public update(
    dt: number,
    playerX: number,
    footY: number,
    playerZ: number,
    groundHitY: number | null,
    solar: SolarState,
    rainStrength: number,
    mistStrength: number,
    baseSunHex: number,
    sunLight: THREE.DirectionalLight,
    ctx?: CharacterShadowContext
  ) {
    const clampedDt = Math.min(dt, 0.05);
    const biome: BiomeType = ctx?.biome ?? 'canopy';
    const isSliding = ctx?.isSliding ?? false;
    const isSwinging = ctx?.isSwinging ?? false;
    const speedHoriz = ctx?.speedHoriz ?? 0;
    const isFestivalNight = ctx?.isFestivalNight ?? solar.isNightMode;
    const weatherScatter = Math.min(1, mistStrength * 0.95 + rainStrength * 0.88);

    // 1. Directional 3D Shadow Map Softness, Sun Color & Counter-Sun Rim Lighting
    const clearRadius = (isFestivalNight ? 2.6 : 1.35) + (1 - solar.elevation) * 1.65;
    const weatherRadius = mistStrength * 4.5 + rainStrength * 3.8;
    sunLight.shadow.radius = clearRadius + weatherRadius;

    _baseSunColor.setHex(baseSunHex);
    if (isFestivalNight) {
      _baseSunColor.lerp(_moonSunColor, 0.24 * (1 - weatherScatter * 0.5));
    } else {
      _baseSunColor.lerp(_goldenSunColor, solar.warmth * 0.46 * (1 - weatherScatter * 0.72));
    }
    _baseSunColor.lerp(_overcastSunColor, rainStrength * 0.48 + mistStrength * 0.26);
    sunLight.color.copy(_baseSunColor);

    // Subtle elevation-driven directional intensity modulation for natural dawn/noon/dusk depth
    if (!isFestivalNight) {
      const elevMul = THREE.MathUtils.lerp(0.86, 1.06, solar.elevation);
      sunLight.intensity *= elevMul;
    }

    // Align rim light opposite the sun direction so character & obstacle silhouettes stay sculpted
    if (ctx?.rimLight) {
      const rim = ctx.rimLight;
      rim.target.position.set(playerX, footY + 1.0, playerZ);
      rim.target.updateMatrixWorld();
      rim.position.set(
        playerX + solar.sunDirX * 16,
        footY + 14 + solar.elevation * 8,
        playerZ + solar.sunDirZ * 16 - 6
      );
      _rimColorTmp
        .copy(_rimWarmColor)
        .lerp(_rimCoolColor, weatherScatter * 0.75 + (isFestivalNight ? 0.45 : 0));
      rim.color.copy(_rimColorTmp);
    }

    // 2. Character Projected Shadow: Opacity, Contact AO, Softness, Posture & Sun Elongation
    const hasSurface = groundHitY !== null;
    const surfaceY = groundHitY ?? footY;
    const heightAbove = Math.max(0, footY - surfaceY);

    const clearOpacity =
      (isFestivalNight ? 0.5 : 0.68 - (1 - solar.elevation) * 0.14) * solar.shadowStrength;
    const weatherOpacityDrop = mistStrength * 0.34 + rainStrength * 0.39;
    const heightFade = 1.0 / (1.0 + heightAbove * 0.26);
    const targetOpacity = hasSurface
      ? Math.max(0.06, (clearOpacity - weatherOpacityDrop) * heightFade)
      : 0;

    // Grounded contact AO peaks right when feet touch the ground (or sliding low) and dissolves mid-jump
    const targetContact = hasSurface
      ? Math.max(0, (1.0 - heightAbove * 0.58) * (isSliding ? 0.92 : 0.78) * (1 - weatherScatter * 0.32))
      : 0;

    const clearSoftness = (isFestivalNight ? 0.28 : 0.12) + (1 - solar.elevation) * 0.22;
    const weatherSoftness = mistStrength * 0.55 + rainStrength * 0.5;
    const heightSoftness = Math.min(0.36, heightAbove * 0.08);
    const targetSoftness = THREE.MathUtils.clamp(
      clearSoftness + weatherSoftness + heightSoftness,
      0.11,
      0.94
    );

    // Sun elongation + posture silhouette shaping (slide widens/flattens; vine swing softens; sprint stretches subtly)
    const sunStretch =
      1.0 +
      (1 - solar.elevation) * 0.96 * (1 - weatherScatter * 0.58) +
      (isSliding ? 0.32 : 0) +
      (isSwinging ? 0.16 : 0);
    const stridePulse = Math.min(0.08, speedHoriz * 0.005);
    const baseWidth =
      (isSliding ? 0.96 : 0.74) +
      stridePulse +
      Math.min(0.42, heightAbove * 0.075) +
      mistStrength * 0.15;
    const baseDepth =
      (isSliding ? 0.92 : 0.76) +
      Math.min(0.45, heightAbove * 0.08) +
      mistStrength * 0.16;

    const targetCastOffset =
      (0.14 + (1 - solar.elevation) * 0.42 + heightAbove * 0.18) *
      (1 - weatherScatter * 0.52);

    this.currentOpacity = THREE.MathUtils.damp(this.currentOpacity, targetOpacity, 11, clampedDt);
    this.currentContactStrength = THREE.MathUtils.damp(
      this.currentContactStrength,
      targetContact,
      14,
      clampedDt
    );
    this.currentSoftness = THREE.MathUtils.damp(this.currentSoftness, targetSoftness, 8, clampedDt);
    this.currentStretch = THREE.MathUtils.damp(this.currentStretch, sunStretch, 7, clampedDt);
    this.currentScaleX = THREE.MathUtils.damp(this.currentScaleX, baseWidth, 11, clampedDt);
    this.currentScaleZ = THREE.MathUtils.damp(this.currentScaleZ, baseDepth, 11, clampedDt);
    this.currentCastOffset = THREE.MathUtils.damp(
      this.currentCastOffset,
      targetCastOffset,
      9,
      clampedDt
    );

    if (this.currentOpacity < 0.008) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;

    this.mesh.position.set(
      playerX + solar.sunDirX * this.currentCastOffset,
      surfaceY + 0.028,
      playerZ + solar.sunDirZ * this.currentCastOffset
    );

    // Align the shadow's local +Z axis with the sun's cast direction and stretch along it
    this.mesh.rotation.set(0, Math.atan2(solar.sunDirX, solar.sunDirZ), 0);
    this.mesh.scale.set(
      this.currentScaleX,
      1,
      this.currentScaleZ * this.currentStretch
    );

    // Shift contact AO back toward player's feet inside the stretched UV space
    const castShiftUv = THREE.MathUtils.clamp(
      (this.currentCastOffset / Math.max(0.6, this.currentScaleZ * this.currentStretch * 1.3)) * 0.52,
      0.04,
      0.34
    );

    const dappleEnabled =
      (biome === 'canopy' || biome === 'ruins' || biome === 'waterfall') && !isFestivalNight
        ? (1 - weatherScatter) * THREE.MathUtils.clamp(solar.elevation * 1.1, 0, 1) * 0.55
        : 0;

    this.material.uniforms.uOpacity.value = this.currentOpacity;
    this.material.uniforms.uContactStrength.value = this.currentContactStrength;
    this.material.uniforms.uSoftness.value = this.currentSoftness;
    this.material.uniforms.uCastShift.value = castShiftUv;
    this.material.uniforms.uDappleStrength.value = dappleEnabled;
    (this.material.uniforms.uWorldPos.value as THREE.Vector2).set(playerX, playerZ);

    computeShadowTint(
      this.material.uniforms.uColor.value as THREE.Color,
      biome,
      solar,
      rainStrength,
      mistStrength,
      isFestivalNight
    );
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

interface PooledObstacleShadow {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

const OBSTACLE_SHADOW_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const OBSTACLE_SHADOW_FRAG = `
  varying vec2 vUv;
  uniform float uOpacity;
  uniform float uSoftness;
  uniform float uShape;        // 0.0 = oval/radial, 1.0 = capsule/bar (rotating sweeper)
  uniform float uBarAspect;    // halfLength / halfThickness ratio for capsule SDF
  uniform float uContactBoost; // 0..1 grounded contact umbra weight
  uniform vec3 uColor;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float d;

    if (uShape > 0.5) {
      // Signed-distance capsule along local X axis (normalised to [-1, 1] box)
      float halfSeg = clamp(1.0 - 1.0 / max(1.2, uBarAspect), 0.15, 0.88);
      vec2 q = vec2(max(abs(p.x) - halfSeg, 0.0), p.y * 1.35);
      d = length(q) * 1.15;
    } else {
      d = length(p);
    }

    float innerEdge = max(0.02, 0.44 - uSoftness * 0.35);
    float outerEdge = min(0.99, 0.56 + uSoftness * 0.42);
    float penumbra = 1.0 - smoothstep(innerEdge, outerEdge, d);

    float umbraEdge = max(0.2, innerEdge + 0.16);
    float umbra = (1.0 - smoothstep(0.05, umbraEdge, d)) * uContactBoost;

    float alpha = mix(penumbra, max(penumbra, umbra), 0.42) * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * Pooled dynamic projected shadow system for all moving obstacles & dynamic actors
 * (patrolling crabs/beetles, swinging pendulums, rotating sweepers, rolling boulders,
 * thrown monkey bananas, hovering power mushrooms, leaping langoor, and surprise animals).
 * Adjusts elongation, cast direction, softness, contrast, and tint in lockstep with the
 * level's time-of-day solar arc, weather conditions (clear / mist / rain), and festival lighting.
 */
export class DynamicObstacleShadowSystem {
  public group: THREE.Group;
  private geometry: THREE.PlaneGeometry;
  private pool: PooledObstacleShadow[] = [];

  constructor(initialPoolSize = 44) {
    this.group = new THREE.Group();
    this.group.name = 'DynamicObstacleShadows';

    this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
    this.geometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < initialPoolSize; i++) {
      this.createSlot();
    }
  }

  private createSlot(): PooledObstacleShadow {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uOpacity: { value: 0.45 },
        uSoftness: { value: 0.25 },
        uShape: { value: 0.0 },
        uBarAspect: { value: 4.0 },
        uContactBoost: { value: 0.5 },
        uColor: { value: new THREE.Color(0x06100a) },
      },
      vertexShader: OBSTACLE_SHADOW_VERT,
      fragmentShader: OBSTACLE_SHADOW_FRAG,
    });

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.visible = false;
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    this.group.add(mesh);

    const slot: PooledObstacleShadow = { mesh, material };
    this.pool.push(slot);
    return slot;
  }

  public update(
    casters: ObstacleShadowCaster[],
    count: number,
    solar: SolarState,
    rainStrength: number,
    mistStrength: number,
    biome: BiomeType,
    isFestivalNight = false
  ) {
    const weatherScatter = Math.min(1, mistStrength * 0.95 + rainStrength * 0.88);
    const sunYaw = Math.atan2(solar.sunDirX, solar.sunDirZ);
    const tint = computeShadowTint(
      _sharedTint,
      biome,
      solar,
      rainStrength,
      mistStrength,
      isFestivalNight
    );

    const baseClearOpacity =
      (isFestivalNight ? 0.48 : 0.64 - (1 - solar.elevation) * 0.13) * solar.shadowStrength;
    const weatherOpacityDrop = mistStrength * 0.34 + rainStrength * 0.38;
    const clearSoftness = (isFestivalNight ? 0.28 : 0.13) + (1 - solar.elevation) * 0.21;
    const weatherSoftness = mistStrength * 0.54 + rainStrength * 0.48;
    const sunStretchFactor = (1 - solar.elevation) * 0.88 * (1 - weatherScatter * 0.58);
    const sunShiftScale = (1 - solar.elevation) * 0.62 * (1 - weatherScatter * 0.55);

    let activeSlots = 0;

    for (let i = 0; i < count; i++) {
      const c = casters[i];
      const heightAbove = Math.max(0, c.y - c.groundY);
      if (heightAbove > 11.5) continue;

      const heightFade = 1.0 / (1.0 + heightAbove * 0.27);
      const opacity = Math.max(0, (baseClearOpacity - weatherOpacityDrop) * heightFade * c.intensityMul);
      if (opacity < 0.015) continue;

      const slot = activeSlots < this.pool.length ? this.pool[activeSlots] : this.createSlot();
      activeSlots++;

      const softness = THREE.MathUtils.clamp(
        clearSoftness + weatherSoftness + Math.min(0.38, heightAbove * 0.085),
        0.12,
        0.95
      );
      const contactBoost = THREE.MathUtils.clamp(1.0 - heightAbove * 0.45, 0, 0.92);

      // Horizontal shadow projection offset away from sun based on obstacle altitude + object height
      const effHeight = heightAbove + c.castHeight * 0.32;
      const castDist = (0.08 + effHeight * (0.24 + sunShiftScale)) * (1 - weatherScatter * 0.48);

      const posX = c.x + solar.sunDirX * castDist;
      const posZ = c.z + solar.sunDirZ * castDist;
      const posY = c.groundY + 0.024 + (activeSlots % 3) * 0.0015; // micro-stagger prevents coplanar overlap flicker

      const mesh = slot.mesh;
      const u = slot.material.uniforms;
      mesh.visible = true;
      mesh.position.set(posX, posY, posZ);

      const altitudeSpread = 1.0 + Math.min(0.55, heightAbove * 0.09) + mistStrength * 0.14;

      if (c.shape === 'bar') {
        // Rotating sweeper beam: rotate along the bar's live yaw and widen subtly with sun slant & weather
        mesh.rotation.set(0, c.rotY, 0);
        const halfLen = c.radiusX * (1.06 + sunStretchFactor * 0.14);
        const halfThick = c.radiusZ * (1.25 + sunStretchFactor * 0.42 + weatherScatter * 0.28) * altitudeSpread;
        mesh.scale.set(halfLen, 1, halfThick);
        u.uShape.value = 1.0;
        u.uBarAspect.value = Math.max(1.5, halfLen / Math.max(0.15, halfThick));
      } else {
        // Oval / radial moving obstacle: align local +Z with sun cast direction and elongate along it
        mesh.rotation.set(0, sunYaw, 0);
        const scaleX = c.radiusX * altitudeSpread;
        const scaleZ = c.radiusZ * altitudeSpread * (1.0 + sunStretchFactor * (0.65 + c.castHeight * 0.22));
        mesh.scale.set(scaleX, 1, scaleZ);
        u.uShape.value = 0.0;
      }

      u.uOpacity.value = opacity;
      u.uSoftness.value = softness;
      u.uContactBoost.value = contactBoost;
      (u.uColor.value as THREE.Color).copy(tint);
    }

    for (let i = activeSlots; i < this.pool.length; i++) {
      this.pool[i].mesh.visible = false;
    }
  }

  public clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].mesh.visible = false;
    }
  }

  public dispose() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].material.dispose();
    }
    this.geometry.dispose();
    this.pool = [];
  }
}
