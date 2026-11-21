import * as THREE from 'three';
import { FestivalId } from '../types/game';
import { BiomePalette } from './levelRuntime';

export interface FestivalTheme {
  id: FestivalId;
  name: string;
  subtitle: string;
  accentHex: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  sunIntensity: number;
  hemiIntensity: number;
  isNight: boolean;
}

export const FESTIVAL_THEMES: FestivalTheme[] = [
  {
    id: 'diwali',
    name: 'Diwali',
    subtitle: 'Festival of Lights',
    accentHex: '#fbbf24',
    skyHex: 0x140d33,
    fogHex: 0x2f1a4d,
    fogDensity: 0.0068,
    hemiSky: 0xffd180,
    hemiGround: 0x4a2511,
    sunColor: 0xffc86b,
    sunIntensity: 1.48,
    hemiIntensity: 1.16,
    isNight: true,
  },
  {
    id: 'holi',
    name: 'Holi',
    subtitle: 'Festival of Colors',
    accentHex: '#f472b6',
    skyHex: 0x4cc9f0,
    fogHex: 0xf4a2c5,
    fogDensity: 0.0064,
    hemiSky: 0xfff0f8,
    hemiGround: 0x6b3f5e,
    sunColor: 0xfff2c2,
    sunIntensity: 1.8,
    hemiIntensity: 1.28,
    isNight: false,
  },
  {
    id: 'uttarayan',
    name: 'Uttarayan',
    subtitle: 'Sky Kite Festival',
    accentHex: '#38bdf8',
    skyHex: 0x1e96fc,
    fogHex: 0x7dd3fc,
    fogDensity: 0.0056,
    hemiSky: 0xe0f7ff,
    hemiGround: 0x3b6e35,
    sunColor: 0xfff3b0,
    sunIntensity: 1.88,
    hemiIntensity: 1.25,
    isNight: false,
  },
  {
    id: 'halloween',
    name: 'Halloween',
    subtitle: 'Harvest Moon Night',
    accentHex: '#fb923c',
    skyHex: 0x160a28,
    fogHex: 0x311848,
    fogDensity: 0.0082,
    hemiSky: 0xc490ff,
    hemiGround: 0x5c2b14,
    sunColor: 0xffb36b,
    sunIntensity: 1.38,
    hemiIntensity: 1.12,
    isNight: true,
  },
  {
    id: 'christmas',
    name: 'Christmas',
    subtitle: 'Winter Wonderland',
    accentHex: '#34d399',
    skyHex: 0x0d2244,
    fogHex: 0x1f3d66,
    fogDensity: 0.007,
    hemiSky: 0xdbeafe,
    hemiGround: 0x1e3a5f,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.52,
    hemiIntensity: 1.22,
    isNight: true,
  },
  {
    id: 'lunar_new_year',
    name: 'Lunar New Year',
    subtitle: 'Red Lantern Gala',
    accentHex: '#f87171',
    skyHex: 0x360916,
    fogHex: 0x631624,
    fogDensity: 0.007,
    hemiSky: 0xffd699,
    hemiGround: 0x4c1016,
    sunColor: 0xfde047,
    sunIntensity: 1.52,
    hemiIntensity: 1.18,
    isNight: true,
  },
  {
    id: 'hanami',
    name: 'Hanami',
    subtitle: 'Cherry Blossom Spring',
    accentHex: '#f9a8d4',
    skyHex: 0x90caf9,
    fogHex: 0xfbcfe8,
    fogDensity: 0.0064,
    hemiSky: 0xfff1f7,
    hemiGround: 0x5c3e4e,
    sunColor: 0xfff5e0,
    sunIntensity: 1.76,
    hemiIntensity: 1.26,
    isNight: false,
  },
  {
    id: 'eid',
    name: 'Eid Nights',
    subtitle: 'Crescent & Lanterns',
    accentHex: '#fcd34d',
    skyHex: 0x082032,
    fogHex: 0x123b52,
    fogDensity: 0.0068,
    hemiSky: 0xbae6fd,
    hemiGround: 0x1c3d3c,
    sunColor: 0xfef08a,
    sunIntensity: 1.46,
    hemiIntensity: 1.16,
    isNight: true,
  },
];

export function getFestivalForLevel(levelNumber: number): FestivalTheme {
  const idx = ((Math.max(1, levelNumber) - 1) % FESTIVAL_THEMES.length + FESTIVAL_THEMES.length) % FESTIVAL_THEMES.length;
  return FESTIVAL_THEMES[idx];
}

export function getFestivalBiomePalette(
  base: BiomePalette,
  festival: FestivalTheme
): BiomePalette {
  return {
    ...base,
    skyHex: festival.skyHex,
    fogHex: festival.fogHex,
    fogDensity: festival.fogDensity,
    hemiSky: festival.hemiSky,
    hemiGround: festival.hemiGround,
    sunColor: festival.sunColor,
  };
}

interface FloatingProp {
  obj: THREE.Object3D;
  rx: number;
  ry: number;
  rz: number;
  baseY: number;
  speedY: number;
  driftX: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  wrapZMin: number;
  wrapZMax: number;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  tail?: THREE.Object3D;
  flapSpeed?: number;
}

interface FireworkBurst {
  points: THREE.Points;
  positions: Float32Array;
  dirs: Float32Array;
  mat: THREE.PointsMaterial;
  rx: number;
  ry: number;
  rz: number;
  age: number;
  duration: number;
  cooldown: number;
  radius: number;
  colors: number[];
  colorIdx: number;
}

interface ParticleField {
  points: THREE.Points;
  positions: Float32Array;
  relX: Float32Array;
  relY: Float32Array;
  relZ: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  velZ: Float32Array;
  phases: Float32Array;
  count: number;
  zMin: number;
  zMax: number;
  yMin: number;
  yMax: number;
  xSpan: number;
  swirlAmp: number;
}

interface HorizonProp {
  obj: THREE.Object3D;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  bobAmp: number;
  bobFreq: number;
  rotSpeed?: number;
}

function createSoftGlowTexture(
  innerColor: string,
  midColor: string,
  outerColor: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.4, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPetalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.bezierCurveTo(52, 12, 56, 38, 32, 58);
  ctx.bezierCurveTo(8, 38, 12, 12, 32, 6);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCrescentMoonTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Soft golden aura
  const halo = ctx.createRadialGradient(128, 128, 28, 128, 128, 122);
  halo.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
  halo.addColorStop(0.55, 'rgba(251, 191, 36, 0.16)');
  halo.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 256, 256);

  // Crisp crescent shape via offscreen cut
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = 256;
  maskCanvas.height = 256;
  const mctx = maskCanvas.getContext('2d')!;
  mctx.fillStyle = '#fef08a';
  mctx.beginPath();
  mctx.arc(124, 128, 66, 0, Math.PI * 2);
  mctx.fill();
  mctx.globalCompositeOperation = 'destination-out';
  mctx.beginPath();
  mctx.arc(150, 114, 56, 0, Math.PI * 2);
  mctx.fill();

  ctx.drawImage(maskCanvas, 0, 0);

  // Radiant 8-pointed star tucked beside crescent
  ctx.fillStyle = '#fffbeb';
  ctx.save();
  ctx.translate(166, 102);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 18 : 6.5;
    const ang = (i / 16) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createAuroraTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
  grad.addColorStop(0.28, 'rgba(52, 211, 153, 0.55)');
  grad.addColorStop(0.62, 'rgba(56, 189, 248, 0.42)');
  grad.addColorStop(0.85, 'rgba(167, 139, 250, 0.22)');
  grad.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  // Vertical curtain streaks
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * 256;
    const streak = ctx.createLinearGradient(x, 0, x + 10, 0);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 12, 10, 108);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class FestivalBackgroundSystem {
  public readonly group = new THREE.Group();
  private activeFestivalId: FestivalId | null = null;
  private enabled = false;
  private elapsed = 0;

  private props: FloatingProp[] = [];
  private horizonProps: HorizonProp[] = [];
  private fireworks: FireworkBurst[] = [];
  private particleFields: ParticleField[] = [];

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];

  private starField: THREE.Points | null = null;

  constructor() {
    this.group.visible = false;
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private trackTex<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  public setEnabled(enabled: boolean, festival?: FestivalTheme) {
    this.enabled = enabled;
    this.group.visible = enabled;
    if (!enabled) return;
    if (festival && festival.id !== this.activeFestivalId) {
      this.buildFestival(festival);
    }
  }

  private clearFestivalObjects() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    this.geometries = [];
    this.materials = [];
    this.textures = [];
    this.props = [];
    this.horizonProps = [];
    this.fireworks = [];
    this.particleFields = [];
    this.starField = null;
  }

  private addStarField(count: number, tintHex: number) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const sideX = (Math.random() - 0.5) * 165;
      const y = 14 + Math.random() * 58;
      const z = -98 + Math.random() * 76;
      positions[i * 3] = sideX;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    const geo = this.trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const glowTex = this.trackTex(
      createSoftGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)')
    );
    const mat = this.trackMat(
      new THREE.PointsMaterial({
        color: tintHex,
        size: 1.45,
        map: glowTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const stars = new THREE.Points(geo, mat);
    stars.frustumCulled = false;
    this.group.add(stars);
    this.starField = stars;
  }

  private addFireworks(count: number, palette: number[]) {
    const sparkTex = this.trackTex(
      createSoftGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)')
    );
    const sparksPerBurst = 56;
    for (let b = 0; b < count; b++) {
      const positions = new Float32Array(sparksPerBurst * 3);
      const dirs = new Float32Array(sparksPerBurst * 3);
      for (let i = 0; i < sparksPerBurst; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.68 + Math.random() * 0.42;
        dirs[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        dirs[i * 3 + 1] = Math.cos(phi) * speed;
        dirs[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }
      const geo = this.trackGeo(new THREE.BufferGeometry());
      const attr = new THREE.BufferAttribute(positions, 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', attr);

      const colorIdx = b % palette.length;
      const mat = this.trackMat(
        new THREE.PointsMaterial({
          color: palette[colorIdx],
          size: 1.9,
          map: sparkTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      this.group.add(points);

      const side = b % 2 === 0 ? -1 : 1;
      this.fireworks.push({
        points,
        positions,
        dirs,
        mat,
        rx: side * (12 + (b % 3) * 11) + (Math.random() - 0.5) * 8,
        ry: 18 + (b % 3) * 5.5,
        rz: -52 - (b % 4) * 9,
        age: -b * 0.65,
        duration: 1.75 + (b % 3) * 0.22,
        cooldown: 0.7 + (b % 2) * 0.45,
        radius: 9.5 + (b % 3) * 2.4,
        colors: palette,
        colorIdx,
      });
    }
  }

  private addParticleField(opts: {
    count: number;
    colors: number[];
    size: number;
    tex: THREE.Texture;
    xSpan: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
    vxBase: number;
    vyBase: number;
    vzBase: number;
    swirlAmp: number;
    additive?: boolean;
    opacity?: number;
  }) {
    const { count } = opts;
    const positions = new Float32Array(count * 3);
    const colorsAttr = new Float32Array(count * 3);
    const relX = new Float32Array(count);
    const relY = new Float32Array(count);
    const relZ = new Float32Array(count);
    const velX = new Float32Array(count);
    const velY = new Float32Array(count);
    const velZ = new Float32Array(count);
    const phases = new Float32Array(count);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      relX[i] = (Math.random() - 0.5) * opts.xSpan;
      relY[i] = opts.yMin + Math.random() * (opts.yMax - opts.yMin);
      relZ[i] = opts.zMin + Math.random() * (opts.zMax - opts.zMin);
      velX[i] = opts.vxBase + (Math.random() - 0.5) * 1.1;
      velY[i] = opts.vyBase * (0.7 + Math.random() * 0.65);
      velZ[i] = opts.vzBase + (Math.random() - 0.5) * 0.8;
      phases[i] = Math.random() * Math.PI * 2;

      tmpCol.setHex(opts.colors[i % opts.colors.length]);
      colorsAttr[i * 3] = tmpCol.r;
      colorsAttr[i * 3 + 1] = tmpCol.g;
      colorsAttr[i * 3 + 2] = tmpCol.b;
    }

    const geo = this.trackGeo(new THREE.BufferGeometry());
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', new THREE.BufferAttribute(colorsAttr, 3));

    const mat = this.trackMat(
      new THREE.PointsMaterial({
        size: opts.size,
        map: opts.tex,
        vertexColors: true,
        transparent: true,
        opacity: opts.opacity ?? 0.9,
        depthWrite: false,
        blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      })
    );

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.group.add(points);

    this.particleFields.push({
      points,
      positions,
      relX,
      relY,
      relZ,
      velX,
      velY,
      velZ,
      phases,
      count,
      zMin: opts.zMin,
      zMax: opts.zMax,
      yMin: opts.yMin,
      yMax: opts.yMax,
      xSpan: opts.xSpan,
      swirlAmp: opts.swirlAmp,
    });
  }

  private buildSkyLantern(
    bodyHex: number,
    glowHex: number,
    trimHex: number,
    scale: number,
    withTassel: boolean
  ): THREE.Group {
    const g = new THREE.Group();
    const bodyGeo = this.trackGeo(new THREE.CylinderGeometry(0.42, 0.28, 0.82, 10));
    const capGeo = this.trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 0.1, 10));
    const flameGeo = this.trackGeo(new THREE.SphereGeometry(0.14, 8, 6));

    const bodyMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: bodyHex,
        transparent: true,
        opacity: 0.92,
      })
    );
    const trimMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: trimHex })
    );
    const flameMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: glowHex })
    );

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const topCap = new THREE.Mesh(capGeo, trimMat);
    topCap.position.y = 0.44;
    const botCap = new THREE.Mesh(capGeo, trimMat);
    botCap.position.y = -0.44;
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = -0.34;
    g.add(body, topCap, botCap, flame);

    if (withTassel) {
      const tasselGeo = this.trackGeo(new THREE.ConeGeometry(0.08, 0.44, 6));
      const tassel = new THREE.Mesh(tasselGeo, trimMat);
      tassel.rotation.x = Math.PI;
      tassel.position.y = -0.72;
      g.add(tassel);
    }

    g.scale.setScalar(scale);
    return g;
  }

  private buildKite(primaryHex: number, accentHex: number, scale: number) {
    const root = new THREE.Group();

    // Traditional diamond Patang body (two bevel-angled triangular halves for crisp silhouette)
    const kiteShape = new THREE.Shape();
    kiteShape.moveTo(0, 0.95);
    kiteShape.lineTo(0.76, 0.14);
    kiteShape.lineTo(0, -0.88);
    kiteShape.lineTo(-0.76, 0.14);
    kiteShape.closePath();

    const bodyGeo = this.trackGeo(new THREE.ShapeGeometry(kiteShape));
    const bodyMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: primaryHex,
        side: THREE.DoubleSide,
      })
    );
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    root.add(body);

    // Contrasting diagonal stripe accent & bamboo spars
    const accentShape = new THREE.Shape();
    accentShape.moveTo(0, 0.92);
    accentShape.lineTo(0.36, 0.52);
    accentShape.lineTo(0, 0.14);
    accentShape.lineTo(-0.36, 0.52);
    accentShape.closePath();
    const accentGeo = this.trackGeo(new THREE.ShapeGeometry(accentShape));
    const accentMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: accentHex,
        side: THREE.DoubleSide,
      })
    );
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.position.z = 0.015;
    root.add(accent);

    const sparMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x3b2314 }));
    const vSpar = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.035, 1.82, 0.02)),
      sparMat
    );
    vSpar.position.set(0, 0.03, 0.02);
    const hSpar = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(1.5, 0.035, 0.02)),
      sparMat
    );
    hSpar.position.set(0, 0.14, 0.02);
    root.add(vSpar, hSpar);

    // Fluttering multi-segment triangular kite tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, -0.88, 0);
    const tailGeo = this.trackGeo(new THREE.ConeGeometry(0.18, 0.55, 3));
    const tail1 = new THREE.Mesh(tailGeo, accentMat);
    tail1.position.y = -0.26;
    const tailRibbon = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(0.12, 1.35)),
      bodyMat
    );
    tailRibbon.position.y = -1.02;
    tailPivot.add(tail1, tailRibbon);
    root.add(tailPivot);

    // Long slender white kite string (manja) sloping downward
    const stringMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
      })
    );
    const stringMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 9.5, 4)),
      stringMat
    );
    stringMesh.position.set(0, -4.6, 1.6);
    stringMesh.rotation.x = 0.32;
    root.add(stringMesh);

    root.scale.setScalar(scale);
    return { root, tailPivot };
  }

  private buildJackOLantern(scale: number): THREE.Group {
    const g = new THREE.Group();
    const pumpkinMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: 0xc2410c,
        emissiveIntensity: 0.42,
        roughness: 0.55,
      })
    );
    const glowMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    const stemMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 })
    );

    // Sculpted ribbed pumpkin body
    const body = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.68, 12, 10)),
      pumpkinMat
    );
    body.scale.set(1.12, 0.88, 1.05);
    g.add(body);

    const stem = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.08, 0.14, 0.32, 6)),
      stemMat
    );
    stem.position.set(0, 0.65, 0);
    stem.rotation.z = 0.22;
    g.add(stem);

    // Glowing carved triangular eyes & wide spooky grin facing the runner (+Z)
    const eyeGeo = this.trackGeo(new THREE.ConeGeometry(0.14, 0.2, 3));
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, glowMat);
      eye.position.set(sx * 0.24, 0.14, 0.66);
      eye.rotation.z = sx * -0.15;
      g.add(eye);
    }
    const grin = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.56, 0.15, 0.08)),
      glowMat
    );
    grin.position.set(0, -0.18, 0.66);
    g.add(grin);

    g.scale.setScalar(scale);
    return g;
  }

  private buildHalloweenBat(scale: number) {
    const root = new THREE.Group();
    const darkMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: 0x11081c, side: THREE.DoubleSide })
    );
    const eyeMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf97316 }));

    const body = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.16, 8, 6)),
      darkMat
    );
    body.scale.set(0.9, 0.85, 1.45);
    root.add(body);

    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(
        this.trackGeo(new THREE.ConeGeometry(0.05, 0.14, 4)),
        darkMat
      );
      ear.position.set(sx * 0.08, 0.16, 0.1);
      const eye = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.028, 6, 6)),
        eyeMat
      );
      eye.position.set(sx * 0.06, 0.04, 0.2);
      root.add(ear, eye);
    }

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.55, 0.24);
    wingShape.lineTo(0.92, -0.05);
    wingShape.lineTo(0.62, -0.22);
    wingShape.lineTo(0.32, -0.12);
    wingShape.lineTo(0, -0.22);
    wingShape.closePath();
    const wingGeo = this.trackGeo(new THREE.ShapeGeometry(wingShape));

    const leftWing = new THREE.Group();
    const lwMesh = new THREE.Mesh(wingGeo, darkMat);
    lwMesh.rotation.x = -Math.PI * 0.42;
    lwMesh.scale.x = -1;
    leftWing.add(lwMesh);

    const rightWing = new THREE.Group();
    const rwMesh = new THREE.Mesh(wingGeo, darkMat);
    rwMesh.rotation.x = -Math.PI * 0.42;
    rightWing.add(rwMesh);

    root.add(leftWing, rightWing);
    root.scale.setScalar(scale);
    return { root, leftWing, rightWing };
  }

  private buildFestival(festival: FestivalTheme) {
    this.clearFestivalObjects();
    this.activeFestivalId = festival.id;

    const softGlow = this.trackTex(
      createSoftGlowTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)')
    );

    if (festival.id === 'diwali') {
      // Starry night sky + vibrant multi-hue fireworks + rising golden kandeel sky lanterns + horizon diya glow
      this.addStarField(160, 0xfef08a);
      this.addFireworks(6, [0xfbbf24, 0xf472b6, 0x38bdf8, 0x34d399, 0xfb923c, 0xc084fc]);

      const lanternColors = [0xffb703, 0xfb8500, 0xfef08a, 0xff6b6b, 0xf59e0b];
      const glowHaloMat = this.trackMat(
        new THREE.SpriteMaterial({
          map: softGlow,
          color: 0xffb703,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      for (let i = 0; i < 24; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const col = lanternColors[i % lanternColors.length];
        const lantern = this.buildSkyLantern(col, 0xfffbeb, 0x92400e, 0.9 + (i % 3) * 0.28, false);
        const halo = new THREE.Sprite(glowHaloMat);
        halo.scale.set(3.2, 3.2, 1);
        lantern.add(halo);
        this.group.add(lantern);

        const baseY = 3.5 + (i % 6) * 2.8;
        this.props.push({
          obj: lantern,
          rx: side * (9.5 + (i % 5) * 4.5) + (Math.random() - 0.5) * 3.5,
          ry: baseY,
          rz: -85 + (i / 24) * 95,
          baseY,
          speedY: 0.9 + (i % 3) * 0.35,
          driftX: side * 0.25,
          swayAmp: 0.85,
          swayFreq: 0.9 + (i % 4) * 0.15,
          phase: i * 0.77,
          wrapZMin: -88,
          wrapZMax: 10,
        });
      }

      // Warm floating golden marigold / diya spark embers
      this.addParticleField({
        count: 180,
        colors: [0xfde047, 0xfb923c, 0xfbbf24, 0xf472b6],
        size: 0.72,
        tex: softGlow,
        xSpan: 56,
        yMin: 1,
        yMax: 24,
        zMin: -72,
        zMax: 10,
        vxBase: 0,
        vyBase: 1.35,
        vzBase: 0.3,
        swirlAmp: 0.85,
        additive: true,
        opacity: 0.92,
      });
    } else if (festival.id === 'holi') {
      // Giant vivid billowing gulal color powder clouds + rainbow color-dust sparkles
      const holiPalette = [0xec4899, 0xfacc15, 0x06b6d4, 0xa855f7, 0x22c55e, 0xf97316];
      const cloudTex = this.trackTex(
        createSoftGlowTexture('rgba(255,255,255,0.72)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)')
      );

      for (let i = 0; i < 24; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const col = holiPalette[i % holiPalette.length];
        const mat = this.trackMat(
          new THREE.SpriteMaterial({
            map: cloudTex,
            color: col,
            transparent: true,
            opacity: 0.56,
            depthWrite: false,
          })
        );
        const puff = new THREE.Sprite(mat);
        const s = 10 + (i % 4) * 3.8;
        puff.scale.set(s * 1.35, s * 0.95, 1);
        this.group.add(puff);

        const baseY = 3 + (i % 5) * 3.4;
        this.props.push({
          obj: puff,
          rx: side * (11 + (i % 4) * 5.2),
          ry: baseY,
          rz: -88 + (i / 24) * 96,
          baseY,
          speedY: 0.35 + (i % 3) * 0.2,
          driftX: -side * 0.45,
          swayAmp: 1.8,
          swayFreq: 0.65 + (i % 3) * 0.2,
          phase: i * 1.1,
          wrapZMin: -90,
          wrapZMax: 10,
        });
      }

      // Celebratory rainbow gulal bursts high in the sky
      this.addFireworks(5, holiPalette);

      // Dense swirling rainbow gulal powder particles
      this.addParticleField({
        count: 260,
        colors: holiPalette,
        size: 1.15,
        tex: softGlow,
        xSpan: 52,
        yMin: 0.5,
        yMax: 22,
        zMin: -66,
        zMax: 10,
        vxBase: 0.6,
        vyBase: -0.55,
        vzBase: 0.5,
        swirlAmp: 1.6,
        additive: false,
        opacity: 0.88,
      });
    } else if (festival.id === 'uttarayan') {
      // Bright winter sun disc + 28 vibrant dancing 3D Indian Patang kites across the cerulean sky
      const sunTex = this.trackTex(
        createSoftGlowTexture('rgba(255,253,224,1)', 'rgba(253,224,71,0.58)', 'rgba(253,224,71,0)')
      );
      const sunSprite = new THREE.Sprite(
        this.trackMat(
          new THREE.SpriteMaterial({
            map: sunTex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      sunSprite.scale.set(28, 28, 1);
      this.group.add(sunSprite);
      this.horizonProps.push({
        obj: sunSprite,
        offsetX: 22,
        offsetY: 32,
        offsetZ: -86,
        bobAmp: 0.4,
        bobFreq: 0.3,
      });

      const kiteCombos: [number, number][] = [
        [0xf97316, 0xfef08a],
        [0xec4899, 0x38bdf8],
        [0x22c55e, 0xfacc15],
        [0xef4444, 0xffffff],
        [0x8b5cf6, 0xfde047],
        [0x06b6d4, 0xf43f5e],
        [0xeab308, 0x1d4ed8],
      ];

      for (let i = 0; i < 28; i++) {
        const [pCol, aCol] = kiteCombos[i % kiteCombos.length];
        const scale = 1.25 + (i % 4) * 0.35;
        const { root, tailPivot } = this.buildKite(pCol, aCol, scale);
        this.group.add(root);

        const laneSpread = ((i % 7) - 3) * 8.2 + (Math.random() - 0.5) * 4;
        const baseY = 9.5 + (i % 5) * 3.8;
        this.props.push({
          obj: root,
          rx: laneSpread,
          ry: baseY,
          rz: -90 + (i / 28) * 96,
          baseY,
          speedY: 0,
          driftX: 0,
          swayAmp: 2.3 + (i % 3) * 0.7,
          swayFreq: 0.85 + (i % 4) * 0.22,
          phase: i * 0.93,
          wrapZMin: -92,
          wrapZMax: 8,
          tail: tailPivot,
        });
      }

      // Crisp sunlit breeze sparkles
      this.addParticleField({
        count: 90,
        colors: [0xffffff, 0xfef9c3, 0xbae6fd],
        size: 0.65,
        tex: softGlow,
        xSpan: 60,
        yMin: 5,
        yMax: 28,
        zMin: -72,
        zMax: 8,
        vxBase: 1.8,
        vyBase: 0.25,
        vzBase: 0.4,
        swirlAmp: 0.9,
        additive: true,
        opacity: 0.6,
      });
    } else if (festival.id === 'halloween') {
      // Giant eerie Harvest Full Moon + flapping 3D bats + floating glowing Jack-o'-Lanterns + haunted embers
      this.addStarField(120, 0xe9d5ff);

      const moonTex = this.trackTex(
        createSoftGlowTexture('rgba(255,245,214,1)', 'rgba(251,146,60,0.45)', 'rgba(192,132,252,0)')
      );
      const moonHalo = new THREE.Sprite(
        this.trackMat(
          new THREE.SpriteMaterial({
            map: moonTex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        )
      );
      moonHalo.scale.set(34, 34, 1);
      this.group.add(moonHalo);

      const moonDisc = new THREE.Mesh(
        this.trackGeo(new THREE.CircleGeometry(7.2, 28)),
        this.trackMat(new THREE.MeshBasicMaterial({ color: 0xfef3c7 }))
      );
      this.group.add(moonDisc);
      this.horizonProps.push(
        { obj: moonHalo, offsetX: -14, offsetY: 25, offsetZ: -86, bobAmp: 0.25, bobFreq: 0.3 },
        { obj: moonDisc, offsetX: -14, offsetY: 25, offsetZ: -85, bobAmp: 0.25, bobFreq: 0.3 }
      );

      // 12 Glowing Floating Jack-o'-Lantern Pumpkins lining the haunted chasm
      const pumpkinGlowMat = this.trackMat(
        new THREE.SpriteMaterial({
          map: softGlow,
          color: 0xf97316,
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const pumpkin = this.buildJackOLantern(1.25 + (i % 3) * 0.28);
        const halo = new THREE.Sprite(pumpkinGlowMat);
        halo.scale.set(3.4, 3.4, 1);
        pumpkin.add(halo);
        this.group.add(pumpkin);

        const baseY = 3.2 + (i % 4) * 2.4;
        this.props.push({
          obj: pumpkin,
          rx: side * (9.2 + (i % 3) * 3.8),
          ry: baseY,
          rz: -82 + (i / 12) * 90,
          baseY,
          speedY: 0,
          driftX: 0,
          swayAmp: 0.9,
          swayFreq: 1.2 + (i % 3) * 0.25,
          phase: i * 1.3,
          wrapZMin: -84,
          wrapZMax: 10,
        });
      }

      // 14 Articulated Flapping Bats swooping across the moonlit sky
      for (let i = 0; i < 14; i++) {
        const bat = this.buildHalloweenBat(1.25 + (i % 3) * 0.32);
        this.group.add(bat.root);
        const baseY = 8 + (i % 5) * 3.2;
        this.props.push({
          obj: bat.root,
          rx: ((i % 7) - 3) * 7.5,
          ry: baseY,
          rz: -85 + (i / 14) * 92,
          baseY,
          speedY: 0,
          driftX: (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 3) * 0.7),
          swayAmp: 1.4,
          swayFreq: 1.8,
          phase: i * 0.85,
          wrapZMin: -86,
          wrapZMax: 10,
          leftWing: bat.leftWing,
          rightWing: bat.rightWing,
          flapSpeed: 12 + (i % 3) * 2.5,
        });
      }

      // Eerie orange & violet haunted embers
      this.addParticleField({
        count: 160,
        colors: [0xf97316, 0xc084fc, 0xfacc15, 0xa855f7],
        size: 0.78,
        tex: softGlow,
        xSpan: 54,
        yMin: 1,
        yMax: 22,
        zMin: -70,
        zMax: 10,
        vxBase: 0,
        vyBase: 0.95,
        vzBase: 0.3,
        swirlAmp: 1.15,
        additive: true,
        opacity: 0.86,
      });
    } else if (festival.id === 'christmas') {
      // Starry winter night + Aurora Borealis curtain + gentle snowfall + glowing floating ornaments
      this.addStarField(170, 0xe0f2fe);

      const auroraTex = this.trackTex(createAuroraTexture());
      const auroraMat = this.trackMat(
        new THREE.MeshBasicMaterial({
          map: auroraTex,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        })
      );
      const auroraRibbon = new THREE.Mesh(
        this.trackGeo(new THREE.PlaneGeometry(96, 22, 16, 1)),
        auroraMat
      );
      this.group.add(auroraRibbon);
      this.horizonProps.push({
        obj: auroraRibbon,
        offsetX: 0,
        offsetY: 28,
        offsetZ: -84,
        bobAmp: 1.2,
        bobFreq: 0.45,
      });

      // Glowing Christmas Ornaments floating along both flanks
      const ornamentColors = [0xef4444, 0x22c55e, 0xfacc15, 0x38bdf8];
      const ornamentGeo = this.trackGeo(new THREE.SphereGeometry(0.62, 12, 10));
      const capGeo = this.trackGeo(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 8));
      const goldMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }));

      for (let i = 0; i < 18; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const g = new THREE.Group();
        const col = ornamentColors[i % ornamentColors.length];
        const ballMat = this.trackMat(
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.55,
            metalness: 0.65,
            roughness: 0.2,
          })
        );
        const ball = new THREE.Mesh(ornamentGeo, ballMat);
        const cap = new THREE.Mesh(capGeo, goldMat);
        cap.position.y = 0.64;
        g.add(ball, cap);
        g.scale.setScalar(1.0 + (i % 3) * 0.25);
        this.group.add(g);

        const baseY = 4.2 + (i % 5) * 2.5;
        this.props.push({
          obj: g,
          rx: side * (9.5 + (i % 4) * 4.2),
          ry: baseY,
          rz: -85 + (i / 18) * 94,
          baseY,
          speedY: 0,
          driftX: 0,
          swayAmp: 0.65,
          swayFreq: 1.0,
          phase: i * 0.9,
          wrapZMin: -86,
          wrapZMax: 10,
        });
      }

      // Soft drifting 3D snowfall
      this.addParticleField({
        count: 280,
        colors: [0xffffff, 0xe0f2fe, 0xfef9c3],
        size: 0.72,
        tex: softGlow,
        xSpan: 56,
        yMin: -1,
        yMax: 24,
        zMin: -66,
        zMax: 10,
        vxBase: -0.75,
        vyBase: -2.4,
        vzBase: 0.4,
        swirlAmp: 1.2,
        additive: true,
        opacity: 0.92,
      });
    } else if (festival.id === 'lunar_new_year') {
      // Imperial crimson sky + red silk lanterns with gold tassels + crimson & gold fireworks
      this.addStarField(140, 0xfde047);
      this.addFireworks(5, [0xfde047, 0xef4444, 0xfb923c, 0xfef08a]);

      const redGlowMat = this.trackMat(
        new THREE.SpriteMaterial({
          map: softGlow,
          color: 0xef4444,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      for (let i = 0; i < 20; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const lantern = this.buildSkyLantern(
          i % 4 === 0 ? 0xf59e0b : 0xdc2626,
          0xfef08a,
          0xfacc15,
          1.15 + (i % 3) * 0.25,
          true
        );
        const halo = new THREE.Sprite(redGlowMat);
        halo.scale.set(3.4, 3.4, 1);
        lantern.add(halo);
        this.group.add(lantern);

        const baseY = 4.5 + (i % 5) * 2.6;
        this.props.push({
          obj: lantern,
          rx: side * (9.2 + (i % 4) * 4.4),
          ry: baseY,
          rz: -86 + (i / 20) * 95,
          baseY,
          speedY: 0.45 + (i % 3) * 0.2,
          driftX: 0,
          swayAmp: 0.75,
          swayFreq: 1.05,
          phase: i * 0.82,
          wrapZMin: -88,
          wrapZMax: 10,
        });
      }

      this.addParticleField({
        count: 170,
        colors: [0xfde047, 0xf59e0b, 0xfca5a5],
        size: 0.76,
        tex: softGlow,
        xSpan: 54,
        yMin: 1,
        yMax: 24,
        zMin: -70,
        zMax: 10,
        vxBase: 0,
        vyBase: 1.1,
        vzBase: 0.3,
        swirlAmp: 0.9,
        additive: true,
        opacity: 0.9,
      });
    } else if (festival.id === 'hanami') {
      // Swirling cherry blossom sakura petals + soft blush paper lanterns + pink spring clouds
      const petalTex = this.trackTex(createPetalTexture());
      const cloudTex = this.trackTex(
        createSoftGlowTexture('rgba(255,228,240,0.68)', 'rgba(249,168,212,0.3)', 'rgba(249,168,212,0)')
      );

      for (let i = 0; i < 16; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const lantern = this.buildSkyLantern(
          i % 2 === 0 ? 0xfbcfe8 : 0xfff1f2,
          0xfef3c7,
          0xf472b6,
          0.92 + (i % 3) * 0.2,
          true
        );
        this.group.add(lantern);
        const baseY = 4.2 + (i % 4) * 2.7;
        this.props.push({
          obj: lantern,
          rx: side * (9.5 + (i % 4) * 4.5),
          ry: baseY,
          rz: -85 + (i / 16) * 94,
          baseY,
          speedY: 0,
          driftX: 0,
          swayAmp: 0.75,
          swayFreq: 1.0,
          phase: i * 1.05,
          wrapZMin: -86,
          wrapZMax: 10,
        });
      }

      for (let i = 0; i < 10; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const puff = new THREE.Sprite(
          this.trackMat(
            new THREE.SpriteMaterial({
              map: cloudTex,
              transparent: true,
              opacity: 0.55,
              depthWrite: false,
            })
          )
        );
        const s = 12 + (i % 3) * 4;
        puff.scale.set(s * 1.5, s * 0.85, 1);
        this.group.add(puff);
        const baseY = 9 + (i % 3) * 4.5;
        this.props.push({
          obj: puff,
          rx: side * (16 + (i % 3) * 6),
          ry: baseY,
          rz: -88 + (i / 10) * 94,
          baseY,
          speedY: 0,
          driftX: -side * 0.25,
          swayAmp: 1.1,
          swayFreq: 0.5,
          phase: i * 1.4,
          wrapZMin: -90,
          wrapZMax: 10,
        });
      }

      this.addParticleField({
        count: 260,
        colors: [0xfbcfe8, 0xf9a8d4, 0xfff1f2, 0xf472b6],
        size: 0.88,
        tex: petalTex,
        xSpan: 52,
        yMin: 0,
        yMax: 24,
        zMin: -66,
        zMax: 10,
        vxBase: 1.45,
        vyBase: -1.55,
        vzBase: 0.4,
        swirlAmp: 1.75,
        additive: false,
        opacity: 0.94,
      });
    } else {
      // Eid Nights: Glowing Golden Crescent Moon & 8-pointed Star + Ornate Fanous Lanterns + Starfield
      this.addStarField(190, 0xfef08a);

      const crescentTex = this.trackTex(createCrescentMoonTexture());
      const crescentSprite = new THREE.Sprite(
        this.trackMat(
          new THREE.SpriteMaterial({
            map: crescentTex,
            transparent: true,
            depthWrite: false,
          })
        )
      );
      crescentSprite.scale.set(28, 28, 1);
      this.group.add(crescentSprite);
      this.horizonProps.push({
        obj: crescentSprite,
        offsetX: 16,
        offsetY: 26,
        offsetZ: -85,
        bobAmp: 0.45,
        bobFreq: 0.35,
      });

      const fanousGlowMat = this.trackMat(
        new THREE.SpriteMaterial({
          map: softGlow,
          color: 0xfcd34d,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      for (let i = 0; i < 20; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const lantern = this.buildSkyLantern(
          i % 3 === 0 ? 0x10b981 : 0xf59e0b,
          0xfffbeb,
          0xfde047,
          1.0 + (i % 3) * 0.25,
          true
        );
        const halo = new THREE.Sprite(fanousGlowMat);
        halo.scale.set(3.2, 3.2, 1);
        lantern.add(halo);
        this.group.add(lantern);

        const baseY = 3.8 + (i % 5) * 2.6;
        this.props.push({
          obj: lantern,
          rx: side * (9.4 + (i % 4) * 4.5),
          ry: baseY,
          rz: -85 + (i / 20) * 94,
          baseY,
          speedY: 0.32 + (i % 3) * 0.14,
          driftX: 0,
          swayAmp: 0.72,
          swayFreq: 0.9,
          phase: i * 0.88,
          wrapZMin: -86,
          wrapZMax: 10,
        });
      }

      this.addParticleField({
        count: 165,
        colors: [0xfef08a, 0x38bdf8, 0x34d399, 0xfbbf24],
        size: 0.72,
        tex: softGlow,
        xSpan: 56,
        yMin: 1.5,
        yMax: 24,
        zMin: -72,
        zMax: 10,
        vxBase: 0,
        vyBase: 0.72,
        vzBase: 0.2,
        swirlAmp: 0.95,
        additive: true,
        opacity: 0.88,
      });
    }
  }

  public update(
    dt: number,
    enabled: boolean,
    festival: FestivalTheme,
    anchorX: number,
    anchorY: number,
    anchorZ: number
  ) {
    this.setEnabled(enabled, festival);
    if (!this.enabled) return;

    const clampedDt = Math.min(dt, 0.05);
    this.elapsed += clampedDt;

    if (this.starField) {
      this.starField.position.set(anchorX, anchorY, anchorZ);
    }

    // Horizon celestial hero elements (Sun, Full Moon, Crescent, Aurora) stay gracefully framed ahead
    for (let i = 0; i < this.horizonProps.length; i++) {
      const h = this.horizonProps[i];
      const bob = Math.sin(this.elapsed * h.bobFreq + i) * h.bobAmp;
      h.obj.position.set(
        anchorX * 0.4 + h.offsetX,
        anchorY * 0.35 + h.offsetY + bob,
        anchorZ + h.offsetZ
      );
      if (h.rotSpeed) {
        h.obj.rotation.z += h.rotSpeed * clampedDt;
      }
    }

    // Floating / soaring / flapping 3D festival props wrapped seamlessly around runner Z
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.speedY !== 0) {
        p.ry += p.speedY * clampedDt;
        if (p.ry > p.baseY + 14) {
          p.ry = p.baseY - 2;
        }
      }
      if (p.driftX !== 0) {
        p.rx += p.driftX * clampedDt;
        if (p.rx > 34) p.rx -= 68;
        if (p.rx < -34) p.rx += 68;
      }

      const swayX = Math.sin(this.elapsed * p.swayFreq + p.phase) * p.swayAmp;
      const swayY = Math.cos(this.elapsed * p.swayFreq * 0.85 + p.phase) * (p.swayAmp * 0.32);

      p.obj.position.set(
        anchorX + p.rx + swayX,
        anchorY + p.ry + swayY,
        anchorZ + p.rz
      );

      // Gentle festive bank/sway rotation
      if (p.tail) {
        // Kite banking & tail fluttering in the Uttarayan wind
        p.obj.rotation.z = Math.sin(this.elapsed * p.swayFreq + p.phase) * 0.24;
        p.obj.rotation.y = Math.cos(this.elapsed * p.swayFreq * 0.7 + p.phase) * 0.22;
        p.tail.rotation.z = Math.sin(this.elapsed * 7.5 + p.phase) * 0.42;
      } else if (p.leftWing && p.rightWing) {
        // Flapping Halloween bat wings
        const flap = Math.sin(this.elapsed * (p.flapSpeed ?? 12) + p.phase) * 0.78;
        p.leftWing.rotation.z = flap;
        p.rightWing.rotation.z = -flap;
        p.obj.rotation.y = p.driftX >= 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
      } else if (!(p.obj instanceof THREE.Sprite)) {
        p.obj.rotation.z = Math.sin(this.elapsed * p.swayFreq + p.phase) * 0.08;
        p.obj.rotation.y = Math.sin(this.elapsed * 0.55 + p.phase) * 0.35;
      }
    }

    // Periodic 3D radial fireworks bursts (Diwali, Holi, Lunar New Year)
    for (let b = 0; b < this.fireworks.length; b++) {
      const fw = this.fireworks[b];
      fw.age += clampedDt;
      if (fw.age < 0) {
        fw.mat.opacity = 0;
        continue;
      }
      if (fw.age > fw.duration + fw.cooldown) {
        fw.age = 0;
        fw.colorIdx = (fw.colorIdx + 1) % fw.colors.length;
        fw.mat.color.setHex(fw.colors[fw.colorIdx]);
        const side = b % 2 === 0 ? -1 : 1;
        fw.rx = side * (10 + Math.random() * 20);
        fw.ry = 16 + Math.random() * 14;
        fw.rz = -48 - Math.random() * 34;
      }
      if (fw.age <= fw.duration) {
        const t = fw.age / fw.duration;
        const easeOut = 1 - Math.pow(1 - t, 2.6);
        const r = fw.radius * easeOut;
        const gravDrop = t * t * 3.8;
        const fade = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
        fw.mat.opacity = fade * 0.95;

        const cx = anchorX + fw.rx;
        const cy = anchorY + fw.ry;
        const cz = anchorZ + fw.rz;
        const count = fw.dirs.length / 3;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          fw.positions[i3] = cx + fw.dirs[i3] * r;
          fw.positions[i3 + 1] = cy + fw.dirs[i3 + 1] * r - gravDrop;
          fw.positions[i3 + 2] = cz + fw.dirs[i3 + 2] * r;
        }
        (fw.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      } else {
        fw.mat.opacity = 0;
      }
    }

    // Drifting ambient festival particle fields (snow, sakura petals, gulal dust, embers)
    for (let f = 0; f < this.particleFields.length; f++) {
      const pf = this.particleFields[f];
      const halfX = pf.xSpan * 0.5;
      const ySpan = pf.yMax - pf.yMin;
      const zSpan = pf.zMax - pf.zMin;
      for (let i = 0; i < pf.count; i++) {
        pf.relX[i] += (pf.velX[i] + Math.sin(this.elapsed * 1.4 + pf.phases[i]) * pf.swirlAmp) * clampedDt;
        pf.relY[i] += pf.velY[i] * clampedDt;
        pf.relZ[i] += pf.velZ[i] * clampedDt;

        if (pf.relX[i] > halfX) pf.relX[i] -= pf.xSpan;
        if (pf.relX[i] < -halfX) pf.relX[i] += pf.xSpan;
        if (pf.relY[i] > pf.yMax) pf.relY[i] -= ySpan;
        if (pf.relY[i] < pf.yMin) pf.relY[i] += ySpan;
        if (pf.relZ[i] > pf.zMax) pf.relZ[i] -= zSpan;
        if (pf.relZ[i] < pf.zMin) pf.relZ[i] += zSpan;

        const i3 = i * 3;
        pf.positions[i3] = anchorX + pf.relX[i];
        pf.positions[i3 + 1] = anchorY + pf.relY[i];
        pf.positions[i3 + 2] = anchorZ + pf.relZ[i];
      }
      (pf.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public dispose() {
    this.clearFestivalObjects();
  }
}
