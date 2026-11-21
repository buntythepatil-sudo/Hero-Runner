import * as THREE from 'three';
import { WeatherKind, WeatherMode } from '../types/game';

export type FoliageWindProfile =
  | 'canopy'
  | 'trunk'
  | 'bush'
  | 'fern'
  | 'grass'
  | 'vine';

export interface FoliageWindUniforms {
  uWindTime: { value: number };
  uWindStrength: { value: number };
  uWindGust: { value: number };
  uWindDir: { value: THREE.Vector2 };
}

interface ProfileShaderParams {
  primaryFreq: string;
  secondaryFreq: string;
  crossFreq: string;
  flutterFreq: string;
  swayAmp: string;
  crossAmp: string;
  flutterAmp: string;
  flexSnippet: string;
  verticalLift: string;
}

const PROFILE_PARAMS: Record<FoliageWindProfile, ProfileShaderParams> = {
  canopy: {
    primaryFreq: '1.35',
    secondaryFreq: '2.35',
    crossFreq: '1.05',
    flutterFreq: '5.4',
    swayAmp: '0.24',
    crossAmp: '0.09',
    flutterAmp: '0.055',
    flexSnippet: `
      float _wRadial = clamp(length(position.xz) * 0.30, 0.0, 1.35);
      float _wHeight = clamp((position.y + 1.6) * 0.28, 0.16, 1.25);
      float _wFlex = _wHeight * (0.55 + _wRadial * 0.55);
      float _wTipFlex = clamp(length(position) * 0.34, 0.15, 1.35);
    `,
    verticalLift: 'sin(uWindTime * 2.15 + _wSpatial) * uWindStrength * 0.045',
  },
  trunk: {
    primaryFreq: '1.18',
    secondaryFreq: '2.05',
    crossFreq: '0.92',
    flutterFreq: '3.0',
    swayAmp: '0.18',
    crossAmp: '0.06',
    flutterAmp: '0.0',
    flexSnippet: `
      float _wNormY = clamp((position.y + 4.5) / 9.4, 0.0, 1.0);
      float _wFlex = _wNormY * _wNormY;
      float _wTipFlex = 0.0;
    `,
    verticalLift: '0.0',
  },
  bush: {
    primaryFreq: '1.85',
    secondaryFreq: '3.1',
    crossFreq: '1.45',
    flutterFreq: '6.6',
    swayAmp: '0.115',
    crossAmp: '0.052',
    flutterAmp: '0.036',
    flexSnippet: `
      float _wHeight = clamp((position.y + 0.52) / 1.05, 0.0, 1.15);
      float _wFlex = _wHeight * _wHeight * 0.92 + clamp(length(position.xz) * 0.55, 0.0, 0.48) * _wHeight;
      float _wTipFlex = _wHeight * clamp(length(position) * 1.1, 0.2, 1.2);
    `,
    verticalLift: 'sin(uWindTime * 3.1 + _wSpatial) * uWindStrength * 0.022',
  },
  fern: {
    primaryFreq: '1.72',
    secondaryFreq: '2.95',
    crossFreq: '1.35',
    flutterFreq: '6.2',
    swayAmp: '0.20',
    crossAmp: '0.085',
    flutterAmp: '0.048',
    flexSnippet: `
      float _wReach = clamp(max(0.0, position.y) * 0.48 + max(0.0, position.z) * 0.34, 0.0, 1.2);
      float _wFlex = _wReach * _wReach;
      float _wTipFlex = _wFlex * (0.62 + abs(position.x) * 0.82);
    `,
    verticalLift: '-abs(_wPrimary) * uWindStrength * 0.065 + _wFlutter * uWindStrength * 0.024',
  },
  grass: {
    primaryFreq: '2.15',
    secondaryFreq: '3.6',
    crossFreq: '1.65',
    flutterFreq: '7.4',
    swayAmp: '0.25',
    crossAmp: '0.095',
    flutterAmp: '0.042',
    flexSnippet: `
      float _wNormY = clamp((position.y + 0.925) / 1.85, 0.0, 1.0);
      float _wFlex = _wNormY * _wNormY;
      float _wTipFlex = _wFlex;
    `,
    verticalLift: '-abs(_wPrimary) * uWindStrength * 0.052',
  },
  vine: {
    primaryFreq: '1.55',
    secondaryFreq: '2.65',
    crossFreq: '1.22',
    flutterFreq: '4.8',
    swayAmp: '0.22',
    crossAmp: '0.10',
    flutterAmp: '0.024',
    flexSnippet: `
      float _wHang = clamp((-position.y - 0.15) / 2.75, 0.0, 1.0);
      float _wFlex = _wHang * _wHang;
      float _wTipFlex = _wHang;
    `,
    verticalLift: 'abs(_wPrimary) * uWindStrength * 0.038',
  },
};

/**
 * Extends a Three.js MeshStandardMaterial with a GPU vertex shader wind sway & leaf flutter
 * pass via onBeforeCompile while preserving PBR lighting, bump maps, alphaTest, instancing,
 * and shadows.
 */
export function applyFoliageWindShader(
  material: THREE.MeshStandardMaterial,
  uniforms: FoliageWindUniforms,
  profile: FoliageWindProfile
): THREE.MeshStandardMaterial {
  const params = PROFILE_PARAMS[profile];
  material.customProgramCacheKey = () => `jungle_foliage_wind_v1_${profile}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.uniforms.uWindGust = uniforms.uWindGust;
    shader.uniforms.uWindDir = uniforms.uWindDir;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uWindTime;
      uniform float uWindStrength;
      uniform float uWindGust;
      uniform vec2 uWindDir;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      {
        mat4 _wMat = modelMatrix;
        #ifdef USE_INSTANCING
          _wMat = _wMat * instanceMatrix;
        #endif
        vec3 _wOrigin = _wMat[3].xyz;
        float _wSpatial = dot(_wOrigin.xz, uWindDir) * 0.14 + _wOrigin.x * 0.09 - _wOrigin.z * 0.07;

        float _wPrimary = sin(uWindTime * ${params.primaryFreq} + _wSpatial) * 0.65
                        + sin(uWindTime * ${params.secondaryFreq} + _wSpatial * 1.65 + 1.3) * 0.35;
        float _wGustEnv = 1.0 + uWindGust * (0.5 + 0.5 * sin(uWindTime * 0.72 + _wSpatial * 0.45));
        float _wFlutter = sin(uWindTime * ${params.flutterFreq} + position.x * 2.7 + position.y * 2.3 + position.z * 2.5 + _wSpatial * 2.1);

        ${params.flexSnippet}

        float _wSway = _wPrimary * _wGustEnv * uWindStrength * ${params.swayAmp} * _wFlex;
        float _wCross = cos(uWindTime * ${params.crossFreq} + _wSpatial * 1.25) * uWindStrength * ${params.crossAmp} * _wFlex;
        float _wTip = _wFlutter * (0.32 + uWindStrength * 0.72) * ${params.flutterAmp} * _wTipFlex;

        vec2 _wPerp = vec2(-uWindDir.y, uWindDir.x);
        vec2 _wWorldDisp = uWindDir * _wSway + _wPerp * _wCross + vec2(_wTip, -_wTip * 0.75);

        vec2 _wAxisX = vec2(_wMat[0].x, _wMat[0].z);
        vec2 _wAxisZ = vec2(_wMat[2].x, _wMat[2].z);
        float _wDenX = max(0.25, dot(_wAxisX, _wAxisX));
        float _wDenZ = max(0.25, dot(_wAxisZ, _wAxisZ));

        transformed.x += dot(_wWorldDisp, _wAxisX) / _wDenX;
        transformed.z += dot(_wWorldDisp, _wAxisZ) / _wDenZ;
        transformed.y += (${params.verticalLift}) * _wFlex;
      }
      `
    );
  };

  material.needsUpdate = true;
  return material;
}

/**
 * Weather-reactive GPU wind uniform controller shared across all jungle foliage materials.
 * Smoothly modulates sway intensity, phase speed, gustiness, and wind direction according to
 * the active weather mode (clear breeze, drifting mist swells, or lively rainstorm gusts).
 */
export class FoliageWindController {
  public readonly uniforms: FoliageWindUniforms;

  private elapsed = 0;
  private windPhaseTime = 0;
  private currentStrength = 0.44;
  private currentGust = 0.28;
  private currentSpeed = 1.0;

  constructor() {
    this.uniforms = {
      uWindTime: { value: 0 },
      uWindStrength: { value: 0.44 },
      uWindGust: { value: 0.28 },
      uWindDir: { value: new THREE.Vector2(0.86, 0.51) },
    };
  }

  public update(
    dt: number,
    weatherMode: WeatherMode,
    activeWeather: WeatherKind,
    rainStrength: number,
    mistStrength: number
  ) {
    const clampedDt = Math.min(dt, 0.05);
    this.elapsed += clampedDt;

    // Base intensity & gust targets blended smoothly from live weather strengths + weather mode
    const effectiveWeather: WeatherKind =
      weatherMode === 'auto' ? activeWeather : weatherMode;

    const modeBiasStrength =
      effectiveWeather === 'rain' ? 0.16 : effectiveWeather === 'mist' ? 0.08 : 0.0;
    const modeBiasGust =
      effectiveWeather === 'rain' ? 0.12 : effectiveWeather === 'mist' ? 0.05 : 0.0;

    // Clear: gentle sunlit breeze (~0.42), Mist: steady drifting breeze (~0.78), Rain: strong tropical gusts (~1.52)
    const targetStrength =
      0.42 + mistStrength * 0.34 + rainStrength * 0.96 + modeBiasStrength;
    const targetGust =
      0.24 + mistStrength * 0.28 + rainStrength * 0.62 + modeBiasGust;
    const targetSpeed =
      1.0 + mistStrength * 0.24 + rainStrength * 0.78 + (effectiveWeather === 'rain' ? 0.12 : 0);

    this.currentStrength = THREE.MathUtils.damp(this.currentStrength, targetStrength, 2.8, clampedDt);
    this.currentGust = THREE.MathUtils.damp(this.currentGust, targetGust, 2.4, clampedDt);
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 2.6, clampedDt);

    // Advance wind phase monotonically so frequency shifts never cause visual jumps
    this.windPhaseTime += clampedDt * this.currentSpeed;

    // Natural organic gust surge layered over the baseline weather strength
    const gustSurge =
      1.0 +
      (0.12 + rainStrength * 0.16 + mistStrength * 0.06) *
        Math.sin(this.elapsed * (0.55 + rainStrength * 0.55)) *
        Math.cos(this.elapsed * 0.31 + 0.7);

    // Slowly veering jungle wind direction (angles slightly stronger across the trail during rain)
    const dirAngle =
      0.52 +
      Math.sin(this.elapsed * 0.16) * 0.34 +
      rainStrength * 0.32 * Math.sin(this.elapsed * 0.42);
    this.uniforms.uWindDir.value.set(Math.cos(dirAngle), Math.sin(dirAngle));
    this.uniforms.uWindTime.value = this.windPhaseTime;
    this.uniforms.uWindStrength.value = this.currentStrength * gustSurge;
    this.uniforms.uWindGust.value = this.currentGust;
  }

  /** Normalized multiplier (0.75 in clear -> 1.2 in mist -> 2.0 in rain) to sync macro sway with shader wind. */
  public getWindScale(): number {
    return THREE.MathUtils.clamp(this.currentStrength * 1.45, 0.65, 2.25);
  }
}
