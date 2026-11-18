import * as THREE from 'three';
import { BiomeType, WeatherKind, WeatherMode } from '../types/game';
import { BiomePalette } from './levelRuntime';

interface RainDrop {
  rx: number;
  ry: number;
  rz: number;
  speed: number;
  len: number;
}

interface MistPuff {
  sprite: THREE.Sprite;
  rx: number;
  ry: number;
  rz: number;
  driftX: number;
  driftZ: number;
  baseScale: number;
  phase: number;
}

const _baseSky = new THREE.Color();
const _baseFog = new THREE.Color();
const _rainTint = new THREE.Color(0x526b7a);
const _mistTint = new THREE.Color(0x9abfb6);
const _volcanoMistTint = new THREE.Color(0x7c5042);

function createMistTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(245, 252, 250, 0.55)');
  grad.addColorStop(0.42, 'rgba(230, 245, 242, 0.28)');
  grad.addColorStop(0.75, 'rgba(215, 238, 235, 0.08)');
  grad.addColorStop(1, 'rgba(215, 238, 235, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const WEATHER_CYCLE_SECONDS = 15;

export class JungleWeatherSystem {
  public group: THREE.Group;

  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainDrops: RainDrop[] = [];

  private mistTex: THREE.CanvasTexture;
  private mistMat: THREE.SpriteMaterial;
  private mistPuffs: MistPuff[] = [];

  private currentWeather: WeatherKind = 'clear';
  private cycleTimer = 0;
  private cycleStep = 0;
  private cycleSequence: WeatherKind[] = ['clear', 'mist', 'rain'];

  public rainStrength = 0;
  public mistStrength = 0;
  private elapsed = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Light Rain Streak Particle System (Single Draw Call LineSegments)
    const dropCount = 340;
    this.rainPositions = new Float32Array(dropCount * 2 * 3);
    this.rainGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.rainPositions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.rainGeo.setAttribute('position', posAttr);

    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.group.add(this.rainLines);

    for (let i = 0; i < dropCount; i++) {
      this.rainDrops.push({
        rx: (Math.random() - 0.5) * 32,
        ry: Math.random() * 18,
        rz: (Math.random() - 0.5) * 38 - 10,
        speed: 19 + Math.random() * 9,
        len: 0.72 + Math.random() * 0.48,
      });
    }

    // 2. Drifting Jungle Mist Billboards
    this.mistTex = createMistTexture();
    this.mistMat = new THREE.SpriteMaterial({
      map: this.mistTex,
      color: 0xe6f7f2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const puffCount = 24;
    for (let i = 0; i < puffCount; i++) {
      const sprite = new THREE.Sprite(this.mistMat);
      const baseScale = 7.5 + (i % 5) * 2.1;
      sprite.scale.set(baseScale * 1.6, baseScale * 0.85, 1);
      sprite.visible = false;
      this.group.add(sprite);

      this.mistPuffs.push({
        sprite,
        rx: ((i % 6) - 2.5) * 6.5 + (Math.random() - 0.5) * 3.5,
        ry: 0.8 + (i % 4) * 1.45,
        rz: -36 + (i / puffCount) * 44,
        driftX: (i % 2 === 0 ? 1 : -1) * (0.55 + (i % 3) * 0.25),
        driftZ: 0.4 + (i % 3) * 0.18,
        baseScale,
        phase: i * 0.9,
      });
    }
  }

  public resetForLevel(biome: BiomeType, levelNumber: number, mode: WeatherMode) {
    this.cycleTimer = 0;
    this.cycleStep = 0;

    if (biome === 'waterfall') {
      this.cycleSequence = ['mist', 'rain', 'clear'];
    } else if (biome === 'ruins') {
      this.cycleSequence = levelNumber % 2 === 0 ? ['mist', 'clear', 'rain'] : ['clear', 'rain', 'mist'];
    } else if (biome === 'volcano') {
      this.cycleSequence = ['clear', 'mist', 'rain'];
    } else {
      this.cycleSequence = levelNumber % 3 === 0 ? ['rain', 'mist', 'clear'] : ['clear', 'mist', 'rain'];
    }

    this.currentWeather = mode === 'auto' ? this.cycleSequence[0] : mode;
    this.rainStrength = this.currentWeather === 'rain' ? 0.65 : 0;
    this.mistStrength = this.currentWeather === 'mist' ? 0.65 : 0;

    if (biome === 'volcano') {
      this.rainMat.color.setHex(0xfed7aa);
      this.mistMat.color.setHex(0xd6a89a);
    } else if (biome === 'waterfall') {
      this.rainMat.color.setHex(0xdbeafe);
      this.mistMat.color.setHex(0xdff7fa);
    } else {
      this.rainMat.color.setHex(0xdbeafe);
      this.mistMat.color.setHex(0xe6f7f2);
    }
  }

  public getActiveWeather(): WeatherKind {
    return this.currentWeather;
  }

  public update(
    dt: number,
    mode: WeatherMode,
    isPlaying: boolean,
    biome: BiomeType,
    palette: BiomePalette,
    anchorX: number,
    anchorY: number,
    anchorZ: number,
    scene: THREE.Scene,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight
  ) {
    const clampedDt = Math.min(dt, 0.05);
    this.elapsed += clampedDt;

    if (mode === 'auto') {
      if (isPlaying) {
        this.cycleTimer += clampedDt;
        if (this.cycleTimer >= WEATHER_CYCLE_SECONDS) {
          this.cycleTimer -= WEATHER_CYCLE_SECONDS;
          this.cycleStep = (this.cycleStep + 1) % this.cycleSequence.length;
        }
      }
      this.currentWeather = this.cycleSequence[this.cycleStep];
    } else {
      this.currentWeather = mode;
      this.cycleTimer = 0;
    }

    const targetRain = this.currentWeather === 'rain' ? 1 : 0;
    const targetMist = this.currentWeather === 'mist' ? 1 : 0;

    this.rainStrength = THREE.MathUtils.damp(this.rainStrength, targetRain, 1.6, clampedDt);
    this.mistStrength = THREE.MathUtils.damp(this.mistStrength, targetMist, 1.4, clampedDt);

    // Update Light Rain Streaks around the runner
    if (this.rainStrength > 0.015) {
      this.rainLines.visible = true;
      this.rainMat.opacity = this.rainStrength * 0.46;

      const windDriftX = -2.4;
      const arr = this.rainPositions;
      for (let i = 0; i < this.rainDrops.length; i++) {
        const d = this.rainDrops[i];
        d.ry -= d.speed * clampedDt;
        d.rx += windDriftX * clampedDt;

        if (d.ry < -2) {
          d.ry += 20;
          d.rx = (Math.random() - 0.5) * 32;
          d.rz = (Math.random() - 0.5) * 38 - 10;
        }
        if (d.rx < -16) d.rx += 32;

        const wx = anchorX + d.rx;
        const wy = anchorY + d.ry;
        const wz = anchorZ + d.rz;

        const idx = i * 6;
        arr[idx] = wx;
        arr[idx + 1] = wy;
        arr[idx + 2] = wz;
        arr[idx + 3] = wx - windDriftX * 0.032;
        arr[idx + 4] = wy + d.len;
        arr[idx + 5] = wz - 0.14;
      }
      (this.rainGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this.rainLines.visible = false;
    }

    // Update Drifting Jungle Mist Billboards
    const totalMistVis = Math.max(this.mistStrength, this.rainStrength * 0.25);
    if (totalMistVis > 0.015) {
      this.mistMat.opacity = this.mistStrength * 0.17 + this.rainStrength * 0.04;
      for (const puff of this.mistPuffs) {
        puff.sprite.visible = true;
        puff.rx += puff.driftX * clampedDt;
        puff.rz += puff.driftZ * clampedDt;
        if (puff.rx > 21) puff.rx -= 42;
        if (puff.rx < -21) puff.rx += 42;
        if (puff.rz > 8) puff.rz -= 44;
        if (puff.rz < -36) puff.rz += 44;

        const pulse = 1 + Math.sin(this.elapsed * 0.65 + puff.phase) * 0.08;
        puff.sprite.position.set(
          anchorX + puff.rx,
          anchorY + puff.ry + Math.sin(this.elapsed * 0.45 + puff.phase) * 0.35,
          anchorZ + puff.rz
        );
        puff.sprite.scale.set(
          puff.baseScale * 1.65 * pulse,
          puff.baseScale * 0.82 * pulse,
          1
        );
      }
    } else {
      for (const puff of this.mistPuffs) {
        puff.sprite.visible = false;
      }
    }

    // Modulate Scene Sky, Fog & Sunlight smoothly around active BiomePalette
    _baseSky.setHex(palette.skyHex);
    _baseFog.setHex(palette.fogHex);

    const activeMistTint = biome === 'volcano' ? _volcanoMistTint : _mistTint;
    if (this.mistStrength > 0.005) {
      _baseSky.lerp(activeMistTint, this.mistStrength * 0.38);
      _baseFog.lerp(activeMistTint, this.mistStrength * 0.44);
    }
    if (this.rainStrength > 0.005) {
      _baseSky.lerp(_rainTint, this.rainStrength * 0.42);
      _baseFog.lerp(_rainTint, this.rainStrength * 0.46);
    }

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(_baseSky);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(_baseFog);
      scene.fog.density =
        palette.fogDensity +
        this.mistStrength * 0.0095 +
        this.rainStrength * 0.0038;
    }

    sunLight.intensity = 1.72 - this.rainStrength * 0.48 - this.mistStrength * 0.28;
    hemiLight.intensity = 1.18 + this.mistStrength * 0.14 - this.rainStrength * 0.12;
  }

  public dispose() {
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.mistTex.dispose();
    this.mistMat.dispose();
  }
}
