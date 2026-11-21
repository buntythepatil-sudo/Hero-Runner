import * as THREE from 'three';

export type FloatingScoreVariant = 'coin' | 'enemy' | 'combo' | 'life';

interface FloatingScoreItem {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  active: boolean;
  elapsed: number;
  duration: number;
  startX: number;
  startY: number;
  startZ: number;
  driftX: number;
  driftY: number;
  baseWidth: number;
  baseHeight: number;
}

const MAX_CACHED_TEXTURES = 64;

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawScoreBadgeTexture(
  text: string,
  variant: FloatingScoreVariant
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Palette per score event variant
  let topHex = '#fffbeb';
  let midHex = '#fde047';
  let botHex = '#f59e0b';
  let strokeHex = '#3b1d06';
  let glowRgba = 'rgba(251, 191, 36, 0.55)';

  if (variant === 'enemy') {
    topHex = '#fef9c3';
    midHex = '#fb923c';
    botHex = '#ef4444';
    strokeHex = '#3b0b08';
    glowRgba = 'rgba(249, 115, 22, 0.58)';
  } else if (variant === 'combo') {
    topHex = '#ecfdf5';
    midHex = '#34d399';
    botHex = '#eab308';
    strokeHex = '#052e16';
    glowRgba = 'rgba(52, 211, 153, 0.6)';
  } else if (variant === 'life') {
    topHex = '#fff1f2';
    midHex = '#fb7185';
    botHex = '#e11d48';
    strokeHex = '#4c0519';
    glowRgba = 'rgba(244, 63, 94, 0.62)';
  }

  const fontSize = text.length > 7 ? 42 : text.length > 5 ? 48 : 54;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const metrics = ctx.measureText(text);
  const iconSize = 26;
  const gap = 10;
  const totalW = iconSize + gap + metrics.width;
  const startX = Math.max(12, (canvas.width - totalW) * 0.5);
  const centerY = canvas.height * 0.52;

  // Draw crisp vector emblem left of text
  const iconCx = startX + iconSize * 0.5;
  const iconCy = centerY - 1;
  ctx.save();
  ctx.shadowColor = glowRgba;
  ctx.shadowBlur = 12;

  if (variant === 'coin') {
    // Gleaming golden coin disc
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, 12.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3b1d06';
    ctx.fill();

    const coinGrad = ctx.createLinearGradient(iconCx - 10, iconCy - 10, iconCx + 10, iconCy + 10);
    coinGrad.addColorStop(0, '#fef08a');
    coinGrad.addColorStop(0.5, '#facc15');
    coinGrad.addColorStop(1, '#d97706');
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, 10, 0, Math.PI * 2);
    ctx.fillStyle = coinGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(iconCx, iconCy, 6.2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  } else if (variant === 'life') {
    // Crisp heart emblem
    ctx.beginPath();
    ctx.moveTo(iconCx, iconCy + 10);
    ctx.bezierCurveTo(iconCx - 15, iconCy + 1, iconCx - 13, iconCy - 12, iconCx, iconCy - 4);
    ctx.bezierCurveTo(iconCx + 13, iconCy - 12, iconCx + 15, iconCy + 1, iconCx, iconCy + 10);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = strokeHex;
    ctx.stroke();
    ctx.fillStyle = '#fb7185';
    ctx.fill();
  } else {
    // Four-point star burst for enemy KO / combo
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 13 : 5.5;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const px = iconCx + Math.cos(a) * r;
      const py = iconCy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeHex;
    ctx.stroke();
    ctx.fillStyle = variant === 'combo' ? '#34d399' : '#fde047';
    ctx.fill();
  }
  ctx.restore();

  // Draw bold high-contrast floating score text
  const textX = startX + iconSize + gap;
  const fillGrad = ctx.createLinearGradient(0, centerY - fontSize * 0.5, 0, centerY + fontSize * 0.5);
  fillGrad.addColorStop(0, topHex);
  fillGrad.addColorStop(0.52, midHex);
  fillGrad.addColorStop(1, botHex);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // Soft outer glow + crisp dark drop outline for legibility on any jungle backdrop
  ctx.shadowColor = glowRgba;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 11;
  ctx.strokeStyle = strokeHex;
  ctx.strokeText(text, textX, centerY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = fillGrad;
  ctx.fillText(text, textX, centerY);

  // Subtle top highlight sheen
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, textX, centerY - 1.5);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3D floating score UI system that spawns billboarded text sprites above the character
 * when coins are collected or enemies are defeated, animating them upward with a smooth
 * pop-in and fade-out tween.
 */
export class FloatingScore3DSystem {
  public readonly group: THREE.Group;

  private pool: FloatingScoreItem[] = [];
  private textureCache = new Map<string, THREE.CanvasTexture>();
  private staggerIndex = 0;
  private lastAnchorZ: number | null = null;

  constructor(poolSize = 24) {
    this.group = new THREE.Group();
    this.group.name = 'FloatingScore3D';

    for (let i = 0; i < poolSize; i++) {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.renderOrder = 25;
      sprite.frustumCulled = false;
      this.group.add(sprite);

      this.pool.push({
        sprite,
        material,
        active: false,
        elapsed: 0,
        duration: 1,
        startX: 0,
        startY: 0,
        startZ: 0,
        driftX: 0,
        driftY: 1.7,
        baseWidth: 1.8,
        baseHeight: 0.9,
      });
    }
  }

  private getTexture(text: string, variant: FloatingScoreVariant): THREE.CanvasTexture {
    const key = `${variant}|${text}`;
    const cached = this.textureCache.get(key);
    if (cached) return cached;

    if (this.textureCache.size >= MAX_CACHED_TEXTURES) {
      const oldestKey = this.textureCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.textureCache.get(oldestKey)?.dispose();
        this.textureCache.delete(oldestKey);
      }
    }

    const tex = drawScoreBadgeTexture(text, variant);
    this.textureCache.set(key, tex);
    return tex;
  }

  public spawn(
    text: string,
    x: number,
    y: number,
    z: number,
    variant: FloatingScoreVariant = 'coin'
  ) {
    // Pick first inactive slot, or recycle the oldest active slot if pool is saturated
    let slot = this.pool.find((item) => !item.active);
    if (!slot) {
      slot = this.pool.reduce((oldest, curr) =>
        curr.elapsed / curr.duration > oldest.elapsed / oldest.duration ? curr : oldest
      );
    }

    const tex = this.getTexture(text, variant);
    slot.material.map = tex;
    slot.material.opacity = 1;
    slot.material.needsUpdate = true;

    const side = this.staggerIndex % 2 === 0 ? 1 : -1;
    const tier = this.staggerIndex % 3;
    this.staggerIndex = (this.staggerIndex + 1) % 12;

    const isMajor = variant === 'enemy' || variant === 'combo' || variant === 'life';
    slot.active = true;
    slot.elapsed = 0;
    slot.duration = isMajor ? 1.18 : 0.92;
    slot.startX = x + side * (isMajor ? 0.16 : 0.28);
    slot.startY = y + tier * 0.14 + (isMajor ? 0.18 : 0);
    slot.startZ = z - 0.12;
    slot.driftX = side * (isMajor ? 0.34 : 0.42);
    slot.driftY = isMajor ? 2.15 : 1.65;
    slot.baseWidth = isMajor ? 2.35 : 1.85;
    slot.baseHeight = slot.baseWidth * 0.5;

    slot.sprite.position.set(slot.startX, slot.startY, slot.startZ);
    slot.sprite.scale.set(slot.baseWidth * 0.45, slot.baseHeight * 0.45, 1);
    slot.sprite.visible = true;
  }

  /**
   * Advances upward drift, elastic pop-in scale, and fade-out tweens.
   * Passing the character's live Z smoothly keeps spawned 3D text readable above the runner
   * while still allowing gentle backward slip in 3D perspective.
   */
  public update(dt: number, anchorZ?: number) {
    const clampedDt = Math.min(dt, 0.05);
    let followDz = 0;
    if (anchorZ !== undefined) {
      if (this.lastAnchorZ !== null) {
        const dz = anchorZ - this.lastAnchorZ;
        // Guard against respawn teleports
        if (Math.abs(dz) < 4.5) {
          followDz = dz * 0.88;
        }
      }
      this.lastAnchorZ = anchorZ;
    }

    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i];
      if (!item.active) continue;

      item.elapsed += clampedDt;
      const t = item.elapsed / item.duration;
      if (t >= 1) {
        item.active = false;
        item.sprite.visible = false;
        item.material.opacity = 0;
        continue;
      }

      // Smooth upward & slight lateral drift tween (ease-out cubic)
      const driftProgress = easeOutCubic(t);
      item.startZ += followDz;
      item.sprite.position.set(
        item.startX + item.driftX * driftProgress,
        item.startY + item.driftY * driftProgress,
        item.startZ + t * 0.35
      );

      // Juicy pop-in scale tween (0 -> 0.22) + gentle settle + slight shrink near fade-out
      let scaleMul = 1;
      if (t < 0.22) {
        scaleMul = THREE.MathUtils.lerp(0.42, 1.04, easeOutBack(t / 0.22));
      } else if (t > 0.72) {
        const outT = (t - 0.72) / 0.28;
        scaleMul = THREE.MathUtils.lerp(1.04, 0.84, outT * outT);
      } else {
        scaleMul = 1.04;
      }
      item.sprite.scale.set(item.baseWidth * scaleMul, item.baseHeight * scaleMul, 1);

      // Smooth fade-out tween in final 42% of lifetime
      if (t < 0.58) {
        item.material.opacity = 1;
      } else {
        const fadeT = (t - 0.58) / 0.42;
        item.material.opacity = Math.max(0, 1 - fadeT * fadeT);
      }
    }
  }

  public clear() {
    this.lastAnchorZ = null;
    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i];
      item.active = false;
      item.sprite.visible = false;
      item.material.opacity = 0;
    }
  }

  public dispose() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].material.dispose();
    }
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
    this.pool = [];
  }
}
