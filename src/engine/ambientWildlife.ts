import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { BiomeType } from '../types/game';

export interface WildlifeAnchor {
  x: number;
  y: number;
  z: number;
  side: number; // -1 left edge, 1 right edge
  hasFlower: boolean;
  platformKind: string;
}

type WildlifeKind = 'parrot' | 'butterfly' | 'hummingbird';

interface WildlifeAgent {
  kind: WildlifeKind;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group | null;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  anchorPos: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  side: number;
  baseYaw: number;
  baseScale: number;
  phase: number;
  orbitFreq: number;
  orbitRadius: number;
  flapRateIdle: number;
  flapRateScatter: number;
  scatterRadius: number;
  state: 'idle' | 'scattering' | 'gone';
  scatterElapsed: number;
  scatterDuration: number;
  hopTimer: number;
  hopHeight: number;
}

const _deltaVec = new THREE.Vector3();

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class AmbientWildlifeSystem {
  public readonly group = new THREE.Group();
  private agents: WildlifeAgent[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  // Shared geometries
  private parrotBodyGeo: THREE.SphereGeometry;
  private parrotBreastGeo: THREE.SphereGeometry;
  private parrotHeadGeo: THREE.SphereGeometry;
  private parrotCrestGeo: THREE.ConeGeometry;
  private parrotBeakGeo: THREE.ConeGeometry;
  private parrotEyeGeo: THREE.SphereGeometry;
  private parrotTailGeo: THREE.ConeGeometry;
  private parrotInnerWingGeo: THREE.BoxGeometry;
  private parrotOuterWingGeo: THREE.BoxGeometry;
  private parrotFootGeo: THREE.CylinderGeometry;

  private butterflyBodyGeo: THREE.CapsuleGeometry;
  private butterflyAntennaGeo: THREE.CylinderGeometry;
  private butterflyForewingGeo: THREE.ShapeGeometry;
  private butterflyHindwingGeo: THREE.ShapeGeometry;

  private humBodyGeo: THREE.SphereGeometry;
  private humHeadGeo: THREE.SphereGeometry;
  private humBeakGeo: THREE.ConeGeometry;
  private humTailGeo: THREE.ConeGeometry;
  private humWingGeo: THREE.ShapeGeometry;

  private eyeMat: THREE.MeshBasicMaterial;
  private footMat: THREE.MeshStandardMaterial;
  private darkThoraxMat: THREE.MeshStandardMaterial;

  constructor(
    anchors: WildlifeAnchor[],
    biome: BiomeType,
    levelNumber: number,
    goalZ: number,
    goalY: number
  ) {
    this.parrotBodyGeo = this.trackGeo(new THREE.SphereGeometry(0.16, 10, 8));
    this.parrotBreastGeo = this.trackGeo(new THREE.SphereGeometry(0.13, 8, 8));
    this.parrotHeadGeo = this.trackGeo(new THREE.SphereGeometry(0.11, 10, 8));
    this.parrotCrestGeo = this.trackGeo(new THREE.ConeGeometry(0.04, 0.14, 5));
    this.parrotBeakGeo = this.trackGeo(new THREE.ConeGeometry(0.042, 0.13, 6));
    this.parrotEyeGeo = this.trackGeo(new THREE.SphereGeometry(0.02, 6, 6));
    this.parrotTailGeo = this.trackGeo(new THREE.ConeGeometry(0.09, 0.42, 6));
    this.parrotInnerWingGeo = this.trackGeo(new THREE.BoxGeometry(0.24, 0.032, 0.2));
    this.parrotOuterWingGeo = this.trackGeo(new THREE.BoxGeometry(0.22, 0.026, 0.14));
    this.parrotFootGeo = this.trackGeo(new THREE.CylinderGeometry(0.015, 0.022, 0.09, 5));

    this.butterflyBodyGeo = this.trackGeo(new THREE.CapsuleGeometry(0.024, 0.14, 4, 6));
    this.butterflyAntennaGeo = this.trackGeo(new THREE.CylinderGeometry(0.005, 0.008, 0.11, 4));
    this.butterflyForewingGeo = this.trackGeo(this.createButterflyWingGeometry(0.26, 0.19, true));
    this.butterflyHindwingGeo = this.trackGeo(this.createButterflyWingGeometry(0.18, 0.15, false));

    this.humBodyGeo = this.trackGeo(new THREE.SphereGeometry(0.07, 8, 8));
    this.humHeadGeo = this.trackGeo(new THREE.SphereGeometry(0.052, 8, 8));
    this.humBeakGeo = this.trackGeo(new THREE.ConeGeometry(0.014, 0.16, 5));
    this.humTailGeo = this.trackGeo(new THREE.ConeGeometry(0.04, 0.18, 5));
    this.humWingGeo = this.trackGeo(this.createButterflyWingGeometry(0.19, 0.075, true));

    this.eyeMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    this.footMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 }));
    this.darkThoraxMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.65 }));

    this.populateWildlife(anchors, biome, levelNumber, goalZ, goalY);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private createButterflyWingGeometry(width: number, height: number, upper: boolean): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    if (upper) {
      shape.moveTo(0, 0);
      shape.bezierCurveTo(width * 0.35, height * 0.95, width * 0.95, height * 1.05, width, height * 0.35);
      shape.bezierCurveTo(width * 0.95, -height * 0.1, width * 0.4, -height * 0.22, 0, -height * 0.08);
    } else {
      shape.moveTo(0, -height * 0.06);
      shape.bezierCurveTo(width * 0.45, -height * 0.1, width * 0.9, -height * 0.35, width * 0.72, -height * 0.85);
      shape.bezierCurveTo(width * 0.42, -height * 1.05, width * 0.12, -height * 0.68, 0, -height * 0.25);
    }
    return new THREE.ShapeGeometry(shape, 6);
  }

  private getBiomePalettes(biome: BiomeType) {
    if (biome === 'ruins') {
      return {
        parrots: [
          { body: 0x0284c7, wingTip: 0xfacc15, breast: 0xf59e0b, beak: 0x1e293b },
          { body: 0xf97316, wingTip: 0x10b981, breast: 0xfef08a, beak: 0xfef3c7 },
        ],
        butterflies: [
          { main: 0xfbbf24, trim: 0x78350f },
          { main: 0x34d399, trim: 0x065f46 },
          { main: 0x38bdf8, trim: 0x1e3a8a },
        ],
        hummingbirds: [
          { body: 0x10b981, throat: 0xfbbf24, wing: 0x6ee7b7 },
        ],
      };
    }
    if (biome === 'waterfall') {
      return {
        parrots: [
          { body: 0x06b6d4, wingTip: 0x8b5cf6, breast: 0xfef08a, beak: 0xfef3c7 },
          { body: 0x10b981, wingTip: 0x38bdf8, breast: 0xf43f5e, beak: 0xfbbf24 },
        ],
        butterflies: [
          { main: 0x38bdf8, trim: 0x1d4ed8 },
          { main: 0xe879f9, trim: 0x86198f },
          { main: 0xa7f3d0, trim: 0x047857 },
        ],
        hummingbirds: [
          { body: 0x0ea5e9, throat: 0xf43f5e, wing: 0xbae6fd },
        ],
      };
    }
    if (biome === 'volcano') {
      return {
        parrots: [
          { body: 0xdc2626, wingTip: 0xfbbf24, breast: 0x292524, beak: 0xf97316 },
          { body: 0x292524, wingTip: 0xf97316, breast: 0xfacc15, beak: 0xfef3c7 },
        ],
        butterflies: [
          { main: 0xfb7185, trim: 0x881337 },
          { main: 0xfbbf24, trim: 0x9a3412 },
        ],
        hummingbirds: [
          { body: 0xf97316, throat: 0xfef08a, wing: 0xfdba74 },
        ],
      };
    }
    // canopy default
    return {
      parrots: [
        { body: 0xef4444, wingTip: 0x2563eb, breast: 0xfacc15, beak: 0xfef3c7 },
        { body: 0x10b981, wingTip: 0xfacc15, breast: 0xef4444, beak: 0xfef3c7 },
        { body: 0x2563eb, wingTip: 0xf59e0b, breast: 0xfde047, beak: 0x334155 },
      ],
      butterflies: [
        { main: 0x38bdf8, trim: 0x1e40af },
        { main: 0xf97316, trim: 0x7c2d12 },
        { main: 0xe879f9, trim: 0x9d174d },
        { main: 0xfacc15, trim: 0x713f12 },
      ],
      hummingbirds: [
        { body: 0x10b981, throat: 0xf43f5e, wing: 0xa7f3d0 },
        { body: 0x06b6d4, throat: 0xfbbf24, wing: 0xa5f3fc },
      ],
    };
  }

  private buildParrot(pal: { body: number; wingTip: number; breast: number; beak: number }, scale: number) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 0.08;
    root.add(bodyPivot);

    const bodyMat = this.trackMat(new THREE.MeshStandardMaterial({ color: pal.body, roughness: 0.45 }));
    const breastMat = this.trackMat(new THREE.MeshStandardMaterial({ color: pal.breast, roughness: 0.5 }));
    const tipMat = this.trackMat(new THREE.MeshStandardMaterial({ color: pal.wingTip, roughness: 0.45 }));
    const beakMat = this.trackMat(new THREE.MeshStandardMaterial({ color: pal.beak, roughness: 0.35 }));

    // Perched legs
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(this.parrotFootGeo, this.footMat);
      leg.position.set(sx * 0.06, 0.045, 0);
      root.add(leg);
    }

    // Torso & colorful breast
    const body = new THREE.Mesh(this.parrotBodyGeo, bodyMat);
    body.scale.set(0.85, 1.25, 0.92);
    body.rotation.x = 0.32;
    body.position.set(0, 0.14, 0);
    body.castShadow = true;

    const breast = new THREE.Mesh(this.parrotBreastGeo, breastMat);
    breast.scale.set(0.82, 1.05, 0.8);
    breast.rotation.x = 0.32;
    breast.position.set(0, 0.13, -0.055);
    bodyPivot.add(body, breast);

    // Tail feathers hanging down & back
    const tail = new THREE.Mesh(this.parrotTailGeo, tipMat);
    tail.rotation.x = -0.45;
    tail.scale.set(1.2, 1.0, 0.25);
    tail.position.set(0, 0.01, 0.21);
    bodyPivot.add(tail);

    // Articulated Head + Crest + Curved Beak
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.32, -0.07);
    const head = new THREE.Mesh(this.parrotHeadGeo, bodyMat);
    head.castShadow = true;
    const crest = new THREE.Mesh(this.parrotCrestGeo, tipMat);
    crest.position.set(0, 0.12, 0.04);
    crest.rotation.x = -0.55;
    const beak = new THREE.Mesh(this.parrotBeakGeo, beakMat);
    beak.rotation.x = -Math.PI * 0.44;
    beak.position.set(0, -0.015, -0.14);
    headPivot.add(head, crest, beak);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(this.parrotEyeGeo, this.eyeMat);
      eye.position.set(sx * 0.078, 0.03, -0.075);
      headPivot.add(eye);
    }
    bodyPivot.add(headPivot);

    // Articulated Left & Right Wings
    const buildWing = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.12, 0.21, -0.01);
      const inner = new THREE.Mesh(this.parrotInnerWingGeo, bodyMat);
      inner.position.set(side * 0.12, 0, 0.01);
      inner.castShadow = true;
      const outer = new THREE.Mesh(this.parrotOuterWingGeo, tipMat);
      outer.position.set(side * 0.31, 0, 0.04);
      outer.rotation.y = side * -0.22;
      outer.castShadow = true;
      pivot.add(inner, outer);
      return pivot;
    };

    const leftWingPivot = buildWing(-1);
    const rightWingPivot = buildWing(1);
    bodyPivot.add(leftWingPivot, rightWingPivot);
    root.scale.setScalar(scale);

    return { root, bodyPivot, headPivot, leftWingPivot, rightWingPivot };
  }

  private buildButterfly(pal: { main: number; trim: number }, scale: number) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const wingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: pal.main,
        emissive: pal.main,
        emissiveIntensity: 0.16,
        roughness: 0.42,
        side: THREE.DoubleSide,
      })
    );
    const trimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: pal.trim,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
    );

    const body = new THREE.Mesh(this.butterflyBodyGeo, this.darkThoraxMat);
    body.rotation.x = Math.PI / 2;
    bodyPivot.add(body);

    for (const sx of [-1, 1]) {
      const ant = new THREE.Mesh(this.butterflyAntennaGeo, this.darkThoraxMat);
      ant.position.set(sx * 0.026, 0.035, -0.11);
      ant.rotation.x = -0.65;
      ant.rotation.z = sx * -0.35;
      bodyPivot.add(ant);
    }

    const buildWing = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.016, 0.01, 0);

      const fore = new THREE.Mesh(this.butterflyForewingGeo, wingMat);
      fore.rotation.x = -Math.PI / 2;
      if (side < 0) fore.scale.x = -1;

      const hind = new THREE.Mesh(this.butterflyHindwingGeo, trimMat);
      hind.rotation.x = -Math.PI / 2;
      hind.position.y = -0.003;
      if (side < 0) hind.scale.x = -1;

      pivot.add(fore, hind);
      return pivot;
    };

    const leftWingPivot = buildWing(-1);
    const rightWingPivot = buildWing(1);
    bodyPivot.add(leftWingPivot, rightWingPivot);
    root.scale.setScalar(scale);

    return { root, bodyPivot, headPivot: null, leftWingPivot, rightWingPivot };
  }

  private buildHummingbird(pal: { body: number; throat: number; wing: number }, scale: number) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const bodyMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: pal.body,
        roughness: 0.3,
        metalness: 0.25,
      })
    );
    const throatMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: pal.throat,
        emissive: pal.throat,
        emissiveIntensity: 0.14,
        roughness: 0.35,
      })
    );
    const wingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: pal.wing,
        transparent: true,
        opacity: 0.78,
        roughness: 0.35,
        side: THREE.DoubleSide,
      })
    );

    const body = new THREE.Mesh(this.humBodyGeo, bodyMat);
    body.scale.set(0.75, 0.75, 1.55);
    body.rotation.x = 0.25;

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.055, -0.095);
    const head = new THREE.Mesh(this.humHeadGeo, bodyMat);
    const throat = new THREE.Mesh(this.humHeadGeo, throatMat);
    throat.scale.set(0.78, 0.72, 0.78);
    throat.position.set(0, -0.032, -0.01);
    const beak = new THREE.Mesh(this.humBeakGeo, this.darkThoraxMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0, -0.11);
    headPivot.add(head, throat, beak);

    const tail = new THREE.Mesh(this.humTailGeo, bodyMat);
    tail.rotation.x = Math.PI / 2 + 0.2;
    tail.scale.set(1.1, 1.0, 0.3);
    tail.position.set(0, -0.02, 0.16);

    bodyPivot.add(body, headPivot, tail);

    const buildWing = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.04, 0.03, -0.01);
      const wing = new THREE.Mesh(this.humWingGeo, wingMat);
      wing.rotation.x = -Math.PI / 2;
      if (side < 0) wing.scale.x = -1;
      pivot.add(wing);
      return pivot;
    };

    const leftWingPivot = buildWing(-1);
    const rightWingPivot = buildWing(1);
    bodyPivot.add(leftWingPivot, rightWingPivot);
    root.scale.setScalar(scale);

    return { root, bodyPivot, headPivot, leftWingPivot, rightWingPivot };
  }

  private populateWildlife(
    anchors: WildlifeAnchor[],
    biome: BiomeType,
    levelNumber: number,
    goalZ: number,
    goalY: number
  ) {
    const rand = seededRand(levelNumber * 4999 + 313);
    const palettes = this.getBiomePalettes(biome);

    // Filter & sort anchors front-to-back along course so density stays balanced
    const sorted = [...anchors].sort((a, b) => b.z - a.z);

    let lastParrotZ = 999;
    let lastButterflyZ = 999;
    let lastHumZ = 999;
    let parrotIdx = 0;
    let butterflyIdx = 0;
    let humIdx = 0;

    // Guarantee a welcoming butterfly cluster & perched parrot near the start plaza
    const startFlowerAnchor: WildlifeAnchor = {
      x: 3.8,
      y: 1.15,
      z: -10.5,
      side: 1,
      hasFlower: true,
      platformKind: 'ground',
    };
    const startParrotAnchor: WildlifeAnchor = {
      x: -4.2,
      y: 1.1,
      z: -13.5,
      side: -1,
      hasFlower: false,
      platformKind: 'ground',
    };
    const goalParrotAnchor: WildlifeAnchor = {
      x: 3.1,
      y: goalY + 0.55,
      z: goalZ + 2.4,
      side: 1,
      hasFlower: false,
      platformKind: 'ground',
    };

    const combinedAnchors = [startFlowerAnchor, startParrotAnchor, ...sorted, goalParrotAnchor];

    for (const a of combinedAnchors) {
      if (this.agents.length >= 34) break;

      // 1. Butterfly clusters near blossoms
      if (a.hasFlower && Math.abs(a.z - lastButterflyZ) >= 16) {
        lastButterflyZ = a.z;
        const clusterCount = a.z > -15 ? 3 : 2;
        for (let c = 0; c < clusterCount; c++) {
          const pal = palettes.butterflies[(butterflyIdx + c) % palettes.butterflies.length];
          const scale = 0.85 + rand() * 0.35;
          const meshParts = this.buildButterfly(pal, scale);
          const pos = new THREE.Vector3(
            a.x + (c - 0.5) * 0.38 - a.side * 0.25,
            a.y + 0.55 + rand() * 0.45,
            a.z + (rand() - 0.5) * 0.9
          );
          meshParts.root.position.copy(pos);
          this.group.add(meshParts.root);

          this.agents.push({
            kind: 'butterfly',
            ...meshParts,
            anchorPos: pos.clone(),
            pos,
            vel: new THREE.Vector3(),
            side: a.side,
            baseYaw: rand() * Math.PI * 2,
            baseScale: scale,
            phase: rand() * Math.PI * 2,
            orbitFreq: 1.35 + rand() * 0.6,
            orbitRadius: 0.36 + rand() * 0.28,
            flapRateIdle: 8.5 + rand() * 3.0,
            flapRateScatter: 19 + rand() * 4,
            scatterRadius: 4.9,
            state: 'idle',
            scatterElapsed: 0,
            scatterDuration: 3.2,
            hopTimer: 0,
            hopHeight: 0,
          });
        }
        butterflyIdx += 1;
        continue;
      }

      // 2. Perched Parrots along branch rims, bridge rails & temple overlook
      if (Math.abs(a.z - lastParrotZ) >= 24) {
        lastParrotZ = a.z;
        const pal = palettes.parrots[parrotIdx % palettes.parrots.length];
        parrotIdx += 1;
        const scale = 0.95 + rand() * 0.22;
        const meshParts = this.buildParrot(pal, scale);
        // Face slightly inward toward the trail so explorer sees plumage clearly
        const baseYaw = a.side > 0 ? Math.PI * 0.32 : -Math.PI * 0.32;
        const pos = new THREE.Vector3(a.x - a.side * 0.12, a.y, a.z);
        meshParts.root.position.copy(pos);
        meshParts.root.rotation.y = baseYaw;
        this.group.add(meshParts.root);

        this.agents.push({
          kind: 'parrot',
          ...meshParts,
          anchorPos: pos.clone(),
          pos,
          vel: new THREE.Vector3(),
          side: a.side,
          baseYaw,
          baseScale: scale,
          phase: rand() * Math.PI * 2,
          orbitFreq: 0,
          orbitRadius: 0,
          flapRateIdle: 0,
          flapRateScatter: 16.5 + rand() * 3,
          scatterRadius: 6.4,
          state: 'idle',
          scatterElapsed: 0,
          scatterDuration: 4.1,
          hopTimer: 1.5 + rand() * 3.5,
          hopHeight: 0,
        });
        continue;
      }

      // 3. Hovering Hummingbirds near flowers / waterfall bridges
      if (
        biome !== 'volcano' &&
        (a.hasFlower || a.platformKind === 'bridge') &&
        Math.abs(a.z - lastHumZ) >= 34
      ) {
        lastHumZ = a.z;
        const pal = palettes.hummingbirds[humIdx % palettes.hummingbirds.length];
        humIdx += 1;
        const scale = 1.1 + rand() * 0.2;
        const meshParts = this.buildHummingbird(pal, scale);
        const pos = new THREE.Vector3(
          a.x - a.side * 0.35,
          a.y + 0.85 + rand() * 0.4,
          a.z
        );
        meshParts.root.position.copy(pos);
        this.group.add(meshParts.root);

        this.agents.push({
          kind: 'hummingbird',
          ...meshParts,
          anchorPos: pos.clone(),
          pos,
          vel: new THREE.Vector3(),
          side: a.side,
          baseYaw: a.side > 0 ? Math.PI * 0.45 : -Math.PI * 0.45,
          baseScale: scale,
          phase: rand() * Math.PI * 2,
          orbitFreq: 2.2 + rand() * 0.6,
          orbitRadius: 0.45,
          flapRateIdle: 26,
          flapRateScatter: 34,
          scatterRadius: 5.5,
          state: 'idle',
          scatterElapsed: 0,
          scatterDuration: 2.8,
          hopTimer: 0,
          hopHeight: 0,
        });
      }
    }
  }

  public step(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    rainStrength: number,
    elapsed: number
  ) {
    const clampedDt = Math.min(dt, 0.05);

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (a.state === 'gone') continue;

      if (a.state === 'idle') {
        // Check horizontal & vertical proximity for non-aggressive scatter reaction
        const dx = a.pos.x - playerX;
        const dy = a.pos.y - playerY;
        const dz = a.pos.z - playerZ;
        const distHoriz = Math.hypot(dx, dz);

        if (distHoriz < a.scatterRadius && Math.abs(dy) < 4.8) {
          a.state = 'scattering';
          a.scatterElapsed = 0;

          // Compute outward & upward escape vector biased away from player and off platform edge
          _deltaVec.set(dx, 0, dz);
          if (_deltaVec.lengthSq() < 0.04) {
            _deltaVec.set(a.side, 0, -1);
          } else {
            _deltaVec.normalize();
          }

          if (a.kind === 'parrot') {
            a.vel.set(
              a.side * (3.6 + (i % 3) * 0.7) + _deltaVec.x * 2.1,
              4.2 + (i % 2) * 0.9,
              _deltaVec.z * 3.8 - 4.2
            );
          } else if (a.kind === 'hummingbird') {
            a.vel.set(
              a.side * 4.8 + _deltaVec.x * 2.5,
              3.4 + (i % 2) * 0.8,
              _deltaVec.z * 4.2 - 3.6
            );
          } else {
            // Butterfly scatters in buoyant fluttering upward arc
            a.vel.set(
              a.side * (1.8 + (i % 3) * 0.5) + _deltaVec.x * 1.9,
              2.3 + (i % 2) * 0.55,
              _deltaVec.z * 2.2 - 1.8
            );
          }

          soundEngine.wildlifeScatter(a.kind);
          continue;
        }

        // Idle environmental reactivity (breeze, rain shelter, foraging / perched hops)
        if (a.kind === 'parrot') {
          // Periodic little hop on branch
          a.hopTimer -= clampedDt;
          if (a.hopTimer <= 0) {
            a.hopTimer = 2.6 + ((i * 1.37) % 3.2);
            a.hopHeight = 0.28;
          }
          a.hopHeight = Math.max(0, a.hopHeight - clampedDt * 1.4);
          const hopArc = Math.sin((a.hopHeight / 0.28) * Math.PI) * 0.14;

          a.pos.set(a.anchorPos.x, a.anchorPos.y + hopArc, a.anchorPos.z);
          a.root.position.copy(a.pos);

          // Curious head look-around & rain tuck
          if (a.headPivot) {
            const lookCycle = Math.sin(elapsed * 1.9 + a.phase) * 0.45;
            const peckNod = Math.max(0, Math.sin(elapsed * 3.1 + a.phase * 2)) * 0.22;
            a.headPivot.rotation.y = lookCycle;
            a.headPivot.rotation.x = peckNod + rainStrength * 0.25;
          }
          // Folded wings tucked along sides with occasional subtle rustle
          const rustle = Math.max(0, Math.sin(elapsed * 2.7 + a.phase)) * 0.08;
          a.leftWingPivot.rotation.z = 1.15 - rustle;
          a.rightWingPivot.rotation.z = -1.15 + rustle;
          a.bodyPivot.rotation.z = Math.sin(elapsed * 1.6 + a.phase) * 0.05;
          a.root.rotation.y = a.baseYaw + Math.sin(elapsed * 0.8 + a.phase) * 0.18;
        } else if (a.kind === 'butterfly') {
          // Foraging figure-8 above flowers; tucks slightly lower during rain
          const t = elapsed * a.orbitFreq + a.phase;
          const rainHeightOffset = -rainStrength * 0.26;
          const ox = Math.sin(t) * a.orbitRadius;
          const oz = Math.sin(t * 2) * a.orbitRadius * 0.65;
          const oy = Math.sin(t * 2.4) * 0.14 + rainHeightOffset;

          const nextX = a.anchorPos.x + ox;
          const nextZ = a.anchorPos.z + oz;
          const vx = nextX - a.pos.x;
          const vz = nextZ - a.pos.z;
          a.pos.set(nextX, a.anchorPos.y + oy, nextZ);
          a.root.position.copy(a.pos);

          if (Math.hypot(vx, vz) > 0.0005) {
            a.root.rotation.y = Math.atan2(-vx, -vz);
          }
          const flap = Math.sin(elapsed * a.flapRateIdle + a.phase) * 0.95 + 0.15;
          a.leftWingPivot.rotation.z = flap;
          a.rightWingPivot.rotation.z = -flap;
          a.bodyPivot.rotation.x = 0.18;
        } else {
          // Hummingbird: crisp blossom-to-blossom hover & dart
          const t = elapsed * a.orbitFreq + a.phase;
          const stepWave = Math.tanh(Math.sin(t * 0.7) * 3.5);
          const ox = stepWave * a.orbitRadius;
          const oz = Math.cos(t * 0.9) * 0.28;
          const oy = Math.sin(t * 3.1) * 0.08 - rainStrength * 0.18;

          const nextX = a.anchorPos.x + ox;
          const nextZ = a.anchorPos.z + oz;
          const vx = nextX - a.pos.x;
          const vz = nextZ - a.pos.z;
          a.pos.set(nextX, a.anchorPos.y + oy, nextZ);
          a.root.position.copy(a.pos);
          if (Math.hypot(vx, vz) > 0.0005) {
            a.root.rotation.y = Math.atan2(-vx, -vz);
          }
          const flap = Math.sin(elapsed * a.flapRateIdle + a.phase) * 0.85;
          a.leftWingPivot.rotation.z = flap;
          a.rightWingPivot.rotation.z = -flap;
        }
      } else {
        // Scattering flight state
        a.scatterElapsed += clampedDt;
        const progress = a.scatterElapsed / a.scatterDuration;

        if (progress >= 1 || a.pos.z < playerZ - 65) {
          a.state = 'gone';
          a.root.visible = false;
          continue;
        }

        if (a.kind === 'butterfly') {
          // Buoyant swirling flutter
          const swirl = Math.sin(a.scatterElapsed * 7.5 + a.phase) * 1.4;
          a.pos.x += (a.vel.x + swirl * a.side) * clampedDt;
          a.pos.y += (a.vel.y + Math.cos(a.scatterElapsed * 9 + a.phase) * 0.7) * clampedDt;
          a.pos.z += a.vel.z * clampedDt;
          a.vel.y += 0.45 * clampedDt;
        } else {
          // Parrot / Hummingbird climbing arc into jungle canopy
          a.pos.addScaledVector(a.vel, clampedDt);
          a.vel.y = Math.max(1.2, a.vel.y - 0.55 * clampedDt);
        }

        a.root.position.copy(a.pos);
        a.root.rotation.y = Math.atan2(-a.vel.x, -a.vel.z);
        a.bodyPivot.rotation.x = a.kind === 'parrot' ? -0.38 : -0.15;
        a.bodyPivot.rotation.z = THREE.MathUtils.clamp(-a.vel.x * 0.08, -0.45, 0.45);
        if (a.headPivot) {
          a.headPivot.rotation.set(0, 0, 0);
        }

        const flap = Math.sin(elapsed * a.flapRateScatter + a.phase) * (a.kind === 'butterfly' ? 1.1 : 0.82);
        a.leftWingPivot.rotation.z = flap;
        a.rightWingPivot.rotation.z = -flap;

        // Smooth fade-out scale during last 22% of flight so birds/butterflies blend cleanly into canopy distance
        if (progress > 0.78) {
          const fade = 1 - (progress - 0.78) / 0.22;
          a.root.scale.setScalar(Math.max(0.01, a.baseScale * fade));
        }
      }
    }
  }

  public dispose() {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.materials = [];
    this.agents = [];
  }
}
