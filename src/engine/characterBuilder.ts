import * as THREE from 'three';
import { getCosmeticById } from '../data/cosmetics';
import { CharacterCustomization, CosmeticItem } from '../types/game';

import type { CharacterAnimState } from './characterKinematics';

export interface LangoorIdleState {
  nextLookTime: number;
  lookTargetYaw: number;
  lookTargetPitch: number;
  lookTargetRoll: number;
  nextTailTwitchTime: number;
  tailTwitchDuration: number;
  tailTwitchDir: number;
  nextEarTwitchTime: number;
  earTwitchSide: -1 | 1;
  nextBlinkTime: number;
  nextPawFidgetTime: number;
  pawFidgetDuration: number;
}

export interface LangoorPetRig {
  root: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  tailTipPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftEar: THREE.Object3D;
  rightEar: THREE.Object3D;
  eyelids: THREE.Mesh[];
  idleState: LangoorIdleState;
  baseY: number;
}

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  hipsPivot: THREE.Group;
  chestPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightKneePivot: THREE.Group;
  leftAnklePivot: THREE.Group;
  rightAnklePivot: THREE.Group;
  scarfTail: THREE.Object3D;
  backpackGroup: THREE.Group;
  hipSatchel: THREE.Group;
  leftPouch: THREE.Group;
  ponyTailPivot?: THREE.Group;
  langoorPet: LangoorPetRig;
  blasterGroup: THREE.Group;
  eyelids: THREE.Object3D[];
  wingLeft?: THREE.Mesh;
  wingRight?: THREE.Mesh;
  shieldOrb: THREE.Mesh;
  animState: {
    currentState: CharacterAnimState;
    prevState: CharacterAnimState;
    stateTime: number;
    runPhase: number;
    runBlend: number;
    airBlend: number;
    slideBlend: number;
    turnYaw: number;
    lastTime: number;
    blinkNextTime: number;
  };
  dispose: () => void;
}

// ============================================================================
// Procedural Character Textures (Fabric, Skin, Leather, Hair)
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = new THREE.Color(hex);
  return {
    r: Math.round(c.r * 255),
    g: Math.round(c.g * 255),
    b: Math.round(c.b * 255),
  };
}

function makeFabricTextures(
  baseHex: string,
  withFoldShading: boolean,
  trackTex: THREE.Texture[]
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const ctx = colCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Fine woven canvas/twill cross-weave fibers
  for (let y = 0; y < size; y += 2) {
    const shade = (Math.sin(y * 0.65) * 6 + ((y * 17) % 9) - 4) | 0;
    ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade / 260})` : `rgba(0,0,0,${-shade / 260})`;
    ctx.fillRect(0, y, size, 1);

    const bv = 128 + shade * 3;
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 2) {
    const shade = (Math.cos(x * 0.65) * 5 + ((x * 13) % 7) - 3) | 0;
    ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade / 280})` : `rgba(0,0,0,${-shade / 280})`;
    ctx.fillRect(x, 0, 1, size);

    const bv = 128 + shade * 2;
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.45)`;
    bCtx.fillRect(x, 0, 1, size);
  }

  if (withFoldShading) {
    // Organic cloth drape, sunlit shoulder highlights & subtle waist AO
    const vGrad = ctx.createLinearGradient(0, 0, 0, size);
    vGrad.addColorStop(0.0, 'rgba(255, 248, 232, 0.18)');
    vGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.02)');
    vGrad.addColorStop(0.84, 'rgba(22, 16, 8, 0.22)');
    vGrad.addColorStop(1.0, 'rgba(12, 8, 4, 0.30)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle draped diagonal crease folds across torso/back
    for (let i = 0; i < 18; i++) {
      const y = 52 + i * 24 + ((i * 29) % 10);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2.5 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + 14, size * 0.66, y - 12, size, y + 5);
      ctx.stroke();

      bCtx.strokeStyle = i % 2 === 0 ? 'rgba(68,68,68,0.48)' : 'rgba(196,196,196,0.42)';
      bCtx.lineWidth = 4;
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.bezierCurveTo(size * 0.33, y + 14, size * 0.66, y - 12, size, y + 5);
      bCtx.stroke();
    }

    // Tailored double-stitched seams down front & back center
    for (const sx of [size * 0.5, size * 0.01]) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, size);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = 'rgba(255, 240, 210, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx + 6, 0);
      ctx.lineTo(sx + 6, size);
      ctx.moveTo(sx - 6, 0);
      ctx.lineTo(sx - 6, size);
      ctx.stroke();
      ctx.restore();
    }
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;

  trackTex.push(map, bump);
  return { map, bump };
}

function makeSkinTexture(
  baseHex: string,
  _isFemale: boolean,
  trackTex: THREE.Texture[]
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle natural subsurface warmth & muscle tone shading across limbs/neck
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0.0, 'rgba(255, 232, 212, 0.10)');
  grad.addColorStop(0.5, 'rgba(218, 134, 96, 0.04)');
  grad.addColorStop(1.0, 'rgba(98, 48, 28, 0.11)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Organic fine skin micro-pores & subtle specular roughness variation
  for (let i = 0; i < 2800; i++) {
    const x = (i * 197 + (i % 7) * 13) % size;
    const y = (i * 311 + (i % 5) * 19) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,238,220,0.04)' : 'rgba(86,38,18,0.045)';
    ctx.fillRect(x, y, 1.5, 1.5);
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(146,146,146,0.35)' : 'rgba(110,110,110,0.35)';
    bCtx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  trackTex.push(map, bump);
  return { map, bump };
}

function makeFaceSkinTexture(
  baseHex: string,
  hairHex: string,
  isFemale: boolean,
  trackTex: THREE.Texture[]
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  const hairRgb = hexToRgb(hairHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, w, h);

  // Classic 3-zone human facial color variation (u=0.5 is dead-center front -Z, v=0 crown -> v=1 chin)
  // 1. Warm golden forehead highlight
  const foreheadGrad = ctx.createRadialGradient(w * 0.5, h * 0.30, 8, w * 0.5, h * 0.32, w * 0.14);
  foreheadGrad.addColorStop(0, 'rgba(255, 236, 206, 0.16)');
  foreheadGrad.addColorStop(1, 'rgba(255, 236, 206, 0)');
  ctx.fillStyle = foreheadGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Natural vascular warm mid-face across cheekbones & bridge of nose
  const midFaceGrad = ctx.createRadialGradient(w * 0.5, h * 0.54, 10, w * 0.5, h * 0.55, w * 0.16);
  midFaceGrad.addColorStop(0, isFemale ? 'rgba(228, 114, 98, 0.16)' : 'rgba(210, 104, 82, 0.13)');
  midFaceGrad.addColorStop(1, 'rgba(210, 104, 82, 0)');
  ctx.fillStyle = midFaceGrad;
  ctx.fillRect(0, 0, w, h);

  // Rosy warm cheekbone flush
  for (const dir of [-1, 1]) {
    const cx = w * (0.5 + dir * 0.088);
    const cy = h * 0.58;
    const blush = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.055);
    blush.addColorStop(0, isFemale ? 'rgba(226, 104, 98, 0.24)' : 'rgba(198, 96, 76, 0.12)');
    blush.addColorStop(1, 'rgba(210, 104, 90, 0)');
    ctx.fillStyle = blush;
    ctx.fillRect(0, 0, w, h);
  }

  // 3. Subtle cooler/stronger jaw & chin shadow (light natural warmth/stubble tone on male)
  const jawGrad = ctx.createRadialGradient(w * 0.5, h * 0.84, 12, w * 0.5, h * 0.80, w * 0.13);
  jawGrad.addColorStop(0, isFemale ? 'rgba(120, 68, 52, 0.08)' : 'rgba(72, 48, 38, 0.16)');
  jawGrad.addColorStop(1, 'rgba(72, 48, 38, 0)');
  ctx.fillStyle = jawGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle under-chin / neck transition AO
  const bottomAo = ctx.createLinearGradient(0, h * 0.86, 0, h);
  bottomAo.addColorStop(0, 'rgba(75, 36, 20, 0)');
  bottomAo.addColorStop(1, 'rgba(65, 28, 14, 0.30)');
  ctx.fillStyle = bottomAo;
  ctx.fillRect(0, h * 0.86, w, h * 0.14);

  // Soft orbital eye-socket occlusion & upper crease depth
  for (const dir of [-1, 1]) {
    const ex = w * (0.5 + dir * 0.054);
    const ey = h * 0.485;
    const orbit = ctx.createRadialGradient(ex, ey, 4, ex, ey, w * 0.038);
    orbit.addColorStop(0, 'rgba(78, 38, 22, 0.32)');
    orbit.addColorStop(0.55, 'rgba(92, 46, 26, 0.14)');
    orbit.addColorStop(1, 'rgba(92, 46, 26, 0)');
    ctx.fillStyle = orbit;
    ctx.fillRect(0, 0, w, h);

    // Subtle upper-eyelid crease line
    ctx.strokeStyle = isFemale ? 'rgba(102, 52, 34, 0.32)' : 'rgba(86, 44, 28, 0.28)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.022, ey - h * 0.022);
    ctx.quadraticCurveTo(ex, ey - h * 0.036, ex + w * 0.022, ey - h * 0.020);
    ctx.stroke();

    // Soft feathered natural human eyebrow base
    ctx.save();
    ctx.strokeStyle = `rgba(${Math.max(12, hairRgb.r - 18)}, ${Math.max(8, hairRgb.g - 14)}, ${Math.max(6, hairRgb.b - 10)}, ${isFemale ? 0.56 : 0.68})`;
    ctx.lineCap = 'round';
    for (let s = 0; s < 22; s++) {
      const f = s / 21;
      const bx0 = ex + dir * (-0.023 + f * 0.050) * w;
      const arch = Math.sin(f * Math.PI) * (isFemale ? 0.015 : 0.010) * h;
      const by0 = ey - h * 0.062 - arch + (f > 0.7 ? (f - 0.7) * 0.014 * h : 0);
      ctx.lineWidth = (isFemale ? 2.4 : 3.6) * (1 - f * 0.48);
      ctx.beginPath();
      ctx.moveTo(bx0, by0 + 2);
      ctx.lineTo(bx0 + dir * 4.5, by0 - (isFemale ? 2.2 : 1.5));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Nose bridge sunlit highlight & subtle alar side shadows + philtrum
  const noseHi = ctx.createLinearGradient(w * 0.5, h * 0.44, w * 0.5, h * 0.61);
  noseHi.addColorStop(0, 'rgba(255, 240, 224, 0.16)');
  noseHi.addColorStop(0.8, 'rgba(255, 240, 224, 0.24)');
  noseHi.addColorStop(1, 'rgba(255, 240, 224, 0)');
  ctx.fillStyle = noseHi;
  ctx.fillRect(w * 0.492, h * 0.44, w * 0.016, h * 0.17);

  for (const dir of [-1, 1]) {
    const nx = w * (0.5 + dir * 0.016);
    const nShadow = ctx.createRadialGradient(nx, h * 0.585, 2, nx, h * 0.585, w * 0.016);
    nShadow.addColorStop(0, 'rgba(84, 38, 22, 0.24)');
    nShadow.addColorStop(1, 'rgba(84, 38, 22, 0)');
    ctx.fillStyle = nShadow;
    ctx.fillRect(0, 0, w, h);
  }

  // Soft philtrum groove between nose & upper lip
  ctx.fillStyle = 'rgba(84, 40, 24, 0.11)';
  ctx.fillRect(w * 0.496, h * 0.600, w * 0.008, h * 0.040);

  // Soft painterly blended human lips (Cupid's bow upper lip + fuller rosy lower lip + mouth line)
  const lipY = h * 0.660;
  ctx.save();
  // Upper lip (slightly deeper shaded tone)
  ctx.fillStyle = isFemale ? 'rgba(186, 86, 82, 0.72)' : 'rgba(156, 82, 70, 0.55)';
  ctx.beginPath();
  ctx.moveTo(w * 0.464, lipY + 2);
  ctx.quadraticCurveTo(w * 0.484, lipY - 12, w * 0.494, lipY - 7);
  ctx.quadraticCurveTo(w * 0.500, lipY - 3, w * 0.506, lipY - 7);
  ctx.quadraticCurveTo(w * 0.516, lipY - 12, w * 0.536, lipY + 2);
  ctx.quadraticCurveTo(w * 0.500, lipY + 6, w * 0.464, lipY + 2);
  ctx.closePath();
  ctx.fill();

  // Lower lip (warmer & fuller with gentle lower highlight)
  ctx.fillStyle = isFemale ? 'rgba(202, 100, 94, 0.70)' : 'rgba(168, 92, 78, 0.52)';
  ctx.beginPath();
  ctx.moveTo(w * 0.468, lipY + 2);
  ctx.quadraticCurveTo(w * 0.500, lipY + 22, w * 0.532, lipY + 2);
  ctx.quadraticCurveTo(w * 0.500, lipY + 6, w * 0.468, lipY + 2);
  ctx.closePath();
  ctx.fill();

  // Subtle lower-lip sunlit sheen
  const lipHi = ctx.createRadialGradient(w * 0.5, lipY + 10, 1, w * 0.5, lipY + 10, w * 0.016);
  lipHi.addColorStop(0, 'rgba(255, 224, 214, 0.30)');
  lipHi.addColorStop(1, 'rgba(255, 224, 214, 0)');
  ctx.fillStyle = lipHi;
  ctx.fillRect(w * 0.47, lipY, w * 0.06, 22);

  // Crisp gentle mouth parting line + upturned smile corners
  ctx.strokeStyle = 'rgba(84, 34, 26, 0.62)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.462, lipY - 1);
  ctx.quadraticCurveTo(w * 0.500, lipY + 7, w * 0.538, lipY - 1);
  ctx.stroke();

  // Mentolabial shadow beneath lower lip above chin
  const chinDip = ctx.createRadialGradient(w * 0.5, lipY + 26, 2, w * 0.5, lipY + 26, w * 0.028);
  chinDip.addColorStop(0, 'rgba(84, 38, 22, 0.22)');
  chinDip.addColorStop(1, 'rgba(84, 38, 22, 0)');
  ctx.fillStyle = chinDip;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Natural micro skin pores + soft texture bump
  for (let i = 0; i < 4800; i++) {
    const x = (i * 251 + (i % 11) * 17) % w;
    const y = (i * 389 + (i % 7) * 23) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,240,224,0.035)' : 'rgba(86,40,20,0.04)';
    ctx.fillRect(x, y, 1.5, 1.5);
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(144,144,144,0.32)' : 'rgba(112,112,112,0.32)';
    bCtx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  trackTex.push(map, bump);
  return { map, bump };
}

function makeLeatherTextures(
  baseHex: string,
  trackTex: THREE.Texture[],
  withStitching = true
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const col = document.createElement('canvas');
  col.width = size;
  col.height = size;
  const ctx = col.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = size;
  bmp.height = size;
  const bCtx = bmp.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Rich pebble leather grain + worn patina highlights
  for (let i = 0; i < 2200; i++) {
    const x = (i * 173) % size;
    const y = (i * 263) % size;
    const rad = 1.6 + (i % 4) * 0.9;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,232,196,0.09)' : 'rgba(18,9,3,0.13)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();

    bCtx.fillStyle = i % 2 === 0 ? 'rgba(185,185,185,0.4)' : 'rgba(65,65,65,0.4)';
    bCtx.beginPath();
    bCtx.arc(x, y, rad, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Burnished edge shading & saddle crease patina
  const wear = ctx.createLinearGradient(0, 0, 0, size);
  wear.addColorStop(0, 'rgba(255,240,210,0.15)');
  wear.addColorStop(0.5, 'rgba(0,0,0,0.0)');
  wear.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = wear;
  ctx.fillRect(0, 0, size, size);

  if (withStitching) {
    // Crisp waxed-thread saddle stitching along leather edges
    ctx.save();
    ctx.setLineDash([12, 9]);
    ctx.strokeStyle = 'rgba(235, 198, 134, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(size, 26);
    ctx.moveTo(0, size - 26);
    ctx.lineTo(size, size - 26);
    ctx.stroke();
    ctx.restore();

    bCtx.save();
    bCtx.setLineDash([12, 9]);
    bCtx.strokeStyle = '#e5e5e5';
    bCtx.lineWidth = 3.5;
    bCtx.beginPath();
    bCtx.moveTo(0, 26);
    bCtx.lineTo(size, 26);
    bCtx.moveTo(0, size - 26);
    bCtx.lineTo(size, size - 26);
    bCtx.stroke();
    bCtx.restore();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(bmp);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;

  trackTex.push(map, bump);
  return { map, bump };
}

function makeHairTextures(
  baseHex: string,
  trackTex: THREE.Texture[]
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const col = document.createElement('canvas');
  col.width = size;
  col.height = size;
  const ctx = col.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = size;
  bmp.height = size;
  const bCtx = bmp.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle anisotropic sheen band across hair crown
  const sheenGrad = ctx.createLinearGradient(0, 0, 0, size);
  sheenGrad.addColorStop(0, 'rgba(20, 10, 4, 0.22)');
  sheenGrad.addColorStop(0.32, 'rgba(255, 224, 178, 0.16)');
  sheenGrad.addColorStop(0.55, 'rgba(255, 232, 195, 0.06)');
  sheenGrad.addColorStop(1, 'rgba(12, 5, 2, 0.28)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, size, size);

  // Fine directional brushed layered hair strands
  for (let i = 0; i < 820; i++) {
    const x = (i * 37) % size;
    const w = 1 + (i % 3) * 0.7;
    ctx.strokeStyle =
      i % 4 === 0
        ? 'rgba(255, 226, 178, 0.20)'
        : i % 4 === 1
        ? 'rgba(18, 8, 4, 0.25)'
        : 'rgba(140, 82, 42, 0.12)';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + ((i % 7) - 3) * 4, size * 0.5, x + ((i % 5) - 2) * 3, size);
    ctx.stroke();

    bCtx.strokeStyle = i % 2 === 0 ? 'rgba(220,220,220,0.45)' : 'rgba(50,50,50,0.45)';
    bCtx.lineWidth = w;
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.quadraticCurveTo(x + ((i % 7) - 3) * 3, size * 0.5, x, size);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(bmp);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;

  trackTex.push(map, bump);
  return { map, bump };
}

function makeIrisTexture(isFemale: boolean, trackTex: THREE.Texture[]): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Outer limbal ring & rich radial iris coloration
  const outer = ctx.createRadialGradient(cx, cy, 18, cx, cy, 122);
  if (isFemale) {
    outer.addColorStop(0, '#0a140e');
    outer.addColorStop(0.28, '#0c1810');
    outer.addColorStop(0.38, '#a16207'); // warm golden-amber collarette
    outer.addColorStop(0.58, '#15803d'); // vivid emerald iris
    outer.addColorStop(0.84, '#14532d');
    outer.addColorStop(1, '#071f13'); // dark limbal ring
  } else {
    outer.addColorStop(0, '#080e1c');
    outer.addColorStop(0.28, '#0a1324');
    outer.addColorStop(0.38, '#b47a2c'); // warm hazel-gold inner ring
    outer.addColorStop(0.58, '#1d5bbf'); // vivid expedition sapphire blue
    outer.addColorStop(0.84, '#163775');
    outer.addColorStop(1, '#081736'); // dark limbal ring
  }
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, size, size);

  // Radial iris stroma fibers for lifelike depth
  for (let i = 0; i < 96; i++) {
    const ang = (i / 96) * Math.PI * 2;
    const r0 = 36 + (i % 4) * 3;
    const r1 = 104 + (i % 5) * 3;
    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(255, 245, 200, 0.24)'
        : i % 3 === 1
        ? isFemale
          ? 'rgba(74, 222, 128, 0.28)'
          : 'rgba(96, 165, 250, 0.30)'
        : 'rgba(8, 14, 20, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    ctx.stroke();
  }

  // Crisp deep pupil center
  ctx.fillStyle = '#06080f';
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  trackTex.push(tex);
  return tex;
}

function makeExplorerBadgeTexture(accentHex: string, trackTex: THREE.Texture[]): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#153a2a';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();

  // Golden compass rose emblem
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? 38 : 14;
    const px = 64 + Math.cos(ang) * rad;
    const py = 64 + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(64, 64, 9, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  trackTex.push(tex);
  return tex;
}

// ============================================================================
// Organic Anatomical Loft Sculptor (Zero Blocky Primitives)
// ============================================================================

interface LoftSample {
  y: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
}

function buildSculptedLoftGeometry(
  ySteps: number,
  radialSteps: number,
  sampleProfile: (t: number) => LoftSample,
  sculptAngle?: (t: number, theta: number, baseR: { rx: number; rz: number }) => { rx: number; rz: number; dy?: number },
  capEnds = true
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringCols = radialSteps + 1;
  for (let iy = 0; iy <= ySteps; iy++) {
    const t = iy / ySteps;
    const s = sampleProfile(t);
    for (let ix = 0; ix <= radialSteps; ix++) {
      const u = ix / radialSteps;
      const theta = u * Math.PI * 2; // 0 = +Z (back), PI/2 = +X (right), PI = -Z (front)
      let rx = s.rx;
      let rz = s.rz;
      let dy = 0;
      if (sculptAngle) {
        const mod = sculptAngle(t, theta, s);
        rx = mod.rx;
        rz = mod.rz;
        dy = mod.dy ?? 0;
      }
      const x = s.cx + Math.sin(theta) * rx;
      const z = s.cz + Math.cos(theta) * rz;
      const y = s.y + dy;
      positions.push(x, y, z);
      uvs.push(u, 1 - t);
    }
  }

  const goingUp = sampleProfile(1).y >= sampleProfile(0).y;

  for (let iy = 0; iy < ySteps; iy++) {
    for (let ix = 0; ix < radialSteps; ix++) {
      const a = iy * ringCols + ix;
      const b = a + 1;
      const c = (iy + 1) * ringCols + ix;
      const d = c + 1;
      if (goingUp) {
        indices.push(a, b, d);
        indices.push(a, d, c);
      } else {
        indices.push(a, d, b);
        indices.push(a, c, d);
      }
    }
  }

  if (capEnds) {
    const bot = sampleProfile(0);
    const botCenterIdx = positions.length / 3;
    positions.push(bot.cx, bot.y, bot.cz);
    uvs.push(0.5, 1);
    for (let ix = 0; ix < radialSteps; ix++) {
      if (goingUp) {
        indices.push(botCenterIdx, ix + 1, ix);
      } else {
        indices.push(botCenterIdx, ix, ix + 1);
      }
    }

    const top = sampleProfile(1);
    const topCenterIdx = positions.length / 3;
    positions.push(top.cx, top.y, top.cz);
    uvs.push(0.5, 0);
    const topRingStart = ySteps * ringCols;
    for (let ix = 0; ix < radialSteps; ix++) {
      if (goingUp) {
        indices.push(topCenterIdx, topRingStart + ix, topRingStart + ix + 1);
      } else {
        indices.push(topCenterIdx, topRingStart + ix + 1, topRingStart + ix);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildSculptedHeadGeometry(isFemale: boolean): THREE.BufferGeometry {
  const latSteps = 36;
  const lonSteps = 44;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= latSteps; iy++) {
    const v = iy / latSteps; // 0 = crown top, 1 = chin/neck base
    const phi = v * Math.PI;
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);

    for (let ix = 0; ix <= lonSteps; ix++) {
      const u = ix / lonSteps;
      const theta = u * Math.PI * 2; // 0 = +Z back, PI = -Z front

      let rx = isFemale ? 0.103 : 0.111;
      const ry = 0.135;
      let rz = isFemale ? 0.119 : 0.125;

      // Subtle cranial widening above ears, graceful human jaw taper below cheekbones
      if (v > 0.20 && v < 0.46) {
        const craniumSwell = Math.sin(((v - 0.20) / 0.26) * Math.PI);
        rx *= 1 + craniumSwell * 0.03;
      }

      if (v > 0.56) {
        const jawT = (v - 0.56) / 0.44;
        // Male retains slightly stronger mandibular angle; female tapers more delicately
        const jawTaper = isFemale ? 0.44 : 0.34;
        rx *= 1 - Math.pow(jawT, 1.15) * jawTaper;
        rz *= 1 - jawT * 0.24;
      }

      let x = Math.sin(theta) * sinP * rx;
      let y = cosP * ry;
      let z = Math.cos(theta) * sinP * rz;

      const frontness = Math.max(0, -Math.cos(theta));
      const absSin = Math.abs(Math.sin(theta));
      const backness = Math.max(0, Math.cos(theta));

      // Gentle temple flattening for authentic human skull planes
      if (v > 0.28 && v < 0.52 && absSin > 0.72 && Math.cos(theta) < 0.2) {
        const templeT = Math.sin(((v - 0.28) / 0.24) * Math.PI);
        x *= 1 - templeT * 0.055 * (absSin - 0.72) / 0.28;
      }

      // Supraorbital brow ridge
      if (v > 0.35 && v < 0.45 && frontness > 0.45) {
        const browT = Math.sin(((v - 0.35) / 0.10) * Math.PI);
        z -= browT * frontness * (isFemale ? 0.0065 : 0.0105);
      }

      // Recessed anatomical eye sockets (orbits) so eyeballs nest naturally inside skull!
      if (v > 0.43 && v < 0.555 && Math.cos(theta) < -0.35) {
        const eyeLat = Math.sin(((v - 0.43) / 0.125) * Math.PI);
        const eyeSide = Math.exp(-Math.pow((absSin - 0.34) / 0.15, 2));
        z += eyeLat * eyeSide * 0.0155;
      }

      // Zygomatic cheekbone arch
      if (v > 0.50 && v < 0.68 && Math.cos(theta) < -0.05 && absSin > 0.38) {
        const cheekT = Math.sin(((v - 0.50) / 0.18) * Math.PI);
        const sideBell = Math.sin(Math.min(1, (absSin - 0.38) / 0.58) * Math.PI);
        x *= 1 + cheekT * sideBell * (isFemale ? 0.075 : 0.065);
        z -= cheekT * sideBell * frontness * 0.0065;
      }

      // Integrated sculpted nasal bridge & tip along front center
      if (v > 0.43 && v < 0.635 && Math.cos(theta) < -0.75) {
        const noseT = (v - 0.43) / 0.205;
        const centerBell = Math.exp(-Math.pow(absSin / 0.115, 2));
        const profile = noseT < 0.76 ? Math.pow(noseT / 0.76, 0.85) : Math.cos(((noseT - 0.76) / 0.24) * (Math.PI * 0.5));
        z -= centerBell * profile * (isFemale ? 0.017 : 0.020);
        // Subtle nasal alae (nostril wings) near base
        if (noseT > 0.62) {
          const alaT = Math.sin(((noseT - 0.62) / 0.38) * Math.PI);
          const alaBell = Math.exp(-Math.pow((absSin - 0.115) / 0.065, 2));
          z -= alaT * alaBell * 0.007;
        }
      }

      // Mouth mound (orbicularis oris) + subtle upper/lower lip relief aligned with v=0.660
      if (v > 0.61 && v < 0.73 && frontness > 0.60) {
        const mouthT = (v - 0.61) / 0.12;
        const mouthWide = Math.exp(-Math.pow(absSin / 0.24, 2));
        // Gentle upper lip crest, parting dip, fuller lower lip crest
        const lipWave =
          Math.sin(mouthT * Math.PI) * 0.0072 -
          Math.exp(-Math.pow((mouthT - 0.46) / 0.12, 2)) * 0.0042;
        z -= mouthWide * frontness * lipWave;
      }

      // Mentolabial indentation below lower lip
      if (v > 0.71 && v < 0.80 && frontness > 0.65) {
        const dipT = Math.sin(((v - 0.71) / 0.09) * Math.PI);
        z += dipT * frontness * 0.0062 * Math.exp(-Math.pow(absSin / 0.24, 2));
      }

      // Defined human chin projection & jawline angle (gonion)
      if (v > 0.77 && v < 0.96 && frontness > 0.55) {
        const chinT = Math.sin(((v - 0.77) / 0.19) * Math.PI);
        const chinNarrow = Math.exp(-Math.pow(absSin / (isFemale ? 0.20 : 0.26), 2));
        z -= chinT * frontness * chinNarrow * (isFemale ? 0.013 : 0.017);
        y -= chinT * frontness * chinNarrow * 0.004;
      }
      if (!isFemale && v > 0.66 && v < 0.84 && absSin > 0.62 && Math.cos(theta) > -0.35 && Math.cos(theta) < 0.35) {
        // Subtle masculine mandibular jaw corner
        const gonion = Math.sin(((v - 0.66) / 0.18) * Math.PI);
        x *= 1 + gonion * 0.055;
      }

      // Natural occipital fullness at back of skull (+Z) & clean sub-occipital nape curve
      if (backness > 0.25 && v > 0.26 && v < 0.66) {
        const occ = Math.sin(((v - 0.26) / 0.40) * Math.PI);
        z += backness * occ * 0.014;
      }
      if (backness > 0.25 && v > 0.72) {
        const napeIn = (v - 0.72) / 0.28;
        z -= backness * napeIn * 0.016;
      }

      positions.push(x, y, z);
      // 1 - v aligns crown (v=0) with canvas top (y=0) under default CanvasTexture flipY=true
      uvs.push(u, 1 - v);
    }
  }

  const cols = lonSteps + 1;
  for (let iy = 0; iy < latSteps; iy++) {
    for (let ix = 0; ix < lonSteps; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = (iy + 1) * cols + ix;
      const d = c + 1;
      indices.push(a, c, d);
      indices.push(a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build an organic, flat-ribbon tapered hair lock along a 3D Catmull-Rom curve
 * (wide & scalp-hugging at the root, smoothly tapering to a sharp natural tip).
 */
function buildTaperedHairStrand(
  curve: THREE.CatmullRomCurve3,
  rRoot: number,
  rMid: number,
  rTip: number,
  widthRatio = 1.65,
  segs = 14,
  radialSegs = 8
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segs, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const cols = radialSegs + 1;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const pt = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    // Smooth root -> mid -> sharp tip taper
    const rad =
      t < 0.45
        ? THREE.MathUtils.lerp(rRoot, rMid, Math.sin((t / 0.45) * (Math.PI * 0.5)))
        : THREE.MathUtils.lerp(rMid, rTip, Math.pow((t - 0.45) / 0.55, 1.35));

    const rFlat = rad;
    const rWide = rad * widthRatio;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const ang = u * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const vx = pt.x + N.x * (cosA * rFlat) + B.x * (sinA * rWide);
      const vy = pt.y + N.y * (cosA * rFlat) + B.y * (sinA * rWide);
      const vz = pt.z + N.z * (cosA * rFlat) + B.z * (sinA * rWide);
      positions.push(vx, vy, vz);
      uvs.push(u, t);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      indices.push(a, c, d);
      indices.push(a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildSculptedHairShell(isFemale: boolean): THREE.BufferGeometry {
  const latSteps = 22;
  const lonSteps = 32;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= latSteps; iy++) {
    const v = iy / latSteps; // 0 = top crown, 1 = hairline edge
    const phi = v * Math.PI * 0.67;

    for (let ix = 0; ix <= lonSteps; ix++) {
      const u = ix / lonSteps;
      const theta = u * Math.PI * 2; // 0 = +Z back, PI = -Z front

      const backness = Math.max(0, Math.cos(theta));
      const frontness = Math.max(0, -Math.cos(theta));

      // Natural higher forehead hairline (-Z), close side fade/tuck, lower nape coverage (+Z)
      const effectivePhi = phi + backness * v * 0.40 - frontness * v * 0.30;
      const eSin = Math.sin(effectivePhi);
      const eCos = Math.cos(effectivePhi);

      // Hugging closely to the new realistic 7.2-head skull dimensions
      const vol = (1 - Math.pow(v, 2.2) * 0.55) * (isFemale ? 0.011 : 0.010);
      const baseRx = (isFemale ? 0.107 : 0.115) + vol;
      const baseRy = 0.141 + vol * 0.7;
      const baseRz = (isFemale ? 0.124 : 0.130) + vol;

      // Natural layered hair flow & subtle side-part contour
      const strandWave =
        Math.sin(theta * 11 + v * 3.2) * 0.0042 * Math.sin(v * Math.PI) +
        Math.cos(theta * 6 - v * 2.1) * 0.003 * Math.sin(v * Math.PI);

      // Subtle clean nape V-taper at back
      const napeCut = backness > 0.65 && v > 0.82 ? -0.010 * backness : 0;

      const x = Math.sin(theta) * eSin * (baseRx + strandWave);
      const y = eCos * baseRy + 0.005 + napeCut;
      const z = Math.cos(theta) * eSin * (baseRz + strandWave) + backness * 0.008;

      positions.push(x, y, z);
      uvs.push(u * 2, v);
    }
  }

  const cols = lonSteps + 1;
  for (let iy = 0; iy < latSteps; iy++) {
    for (let ix = 0; ix < lonSteps; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = (iy + 1) * cols + ix;
      const d = c + 1;
      indices.push(a, c, d);
      indices.push(a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// Material Helpers
// ============================================================================

function makeMat(
  color: string,
  roughness = 0.55,
  metalness = 0.08,
  emissive?: string,
  map?: THREE.Texture,
  bumpMap?: THREE.Texture,
  bumpScale = 0.025
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(map ? '#ffffff' : color),
    map,
    bumpMap,
    bumpScale: bumpMap ? bumpScale : 0,
    roughness,
    metalness,
    sheen: metalness < 0.35 ? 0.3 : 0.0,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.28),
    clearcoat: metalness > 0.4 ? 0.45 : 0.04,
    clearcoatRoughness: 0.42,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity: emissive ? 0.5 : 0,
  });
}

function makeSkinMat(
  color: string,
  skinTex: THREE.Texture,
  bumpTex?: THREE.Texture
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    map: skinTex,
    bumpMap: bumpTex,
    bumpScale: bumpTex ? 0.008 : 0,
    roughness: 0.49,
    metalness: 0.0,
    sheen: 0.42,
    sheenRoughness: 0.66,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffd3bc'), 0.52),
    clearcoat: 0.03,
    clearcoatRoughness: 0.85,
  });
}

function addShadow(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// ============================================================================
// Hats & Backpacks (Fitted Realistically)
// ============================================================================

function buildHat(hatItem: CosmeticItem, accentDye: CosmeticItem): THREE.Group {
  const g = new THREE.Group();
  if (hatItem.id === 'hat_none') {
    return g;
  }

  const primary = hatItem.primaryHex;
  const secondary = hatItem.secondaryHex;
  const r = hatItem.roughness ?? 0.55;
  const m = hatItem.metalness ?? 0.1;

  const matMain = makeMat(primary, r, m, hatItem.emissiveHex);
  const matSec = makeMat(secondary, Math.max(0.2, r - 0.15), Math.min(0.95, m + 0.15));
  const matTrim = makeMat(accentDye.secondaryHex, 0.3, 0.35);

  if (hatItem.id === 'hat_cowboy') {
    // Authentic Wide-Brimmed Curled Stetson Cowboy Hat with Cattleman Crease & Leather Band
    const brimGeo = new THREE.CylinderGeometry(0.41, 0.42, 0.02, 40, 4);
    const pos = brimGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.16) {
        const edgeT = (r - 0.16) / 0.26;
        // Classic cowboy side curl UP + gentle front/back saddle dip DOWN
        const sideCurl = Math.pow(Math.abs(x) / Math.max(0.01, r), 1.6) * Math.pow(edgeT, 1.55) * 0.115;
        const frontBackDip = Math.pow(Math.abs(z) / Math.max(0.01, r), 1.8) * Math.pow(edgeT, 1.4) * 0.048;
        pos.setY(i, pos.getY(i) + sideCurl - frontBackDip);
      }
    }
    brimGeo.computeVertexNormals();
    const brim = new THREE.Mesh(brimGeo, matMain);
    brim.scale.set(0.98, 1, 1.08);
    brim.position.y = 0.015;

    // Cattleman creased crown loft
    const crownGeo = buildSculptedLoftGeometry(
      14,
      28,
      (t) => ({
        y: 0.015 + t * 0.175,
        cx: 0,
        cz: 0,
        rx: THREE.MathUtils.lerp(0.184, 0.148, t * 0.85),
        rz: THREE.MathUtils.lerp(0.204, 0.166, t * 0.85),
      }),
      (t, theta, s) => {
        let dy = 0;
        let rx = s.rx;
        // Center cattleman crease trough at top (t > 0.65)
        if (t > 0.65) {
          const topT = (t - 0.65) / 0.35;
          const xNorm = Math.sin(theta);
          const crease = Math.exp(-(xNorm * xNorm) * 6.5) * 0.042 * topT;
          dy -= crease;
        }
        // Subtle front pinch dents (-Z)
        if (Math.cos(theta) < -0.25 && t > 0.45 && t < 0.88) {
          const pinch = Math.pow(Math.abs(Math.sin(theta)), 1.5) * 0.018 * Math.sin(((t - 0.45) / 0.43) * Math.PI);
          rx -= pinch;
        }
        return { rx, rz: s.rz, dy };
      }
    );
    const crown = new THREE.Mesh(crownGeo, matMain);

    // Tooled dark leather hatband + small brass side buckle
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.188, 0.036, 28), matSec);
    hatBand.scale.set(0.98, 1, 1.09);
    hatBand.position.y = 0.04;

    const hatBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 14), makeMat(hatItem.accentHex, 0.22, 0.88));
    hatBuckle.rotation.y = Math.PI / 2;
    hatBuckle.position.set(-0.181, 0.04, -0.02);

    g.add(brim, crown, hatBand, hatBuckle);
  } else if (hatItem.id === 'hat_fedora' || hatItem.id === 'hat_safari') {
    // Organic curved-brim adventurer fedora (bent slightly down at front & back)
    const brimGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.025, 28, 1);
    const pos = brimGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const x = pos.getX(i);
      const dist = Math.hypot(x, z);
      if (dist > 0.18) {
        pos.setY(i, pos.getY(i) - Math.abs(z) * 0.11 + Math.abs(x) * 0.04);
      }
    }
    brimGeo.computeVertexNormals();
    const brim = new THREE.Mesh(brimGeo, matMain);
    brim.position.y = 0.02;

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.195, 0.15, 24), matMain);
    crown.scale.set(0.95, 1, 1.08);
    crown.position.y = 0.095;
    const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), matMain);
    crownTop.scale.set(0.95, 0.42, 1.08);
    crownTop.position.y = 0.16;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.186, 0.194, 0.036, 24), matSec);
    ribbon.scale.set(0.96, 1, 1.08);
    ribbon.position.y = 0.045;
    g.add(brim, crown, crownTop, ribbon);
  } else if (hatItem.id === 'hat_mario_cap') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matMain
    );
    dome.scale.set(0.96, 0.92, 1.06);
    dome.position.y = 0.01;
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.028, 22, 1, false, Math.PI * 0.65, Math.PI * 0.7),
      matMain
    );
    visor.position.set(0, 0.018, -0.055);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.02, 18), matSec);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.095, -0.182);
    g.add(dome, visor, badge);
  } else if (hatItem.id === 'hat_viking') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      matMain
    );
    dome.scale.set(0.96, 0.95, 1.05);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.024, 10, 24), matTrim);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.015;
    for (const side of [-1, 1]) {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.17, 0.07, 0),
        new THREE.Vector3(side * 0.26, 0.13, -0.01),
        new THREE.Vector3(side * 0.27, 0.24, -0.04),
      ]);
      const horn = new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 10, 0.032, 10, false), matSec);
      g.add(horn);
    }
    g.add(dome, rim);
  } else if (hatItem.id === 'hat_crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.075, 22), matMain);
    base.position.y = 0.05;
    g.add(base);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.10, 10), matMain);
      spike.position.set(Math.cos(ang) * 0.15, 0.13, Math.sin(ang) * 0.15);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), matMain);
      tip.position.set(Math.cos(ang) * 0.15, 0.185, Math.sin(ang) * 0.15);
      g.add(spike, tip);
      if (i % 2 === 0) {
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), matSec);
        gem.position.set(Math.cos(ang) * 0.17, 0.055, Math.sin(ang) * 0.17);
        g.add(gem);
      }
    }
  } else if (hatItem.id === 'hat_astro') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), matMain);
    dome.position.y = -0.08;
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 20, 14, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5),
      matSec
    );
    visor.position.set(0, -0.07, -0.045);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 10), matTrim);
    antenna.position.set(0.16, 0.14, 0.06);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), matSec);
    bob.position.set(0.16, 0.22, 0.06);
    g.add(dome, visor, antenna, bob);
  } else if (hatItem.id === 'hat_ninja') {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      matMain
    );
    hood.scale.set(0.96, 1, 1.06);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.022, 10, 24), matSec);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.02;
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.18, 6, 10), makeMat(hatItem.accentHex, 0.45, 0.08));
    tail.position.set(0.06, 0.01, 0.24);
    tail.rotation.y = 0.25;
    tail.rotation.x = Math.PI / 2 - 0.3;
    g.add(hood, band, tail);
  } else {
    // hat_dragon
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.24, 14), matMain);
    crest.position.y = 0.10;
    const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.20, 8, 12), matSec);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(0, 0.13, 0.04);
    g.add(crest, ridge);
  }

  return g;
}

function buildBackpack(
  packItem: CosmeticItem,
  accentDye: CosmeticItem
): { group: THREE.Group; wingLeft?: THREE.Mesh; wingRight?: THREE.Mesh } {
  const g = new THREE.Group();
  if (packItem.id === 'pack_none') {
    return { group: g };
  }

  const r = packItem.roughness ?? 0.55;
  const m = packItem.metalness ?? 0.12;
  const matMain = makeMat(packItem.primaryHex, r, m, packItem.emissiveHex);
  const matSec = makeMat(packItem.secondaryHex, Math.max(0.2, r - 0.15), Math.min(0.9, m + 0.15));
  const matTrim = makeMat(accentDye.secondaryHex, 0.3, 0.3);

  let wingLeft: THREE.Mesh | undefined;
  let wingRight: THREE.Mesh | undefined;

  if (packItem.id === 'pack_canvas' || packItem.id === 'pack_treasure') {
    // Sleek contoured lower-back field pack + rolled canvas bedroll so shoulders stay athletic & visible
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 10, 18), matMain);
    body.scale.set(1.25, 1.0, 0.65);
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 16), matSec);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.18, 0.01);
    const flap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matSec);
    flap.scale.set(1.15, 0.65, 0.65);
    flap.position.y = 0.10;
    const strapL = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.28, 6, 8), matTrim);
    strapL.position.set(-0.08, 0, 0.085);
    const strapR = strapL.clone();
    strapR.position.x = 0.08;
    g.add(body, bedroll, flap, strapL, strapR);
  } else if (packItem.id === 'pack_shell') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), matMain);
    shell.rotation.x = Math.PI / 2;
    shell.position.z = -0.02;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 10, 22), matSec);
    g.add(shell, rim);
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 10), matSec);
      spike.rotation.x = Math.PI / 2;
      spike.position.set((i - 1) * 0.11, i === 1 ? 0.08 : -0.04, 0.25);
      g.add(spike);
    }
  } else if (packItem.id === 'pack_katana') {
    for (const side of [-1, 1]) {
      const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.84, 12), matMain);
      scabbard.rotation.z = side * 0.55;
      scabbard.position.set(side * 0.02, 0.08, 0.04);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.16, 12), matSec);
      hilt.rotation.z = side * 0.55;
      hilt.position.set(side * -0.22, 0.40, 0.04);
      g.add(scabbard, hilt);
    }
  } else if (packItem.id === 'pack_jetpack') {
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.18, 8, 14), matMain);
    bridge.rotation.z = Math.PI / 2;
    g.add(bridge);
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.09, 0.42, 16), matMain);
      tank.position.set(side * 0.13, 0.02, 0.05);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 14, 1, true), matSec);
      nozzle.position.set(side * 0.13, -0.23, 0.05);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10), matTrim);
      cap.position.set(side * 0.13, 0.23, 0.05);
      g.add(tank, nozzle, cap);
    }
  } else {
    const isButterfly = packItem.id === 'pack_wings_butterfly';
    const wingGeo = new THREE.SphereGeometry(0.3, 16, 12);
    wingGeo.scale(isButterfly ? 1.15 : 1.35, isButterfly ? 1.05 : 0.65, 0.1);
    const matWing = isButterfly
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(packItem.primaryHex),
          emissive: new THREE.Color(packItem.emissiveHex || packItem.primaryHex),
          emissiveIntensity: 0.35,
          roughness: 0.18,
          metalness: 0.15,
          clearcoat: 0.6,
          transparent: true,
          opacity: 0.9,
        })
      : matMain;

    wingLeft = new THREE.Mesh(wingGeo, matWing);
    wingLeft.position.set(-0.34, 0.14, 0.07);
    wingLeft.rotation.y = 0.25;
    wingLeft.rotation.z = 0.22;

    wingRight = new THREE.Mesh(wingGeo, matWing);
    wingRight.position.set(0.34, 0.14, 0.07);
    wingRight.rotation.y = -0.25;
    wingRight.rotation.z = -0.22;

    const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 6, 10), matSec);
    g.add(spine, wingLeft, wingRight);
  }

  return { group: g, wingLeft, wingRight };
}

// ============================================================================
// Realistic Anatomically Sculpted Explorer Character Rig
// ============================================================================

/**
 * Build an expressive, anatomically distinctive 3D Gray Langur (Langoor) companion:
 * silvery-ash fur, pale cheek/crown ruff, iconic black face mask, amber eyes with catchlights,
 * dark hands/feet, explorer bandana, and long graceful upward-looping tail.
 */
export function buildLangoorModel(scale = 1, withBandana = true): LangoorPetRig {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const furSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd4d1c7,
    roughness: 0.84,
    metalness: 0.02,
  });
  const furCreamMat = new THREE.MeshStandardMaterial({
    color: 0xefece2,
    roughness: 0.86,
    metalness: 0.01,
  });
  const faceDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.56,
    metalness: 0.04,
  });
  const irisAmberMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.14,
    clearcoat: 0.9,
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bandanaMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.14,
    roughness: 0.62,
    metalness: 0.06,
  });

  // Seated torso (slight athletic forward hunch)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.14, 8, 16), furSilverMat);
  torso.position.set(0, 0.14, 0.01);
  torso.rotation.x = -0.14;
  torso.scale.set(0.95, 1.0, 0.92);
  root.add(torso);

  // Soft pale cream chest & belly fur
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), furCreamMat);
  belly.position.set(0, 0.145, -0.042);
  belly.scale.set(0.84, 1.18, 0.58);
  root.add(belly);

  // Seated hind haunches & dark Langoor feet gripping the perch
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.095, 6, 10), furSilverMat);
    thigh.position.set(side * 0.068, 0.062, -0.028);
    thigh.rotation.x = 1.15;
    thigh.rotation.z = side * -0.18;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), faceDarkMat);
    foot.scale.set(0.85, 0.52, 1.48);
    foot.position.set(side * 0.074, 0.022, -0.088);
    root.add(thigh, foot);
  }

  // Optional friendly blue water-tank bandana collar around pet neck
  if (withBandana) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.016, 8, 18), bandanaMat);
    collar.rotation.x = Math.PI / 2 + 0.16;
    collar.position.set(0, 0.255, -0.008);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.068, 8), bandanaMat);
    knot.position.set(0, 0.23, 0.072);
    knot.rotation.x = -0.75;
    root.add(collar, knot);
  }

  // Expressive Head with iconic Gray Langur pale crest/ruff & dark black face mask
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.285, -0.022);
  root.add(headPivot);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 14), furSilverMat);
  cranium.scale.set(0.98, 0.96, 1.02);
  headPivot.add(cranium);

  // Iconic fluffy pale white-silver Langoor brow crest & cheek ruff framing the black face
  const crownCrest = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), furCreamMat);
  crownCrest.scale.set(1.12, 0.62, 0.86);
  crownCrest.position.set(0, 0.062, -0.018);
  headPivot.add(crownCrest);

  let leftEar!: THREE.Object3D;
  let rightEar!: THREE.Object3D;
  for (const side of [-1, 1]) {
    const cheekRuff = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), furCreamMat);
    cheekRuff.scale.set(0.68, 1.08, 0.72);
    cheekRuff.position.set(side * 0.074, -0.006, -0.032);
    headPivot.add(cheekRuff);

    // Classic black Langoor rounded ears peeking out of pale cheek fur (individually pivotable for twitches)
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.088, 0.012, 0.004);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 8), faceDarkMat);
    ear.scale.set(0.45, 0.95, 0.85);
    ear.position.set(side * 0.004, 0, 0);
    earPivot.add(ear);
    headPivot.add(earPivot);
    if (side === -1) leftEar = earPivot;
    else rightEar = earPivot;
  }

  // Dark charcoal-black face mask + gently protruding muzzle
  const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.076, 16, 14), faceDarkMat);
  faceMask.scale.set(0.92, 0.94, 0.64);
  faceMask.position.set(0, -0.004, -0.056);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), faceDarkMat);
  muzzle.scale.set(1.02, 0.76, 0.82);
  muzzle.position.set(0, -0.032, -0.088);
  headPivot.add(faceMask, muzzle);

  // Expressive warm amber eyes with dark pupils, white catchlights & soft blinking eyelids
  const eyelids: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eyeRing = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), irisAmberMat);
    eyeRing.scale.set(1.0, 1.0, 0.65);
    eyeRing.position.set(side * 0.029, 0.014, -0.095);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), pupilMat);
    pupil.scale.set(1.0, 1.0, 0.5);
    pupil.position.set(side * 0.029, 0.014, -0.104);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 6), whiteMat);
    glint.position.set(side * 0.025, 0.020, -0.108);

    const eyelid = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), faceDarkMat);
    eyelid.scale.set(1.05, 0.08, 0.72);
    eyelid.position.set(side * 0.029, 0.026, -0.097);
    eyelids.push(eyelid);

    headPivot.add(eyeRing, pupil, glint, eyelid);
  }

  // Articulated slender silver arms with black hands
  const makeLangoorArm = (side: -1 | 1): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.082, 0.225, -0.015);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.115, 6, 10), furSilverMat);
    upper.position.set(0, -0.068, -0.018);
    upper.rotation.x = 0.26;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), faceDarkMat);
    hand.scale.set(0.85, 0.72, 1.15);
    hand.position.set(0, -0.135, -0.044);
    arm.add(upper, hand);
    root.add(arm);
    return arm;
  };
  const leftArm = makeLangoorArm(-1);
  const rightArm = makeLangoorArm(1);

  // Iconic long graceful upward-looping Gray Langur tail with articulated mid-tip pivot for subtle twitches
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.075, 0.085);
  const tailLowerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.022, 0.085, 0.13),
    new THREE.Vector3(0.052, 0.25, 0.205),
  ]);
  const tailLowerMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tailLowerCurve, 12, 0.021, 8, false),
    furSilverMat
  );
  tailPivot.add(tailLowerMesh);

  const tailTipPivot = new THREE.Group();
  tailTipPivot.position.set(0.052, 0.25, 0.205);
  const tailUpperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.012, 0.17, -0.07),
    new THREE.Vector3(-0.062, 0.22, -0.185),
  ]);
  const tailUpperMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tailUpperCurve, 12, 0.019, 8, false),
    furSilverMat
  );
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), furCreamMat);
  tailTip.position.set(-0.062, 0.22, -0.185);
  tailTipPivot.add(tailUpperMesh, tailTip);
  tailPivot.add(tailTipPivot);
  root.add(tailPivot);

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    headPivot,
    tailPivot,
    tailTipPivot,
    leftArm,
    rightArm,
    leftEar,
    rightEar,
    eyelids,
    idleState: {
      nextLookTime: 1.4,
      lookTargetYaw: 0.18,
      lookTargetPitch: 0.02,
      lookTargetRoll: 0.05,
      nextTailTwitchTime: 1.9,
      tailTwitchDuration: 0.42,
      tailTwitchDir: 1,
      nextEarTwitchTime: 2.3,
      earTwitchSide: 1,
      nextBlinkTime: 2.1,
      nextPawFidgetTime: 4.8,
      pawFidgetDuration: 1.15,
    },
    baseY: 0,
  };
}

export const CHARACTER_HEIGHT_SCALE = 1.25;

export function buildCharacterRig(custom: CharacterCustomization): CharacterRig {
  const isFemale = custom.gender === 'female';
  const hatItem = getCosmeticById(custom.hat)!;
  const outfitItem = getCosmeticById(custom.outfit)!;
  const packItem = getCosmeticById(custom.backpack)!;
  const bootsItem = getCosmeticById(custom.boots)!;
  const colorDye = getCosmeticById(custom.color)!;
  const isCowboyOutfit = outfitItem.id === 'outfit_cowboy';
  const hasHat = hatItem.id !== 'hat_none';

  const createdTextures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.scale.setScalar(CHARACTER_HEIGHT_SCALE);
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Articulated Pelvis (hipsPivot at y=0.96, true ~50% human height) -> Lumbar Spine / Ribcage (chestPivot at world y=1.06)
  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, 0.96, 0);
  bodyPivot.add(hipsPivot);
  const hipsContent = new THREE.Group();
  hipsContent.position.set(0, -0.96, 0);
  hipsPivot.add(hipsContent);

  const chestPivot = new THREE.Group();
  chestPivot.position.set(0, 0.10, 0); // 0.96 + 0.10 = 1.06 lumbar waist pivot
  hipsPivot.add(chestPivot);
  const chestContent = new THREE.Group();
  chestContent.position.set(0, -1.06, 0);
  chestPivot.add(chestContent);

  // Realistic procedural character PBR textures (separate painterly face skin & limb skin)
  const skinHex = isFemale ? '#dfa580' : '#c7855c';
  const hairHex = isFemale ? '#472112' : '#5e2c15';

  const bodySkinTex = makeSkinTexture(skinHex, isFemale, createdTextures);
  const faceSkinTex = makeFaceSkinTexture(skinHex, hairHex, isFemale, createdTextures);
  const shirtTex = makeFabricTextures(outfitItem.primaryHex, true, createdTextures);
  const shortsTex = makeFabricTextures(outfitItem.secondaryHex, true, createdTextures);
  const leatherTex = makeLeatherTextures('#472916', createdTextures, true);
  const bootTex = makeLeatherTextures(bootsItem.primaryHex, createdTextures, true);
  const hairTex = makeHairTextures(hairHex, createdTextures);
  const irisTex = makeIrisTexture(isFemale, createdTextures);
  const badgeTex = makeExplorerBadgeTexture(colorDye.secondaryHex, createdTextures);

  const skinMat = makeSkinMat(skinHex, bodySkinTex.map, bodySkinTex.bump);
  const faceSkinMat = makeSkinMat(skinHex, faceSkinTex.map, faceSkinTex.bump);
  const hairMat = makeMat(hairHex, 0.46, 0.05, undefined, hairTex.map, hairTex.bump, 0.032);
  const outfitPrimaryMat = makeMat(
    outfitItem.primaryHex,
    outfitItem.roughness ?? 0.78,
    outfitItem.metalness ?? 0.04,
    outfitItem.emissiveHex,
    shirtTex.map,
    shirtTex.bump,
    0.035
  );
  const outfitSecondaryMat = makeMat(
    outfitItem.secondaryHex,
    0.76,
    0.04,
    undefined,
    shortsTex.map,
    shortsTex.bump,
    0.03
  );
  const accentMat = makeMat(colorDye.secondaryHex, 0.56, 0.12);
  const beltMat = makeMat('#422715', 0.48, 0.14, undefined, leatherTex.map, leatherTex.bump, 0.03);
  const buckleMat = makeMat('#d4a234', 0.24, 0.88);
  const bootMainMat = makeMat(
    bootsItem.primaryHex,
    bootsItem.roughness ?? 0.52,
    bootsItem.metalness ?? 0.12,
    bootsItem.emissiveHex,
    bootTex.map,
    bootTex.bump,
    0.035
  );
  const bootSoleMat = makeMat(bootsItem.secondaryHex, 0.84, 0.04);

  // -------------------------------------------------------------------------
  // 1. True 7.2-Head Human Athletic Torso (Natural Spine S-Curve, V-Taper & Collar)
  // -------------------------------------------------------------------------
  const shoulderW = isFemale ? 0.172 : 0.214;
  const waistW = isFemale ? 0.114 : 0.144;
  const hipW = isFemale ? 0.162 : 0.158;

  const torsoGeo = buildSculptedLoftGeometry(
    28,
    32,
    (t) => {
      // t = 0 (pelvis top y=0.92) -> t = 1 (trapezius collar y=1.555)
      const y = 0.92 + t * 0.635;
      // Natural human spinal S-curve (lumbar lordosis + thoracic kyphosis)
      const cz =
        Math.sin(t * Math.PI * 1.45) * -0.022 +
        (t < 0.22 ? (0.22 - t) * 0.075 : 0);

      let rx: number;
      let rz: number;
      if (t < 0.34) {
        // Hip -> slender natural waist
        const k = t / 0.34;
        const smooth = k * k * (3 - 2 * k);
        rx = THREE.MathUtils.lerp(hipW, waistW, smooth);
        rz = THREE.MathUtils.lerp(0.114, isFemale ? 0.092 : 0.100, smooth);
      } else if (t < 0.85) {
        // Waist -> athletic ribcage / latissimus & shoulder breadth
        const k = (t - 0.34) / 0.51;
        const smooth = Math.sin((k * Math.PI) / 2);
        rx = THREE.MathUtils.lerp(waistW, shoulderW, smooth);
        rz = THREE.MathUtils.lerp(isFemale ? 0.092 : 0.100, isFemale ? 0.114 : 0.130, smooth);
      } else {
        // Shoulders -> tapered trapezius slope into neck
        const k = (t - 0.85) / 0.15;
        rx = THREE.MathUtils.lerp(shoulderW, isFemale ? 0.078 : 0.094, k * k);
        rz = THREE.MathUtils.lerp(isFemale ? 0.114 : 0.130, 0.076, k);
      }
      return { y, cx: 0, cz, rx, rz };
    },
    (t, theta, s) => {
      let rx = s.rx;
      let rz = s.rz;
      const cosT = Math.cos(theta); // +1 at back (+Z), -1 at front (-Z)
      const sinT = Math.sin(theta);

      // Rear spinal furrow & shoulder-blade contours (+Z back — main gameplay view!)
      if (cosT > 0.1 && t > 0.22 && t < 0.90) {
        const spineIndent = Math.pow(cosT, 6) * 0.019 * Math.sin(((t - 0.22) / 0.68) * Math.PI);
        const scapulaeSwell = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.016 * Math.max(0, t - 0.42);
        rz += scapulaeSwell - spineIndent;
      }

      // Front pectoral / bust anatomical contour (-Z front)
      if (cosT < -0.15 && t > 0.52 && t < 0.86) {
        const chest = Math.sin(((t - 0.52) / 0.34) * Math.PI);
        const pecSwell = (isFemale ? 0.032 : 0.020) * Math.pow(Math.abs(sinT), 0.55) * (-cosT);
        rz += chest * pecSwell;
      }

      // Subtle natural waist cloth drape creases
      if (t > 0.18 && t < 0.52) {
        const crease = Math.sin(t * 36 + sinT * 2.5) * 0.0042 * Math.sin(((t - 0.18) / 0.34) * Math.PI);
        rx += crease;
        rz += crease;
      }

      // Shirt hem tuck fold just above belt
      if (t > 0.14 && t < 0.22) {
        const tuck = Math.sin(((t - 0.14) / 0.08) * Math.PI) * 0.009;
        rx += tuck;
        rz += tuck;
      }

      return { rx, rz };
    }
  );
  const torsoMesh = new THREE.Mesh(torsoGeo, outfitPrimaryMat);
  chestContent.add(torsoMesh);

  // Tailored Western Leather Cowboy Vest over the shirt
  if (isCowboyOutfit) {
    const vestTex = makeLeatherTextures(outfitItem.accentHex, createdTextures);
    const vestMat = makeMat(outfitItem.accentHex, 0.56, 0.1, undefined, vestTex.map, vestTex.bump, 0.035);
    const vestGeo = buildSculptedLoftGeometry(
      18,
      28,
      (t) => {
        const y = 1.04 + t * 0.47; // spans torso t ~ 0.19..0.93
        const tTorso = (y - 0.92) / 0.635;
        const cz =
          Math.sin(tTorso * Math.PI * 1.45) * -0.022 +
          (tTorso < 0.22 ? (0.22 - tTorso) * 0.075 : 0);

        let baseRx: number;
        let baseRz: number;
        if (tTorso < 0.34) {
          const k = tTorso / 0.34;
          const smooth = k * k * (3 - 2 * k);
          baseRx = THREE.MathUtils.lerp(hipW, waistW, smooth);
          baseRz = THREE.MathUtils.lerp(0.114, isFemale ? 0.092 : 0.100, smooth);
        } else if (tTorso < 0.85) {
          const k = (tTorso - 0.34) / 0.51;
          const smooth = Math.sin((k * Math.PI) / 2);
          baseRx = THREE.MathUtils.lerp(waistW, shoulderW, smooth);
          baseRz = THREE.MathUtils.lerp(isFemale ? 0.092 : 0.100, isFemale ? 0.114 : 0.130, smooth);
        } else {
          const k = (tTorso - 0.85) / 0.15;
          baseRx = THREE.MathUtils.lerp(shoulderW, isFemale ? 0.078 : 0.094, k * k);
          baseRz = THREE.MathUtils.lerp(isFemale ? 0.114 : 0.130, 0.076, k);
        }

        const armholeInset = t > 0.64 ? (t - 0.64) * 0.042 : 0;
        return {
          y,
          cx: 0,
          cz,
          rx: baseRx + 0.011 - armholeInset,
          rz: baseRz + 0.013,
        };
      },
      (t, theta, s) => {
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        let rz = s.rz;
        if (cosT > 0.1 && t > 0.1) {
          const scapulaeSwell = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.014 * Math.max(0, t - 0.35);
          rz += scapulaeSwell;
        }
        if (cosT < -0.15 && t > 0.44 && t < 0.86) {
          const chest = Math.sin(((t - 0.44) / 0.42) * Math.PI);
          rz += chest * (isFemale ? 0.032 : 0.020) * Math.pow(Math.abs(sinT), 0.55) * (-cosT);
        }
        if (cosT < -0.78 && t > 0.45) {
          rz -= (-cosT) * 0.012 * ((t - 0.45) / 0.55);
        }
        return { rx: s.rx, rz };
      }
    );
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    chestContent.add(vestMesh);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), buckleMat);
      btn.position.set(0, 1.13 + b * 0.095, -(isFemale ? 0.138 : 0.150));
      chestContent.add(btn);
    }
  }

  // Cross-Body Stitched Leather Explorer Harness with Brass Buckle & Expedition Chest Badge
  const harnessFrontZ = -(isFemale ? 0.128 : 0.144) - (isCowboyOutfit ? 0.013 : 0);
  const harnessBackZ = (isFemale ? 0.125 : 0.138) + (isCowboyOutfit ? 0.012 : 0);
  const harnessCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-shoulderW * 0.60, 1.51, -0.016),
      new THREE.Vector3(-shoulderW * 0.40, 1.40, harnessFrontZ),
      new THREE.Vector3(0.02, 1.21, harnessFrontZ - 0.004),
      new THREE.Vector3(waistW * 1.07, 1.04, -0.016),
      new THREE.Vector3(waistW * 0.72, 1.07, harnessBackZ),
      new THREE.Vector3(-0.02, 1.29, harnessBackZ + 0.006),
      new THREE.Vector3(-shoulderW * 0.52, 1.49, 0.068),
    ],
    true
  );
  const harnessStrapGeo = new THREE.TubeGeometry(harnessCurve, 44, 0.017, 8, true);
  harnessStrapGeo.scale(1.0, 1.0, 0.94);
  const harnessStrap = new THREE.Mesh(harnessStrapGeo, beltMat);
  chestContent.add(harnessStrap);

  const chestBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0055, 8, 16), buckleMat);
  chestBuckle.scale.set(1.15, 0.86, 0.7);
  chestBuckle.position.set(-shoulderW * 0.25, 1.33, harnessFrontZ - 0.012);
  chestBuckle.rotation.z = -0.68;
  chestBuckle.rotation.y = 0.18;
  chestContent.add(chestBuckle);

  const harnessKeeper = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.015, 0.015), beltMat);
  harnessKeeper.position.set(-shoulderW * 0.14, 1.27, harnessFrontZ - 0.010);
  harnessKeeper.rotation.z = -0.68;
  chestContent.add(harnessKeeper);

  const harnessRing = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 14), buckleMat);
  harnessRing.position.set(waistW * 0.62, 1.11, harnessFrontZ - 0.004);
  harnessRing.rotation.y = -0.35;
  chestContent.add(harnessRing);

  // Detailed Stitched Chest Utility Pockets + Embroidered Expedition Badge Patch
  const pocketMat = makeMat(outfitItem.primaryHex, 0.76, 0.04, undefined, shirtTex.map, shirtTex.bump, 0.04);
  const pocketZ = -(isFemale ? 0.124 : 0.138) - (isCowboyOutfit ? 0.014 : 0);
  for (const side of [-1, 1]) {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.062, 0.014), pocketMat);
    pocket.position.set(side * (isFemale ? 0.064 : 0.080), 1.34, pocketZ);
    pocket.rotation.y = side * -0.18;
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.018, 0.017), beltMat);
    flap.position.set(side * (isFemale ? 0.064 : 0.080), 1.368, pocketZ - 0.003);
    flap.rotation.y = side * -0.18;
    const pBtn = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 8), buckleMat);
    pBtn.position.set(side * (isFemale ? 0.064 : 0.080), 1.362, pocketZ - 0.012);
    chestContent.add(pocket, flap, pBtn);
  }

  const badgeMat = new THREE.MeshPhysicalMaterial({
    map: badgeTex,
    roughness: 0.42,
    metalness: 0.25,
    clearcoat: 0.22,
  });
  const chestBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.007, 20), badgeMat);
  chestBadge.rotation.x = Math.PI / 2;
  chestBadge.rotation.z = -0.15;
  chestBadge.position.set(isFemale ? 0.068 : 0.086, 1.42, pocketZ - 0.002);
  chestContent.add(chestBadge);

  // Open V-Neck Skin Upper Chest + Sculpted Clavicle (Collarbone) Ridges + Tailored Turned Shirt Collar
  const chestSkinV = new THREE.Mesh(
    buildSculptedLoftGeometry(8, 16, (t) => ({
      y: 1.455 + t * 0.105,
      cx: 0,
      cz: THREE.MathUtils.lerp(-0.088, -0.028, t),
      rx: THREE.MathUtils.lerp(0.022, isFemale ? 0.068 : 0.082, Math.pow(t, 0.72)),
      rz: THREE.MathUtils.lerp(0.028, 0.056, t),
    })),
    skinMat
  );
  chestContent.add(chestSkinV);

  // Subtle sculpted collarbones (clavicles) bridging sternum toward shoulders
  for (const side of [-1, 1]) {
    const clavCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.012, 1.522, -0.068),
      new THREE.Vector3(side * (isFemale ? 0.064 : 0.078), 1.530, -0.060),
      new THREE.Vector3(side * (isFemale ? 0.118 : 0.140), 1.534, -0.024),
    ]);
    const clav = new THREE.Mesh(new THREE.TubeGeometry(clavCurve, 10, 0.0085, 6, false), skinMat);
    chestContent.add(clav);
  }

  // Tailored turned-down shirt collar lapels (replacing chunky torus donut)
  for (const side of [-1, 1]) {
    const lapelCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.010, 1.472, -0.098),
      new THREE.Vector3(side * (isFemale ? 0.064 : 0.076), 1.528, -0.066),
      new THREE.Vector3(side * (isFemale ? 0.082 : 0.095), 1.552, 0.010),
      new THREE.Vector3(side * 0.032, 1.558, 0.068),
      new THREE.Vector3(0, 1.558, 0.078),
    ]);
    const lapel = new THREE.Mesh(
      buildTaperedHairStrand(lapelCurve, 0.008, 0.015, 0.013, 1.5, 14, 8),
      outfitPrimaryMat
    );
    chestContent.add(lapel);
  }

  // Classic Explorer Neckerchief / Bandana (sleeker & naturally fitted around collar)
  const bandanaCollar = new THREE.Mesh(
    new THREE.TorusGeometry(isFemale ? 0.076 : 0.086, 0.014, 10, 22),
    accentMat
  );
  bandanaCollar.rotation.x = Math.PI / 2 + 0.14;
  bandanaCollar.position.set(0, 1.538, 0.002);
  chestContent.add(bandanaCollar);

  const scarfTail = new THREE.Mesh(
    isCowboyOutfit
      ? buildSculptedLoftGeometry(8, 12, (t) => ({
          y: -t * 0.19,
          cx: 0,
          cz: t * 0.04,
          rx: THREE.MathUtils.lerp(0.074, 0.007, t),
          rz: THREE.MathUtils.lerp(0.014, 0.004, t),
        }))
      : buildSculptedLoftGeometry(8, 10, (t) => ({
          y: -t * 0.16,
          cx: t * 0.022,
          cz: t * 0.048,
          rx: THREE.MathUtils.lerp(0.024, 0.010, t),
          rz: THREE.MathUtils.lerp(0.012, 0.005, t),
        })),
    accentMat
  );
  scarfTail.position.set(isCowboyOutfit ? 0 : 0.018, 1.53, isCowboyOutfit ? 0.090 : 0.082);
  chestContent.add(scarfTail);

  // Sculpted Trousers / Denim Pelvis with Realistic Gluteal & Iliac Curve
  const pelvisGeo = buildSculptedLoftGeometry(
    14,
    26,
    (t) => {
      const y = 0.85 + t * 0.21;
      const cz = t < 0.62 ? 0.016 * Math.sin((t / 0.62) * Math.PI) : 0;
      const rx = THREE.MathUtils.lerp(hipW * 1.03, waistW * 1.04, t * 0.72);
      const rz = THREE.MathUtils.lerp(0.124, 0.104, t * 0.62);
      return { y, cx: 0, cz, rx, rz };
    },
    (t, theta, s) => {
      const cosT = Math.cos(theta);
      let rz = s.rz;
      if (cosT > 0.2 && t < 0.78) {
        const glute = Math.pow(Math.sin(theta * 2), 2) * cosT * (isFemale ? 0.028 : 0.022) * Math.sin((t / 0.78) * Math.PI);
        const crease = Math.pow(cosT, 8) * 0.011;
        rz += glute - crease;
      }
      return { rx: s.rx, rz };
    }
  );
  const pelvisMesh = new THREE.Mesh(pelvisGeo, outfitSecondaryMat);
  hipsContent.add(pelvisMesh);

  // Western Gunbelt / Explorer Utility Belt with Brass Rivets & Ornate Buckle
  const beltGeo = buildSculptedLoftGeometry(4, 24, (t) => ({
    y: 1.015 + t * 0.056,
    cx: 0,
    cz: 0.004,
    rx: waistW * 1.09,
    rz: 0.112,
  }));
  const beltMesh = new THREE.Mesh(beltGeo, beltMat);
  if (isCowboyOutfit) {
    beltMesh.rotation.z = -0.05;
  }
  hipsContent.add(beltMesh);

  for (let rv = 0; rv < 10; rv++) {
    const ang = (rv / 10) * Math.PI * 2;
    if (Math.cos(ang) < -0.82) continue;
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 8, 6), buckleMat);
    rivet.position.set(
      Math.sin(ang) * waistW * 1.10,
      1.043,
      0.004 + Math.cos(ang) * 0.114
    );
    hipsContent.add(rivet);
  }

  const buckle = new THREE.Mesh(
    new THREE.TorusGeometry(isCowboyOutfit ? 0.036 : 0.028, 0.0085, 8, 18),
    buckleMat
  );
  buckle.scale.set(1.24, 0.88, 0.8);
  buckle.position.set(0, 1.04, -0.112);
  const bucklePin = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.040, 8), buckleMat);
  bucklePin.rotation.z = Math.PI / 2;
  bucklePin.position.set(-0.007, 1.04, -0.116);
  hipsContent.add(buckle, bucklePin);

  // Right-hip Holster / Field Pouch
  const hipSatchelGroup = new THREE.Group();
  hipSatchelGroup.position.set(hipW * 0.99, 0.96, 0.03);
  hipSatchelGroup.rotation.z = -0.08;
  hipSatchelGroup.rotation.y = 0.22;
  if (isCowboyOutfit) {
    const holsterBody = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.022, 0.17, 14), beltMat);
    holsterBody.scale.set(0.75, 1.0, 1.15);
    holsterBody.rotation.x = 0.22;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 6, 14), beltMat);
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.052;
    const revGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.048, 6, 10), makeMat('#3b1c0c', 0.42, 0.15));
    revGrip.position.set(0, 0.095, 0.022);
    revGrip.rotation.x = -0.55;
    hipSatchelGroup.add(holsterBody, strap, revGrip);
  } else {
    const pouchBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.052, 8, 14), beltMat);
    pouchBody.scale.set(0.64, 1.0, 1.14);
    const pouchFlap = new THREE.Mesh(
      new THREE.SphereGeometry(0.050, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      beltMat
    );
    pouchFlap.scale.set(0.68, 0.7, 1.18);
    pouchFlap.position.y = 0.030;
    const pouchSnap = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 8), buckleMat);
    pouchSnap.position.set(0.032, 0.008, 0.008);
    hipSatchelGroup.add(pouchBody, pouchFlap, pouchSnap);
  }
  hipsContent.add(hipSatchelGroup);

  // Left-hip Leather Utility Pouch
  const leftPouchGroup = new THREE.Group();
  leftPouchGroup.position.set(-hipW * 0.97, 0.98, 0.025);
  leftPouchGroup.rotation.z = 0.08;
  const smallPouch = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.080, 0.068), beltMat);
  const smallFlap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.026, 0.072), beltMat);
  smallFlap.position.set(-0.002, 0.028, 0);
  const smallSnap = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), buckleMat);
  smallSnap.position.set(-0.024, 0.014, 0);
  leftPouchGroup.add(smallPouch, smallFlap, smallSnap);
  hipsContent.add(leftPouchGroup);

  if (isFemale && !isCowboyOutfit) {
    const skirtGeo = buildSculptedLoftGeometry(10, 24, (t) => ({
      y: 0.79 + t * 0.22,
      cx: 0,
      cz: 0.008 * (1 - t),
      rx: THREE.MathUtils.lerp(0.205, 0.140, t),
      rz: THREE.MathUtils.lerp(0.152, 0.112, t),
    }));
    hipsContent.add(new THREE.Mesh(skirtGeo, outfitSecondaryMat));
  }

  // -------------------------------------------------------------------------
  // 2. Sculpted Human Neck (SCM Muscles & Trapezius), Realistic Head, Face & Tapered Hair
  // -------------------------------------------------------------------------
  const neckGeo = buildSculptedLoftGeometry(
    12,
    20,
    (t) => ({
      y: 1.525 + t * 0.180,
      cx: 0,
      cz: THREE.MathUtils.lerp(0.004, -0.012, t),
      rx: THREE.MathUtils.lerp(isFemale ? 0.058 : 0.068, isFemale ? 0.044 : 0.052, Math.pow(t, 0.75)),
      rz: THREE.MathUtils.lerp(isFemale ? 0.060 : 0.068, isFemale ? 0.048 : 0.055, Math.pow(t, 0.75)),
    }),
    (t, theta, s) => {
      const cosT = Math.cos(theta);
      const absSin = Math.abs(Math.sin(theta));
      let rx = s.rx;
      let rz = s.rz;
      // Trapezius base flare smoothly blending neck into shoulders (t < 0.35)
      if (t < 0.35) {
        const trap = Math.pow(1 - t / 0.35, 1.5);
        rx += trap * absSin * (isFemale ? 0.024 : 0.032);
        rz += trap * Math.max(0, cosT) * 0.014;
      }
      // Subtle sternocleidomastoid V-muscles on front-sides of neck
      if (cosT < -0.2 && t > 0.15 && t < 0.85) {
        const scmPos = THREE.MathUtils.lerp(0.22, 0.68, t);
        const scm = Math.exp(-Math.pow((absSin - scmPos) / 0.18, 2));
        rz += scm * 0.0045;
      }
      // Subtle masculine Adam's apple / throat contour
      if (!isFemale && cosT < -0.82 && t > 0.38 && t < 0.62) {
        rz += Math.sin(((t - 0.38) / 0.24) * Math.PI) * 0.005;
      }
      return { rx, rz };
    }
  );
  chestContent.add(new THREE.Mesh(neckGeo, skinMat));

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.795, -0.012);
  chestContent.add(headGroup);

  const headMesh = new THREE.Mesh(buildSculptedHeadGeometry(isFemale), faceSkinMat);
  headGroup.add(headMesh);

  // Realistic Anatomically Sized Human Ears (Helix, Inner Concha & Earlobe nestled close to head)
  const innerEarMat = makeMat(isFemale ? '#ba7d5a' : '#9c5f3d', 0.64, 0.0);
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * (isFemale ? 0.100 : 0.108), -0.008, 0.007);
    earGroup.rotation.y = side * 0.22;
    earGroup.rotation.z = side * -0.06;

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 12), skinMat);
    earOuter.scale.set(0.36, 1.14, 0.68);
    const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0036, 6, 14, Math.PI * 1.45), skinMat);
    earHelix.rotation.y = Math.PI / 2;
    earHelix.rotation.x = -0.35;
    earHelix.scale.set(0.68, 1.12, 0.55);
    earHelix.position.set(side * 0.001, 0.002, 0.001);
    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 10, 8), innerEarMat);
    earInner.scale.set(0.28, 0.84, 0.52);
    earInner.position.set(side * 0.0035, -0.001, -0.004);
    const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), skinMat);
    earLobe.scale.set(0.48, 0.88, 0.64);
    earLobe.position.set(0, -0.022, -0.002);

    earGroup.add(earOuter, earHelix, earInner, earLobe);
    headGroup.add(earGroup);
  }

  // Subtle Refined Nose Tip & Nostril Accents (integrated seamlessly onto sculpted nasal bridge)
  const nostrilMat = makeMat(isFemale ? '#844630' : '#66321f', 0.74, 0.0);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.0096, 12, 10), skinMat);
  noseTip.scale.set(1.04, 0.80, 1.05);
  noseTip.position.set(0, -0.026, -0.127);
  headGroup.add(noseTip);

  for (const side of [-1, 1]) {
    const nostrilWing = new THREE.Mesh(new THREE.SphereGeometry(0.0060, 10, 8), skinMat);
    nostrilWing.scale.set(0.95, 0.72, 0.88);
    nostrilWing.position.set(side * 0.0092, -0.029, -0.121);
    const nostrilHole = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), nostrilMat);
    nostrilHole.scale.set(1.15, 0.45, 0.9);
    nostrilHole.position.set(side * 0.0062, -0.0326, -0.1225);
    headGroup.add(nostrilWing, nostrilHole);
  }

  // Sculpted Hair Shell + Organic Tapered Ribbon Hair Locks (Zero Sausage Pipes!)
  const hairShell = new THREE.Mesh(buildSculptedHairShell(isFemale), hairMat);
  if (hasHat) {
    hairShell.scale.set(0.97, 0.82, 0.97);
    hairShell.position.y = -0.008;
  }
  headGroup.add(hairShell);

  // Subtle natural sideburns / temple face-framing tapered locks
  for (const side of [-1, 1]) {
    const templeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.094, 0.062, -0.056),
      new THREE.Vector3(side * 0.107, 0.016, -0.022),
      new THREE.Vector3(side * 0.102, -0.026, -0.004),
      new THREE.Vector3(side * 0.090, isFemale ? -0.072 : -0.040, 0.014),
    ]);
    const templeLock = new THREE.Mesh(
      buildTaperedHairStrand(
        templeCurve,
        isFemale ? 0.010 : 0.0085,
        isFemale ? 0.0085 : 0.0065,
        0.0018,
        1.5,
        12,
        7
      ),
      hairMat
    );
    headGroup.add(templeLock);
  }

  // Natural swept forehead fringe / bangs (tapered ribbon locks)
  const bangConfigs = isFemale
    ? [
        { x0: -0.048, x1: -0.088, y0: 0.088, y1: 0.036, r: 0.0105 },
        { x0: -0.014, x1: -0.056, y0: 0.095, y1: 0.050, r: 0.011 },
        { x0: 0.016, x1: 0.064, y0: 0.094, y1: 0.046, r: 0.011 },
        { x0: 0.054, x1: 0.092, y0: 0.084, y1: 0.034, r: 0.0095 },
      ]
    : [
        { x0: -0.050, x1: -0.084, y0: 0.084, y1: 0.046, r: 0.0095 },
        { x0: -0.016, x1: 0.036, y0: 0.092, y1: 0.058, r: 0.0115 },
        { x0: 0.026, x1: 0.078, y0: 0.088, y1: 0.050, r: 0.010 },
        { x0: 0.060, x1: 0.094, y0: 0.078, y1: 0.040, r: 0.0085 },
      ];
  for (const bc of bangConfigs) {
    const yDrop = hasHat ? -0.016 : 0;
    const bangCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bc.x0, bc.y0 + yDrop, -0.084),
      new THREE.Vector3((bc.x0 + bc.x1) * 0.5, (bc.y0 + bc.y1) * 0.5 + 0.006 + yDrop, -0.112),
      new THREE.Vector3(bc.x1, bc.y1 + yDrop, -0.098),
    ]);
    const bangMesh = new THREE.Mesh(
      buildTaperedHairStrand(bangCurve, bc.r, bc.r * 0.85, 0.0018, 1.7, 10, 7),
      hairMat
    );
    headGroup.add(bangMesh);
  }

  if (!hasHat) {
    // Layered tapered crown-to-nape hair ribbons when hatless
    for (let i = -3; i <= 3; i++) {
      const spread = i * 0.026;
      const lockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(spread * 0.85, 0.098 - Math.abs(i) * 0.009, -0.080 + Math.abs(i) * 0.014),
        new THREE.Vector3(spread * 1.10, 0.142 - Math.abs(i) * 0.012, 0.008),
        new THREE.Vector3(spread * 1.02, 0.084 - Math.abs(i) * 0.010, 0.122),
        new THREE.Vector3(spread * 0.72, -0.044, 0.126),
      ]);
      const lockGeo = buildTaperedHairStrand(
        lockCurve,
        0.0115 - Math.abs(i) * 0.001,
        0.0125 - Math.abs(i) * 0.001,
        0.0022,
        1.85,
        14,
        7
      );
      headGroup.add(new THREE.Mesh(lockGeo, hairMat));
    }
  } else {
    // Clean tapered nape locks peeking naturally beneath hat brim at back (+Z)
    for (let i = -2; i <= 2; i++) {
      const napeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(i * 0.025, 0.022, 0.112),
        new THREE.Vector3(i * 0.027, -0.024, 0.124),
        new THREE.Vector3(i * 0.022, -0.068, 0.114),
      ]);
      const napeLock = new THREE.Mesh(
        buildTaperedHairStrand(napeCurve, 0.0105, 0.009, 0.002, 1.65, 8, 7),
        hairMat
      );
      headGroup.add(napeLock);
    }
  }

  let ponyTailPivot: THREE.Group | undefined;
  if (isFemale) {
    // Lush multi-ribbon tapered ponytail flowing dynamically behind head (+Z)
    ponyTailPivot = new THREE.Group();
    ponyTailPivot.position.set(0, 0.008, 0.126);
    const ponyContent = new THREE.Group();
    ponyContent.position.set(0, -0.008, -0.126);
    ponyTailPivot.add(ponyContent);

    const ponyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.010, 0.118),
      new THREE.Vector3(0, -0.014, 0.184),
      new THREE.Vector3(0, -0.125, 0.205),
      new THREE.Vector3(0, -0.255, 0.172),
    ]);
    const ponyTail = new THREE.Mesh(
      buildTaperedHairStrand(ponyCurve, 0.024, 0.032, 0.0035, 1.35, 18, 10),
      hairMat
    );
    ponyContent.add(ponyTail);

    // Layered secondary tapered ponytail locks for natural movement & silhouette
    for (const side of [-1, 1]) {
      const subCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.010, 0.006, 0.124),
        new THREE.Vector3(side * 0.028, -0.042, 0.180),
        new THREE.Vector3(side * 0.024, -0.145, 0.194),
        new THREE.Vector3(side * 0.010, -0.242, 0.168),
      ]);
      const subStrand = new THREE.Mesh(
        buildTaperedHairStrand(subCurve, 0.012, 0.015, 0.0022, 1.55, 14, 8),
        hairMat
      );
      ponyContent.add(subStrand);
    }

    const hairBand = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.009, 8, 18), accentMat);
    hairBand.position.set(0, 0.008, 0.126);
    hairBand.rotation.x = 0.35;
    headGroup.add(hairBand, ponyTailPivot);
  }

  // Lifelike Recessed Human Eyes (Seated inside sculpted orbital sockets with spherical curved iris & blinking almond lids)
  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7f8fa,
    roughness: 0.08,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: irisTex,
    roughness: 0.10,
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lashMat = makeMat(isFemale ? '#1c100a' : '#2a180d', 0.52, 0.02);
  const eyelidSkinMat = makeMat(isFemale ? '#ce926e' : '#b4724c', 0.52, 0.0);

  const eyelids: THREE.Object3D[] = [];

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    // Classic human inter-pupillary spacing (~1 eye-width apart) recessed cleanly inside orbital sockets
    eyeGroup.position.set(side * 0.036, 0.008, -0.101);
    eyeGroup.rotation.y = side * -0.17;

    // Glossy eyeball sclera seated inside orbital socket
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.0152, 18, 14), scleraMat);
    sclera.scale.set(1.12, 0.80, 0.68);

    // Curved spherical iris/cornea dome facing -Z with exact centered radial iris UVs
    const irisRings = 8;
    const irisSegs = 22;
    const irisRad = 0.0155;
    const irisMaxPhi = 0.45;
    const irisPos: number[] = [];
    const irisUvs: number[] = [];
    const irisIdx: number[] = [];
    for (let r = 0; r <= irisRings; r++) {
      const phi = (r / irisRings) * irisMaxPhi;
      const ringR = Math.sin(phi) * irisRad;
      const z = -Math.cos(phi) * irisRad;
      const uvR = (phi / irisMaxPhi) * 0.49;
      for (let s = 0; s <= irisSegs; s++) {
        const ang = (s / irisSegs) * Math.PI * 2;
        irisPos.push(Math.cos(ang) * ringR, Math.sin(ang) * ringR, z);
        irisUvs.push(0.5 + Math.cos(ang) * uvR, 0.5 + Math.sin(ang) * uvR);
      }
    }
    const irisCols = irisSegs + 1;
    for (let r = 0; r < irisRings; r++) {
      for (let s = 0; s < irisSegs; s++) {
        const a = r * irisCols + s;
        const b = a + 1;
        const c = (r + 1) * irisCols + s;
        const d = c + 1;
        irisIdx.push(a, b, d, a, d, c);
      }
    }
    const irisDomeGeo = new THREE.BufferGeometry();
    irisDomeGeo.setAttribute('position', new THREE.Float32BufferAttribute(irisPos, 3));
    irisDomeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(irisUvs, 2));
    irisDomeGeo.setIndex(irisIdx);
    irisDomeGeo.computeVertexNormals();

    const irisCap = new THREE.Mesh(irisDomeGeo, irisMat);
    irisCap.scale.set(0.98, 0.98, 0.69);
    irisCap.position.set(0, 0.0002, 0);

    // Crisp dual specular catchlights
    const catchlightMain = new THREE.Mesh(new THREE.SphereGeometry(0.0020, 8, 6), highlightMat);
    catchlightMain.scale.set(1.0, 1.0, 0.4);
    catchlightMain.position.set(-0.0028, 0.0030, -0.0110);

    const catchlightSub = new THREE.Mesh(new THREE.SphereGeometry(0.0010, 6, 6), highlightMat);
    catchlightSub.scale.set(1.0, 1.0, 0.4);
    catchlightSub.position.set(0.0026, -0.0024, -0.0108);

    // Animated Almond Upper Eyelid Hood + Delicate Tapered Lash Line
    const upperLidPivot = new THREE.Group();
    upperLidPivot.position.set(0, 0.001, 0);
    const upperLidHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.0164, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.44),
      eyelidSkinMat
    );
    upperLidHood.scale.set(1.16, 0.84, 0.74);
    upperLidHood.rotation.x = -0.34;

    const lashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.0172, 0.0005, -0.0068),
      new THREE.Vector3(-0.0075, 0.0092, -0.0104),
      new THREE.Vector3(0.0075, 0.0092, -0.0104),
      new THREE.Vector3(0.0172, 0.0015, -0.0062),
    ]);
    const upperLash = new THREE.Mesh(
      buildTaperedHairStrand(lashCurve, 0.0011, isFemale ? 0.0019 : 0.0014, 0.0009, 1.2, 10, 6),
      lashMat
    );
    upperLidPivot.add(upperLidHood, upperLash);
    eyelids.push(upperLidPivot);

    // Subtle Lower Eyelid Margin
    const lowerLidCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.0155, -0.0035, -0.0065),
      new THREE.Vector3(0, -0.0088, -0.0096),
      new THREE.Vector3(0.0155, -0.0035, -0.0065),
    ]);
    const lowerLid = new THREE.Mesh(new THREE.TubeGeometry(lowerLidCurve, 10, 0.0014, 6, false), eyelidSkinMat);

    // Delicate Sculpted Tapered Eyebrow (complementing feathered brow on faceSkinTex)
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * -0.016, 0.0195, -0.0082),
      new THREE.Vector3(side * 0.003, 0.0242, -0.0108),
      new THREE.Vector3(side * 0.020, 0.0198, -0.0056),
    ]);
    const brow = new THREE.Mesh(
      buildTaperedHairStrand(browCurve, isFemale ? 0.0024 : 0.0034, isFemale ? 0.0022 : 0.0032, 0.0009, 1.4, 10, 6),
      hairMat
    );

    eyeGroup.add(sclera, irisCap, catchlightMain, catchlightSub, upperLidPivot, lowerLid, brow);
    headGroup.add(eyeGroup);
  }

  // Subtle Soft Sculpted Lip Relief aligned with v=0.660 (y ~ -0.064) blending with painterly lips
  const softLipMat = makeMat(isFemale ? '#c46a60' : '#a96858', 0.42, 0.0);
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.019, -0.0615, -0.100),
    new THREE.Vector3(-0.008, -0.0635, -0.109),
    new THREE.Vector3(0, -0.0628, -0.1105),
    new THREE.Vector3(0.008, -0.0635, -0.109),
    new THREE.Vector3(0.019, -0.0615, -0.100),
  ]);
  const upperLip = new THREE.Mesh(
    buildTaperedHairStrand(upperLipCurve, 0.0011, isFemale ? 0.0028 : 0.0023, 0.0011, 1.4, 12, 6),
    softLipMat
  );

  const lowerLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.0165, -0.0630, -0.101),
    new THREE.Vector3(-0.007, -0.0680, -0.1085),
    new THREE.Vector3(0, -0.0690, -0.110),
    new THREE.Vector3(0.007, -0.0680, -0.1085),
    new THREE.Vector3(0.0165, -0.0630, -0.101),
  ]);
  const lowerLip = new THREE.Mesh(
    buildTaperedHairStrand(lowerLipCurve, 0.0011, isFemale ? 0.0034 : 0.0028, 0.0011, 1.45, 12, 6),
    softLipMat
  );
  headGroup.add(upperLip, lowerLip);

  const hatGroup = buildHat(hatItem, colorDye);
  hatGroup.scale.setScalar(0.73);
  hatGroup.position.set(0, hatItem.id === 'hat_cowboy' ? 0.060 : 0.066, 0.002);
  headGroup.add(hatGroup);

  // -------------------------------------------------------------------------
  // 3. Optional Backpack / Wings on back (+Z)
  // -------------------------------------------------------------------------
  const { group: backpackGroup, wingLeft, wingRight } = buildBackpack(packItem, colorDye);
  backpackGroup.scale.setScalar(0.90);
  backpackGroup.position.set(0, 1.24, 0.14);
  chestContent.add(backpackGroup);

  // -------------------------------------------------------------------------
  // 4. Anatomically Proportioned Arms (Deltoid Caps, Elbow Caps & 5-Finger Human Hands)
  // -------------------------------------------------------------------------
  const armScale = isFemale ? 0.85 : 1.0;
  const shoulderX = isFemale ? 0.194 : 0.228;

  const makeArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 1.515, -0.006);

    // Seamless anatomical deltoid shoulder cap bridging arm cleanly into torso
    const deltoidCap = new THREE.Mesh(new THREE.SphereGeometry(0.062 * armScale, 16, 12), outfitPrimaryMat);
    deltoidCap.scale.set(0.96, 1.05, 1.04);
    deltoidCap.position.set(-side * 0.016, 0.002, 0);

    // Rolled short-sleeve shirt cuff (y = +0.05..-0.15)
    const sleeveGeo = buildSculptedLoftGeometry(12, 18, (t) => {
      const y = 0.05 - t * 0.20;
      const r =
        (t < 0.35
          ? THREE.MathUtils.lerp(0.058, 0.064, Math.sin((t / 0.35) * (Math.PI / 2)))
          : THREE.MathUtils.lerp(0.064, 0.054, (t - 0.35) / 0.65)) * armScale;
      const cuffBump = t > 0.86 ? 0.006 : 0;
      return { y, cx: -side * (0.014 * (1 - t)), cz: 0, rx: r + cuffBump, rz: (r + cuffBump) * 1.04 };
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, outfitPrimaryMat);

    // Bare sculpted bicep & tricep tapering to elbow (y = -0.11..-0.315)
    const bicepGeo = buildSculptedLoftGeometry(
      14,
      16,
      (t) => {
        const y = -0.11 - t * 0.205;
        const muscleSwell = Math.sin(t * Math.PI) * 0.0085;
        const r = (THREE.MathUtils.lerp(0.049, 0.037, t) + muscleSwell) * armScale;
        return { y, cx: 0, cz: 0, rx: r * 0.94, rz: r * 1.08 };
      },
      (t, theta, s) => {
        const cosT = Math.cos(theta); // +1 back tricep, -1 front bicep
        const bulge = Math.sin(t * Math.PI);
        const rz = s.rz + (cosT < 0 ? -cosT * bulge * 0.006 : cosT * bulge * 0.005) * armScale;
        return { rx: s.rx, rz };
      }
    );
    const bicepMesh = new THREE.Mesh(bicepGeo, skinMat);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.305, 0);

    // Seamless sculpted elbow joint cap (olecranon) so deep sprint flexion never kinks
    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.0375 * armScale, 12, 10), skinMat);
    elbowCap.scale.set(0.95, 1.02, 1.06);
    elbowCap.position.set(0, 0, 0.002);

    // Sculpted muscular forearm tapering smoothly to slender human wrist (y = +0.015..-0.265)
    const forearmGeo = buildSculptedLoftGeometry(14, 16, (t) => {
      const y = 0.015 - t * 0.280;
      const swell = Math.sin(Math.pow(t, 0.62) * Math.PI) * 0.011;
      const r = (THREE.MathUtils.lerp(0.038, 0.025, t) + swell) * armScale;
      return { y, cx: 0, cz: -0.004 * t, rx: r * 0.90, rz: r * 1.08 };
    });
    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);

    // Sleek fitted leather wrist bracer + explorer watch/cord
    const bracerGeo = buildSculptedLoftGeometry(6, 16, (t) => {
      const y = -0.165 - t * 0.078;
      const r = THREE.MathUtils.lerp(0.037, 0.030, t) * armScale;
      return { y, cx: 0, cz: -0.003, rx: r, rz: r * 1.10 };
    });
    const bracerMesh = new THREE.Mesh(bracerGeo, beltMat);

    const wristDetailGroup = new THREE.Group();
    for (const sy of [-0.180, -0.226]) {
      const strapRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.035 * armScale, 0.0036, 6, 14),
        beltMat
      );
      strapRing.rotation.x = Math.PI / 2;
      strapRing.position.set(0, sy, -0.003);
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0044, 6, 6), buckleMat);
      stud.position.set(side * 0.036 * armScale, sy, -0.003);
      wristDetailGroup.add(strapRing, stud);
    }
    if (side === -1) {
      const watchCase = new THREE.Mesh(new THREE.CylinderGeometry(0.017 * armScale, 0.017 * armScale, 0.009, 16), buckleMat);
      watchCase.rotation.z = Math.PI / 2;
      watchCase.position.set(-0.035 * armScale, -0.204, -0.006);
      const watchDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013 * armScale, 0.013 * armScale, 0.0105, 16),
        new THREE.MeshPhysicalMaterial({
          color: 0x0f291e,
          roughness: 0.1,
          metalness: 0.15,
          clearcoat: 1.0,
          emissive: 0x10b981,
          emissiveIntensity: 0.18,
        })
      );
      watchDial.rotation.z = Math.PI / 2;
      watchDial.position.set(-0.036 * armScale, -0.204, -0.006);
      wristDetailGroup.add(watchCase, watchDial);
    } else {
      const cordRing = new THREE.Mesh(new THREE.TorusGeometry(0.036 * armScale, 0.0046, 6, 14), accentMat);
      cordRing.rotation.x = Math.PI / 2 + 0.08;
      cordRing.position.set(0, -0.203, -0.003);
      wristDetailGroup.add(cordRing);
    }
    elbow.add(wristDetailGroup);

    // Articulated Realistic 5-Finger Human Hand (Trapezoidal Palm + Thenar Pad + 4 Graduated Fingers + Opposable Thumb)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.265, -0.005);

    const palmGeo = buildSculptedLoftGeometry(8, 14, (t) => {
      const y = -t * 0.074;
      // Flat anatomical palm (thin in X, wider front-to-back in Z) widening slightly toward knuckles
      const rx = THREE.MathUtils.lerp(0.018, 0.0145, t) * armScale;
      const rz = THREE.MathUtils.lerp(0.025, 0.034, Math.sin(t * Math.PI * 0.65)) * armScale;
      return { y, cx: -side * 0.003 * t, cz: -0.004 * t, rx, rz };
    });
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    handGroup.add(palmMesh);

    // Thenar (thumb-base) palm muscle pad
    const thenarPad = new THREE.Mesh(new THREE.SphereGeometry(0.015 * armScale, 8, 8), skinMat);
    thenarPad.scale.set(0.85, 1.35, 0.95);
    thenarPad.position.set(-side * 0.010 * armScale, -0.030, -0.018 * armScale);
    handGroup.add(thenarPad);

    // 4 Individual Graduated Sculpted Fingers (Index, Middle, Ring, Pinky) with natural athletic curl
    const fingerSpecs = [
      { zOff: -0.023, len1: 0.034, len2: 0.026, rad: 0.0066, curl1: 0.24, curl2: 0.42 }, // Index
      { zOff: -0.008, len1: 0.038, len2: 0.029, rad: 0.0068, curl1: 0.28, curl2: 0.48 }, // Middle
      { zOff: 0.008, len1: 0.035, len2: 0.026, rad: 0.0064, curl1: 0.34, curl2: 0.54 }, // Ring
      { zOff: 0.022, len1: 0.028, len2: 0.021, rad: 0.0056, curl1: 0.40, curl2: 0.60 }, // Pinky
    ];
    for (const f of fingerSpecs) {
      const fBase = new THREE.Group();
      fBase.position.set(-side * 0.003 * armScale, -0.070, f.zOff * armScale);
      // Natural inward curl toward palm (-side * Z rotation)
      fBase.rotation.z = -side * f.curl1;

      const seg1 = new THREE.Mesh(
        new THREE.CapsuleGeometry(f.rad * armScale, f.len1 * armScale, 4, 7),
        skinMat
      );
      seg1.position.y = -(f.len1 * 0.5) * armScale;
      fBase.add(seg1);

      const fMid = new THREE.Group();
      fMid.position.y = -f.len1 * armScale;
      fMid.rotation.z = -side * f.curl2;
      const seg2 = new THREE.Mesh(
        new THREE.CapsuleGeometry(f.rad * 0.84 * armScale, f.len2 * armScale, 4, 7),
        skinMat
      );
      seg2.position.y = -(f.len2 * 0.5) * armScale;
      fMid.add(seg2);

      fBase.add(fMid);
      handGroup.add(fBase);
    }

    // Opposable 2-Segment Articulated Human Thumb
    const thumbBase = new THREE.Group();
    thumbBase.position.set(-side * 0.012 * armScale, -0.032, -0.024 * armScale);
    thumbBase.rotation.set(0.46, side * 0.22, -side * 0.38);
    const thumbProx = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0078 * armScale, 0.026 * armScale, 5, 8),
      skinMat
    );
    thumbProx.position.y = -0.014 * armScale;
    const thumbDist = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0068 * armScale, 0.020 * armScale, 5, 8),
      skinMat
    );
    thumbDist.position.set(-side * 0.005 * armScale, -0.036 * armScale, -0.004 * armScale);
    thumbDist.rotation.z = -side * 0.32;
    thumbBase.add(thumbProx, thumbDist);
    handGroup.add(thumbBase);

    elbow.add(elbowCap, forearmMesh, bracerMesh, handGroup);
    shoulder.add(deltoidCap, sleeveMesh, bicepMesh, elbow);
    chestContent.add(shoulder);
    return { shoulder, elbow };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Pet Gray Langoor perched proudly on the explorer's right shoulder
  const langoorPet = buildLangoorModel(0.86, true);
  const petBaseY = isFemale ? 1.555 : 1.575;
  langoorPet.baseY = petBaseY;
  langoorPet.root.position.set(shoulderX * 0.85, petBaseY, 0.008);
  langoorPet.root.rotation.y = 0.08;
  langoorPet.root.visible = false;
  chestContent.add(langoorPet.root);

  // Mushroom Power-Up 3D Jungle Blaster attached to Right Hand
  const blasterGroup = new THREE.Group();
  blasterGroup.position.set(0, -0.305, -0.055);
  blasterGroup.rotation.x = -1.12;
  const gunBodyMat = makeMat('#b91c1c', 0.26, 0.55);
  const gunBarrelMat = makeMat('#eab308', 0.2, 0.85);
  const gunCoreMat = makeMat('#fef08a', 0.15, 0.25, '#f97316');
  const receiver = new THREE.Mesh(new THREE.CapsuleGeometry(0.050, 0.20, 8, 14), gunBodyMat);
  receiver.rotation.x = Math.PI / 2;
  receiver.position.z = -0.10;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.052, 0.22, 16), gunBarrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.014, -0.28);
  const muzzleOrb = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), gunCoreMat);
  muzzleOrb.position.set(0, 0.014, -0.41);
  blasterGroup.add(receiver, barrel, muzzleOrb);
  blasterGroup.visible = false;
  rightArm.elbow.add(blasterGroup);

  // -------------------------------------------------------------------------
  // 5. True-Length Athletic Human Legs (~50% Height), Seamless Kneecap, Calves & Sleek Boots
  // -------------------------------------------------------------------------
  const legOffset = isFemale ? 0.088 : 0.095;
  const legScale = isFemale ? 0.90 : 1.0;

  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group } => {
    const hip = new THREE.Group();
    // Hip joint at y=0.94 -> Knee at -0.455 (world 0.485) -> Ankle at -0.405 (world 0.080) -> Sole at -0.485 (world 0.000)
    hip.position.set(side * legOffset, 0.94, 0);

    // Sculpted Trousers / Denim Jeans / Cargo Shorts Upper Thigh (y = +0.03..-0.30)
    const shortsLegGeo = buildSculptedLoftGeometry(
      14,
      20,
      (t) => {
        const y = 0.03 - t * 0.33;
        const rx = THREE.MathUtils.lerp(0.086, isCowboyOutfit ? 0.066 : 0.072, t * 0.82) * legScale;
        const rz = THREE.MathUtils.lerp(0.095, isCowboyOutfit ? 0.070 : 0.076, t * 0.82) * legScale;
        return { y, cx: 0, cz: 0, rx, rz };
      },
      (t, theta, s) => {
        const fold = Math.sin(t * 24 + Math.cos(theta * 2)) * 0.0032;
        const cuff = !isCowboyOutfit && t > 0.88 ? 0.005 : 0;
        return { rx: s.rx + fold + cuff, rz: s.rz + fold + cuff };
      }
    );
    const shortsLegMesh = new THREE.Mesh(shortsLegGeo, outfitSecondaryMat);

    // Sculpted Quadriceps & Hamstring Lower Thigh tapering to knee (y = -0.27..-0.465)
    const lowerThighGeo = buildSculptedLoftGeometry(
      12,
      18,
      (t) => {
        const y = -0.27 - t * 0.195;
        const r = THREE.MathUtils.lerp(isCowboyOutfit ? 0.065 : 0.063, isCowboyOutfit ? 0.054 : 0.049, t) * legScale;
        return { y, cx: 0, cz: -0.004 * Math.sin(t * Math.PI), rx: r * 0.94, rz: r * 1.06 };
      },
      (t, theta, s) => {
        // Subtle front quadriceps tear-drop contour above kneecap
        const frontness = Math.max(0, -Math.cos(theta));
        const quad = Math.sin(t * Math.PI) * frontness * 0.0055 * legScale;
        return { rx: s.rx, rz: s.rz + quad };
      }
    );
    const lowerThighMesh = new THREE.Mesh(lowerThighGeo, isCowboyOutfit ? outfitSecondaryMat : skinMat);

    const knee = new THREE.Group();
    knee.position.set(0, -0.455, 0);

    // Seamless sculpted patella / knee joint cap so deep sprint knee flexion stays completely continuous
    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry((isCowboyOutfit ? 0.053 : 0.048) * legScale, 14, 12),
      isCowboyOutfit ? outfitSecondaryMat : skinMat
    );
    kneeCap.scale.set(0.94, 1.05, 1.04);
    kneeCap.position.set(0, 0, -0.003);

    // Sculpted Anatomical Calf (Gastrocnemius curve + slender Achilles taper) (y = +0.02..-0.35)
    const calfGeo = buildSculptedLoftGeometry(
      18,
      18,
      (t) => {
        const y = 0.02 - t * 0.37;
        // High athletic gastrocnemius peak around t ~ 0.32, tapering sleekly down to Achilles tendon
        const calfBell = Math.sin(Math.pow(t, 0.62) * Math.PI);
        const cz = calfBell * 0.017;
        const baseTop = isCowboyOutfit ? 0.053 : 0.047;
        const baseBot = isCowboyOutfit ? 0.042 : 0.032;
        const rx = (THREE.MathUtils.lerp(baseTop, baseBot, t) + calfBell * 0.011) * legScale;
        const rz = (THREE.MathUtils.lerp(baseTop + 0.003, baseBot + 0.002, t) + calfBell * 0.017) * legScale;
        return { y, cx: 0, cz, rx, rz };
      },
      (t, theta, s) => {
        // Subtle twin gastrocnemius heads on back of calf (+Z)
        const cosT = Math.cos(theta);
        if (cosT > 0.25 && t > 0.14 && t < 0.65) {
          const twin = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.0045 * Math.sin(((t - 0.14) / 0.51) * Math.PI);
          return { rx: s.rx, rz: s.rz + twin };
        }
        return { rx: s.rx, rz: s.rz };
      }
    );
    const calfMesh = new THREE.Mesh(calfGeo, isCowboyOutfit ? outfitSecondaryMat : skinMat);

    const isCowboyBoots = bootsItem.id === 'boots_cowboy';

    // Sleek Contoured Explorer / Cowboy Boot Shaft (y = -0.19..-0.425 cowboy, -0.25..-0.425 athletic trail boot)
    const bootTopY = isCowboyBoots ? -0.19 : -0.25;
    const bootShaftGeo = buildSculptedLoftGeometry(
      12,
      18,
      (t) => {
        const y = bootTopY - t * (-0.425 - bootTopY);
        const cuff = t < 0.16 ? Math.sin((t / 0.16) * Math.PI) * 0.007 : 0;
        const r = (THREE.MathUtils.lerp(0.050, 0.041, t * 0.65) + cuff) * legScale;
        return { y, cx: 0, cz: -0.004 * t, rx: r * 0.94, rz: r * 1.08 };
      },
      isCowboyBoots
        ? (t, theta, s) => {
            const sideDip = t < 0.25 ? Math.pow(Math.abs(Math.sin(theta)), 2) * 0.022 * (1 - t / 0.25) : 0;
            return { rx: s.rx, rz: s.rz, dy: -sideDip };
          }
        : undefined
    );
    const bootShaftMesh = new THREE.Mesh(bootShaftGeo, bootMainMat);

    // Human-Proportioned Sculpted Boot Foot (exact sole ground contact at y = -0.485 -> world 0.000)
    const bootFootGeo = buildSculptedLoftGeometry(
      12,
      20,
      (t) => {
        const y = -0.398 - t * 0.068;
        const cz = THREE.MathUtils.lerp(-0.012, isCowboyBoots ? -0.068 : -0.056, Math.pow(t, 0.72));
        const rx = THREE.MathUtils.lerp(0.040, isCowboyBoots ? 0.042 : 0.046, Math.sin(t * Math.PI * 0.65)) * legScale;
        const rz = THREE.MathUtils.lerp(0.054, isCowboyBoots ? 0.130 : 0.116, Math.pow(t, 0.7)) * legScale;
        return { y, cx: 0, cz, rx, rz };
      },
      isCowboyBoots
        ? (t, theta, s) => {
            const frontness = Math.max(0, -Math.cos(theta));
            const rx = frontness > 0.45 && t > 0.45 ? s.rx * (1 - frontness * 0.34 * ((t - 0.45) / 0.55)) : s.rx;
            return { rx, rz: s.rz };
          }
        : undefined
    );
    const bootFootMesh = new THREE.Mesh(bootFootGeo, bootMainMat);

    // Textured Contoured Boot Sole (bottom at -0.485 => 0.94 - 0.455 - 0.485 = 0.000 exact ground!)
    const soleGeo = buildSculptedLoftGeometry(4, 20, (t) => ({
      y: -0.464 - t * 0.021,
      cx: 0,
      cz: isCowboyBoots ? -0.066 : -0.056,
      rx: (isCowboyBoots ? 0.043 : 0.048) * legScale,
      rz: (isCowboyBoots ? 0.130 : 0.118) * legScale,
    }));
    const soleMesh = new THREE.Mesh(soleGeo, bootSoleMat);

    // Boot Ankle Strap, Brass Buckle & Reinforced Toe Cap
    const bootStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.045 * legScale, 0.0056, 6, 16),
      beltMat
    );
    bootStrap.rotation.x = Math.PI / 2;
    bootStrap.scale.set(0.98, 1.12, 1);
    bootStrap.position.set(0, -0.372, -0.005);

    const bootBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.0095, 0.0028, 6, 12), buckleMat);
    bootBuckle.rotation.y = Math.PI / 2;
    bootBuckle.position.set(side * 0.046 * legScale, -0.372, -0.007);

    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.039 * legScale, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      beltMat
    );
    toeCap.scale.set(0.95, 0.70, 1.30);
    toeCap.position.set(0, -0.444, isCowboyBoots ? -0.122 : -0.109);

    // Articulated Ankle Pivot for Realistic Heel-to-Toe Foot Placement & Push-Off
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.405, 0);
    const ankleContent = new THREE.Group();
    ankleContent.position.set(0, 0.405, 0);
    ankle.add(ankleContent);

    knee.add(kneeCap, calfMesh, bootShaftMesh, bootStrap, bootBuckle, ankle);
    ankleContent.add(bootFootMesh, soleMesh, toeCap);

    if (!isCowboyBoots) {
      for (let li = 0; li < 4; li++) {
        const laceBar = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0036, 0.039 * legScale, 4, 6),
          accentMat
        );
        laceBar.rotation.z = Math.PI / 2;
        laceBar.position.set(0, -0.285 - li * 0.029, -0.046 * legScale - li * 0.0035);
        knee.add(laceBar);
      }
    }

    if (isCowboyBoots) {
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * legScale, 0.031 * legScale, 0.026, 14), bootSoleMat);
      heel.position.set(0, -0.472, 0.024);
      const spurMat = makeMat(bootsItem.accentHex, 0.2, 0.9);
      const spurYoke = new THREE.Mesh(new THREE.TorusGeometry(0.038 * legScale, 0.006, 6, 14, Math.PI * 1.15), spurMat);
      spurYoke.rotation.x = Math.PI / 2;
      spurYoke.rotation.z = -Math.PI * 0.075;
      spurYoke.position.set(0, -0.440, 0.018);
      const rowel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.0045, 8), spurMat);
      rowel.rotation.z = Math.PI / 2;
      rowel.position.set(0, -0.440, 0.068);
      ankleContent.add(heel, spurYoke, rowel);
    }

    if (bootsItem.id === 'boots_hermes') {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.050, 10, 8), makeMat('#fef08a', 0.22, 0.5));
      wing.scale.set(0.32, 1.0, 1.3);
      wing.position.set(side * 0.068, -0.29, 0.026);
      wing.rotation.z = side * 0.35;
      knee.add(wing);
    }

    hip.add(shortsLegMesh, lowerThighMesh, knee);
    hipsContent.add(hip);
    return { hip, knee, ankle };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // -------------------------------------------------------------------------
  // 6. Power-Up Shield Bubble (hidden by default)
  // -------------------------------------------------------------------------
  const shieldGeo = new THREE.SphereGeometry(1.15, 22, 16);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    metalness: 0.3,
    depthWrite: false,
  });
  const shieldOrb = new THREE.Mesh(shieldGeo, shieldMat);
  shieldOrb.position.y = 1.02;
  shieldOrb.visible = false;
  root.add(shieldOrb);

  addShadow(bodyPivot);

  return {
    root,
    bodyPivot,
    hipsPivot,
    chestPivot,
    headGroup,
    leftArmPivot: leftArm.shoulder,
    rightArmPivot: rightArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightElbowPivot: rightArm.elbow,
    leftLegPivot: leftLeg.hip,
    rightLegPivot: rightLeg.hip,
    leftKneePivot: leftLeg.knee,
    rightKneePivot: rightLeg.knee,
    leftAnklePivot: leftLeg.ankle,
    rightAnklePivot: rightLeg.ankle,
    scarfTail,
    backpackGroup,
    hipSatchel: hipSatchelGroup,
    leftPouch: leftPouchGroup,
    ponyTailPivot,
    langoorPet,
    blasterGroup,
    eyelids,
    wingLeft,
    wingRight,
    shieldOrb,
    animState: {
      currentState: 'IDLE',
      prevState: 'IDLE',
      stateTime: 0,
      runPhase: 0,
      runBlend: 0,
      airBlend: 0,
      slideBlend: 0,
      turnYaw: 0,
      lastTime: -1,
      blinkNextTime: 2.2,
    },
    dispose: () => {
      createdTextures.forEach((tex) => tex.dispose());
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    },
  };
}

function updateEyeBlink(rig: CharacterRig, time: number) {
  const st = rig.animState;
  const blinkDur = 0.14;
  if (time > st.blinkNextTime + blinkDur) {
    st.blinkNextTime = time + 2.8 + ((Math.sin(time * 13.7) * 0.5 + 0.5) * 2.4);
  }
  const dtBlink = time - st.blinkNextTime;
  let blinkAmt = 0;
  if (dtBlink >= 0 && dtBlink <= blinkDur) {
    blinkAmt = Math.sin((dtBlink / blinkDur) * Math.PI);
  }
  for (let i = 0; i < rig.eyelids.length; i++) {
    rig.eyelids[i].rotation.x = blinkAmt * 0.72;
  }
}

export function animateCharacterRig(
  rig: CharacterRig,
  speedHoriz: number,
  velY: number,
  grounded: boolean,
  time: number,
  strafeVelX: number,
  isWardrobeIdle = false,
  hasBlaster = false,
  flipProgress = 0
) {
  rig.blasterGroup.visible = hasBlaster;
  const st = rig.animState;
  const dt = st.lastTime < 0 ? 0.016 : THREE.MathUtils.clamp(time - st.lastTime, 0, 0.05);
  st.lastTime = time;
  updateEyeBlink(rig, time);

  if (isWardrobeIdle) {
    st.runBlend = 0;
    st.airBlend = 0;
    st.turnYaw = 0;
    rig.root.rotation.y = 0;
    rig.bodyPivot.position.y = Math.sin(time * 2.2) * 0.022;
    rig.bodyPivot.rotation.set(0, Math.sin(time * 0.85) * 0.04, 0);
    rig.headGroup.rotation.set(
      Math.sin(time * 1.4) * 0.035,
      Math.sin(time * 0.9) * 0.095,
      Math.cos(time * 1.1) * 0.025
    );
    rig.leftArmPivot.rotation.set(Math.sin(time * 2.2) * 0.06, 0, -0.07);
    rig.rightArmPivot.rotation.set(-Math.sin(time * 2.2) * 0.06, 0, 0.07);
    rig.leftElbowPivot.rotation.x = 0.25;
    rig.rightElbowPivot.rotation.x = 0.25;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftKneePivot.rotation.x = 0;
    rig.rightKneePivot.rotation.x = 0;
    rig.scarfTail.rotation.x = -0.18 - Math.sin(time * 3) * 0.05;
    rig.scarfTail.rotation.z = 0;
    if (rig.wingLeft && rig.wingRight) {
      const flap = Math.sin(time * 3.5) * 0.14;
      rig.wingLeft.rotation.y = 0.25 + flap;
      rig.wingRight.rotation.y = -0.25 - flap;
    }
    return;
  }

  // Smoothly integrate gait phase proportional to real velocity (zero phase snapping)
  const targetRun =
    grounded && speedHoriz > 0.35
      ? THREE.MathUtils.clamp(speedHoriz / 10.5, 0.18, 1.0)
      : 0;
  st.runBlend = THREE.MathUtils.damp(st.runBlend, targetRun, 14, dt);
  st.airBlend = THREE.MathUtils.damp(st.airBlend, grounded ? 0 : 1, 16, dt);

  if (speedHoriz > 0.35 && grounded) {
    const strideFreq = 5.4 + speedHoriz * 0.88;
    st.runPhase = (st.runPhase + dt * strideFreq) % (Math.PI * 2);
  }

  const runB = st.runBlend;
  const airB = st.airBlend;
  const pL = st.runPhase;
  const pR = pL + Math.PI;

  // Natural neckerchief streaming backward (+Z) in slipstream
  const airSpeedFactor = Math.max(runB, airB * 0.65);
  rig.scarfTail.rotation.x = -0.16 - airSpeedFactor * 0.56 - Math.sin(time * 16) * 0.11;
  rig.scarfTail.rotation.z = Math.cos(time * 11) * (0.04 + airSpeedFactor * 0.08);

  // Idle pose (grounded, stationary)
  const breathe = Math.sin(time * 2.6);
  const idleBodyY = breathe * 0.018;
  const idleLeftArmX = breathe * 0.05;
  const idleRightArmX = -breathe * 0.05;

  // Biomechanical human sprint cycle (hips + backward-bending knees + torso twist)
  const evalKnee = (p: number) => {
    const swingBell = Math.pow(Math.max(0, -Math.sin(p - 0.22)), 1.35);
    const stanceFlex = Math.pow(Math.max(0, Math.sin(p + 0.35)), 1.2) * 0.28;
    return -(0.10 + swingBell * 1.34 + stanceFlex);
  };
  const evalHip = (p: number) =>
    (0.64 * Math.cos(p) - 0.06 * Math.sin(p)) * (0.52 + 0.48 * runB);

  const runLeftHip = evalHip(pL);
  const runRightHip = evalHip(pR);
  const runLeftKnee = evalKnee(pL);
  const runRightKnee = evalKnee(pR);

  const lArmSwing = -Math.cos(pL);
  const rArmSwing = -Math.cos(pR);
  const armAmp = 0.50 + 0.36 * runB;
  const runLeftArmX = lArmSwing * armAmp - 0.04;
  const runRightArmX = rArmSwing * armAmp - 0.04;
  const runLeftElbowX = 0.92 + Math.max(0, lArmSwing) * 0.56;
  const runRightElbowX = 0.92 + Math.max(0, rArmSwing) * 0.56;
  const runLeftArmZ = -0.11 - Math.max(0, -lArmSwing) * 0.05;
  const runRightArmZ = 0.11 + Math.max(0, -rArmSwing) * 0.05;
  const runLeftArmY = Math.max(0, lArmSwing) * 0.22;
  const runRightArmY = -Math.max(0, rArmSwing) * 0.22;

  const runBodyY = -Math.cos(2 * pL - 0.55) * 0.048 + 0.008;
  const runBodyRotX = -0.09 - 0.15 * runB + Math.cos(2 * pL) * 0.022;
  const runBodyRotY = -Math.cos(pL) * 0.09;
  const runHeadRotX = 0.07 + 0.13 * runB;
  const runHeadRotY = Math.cos(pL) * 0.06;

  // Blend Idle <-> Run for grounded state
  const gLeftHip = THREE.MathUtils.lerp(0, runLeftHip, runB);
  const gRightHip = THREE.MathUtils.lerp(0, runRightHip, runB);
  const gLeftKnee = THREE.MathUtils.lerp(-0.04, runLeftKnee, runB);
  const gRightKnee = THREE.MathUtils.lerp(-0.04, runRightKnee, runB);

  const gLeftArmX = THREE.MathUtils.lerp(idleLeftArmX, runLeftArmX, runB);
  const gRightArmX = THREE.MathUtils.lerp(idleRightArmX, runRightArmX, runB);
  const gLeftElbowX = THREE.MathUtils.lerp(0.28, runLeftElbowX, runB);
  const gRightElbowX = THREE.MathUtils.lerp(0.28, runRightElbowX, runB);
  const gLeftArmZ = THREE.MathUtils.lerp(-0.08, runLeftArmZ, runB);
  const gRightArmZ = THREE.MathUtils.lerp(0.08, runRightArmZ, runB);
  const gLeftArmY = THREE.MathUtils.lerp(0, runLeftArmY, runB);
  const gRightArmY = THREE.MathUtils.lerp(0, runRightArmY, runB);

  const gBodyY = THREE.MathUtils.lerp(idleBodyY, runBodyY, runB);
  const gBodyRotX = THREE.MathUtils.lerp(0, runBodyRotX, runB);
  const gBodyRotY = THREE.MathUtils.lerp(0, runBodyRotY, runB);
  const gHeadRotX = THREE.MathUtils.lerp(0, runHeadRotX, runB);
  const gHeadRotY = THREE.MathUtils.lerp(0, runHeadRotY, runB);

  // Airborne leap pose + tucked double-jump somersault (knees bend backward < 0!)
  const jumpPose = THREE.MathUtils.clamp(velY * 0.055, -0.45, 0.65);
  const tuck = flipProgress > 0 && flipProgress < 1 ? Math.sin(flipProgress * Math.PI) : 0;

  const aLeftHip = THREE.MathUtils.lerp(0.56 + jumpPose * 0.28, 1.25, tuck);
  const aRightHip = THREE.MathUtils.lerp(-0.46 - jumpPose * 0.22, 1.15, tuck);
  const aLeftKnee = THREE.MathUtils.lerp(-0.82, -1.78, tuck);
  const aRightKnee = THREE.MathUtils.lerp(-0.56, -1.78, tuck);
  const aLeftArmX = THREE.MathUtils.lerp(0.75 + jumpPose * 0.35, 0.95, tuck);
  const aRightArmX = THREE.MathUtils.lerp(-0.55 - jumpPose * 0.25, 0.95, tuck);
  const aLeftElbowX = THREE.MathUtils.lerp(0.72, 1.45, tuck);
  const aRightElbowX = THREE.MathUtils.lerp(0.72, 1.45, tuck);
  const aLeftArmZ = THREE.MathUtils.lerp(-0.30, -0.14, tuck);
  const aRightArmZ = THREE.MathUtils.lerp(0.30, 0.14, tuck);
  const aBodyRotX = THREE.MathUtils.lerp(-0.14, -0.32, tuck);

  // Blend Grounded <-> Airborne smoothly
  rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(gLeftHip, aLeftHip, airB);
  rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(gRightHip, aRightHip, airB);
  rig.leftKneePivot.rotation.x = THREE.MathUtils.lerp(gLeftKnee, aLeftKnee, airB);
  rig.rightKneePivot.rotation.x = THREE.MathUtils.lerp(gRightKnee, aRightKnee, airB);

  rig.leftArmPivot.rotation.x = THREE.MathUtils.lerp(gLeftArmX, aLeftArmX, airB);
  rig.leftElbowPivot.rotation.x = THREE.MathUtils.lerp(gLeftElbowX, aLeftElbowX, airB);
  rig.leftArmPivot.rotation.z = THREE.MathUtils.lerp(gLeftArmZ, aLeftArmZ, airB);
  rig.leftArmPivot.rotation.y = THREE.MathUtils.lerp(gLeftArmY, 0, airB);

  if (hasBlaster) {
    rig.rightArmPivot.rotation.set(0.48, 0, 0.08);
    rig.rightElbowPivot.rotation.x = 0.72;
  } else {
    rig.rightArmPivot.rotation.x = THREE.MathUtils.lerp(gRightArmX, aRightArmX, airB);
    rig.rightElbowPivot.rotation.x = THREE.MathUtils.lerp(gRightElbowX, aRightElbowX, airB);
    rig.rightArmPivot.rotation.z = THREE.MathUtils.lerp(gRightArmZ, aRightArmZ, airB);
    rig.rightArmPivot.rotation.y = THREE.MathUtils.lerp(gRightArmY, 0, airB);
  }

  rig.bodyPivot.position.y = THREE.MathUtils.lerp(gBodyY, 0.02, airB);
  rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(gBodyRotX, aBodyRotX, airB);
  rig.bodyPivot.rotation.y = THREE.MathUtils.lerp(gBodyRotY, 0, airB);

  rig.headGroup.rotation.x = THREE.MathUtils.lerp(gHeadRotX, 0.12, airB);
  rig.headGroup.rotation.y = THREE.MathUtils.lerp(gHeadRotY, 0, airB);

  // Natural lean & turn yaw into horizontal steering
  const targetBank = THREE.MathUtils.clamp(-strafeVelX * 0.036, -0.22, 0.22);
  rig.bodyPivot.rotation.z = THREE.MathUtils.damp(rig.bodyPivot.rotation.z, targetBank, 12, dt);

  const targetTurn = THREE.MathUtils.clamp(-strafeVelX * 0.042, -0.28, 0.28);
  st.turnYaw = THREE.MathUtils.damp(st.turnYaw, targetTurn, 12, dt);
  rig.root.rotation.y = st.turnYaw;

  if (rig.wingLeft && rig.wingRight) {
    const flapSpeed = grounded ? 4 : 11;
    const flapAmp = grounded ? 0.15 : 0.35;
    const flap = Math.sin(time * flapSpeed) * flapAmp;
    rig.wingLeft.rotation.y = 0.25 + flap;
    rig.wingRight.rotation.y = -0.25 - flap;
  }
}

export function animateCharacterCelebrate(
  rig: CharacterRig,
  finishElapsed: number,
  time: number
): number {
  rig.blasterGroup.visible = false;
  const st = rig.animState;
  st.lastTime = time;
  updateEyeBlink(rig, time);

  // Reset new spine/hip/ankle pivots cleanly for victory celebration
  rig.hipsPivot.rotation.set(0, 0, 0);
  rig.chestPivot.rotation.set(0, 0, 0);
  rig.bodyPivot.position.z = 0;

  // Phase 1 (0..0.45s): brisk victory trot into the temple sanctuary
  if (finishElapsed < 0.45) {
    const stride = finishElapsed * 11.5;
    const pL = stride;
    const pR = stride + Math.PI;
    rig.root.rotation.set(0, 0, 0);
    rig.bodyPivot.position.y = Math.abs(Math.sin(stride)) * 0.05;
    rig.bodyPivot.rotation.set(-0.1, 0, 0);
    rig.headGroup.rotation.set(0.08, 0, 0);
    rig.leftLegPivot.rotation.set(Math.cos(pL) * 0.55, 0, 0);
    rig.rightLegPivot.rotation.set(Math.cos(pR) * 0.55, 0, 0);
    rig.leftKneePivot.rotation.set(-0.25 - Math.max(0, -Math.sin(pL)) * 0.8, 0, 0);
    rig.rightKneePivot.rotation.set(-0.25 - Math.max(0, -Math.sin(pR)) * 0.8, 0, 0);
    rig.leftAnklePivot.rotation.set(Math.cos(pL) * 0.25, 0, 0);
    rig.rightAnklePivot.rotation.set(Math.cos(pR) * 0.25, 0, 0);
    rig.leftArmPivot.rotation.set(-Math.cos(pL) * 0.55, 0, -0.14);
    rig.rightArmPivot.rotation.set(-Math.cos(pR) * 0.55, 0, 0.14);
    rig.leftElbowPivot.rotation.set(0.95, 0, 0);
    rig.rightElbowPivot.rotation.set(0.95, 0, 0);
    rig.scarfTail.rotation.x = -0.45 - Math.sin(time * 14) * 0.08;
    return 0;
  }

  // Phase 2 (0.45..2.05s): turn to face camera, celebratory jump & double-arm fist pump!
  const turnT = THREE.MathUtils.smoothstep(finishElapsed, 0.45, 0.82);
  rig.root.rotation.set(0, turnT * Math.PI, 0);

  const celT = finishElapsed - 0.55;
  const hopWave = celT > 0 ? Math.max(0, Math.sin(celT * Math.PI * 2.15)) : 0;
  const hopHeight = hopWave * 0.62;

  const pump = Math.sin(finishElapsed * 9.5);
  rig.bodyPivot.position.y = hopWave * 0.04;
  rig.bodyPivot.rotation.set(0.05 + hopWave * 0.08, pump * 0.08, pump * 0.04);
  rig.headGroup.rotation.set(-0.08 - hopWave * 0.08, -pump * 0.06, 0);

  // Arms raised in triumphant V-pose with energetic cheer pumps
  rig.leftArmPivot.rotation.set(-2.35 + pump * 0.22, 0, -0.42 - hopWave * 0.16);
  rig.rightArmPivot.rotation.set(-2.35 - pump * 0.22, 0, 0.42 + hopWave * 0.16);
  rig.leftElbowPivot.rotation.set(0.35 + Math.max(0, -pump) * 0.28, 0, 0);
  rig.rightElbowPivot.rotation.set(0.35 + Math.max(0, pump) * 0.28, 0, 0);

  // Knees flex gracefully during takeoff & victory hop
  const legSpread = hopWave * 0.28;
  rig.leftLegPivot.rotation.set(legSpread, 0, 0);
  rig.rightLegPivot.rotation.set(-legSpread * 0.6, 0, 0);
  rig.leftKneePivot.rotation.set(-0.14 - hopWave * 0.58, 0, 0);
  rig.rightKneePivot.rotation.set(-0.14 - hopWave * 0.42, 0, 0);
  rig.leftAnklePivot.rotation.set(-hopWave * 0.25, 0, 0);
  rig.rightAnklePivot.rotation.set(-hopWave * 0.25, 0, 0);

  rig.scarfTail.rotation.x = -0.24 - hopWave * 0.32 - Math.sin(time * 12) * 0.08;
  rig.scarfTail.rotation.z = Math.cos(time * 9) * 0.07;

  if (rig.wingLeft && rig.wingRight) {
    const flap = Math.sin(time * 11) * 0.32;
    rig.wingLeft.rotation.y = 0.3 + flap;
    rig.wingRight.rotation.y = -0.3 - flap;
  }

  // Pet Langoor celebrates joyfully on explorer's right shoulder!
  if (rig.langoorPet.root.visible) {
    const petHop = Math.abs(Math.sin(finishElapsed * 10.5)) * 0.085;
    rig.langoorPet.root.position.y = rig.langoorPet.baseY + petHop;
    rig.langoorPet.root.rotation.set(0, 0.12 + pump * 0.12, 0);
    rig.langoorPet.headPivot.rotation.set(-0.12, Math.sin(finishElapsed * 8) * 0.25, 0);
    rig.langoorPet.leftArm.rotation.set(-2.2 + pump * 0.35, 0, -0.35);
    rig.langoorPet.rightArm.rotation.set(-2.2 - pump * 0.35, 0, 0.35);
    rig.langoorPet.tailPivot.rotation.set(0.18 + Math.sin(finishElapsed * 12) * 0.16, 0, Math.cos(finishElapsed * 9) * 0.24);
    rig.langoorPet.tailTipPivot.rotation.set(Math.sin(finishElapsed * 14 - 0.5) * 0.24, 0, Math.cos(finishElapsed * 10 - 0.6) * 0.34);
    rig.langoorPet.leftEar.rotation.set(0, 0, 0);
    rig.langoorPet.rightEar.rotation.set(0, 0, 0);
    for (const lid of rig.langoorPet.eyelids) {
      lid.scale.y = 0.08;
      lid.position.y = 0.026;
    }
  }

  return hopHeight;
}

