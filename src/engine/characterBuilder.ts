import * as THREE from 'three';
import { getCosmeticById } from '../data/cosmetics';
import { CharacterCustomization, CosmeticItem } from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightKneePivot: THREE.Group;
  scarfTail: THREE.Object3D;
  backpackGroup: THREE.Group;
  blasterGroup: THREE.Group;
  wingLeft?: THREE.Mesh;
  wingRight?: THREE.Mesh;
  shieldOrb: THREE.Mesh;
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
  const size = 256;
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

  // Subtle woven linen/twill fibers
  for (let y = 0; y < size; y += 2) {
    const shade = (Math.sin(y * 0.7) * 5 + (Math.random() - 0.5) * 8) | 0;
    ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade / 255})` : `rgba(0,0,0,${-shade / 255})`;
    ctx.fillRect(0, y, size, 1);

    const bv = 128 + shade * 2;
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 2) {
    const shade = (Math.cos(x * 0.7) * 4 + (Math.random() - 0.5) * 6) | 0;
    ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade / 255})` : `rgba(0,0,0,${-shade / 255})`;
    ctx.fillRect(x, 0, 1, size);
  }

  if (withFoldShading) {
    // Organic cloth folds, subtle shoulder highlight & waist shadow gradient
    const vGrad = ctx.createLinearGradient(0, 0, 0, size);
    vGrad.addColorStop(0.0, 'rgba(255, 248, 232, 0.16)');
    vGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.02)');
    vGrad.addColorStop(0.85, 'rgba(25, 18, 10, 0.22)');
    vGrad.addColorStop(1.0, 'rgba(15, 10, 5, 0.28)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle draped diagonal crease folds across torso/back
    for (let i = 0; i < 14; i++) {
      const y = 35 + i * 16 + Math.random() * 6;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + 9, size * 0.66, y - 8, size, y + 3);
      ctx.stroke();

      bCtx.strokeStyle = i % 2 === 0 ? 'rgba(70,70,70,0.45)' : 'rgba(190,190,190,0.4)';
      bCtx.lineWidth = 3;
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.bezierCurveTo(size * 0.33, y + 9, size * 0.66, y - 8, size, y + 3);
      bCtx.stroke();
    }

    // Center stitched seam down back & front
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.5, size);
    ctx.stroke();
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

function makeSkinTexture(baseHex: string, trackTex: THREE.Texture[]): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  // Warm sun-kissed tone & natural subsurface gradient
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.45, 16, size * 0.5, size * 0.5, size * 0.72);
  grad.addColorStop(0, 'rgba(255, 224, 200, 0.14)');
  grad.addColorStop(0.65, 'rgba(210, 130, 90, 0.05)');
  grad.addColorStop(1, 'rgba(110, 58, 35, 0.16)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Micro skin pores / natural organic texture
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,235,215,0.06)' : 'rgba(90,42,20,0.06)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  trackTex.push(tex);
  return tex;
}

function makeLeatherTextures(
  baseHex: string,
  trackTex: THREE.Texture[]
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
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

  // Organic pebble leather grain + worn edge highlights
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 1.5 + Math.random() * 3.2;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,230,195,0.09)' : 'rgba(20,10,4,0.12)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();

    bCtx.fillStyle = i % 2 === 0 ? 'rgba(175,175,175,0.35)' : 'rgba(75,75,75,0.35)';
    bCtx.beginPath();
    bCtx.arc(x, y, rad, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Subtle boot/belt scuff & crease shading
  const wear = ctx.createLinearGradient(0, 0, 0, size);
  wear.addColorStop(0, 'rgba(255,240,210,0.12)');
  wear.addColorStop(0.5, 'rgba(0,0,0,0.0)');
  wear.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = wear;
  ctx.fillRect(0, 0, size, size);

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
  const size = 256;
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

  // Fine directional brushed hair strands
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const w = 1 + Math.random() * 2;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,220,170,0.16)' : 'rgba(18,8,4,0.22)';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 14, size * 0.5, x + (Math.random() - 0.5) * 10, size);
    ctx.stroke();

    bCtx.strokeStyle = i % 2 === 0 ? 'rgba(210,210,210,0.4)' : 'rgba(55,55,55,0.4)';
    bCtx.lineWidth = w;
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.quadraticCurveTo(x + (Math.random() - 0.5) * 12, size * 0.5, x, size);
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
  const latSteps = 26;
  const lonSteps = 30;
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

      let rx = isFemale ? 0.145 : 0.156;
      let ry = 0.185;
      let rz = 0.172;

      // Taper jaw and chin gracefully below cheekbone line (v > 0.56)
      if (v > 0.56) {
        const jawT = (v - 0.56) / 0.44;
        rx *= 1 - jawT * (isFemale ? 0.42 : 0.34);
        // Pull chin forward (-Z) and tuck under-jaw
        rz *= 1 - jawT * 0.25;
      }

      let x = Math.sin(theta) * sinP * rx;
      let y = cosP * ry;
      let z = Math.cos(theta) * sinP * rz;

      // Flatten slightly at temples, accentuate cheekbones & brow ridge on front (-Z)
      const frontness = Math.max(0, -Math.cos(theta));
      if (v > 0.32 && v < 0.50 && frontness > 0.55) {
        // Subtle brow ridge
        z -= frontness * 0.014 * Math.sin(((v - 0.32) / 0.18) * Math.PI);
      }
      if (v > 0.48 && v < 0.72 && Math.abs(Math.sin(theta)) > 0.45 && Math.cos(theta) < 0) {
        // Cheekbone contour
        const cheek = Math.sin(((v - 0.48) / 0.24) * Math.PI);
        x *= 1 + cheek * 0.06;
      }
      // Slight occipital fullness at back of skull (+Z)
      if (Math.cos(theta) > 0.3 && v > 0.28 && v < 0.65) {
        z += Math.cos(theta) * 0.015;
      }
      // Jaw chin projection (-Z) near v = 0.85..0.95
      if (v > 0.75 && frontness > 0.55) {
        z -= frontness * 0.022 * (1 - Math.abs(v - 0.86) * 4);
      }

      positions.push(x, y, z);
      uvs.push(u, v);
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

function buildSculptedHairShell(isFemale: boolean): THREE.BufferGeometry {
  const latSteps = 20;
  const lonSteps = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= latSteps; iy++) {
    const v = iy / latSteps; // 0 = top crown, 1 = hairline edge
    const phi = v * Math.PI * 0.68;
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);

    for (let ix = 0; ix <= lonSteps; ix++) {
      const u = ix / lonSteps;
      const theta = u * Math.PI * 2; // 0 = +Z back, PI = -Z front

      const backness = Math.max(0, Math.cos(theta)); // +Z back of head
      const frontness = Math.max(0, -Math.cos(theta)); // -Z forehead

      // Hair sits tighter on forehead/sides and extends further down the nape at the back (+Z)
      const effectivePhi = phi + backness * v * 0.42 - frontness * v * 0.28;
      const eSin = Math.sin(effectivePhi);
      const eCos = Math.cos(effectivePhi);

      const baseRx = (isFemale ? 0.155 : 0.165) * (1 + v * 0.03);
      const baseRy = 0.196;
      const baseRz = 0.184;

      // Sculpted organic hair wave / volume locks
      const strandWave =
        Math.sin(theta * 9 + v * 3.5) * 0.008 * Math.sin(v * Math.PI) +
        (frontness > 0.35 && v < 0.6 ? Math.sin(theta * 5) * 0.012 : 0);

      // Tapered V-hairline at back nape
      const napeCut = backness > 0.7 && v > 0.85 ? -0.015 * backness : 0;

      const x = Math.sin(theta) * eSin * (baseRx + strandWave);
      const y = eCos * baseRy + 0.008 + napeCut;
      const z = Math.cos(theta) * eSin * (baseRz + strandWave) + backness * 0.012;

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

function makeSkinMat(color: string, skinTex: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    map: skinTex,
    roughness: 0.52,
    metalness: 0.0,
    sheen: 0.45,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffcdb2'), 0.5),
    clearcoat: 0.06,
    clearcoatRoughness: 0.75,
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
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Realistic procedural character PBR textures
  const skinHex = isFemale ? '#e0a47e' : '#c6835a';
  const hairHex = isFemale ? '#4a2112' : '#7a3317';

  const skinTex = makeSkinTexture(skinHex, createdTextures);
  const shirtTex = makeFabricTextures(outfitItem.primaryHex, true, createdTextures);
  const shortsTex = makeFabricTextures(outfitItem.secondaryHex, true, createdTextures);
  const leatherTex = makeLeatherTextures('#422715', createdTextures);
  const bootTex = makeLeatherTextures(bootsItem.primaryHex, createdTextures);
  const hairTex = makeHairTextures(hairHex, createdTextures);

  const skinMat = makeSkinMat(skinHex, skinTex);
  const hairMat = makeMat(hairHex, 0.52, 0.04, undefined, hairTex.map, hairTex.bump, 0.03);
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
  // 1. Anatomically Sculpted V-Tapered Athletic Torso (with Spine Furrow & Cloth Folds)
  // -------------------------------------------------------------------------
  const shoulderW = isFemale ? 0.205 : 0.258;
  const waistW = isFemale ? 0.132 : 0.168;
  const hipW = isFemale ? 0.175 : 0.184;

  const torsoGeo = buildSculptedLoftGeometry(
    28,
    32,
    (t) => {
      // t = 0 (hips y=0.80) -> t = 1 (trapezius collar y=1.57)
      const y = 0.80 + t * 0.77;
      // Natural S-curve human spine posture
      const cz =
        Math.sin(t * Math.PI * 1.45) * -0.025 + // gentle lumbar curve forward + upper chest balance
        (t < 0.2 ? (0.2 - t) * 0.08 : 0); // subtle gluteal curve at base

      let rx: number;
      let rz: number;
      if (t < 0.34) {
        // Hip -> narrow athletic waist
        const k = t / 0.34;
        const smooth = k * k * (3 - 2 * k);
        rx = THREE.MathUtils.lerp(hipW, waistW, smooth);
        rz = THREE.MathUtils.lerp(0.125, 0.106, smooth);
      } else if (t < 0.84) {
        // Waist -> broad muscular ribcage / latissimus V-taper
        const k = (t - 0.34) / 0.5;
        const smooth = Math.sin((k * Math.PI) / 2);
        rx = THREE.MathUtils.lerp(waistW, shoulderW, smooth);
        rz = THREE.MathUtils.lerp(0.106, isFemale ? 0.132 : 0.148, smooth);
      } else {
        // Shoulders -> tapered trapezius collar opening
        const k = (t - 0.84) / 0.16;
        rx = THREE.MathUtils.lerp(shoulderW, isFemale ? 0.095 : 0.115, k * k);
        rz = THREE.MathUtils.lerp(isFemale ? 0.132 : 0.148, 0.092, k);
      }
      return { y, cx: 0, cz, rx, rz };
    },
    (t, theta, s) => {
      let rx = s.rx;
      let rz = s.rz;
      const cosT = Math.cos(theta); // +1 at back (+Z), -1 at front (-Z)
      const sinT = Math.sin(theta);

      // Rear spinal furrow & muscular shoulder-blade contours (+Z back)
      if (cosT > 0.1 && t > 0.25 && t < 0.9) {
        const spineIndent = Math.pow(cosT, 6) * 0.022 * Math.sin(((t - 0.25) / 0.65) * Math.PI);
        const scapulaeSwell = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.018 * Math.max(0, t - 0.45);
        rz += scapulaeSwell - spineIndent;
      }

      // Front pectoral chest definition (-Z front)
      if (cosT < -0.15 && t > 0.56 && t < 0.88) {
        const chest = Math.sin(((t - 0.56) / 0.32) * Math.PI);
        const pecSwell = (isFemale ? 0.032 : 0.022) * Math.pow(Math.abs(sinT), 0.5) * (-cosT);
        rz += chest * pecSwell;
      }

      // Natural tucked cloth creases near waist (t ~ 0.22..0.46)
      if (t > 0.18 && t < 0.52) {
        const crease = Math.sin(t * 38 + sinT * 2.5) * 0.0055 * Math.sin(((t - 0.18) / 0.34) * Math.PI);
        rx += crease;
        rz += crease;
      }

      // Shirt hem tuck flare above belt
      if (t > 0.16 && t < 0.23) {
        const tuck = Math.sin(((t - 0.16) / 0.07) * Math.PI) * 0.012;
        rx += tuck;
        rz += tuck;
      }

      return { rx, rz };
    }
  );
  const torsoMesh = new THREE.Mesh(torsoGeo, outfitPrimaryMat);
  bodyPivot.add(torsoMesh);

  // Tailored Western Leather Cowboy Vest over the shirt (clearly visible from back & front!)
  if (isCowboyOutfit) {
    const vestTex = makeLeatherTextures(outfitItem.accentHex, createdTextures);
    const vestMat = makeMat(outfitItem.accentHex, 0.56, 0.1, undefined, vestTex.map, vestTex.bump, 0.035);
    const vestGeo = buildSculptedLoftGeometry(
      18,
      28,
      (t) => {
        const y = 0.94 + t * 0.57; // spans tTorso ~ 0.18 .. 0.92
        const tTorso = (y - 0.80) / 0.77;
        const cz =
          Math.sin(tTorso * Math.PI * 1.45) * -0.025 +
          (tTorso < 0.2 ? (0.2 - tTorso) * 0.08 : 0);

        let baseRx: number;
        let baseRz: number;
        if (tTorso < 0.34) {
          const k = tTorso / 0.34;
          const smooth = k * k * (3 - 2 * k);
          baseRx = THREE.MathUtils.lerp(hipW, waistW, smooth);
          baseRz = THREE.MathUtils.lerp(0.125, 0.106, smooth);
        } else if (tTorso < 0.84) {
          const k = (tTorso - 0.34) / 0.5;
          const smooth = Math.sin((k * Math.PI) / 2);
          baseRx = THREE.MathUtils.lerp(waistW, shoulderW, smooth);
          baseRz = THREE.MathUtils.lerp(0.106, isFemale ? 0.132 : 0.148, smooth);
        } else {
          const k = (tTorso - 0.84) / 0.16;
          baseRx = THREE.MathUtils.lerp(shoulderW, isFemale ? 0.095 : 0.115, k * k);
          baseRz = THREE.MathUtils.lerp(isFemale ? 0.132 : 0.148, 0.092, k);
        }

        // Sit cleanly outside the western shirt while tapering slightly inward at armholes
        const armholeInset = t > 0.65 ? (t - 0.65) * 0.05 : 0;
        return {
          y,
          cx: 0,
          cz,
          rx: baseRx + 0.013 - armholeInset,
          rz: baseRz + 0.015,
        };
      },
      (t, theta, s) => {
        // Taper front V-opening slightly so western shirt peeks down center front
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        let rz = s.rz;
        if (cosT > 0.1 && t > 0.1) {
          const scapulaeSwell = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.016 * Math.max(0, t - 0.35);
          rz += scapulaeSwell;
        }
        if (cosT < -0.15 && t > 0.45 && t < 0.88) {
          const chest = Math.sin(((t - 0.45) / 0.43) * Math.PI);
          rz += chest * (isFemale ? 0.032 : 0.022) * Math.pow(Math.abs(sinT), 0.5) * (-cosT);
        }
        if (cosT < -0.78 && t > 0.45) {
          rz -= (-cosT) * 0.014 * ((t - 0.45) / 0.55);
        }
        return { rx: s.rx, rz };
      }
    );
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    bodyPivot.add(vestMesh);

    // Brass cowboy vest snap buttons down the front
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), buckleMat);
      btn.position.set(0, 1.04 + b * 0.11, -(isFemale ? 0.156 : 0.172));
      bodyPivot.add(btn);
    }
  }

  // Open Collar Skin V-Patch + Turned-down Shirt Collar Lip
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 10, 22), outfitPrimaryMat);
  collarRing.rotation.x = Math.PI / 2 + 0.18;
  collarRing.scale.set(1.06, 0.9, 1);
  collarRing.position.set(0, 1.545, -0.015);
  bodyPivot.add(collarRing);

  // Classic Cowboy Bandana Neckerchief (wrapped around collar + triangular back drape)
  const bandanaCollar = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.021, 10, 22), accentMat);
  bandanaCollar.rotation.x = Math.PI / 2 + 0.14;
  bandanaCollar.position.set(0, 1.53, 0.0);
  bodyPivot.add(bandanaCollar);

  const scarfTail = new THREE.Mesh(
    isCowboyOutfit
      ? buildSculptedLoftGeometry(8, 12, (t) => ({
          y: -t * 0.22,
          cx: 0,
          cz: t * 0.045,
          rx: THREE.MathUtils.lerp(0.088, 0.008, t),
          rz: THREE.MathUtils.lerp(0.018, 0.005, t),
        }))
      : buildSculptedLoftGeometry(8, 10, (t) => ({
          y: -t * 0.18,
          cx: t * 0.025,
          cz: t * 0.055,
          rx: THREE.MathUtils.lerp(0.028, 0.012, t),
          rz: THREE.MathUtils.lerp(0.014, 0.006, t),
        })),
    accentMat
  );
  scarfTail.position.set(isCowboyOutfit ? 0 : 0.02, 1.52, isCowboyOutfit ? 0.105 : 0.095);
  bodyPivot.add(scarfTail);

  // Sculpted Trousers / Denim Pelvis with Gluteal Curve
  const pelvisGeo = buildSculptedLoftGeometry(
    14,
    26,
    (t) => {
      const y = 0.72 + t * 0.20;
      const cz = t < 0.6 ? 0.015 * Math.sin((t / 0.6) * Math.PI) : 0;
      const rx = THREE.MathUtils.lerp(hipW * 1.04, waistW * 1.06, t * 0.7);
      const rz = THREE.MathUtils.lerp(0.136, 0.115, t * 0.6);
      return { y, cx: 0, cz, rx, rz };
    },
    (t, theta, s) => {
      const cosT = Math.cos(theta);
      let rz = s.rz;
      if (cosT > 0.2 && t < 0.75) {
        const glute = Math.pow(Math.sin(theta * 2), 2) * cosT * 0.024 * Math.sin((t / 0.75) * Math.PI);
        const crease = Math.pow(cosT, 8) * 0.012;
        rz += glute - crease;
      }
      return { rx: s.rx, rz };
    }
  );
  const pelvisMesh = new THREE.Mesh(pelvisGeo, outfitSecondaryMat);
  bodyPivot.add(pelvisMesh);

  // Western Gunbelt + Big Rodeo Gold Buckle + Revolver Holster (or Explorer Satchel)
  const beltGeo = buildSculptedLoftGeometry(4, 24, (t) => ({
    y: 0.89 + t * 0.065,
    cx: 0,
    cz: 0.004,
    rx: waistW * 1.09,
    rz: 0.122,
  }));
  const beltMesh = new THREE.Mesh(beltGeo, beltMat);
  if (isCowboyOutfit) {
    beltMesh.rotation.z = -0.055; // Slung western gunbelt angle
  }
  bodyPivot.add(beltMesh);

  const buckle = new THREE.Mesh(
    new THREE.TorusGeometry(isCowboyOutfit ? 0.044 : 0.032, 0.01, 8, 16),
    buckleMat
  );
  buckle.scale.set(1.22, 0.88, 0.8);
  buckle.position.set(0, 0.915, -0.122);
  bodyPivot.add(buckle);

  const hipSatchelGroup = new THREE.Group();
  hipSatchelGroup.position.set(hipW * 0.98, 0.83, 0.04);
  hipSatchelGroup.rotation.z = -0.08;
  hipSatchelGroup.rotation.y = 0.22;
  if (isCowboyOutfit) {
    // Sculpted Leather Western Revolver Holster + Walnut Grip
    const holsterBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.026, 0.19, 14), beltMat);
    holsterBody.scale.set(0.75, 1.0, 1.15);
    holsterBody.rotation.x = 0.22;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 6, 14), beltMat);
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.06;
    const revGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.055, 6, 10), makeMat('#3b1c0c', 0.42, 0.15));
    revGrip.position.set(0, 0.11, 0.025);
    revGrip.rotation.x = -0.55;
    hipSatchelGroup.add(holsterBody, strap, revGrip);
  } else {
    const pouchBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.06, 8, 14), beltMat);
    pouchBody.scale.set(0.65, 1.0, 1.15);
    const pouchFlap = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      beltMat
    );
    pouchFlap.scale.set(0.68, 0.7, 1.18);
    pouchFlap.position.y = 0.035;
    const pouchSnap = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), buckleMat);
    pouchSnap.position.set(0.038, 0.01, 0.01);
    hipSatchelGroup.add(pouchBody, pouchFlap, pouchSnap);
  }
  bodyPivot.add(hipSatchelGroup);

  if (isFemale && !isCowboyOutfit) {
    const skirtGeo = buildSculptedLoftGeometry(10, 24, (t) => ({
      y: 0.67 + t * 0.20,
      cx: 0,
      cz: 0.008 * (1 - t),
      rx: THREE.MathUtils.lerp(0.225, 0.155, t),
      rz: THREE.MathUtils.lerp(0.165, 0.125, t),
    }));
    bodyPivot.add(new THREE.Mesh(skirtGeo, outfitSecondaryMat));
  }

  // -------------------------------------------------------------------------
  // 2. Sculpted Muscular Neck, Anatomically Contoured Head & Layered Hair
  // -------------------------------------------------------------------------
  const neckGeo = buildSculptedLoftGeometry(10, 18, (t) => ({
    y: 1.50 + t * 0.18,
    cx: 0,
    cz: -0.015 * t,
    rx: THREE.MathUtils.lerp(isFemale ? 0.072 : 0.086, isFemale ? 0.056 : 0.066, t),
    rz: THREE.MathUtils.lerp(0.078, 0.064, t),
  }));
  bodyPivot.add(new THREE.Mesh(neckGeo, skinMat));

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.77, -0.02);
  bodyPivot.add(headGroup);

  const headMesh = new THREE.Mesh(buildSculptedHeadGeometry(isFemale), skinMat);
  headGroup.add(headMesh);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), skinMat);
    ear.scale.set(0.45, 1.05, 0.72);
    ear.position.set(side * (isFemale ? 0.142 : 0.152), -0.01, 0.012);
    ear.rotation.y = side * 0.2;
    headGroup.add(ear);
  }

  const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.035, 6, 10), skinMat);
  noseBridge.position.set(0, -0.005, -0.162);
  noseBridge.rotation.x = -0.25;
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), skinMat);
  noseTip.scale.set(1.0, 0.85, 1.15);
  noseTip.position.set(0, -0.025, -0.172);
  headGroup.add(noseBridge, noseTip);

  // Sculpted Hair Shell + Textured Layered Locks (tucked cleanly under hats)
  const hairShell = new THREE.Mesh(buildSculptedHairShell(isFemale), hairMat);
  if (hasHat) {
    hairShell.scale.set(0.95, 0.78, 0.95);
    hairShell.position.y = -0.015;
  }
  headGroup.add(hairShell);

  if (!hasHat) {
    for (let i = -2; i <= 2; i++) {
      const lockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(i * 0.045, 0.125 - Math.abs(i) * 0.015, -0.115 + Math.abs(i) * 0.02),
        new THREE.Vector3(i * 0.055, 0.185 - Math.abs(i) * 0.02, 0.01),
        new THREE.Vector3(i * 0.048, 0.105 - Math.abs(i) * 0.015, 0.165),
        new THREE.Vector3(i * 0.035, -0.05, 0.172),
      ]);
      const lockGeo = new THREE.TubeGeometry(lockCurve, 12, 0.026 - Math.abs(i) * 0.003, 8, false);
      headGroup.add(new THREE.Mesh(lockGeo, hairMat));
    }
  } else {
    // Low nape hair locks peeking smoothly below hat brim at the back (+Z)
    for (let i = -1; i <= 1; i++) {
      const napeLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.075, 6, 8), hairMat);
      napeLock.position.set(i * 0.045, -0.04, 0.165);
      napeLock.rotation.x = 0.25;
      headGroup.add(napeLock);
    }
  }

  if (isFemale) {
    // Sleek sculpted curved ponytail flowing cleanly beneath hat brim (+Z)
    const ponyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.015, 0.165),
      new THREE.Vector3(0, -0.015, 0.245),
      new THREE.Vector3(0, -0.15, 0.275),
      new THREE.Vector3(0, -0.29, 0.245),
    ]);
    const ponyTail = new THREE.Mesh(new THREE.TubeGeometry(ponyCurve, 16, 0.042, 10, false), hairMat);
    const ponyTip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.09, 10), hairMat);
    ponyTip.position.set(0, -0.33, 0.235);
    ponyTip.rotation.x = Math.PI - 0.18;
    const hairBand = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.013, 8, 16), accentMat);
    hairBand.position.set(0, 0.012, 0.178);
    hairBand.rotation.x = 0.35;
    headGroup.add(ponyTail, ponyTip, hairBand);
  }

  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.14, clearcoat: 0.85 });
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: isFemale ? 0x15803d : 0x1d4ed8,
    roughness: 0.2,
    clearcoat: 0.85,
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const lipsMat = makeMat(isFemale ? '#b96b5e' : '#9c6252', 0.45, 0.02);

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.055, 0.022, -0.146);
    eyeGroup.rotation.y = side * -0.16;

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), scleraMat);
    sclera.scale.set(1.15, 0.72, 0.45);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 10, 8), irisMat);
    iris.scale.set(1.0, 1.0, 0.45);
    iris.position.set(0, 0, -0.008);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), pupilMat);
    pupil.position.set(0, 0, -0.013);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.036, 4, 8), hairMat);
    brow.rotation.z = Math.PI / 2 + side * -0.08;
    brow.position.set(0, 0.032, -0.006);

    eyeGroup.add(sclera, iris, pupil, brow);
    headGroup.add(eyeGroup);
  }

  const lips = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.032, 4, 8), lipsMat);
  lips.rotation.z = Math.PI / 2;
  lips.scale.set(1, 1, 0.65);
  lips.position.set(0, -0.078, -0.148);
  headGroup.add(lips);

  const hatGroup = buildHat(hatItem, colorDye);
  hatGroup.position.y = hatItem.id === 'hat_cowboy' ? 0.084 : 0.095;
  headGroup.add(hatGroup);

  // -------------------------------------------------------------------------
  // 3. Optional Backpack / Wings on back (+Z)
  // -------------------------------------------------------------------------
  const { group: backpackGroup, wingLeft, wingRight } = buildBackpack(packItem, colorDye);
  backpackGroup.position.set(0, 1.18, 0.16);
  bodyPivot.add(backpackGroup);

  // -------------------------------------------------------------------------
  // 4. Anatomically Sculpted Arms, Rolled Short Sleeves, Leather Bracers & Hands
  // -------------------------------------------------------------------------
  const armScale = isFemale ? 0.86 : 1.0;
  const shoulderX = isFemale ? 0.228 : 0.285;

  const makeArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 1.48, -0.005);

    // Rolled short-sleeve shirt cuff (t = 0..1 -> y = +0.04..-0.14)
    const sleeveGeo = buildSculptedLoftGeometry(12, 18, (t) => {
      const y = 0.04 - t * 0.18;
      const r =
        (t < 0.35
          ? THREE.MathUtils.lerp(0.068, 0.074, Math.sin((t / 0.35) * (Math.PI / 2)))
          : THREE.MathUtils.lerp(0.074, 0.064, (t - 0.35) / 0.65)) * armScale;
      const cuffBump = t > 0.86 ? 0.008 : 0;
      return { y, cx: side * (0.015 * (1 - t)), cz: 0, rx: r + cuffBump, rz: (r + cuffBump) * 1.04 };
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, outfitPrimaryMat);

    // Bare sculpted bicep & tricep tapering to elbow (y = -0.11..-0.30)
    const bicepGeo = buildSculptedLoftGeometry(12, 16, (t) => {
      const y = -0.11 - t * 0.19;
      const muscleSwell = Math.sin(t * Math.PI) * 0.009;
      const r = (THREE.MathUtils.lerp(0.056, 0.044, t) + muscleSwell) * armScale;
      return { y, cx: 0, cz: 0, rx: r, rz: r * 1.06 };
    });
    const bicepMesh = new THREE.Mesh(bicepGeo, skinMat);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.295, 0);

    // Sculpted muscular forearm tapering smoothly to wrist (y = +0.02..-0.245)
    const forearmGeo = buildSculptedLoftGeometry(14, 16, (t) => {
      const y = 0.02 - t * 0.265;
      // Forearm brachioradialis bulge at upper 30%, slimming cleanly to wrist
      const swell = Math.sin(Math.pow(t, 0.65) * Math.PI) * 0.012;
      const r = (THREE.MathUtils.lerp(0.044, 0.030, t) + swell) * armScale;
      return { y, cx: 0, cz: -0.005 * t, rx: r * 0.94, rz: r * 1.06 };
    });
    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);

    // Sculpted Leather Wrist Bracer (y = -0.145..-0.225)
    const bracerGeo = buildSculptedLoftGeometry(6, 16, (t) => {
      const y = -0.145 - t * 0.08;
      const r = THREE.MathUtils.lerp(0.044, 0.036, t) * armScale;
      return { y, cx: 0, cz: -0.004, rx: r, rz: r * 1.08 };
    });
    const bracerMesh = new THREE.Mesh(bracerGeo, beltMat);

    // Anatomical Sculpted Hand (palm + fingers taper + angled thumb, NOT a ball!)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.245, -0.006);
    const palmGeo = buildSculptedLoftGeometry(8, 14, (t) => {
      const y = -t * 0.075;
      const rx = THREE.MathUtils.lerp(0.026, 0.020, t) * armScale;
      const rz = THREE.MathUtils.lerp(0.032, 0.026, t) * armScale;
      return { y, cx: 0, cz: -Math.sin(t * 1.6) * 0.008, rx, rz };
    });
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012 * armScale, 0.026, 6, 8), skinMat);
    thumb.position.set(-side * 0.016, -0.028, -0.025);
    thumb.rotation.x = 0.55;
    thumb.rotation.z = side * 0.35;
    handGroup.add(palmMesh, thumb);

    elbow.add(forearmMesh, bracerMesh, handGroup);
    shoulder.add(sleeveMesh, bicepMesh, elbow);
    bodyPivot.add(shoulder);
    return { shoulder, elbow };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Mushroom Power-Up 3D Jungle Blaster attached to Right Hand
  const blasterGroup = new THREE.Group();
  blasterGroup.position.set(0, -0.28, -0.05);
  blasterGroup.rotation.x = -1.12;
  const gunBodyMat = makeMat('#b91c1c', 0.26, 0.55);
  const gunBarrelMat = makeMat('#eab308', 0.2, 0.85);
  const gunCoreMat = makeMat('#fef08a', 0.15, 0.25, '#f97316');
  const receiver = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 14), gunBodyMat);
  receiver.rotation.x = Math.PI / 2;
  receiver.position.z = -0.11;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.058, 0.24, 16), gunBarrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.31);
  const muzzleOrb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), gunCoreMat);
  muzzleOrb.position.set(0, 0.015, -0.45);
  blasterGroup.add(receiver, barrel, muzzleOrb);
  blasterGroup.visible = false;
  rightArm.elbow.add(blasterGroup);

  // -------------------------------------------------------------------------
  // 5. Anatomically Sculpted Thighs (Cargo Shorts), Calves & Contoured Boots
  // -------------------------------------------------------------------------
  const legOffset = isFemale ? 0.102 : 0.116;
  const legScale = isFemale ? 0.90 : 1.0;

  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * legOffset, 0.78, 0);

    // Sculpted Trousers / Denim Jeans / Cargo Shorts Thigh (y = 0.02..-0.26)
    const shortsLegGeo = buildSculptedLoftGeometry(
      14,
      20,
      (t) => {
        const y = 0.02 - t * 0.28;
        const rx = THREE.MathUtils.lerp(0.098, isCowboyOutfit ? 0.074 : 0.080, t * 0.8) * legScale;
        const rz = THREE.MathUtils.lerp(0.106, isCowboyOutfit ? 0.078 : 0.084, t * 0.8) * legScale;
        return { y, cx: 0, cz: 0, rx, rz };
      },
      (t, theta, s) => {
        const fold = Math.sin(t * 24 + Math.cos(theta * 2)) * 0.004;
        const cuff = !isCowboyOutfit && t > 0.88 ? 0.006 : 0;
        return { rx: s.rx + fold + cuff, rz: s.rz + fold + cuff };
      }
    );
    const shortsLegMesh = new THREE.Mesh(shortsLegGeo, outfitSecondaryMat);

    // Lower Thigh (Denim Jeans for Cowboy, bare skin for shorts) (y = -0.23..-0.38)
    const lowerThighGeo = buildSculptedLoftGeometry(10, 18, (t) => {
      const y = -0.23 - t * 0.15;
      const r = THREE.MathUtils.lerp(isCowboyOutfit ? 0.072 : 0.070, isCowboyOutfit ? 0.062 : 0.056, t) * legScale;
      return { y, cx: 0, cz: 0, rx: r * 0.96, rz: r * 1.04 };
    });
    const lowerThighMesh = new THREE.Mesh(lowerThighGeo, isCowboyOutfit ? outfitSecondaryMat : skinMat);

    const knee = new THREE.Group();
    knee.position.set(0, -0.37, 0);

    // Calf (Denim Jeans tucked into Cowboy Boot, or bare calf for shorts) (y = +0.02..-0.24)
    const calfGeo = buildSculptedLoftGeometry(16, 18, (t) => {
      const y = 0.02 - t * 0.26;
      const calfBell = Math.sin(Math.pow(t, 0.72) * Math.PI);
      const cz = calfBell * 0.016;
      const baseTop = isCowboyOutfit ? 0.060 : 0.054;
      const baseBot = isCowboyOutfit ? 0.048 : 0.039;
      const rx = (THREE.MathUtils.lerp(baseTop, baseBot, t) + calfBell * 0.011) * legScale;
      const rz = (THREE.MathUtils.lerp(baseTop + 0.004, baseBot + 0.003, t) + calfBell * 0.018) * legScale;
      return { y, cx: 0, cz, rx, rz };
    });
    const calfMesh = new THREE.Mesh(calfGeo, isCowboyOutfit ? outfitSecondaryMat : skinMat);

    const isCowboyBoots = bootsItem.id === 'boots_cowboy';

    // Tall Sculpted Explorer / Cowboy Boot Shaft (y = -0.14..-0.36 for cowboy, -0.17..-0.36 standard)
    const bootTopY = isCowboyBoots ? -0.13 : -0.17;
    const bootShaftGeo = buildSculptedLoftGeometry(
      12,
      18,
      (t) => {
        const y = bootTopY - t * (-0.36 - bootTopY);
        const cuff = t < 0.16 ? Math.sin((t / 0.16) * Math.PI) * 0.009 : 0;
        const r = (THREE.MathUtils.lerp(0.059, 0.048, t * 0.65) + cuff) * legScale;
        return { y, cx: 0, cz: -0.005 * t, rx: r * 0.95, rz: r * 1.08 };
      },
      isCowboyBoots
        ? (t, theta, s) => {
            // Classic scalloped western cowboy boot collar dip on left/right sides
            const sideDip = t < 0.25 ? Math.pow(Math.abs(Math.sin(theta)), 2) * 0.024 * (1 - t / 0.25) : 0;
            return { rx: s.rx, rz: s.rz, dy: -sideDip };
          }
        : undefined
    );
    const bootShaftMesh = new THREE.Mesh(bootShaftGeo, bootMainMat);

    // Sculpted Contoured Boot Foot (Pointed Cowboy Toe when wearing cowboy boots)
    const bootFootGeo = buildSculptedLoftGeometry(
      12,
      20,
      (t) => {
        const y = -0.335 - t * 0.068;
        const cz = THREE.MathUtils.lerp(-0.015, isCowboyBoots ? -0.072 : -0.058, Math.pow(t, 0.72));
        const rx = THREE.MathUtils.lerp(0.046, isCowboyBoots ? 0.048 : 0.054, Math.sin(t * Math.PI * 0.65)) * legScale;
        const rz = THREE.MathUtils.lerp(0.062, isCowboyBoots ? 0.142 : 0.125, Math.pow(t, 0.7)) * legScale;
        return { y, cx: 0, cz, rx, rz };
      },
      isCowboyBoots
        ? (t, theta, s) => {
            // Taper toe tip (-Z front) into sleek cowboy boot silhouette
            const frontness = Math.max(0, -Math.cos(theta));
            const rx = frontness > 0.45 && t > 0.45 ? s.rx * (1 - frontness * 0.34 * ((t - 0.45) / 0.55)) : s.rx;
            return { rx, rz: s.rz };
          }
        : undefined
    );
    const bootFootMesh = new THREE.Mesh(bootFootGeo, bootMainMat);

    // Textured Contoured Boot Sole (plus Stacked Cowboy Heel & Metallic Spur!)
    const soleGeo = buildSculptedLoftGeometry(4, 20, (t) => ({
      y: -0.398 - t * (isCowboyBoots ? 0.018 : 0.022),
      cx: 0,
      cz: isCowboyBoots ? -0.070 : -0.058,
      rx: (isCowboyBoots ? 0.050 : 0.056) * legScale,
      rz: (isCowboyBoots ? 0.142 : 0.128) * legScale,
    }));
    const soleMesh = new THREE.Mesh(soleGeo, bootSoleMat);

    knee.add(calfMesh, bootShaftMesh, bootFootMesh, soleMesh);

    if (isCowboyBoots) {
      // Stacked angled cowboy heel
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.040 * legScale, 0.036 * legScale, 0.032, 14), bootSoleMat);
      heel.position.set(0, -0.415, 0.026);
      // Metallic brass spur yoke + rowel wheel at back of heel (+Z)
      const spurMat = makeMat(bootsItem.accentHex, 0.2, 0.9);
      const spurYoke = new THREE.Mesh(new THREE.TorusGeometry(0.044 * legScale, 0.007, 6, 14, Math.PI * 1.15), spurMat);
      spurYoke.rotation.x = Math.PI / 2;
      spurYoke.rotation.z = -Math.PI * 0.075;
      spurYoke.position.set(0, -0.375, 0.02);
      const rowel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 8), spurMat);
      rowel.rotation.z = Math.PI / 2;
      rowel.position.set(0, -0.375, 0.076);
      knee.add(heel, spurYoke, rowel);
    }

    if (bootsItem.id === 'boots_hermes') {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), makeMat('#fef08a', 0.22, 0.5));
      wing.scale.set(0.32, 1.0, 1.3);
      wing.position.set(side * 0.08, -0.22, 0.03);
      wing.rotation.z = side * 0.35;
      knee.add(wing);
    }

    hip.add(shortsLegMesh, lowerThighMesh, knee);
    bodyPivot.add(hip);
    return { hip, knee };
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
    headGroup,
    leftArmPivot: leftArm.shoulder,
    rightArmPivot: rightArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightElbowPivot: rightArm.elbow,
    leftLegPivot: leftLeg.hip,
    rightLegPivot: rightLeg.hip,
    leftKneePivot: leftLeg.knee,
    rightKneePivot: rightLeg.knee,
    scarfTail,
    backpackGroup,
    blasterGroup,
    wingLeft,
    wingRight,
    shieldOrb,
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

export function animateCharacterRig(
  rig: CharacterRig,
  speedHoriz: number,
  velY: number,
  grounded: boolean,
  time: number,
  strafeVelX: number,
  isWardrobeIdle = false,
  hasBlaster = false
) {
  rig.blasterGroup.visible = hasBlaster;

  if (isWardrobeIdle) {
    rig.bodyPivot.position.y = Math.sin(time * 2.2) * 0.025;
    rig.bodyPivot.rotation.set(0, 0, 0);
    rig.leftArmPivot.rotation.x = Math.sin(time * 2.2) * 0.06;
    rig.rightArmPivot.rotation.x = -Math.sin(time * 2.2) * 0.06;
    rig.leftArmPivot.rotation.z = -0.06;
    rig.rightArmPivot.rotation.z = 0.06;
    rig.leftElbowPivot.rotation.x = 0.25;
    rig.rightElbowPivot.rotation.x = 0.25;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftKneePivot.rotation.x = 0;
    rig.rightKneePivot.rotation.x = 0;
    rig.scarfTail.rotation.x = 0.2 + Math.sin(time * 3) * 0.06;
    if (rig.wingLeft && rig.wingRight) {
      const flap = Math.sin(time * 3.5) * 0.14;
      rig.wingLeft.rotation.y = 0.25 + flap;
      rig.wingRight.rotation.y = -0.25 - flap;
    }
    return;
  }

  const normalizedRun = Math.min(1, speedHoriz / 10.0);
  const stridePhase = time * (7.2 + normalizedRun * 12.2);

  // Subtle neckerchief wind flutter
  rig.scarfTail.rotation.x = 0.18 + normalizedRun * 0.42 + Math.sin(time * 16) * 0.12;
  rig.scarfTail.rotation.z = Math.cos(time * 12) * 0.10;

  // Natural athletic shoulder splay so arms clear hips
  rig.leftArmPivot.rotation.z = -0.08;
  rig.rightArmPivot.rotation.z = 0.08;

  if (grounded) {
    if (speedHoriz > 0.4) {
      // Athletic forward-leaning Temple Run sprint with pumping elbows & bending knees!
      const swing = Math.sin(stridePhase) * (0.34 + normalizedRun * 0.72);
      rig.leftLegPivot.rotation.x = swing;
      rig.rightLegPivot.rotation.x = -swing;
      rig.leftKneePivot.rotation.x = Math.max(0, -Math.cos(stridePhase)) * 0.98 * normalizedRun;
      rig.rightKneePivot.rotation.x = Math.max(0, Math.cos(stridePhase)) * 0.98 * normalizedRun;

      rig.leftArmPivot.rotation.x = -swing * 0.95;
      rig.leftElbowPivot.rotation.x = 1.08;

      if (hasBlaster) {
        rig.rightArmPivot.rotation.x = 0.48;
        rig.rightElbowPivot.rotation.x = 0.72;
      } else {
        rig.rightArmPivot.rotation.x = swing * 0.95;
        rig.rightElbowPivot.rotation.x = 1.08;
      }

      rig.bodyPivot.position.y = Math.abs(Math.cos(stridePhase)) * 0.055 * normalizedRun;
      rig.bodyPivot.rotation.x = -0.12 - normalizedRun * 0.15;
    } else {
      const breathe = Math.sin(time * 2.6);
      rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, 0, 0.2);
      rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, 0, 0.2);
      rig.leftKneePivot.rotation.x = THREE.MathUtils.lerp(rig.leftKneePivot.rotation.x, 0, 0.2);
      rig.rightKneePivot.rotation.x = THREE.MathUtils.lerp(rig.rightKneePivot.rotation.x, 0, 0.2);
      rig.leftArmPivot.rotation.x = breathe * 0.05;
      rig.leftElbowPivot.rotation.x = 0.28;
      if (hasBlaster) {
        rig.rightArmPivot.rotation.x = 0.42;
        rig.rightElbowPivot.rotation.x = 0.75;
      } else {
        rig.rightArmPivot.rotation.x = -breathe * 0.05;
        rig.rightElbowPivot.rotation.x = 0.28;
      }
      rig.bodyPivot.position.y = breathe * 0.02;
      rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(rig.bodyPivot.rotation.x, 0, 0.2);
    }
  } else {
    // Airborne athletic Temple Run leap pose (matching reference leap silhouette)
    const jumpPose = THREE.MathUtils.clamp(velY * 0.06, -0.5, 0.7);
    rig.leftLegPivot.rotation.x = 0.55 + jumpPose * 0.35;
    rig.rightLegPivot.rotation.x = -0.55 - jumpPose * 0.25;
    rig.leftKneePivot.rotation.x = 0.78;
    rig.rightKneePivot.rotation.x = 0.48;
    rig.leftArmPivot.rotation.x = -0.95 - jumpPose * 0.4;
    rig.leftElbowPivot.rotation.x = 0.72;
    rig.leftArmPivot.rotation.z = -0.32;
    if (hasBlaster) {
      rig.rightArmPivot.rotation.x = 0.52;
      rig.rightElbowPivot.rotation.x = 0.7;
    } else {
      rig.rightArmPivot.rotation.x = -0.75 - jumpPose * 0.4;
      rig.rightElbowPivot.rotation.x = 0.72;
      rig.rightArmPivot.rotation.z = 0.32;
    }
    rig.bodyPivot.rotation.x = -0.15;
  }

  const targetBank = THREE.MathUtils.clamp(-strafeVelX * 0.04, -0.25, 0.25);
  rig.bodyPivot.rotation.z = THREE.MathUtils.lerp(rig.bodyPivot.rotation.z, targetBank, 0.18);

  if (rig.wingLeft && rig.wingRight) {
    const flapSpeed = grounded ? 4 : 11;
    const flapAmp = grounded ? 0.15 : 0.35;
    const flap = Math.sin(time * flapSpeed) * flapAmp;
    rig.wingLeft.rotation.y = 0.25 + flap;
    rig.wingRight.rotation.y = -0.25 - flap;
  }
}
