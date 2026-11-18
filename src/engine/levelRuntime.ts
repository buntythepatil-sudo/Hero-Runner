import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import {
  BiomeType,
  LevelSpec,
  ObstacleSpec,
  PlatformSegmentSpec,
  PowerUpType,
} from '../types/game';
import { ProceduralTextureSet } from './textures';

export interface BiomePalette {
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  valleyHex: number;
  treeTrunkHex: number;
  treeLeafHex: number;
  cliffHex: number;
}

export const BIOME_PALETTES: Record<BiomeType, BiomePalette> = {
  canopy: {
    skyHex: 0x38a391,
    fogHex: 0x56ba9e,
    fogDensity: 0.0076,
    hemiSky: 0xe2fff0,
    hemiGround: 0x264c23,
    sunColor: 0xffeda6,
    valleyHex: 0x0b5856,
    treeTrunkHex: 0x5c3a1f,
    treeLeafHex: 0x2d8a34,
    cliffHex: 0x455840,
  },
  ruins: {
    skyHex: 0x6ea685,
    fogHex: 0x82b391,
    fogDensity: 0.0085,
    hemiSky: 0xecfae0,
    hemiGround: 0x353b2b,
    sunColor: 0xffe49e,
    valleyHex: 0x134e48,
    treeTrunkHex: 0x523b28,
    treeLeafHex: 0x487a2d,
    cliffHex: 0x59564b,
  },
  waterfall: {
    skyHex: 0x357a8a,
    fogHex: 0x488d99,
    fogDensity: 0.0088,
    hemiSky: 0xc2f2ff,
    hemiGround: 0x1b3c42,
    sunColor: 0xe6f8ff,
    valleyHex: 0x0b4c57,
    treeTrunkHex: 0x3f2e24,
    treeLeafHex: 0x1f7359,
    cliffHex: 0x3a4a57,
  },
  volcano: {
    skyHex: 0x4f231d,
    fogHex: 0x632d24,
    fogDensity: 0.0092,
    hemiSky: 0xffa463,
    hemiGround: 0x2e1512,
    sunColor: 0xffb878,
    valleyHex: 0xb82e0e,
    treeTrunkHex: 0x2e2624,
    treeLeafHex: 0x5e5147,
    cliffHex: 0x362a26,
  },
};

export interface RuntimePlatform {
  spec: PlatformSegmentSpec;
  mesh: THREE.Group;
  body: CANNON.Body;
  basePos: THREE.Vector3;
  prevPos: THREE.Vector3;
  crumbleState: 'solid' | 'shaking' | 'fallen';
  crumbleTimer: number;
}

export interface RuntimeObstacle {
  spec: ObstacleSpec;
  mesh: THREE.Group;
  body?: CANNON.Body;
  alive: boolean;
  used?: boolean;
  hitsLeft?: number;
  bounceAnim: number;
  hitCooldown: number;
  basePos: THREE.Vector3;
  armMesh?: THREE.Object3D;
}

export interface RuntimeCoin {
  id: string;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  value: number;
  collected: boolean;
  spinOffset: number;
}

export interface DynamicBoulder {
  mesh: THREE.Group;
  body: CANNON.Body;
  life: number;
}

export interface FireProjectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
}

export interface ParticleBurst {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface JungleMonkey {
  root: THREE.Group;
  headGroup: THREE.Group;
  throwArmPivot: THREE.Group;
  handBanana: THREE.Group;
  pos: THREE.Vector3;
  side: -1 | 1;
  canThrow: boolean;
  hasThrown: boolean;
  throwCooldown: number;
  windupTimer: number;
  phase: number;
}

export interface ThrownBanana {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
}

export interface SkyBird {
  root: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  flapSpeed: number;
  phase: number;
  life: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  firePressed: boolean;
  autoRun: boolean;
}

export class LevelPhysicsRuntime {
  public world: CANNON.World;
  public levelGroup: THREE.Group;
  public playerBody: CANNON.Body;
  public playerRadius = 0.44;
  public spec: LevelSpec;

  public platforms: RuntimePlatform[] = [];
  public obstacles: RuntimeObstacle[] = [];
  public coins: RuntimeCoin[] = [];
  public boulders: DynamicBoulder[] = [];
  public projectiles: FireProjectile[] = [];
  public particles: ParticleBurst[] = [];
  public monkeys: JungleMonkey[] = [];
  public thrownBananas: ThrownBanana[] = [];
  public skyBirds: SkyBird[] = [];

  public grounded = false;
  public standingPlatform: RuntimePlatform | null = null;
  public coyoteTimer = 0;
  public jumpBufferTimer = 0;
  public jumpsUsed = 0;
  public invulnTimer = 0;
  public flipAnimTimer = 0;
  public boulderSpawnTimer = 1.2;
  public fireCooldown = 0;

  public activePowerUp: PowerUpType | null = null;
  public powerUpTimer = 0;
  public stompCombo = 0;

  private defaultPhysMat: CANNON.Material;
  private icePhysMat: CANNON.Material;
  private playerPhysMat: CANNON.Material;
  private textures: ProceduralTextureSet;

  // Shared coin geometry/material for draw call efficiency
  private coinGeo: THREE.CylinderGeometry;
  private coinMat: THREE.MeshStandardMaterial;
  private particleGeo: THREE.SphereGeometry;
  private swayNodes: { obj: THREE.Object3D; baseRotZ: number; baseRotX: number; speed: number; phase: number }[] = [];

  private levelMonkeyThrowUsed = false;
  private birdFlyoverTriggered = false;
  private elapsed = 0;

  constructor(spec: LevelSpec, textures: ProceduralTextureSet) {
    this.spec = spec;
    this.textures = textures;
    this.levelGroup = new THREE.Group();

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, spec.gravity, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;

    this.defaultPhysMat = new CANNON.Material('ground');
    this.icePhysMat = new CANNON.Material('ice');
    this.playerPhysMat = new CANNON.Material('player');

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.playerPhysMat, this.defaultPhysMat, {
        friction: 0.0, // We handle horizontal deceleration cleanly in code for Mario responsiveness
        restitution: 0.0,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.playerPhysMat, this.icePhysMat, {
        friction: 0.0,
        restitution: 0.0,
      })
    );

    // Temple Run 2 beveled diamond-medallion relic coins
    this.coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.11, 6);
    this.coinGeo.rotateX(Math.PI / 2);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.28,
      metalness: 0.92,
      roughness: 0.16,
    });
    this.particleGeo = new THREE.SphereGeometry(0.11, 6, 6);

    // Player Physics Body
    this.playerBody = new CANNON.Body({
      mass: 65,
      material: this.playerPhysMat,
      fixedRotation: true,
      linearDamping: 0.02,
      position: new CANNON.Vec3(0, 1.8, 0),
    });
    this.playerBody.addShape(new CANNON.Sphere(this.playerRadius));
    this.world.addBody(this.playerBody);

    this.buildScenery();
    this.buildPlatforms();
    this.buildMonkeyTrees();
    this.buildObstacles();
    this.buildCoins();
    this.buildGoalTemple();
  }

  private buildScenery() {
    const palette = BIOME_PALETTES[this.spec.biome];
    const courseLen = this.spec.length + 280;

    // 1. Shimmering Emerald Jungle River / Lava Abyss below the Canopy
    const valleyGeo = new THREE.PlaneGeometry(520, courseLen);
    valleyGeo.rotateX(-Math.PI / 2);
    const isVolcano = this.spec.biome === 'volcano';
    const valleyMat = new THREE.MeshStandardMaterial({
      map: isVolcano ? undefined : this.textures.waterTexture,
      color: isVolcano ? palette.valleyHex : 0xffffff,
      roughness: isVolcano ? 0.65 : 0.16,
      metalness: isVolcano ? 0.08 : 0.38,
      emissive: isVolcano ? new THREE.Color(0xd9380b) : new THREE.Color(0x063033),
      emissiveIntensity: isVolcano ? 0.55 : 0.22,
    });
    const valleyMesh = new THREE.Mesh(valleyGeo, valleyMat);
    valleyMesh.position.set(0, -15.5, -this.spec.length * 0.5);
    valleyMesh.receiveShadow = true;
    this.levelGroup.add(valleyMesh);

    // 2. Steep Mossy Grass Canyon Slopes & Rock Walls framing Left & Right (Temple Run 2 aesthetic!)
    const slopeGeo = new THREE.PlaneGeometry(24, courseLen, 1, 1);
    const slopeMat = new THREE.MeshStandardMaterial({
      map: this.textures.grassSlopeTexture,
      bumpMap: this.textures.stoneBumpTexture,
      bumpScale: 0.18,
      roughness: 0.88,
      metalness: 0.04,
    });
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(slopeGeo, slopeMat);
      bank.position.set(side * 15.5, -3.5, -this.spec.length * 0.5);
      bank.rotation.y = side * (-Math.PI / 2);
      bank.rotation.order = 'YXZ';
      bank.rotation.x = -0.52; // steep 60-deg canyon wall sloping into the gorge
      bank.receiveShadow = true;
      this.levelGroup.add(bank);
    }

    // 3. Ancient Carved Stone Temple Pillars & Mossy Ruin Walls flanking the gorge
    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.stoneTexture,
      bumpMap: this.textures.stoneBumpTexture,
      bumpScale: 0.12,
      roughness: 0.86,
      metalness: 0.06,
    });
    const pillarCount = 44;
    const pillarGeo = new THREE.BoxGeometry(2.2, 16, 2.4);
    const pillars = new THREE.InstancedMesh(pillarGeo, stoneMat, pillarCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pillarCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const zPos = 8 - (i / pillarCount) * (this.spec.length + 50);
      const xPos = side * (8.4 + (i % 3) * 1.4);
      const yPos = -8.5 + (i % 5) * 1.3;
      dummy.position.set(xPos, yPos, zPos);
      dummy.rotation.set(0, ((i % 3) - 1) * 0.08, 0);
      dummy.scale.set(1, 0.85 + (i % 4) * 0.15, 1);
      dummy.updateMatrix();
      pillars.setMatrixAt(i, dummy.matrix);
    }
    pillars.computeBoundingSphere();
    this.levelGroup.add(pillars);

    // 4. Colossal Misty Background Stone Arches / Ancient Tree Roots rising out of the water
    const archCount = 14;
    const archGeo = new THREE.TorusGeometry(14, 1.9, 10, 22, Math.PI * 0.85);
    const arches = new THREE.InstancedMesh(archGeo, stoneMat, archCount);
    for (let i = 0; i < archCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const zPos = -10 - (i / archCount) * (this.spec.length + 70);
      dummy.position.set(side * (24 + (i % 3) * 6), -14, zPos);
      dummy.rotation.set(0, side * 0.45, side * -0.15);
      dummy.scale.setScalar(0.9 + (i % 3) * 0.25);
      dummy.updateMatrix();
      arches.setMatrixAt(i, dummy.matrix);
    }
    arches.computeBoundingSphere();
    this.levelGroup.add(arches);

    // 5. Realistic Curved Jungle Canopy Trees with Multi-Tier Lush Foliage
    const treeCount = 96;
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -4.5, 0),
      new THREE.Vector3(0.35, -1.5, 0.15),
      new THREE.Vector3(-0.22, 1.8, -0.1),
      new THREE.Vector3(0.18, 4.8, 0.2),
    ]);
    const trunkGeo = new THREE.TubeGeometry(trunkCurve, 10, 0.48, 8, false);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: palette.treeTrunkHex,
      bumpMap: this.textures.barkBumpTexture,
      bumpScale: 0.12,
      roughness: 0.9,
      metalness: 0.02,
    });
    const canopyGeo = new THREE.DodecahedronGeometry(2.8, 1);
    canopyGeo.scale(1.25, 0.56, 1.15);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: palette.treeLeafHex,
      roughness: 0.72,
      metalness: 0.04,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount * 2);
    const tint = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const zPos = 14 - (i / treeCount) * (this.spec.length + 60);
      const xPos = side * (10.5 + ((i * 31) % 14));
      const yPos = -6.0 + ((i * 17) % 6);
      const scale = 0.92 + ((i * 13) % 40) / 100;

      dummy.position.set(xPos, yPos + 4.2 * scale, zPos);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, (i * 1.1) % Math.PI, side * -0.08);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(xPos, yPos + 8.6 * scale, zPos);
      dummy.scale.set(scale * 1.35, scale * 0.9, scale * 1.35);
      dummy.rotation.set(0, i * 0.6, 0);
      dummy.updateMatrix();
      canopies.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(xPos - side * 1.4 * scale, yPos + 7.5 * scale, zPos + 0.8);
      dummy.scale.set(scale * 1.05, scale * 0.75, scale * 1.05);
      dummy.updateMatrix();
      canopies.setMatrixAt(i * 2 + 1, dummy.matrix);

      tint.setHex(palette.treeLeafHex).offsetHSL(((i % 7) - 3) * 0.015, 0.08, ((i % 4) - 1) * 0.05);
      canopies.setColorAt(i * 2, tint);
      canopies.setColorAt(i * 2 + 1, tint.clone().offsetHSL(0.02, 0.05, 0.04));
    }

    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
    this.levelGroup.add(trunks, canopies);

    // 6. Lush Sharp Jungle Grass / Fern Blades sprouting along the canyon ledges
    const grassCount = 220;
    const bladeGeo = new THREE.ConeGeometry(0.18, 1.75, 4);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: isVolcano ? 0x6b4f3a : 0x76b82a,
      roughness: 0.7,
    });
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
    for (let i = 0; i < grassCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const zPos = 8 - (i / grassCount) * (this.spec.length + 45);
      const xPos = side * (6.4 + ((i * 19) % 7));
      const yPos = -1.6 + ((i * 11) % 3);
      dummy.position.set(xPos, yPos, zPos);
      dummy.rotation.set(((i % 5) - 2) * 0.14, i * 0.9, side * 0.3);
      dummy.scale.set(1, 0.85 + (i % 4) * 0.3, 1);
      dummy.updateMatrix();
      blades.setMatrixAt(i, dummy.matrix);
    }
    blades.computeBoundingSphere();
    this.levelGroup.add(blades);
  }

  // Straight, level plain road surface (zero uneven wave or lateral wobble)
  private sampleBranchOffset(_p: PlatformSegmentSpec, _localZ: number): { dx: number; dy: number } {
    return { dx: 0, dy: 0 };
  }

  private getSurfacePointOnCourse(worldX: number, worldZ: number, fallbackY: number): { x: number; y: number } {
    for (const p of this.spec.platforms) {
      const halfD = p.depth * 0.5;
      if (worldZ <= p.z + halfD && worldZ >= p.z - halfD) {
        return {
          x: worldX,
          y: p.y + p.height * 0.5,
        };
      }
    }
    return { x: worldX, y: fallbackY };
  }

  private buildUnevenBranchGeometry(p: PlatformSegmentSpec): THREE.BufferGeometry {
    const zSteps = Math.max(8, Math.round(p.depth * 0.8));
    const radialSteps = 20;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfW = p.width * 0.5;
    const halfH = p.height * 0.5;

    const ringCols = radialSteps + 1;
    for (let iz = 0; iz <= zSteps; iz++) {
      const u = iz / zSteps; // 0 (back +Z/2) -> 1 (front -Z/2)
      const localZ = p.depth * 0.5 - u * p.depth;

      for (let ir = 0; ir <= radialSteps; ir++) {
        const v = ir / radialSteps;
        // Put UV/normal seam at -Y underside (theta = +-PI) so top road deck (v = 0.5) is seamless
        const theta = (v - 0.5) * Math.PI * 2;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        // Flat, level road deck on top with smooth rounded branch underside
        const topBlend = THREE.MathUtils.smoothstep(cosT, -0.05, 0.25);
        const x = sinT * halfW;
        const y = THREE.MathUtils.lerp(cosT * halfH, halfH, topBlend);

        positions.push(x, y, localZ);
        uvs.push(v, u * (p.depth * 0.28));
      }
    }

    for (let iz = 0; iz < zSteps; iz++) {
      for (let ir = 0; ir < radialSteps; ir++) {
        const a = iz * ringCols + ir;
        const b = a + 1;
        const c = (iz + 1) * ringCols + ir;
        const d = c + 1;
        indices.push(a, d, c);
        indices.push(a, b, d);
      }
    }

    // Cap front and back branch ends with gnarled bark rings
    const addCap = (zIdx: number, zVal: number, off: { dx: number; dy: number }, reverse: boolean) => {
      const centerIdx = positions.length / 3;
      positions.push(off.dx, off.dy, zVal);
      uvs.push(0.5, 0.5);
      const start = zIdx * ringCols;
      for (let ir = 0; ir < radialSteps; ir++) {
        if (reverse) {
          indices.push(centerIdx, start + ir + 1, start + ir);
        } else {
          indices.push(centerIdx, start + ir, start + ir + 1);
        }
      }
    };
    addCap(0, p.depth * 0.5, this.sampleBranchOffset(p, p.depth * 0.5), true);
    addCap(zSteps, -p.depth * 0.5, this.sampleBranchOffset(p, -p.depth * 0.5), false);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Weld normals across the radial seam (ir = 0 and ir = radialSteps) for uniform sunlight shading
    const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
    const n0 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    for (let iz = 0; iz <= zSteps; iz++) {
      const idx0 = iz * ringCols;
      const idx1 = idx0 + radialSteps;
      n0.fromBufferAttribute(normAttr, idx0);
      n1.fromBufferAttribute(normAttr, idx1);
      n0.add(n1).normalize();
      normAttr.setXYZ(idx0, n0.x, n0.y, n0.z);
      normAttr.setXYZ(idx1, n0.x, n0.y, n0.z);
    }
    normAttr.needsUpdate = true;

    return geo;
  }

  private buildPlatforms() {
    const branchTex = this.textures.branchTextures[this.spec.biome];
    const palette = BIOME_PALETTES[this.spec.biome];
    const stoneTrimMat = new THREE.MeshStandardMaterial({
      map: this.textures.stoneTexture,
      bumpMap: this.textures.stoneBumpTexture,
      bumpScale: 0.1,
      roughness: 0.85,
      metalness: 0.06,
    });
    const flowerColors = [0xf43f5e, 0xfbbf24, 0xf97316, 0xe879f9];

    for (const p of this.spec.platforms) {
      const group = new THREE.Group();
      group.position.set(p.x, p.y, p.z);

      let mat: THREE.MeshStandardMaterial;
      if (p.kind === 'bridge') {
        mat = new THREE.MeshStandardMaterial({
          map: this.textures.woodPlankTexture,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.06,
          roughness: 0.84,
          metalness: 0.04,
        });
      } else if (p.kind === 'crumbling') {
        mat = new THREE.MeshStandardMaterial({
          map: branchTex,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.03,
          color: 0xd99b52,
          roughness: 0.85,
          metalness: 0.02,
        });
      } else if (p.kind === 'ice') {
        mat = new THREE.MeshStandardMaterial({
          map: this.textures.iceTexture,
          roughness: 0.16,
          metalness: 0.18,
        });
      } else if (p.kind === 'moving') {
        mat = new THREE.MeshStandardMaterial({
          map: branchTex,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.03,
          color: 0xd9a441,
          roughness: 0.68,
          metalness: 0.1,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          map: branchTex,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.025,
          roughness: 0.82,
          metalness: 0.04,
        });
      }

      if (p.kind === 'bridge') {
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(p.width, p.height * 0.72, p.depth),
          mat
        );
        deck.position.y = p.height * 0.14;
        deck.castShadow = true;
        deck.receiveShadow = true;
        group.add(deck);

        for (const sx of [-1, 1]) {
          const railWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.56, p.depth),
            stoneTrimMat
          );
          railWall.position.set(sx * (p.width * 0.48), 0.24, 0);
          railWall.castShadow = true;
          group.add(railWall);
        }
      } else {
        // Living Uneven Gnarled 3D Tree Branch Bough!
        const boughGeo = this.buildUnevenBranchGeometry(p);
        const mainBough = new THREE.Mesh(boughGeo, mat);
        mainBough.castShadow = true;
        mainBough.receiveShadow = true;
        group.add(mainBough);

        // Live Side Twigs, Swaying Jungle Fronds, Blossoms & Hanging Vines!
        const barkMat = new THREE.MeshStandardMaterial({
          color: palette.treeTrunkHex,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.12,
          roughness: 0.88,
        });
        const leafMat = new THREE.MeshStandardMaterial({
          color: p.kind === 'crumbling' ? 0xb45309 : palette.treeLeafHex,
          roughness: 0.62,
          side: THREE.DoubleSide,
        });
        const twigCount = Math.max(3, Math.floor(p.depth / 3.8));
        for (let t = 0; t < twigCount; t++) {
          const side = t % 2 === 0 ? -1 : 1;
          const tz = -p.depth * 0.44 + (t / Math.max(1, twigCount - 1)) * (p.depth * 0.88);
          const off = this.sampleBranchOffset(p, tz);

          const sproutPivot = new THREE.Group();
          sproutPivot.position.set(off.dx + side * (p.width * 0.48), off.dy - 0.05, tz);

          const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.30, 2.5, 10), barkMat);
          twig.rotation.z = side * -1.12;
          twig.rotation.y = side * 0.28;
          twig.position.set(side * 0.9, -0.1, 0);
          sproutPivot.add(twig);

          // Swaying fanned jungle fern/palm fronds
          for (let f = -1; f <= 1; f++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.75, 5), leafMat);
            frond.scale.set(1.0, 1.0, 0.2);
            frond.position.set(side * 1.85, 0.35, f * 0.42);
            frond.rotation.z = side * -0.92;
            frond.rotation.x = f * 0.48;
            sproutPivot.add(frond);
          }

          // Eye-catching colorful jungle blossoms blooming along the live branch
          if (t % 2 === 0 && this.spec.biome !== 'volcano') {
            const flowerMat = new THREE.MeshStandardMaterial({
              color: flowerColors[(t + this.spec.levelNumber) % flowerColors.length],
              emissive: flowerColors[(t + this.spec.levelNumber) % flowerColors.length],
              emissiveIntensity: 0.18,
              roughness: 0.45,
            });
            const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), flowerMat);
            flower.scale.set(1.2, 0.55, 1.2);
            flower.position.set(side * 0.35, p.height * 0.42, 0.2);
            sproutPivot.add(flower);
          }

          // Hanging curved liana tendril dangling beneath the branch
          if (t % 2 === 1) {
            const vineCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 0.4, -0.2, 0),
              new THREE.Vector3(side * 0.55, -1.5, 0.25),
              new THREE.Vector3(side * 0.35, -2.9, -0.15),
            ]);
            const tendril = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 8, 0.05, 6, false), leafMat);
            sproutPivot.add(tendril);
          }

          group.add(sproutPivot);
          this.swayNodes.push({
            obj: sproutPivot,
            baseRotZ: 0,
            baseRotX: 0,
            speed: 1.5 + (t % 3) * 0.35,
            phase: tz * 0.5 + t,
          });
        }

        // Hanging support liana vines on moving branch
        if (p.kind === 'moving') {
          const vineMat = new THREE.MeshStandardMaterial({ color: 0x3b8c2a, roughness: 0.78 });
          for (const sx of [-1, 1]) {
            const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8, 6), vineMat);
            rope.position.set(sx * (p.width * 0.42), 4.2, 0);
            group.add(rope);
          }
        }
      }

      this.levelGroup.add(group);

      const physMat = p.kind === 'ice' ? this.icePhysMat : this.defaultPhysMat;
      const body = new CANNON.Body({
        mass: 0,
        type: p.kind === 'moving' ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC,
        material: physMat,
        position: new CANNON.Vec3(p.x, p.y, p.z),
      });

      body.addShape(new CANNON.Box(new CANNON.Vec3(p.width * 0.5, p.height * 0.5, p.depth * 0.5)));
      this.world.addBody(body);

      this.platforms.push({
        spec: p,
        mesh: group,
        body,
        basePos: new THREE.Vector3(p.x, p.y, p.z),
        prevPos: new THREE.Vector3(p.x, p.y, p.z),
        crumbleState: 'solid',
        crumbleTimer: 0,
      });
    }
  }

  private buildObstacles() {
    for (const o of this.spec.obstacles) {
      const surf = this.getSurfacePointOnCourse(o.x, o.z, o.y);
      const isFloatingBlock = o.kind === 'mystery_block' || o.kind === 'coin_box';
      const placedX = surf.x;
      const placedY = isFloatingBlock ? surf.y + 2.55 : surf.y;

      const group = new THREE.Group();
      group.position.set(placedX, placedY, o.z);
      let body: CANNON.Body | undefined;
      let armMesh: THREE.Object3D | undefined;

      if (o.kind === 'log') {
        const logW = Math.min(3.4, (o.width ?? 6) * 0.52);
        const barkMat = new THREE.MeshStandardMaterial({
          color: 0x6b3e1e,
          bumpMap: this.textures.barkBumpTexture,
          bumpScale: 0.1,
          roughness: 0.86,
          metalness: 0.04,
        });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4a36a, roughness: 0.65, metalness: 0.02 });
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, logW, 14), barkMat);
        cyl.rotation.z = Math.PI / 2;
        cyl.position.y = 0.45;
        cyl.castShadow = true;
        const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 14), ringMat);
        capL.rotation.z = Math.PI / 2;
        capL.position.set(-logW * 0.5 - 0.01, 0.45, 0);
        const capR = capL.clone();
        capR.position.x = logW * 0.5 + 0.01;
        group.add(cyl, capL, capR);
      } else if (o.kind === 'crate') {
        const woodMat = new THREE.MeshStandardMaterial({
          map: this.textures.woodPlankTexture,
          roughness: 0.78,
          metalness: 0.05,
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), woodMat);
        box.position.y = 0.58;
        box.castShadow = true;
        box.receiveShadow = true;
        const braceMat = new THREE.MeshStandardMaterial({ color: 0x452610, roughness: 0.85, metalness: 0.08 });
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 1.2), braceMat);
        brace.position.y = 0.58;
        group.add(box, brace);

        body = new CANNON.Body({
          mass: 0,
          type: CANNON.Body.STATIC,
          position: new CANNON.Vec3(placedX, placedY + 0.58, o.z),
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.58, 0.58, 0.58)));
        this.world.addBody(body);
      } else if (o.kind === 'pipe') {
        const pipeMat = new THREE.MeshPhysicalMaterial({
          color: 0x16a34a,
          roughness: 0.18,
          metalness: 0.12,
          clearcoat: 0.8,
          clearcoatRoughness: 0.15,
        });
        const rimMat = new THREE.MeshPhysicalMaterial({
          color: 0x22c55e,
          roughness: 0.16,
          metalness: 0.16,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12,
        });
        const darkMat = new THREE.MeshStandardMaterial({
          color: 0x052e16,
          roughness: 0.9,
        });

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.35, 22), pipeMat);
        shaft.position.y = 0.675;
        shaft.castShadow = true;
        shaft.receiveShadow = true;

        const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.36, 22), rimMat);
        lip.position.y = 1.45;
        lip.castShadow = true;
        lip.receiveShadow = true;

        const lipRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.075, 10, 24), rimMat);
        lipRim.rotation.x = Math.PI / 2;
        lipRim.position.y = 1.61;

        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 18), darkMat);
        bore.position.y = 1.62;
        group.add(shaft, lip, lipRim, bore);

        body = new CANNON.Body({
          mass: 0,
          type: CANNON.Body.STATIC,
          material: this.defaultPhysMat,
          position: new CANNON.Vec3(placedX, placedY + 0.82, o.z),
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.72, 0.82, 0.72)));
        this.world.addBody(body);
      } else if (o.kind === 'mystery_block' || o.kind === 'coin_box') {
        const isMystery = o.kind === 'mystery_block';
        const qMat = new THREE.MeshPhysicalMaterial({
          map: isMystery ? this.textures.mysteryBlockTexture : this.textures.coinBoxTexture,
          roughness: 0.28,
          metalness: 0.2,
          clearcoat: 0.45,
          clearcoatRoughness: 0.25,
        });
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.24, 1.24), qMat);
        block.castShadow = true;
        block.receiveShadow = true;
        group.add(block);

        // Ground target shadow directly below the floating box on the uneven branch top so player can aim jump!
        const shadowMat = new THREE.MeshBasicMaterial({
          map: this.textures.boxTargetShadowTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.92,
        });
        const targetShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), shadowMat);
        targetShadow.rotation.x = -Math.PI / 2;
        targetShadow.position.y = -2.50; // Flush on branch top 2.55m below box center
        group.add(targetShadow);

        body = new CANNON.Body({
          mass: 0,
          type: CANNON.Body.STATIC,
          position: new CANNON.Vec3(placedX, placedY, o.z),
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.62, 0.62, 0.62)));
        this.world.addBody(body);
      } else if (o.kind === 'power_mushroom') {
        // Super Mario-style glossy Pixar Power Mushroom that awards the Blaster Gun!
        const stemMat = new THREE.MeshPhysicalMaterial({
          color: 0xfef3c7,
          roughness: 0.42,
          sheen: 0.4,
          sheenColor: new THREE.Color(0xffffff),
        });
        const capMat = new THREE.MeshPhysicalMaterial({
          color: 0xef4444,
          emissive: 0xb91c1c,
          emissiveIntensity: 0.25,
          roughness: 0.16,
          metalness: 0.08,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12,
        });
        const spotMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 0.5 });
        const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.26, 8, 14), stemMat);
        stem.position.y = 0.26;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.56, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
          capMat
        );
        cap.position.y = 0.36;
        cap.castShadow = true;
        group.add(stem, cap);

        // Cute Pixar mushroom eyes
        const mEyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
        for (const sx of [-1, 1]) {
          const me = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mEyeMat);
          me.scale.set(0.8, 1.35, 0.6);
          me.position.set(sx * 0.09, 0.27, 0.22);
          group.add(me);
        }

        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + 0.4;
          const spot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), spotMat);
          spot.position.set(Math.cos(ang) * 0.35, 0.64, Math.sin(ang) * 0.35);
          spot.scale.y = 0.55;
          group.add(spot);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.68, 22), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        group.add(ring);
      } else if (o.kind === 'bounce_mushroom') {
        // Spring Vine Trampoline Drum (distinct from Power-Up Mushroom!)
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.78 });
        const padMat = new THREE.MeshPhysicalMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.24,
          roughness: 0.22,
          clearcoat: 0.65,
        });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.75 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.34, 18), baseMat);
        base.position.y = 0.17;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.22, 20), padMat);
        pad.position.y = 0.42;
        pad.castShadow = true;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.075, 10, 24), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.44;
        group.add(base, pad, rim);
      } else if (o.kind === 'crab' || o.kind === 'beetle') {
        const isCrab = o.kind === 'crab';
        const shellMat = new THREE.MeshPhysicalMaterial({
          color: isCrab ? 0xf43f5e : 0x4f46e5,
          roughness: 0.22,
          metalness: 0.25,
          clearcoat: 0.78,
          clearcoatRoughness: 0.18,
        });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.15 });
        const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 0.8 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(0.56, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
          shellMat
        );
        shell.position.y = 0.28;
        shell.scale.set(1.18, 0.88, 1.02);
        shell.castShadow = true;
        group.add(shell);

        for (const sx of [-1, 1]) {
          // Big expressive goofy Pixar cartoon eyes!
          const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), scleraMat);
          sclera.position.set(sx * 0.22, 0.66, 0.36);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), pupilMat);
          pupil.position.set(sx * 0.22, 0.66, 0.465);
          const catchDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), catchMat);
          catchDot.position.set(sx * 0.22 + 0.03, 0.69, 0.515);
          group.add(sclera, pupil, catchDot);

          for (let l = 0; l < 2; l++) {
            const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.26, 6, 10), legMat);
            leg.position.set(sx * 0.58, 0.18, (l - 0.5) * 0.32);
            leg.rotation.z = sx * -0.55;
            group.add(leg);
          }
        }
      } else if (o.kind === 'pendulum') {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.28, metalness: 0.85 });
        const hazardMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45, metalness: 0.35 });

        const topBar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.32, 0.32), frameMat);
        topBar.position.y = 4.6;
        group.add(topBar);
        for (const sx of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.6, 8), frameMat);
          pillar.position.set(sx * 2.4, 2.3, 0);
          pillar.castShadow = true;
          group.add(pillar);
        }

        const arm = new THREE.Group();
        arm.position.y = 4.55;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), ironMat);
        rod.position.y = -1.8;
        const mace = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.5, 12), hazardMat);
        mace.rotation.x = Math.PI / 2;
        mace.position.y = -3.65;
        mace.castShadow = true;
        arm.add(rod, mace);
        group.add(arm);
        armMesh = arm;
      } else if (o.kind === 'sweeper') {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85, metalness: 0.1 });
        const beamMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55, metalness: 0.2 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.35, 10), stoneMat);
        base.position.y = 0.67;
        base.castShadow = true;
        group.add(base);

        const arm = new THREE.Group();
        arm.position.y = 0.65;
        const barLen = Math.min(4.6, (o.width ?? 5) * 0.72);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, barLen, 10), beamMat);
        bar.rotation.z = Math.PI / 2;
        bar.castShadow = true;
        arm.add(bar);
        group.add(arm);
        armMesh = arm;
      } else if (o.kind === 'boulder_chute') {
        // Stone archway marking boulder lane
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9 });
        const marker = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.12, 8, 14, Math.PI), stoneMat);
        marker.position.y = 0.05;
        group.add(marker);
      }

      this.levelGroup.add(group);
      this.obstacles.push({
        spec: o,
        mesh: group,
        body,
        alive: true,
        used: false,
        hitsLeft: o.kind === 'coin_box' ? 3 : 1,
        bounceAnim: 0,
        hitCooldown: 0,
        basePos: new THREE.Vector3(placedX, placedY, o.z),
        armMesh,
      });
    }
  }

  private buildCoins() {
    for (const c of this.spec.coins) {
      let cx = c.x;
      let cy = c.y;
      for (const p of this.spec.platforms) {
        const halfD = p.depth * 0.5;
        if (c.z <= p.z + halfD && c.z >= p.z - halfD) {
          const off = this.sampleBranchOffset(p, c.z - p.z);
          cx += off.dx;
          cy += off.dy;
          break;
        }
      }
      const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
      mesh.position.set(cx, cy, c.z);
      mesh.castShadow = true;
      this.levelGroup.add(mesh);
      this.coins.push({
        id: c.id,
        mesh,
        pos: new THREE.Vector3(cx, cy, c.z),
        value: c.value,
        collected: false,
        spinOffset: Math.abs(c.z) * 0.3,
      });
    }
  }

  private buildGoalTemple() {
    const goalGroup = new THREE.Group();
    goalGroup.position.set(0, this.spec.goalY, this.spec.goalZ);

    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.stoneTexture,
      bumpMap: this.textures.stoneBumpTexture,
      bumpScale: 0.14,
      roughness: 0.78,
      metalness: 0.08,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.9,
    });
    const bannerMat = new THREE.MeshStandardMaterial({
      map: this.textures.checkerTexture,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    // Twin temple pillars
    for (const sx of [-1, 1]) {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.3), stoneMat);
      plinth.position.set(sx * 3.4, 0.35, 0);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 5.2, 12), stoneMat);
      col.position.set(sx * 3.4, 3.1, 0);
      col.castShadow = true;
      const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), goldMat);
      finial.position.set(sx * 3.4, 6.2, 0);
      goalGroup.add(plinth, col, finial);
    }

    // Arch lintel & checkered banner
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.65, 1.0), stoneMat);
    lintel.position.set(0, 5.65, 0);
    lintel.castShadow = true;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.35), bannerMat);
    banner.position.set(0, 4.65, 0);

    // Center Victory Beacon Ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 10, 24), goldMat);
    ring.position.set(0, 1.8, 0);

    goalGroup.add(lintel, banner, ring);
    this.levelGroup.add(goalGroup);
  }

  public spawnBurst(pos: THREE.Vector3, hexColor: number, count = 10) {
    const mat = new THREE.MeshBasicMaterial({ color: hexColor });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, mat);
      m.position.copy(pos);
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.5 + Math.random() * 4.5;
      const vel = new THREE.Vector3(
        Math.cos(ang) * spd,
        3.2 + Math.random() * 4.2,
        Math.sin(ang) * spd
      );
      this.levelGroup.add(m);
      this.particles.push({ mesh: m, vel, life: 0.55, maxLife: 0.55 });
    }
  }

  private spawnBoulder(origin: THREE.Vector3) {
    const r = 0.68;
    const g = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: this.spec.biome === 'volcano' ? 0x292524 : 0x78716c,
      roughness: 0.88,
      metalness: 0.08,
    });
    const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), rockMat);
    sphere.castShadow = true;
    g.add(sphere);
    g.position.set(origin.x, origin.y + r + 0.3, origin.z);
    this.levelGroup.add(g);

    const body = new CANNON.Body({
      mass: 40,
      material: this.defaultPhysMat,
      position: new CANNON.Vec3(origin.x, origin.y + r + 0.3, origin.z),
      velocity: new CANNON.Vec3((Math.random() - 0.5) * 1.4, 0, 7.5 + this.spec.levelNumber * 0.35),
    });
    body.addShape(new CANNON.Sphere(r));
    this.world.addBody(body);

    this.boulders.push({ mesh: g, body, life: 5.5 });
  }

  private createBananaMesh(scale = 1): THREE.Group {
    const g = new THREE.Group();
    const bananaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 0.14, 0),
      new THREE.Vector3(-0.06, 0.02, 0),
      new THREE.Vector3(0.08, -0.02, 0),
      new THREE.Vector3(0.20, 0.11, 0),
    ]);
    const peelMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.16,
      roughness: 0.42,
      metalness: 0.04,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x422006,
      roughness: 0.85,
    });
    const body = new THREE.Mesh(new THREE.TubeGeometry(bananaCurve, 10, 0.052, 8, false), peelMat);
    body.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.07, 6), stemMat);
    tip.position.set(0.21, 0.14, 0);
    tip.rotation.z = -0.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 6), stemMat);
    stem.position.set(-0.20, 0.17, 0);
    stem.rotation.z = 0.6;
    g.add(body, tip, stem);
    g.scale.setScalar(scale);
    return g;
  }

  private buildMonkeyTrees() {
    const palette = BIOME_PALETTES[this.spec.biome];
    const trunkMat = new THREE.MeshStandardMaterial({
      color: palette.treeTrunkHex,
      bumpMap: this.textures.barkBumpTexture,
      bumpScale: 0.12,
      roughness: 0.9,
      metalness: 0.02,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: this.spec.biome === 'volcano' ? 0x4b6b2f : palette.treeLeafHex,
      roughness: 0.7,
    });
    const furMat = new THREE.MeshStandardMaterial({
      color: 0x7c4623,
      roughness: 0.78,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe6be94,
      roughness: 0.62,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.15,
    });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const monkeyCount = Math.min(9, 4 + Math.floor(this.spec.levelNumber / 3));
    const throwerIdx = monkeyCount > 1 ? 1 : 0;
    const startZ = -23;
    const endZ = this.spec.goalZ + 20;
    const span = Math.abs(endZ - startZ);

    for (let i = 0; i < monkeyCount; i++) {
      const targetZ = startZ - (i / Math.max(1, monkeyCount - 1)) * span;
      // Find nearest branch platform at targetZ so the monkey tree perches cleanly beside it
      let plat = this.platforms[0]?.spec;
      let bestDist = Infinity;
      for (const p of this.spec.platforms) {
        const d = Math.abs(p.z - targetZ);
        if (d < bestDist) {
          bestDist = d;
          plat = p;
        }
      }
      if (!plat) continue;

      const platTopY = plat.y + plat.height * 0.5;
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const trunkX = plat.x + side * (plat.width * 0.5 + 4.35);
      const perchX = plat.x + side * (plat.width * 0.5 + 1.85);
      const perchY = platTopY + 2.35;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(0, 0, targetZ);

      // Sturdy curving tree trunk rising from canyon beside the branch
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(trunkX, platTopY - 12, 0),
        new THREE.Vector3(trunkX + side * 0.35, platTopY - 2.5, 0),
        new THREE.Vector3(trunkX, platTopY + 3.2, 0),
        new THREE.Vector3(trunkX - side * 0.25, platTopY + 7.4, 0),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 12, 0.55, 10, false), trunkMat);
      treeGroup.add(trunk);

      // Horizontal tree limb extending toward the player path where the monkey sits
      const limbCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(trunkX, perchY - 0.35, 0),
        new THREE.Vector3((trunkX + perchX) * 0.5, perchY + 0.12, 0),
        new THREE.Vector3(perchX - side * 0.5, perchY - 0.06, 0),
      ]);
      const limb = new THREE.Mesh(new THREE.TubeGeometry(limbCurve, 10, 0.26, 8, false), trunkMat);
      limb.castShadow = true;
      limb.receiveShadow = true;
      treeGroup.add(limb);

      // Lush Jungle Canopy + Hanging Banana Bunch
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.7, 1), leafMat);
      canopy.scale.set(1.25, 0.65, 1.15);
      canopy.position.set(trunkX - side * 0.5, platTopY + 7.2, 0);
      const canopySide = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), leafMat);
      canopySide.scale.set(1.1, 0.65, 1.0);
      canopySide.position.set(perchX + side * 0.5, platTopY + 6.4, 0.4);
      treeGroup.add(canopy, canopySide);

      // Hanging cluster of yellow bananas under the canopy limb
      const bunchGroup = new THREE.Group();
      bunchGroup.position.set((trunkX + perchX) * 0.5, perchY + 2.3, 0);
      for (let b = 0; b < 3; b++) {
        const ban = this.createBananaMesh(1.35);
        ban.rotation.set(0.2, b * 1.1, -Math.PI * 0.45);
        ban.position.set((b - 1) * 0.12, -0.18, (b % 2) * 0.1);
        bunchGroup.add(ban);
      }
      treeGroup.add(bunchGroup);
      this.levelGroup.add(treeGroup);

      // Sculpted Expressive 3D Monkey seated on the tree branch (+Z = face front in local space)
      const monkeyRoot = new THREE.Group();
      const monkeyPos = new THREE.Vector3(perchX, perchY + 0.16, targetZ);
      monkeyRoot.position.copy(monkeyPos);
      monkeyRoot.rotation.y = Math.atan2(-side * 4.5, 6.0);

      // Torso & tan belly
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.34, 8, 14), furMat);
      torso.position.y = 0.34;
      torso.castShadow = true;
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skinMat);
      belly.scale.set(0.88, 1.15, 0.55);
      belly.position.set(0, 0.32, 0.14);
      monkeyRoot.add(torso, belly);

      // Seated bent legs gripping the limb
      for (const ls of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 6, 10), furMat);
        leg.position.set(ls * 0.17, 0.14, 0.12);
        leg.rotation.x = Math.PI * 0.38;
        leg.rotation.z = ls * -0.15;
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
        foot.scale.set(0.85, 0.65, 1.25);
        foot.position.set(ls * 0.19, 0.04, 0.24);
        monkeyRoot.add(leg, foot);
      }

      // Curled prehensile monkey tail
      const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.16, -0.2),
        new THREE.Vector3(0, 0.25, -0.46),
        new THREE.Vector3(0.14, 0.58, -0.58),
        new THREE.Vector3(0.06, 0.84, -0.44),
      ]);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.045, 8, false), furMat);
      tail.castShadow = true;
      monkeyRoot.add(tail);

      // Monkey Head Group (eyes, ears, muzzle, grin)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.76, 0.03);

      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), furMat);
      cranium.castShadow = true;
      const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 12), skinMat);
      faceMask.scale.set(0.95, 0.85, 0.55);
      faceMask.position.set(0, 0.03, 0.14);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skinMat);
      muzzle.scale.set(1.12, 0.78, 0.85);
      muzzle.position.set(0, -0.09, 0.19);
      const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.08, 4, 8), eyeMat);
      mouth.rotation.z = Math.PI / 2;
      mouth.position.set(0, -0.12, 0.30);
      headGroup.add(cranium, faceMask, muzzle, mouth);

      for (const es of [-1, 1]) {
        const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), furMat);
        earOuter.scale.set(0.45, 1.0, 0.88);
        earOuter.position.set(es * 0.26, 0.02, -0.01);
        const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skinMat);
        earInner.scale.set(0.4, 0.9, 0.7);
        earInner.position.set(es * 0.27, 0.02, 0.015);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), eyeMat);
        eye.position.set(es * 0.085, 0.055, 0.22);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), glintMat);
        glint.position.set(es * 0.092, 0.068, 0.252);
        headGroup.add(earOuter, earInner, eye, glint);
      }
      monkeyRoot.add(headGroup);

      // Left arm bracing on branch
      const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.28, 6, 10), furMat);
      leftArm.position.set(-0.26, 0.34, 0.1);
      leftArm.rotation.z = 0.25;
      leftArm.rotation.x = 0.45;
      monkeyRoot.add(leftArm);

      // Right arm pivot holding & eating/throwing a bright yellow Banana!
      const throwArmPivot = new THREE.Group();
      throwArmPivot.position.set(0.24, 0.50, 0.04);
      const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.28, 6, 10), furMat);
      rightArm.position.set(0, -0.14, 0.04);
      rightArm.rotation.x = 0.35;
      const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMat);
      rightHand.position.set(0, -0.28, 0.14);

      const handBanana = this.createBananaMesh(1.18);
      handBanana.position.set(-0.04, -0.32, 0.24);
      handBanana.rotation.set(0.5, 0.4, -0.3);
      throwArmPivot.add(rightArm, rightHand, handBanana);
      monkeyRoot.add(throwArmPivot);

      this.levelGroup.add(monkeyRoot);
      this.monkeys.push({
        root: monkeyRoot,
        headGroup,
        throwArmPivot,
        handBanana,
        pos: monkeyPos,
        side,
        canThrow: i === throwerIdx,
        hasThrown: false,
        throwCooldown: 0,
        windupTimer: 0,
        phase: i * 1.4,
      });
    }
  }

  private spawnThrownBanana(m: JungleMonkey, px: number, py: number, pz: number) {
    const startPos = new THREE.Vector3(m.pos.x, m.pos.y + 0.85, m.pos.z + 0.2);
    const dist = Math.hypot(px - startPos.x, pz - startPos.z);
    const flightTime = THREE.MathUtils.clamp(dist / 13.5, 0.58, 0.95);

    const targetX = px + this.playerBody.velocity.x * flightTime * 0.38;
    const targetY = py + 0.35;
    const targetZ = pz + this.playerBody.velocity.z * flightTime * 0.65;

    const gravity = -18;
    const vx = (targetX - startPos.x) / flightTime;
    const vz = (targetZ - startPos.z) / flightTime;
    const vy = (targetY - startPos.y - 0.5 * gravity * flightTime * flightTime) / flightTime;

    const bananaMesh = this.createBananaMesh(1.65);
    bananaMesh.position.copy(startPos);
    this.levelGroup.add(bananaMesh);

    this.thrownBananas.push({
      mesh: bananaMesh,
      pos: startPos,
      vel: new THREE.Vector3(vx, vy, vz),
      life: 3.0,
    });
  }

  public triggerJump(inputJumpPressed: boolean) {
    if (inputJumpPressed) {
      this.jumpBufferTimer = 0.14;
    }
  }

  public fireBlasterProjectile() {
    if (this.activePowerUp !== 'blaster' || this.fireCooldown > 0) return;
    this.fireCooldown = 0.25;
    soundEngine.shoot();

    const geo = new THREE.SphereGeometry(0.24, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf97316,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const startPos = new THREE.Vector3(
      this.playerBody.position.x + 0.28,
      this.playerBody.position.y + 0.35,
      this.playerBody.position.z - 0.65
    );
    mesh.position.copy(startPos);
    this.levelGroup.add(mesh);

    this.projectiles.push({
      mesh,
      pos: startPos,
      vel: new THREE.Vector3(0, 0, -29),
      life: 1.4,
    });
  }

  private createSkyBirdMesh(
    bodyHex: number,
    wingTipHex: number,
    scale: number
  ): { root: THREE.Group; leftWingPivot: THREE.Group; rightWingPivot: THREE.Group } {
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.42 });
    const breastMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
    const tipMat = new THREE.MeshStandardMaterial({ color: wingTipHex, roughness: 0.45 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Streamlined body pointing toward -Z
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), bodyMat);
    body.scale.set(0.78, 0.72, 1.95);
    body.castShadow = true;

    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), breastMat);
    breast.scale.set(0.75, 0.6, 1.4);
    breast.position.set(0, -0.05, -0.04);

    // Sculpted head + beak facing -Z
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), bodyMat);
    head.position.set(0, 0.08, -0.40);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 8), beakMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.06, -0.56);
    root.add(body, breast, head, beak);

    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(sx * 0.095, 0.11, -0.45);
      root.add(eye);
    }

    // Fanned tail feathers at +Z
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), tipMat);
    tail.rotation.x = Math.PI / 2;
    tail.scale.set(1.3, 1.0, 0.18);
    tail.position.set(0, 0.02, 0.55);
    root.add(tail);

    // Articulated Left & Right Wings
    const buildWing = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.14, 0.05, -0.05);

      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.34), bodyMat);
      inner.position.set(side * 0.28, 0, 0.02);
      inner.rotation.y = side * -0.18;
      inner.castShadow = true;

      const outer = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.032, 0.22), tipMat);
      outer.position.set(side * 0.72, 0, 0.12);
      outer.rotation.y = side * -0.36;
      outer.castShadow = true;

      pivot.add(inner, outer);
      return pivot;
    };

    const leftWingPivot = buildWing(-1);
    const rightWingPivot = buildWing(1);
    root.add(leftWingPivot, rightWingPivot);
    root.scale.setScalar(scale);

    return { root, leftWingPivot, rightWingPivot };
  }

  private spawnSkyBirdFlock(px: number, py: number, pz: number) {
    const biomeColors: Array<[number, number]> =
      this.spec.biome === 'volcano'
        ? [
            [0x78350f, 0xf59e0b],
            [0x57534e, 0xfb923c],
          ]
        : this.spec.biome === 'ruins'
        ? [
            [0x0284c7, 0xfde047],
            [0xb45309, 0xfef08a],
          ]
        : [
            [0xef4444, 0x3b82f6],
            [0x10b981, 0xfacc15],
            [0x0ea5e9, 0xfbbf24],
          ];

    const flockOffsets = [
      { dx: 0, dy: 6.4, dz: 12.2, scale: 1.15 },
      { dx: -1.65, dy: 6.7, dz: 13.8, scale: 1.05 },
      { dx: 1.7, dy: 6.6, dz: 14.1, scale: 1.08 },
      { dx: -3.2, dy: 7.1, dz: 15.6, scale: 0.96 },
      { dx: 3.3, dy: 7.0, dz: 15.9, scale: 1.0 },
      { dx: 0.4, dy: 7.5, dz: 17.1, scale: 0.92 },
    ];

    flockOffsets.forEach((f, idx) => {
      const [bodyHex, tipHex] = biomeColors[idx % biomeColors.length];
      const { root, leftWingPivot, rightWingPivot } = this.createSkyBirdMesh(
        bodyHex,
        tipHex,
        f.scale
      );
      const pos = new THREE.Vector3(px + f.dx, py + f.dy, pz + f.dz);
      root.position.copy(pos);
      this.levelGroup.add(root);

      this.skyBirds.push({
        root,
        leftWingPivot,
        rightWingPivot,
        pos,
        vel: new THREE.Vector3(
          Math.sign(f.dx) * 0.42 + (idx % 2 === 0 ? 0.12 : -0.12),
          1.45 + (idx % 3) * 0.18,
          -25.5 - (idx % 3) * 1.1
        ),
        flapSpeed: 13.5 + (idx % 3) * 1.6,
        phase: idx * 1.1,
        life: 4.5,
      });
    });

    soundEngine.birdFlockFlyover();
  }

  public step(
    dt: number,
    input: InputState,
    trailColorHex: number,
    callbacks: {
      onCoin: (amount: number) => void;
      onHurt: () => void;
      onGoal: () => void;
      onPowerUp: (type: PowerUpType) => void;
      onFellInChasm: () => void;
      onBoxHit?: () => void;
      onEnemyDefeated?: () => void;
    }
  ): { speedHoriz: number; velY: number; strafeVelX: number; footY: number } {
    const clampedDt = Math.min(dt, 0.05);
    this.elapsed += clampedDt;
    this.textures.waterTexture.offset.y -= clampedDt * 0.08;
    for (const s of this.swayNodes) {
      s.obj.rotation.z = s.baseRotZ + Math.sin(this.elapsed * s.speed + s.phase) * 0.075;
      s.obj.rotation.x = s.baseRotX + Math.cos(this.elapsed * s.speed * 0.8 + s.phase) * 0.05;
    }
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - clampedDt);
    if (this.flipAnimTimer > 0) this.flipAnimTimer = Math.max(0, this.flipAnimTimer - clampedDt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - clampedDt);
    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= clampedDt;
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null;
      }
    }

    if (input.firePressed) {
      this.fireBlasterProjectile();
    }

    // 1. Update Moving & Crumbling Platforms BEFORE physics step
    for (const p of this.platforms) {
      p.prevPos.copy(p.mesh.position);
      if (p.spec.kind === 'moving' && p.spec.moveRange && p.spec.moveSpeed) {
        const offset = Math.sin(this.elapsed * p.spec.moveSpeed) * p.spec.moveRange;
        const nx = p.basePos.x + (p.spec.moveAxis === 'x' ? offset : 0);
        const ny = p.basePos.y + (p.spec.moveAxis === 'y' ? offset : 0);
        const nz = p.basePos.z + (p.spec.moveAxis === 'z' ? offset : 0);
        p.mesh.position.set(nx, ny, nz);
        p.body.position.set(nx, ny, nz);
      } else if (p.spec.kind === 'crumbling') {
        if (p.crumbleState === 'shaking') {
          p.crumbleTimer -= clampedDt;
          p.mesh.position.x = p.basePos.x + Math.sin(this.elapsed * 48) * 0.08;
          if (p.crumbleTimer <= 0) {
            p.crumbleState = 'fallen';
            p.crumbleTimer = 3.2;
            p.mesh.visible = false;
            p.body.collisionResponse = false;
            p.body.position.set(p.basePos.x, p.basePos.y - 60, p.basePos.z);
          }
        } else if (p.crumbleState === 'fallen') {
          p.crumbleTimer -= clampedDt;
          if (p.crumbleTimer <= 0) {
            p.crumbleState = 'solid';
            p.mesh.visible = true;
            p.body.collisionResponse = true;
            p.mesh.position.copy(p.basePos);
            p.body.position.set(p.basePos.x, p.basePos.y, p.basePos.z);
          }
        }
      }
    }

    // Carry player with standing moving platform
    if (this.grounded && this.standingPlatform && this.standingPlatform.spec.kind === 'moving') {
      const dx = this.standingPlatform.mesh.position.x - this.standingPlatform.prevPos.x;
      const dy = this.standingPlatform.mesh.position.y - this.standingPlatform.prevPos.y;
      const dz = this.standingPlatform.mesh.position.z - this.standingPlatform.prevPos.z;
      this.playerBody.position.x += dx;
      this.playerBody.position.y += dy;
      this.playerBody.position.z += dz;
    }

    // 2. Player Horizontal Physics Control (Mario-style weighty acceleration + friction)
    const speedBoost = this.activePowerUp === 'speed' ? 1.38 : 1.0;
    const maxForwardSpeed = (input.sprint ? 13.4 : 11.2) * speedBoost;
    const maxStrafeSpeed = 7.8 * speedBoost;

    let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let moveZ = 0;
    if (input.autoRun || input.sprint) {
      moveZ = -1;
      if (input.backward) moveZ = input.sprint ? -0.5 : -0.35;
    } else {
      moveZ = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
    }

    const onIce = this.standingPlatform?.spec.kind === 'ice';
    const accelGround = onIce ? 14 : 44;
    const accelAir = 22;
    const accel = this.grounded ? accelGround : accelAir;

    const targetVx = moveX * maxStrafeSpeed;
    const targetVz = moveZ * maxForwardSpeed;

    const blend = Math.min(1, accel * clampedDt * (onIce ? 0.25 : 0.45));
    this.playerBody.velocity.x = THREE.MathUtils.lerp(this.playerBody.velocity.x, targetVx, blend);
    this.playerBody.velocity.z = THREE.MathUtils.lerp(this.playerBody.velocity.z, targetVz, blend);

    // 3. Jump & Double Jump with Coyote Time & Buffer
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= clampedDt;
    if (this.grounded) {
      this.coyoteTimer = 0.13;
      this.jumpsUsed = 0;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= clampedDt;
    }

    if (this.jumpBufferTimer > 0) {
      if (this.coyoteTimer > 0) {
        this.playerBody.velocity.y = 12.6;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpsUsed = 1;
        soundEngine.jump();
        this.spawnBurst(
          new THREE.Vector3(this.playerBody.position.x, this.playerBody.position.y - 0.3, this.playerBody.position.z),
          0xe7e5e4,
          6
        );
      } else if (this.jumpsUsed < 2) {
        this.playerBody.velocity.y = 11.4;
        this.jumpBufferTimer = 0;
        this.jumpsUsed = 2;
        this.flipAnimTimer = 0.42;
        soundEngine.doubleJump();
        this.spawnBurst(
          new THREE.Vector3(this.playerBody.position.x, this.playerBody.position.y - 0.2, this.playerBody.position.z),
          trailColorHex,
          9
        );
      }
    }

    // Variable jump cut if player releases jump button mid-ascent
    if (!input.jumpHeld && this.playerBody.velocity.y > 5.5) {
      this.playerBody.velocity.y *= 0.88;
    }

    // 4. Step Cannon-ES Physics World
    this.world.step(1 / 60, clampedDt, 4);

    // 5. Ground Check via Raycast + Contact Inspection
    const footY = this.playerBody.position.y - this.playerRadius;
    const rayFrom = new CANNON.Vec3(
      this.playerBody.position.x,
      this.playerBody.position.y,
      this.playerBody.position.z
    );
    const rayTo = new CANNON.Vec3(
      this.playerBody.position.x,
      this.playerBody.position.y - this.playerRadius - 0.16,
      this.playerBody.position.z
    );
    const rayResult = new CANNON.RaycastResult();
    this.world.raycastClosest(rayFrom, rayTo, { skipBackfaces: true }, rayResult);

    this.grounded = false;
    this.standingPlatform = null;
    if (rayResult.hasHit && this.playerBody.velocity.y <= 2.5 && rayResult.hitNormalWorld.y > 0.55) {
      this.grounded = true;
      const hitBody = rayResult.body;
      const plat = this.platforms.find((pl) => pl.body === hitBody) || null;
      this.standingPlatform = plat;
      if (plat && plat.spec.kind === 'crumbling' && plat.crumbleState === 'solid') {
        plat.crumbleState = 'shaking';
        plat.crumbleTimer = 0.65;
      }
      this.stompCombo = 0;
    }

    // 6. Update Obstacles & Collisions
    const px = this.playerBody.position.x;
    const py = this.playerBody.position.y;
    const pz = this.playerBody.position.z;

    for (const o of this.obstacles) {
      if (!o.alive) continue;
      // Hide any block or obstacle immediately once the player crosses past it (moving toward -Z)
      const crossMargin = o.spec.kind === 'sweeper' ? 2.2 : 1.05;
      if (o.basePos.z > pz + crossMargin) {
        o.alive = false;
        o.mesh.visible = false;
        if (o.body) {
          this.world.removeBody(o.body);
          o.body = undefined;
        }
        continue;
      }
      if (o.hitCooldown > 0) o.hitCooldown -= clampedDt;
      if (o.bounceAnim > 0) {
        o.bounceAnim = Math.max(0, o.bounceAnim - clampedDt * 5);
      }

      if (o.spec.kind === 'mystery_block' || o.spec.kind === 'coin_box') {
        const blockMesh = o.mesh.children[0];
        if (blockMesh) {
          blockMesh.position.y = Math.sin(o.bounceAnim * Math.PI) * 0.35;
        }
        // Bump from underneath!
        if (
          !o.used &&
          o.hitCooldown <= 0 &&
          Math.abs(px - o.basePos.x) < 1.0 &&
          Math.abs(pz - o.basePos.z) < 1.0 &&
          py < o.basePos.y - 0.4 &&
          py > o.basePos.y - 1.45 &&
          this.playerBody.velocity.y > 0
        ) {
          o.bounceAnim = 1;
          o.hitCooldown = 0.25;
          this.playerBody.velocity.y = -2;
          soundEngine.mysteryBlock();
          this.spawnBurst(new THREE.Vector3(o.basePos.x, o.basePos.y + 0.8, o.basePos.z), 0xfacc15, 14);
          callbacks.onBoxHit?.();

          if (o.spec.kind === 'coin_box') {
            o.hitsLeft = (o.hitsLeft ?? 1) - 1;
            callbacks.onCoin(3);
            if (o.hitsLeft <= 0) {
              o.used = true;
            }
          } else {
            o.used = true;
            if (o.spec.reward === 'coins' || !o.spec.reward) {
              callbacks.onCoin(5);
            } else {
              this.activePowerUp = o.spec.reward;
              this.powerUpTimer = o.spec.reward === 'blaster' ? 18 : 11;
              soundEngine.powerUp();
              callbacks.onPowerUp(o.spec.reward);
            }
          }

          // Pop & award any bonus coin perched directly on top of this block so none are ever unreachable
          for (const c of this.coins) {
            if (
              !c.collected &&
              Math.abs(c.pos.x - o.basePos.x) < 1.25 &&
              Math.abs(c.pos.z - o.basePos.z) < 1.25 &&
              c.pos.y > o.basePos.y &&
              c.pos.y < o.basePos.y + 2.2
            ) {
              c.collected = true;
              c.mesh.visible = false;
              soundEngine.coin();
              this.spawnBurst(c.pos, 0xfacc15, 7);
              callbacks.onCoin(c.value);
            }
          }

          if (o.used && blockMesh && (blockMesh as THREE.Mesh).isMesh) {
            const m = (blockMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
            m.color.setHex(0x78350f);
            m.map = null;
            m.needsUpdate = true;
          }
        }
      } else if (o.spec.kind === 'power_mushroom') {
        o.mesh.rotation.y = this.elapsed * 2.2;
        o.mesh.position.y = o.basePos.y + Math.sin(this.elapsed * 3.5) * 0.1;
        if (Math.hypot(px - o.basePos.x, pz - o.basePos.z) < 1.05 && Math.abs(footY - o.basePos.y) < 1.2) {
          o.alive = false;
          o.mesh.visible = false;
          this.activePowerUp = 'blaster';
          this.powerUpTimer = 18;
          soundEngine.powerUp();
          this.spawnBurst(new THREE.Vector3(o.basePos.x, o.basePos.y + 0.6, o.basePos.z), 0xef4444, 16);
          callbacks.onPowerUp('blaster');
        }
      } else if (o.spec.kind === 'crate') {
        if (
          Math.abs(px - o.basePos.x) < 0.9 &&
          Math.abs(pz - o.basePos.z) < 0.9 &&
          footY >= o.basePos.y + 0.95 &&
          footY <= o.basePos.y + 1.45 &&
          this.playerBody.velocity.y <= 0.5
        ) {
          o.alive = false;
          o.mesh.visible = false;
          if (o.body) this.world.removeBody(o.body);
          this.playerBody.velocity.y = 10.2;
          soundEngine.stomp();
          this.spawnBurst(new THREE.Vector3(o.basePos.x, o.basePos.y + 0.6, o.basePos.z), 0xb45309, 12);
          callbacks.onCoin(2);
          callbacks.onEnemyDefeated?.();
        }
      } else if (o.spec.kind === 'bounce_mushroom') {
        o.mesh.scale.setScalar(1 + Math.sin(o.bounceAnim * Math.PI) * 0.28);
        if (
          Math.abs(px - o.basePos.x) < 1.15 &&
          Math.abs(pz - o.basePos.z) < 1.15 &&
          footY >= o.basePos.y + 0.3 &&
          footY <= o.basePos.y + 1.2 &&
          this.playerBody.velocity.y <= 1.0
        ) {
          this.playerBody.velocity.y = 18.8;
          this.jumpsUsed = 1;
          o.bounceAnim = 1;
          soundEngine.bouncePad();
          this.spawnBurst(new THREE.Vector3(o.basePos.x, o.basePos.y + 1.0, o.basePos.z), 0xfef08a, 10);
        }
      } else if (o.spec.kind === 'crab' || o.spec.kind === 'beetle') {
        const range = o.spec.patrolRange ?? 1.8;
        const spd = (o.spec.speed ?? 1.4) * 1.4;
        const nx = o.basePos.x + Math.sin(this.elapsed * spd + (o.spec.phase ?? 0)) * range;
        o.mesh.position.x = nx;
        const distXZ = Math.hypot(px - nx, pz - o.basePos.z);
        if (distXZ < 0.92 && Math.abs(footY - o.basePos.y) < 1.05) {
          if (this.playerBody.velocity.y < -0.5 && footY > o.basePos.y + 0.28) {
            // Mario stomp!
            o.alive = false;
            o.mesh.visible = false;
            this.playerBody.velocity.y = 12.2;
            this.jumpsUsed = 1;
            this.stompCombo++;
            soundEngine.stomp();
            this.spawnBurst(new THREE.Vector3(nx, o.basePos.y + 0.4, o.basePos.z), 0xf87171, 14);
            callbacks.onCoin(2 + this.stompCombo);
            callbacks.onEnemyDefeated?.();
          } else if (o.hitCooldown <= 0) {
            o.hitCooldown = 0.8;
            this.handlePlayerHazardHit(new THREE.Vector3(nx, o.basePos.y + 0.5, o.basePos.z), callbacks.onHurt);
          }
        }
      } else if (o.spec.kind === 'log') {
        const logHalfW = Math.min(3.4, (o.spec.width ?? 6) * 0.52) * 0.5;
        if (
          Math.abs(px - o.basePos.x) < logHalfW + 0.35 &&
          Math.abs(pz - o.basePos.z) < 0.72 &&
          footY < o.basePos.y + 0.82 &&
          o.hitCooldown <= 0
        ) {
          o.hitCooldown = 0.7;
          this.handlePlayerHazardHit(new THREE.Vector3(px, o.basePos.y + 0.4, o.basePos.z), callbacks.onHurt);
        }
      } else if (o.spec.kind === 'pendulum' && o.armMesh) {
        const swingAngle = Math.sin(this.elapsed * (1.8 + (o.spec.speed ?? 1) * 0.45) + (o.spec.phase ?? 0)) * 1.05;
        o.armMesh.rotation.z = swingAngle;
        const maceX = o.basePos.x + Math.sin(swingAngle) * 3.65;
        const maceY = o.basePos.y + 4.55 - Math.cos(swingAngle) * 3.65;
        if (
          Math.hypot(px - maceX, py - maceY) < 0.95 &&
          Math.abs(pz - o.basePos.z) < 0.95 &&
          o.hitCooldown <= 0
        ) {
          o.hitCooldown = 0.8;
          this.handlePlayerHazardHit(new THREE.Vector3(maceX, maceY, o.basePos.z), callbacks.onHurt);
        }
      } else if (o.spec.kind === 'sweeper' && o.armMesh) {
        const rotY = this.elapsed * (1.6 + (o.spec.speed ?? 1) * 0.65) + (o.spec.phase ?? 0);
        o.armMesh.rotation.y = rotY;
        const halfBar = Math.min(4.6, (o.spec.width ?? 5) * 0.72) * 0.5;
        // Distance to rotating line segment in XZ
        const dirX = Math.cos(rotY);
        const dirZ = -Math.sin(rotY);
        const relX = px - o.basePos.x;
        const relZ = pz - o.basePos.z;
        const proj = THREE.MathUtils.clamp(relX * dirX + relZ * dirZ, -halfBar, halfBar);
        const closestX = o.basePos.x + dirX * proj;
        const closestZ = o.basePos.z + dirZ * proj;
        if (
          Math.hypot(px - closestX, pz - closestZ) < 0.55 &&
          footY < o.basePos.y + 0.88 &&
          o.hitCooldown <= 0
        ) {
          o.hitCooldown = 0.7;
          this.handlePlayerHazardHit(new THREE.Vector3(closestX, o.basePos.y + 0.6, closestZ), callbacks.onHurt);
        }
      } else if (o.spec.kind === 'boulder_chute') {
        // Spawn boulders periodically ahead of the player
        const distZ = o.basePos.z - pz; // negative when obstacle is ahead (-Z)
        if (distZ < -6 && distZ > -38 && this.boulderSpawnTimer <= 0) {
          this.spawnBoulder(new THREE.Vector3(o.basePos.x, o.basePos.y, o.basePos.z - 5));
          this.boulderSpawnTimer = Math.max(0.85, 2.2 - this.spec.boulderRate);
        }
      }
    }

    if (this.boulderSpawnTimer > 0) this.boulderSpawnTimer -= clampedDt;

    // 7. Update Dynamic Rolling Boulders
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.life -= clampedDt;
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(
        b.body.quaternion.x,
        b.body.quaternion.y,
        b.body.quaternion.z,
        b.body.quaternion.w
      );

      if (
        Math.hypot(px - b.body.position.x, py - b.body.position.y, pz - b.body.position.z) <
        this.playerRadius + 0.65
      ) {
        this.handlePlayerHazardHit(
          new THREE.Vector3(b.body.position.x, b.body.position.y, b.body.position.z),
          callbacks.onHurt
        );
        b.life = 0;
      }

      if (b.body.position.z > pz + 1.15) {
        b.life = 0;
      }

      if (b.life <= 0 || b.body.position.y < -22) {
        this.levelGroup.remove(b.mesh);
        this.world.removeBody(b.body);
        this.boulders.splice(i, 1);
      }
    }

    // 7b. Update Monkey Eating & Single Banana-Throw Behavior
    for (const m of this.monkeys) {
      if (m.throwCooldown > 0) m.throwCooldown -= clampedDt;
      const dzAhead = pz - m.pos.z; // positive when monkey is ahead of player
      const nearRange = dzAhead > 2.2 && dzAhead < 17.5;

      // Always turn smoothly to look at the player using shortest-angle yaw
      const aimYaw = Math.atan2(px - m.pos.x, pz - m.pos.z);
      let yawDiff = aimYaw - m.root.rotation.y;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      m.root.rotation.y += yawDiff * Math.min(1, clampedDt * (m.windupTimer > 0 ? 10 : 5.5));

      if (m.windupTimer > 0) {
        m.windupTimer -= clampedDt;
        const windT = 1 - m.windupTimer / 0.3;
        m.throwArmPivot.rotation.x = THREE.MathUtils.lerp(-0.4, -2.35, Math.sin(windT * Math.PI * 0.72));
        m.headGroup.rotation.x = 0.06;
        m.headGroup.rotation.y = 0;

        if (m.windupTimer <= 0) {
          m.handBanana.visible = false;
          m.throwArmPivot.rotation.x = 0.65;
          m.hasThrown = true;
          m.throwCooldown = 0.75;
          this.spawnThrownBanana(m, px, py + 0.4, pz);
          soundEngine.monkeyChirp();
        }
      } else {
        // Eating banana on the tree limb while watching the player
        const eatCycle = this.elapsed * 5.2 + m.phase;
        const munch = Math.sin(eatCycle);
        m.handBanana.visible = m.throwCooldown <= 0;
        m.throwArmPivot.rotation.x = -1.38 + munch * 0.32;
        m.throwArmPivot.rotation.z = m.side * -0.25;

        const horizDist = Math.max(1.5, Math.hypot(px - m.pos.x, pz - m.pos.z));
        const lookPitch = THREE.MathUtils.clamp(Math.atan2((m.pos.y + 0.85) - (py + 0.7), horizDist) * 0.55, -0.15, 0.45);
        m.headGroup.rotation.x = lookPitch + Math.abs(munch) * 0.14;
        m.headGroup.rotation.y = 0;

        if (m.canThrow && !m.hasThrown && !this.levelMonkeyThrowUsed && nearRange) {
          m.hasThrown = true;
          this.levelMonkeyThrowUsed = true;
          m.windupTimer = 0.3;
        }
      }
    }

    // 7c. Update Thrown Banana Projectiles
    for (let i = this.thrownBananas.length - 1; i >= 0; i--) {
      const tb = this.thrownBananas[i];
      tb.life -= clampedDt;
      tb.vel.y -= 18 * clampedDt;
      tb.pos.addScaledVector(tb.vel, clampedDt);
      tb.mesh.position.copy(tb.pos);
      tb.mesh.rotation.x += clampedDt * 12;
      tb.mesh.rotation.z += clampedDt * 8;

      let removeBanana = false;
      if (Math.hypot(px - tb.pos.x, py + 0.3 - tb.pos.y, pz - tb.pos.z) < this.playerRadius + 0.45) {
        this.handlePlayerHazardHit(tb.pos, callbacks.onHurt);
        this.spawnBurst(tb.pos, 0xfacc15, 10);
        removeBanana = true;
      } else if (tb.pos.z > pz + 1.15 || tb.life <= 0 || tb.pos.y < -10) {
        removeBanana = true;
      }

      if (removeBanana) {
        this.levelGroup.remove(tb.mesh);
        tb.mesh.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        });
        this.thrownBananas.splice(i, 1);
      }
    }

    // 7d. Update Blaster Fireball Projectiles & Blast Obstacles!
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= clampedDt;
      pr.pos.addScaledVector(pr.vel, clampedDt);
      pr.mesh.position.copy(pr.pos);

      let hit = false;
      // Check against obstacles (logs, crates, crabs, beetles)
      for (const o of this.obstacles) {
        if (!o.alive) continue;
        if (
          o.spec.kind === 'log' ||
          o.spec.kind === 'crate' ||
          o.spec.kind === 'crab' ||
          o.spec.kind === 'beetle'
        ) {
          const ox = o.mesh.position.x;
          const oy = o.basePos.y + 0.5;
          const oz = o.basePos.z;
          const hitW = o.spec.kind === 'log' ? 2.0 : 1.1;
          if (
            Math.abs(pr.pos.x - ox) < hitW &&
            Math.abs(pr.pos.y - oy) < 1.2 &&
            Math.abs(pr.pos.z - oz) < 1.1
          ) {
            o.alive = false;
            o.mesh.visible = false;
            if (o.body) this.world.removeBody(o.body);
            soundEngine.stomp();
            this.spawnBurst(new THREE.Vector3(ox, oy, oz), 0xf97316, 14);
            callbacks.onCoin(2);
            callbacks.onEnemyDefeated?.();
            hit = true;
            break;
          }
        }
      }

      // Check against rolling boulders
      if (!hit) {
        for (let bIdx = this.boulders.length - 1; bIdx >= 0; bIdx--) {
          const b = this.boulders[bIdx];
          if (
            Math.hypot(
              pr.pos.x - b.body.position.x,
              pr.pos.y - b.body.position.y,
              pr.pos.z - b.body.position.z
            ) < 1.1
          ) {
            soundEngine.stomp();
            this.spawnBurst(
              new THREE.Vector3(b.body.position.x, b.body.position.y, b.body.position.z),
              0xf97316,
              16
            );
            this.levelGroup.remove(b.mesh);
            this.world.removeBody(b.body);
            this.boulders.splice(bIdx, 1);
            callbacks.onCoin(3);
            callbacks.onEnemyDefeated?.();
            hit = true;
            break;
          }
        }
      }

      // Check against thrown monkey bananas
      if (!hit) {
        for (let tbIdx = this.thrownBananas.length - 1; tbIdx >= 0; tbIdx--) {
          const tb = this.thrownBananas[tbIdx];
          if (Math.hypot(pr.pos.x - tb.pos.x, pr.pos.y - tb.pos.y, pr.pos.z - tb.pos.z) < 0.95) {
            soundEngine.stomp();
            this.spawnBurst(tb.pos, 0xfacc15, 10);
            this.levelGroup.remove(tb.mesh);
            tb.mesh.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) {
                const m = obj as THREE.Mesh;
                m.geometry.dispose();
                (m.material as THREE.Material).dispose();
              }
            });
            this.thrownBananas.splice(tbIdx, 1);
            callbacks.onCoin(2);
            callbacks.onEnemyDefeated?.();
            hit = true;
            break;
          }
        }
      }

      if (hit || pr.life <= 0) {
        this.levelGroup.remove(pr.mesh);
        pr.mesh.geometry.dispose();
        (pr.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // 8. Collect Coins (with Magnet pull!)
    const magnetRange = this.activePowerUp === 'magnet' ? 7.5 : 0;
    for (const c of this.coins) {
      if (c.collected) continue;
      c.mesh.rotation.y = this.elapsed * 3.2 + c.spinOffset;
      const dx = px - c.pos.x;
      const dy = py + 0.5 - c.pos.y;
      const dz = pz - c.pos.z;
      const d = Math.hypot(dx, dy, dz);

      if (magnetRange > 0 && d < magnetRange && d > 0.05) {
        const pull = Math.min(1, clampedDt * 9);
        c.pos.x += dx * pull;
        c.pos.y += dy * pull;
        c.pos.z += dz * pull;
        c.mesh.position.copy(c.pos);
      } else {
        c.mesh.position.y = c.pos.y + Math.sin(this.elapsed * 3 + c.spinOffset) * 0.12;
      }

      if (d < 1.15) {
        c.collected = true;
        c.mesh.visible = false;
        soundEngine.coin();
        this.spawnBurst(c.pos, 0xfacc15, 6);
        callbacks.onCoin(c.value);
      }
    }

    // 9. Update Particle Bursts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= clampedDt;
      pt.vel.y -= 16 * clampedDt;
      pt.mesh.position.addScaledVector(pt.vel, clampedDt);
      const s = Math.max(0.01, pt.life / pt.maxLife);
      pt.mesh.scale.setScalar(s);
      if (pt.life <= 0) {
        this.levelGroup.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 9b. Trigger & Animate Sky Bird Flock Flyover from behind character (once per level)
    if (!this.birdFlyoverTriggered && pz < -22) {
      this.birdFlyoverTriggered = true;
      this.spawnSkyBirdFlock(px, py, pz);
    }

    for (let i = this.skyBirds.length - 1; i >= 0; i--) {
      const sb = this.skyBirds[i];
      sb.life -= clampedDt;
      sb.pos.addScaledVector(sb.vel, clampedDt);
      sb.pos.y += Math.sin(this.elapsed * 2.4 + sb.phase) * 0.015;
      sb.root.position.copy(sb.pos);
      sb.root.rotation.x = 0.12;
      sb.root.rotation.z = Math.sin(this.elapsed * 1.8 + sb.phase) * 0.09;

      const flap = Math.sin(this.elapsed * sb.flapSpeed + sb.phase) * 0.68;
      sb.leftWingPivot.rotation.z = flap;
      sb.rightWingPivot.rotation.z = -flap;

      if (sb.life <= 0 || sb.pos.z < pz - 75) {
        this.levelGroup.remove(sb.root);
        sb.root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        });
        this.skyBirds.splice(i, 1);
      }
    }

    // 10. Check Goal Arch & Chasm Fall
    if (pz <= this.spec.goalZ + 1.5 && Math.abs(px) < 4.5 && Math.abs(footY - this.spec.goalY) < 4.0) {
      soundEngine.levelClear();
      callbacks.onGoal();
    } else if (footY < -14) {
      soundEngine.hurt();
      callbacks.onFellInChasm();
    }

    return {
      speedHoriz: Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.z),
      velY: this.playerBody.velocity.y,
      strafeVelX: this.playerBody.velocity.x,
      footY,
    };
  }

  private handlePlayerHazardHit(hazardPos: THREE.Vector3, onHurt: () => void) {
    if (this.invulnTimer > 0) return;

    // Knockback impulse away from hazard
    const dx = this.playerBody.position.x - hazardPos.x;
    const dz = this.playerBody.position.z - hazardPos.z;
    const len = Math.max(0.1, Math.hypot(dx, dz));
    this.playerBody.velocity.x = (dx / len) * 6.5;
    this.playerBody.velocity.z = (dz / len) * 5.0 + 3.5;
    this.playerBody.velocity.y = 7.5;

    if (this.activePowerUp === 'shield') {
      this.activePowerUp = null;
      this.powerUpTimer = 0;
      this.invulnTimer = 1.4;
      soundEngine.stomp();
      this.spawnBurst(
        new THREE.Vector3(this.playerBody.position.x, this.playerBody.position.y + 0.6, this.playerBody.position.z),
        0x38bdf8,
        16
      );
      return;
    }

    this.invulnTimer = 1.6;
    soundEngine.hurt();
    this.spawnBurst(
      new THREE.Vector3(this.playerBody.position.x, this.playerBody.position.y + 0.6, this.playerBody.position.z),
      0xef4444,
      12
    );
    onHurt();
  }

  public respawnOnNearestSafePlatform() {
    let bestPlat = this.platforms[0];
    let bestDist = Infinity;
    const pz = this.playerBody.position.z;
    for (const p of this.platforms) {
      if (p.spec.kind === 'crumbling' || p.spec.kind === 'moving') continue;
      if (p.basePos.z >= pz - 2) {
        const d = Math.abs(p.basePos.z - pz);
        if (d < bestDist) {
          bestDist = d;
          bestPlat = p;
        }
      }
    }
    this.playerBody.position.set(
      bestPlat.basePos.x,
      bestPlat.basePos.y + bestPlat.spec.height * 0.5 + 1.5,
      bestPlat.basePos.z + bestPlat.spec.depth * 0.2
    );
    this.playerBody.velocity.set(0, 0, 0);
    this.invulnTimer = 1.6;
  }

  public dispose() {
    this.coinGeo.dispose();
    this.coinMat.dispose();
    this.particleGeo.dispose();
    this.levelGroup.traverse((obj) => {
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
  }
}
