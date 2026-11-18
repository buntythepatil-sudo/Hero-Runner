import * as THREE from 'three';
import { BiomeType } from '../types/game';

export interface SolarState {
  dayArc: number;       // 0.22 (morning) .. 0.5 (noon) .. 0.82 (golden hour)
  elevation: number;    // 0.36 (low sun) .. 0.98 (overhead noon)
  azimuth: number;      // radians in XZ plane
  sunDirX: number;      // unit horizontal direction FROM sun toward ground
  sunDirZ: number;
  sunOffset: THREE.Vector3;
  warmth: number;       // 0 at midday, 1 at golden hour / morning
}

const _sunOffset = new THREE.Vector3();
const _baseSunColor = new THREE.Color();
const _goldenSunColor = new THREE.Color(0xffb469);
const _overcastSunColor = new THREE.Color(0xcbd5e1);

export function computeSolarState(
  biome: BiomeType,
  levelNumber: number,
  elapsed: number
): SolarState {
  // Biome-authentic starting hour that gently progresses along the solar arc during play
  let baseArc = 0.36 + ((levelNumber - 1) % 4) * 0.08;
  if (biome === 'canopy') baseArc = 0.38 + ((levelNumber - 1) % 3) * 0.06;
  else if (biome === 'ruins') baseArc = 0.56 + ((levelNumber - 1) % 3) * 0.07;
  else if (biome === 'waterfall') baseArc = 0.34 + ((levelNumber - 1) % 3) * 0.05;
  else if (biome === 'volcano') baseArc = 0.68 + ((levelNumber - 1) % 3) * 0.04;

  // Smooth oscillatory diurnal sweep (never plunges into unplayable midnight)
  const dayArc = 0.5 + 0.31 * Math.sin((baseArc - 0.5) * Math.PI + elapsed * 0.018);
  const distFromNoon = Math.abs(dayArc - 0.5) * 2.0; // 0 at noon, ~0.62 at dawn/dusk
  const elevation = THREE.MathUtils.clamp(1.0 - distFromNoon * 0.92, 0.36, 0.98);
  const azimuth = (dayArc - 0.5) * 2.15; // East (+X) -> South (+Z) -> West (-X)

  const horizScale = Math.cos(elevation * Math.PI * 0.42) * 34;
  const sunPosX = Math.sin(azimuth) * horizScale + 5;
  const sunPosZ = Math.cos(azimuth) * horizScale * 0.55 + 6;
  const sunPosY = 18 + elevation * 22;

  _sunOffset.set(sunPosX, sunPosY, sunPosZ);

  const horizLen = Math.max(0.001, Math.hypot(sunPosX, sunPosZ));
  const warmth = THREE.MathUtils.clamp((0.88 - elevation) / 0.52, 0, 1);

  return {
    dayArc,
    elevation,
    azimuth,
    // Direction shadow stretches (away from sun)
    sunDirX: -sunPosX / horizLen,
    sunDirZ: -sunPosZ / horizLen,
    sunOffset: _sunOffset,
    warmth,
  };
}

export class DynamicCharacterShadow {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;

  private currentOpacity = 0.55;
  private currentSoftness = 0.2;
  private currentStretch = 1.05;
  private currentScale = 1.0;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(2.2, 2.2);
    this.geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uOpacity: { value: 0.55 },
        uSoftness: { value: 0.22 },
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
        uniform float uSoftness;
        uniform vec3 uColor;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p);

          // Crisp core edge in sun (low uSoftness) vs wide diffused penumbra in mist/rain (high uSoftness)
          float innerEdge = max(0.02, 0.44 - uSoftness * 0.36);
          float outerEdge = min(0.99, 0.53 + uSoftness * 0.44);
          float penumbra = 1.0 - smoothstep(innerEdge, outerEdge, d);

          // Subtle grounded contact umbra under the explorer's feet
          float umbraEdge = max(0.20, innerEdge + 0.13);
          float umbra = 1.0 - smoothstep(0.06, umbraEdge, d);

          float alpha = mix(penumbra, max(penumbra, umbra), 0.34) * uOpacity;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(uColor, alpha);
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
    sunLight: THREE.DirectionalLight
  ) {
    const clampedDt = Math.min(dt, 0.05);
    const weatherScatter = Math.min(1, mistStrength * 0.95 + rainStrength * 0.85);

    // 1. Directional Shadow Map Softness & Tint (3D world shadows)
    const clearRadius = 1.45 + (1 - solar.elevation) * 1.35;
    const weatherRadius = mistStrength * 4.2 + rainStrength * 3.4;
    sunLight.shadow.radius = clearRadius + weatherRadius;

    _baseSunColor.setHex(baseSunHex);
    _baseSunColor.lerp(_goldenSunColor, solar.warmth * 0.42 * (1 - weatherScatter * 0.7));
    _baseSunColor.lerp(_overcastSunColor, rainStrength * 0.45 + mistStrength * 0.22);
    sunLight.color.copy(_baseSunColor);

    // 2. Compute Target Opacity, Softness, Scale & Elongation for Character Projected Shadow
    const hasSurface = groundHitY !== null;
    const surfaceY = groundHitY ?? footY;
    const heightAbove = Math.max(0, footY - surfaceY);

    // Sharper & darker in bright midday sun; softer & lighter in mist, rain, or golden hour
    const clearOpacity = 0.62 - (1 - solar.elevation) * 0.14;
    const weatherOpacityDrop = mistStrength * 0.34 + rainStrength * 0.38;
    const heightFade = 1.0 / (1.0 + heightAbove * 0.28);
    const targetOpacity = hasSurface
      ? Math.max(0.06, (clearOpacity - weatherOpacityDrop) * heightFade)
      : 0;

    const clearSoftness = 0.14 + (1 - solar.elevation) * 0.20;
    const weatherSoftness = mistStrength * 0.56 + rainStrength * 0.48;
    const heightSoftness = Math.min(0.32, heightAbove * 0.075);
    const targetSoftness = THREE.MathUtils.clamp(
      clearSoftness + weatherSoftness + heightSoftness,
      0.12,
      0.92
    );

    // Elongate away from low sun; soften/shrink stretch slightly when sky is heavily diffused
    const sunStretch = 1.0 + (1 - solar.elevation) * 0.78 * (1 - weatherScatter * 0.55);
    const targetScale = 0.74 + Math.min(0.45, heightAbove * 0.08) + mistStrength * 0.16;

    this.currentOpacity = THREE.MathUtils.damp(this.currentOpacity, targetOpacity, 10, clampedDt);
    this.currentSoftness = THREE.MathUtils.damp(this.currentSoftness, targetSoftness, 8, clampedDt);
    this.currentStretch = THREE.MathUtils.damp(this.currentStretch, sunStretch, 6, clampedDt);
    this.currentScale = THREE.MathUtils.damp(this.currentScale, targetScale, 10, clampedDt);

    if (this.currentOpacity < 0.008) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;

    // Offset slightly along the sun's cast ray based on sun elevation + character jump height
    const castOffset = (0.12 + (1 - solar.elevation) * 0.32 + heightAbove * 0.14) * (1 - weatherScatter * 0.5);
    this.mesh.position.set(
      playerX + solar.sunDirX * castOffset,
      surfaceY + 0.025,
      playerZ + solar.sunDirZ * castOffset
    );

    // Align the shadow's local +Z axis with the sun's cast direction and stretch along it
    this.mesh.rotation.set(0, Math.atan2(solar.sunDirX, solar.sunDirZ), 0);
    this.mesh.scale.set(
      this.currentScale,
      1,
      this.currentScale * this.currentStretch
    );

    this.material.uniforms.uOpacity.value = this.currentOpacity;
    this.material.uniforms.uSoftness.value = this.currentSoftness;

    // Subtle cool-slate tint in mist/rain vs deep forest-umbra in direct sun
    const shadowTint = this.material.uniforms.uColor.value as THREE.Color;
    shadowTint.setRGB(
      0.024 + rainStrength * 0.03 + mistStrength * 0.035,
      0.055 + mistStrength * 0.045 + rainStrength * 0.035,
      0.038 + rainStrength * 0.055 + mistStrength * 0.045
    );
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
