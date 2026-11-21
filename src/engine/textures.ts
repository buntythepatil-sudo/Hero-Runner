import * as THREE from 'three';
import { BiomeType } from '../types/game';

export interface ProceduralTextureSet {
  branchTextures: Record<BiomeType, THREE.CanvasTexture>;
  barkBumpTexture: THREE.CanvasTexture;
  foliageLeafTexture: THREE.CanvasTexture;
  foliageBumpTexture: THREE.CanvasTexture;
  canopyLeafClusterTexture: THREE.CanvasTexture;
  palmFrondTexture: THREE.CanvasTexture;
  stoneTexture: THREE.CanvasTexture;
  stoneBumpTexture: THREE.CanvasTexture;
  grassSlopeTexture: THREE.CanvasTexture;
  waterTexture: THREE.CanvasTexture;
  woodPlankTexture: THREE.CanvasTexture;
  iceTexture: THREE.CanvasTexture;
  mysteryBlockTexture: THREE.CanvasTexture;
  coinBoxTexture: THREE.CanvasTexture;
  extraLifeCoinBoxTexture: THREE.CanvasTexture;
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
  const size = 768;
  const [c, ctx] = makeCanvas(size, size);

  // Deep realistic weathered bark base gradient
  const barkGrad = ctx.createLinearGradient(0, 0, size, 0);
  barkGrad.addColorStop(0, barkGroove);
  barkGrad.addColorStop(0.2, barkBase);
  barkGrad.addColorStop(0.5, barkHighlight);
  barkGrad.addColorStop(0.8, barkBase);
  barkGrad.addColorStop(1, barkGroove);
  ctx.fillStyle = barkGrad;
  ctx.fillRect(0, 0, size, size);

  // Fine fibrous bark crevices, ridges & sunlit bark plates
  for (let i = 0; i < 150; i++) {
    const x = (i * 23) % size;
    const w = 2 + (i % 7);
    ctx.fillStyle =
      i % 4 === 0
        ? barkGroove
        : i % 4 === 1
        ? 'rgba(0,0,0,0.24)'
        : i % 4 === 2
        ? 'rgba(255, 228, 188, 0.12)'
        : 'rgba(54, 88, 34, 0.14)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + ((i % 5) - 2) * 7,
      size * 0.33,
      x - ((i % 4) - 2) * 7,
      size * 0.67,
      x,
      size
    );
    ctx.lineTo(x + w, size);
    ctx.lineTo(x + w, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Natural bark knots, horizontal lenticels & pale lichen flecks
  for (let i = 0; i < 34; i++) {
    const kx = ((i * 113) % (size - 60)) + 30;
    const ky = ((i * 179) % (size - 60)) + 30;
    ctx.strokeStyle = barkGroove;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 10 + (i % 6), 24 + (i % 12), 0, 0, Math.PI * 2);
    ctx.stroke();

    if (i % 3 === 0) {
      ctx.fillStyle = 'rgba(176, 204, 148, 0.16)';
      ctx.beginPath();
      ctx.ellipse(kx + 8, ky - 6, 8 + (i % 7), 5 + (i % 5), (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mossy walkable bough crest with feathery organic edges
  const grad = ctx.createLinearGradient(size * 0.18, 0, size * 0.82, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.18, mossEdge);
  grad.addColorStop(0.5, mossCenter);
  grad.addColorStop(0.82, mossEdge);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(size * 0.18, 0, size * 0.64, size);

  // Fine velvety moss tufts along walkable top path
  for (let i = 0; i < 240; i++) {
    const mx = size * 0.24 + ((i * 83) % Math.round(size * 0.52));
    const my = (i * 127) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(132, 188, 66, 0.18)' : 'rgba(26, 60, 22, 0.22)';
    ctx.beginPath();
    ctx.arc(mx, my, 4 + (i % 9), 0, Math.PI * 2);
    ctx.fill();
  }

  // Scattered golden-amber fallen leaves & organic forest floor grit along top path
  for (let i = 0; i < 190; i++) {
    const lx = size * 0.26 + ((i * 97) % Math.round(size * 0.48));
    const ly = (i * 151) % size;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((i * 0.85) % Math.PI);
    ctx.fillStyle =
      i % 3 === 0
        ? leafScatterColor
        : i % 3 === 1
        ? 'rgba(20, 45, 18, 0.28)'
        : 'rgba(255, 240, 190, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 + (i % 4), 8 + (i % 6), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return finalizeTexture(c, anisotropy, 1, 3);
}

function createBarkBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 768;
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i++) {
    const x = (i * 19) % size;
    const shade = i % 2 === 0 ? 36 + (i % 38) : 178 + (i % 56);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 2.5 + (i % 5);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 9, size * 0.33, x - 9, size * 0.67, x, size);
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 1, 3, true);
}

function createFoliageLeafTextures(
  anisotropy: number
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  const [b, bCtx] = makeCanvas(size, size);

  // Neutral-bright botanical base so instance tinting multiplies cleanly into rich greens
  ctx.fillStyle = '#c8d8b8';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, size, size);

  // Layered overlapping tropical palm/canopy leaves with sunlit highlights & deep inner shadows
  for (let i = 0; i < 340; i++) {
    const lx = (i * 73) % size;
    const ly = (i * 137) % size;
    const ang = ((i * 47) % 360) * (Math.PI / 180);
    const rx = 10 + (i % 14);
    const ry = 22 + (i % 24);
    const shadeRoll = i % 5;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.fillStyle =
      shadeRoll === 0
        ? 'rgba(246, 255, 224, 0.72)'
        : shadeRoll === 1
        ? 'rgba(182, 224, 152, 0.75)'
        : shadeRoll === 2
        ? 'rgba(116, 168, 96, 0.72)'
        : shadeRoll === 3
        ? 'rgba(72, 118, 62, 0.68)'
        : 'rgba(218, 242, 170, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Central leaf midrib vein
    ctx.strokeStyle = shadeRoll < 2 ? 'rgba(255, 255, 230, 0.42)' : 'rgba(42, 74, 34, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.85);
    ctx.lineTo(0, ry * 0.85);
    ctx.stroke();
    ctx.restore();

    bCtx.save();
    bCtx.translate(lx, ly);
    bCtx.rotate(ang);
    const bv = shadeRoll < 2 ? 215 : shadeRoll === 3 ? 65 : 150;
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.65)`;
    bCtx.beginPath();
    bCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }

  return {
    map: finalizeTexture(c, anisotropy, 2, 2),
    bump: finalizeTexture(b, anisotropy, 2, 2, true),
  };
}

/**
 * Photorealistic alpha-cutout tropical canopy leaf spray (28 overlapping pointed jungle leaves
 * radiating from organic woody twigs with detailed midribs, lateral veins & sunlit highlights).
 */
function createCanopyLeafClusterTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.52;

  // Dark woody branching twigs radiating from cluster center
  ctx.lineCap = 'round';
  for (let b = 0; b < 7; b++) {
    const ang = (b / 7) * Math.PI * 2 + 0.28;
    const len = 105 + (b % 3) * 32;
    ctx.strokeStyle = b % 2 === 0 ? '#3f2814' : '#4f3319';
    ctx.lineWidth = 7 - (b % 2) * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(ang + 0.25) * len * 0.55,
      cy + Math.sin(ang + 0.25) * len * 0.55,
      cx + Math.cos(ang) * len,
      cy + Math.sin(ang) * len
    );
    ctx.stroke();
  }

  // Draw 32 layered pointed botanical rainforest leaves (back shade layer -> mid -> sunlit top)
  const leafCount = 32;
  for (let i = 0; i < leafCount; i++) {
    const ring = i < 12 ? 0 : i < 24 ? 1 : 2;
    const ang =
      (i / (ring === 0 ? 12 : ring === 1 ? 12 : 8)) * Math.PI * 2 +
      ring * 0.42 +
      Math.sin(i * 3.7) * 0.14;
    const radialDist =
      ring === 0 ? 112 + (i % 3) * 18 : ring === 1 ? 74 + (i % 4) * 14 : 26 + (i % 3) * 16;
    const lx = cx + Math.cos(ang) * radialDist;
    const ly = cy + Math.sin(ang) * radialDist;
    const leafLen = ring === 0 ? 92 + (i % 4) * 12 : ring === 1 ? 82 + (i % 3) * 10 : 68 + (i % 3) * 10;
    const leafW = leafLen * (0.34 + (i % 3) * 0.045);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang + Math.PI * 0.5);

    // Rich chlorophyll gradient per leaf (deep shaded base to bright sunlit apex)
    const g = ctx.createLinearGradient(0, leafLen * 0.55, 0, -leafLen * 0.55);
    if (ring === 0) {
      g.addColorStop(0, '#4f6f46');
      g.addColorStop(0.55, '#729e58');
      g.addColorStop(1, '#98c46c');
    } else if (ring === 1) {
      g.addColorStop(0, '#688e52');
      g.addColorStop(0.5, '#96c268');
      g.addColorStop(1, '#c8e688');
    } else {
      g.addColorStop(0, '#88b45c');
      g.addColorStop(0.5, '#bce07c');
      g.addColorStop(1, '#e8f7a6');
    }

    // Crisp tapered lanceolate tropical leaf silhouette
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, leafLen * 0.52);
    ctx.bezierCurveTo(leafW, leafLen * 0.25, leafW * 0.92, -leafLen * 0.22, 0, -leafLen * 0.56);
    ctx.bezierCurveTo(-leafW * 0.92, -leafLen * 0.22, -leafW, leafLen * 0.25, 0, leafLen * 0.52);
    ctx.closePath();
    ctx.fill();

    // Subtle dark leaf rim for crisp botanical separation
    ctx.strokeStyle = 'rgba(28, 48, 22, 0.36)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Central sunlit midrib vein
    ctx.strokeStyle = ring === 2 ? 'rgba(248, 255, 210, 0.72)' : 'rgba(210, 238, 165, 0.52)';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(0, leafLen * 0.48);
    ctx.lineTo(0, -leafLen * 0.48);
    ctx.stroke();

    // Fine diagonal lateral leaf veins
    ctx.strokeStyle = 'rgba(220, 245, 178, 0.32)';
    ctx.lineWidth = 1.1;
    for (let v = -2; v <= 3; v++) {
      const vy = v * (leafLen * 0.13);
      const vw = leafW * (0.68 - Math.abs(v) * 0.11);
      ctx.beginPath();
      ctx.moveTo(0, vy + 5);
      ctx.lineTo(vw, vy - 7);
      ctx.moveTo(0, vy + 5);
      ctx.lineTo(-vw, vy - 7);
      ctx.stroke();
    }

    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Photorealistic alpha-cutout tropical fern / palm frond texture with central rachis
 * and 18 feathered pairs of glossy jungle leaflets.
 */
function createPalmFrondTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;

  // Central arching woody-green rachis stem
  const stemGrad = ctx.createLinearGradient(0, size - 12, 0, 24);
  stemGrad.addColorStop(0, '#4f6b24');
  stemGrad.addColorStop(0.6, '#7cb33a');
  stemGrad.addColorStop(1, '#c6e86b');
  ctx.strokeStyle = stemGrad;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, size - 10);
  ctx.quadraticCurveTo(cx + 8, size * 0.5, cx, 26);
  ctx.stroke();

  // 18 pairs of lush feathered tropical leaflets
  const pairs = 18;
  for (let i = 0; i < pairs; i++) {
    const t = i / (pairs - 1); // 0 bottom -> 1 tip
    const sy = size - 44 - t * (size - 82);
    const envelope = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.94);
    const leafletLen = Math.max(24, envelope * 215);
    const leafletW = Math.max(8, 17 + (1 - t) * 8);

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + side * 3, sy);
      const sweepAng = side * (1.16 - t * 0.42);
      ctx.rotate(sweepAng);

      const lg = ctx.createLinearGradient(0, 0, 0, -leafletLen);
      lg.addColorStop(0, '#5a8832');
      lg.addColorStop(0.55, '#8ec248');
      lg.addColorStop(1, '#d2f07a');
      ctx.fillStyle = lg;

      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(leafletW * 0.72, -leafletLen * 0.24, leafletW * 0.55, -leafletLen * 0.72, 0, -leafletLen);
      ctx.bezierCurveTo(-leafletW * 0.55, -leafletLen * 0.72, -leafletW * 0.72, -leafletLen * 0.24, 0, 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(30, 56, 18, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Fine central leaflet vein
      ctx.strokeStyle = 'rgba(232, 252, 182, 0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -leafletLen * 0.88);
      ctx.stroke();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createStoneTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 768;
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#363b33';
  ctx.fillRect(0, 0, size, size);

  // Ancient weathered temple stone blocks + chiseled bevels & mossy crevices
  const rows = 8;
  const rowH = size / rows;
  const blockW = size / 4;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : blockW * 0.5;
    for (let col = -1; col < 5; col++) {
      const bx = col * blockW + offset + 4;
      const by = r * rowH + 4;
      const bw = blockW - 8;
      const bh = rowH - 8;
      const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      const tone = ((r * 7 + col * 13) & 15) - 7;
      g.addColorStop(0, `rgb(${120 + tone}, ${116 + tone}, ${102 + tone})`);
      g.addColorStop(0.55, `rgb(${96 + tone}, ${93 + tone}, ${82 + tone})`);
      g.addColorStop(1, `rgb(${70 + tone}, ${69 + tone}, ${61 + tone})`);
      ctx.fillStyle = g;
      ctx.fillRect(bx, by, bw, bh);

      // Sunlit upper bevel highlight
      ctx.fillStyle = 'rgba(255, 248, 224, 0.14)';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = 'rgba(15, 20, 14, 0.25)';
      ctx.fillRect(bx, by + bh - 4, bw, 4);

      // Subtle weathered cracks & carved relief lines
      ctx.strokeStyle = 'rgba(20, 24, 18, 0.34)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.16, by + bh * 0.38);
      ctx.lineTo(bx + bw * 0.45, by + bh * 0.56);
      ctx.lineTo(bx + bw * 0.62, by + bh * 0.48);
      ctx.stroke();
    }
  }

  // Lush emerald moss & lichen patches creeping into stone joints
  for (let i = 0; i < 110; i++) {
    const mx = (i * 103) % size;
    const my = (i * 163) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(92, 144, 52, 0.38)' : 'rgba(54, 96, 36, 0.32)';
    ctx.beginPath();
    ctx.arc(mx, my, 10 + (i % 20), 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(c, anisotropy, 2, 2);
}

function createStoneBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 768;
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#282828';
  ctx.fillRect(0, 0, size, size);
  const rows = 8;
  const rowH = size / rows;
  const blockW = size / 4;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : blockW * 0.5;
    for (let col = -1; col < 5; col++) {
      const bx = col * blockW + offset + 5;
      const by = r * rowH + 5;
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(bx, by, blockW - 10, rowH - 10);
      ctx.fillStyle = '#a8a8a8';
      ctx.fillRect(bx + 6, by + 6, blockW - 22, rowH - 22);
    }
  }
  return finalizeTexture(c, anisotropy, 2, 2, true);
}

function createGrassSlopeTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 768;
  const [c, ctx] = makeCanvas(size, size);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#88ab38');
  grad.addColorStop(0.38, '#537b29');
  grad.addColorStop(0.75, '#3b5724');
  grad.addColorStop(1, '#31382a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Layered rocky cliff ledges + lush mossy pockets
  for (let i = 0; i < 60; i++) {
    const rx = (i * 127) % size;
    const ry = (i * 97) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(66, 62, 52, 0.28)' : 'rgba(138, 178, 56, 0.24)';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 28 + (i % 34), 12 + (i % 16), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lush directional grass & fern striations
  for (let i = 0; i < 640; i++) {
    const gx = (i * 53) % size;
    const gy = (i * 83) % size;
    ctx.strokeStyle =
      i % 4 === 0
        ? 'rgba(196, 228, 86, 0.42)'
        : i % 4 === 1
        ? 'rgba(38, 74, 24, 0.46)'
        : i % 4 === 2
        ? 'rgba(98, 152, 48, 0.36)'
        : 'rgba(92, 82, 68, 0.3)';
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + ((i % 7) - 3) * 2.4, gy + 22 + (i % 18));
    ctx.stroke();
  }
  return finalizeTexture(c, anisotropy, 3, 6);
}

function createWaterTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#093c42');
  bg.addColorStop(0.5, '#0e4d52');
  bg.addColorStop(1, '#08363c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Shimmering multi-scale emerald-teal river caustic ripples & sunlit glints
  for (let i = 0; i < 120; i++) {
    const wx = (i * 73) % size;
    const wy = (i * 113) % size;
    const r = 18 + (i % 30);
    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(94, 214, 198, 0.32)'
        : i % 3 === 1
        ? 'rgba(187, 247, 208, 0.22)'
        : 'rgba(254, 249, 195, 0.14)';
    ctx.lineWidth = i % 3 === 2 ? 2 : 3;
    ctx.beginPath();
    ctx.ellipse(wx, wy, r * 1.45, r * 0.65, (i % 5) * 0.3, 0, Math.PI * 2);
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
    pGrad.addColorStop(0, y % 128 === 0 ? '#996239' : '#85522f');
    pGrad.addColorStop(0.5, y % 128 === 0 ? '#7f4d2b' : '#6f4224');
    pGrad.addColorStop(1, '#4c2a13');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, y + 2, 512, 58);

    ctx.fillStyle = '#291509';
    ctx.fillRect(0, y, 512, 3);

    // Subtle wood grain & iron nail heads at plank ends
    ctx.strokeStyle = 'rgba(255, 224, 180, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 18);
    ctx.bezierCurveTo(170, y + 12, 340, y + 28, 512, y + 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(30, 22, 18, 0.55)';
    for (const nx of [24, 488]) {
      ctx.beginPath();
      ctx.arc(nx, y + 18, 4.5, 0, Math.PI * 2);
      ctx.arc(nx, y + 46, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
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

function createExtraLifeCoinBoxTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  // Deep crimson mortar base
  ctx.fillStyle = '#5c0a0a';
  ctx.fillRect(0, 0, 256, 256);

  // Vivid glossy red brick rows matching coin box geometry
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 64;
    for (let col = -1; col < 3; col++) {
      const bx = col * 128 + offset + 6;
      const by = row * 64 + 6;
      const bGrad = ctx.createLinearGradient(bx, by, bx, by + 52);
      bGrad.addColorStop(0, '#ef4444');
      bGrad.addColorStop(0.55, '#dc2626');
      bGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, 116, 52, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 202, 202, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Crisp gold-rimmed crimson medallion with glowing heart emblem
  const medGrad = ctx.createRadialGradient(118, 112, 8, 128, 128, 52);
  medGrad.addColorStop(0, '#fef08a');
  medGrad.addColorStop(0.65, '#f59e0b');
  medGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = medGrad;
  ctx.beginPath();
  ctx.arc(128, 128, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner bright red heart icon
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(128, 158);
  ctx.bezierCurveTo(86, 132, 92, 96, 112, 96);
  ctx.bezierCurveTo(122, 96, 128, 105, 128, 111);
  ctx.bezierCurveTo(128, 105, 134, 96, 144, 96);
  ctx.bezierCurveTo(164, 96, 170, 132, 128, 158);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff1f2';
  ctx.lineWidth = 4;
  ctx.stroke();

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
    canopy: createTreeBranchTexture('#643f22', '#331d0d', '#7a502e', 'rgba(84, 138, 42, 0.90)', 'rgba(54, 94, 28, 0.56)', 'rgba(234, 179, 8, 0.62)', anisotropy),
    ruins: createTreeBranchTexture('#5e4d3c', '#30251b', '#77624c', 'rgba(114, 128, 52, 0.86)', 'rgba(72, 82, 34, 0.52)', 'rgba(217, 155, 38, 0.54)', anisotropy),
    waterfall: createTreeBranchTexture('#463a31', '#231c18', '#5c4c42', 'rgba(42, 134, 112, 0.86)', 'rgba(26, 86, 74, 0.54)', 'rgba(163, 230, 53, 0.44)', anisotropy),
    volcano: createTreeBranchTexture('#362622', '#18100e', '#4c362f', 'rgba(124, 58, 22, 0.84)', 'rgba(76, 32, 12, 0.52)', 'rgba(249, 115, 22, 0.48)', anisotropy),
  };

  const barkBumpTexture = createBarkBumpTexture(anisotropy);
  const foliage = createFoliageLeafTextures(anisotropy);
  const canopyLeafClusterTexture = createCanopyLeafClusterTexture(anisotropy);
  const palmFrondTexture = createPalmFrondTexture(anisotropy);
  const stoneTexture = createStoneTexture(anisotropy);
  const stoneBumpTexture = createStoneBumpTexture(anisotropy);
  const grassSlopeTexture = createGrassSlopeTexture(anisotropy);
  const waterTexture = createWaterTexture(anisotropy);
  const woodPlankTexture = createWoodPlankTexture(anisotropy);
  const iceTexture = createIceTexture(anisotropy);
  const mysteryBlockTexture = createMysteryBlockTexture(anisotropy);
  const coinBoxTexture = createCoinBoxTexture(anisotropy);
  const extraLifeCoinBoxTexture = createExtraLifeCoinBoxTexture(anisotropy);
  const checkerTexture = createCheckerTexture(anisotropy);
  const contactShadowTexture = createContactShadowTexture();
  const boxTargetShadowTexture = createBoxTargetShadowTexture();

  return {
    branchTextures,
    barkBumpTexture,
    foliageLeafTexture: foliage.map,
    foliageBumpTexture: foliage.bump,
    canopyLeafClusterTexture,
    palmFrondTexture,
    stoneTexture,
    stoneBumpTexture,
    grassSlopeTexture,
    waterTexture,
    woodPlankTexture,
    iceTexture,
    mysteryBlockTexture,
    coinBoxTexture,
    extraLifeCoinBoxTexture,
    checkerTexture,
    contactShadowTexture,
    boxTargetShadowTexture,
    dispose: () => {
      Object.values(branchTextures).forEach((t) => t.dispose());
      barkBumpTexture.dispose();
      foliage.map.dispose();
      foliage.bump.dispose();
      canopyLeafClusterTexture.dispose();
      palmFrondTexture.dispose();
      stoneTexture.dispose();
      stoneBumpTexture.dispose();
      grassSlopeTexture.dispose();
      waterTexture.dispose();
      woodPlankTexture.dispose();
      iceTexture.dispose();
      mysteryBlockTexture.dispose();
      coinBoxTexture.dispose();
      extraLifeCoinBoxTexture.dispose();
      checkerTexture.dispose();
      contactShadowTexture.dispose();
      boxTargetShadowTexture.dispose();
    },
  };
}
