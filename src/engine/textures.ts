import * as THREE from 'three';
import { BiomeType } from '../types/game';

export interface ProceduralTextureSet {
  branchTextures: Record<BiomeType, THREE.CanvasTexture>;
  barkBumpTexture: THREE.CanvasTexture;
  stoneTexture: THREE.CanvasTexture;
  stoneBumpTexture: THREE.CanvasTexture;
  grassSlopeTexture: THREE.CanvasTexture;
  waterTexture: THREE.CanvasTexture;
  woodPlankTexture: THREE.CanvasTexture;
  iceTexture: THREE.CanvasTexture;
  mysteryBlockTexture: THREE.CanvasTexture;
  coinBoxTexture: THREE.CanvasTexture;
  checkerTexture: THREE.CanvasTexture;
  contactShadowTexture: THREE.CanvasTexture;
  boxTargetShadowTexture: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isData = false
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createTreeBranchTexture(
  barkBase: string,
  barkGroove: string,
  barkHighlight: string,
  mossCenter: string,
  mossEdge: string,
  leafScatterColor: string,
  anisotropy: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);

  // Deep realistic weathered bark base gradient
  const barkGrad = ctx.createLinearGradient(0, 0, 512, 0);
  barkGrad.addColorStop(0, barkGroove);
  barkGrad.addColorStop(0.22, barkBase);
  barkGrad.addColorStop(0.5, barkHighlight);
  barkGrad.addColorStop(0.78, barkBase);
  barkGrad.addColorStop(1, barkGroove);
  ctx.fillStyle = barkGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Fine fibrous bark crevices & sunlit ridges
  for (let i = 0; i < 90; i++) {
    const x = (i * 19) % 512;
    const w = 2 + (i % 6);
    ctx.fillStyle = i % 3 === 0 ? barkGroove : i % 3 === 1 ? 'rgba(0,0,0,0.22)' : 'rgba(255, 225, 185, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + ((i % 5) - 2) * 5, 170, x - ((i % 4) - 2) * 5, 340, x, 512);
    ctx.lineTo(x + w, 512);
    ctx.lineTo(x + w, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Natural bark knots & lichen spots
  for (let i = 0; i < 22; i++) {
    const kx = ((i * 97) % 460) + 26;
    const ky = ((i * 151) % 460) + 26;
    ctx.strokeStyle = barkGroove;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 9 + (i % 5), 22 + (i % 10), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Mossy walkable bough crest
  const grad = ctx.createLinearGradient(96, 0, 416, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.18, mossEdge);
  grad.addColorStop(0.5, mossCenter);
  grad.addColorStop(0.82, mossEdge);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(96, 0, 320, 512);

  // Temple Run 2 style scattered golden-amber fallen leaves & organic grit along top path
  for (let i = 0; i < 140; i++) {
    const lx = 136 + ((i * 79) % 240);
    const ly = (i * 131) % 512;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((i * 0.8) % Math.PI);
    ctx.fillStyle = i % 3 === 0 ? leafScatterColor : i % 3 === 1 ? 'rgba(20, 45, 18, 0.25)' : 'rgba(255, 240, 190, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 + (i % 4), 7 + (i % 5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return finalizeTexture(c, anisotropy, 1, 3);
}

function createBarkBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) {
    const x = (i * 17) % 512;
    const shade = i % 2 === 0 ? 45 + (i % 35) : 175 + (i % 50);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 3 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 7, 170, x - 7, 340, x, 512);
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 1, 3, true);
}

function createStoneTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#3d413a';
  ctx.fillRect(0, 0, 512, 512);

  // Ancient weathered temple stone blocks + mossy crevices
  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : 64;
    for (let col = -1; col < 5; col++) {
      const bx = col * 128 + offset + 3;
      const by = r * rowH + 3;
      const bw = 122;
      const bh = rowH - 6;
      const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      const tone = ((r * 7 + col * 13) & 15) - 7;
      g.addColorStop(0, `rgb(${112 + tone}, ${109 + tone}, ${96 + tone})`);
      g.addColorStop(1, `rgb(${78 + tone}, ${77 + tone}, ${68 + tone})`);
      ctx.fillStyle = g;
      ctx.fillRect(bx, by, bw, bh);

      // Subtle weathered cracks
      ctx.strokeStyle = 'rgba(20, 24, 18, 0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 18, by + bh * 0.4);
      ctx.lineTo(bx + 54, by + bh * 0.55);
      ctx.stroke();
    }
  }

  // Moss patches creeping into joints
  for (let i = 0; i < 65; i++) {
    const mx = (i * 89) % 512;
    const my = (i * 137) % 512;
    ctx.fillStyle = 'rgba(68, 108, 42, 0.34)';
    ctx.beginPath();
    ctx.arc(mx, my, 10 + (i % 16), 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(c, anisotropy, 2, 2);
}

function createStoneBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#303030';
  ctx.fillRect(0, 0, 512, 512);
  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : 64;
    for (let col = -1; col < 5; col++) {
      const bx = col * 128 + offset + 4;
      const by = r * rowH + 4;
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(bx, by, 120, rowH - 8);
    }
  }
  return finalizeTexture(c, anisotropy, 2, 2, true);
}

function createGrassSlopeTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#7c9a32');
  grad.addColorStop(0.45, '#4c7026');
  grad.addColorStop(1, '#363b2d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Lush directional grass & rocky cliff striations
  for (let i = 0; i < 380; i++) {
    const gx = (i * 47) % 512;
    const gy = (i * 71) % 512;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(182, 214, 72, 0.38)' : i % 3 === 1 ? 'rgba(42, 72, 24, 0.45)' : 'rgba(92, 82, 68, 0.3)';
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + ((i % 7) - 3) * 2, gy + 18 + (i % 14));
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 3, 6);
}

function createWaterTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#0c4347';
  ctx.fillRect(0, 0, 512, 512);

  // Shimmering emerald-teal Temple Run caustic ripples
  for (let i = 0; i < 85; i++) {
    const wx = (i * 73) % 512;
    const wy = (i * 113) % 512;
    const r = 24 + (i % 28);
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(72, 187, 178, 0.28)' : 'rgba(167, 243, 208, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(wx, wy, r * 1.4, r * 0.7, (i % 5) * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 16, 48);
}

function createWoodPlankTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#6b4124';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    const pGrad = ctx.createLinearGradient(0, y, 0, y + 60);
    pGrad.addColorStop(0, y % 128 === 0 ? '#915b34' : '#7f4d2b');
    pGrad.addColorStop(0.5, y % 128 === 0 ? '#7a4927' : '#6b3f21');
    pGrad.addColorStop(1, '#4c2a13');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, y + 2, 512, 58);

    ctx.fillStyle = '#291509';
    ctx.fillRect(0, y, 512, 3);

    ctx.strokeStyle = 'rgba(255, 224, 180, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 18);
    ctx.bezierCurveTo(170, y + 12, 340, y + 28, 512, y + 18);
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 1, 2);
}

function createIceTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#e0f2fe');
  grad.addColorStop(0.45, '#7dd3fc');
  grad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 73) % 512, 0);
    ctx.lineTo(((i * 73) % 512) + 90, 512);
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 1, 3);
}

function createMysteryBlockTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const bg = ctx.createRadialGradient(110, 96, 16, 128, 128, 175);
  bg.addColorStop(0, '#fde047');
  bg.addColorStop(0.55, '#f59e0b');
  bg.addColorStop(1, '#b45309');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);
  ctx.strokeStyle = 'rgba(254, 249, 195, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 224, 224);

  ctx.fillStyle = '#fef9c3';
  const bolts = [
    [32, 32],
    [224, 32],
    [32, 224],
    [224, 224],
  ];
  for (const [bx, by] of bolts) {
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#78350f';
  ctx.font = '900 162px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 134, 141);

  ctx.fillStyle = '#fffbeb';
  ctx.fillText('?', 127, 134);

  return finalizeTexture(c, anisotropy, 1, 1);
}

function createCoinBoxTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 64;
    for (let col = -1; col < 3; col++) {
      const bx = col * 128 + offset + 6;
      const by = row * 64 + 6;
      const bGrad = ctx.createLinearGradient(bx, by, bx, by + 52);
      bGrad.addColorStop(0, '#d97706');
      bGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, 116, 52, 8);
      ctx.fill();
    }
  }

  const cGrad = ctx.createRadialGradient(118, 114, 6, 128, 128, 46);
  cGrad.addColorStop(0, '#fef9c3');
  cGrad.addColorStop(0.6, '#facc15');
  cGrad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.ellipse(128, 128, 30, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#92400e';
  ctx.fillRect(122, 102, 12, 52);

  return finalizeTexture(c, anisotropy, 1, 1);
}

function createCheckerTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const s = 32;
  for (let y = 0; y < 256; y += s) {
    for (let x = 0; x < 256; x += s) {
      const dark = ((x + y) / s) % 2 === 0;
      ctx.fillStyle = dark ? '#18181b' : '#fafaf9';
      ctx.fillRect(x, y, s, s);
    }
  }
  return finalizeTexture(c, anisotropy, 3, 1);
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(6, 15, 10, 0.72)');
  grad.addColorStop(0.55, 'rgba(6, 15, 10, 0.34)');
  grad.addColorStop(1, 'rgba(6, 15, 10, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBoxTargetShadowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 118);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 76, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(
  renderer: THREE.WebGLRenderer
): ProceduralTextureSet {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  const branchTextures: Record<BiomeType, THREE.CanvasTexture> = {
    canopy: createTreeBranchTexture('#5e3b20', '#331d0d', '#734a2a', 'rgba(84, 134, 42, 0.88)', 'rgba(54, 92, 28, 0.55)', 'rgba(234, 179, 8, 0.58)', anisotropy),
    ruins: createTreeBranchTexture('#5b4a3a', '#30251b', '#725e49', 'rgba(112, 124, 52, 0.84)', 'rgba(72, 82, 34, 0.5)', 'rgba(217, 155, 38, 0.52)', anisotropy),
    waterfall: createTreeBranchTexture('#433830', '#231c18', '#58493f', 'rgba(42, 128, 108, 0.85)', 'rgba(26, 86, 74, 0.52)', 'rgba(163, 230, 53, 0.42)', anisotropy),
    volcano: createTreeBranchTexture('#332420', '#18100e', '#49332d', 'rgba(120, 56, 22, 0.82)', 'rgba(76, 32, 12, 0.5)', 'rgba(249, 115, 22, 0.45)', anisotropy),
  };

  const barkBumpTexture = createBarkBumpTexture(anisotropy);
  const stoneTexture = createStoneTexture(anisotropy);
  const stoneBumpTexture = createStoneBumpTexture(anisotropy);
  const grassSlopeTexture = createGrassSlopeTexture(anisotropy);
  const waterTexture = createWaterTexture(anisotropy);
  const woodPlankTexture = createWoodPlankTexture(anisotropy);
  const iceTexture = createIceTexture(anisotropy);
  const mysteryBlockTexture = createMysteryBlockTexture(anisotropy);
  const coinBoxTexture = createCoinBoxTexture(anisotropy);
  const checkerTexture = createCheckerTexture(anisotropy);
  const contactShadowTexture = createContactShadowTexture();
  const boxTargetShadowTexture = createBoxTargetShadowTexture();

  return {
    branchTextures,
    barkBumpTexture,
    stoneTexture,
    stoneBumpTexture,
    grassSlopeTexture,
    waterTexture,
    woodPlankTexture,
    iceTexture,
    mysteryBlockTexture,
    coinBoxTexture,
    checkerTexture,
    contactShadowTexture,
    boxTargetShadowTexture,
    dispose: () => {
      Object.values(branchTextures).forEach((t) => t.dispose());
      barkBumpTexture.dispose();
      stoneTexture.dispose();
      stoneBumpTexture.dispose();
      grassSlopeTexture.dispose();
      waterTexture.dispose();
      woodPlankTexture.dispose();
      iceTexture.dispose();
      mysteryBlockTexture.dispose();
      coinBoxTexture.dispose();
      checkerTexture.dispose();
      contactShadowTexture.dispose();
      boxTargetShadowTexture.dispose();
    },
  };
}
