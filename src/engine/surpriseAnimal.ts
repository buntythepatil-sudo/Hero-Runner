import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';

export type SurpriseAnimalSpecies =
  | 'tiger'
  | 'elephant'
  | 'peacock'
  | 'deer'
  | 'fox'
  | 'panda'
  | 'crocodile'
  | 'toucan'
  | 'bear'
  | 'panther';

type EntryStyle =
  | 'leap_across'
  | 'side_parade'
  | 'peacock_fan'
  | 'canyon_breach'
  | 'sky_swoop'
  | 'ferns_hop';

interface AnimalSpec {
  species: SurpriseAnimalSpecies;
  speciesIndex: number;
  name: string;
  entryStyle: EntryStyle;
  primaryHex: number;
  secondaryHex: number;
  accentHex: number;
  sparkHex: number;
  scale: number;
}

interface AnimalRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Object3D[];
  wings?: [THREE.Object3D, THREE.Object3D];
  trunk?: THREE.Object3D;
  fan?: THREE.Object3D;
  jaw?: THREE.Object3D;
  ears?: [THREE.Object3D, THREE.Object3D];
}

const BASE_ANIMALS: {
  species: SurpriseAnimalSpecies;
  entryStyle: EntryStyle;
  tiers: {
    name: string;
    primaryHex: number;
    secondaryHex: number;
    accentHex: number;
    sparkHex: number;
  }[];
  scale: number;
}[] = [
  {
    species: 'tiger',
    entryStyle: 'leap_across',
    scale: 1.25,
    tiers: [
      { name: 'Bengal Tiger', primaryHex: 0xf97316, secondaryHex: 0xfff7ed, accentHex: 0x1c1917, sparkHex: 0xfbbf24 },
      { name: 'White Royal Tiger', primaryHex: 0xf1f5f9, secondaryHex: 0xffffff, accentHex: 0x334155, sparkHex: 0x7dd3fc },
      { name: 'Golden Jungle Tiger', primaryHex: 0xf59e0b, secondaryHex: 0xfef3c7, accentHex: 0x451a03, sparkHex: 0xfde047 },
      { name: 'Ember Sabre Tiger', primaryHex: 0xea580c, secondaryHex: 0xffedd5, accentHex: 0x0f172a, sparkHex: 0xfb923c },
    ],
  },
  {
    species: 'elephant',
    entryStyle: 'side_parade',
    scale: 1.28,
    tiers: [
      { name: 'Baby Asian Elephant', primaryHex: 0x64748b, secondaryHex: 0x94a3b8, accentHex: 0xfef3c7, sparkHex: 0x38bdf8 },
      { name: 'Temple Painted Elephant', primaryHex: 0x475569, secondaryHex: 0xf59e0b, accentHex: 0xfef9c3, sparkHex: 0xfbbf24 },
      { name: 'River Mist Elephant', primaryHex: 0x6b7280, secondaryHex: 0x7dd3fc, accentHex: 0xf8fafc, sparkHex: 0x60a5fa },
      { name: 'Royal White Elephant', primaryHex: 0xe2e8f0, secondaryHex: 0xfbbf24, accentHex: 0xfef08a, sparkHex: 0xfde047 },
    ],
  },
  {
    species: 'peacock',
    entryStyle: 'peacock_fan',
    scale: 1.25,
    tiers: [
      { name: 'Dancing Indian Peacock', primaryHex: 0x1d4ed8, secondaryHex: 0x10b981, accentHex: 0xfacc15, sparkHex: 0x34d399 },
      { name: 'Emerald Crown Peacock', primaryHex: 0x047857, secondaryHex: 0x06b6d4, accentHex: 0xfde047, sparkHex: 0x2dd4bf },
      { name: 'Snow White Peacock', primaryHex: 0xf8fafc, secondaryHex: 0xbae6fd, accentHex: 0xfbbf24, sparkHex: 0xe0f2fe },
      { name: 'Sunburst Royal Peacock', primaryHex: 0x4338ca, secondaryHex: 0x14b8a6, accentHex: 0xf59e0b, sparkHex: 0xfacc15 },
    ],
  },
  {
    species: 'deer',
    entryStyle: 'leap_across',
    scale: 1.2,
    tiers: [
      { name: 'Spotted Chital Deer', primaryHex: 0xb45309, secondaryHex: 0xfef3c7, accentHex: 0x78350f, sparkHex: 0xfde68a },
      { name: 'Golden Meadow Stag', primaryHex: 0xd97706, secondaryHex: 0xfffbeb, accentHex: 0xfbbf24, sparkHex: 0xfef08a },
      { name: 'Silver Mist Deer', primaryHex: 0x94a3b8, secondaryHex: 0xf8fafc, accentHex: 0x475569, sparkHex: 0xbae6fd },
      { name: 'Autumn Canopy Stag', primaryHex: 0x9a3412, secondaryHex: 0xffedd5, accentHex: 0xd97706, sparkHex: 0xfdba74 },
    ],
  },
  {
    species: 'fox',
    entryStyle: 'ferns_hop',
    scale: 1.2,
    tiers: [
      { name: 'Playful Red Fox', primaryHex: 0xea580c, secondaryHex: 0xfff7ed, accentHex: 0x1c1917, sparkHex: 0xfb923c },
      { name: 'Golden Jungle Dhole', primaryHex: 0xd97706, secondaryHex: 0xfef3c7, accentHex: 0x451a03, sparkHex: 0xfbbf24 },
      { name: 'Arctic Mist Fox', primaryHex: 0xe2e8f0, secondaryHex: 0xffffff, accentHex: 0x64748b, sparkHex: 0x7dd3fc },
      { name: 'Crimson Tail Fox', primaryHex: 0xdc2626, secondaryHex: 0xfff1f2, accentHex: 0x292524, sparkHex: 0xfda4af },
    ],
  },
  {
    species: 'panda',
    entryStyle: 'side_parade',
    scale: 1.22,
    tiers: [
      { name: 'Bamboo Jungle Panda', primaryHex: 0xf8fafc, secondaryHex: 0x1e293b, accentHex: 0x22c55e, sparkHex: 0x86efac },
      { name: 'Cinnamon Red Panda', primaryHex: 0xc2410c, secondaryHex: 0x292524, accentHex: 0xfff7ed, sparkHex: 0xfdba74 },
      { name: 'Emerald Bamboo Panda', primaryHex: 0xf1f5f9, secondaryHex: 0x0f172a, accentHex: 0x10b981, sparkHex: 0x34d399 },
      { name: 'Golden Crown Panda', primaryHex: 0xfefce8, secondaryHex: 0x1c1917, accentHex: 0xfacc15, sparkHex: 0xfde047 },
    ],
  },
  {
    species: 'crocodile',
    entryStyle: 'canyon_breach',
    scale: 1.25,
    tiers: [
      { name: 'Emerald River Croc', primaryHex: 0x15803d, secondaryHex: 0x86efac, accentHex: 0x052e16, sparkHex: 0x38bdf8 },
      { name: 'Lagoon Jade Gator', primaryHex: 0x0f766e, secondaryHex: 0x99f6e4, accentHex: 0x134e4a, sparkHex: 0x2dd4bf },
      { name: 'Golden Nile Croc', primaryHex: 0x65a30d, secondaryHex: 0xfef08a, accentHex: 0x365314, sparkHex: 0x67e8f9 },
      { name: 'Volcano Obsidian Croc', primaryHex: 0x334155, secondaryHex: 0xf97316, accentHex: 0x0f172a, sparkHex: 0xfb923c },
    ],
  },
  {
    species: 'toucan',
    entryStyle: 'sky_swoop',
    scale: 1.35,
    tiers: [
      { name: 'Giant Rainbow Toucan', primaryHex: 0x1c1917, secondaryHex: 0xfacc15, accentHex: 0xf97316, sparkHex: 0xfde047 },
      { name: 'Scarlet Jungle Macaw', primaryHex: 0xdc2626, secondaryHex: 0xfacc15, accentHex: 0x2563eb, sparkHex: 0xf87171 },
      { name: 'Cobalt Sky Macaw', primaryHex: 0x2563eb, secondaryHex: 0xfde047, accentHex: 0x06b6d4, sparkHex: 0x38bdf8 },
      { name: 'Golden Sun Hornbill', primaryHex: 0x292524, secondaryHex: 0xf59e0b, accentHex: 0xfef08a, sparkHex: 0xfbbf24 },
    ],
  },
  {
    species: 'bear',
    entryStyle: 'side_parade',
    scale: 1.26,
    tiers: [
      { name: 'Friendly Sloth Bear', primaryHex: 0x292524, secondaryHex: 0xfef3c7, accentHex: 0x57534e, sparkHex: 0xfde68a },
      { name: 'Honey Sun Bear', primaryHex: 0x451a03, secondaryHex: 0xfbbf24, accentHex: 0x78350f, sparkHex: 0xfcd34d },
      { name: 'Himalayan Moon Bear', primaryHex: 0x1e293b, secondaryHex: 0xf8fafc, accentHex: 0x475569, sparkHex: 0xbae6fd },
      { name: 'Cinnamon Grizzly', primaryHex: 0x78350f, secondaryHex: 0xfde68a, accentHex: 0x451a03, sparkHex: 0xfdba74 },
    ],
  },
  {
    species: 'panther',
    entryStyle: 'leap_across',
    scale: 1.28,
    tiers: [
      { name: 'Shadow Black Panther', primaryHex: 0x18181b, secondaryHex: 0x27272a, accentHex: 0x34d399, sparkHex: 0x34d399 },
      { name: 'Clouded Jungle Leopard', primaryHex: 0xd97706, secondaryHex: 0xfef3c7, accentHex: 0x292524, sparkHex: 0xfbbf24 },
      { name: 'Starlight Snow Leopard', primaryHex: 0xcbd5e1, secondaryHex: 0xf8fafc, accentHex: 0x475569, sparkHex: 0x7dd3fc },
      { name: 'Golden Jaguar', primaryHex: 0xeab308, secondaryHex: 0xfef9c3, accentHex: 0x1c1917, sparkHex: 0xfde047 },
    ],
  },
];

export function getSurpriseAnimalForLevel(levelNumber: number): AnimalSpec {
  const idx = Math.max(0, levelNumber - 1) % BASE_ANIMALS.length;
  const tierIdx = Math.floor(Math.max(0, levelNumber - 1) / BASE_ANIMALS.length) % 4;
  const base = BASE_ANIMALS[idx];
  const tier = base.tiers[tierIdx];
  return {
    species: base.species,
    speciesIndex: idx,
    name: tier.name,
    entryStyle: base.entryStyle,
    primaryHex: tier.primaryHex,
    secondaryHex: tier.secondaryHex,
    accentHex: tier.accentHex,
    sparkHex: tier.sparkHex,
    scale: base.scale,
  };
}

function addCuteEyes(
  head: THREE.Group,
  xOff: number,
  yOff: number,
  zOff: number,
  irisHex = 0x111827,
  radius = 0.055
) {
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: irisHex,
    emissive: irisHex === 0x34d399 ? 0x10b981 : 0x000000,
    emissiveIntensity: irisHex === 0x34d399 ? 0.85 : 0,
    roughness: 0.15,
  });
  for (const s of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), whiteMat);
    sclera.position.set(s * xOff, yOff, zOff);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.62, 8, 6), pupilMat);
    pupil.position.set(s * (xOff + radius * 0.12), yOff + radius * 0.05, zOff + radius * 0.56);
    head.add(sclera, pupil);
  }
}

function buildSurpriseAnimalRig(spec: AnimalSpec): AnimalRig {
  const root = new THREE.Group();
  root.scale.setScalar(spec.scale);
  const body = new THREE.Group();
  root.add(body);
  const head = new THREE.Group();
  const tail = new THREE.Group();
  const legs: THREE.Object3D[] = [];

  const priMat = new THREE.MeshStandardMaterial({ color: spec.primaryHex, roughness: 0.62 });
  const secMat = new THREE.MeshStandardMaterial({ color: spec.secondaryHex, roughness: 0.68 });
  const accMat = new THREE.MeshStandardMaterial({ color: spec.accentHex, roughness: 0.52 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35 });

  let wings: [THREE.Object3D, THREE.Object3D] | undefined;
  let trunk: THREE.Object3D | undefined;
  let fan: THREE.Object3D | undefined;
  let jaw: THREE.Object3D | undefined;
  let ears: [THREE.Object3D, THREE.Object3D] | undefined;

  if (spec.species === 'tiger' || spec.species === 'panther') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.82, 8, 14), priMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.72;
    torso.castShadow = true;
    body.add(torso);

    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 6, 10), secMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, 0.6, 0.02);
    body.add(belly);

    // Bold stripes for tiger / rosettes for leopard variants
    if (spec.species === 'tiger' || spec.primaryHex !== 0x18181b) {
      for (const sz of [-0.36, -0.14, 0.08, 0.3]) {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.032, 6, 16), accMat);
        stripe.position.set(0, 0.73, sz);
        body.add(stripe);
      }
    }

    head.position.set(0, 0.92, 0.68);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), priMat);
    skull.scale.set(1.05, 0.95, 1.05);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), secMat);
    muzzle.position.set(0, -0.06, 0.24);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), noseMat);
    nose.position.set(0, -0.01, 0.37);
    head.add(skull, muzzle, nose);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), priMat);
      ear.position.set(s * 0.2, 0.24, -0.04);
      head.add(ear);
    }
    addCuteEyes(head, 0.13, 0.06, 0.22, spec.species === 'panther' ? 0x34d399 : 0x111827, 0.055);
    body.add(head);

    tail.position.set(0, 0.78, -0.62);
    const tailSeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.85, 6, 10), priMat);
    tailSeg.rotation.x = 1.15;
    tailSeg.position.set(0, 0.16, -0.4);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), accMat);
    tailTip.position.set(0, 0.34, -0.82);
    tail.add(tailSeg, tailTip);
    body.add(tail);

    const legCoords = [
      [-0.2, 0.62, 0.42],
      [0.2, 0.62, 0.42],
      [-0.2, 0.62, -0.42],
      [0.2, 0.62, -0.42],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const lp = new THREE.Group();
      lp.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.44, 6, 10), priMat);
      legMesh.position.y = -0.26;
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), secMat);
      paw.scale.set(1, 0.65, 1.25);
      paw.position.set(0, -0.52, 0.05);
      lp.add(legMesh, paw);
      body.add(lp);
      legs.push(lp);
    }
  } else if (spec.species === 'elephant') {
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 14), priMat);
    torso.scale.set(0.95, 0.92, 1.24);
    torso.position.y = 0.88;
    torso.castShadow = true;
    body.add(torso);

    // Decorative blanket saddle for temple/royal look
    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.48, 16, 1, true), secMat);
    saddle.rotation.z = Math.PI / 2;
    saddle.position.set(0, 0.98, -0.02);
    body.add(saddle);

    head.position.set(0, 1.15, 0.72);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), priMat);
    head.add(skull);

    // Flapping big ears
    const earGeo = new THREE.SphereGeometry(0.36, 12, 10);
    earGeo.scale(0.18, 1.05, 0.85);
    const earL = new THREE.Group();
    earL.position.set(-0.36, 0.05, -0.04);
    const earLMesh = new THREE.Mesh(earGeo, priMat);
    earLMesh.position.set(-0.22, -0.04, 0);
    earL.add(earLMesh);
    const earR = new THREE.Group();
    earR.position.set(0.36, 0.05, -0.04);
    const earRMesh = new THREE.Mesh(earGeo, priMat);
    earRMesh.position.set(0.22, -0.04, 0);
    earR.add(earRMesh);
    head.add(earL, earR);
    ears = [earL, earR];

    // Cute ivory tusks
    for (const s of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 8), accMat);
      tusk.rotation.x = Math.PI * 0.44;
      tusk.rotation.z = s * -0.18;
      tusk.position.set(s * 0.17, -0.14, 0.38);
      head.add(tusk);
    }

    // Articulated swinging trunk
    const trunkPivot = new THREE.Group();
    trunkPivot.position.set(0, -0.08, 0.36);
    const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.45, 10), priMat);
    trunkUpper.position.set(0, -0.18, 0.12);
    trunkUpper.rotation.x = -0.35;
    const trunkLower = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.42, 10), priMat);
    trunkLower.position.set(0, -0.48, 0.28);
    trunkLower.rotation.x = -0.78;
    trunkPivot.add(trunkUpper, trunkLower);
    head.add(trunkPivot);
    trunk = trunkPivot;

    addCuteEyes(head, 0.21, 0.08, 0.31, 0x111827, 0.06);
    body.add(head);

    tail.position.set(0, 0.82, -0.74);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.45, 6), priMat);
    tMesh.rotation.x = -0.45;
    tMesh.position.set(0, -0.18, -0.12);
    tail.add(tMesh);
    body.add(tail);

    const legCoords = [
      [-0.32, 0.56, 0.38],
      [0.32, 0.56, 0.38],
      [-0.32, 0.56, -0.38],
      [0.32, 0.56, -0.38],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const lp = new THREE.Group();
      lp.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.56, 12), priMat);
      legMesh.position.y = -0.28;
      lp.add(legMesh);
      body.add(lp);
      legs.push(lp);
    }
  } else if (spec.species === 'peacock') {
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), priMat);
    torso.scale.set(0.88, 0.9, 1.38);
    torso.position.y = 0.62;
    body.add(torso);

    head.position.set(0, 0.85, 0.32);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.42, 10), priMat);
    neck.position.set(0, 0.15, 0.04);
    neck.rotation.x = 0.18;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), priMat);
    skull.position.set(0, 0.38, 0.1);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.18, 8), accMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.36, 0.28);
    head.add(neck, skull, beak);
    // Royal crest plumes
    for (const cx of [-0.04, 0, 0.04]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), priMat);
      stem.position.set(cx, 0.54, 0.08);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), accMat);
      tip.position.set(cx, 0.62, 0.08);
      head.add(stem, tip);
    }
    addCuteEyes(head, 0.09, 0.4, 0.18, 0x111827, 0.032);
    body.add(head);

    // Dazzling expandable peacock tail fan!
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 0.72, -0.34);
    const featherCount = 11;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: spec.accentHex,
      emissive: spec.accentHex,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const innerEyeMat = new THREE.MeshStandardMaterial({
      color: spec.primaryHex,
      emissive: spec.primaryHex,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    for (let i = 0; i < featherCount; i++) {
      const frac = i / (featherCount - 1) - 0.5; // -0.5..0.5
      const angle = frac * Math.PI * 0.92;
      const fPivot = new THREE.Group();
      fPivot.rotation.z = angle;
      const plume = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.92, 5, 8), secMat);
      plume.scale.set(1.15, 1, 0.22);
      plume.position.y = 0.56;
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), eyeMat);
      spot.scale.set(1, 1.25, 0.3);
      spot.position.set(0, 0.96, 0.03);
      const spotCenter = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), innerEyeMat);
      spotCenter.scale.set(1, 1.2, 0.35);
      spotCenter.position.set(0, 0.96, 0.055);
      fPivot.add(plume, spot, spotCenter);
      fanGroup.add(fPivot);
    }
    body.add(fanGroup);
    fan = fanGroup;

    for (const s of [-1, 1]) {
      const lp = new THREE.Group();
      lp.position.set(s * 0.12, 0.42, 0.02);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.42, 6), accMat);
      legMesh.position.y = -0.21;
      lp.add(legMesh);
      body.add(lp);
      legs.push(lp);
    }
  } else if (spec.species === 'deer') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 8, 12), priMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.92;
    body.add(torso);

    // Classic white chital spots along flanks
    for (const [sx, sy, sz] of [
      [-0.22, 1.0, 0.15],
      [-0.23, 0.95, -0.08],
      [-0.21, 1.02, -0.26],
      [0.22, 1.0, 0.15],
      [0.23, 0.95, -0.08],
      [0.21, 1.02, -0.26],
    ]) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 6), secMat);
      spot.position.set(sx, sy, sz);
      body.add(spot);
    }

    head.position.set(0, 1.15, 0.46);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.46, 10), priMat);
    neck.position.set(0, 0.16, 0.08);
    neck.rotation.x = 0.34;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), priMat);
    skull.scale.set(0.85, 0.85, 1.3);
    skull.position.set(0, 0.38, 0.24);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), noseMat);
    nose.position.set(0, 0.36, 0.46);
    head.add(neck, skull, nose);

    // Graceful branched antlers + ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), priMat);
      ear.scale.set(0.5, 1.2, 0.4);
      ear.position.set(s * 0.15, 0.48, 0.14);
      ear.rotation.z = s * -0.45;
      const antlerMain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.42, 6), accMat);
      antlerMain.position.set(s * 0.12, 0.66, 0.18);
      antlerMain.rotation.z = s * -0.35;
      antlerMain.rotation.x = -0.2;
      const antlerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.22, 6), accMat);
      antlerFork.position.set(s * 0.18, 0.72, 0.26);
      antlerFork.rotation.x = 0.5;
      head.add(ear, antlerMain, antlerFork);
    }
    addCuteEyes(head, 0.11, 0.42, 0.31, 0x111827, 0.042);
    body.add(head);

    tail.position.set(0, 0.98, -0.5);
    const whiteTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), secMat);
    whiteTail.rotation.x = -0.65;
    whiteTail.position.set(0, 0.08, -0.06);
    tail.add(whiteTail);
    body.add(tail);

    const legCoords = [
      [-0.16, 0.78, 0.36],
      [0.16, 0.78, 0.36],
      [-0.16, 0.78, -0.36],
      [0.16, 0.78, -0.36],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const lp = new THREE.Group();
      lp.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.76, 8), priMat);
      legMesh.position.y = -0.38;
      lp.add(legMesh);
      body.add(lp);
      legs.push(lp);
    }
  } else if (spec.species === 'fox') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.58, 8, 12), priMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.56;
    body.add(torso);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), secMat);
    chest.position.set(0, 0.54, 0.32);
    body.add(chest);

    head.position.set(0, 0.76, 0.48);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), priMat);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 10), secMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.04, 0.26);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), noseMat);
    nose.position.set(0, -0.04, 0.39);
    head.add(skull, snout, nose);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 6), priMat);
      ear.position.set(s * 0.14, 0.24, -0.02);
      ear.rotation.z = s * -0.18;
      const earTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), accMat);
      earTip.position.set(s * 0.16, 0.32, -0.02);
      earTip.rotation.z = s * -0.18;
      head.add(ear, earTip);
    }
    addCuteEyes(head, 0.1, 0.05, 0.18, 0x111827, 0.045);
    body.add(head);

    // Big fluffy white-tipped fox tail
    tail.position.set(0, 0.58, -0.44);
    const bush = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 8, 10), priMat);
    bush.rotation.x = 1.05;
    bush.position.set(0, 0.18, -0.32);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8), secMat);
    tip.position.set(0, 0.36, -0.62);
    tail.add(bush, tip);
    body.add(tail);

    const legCoords = [
      [-0.14, 0.46, 0.28],
      [0.14, 0.46, 0.28],
      [-0.14, 0.46, -0.28],
      [0.14, 0.46, -0.28],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const lp = new THREE.Group();
      lp.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.44, 8), accMat);
      legMesh.position.y = -0.22;
      lp.add(legMesh);
      body.add(lp);
      legs.push(lp);
    }
  } else if (spec.species === 'panda' || spec.species === 'bear') {
    const isPanda = spec.species === 'panda';
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), priMat);
    torso.scale.set(0.98, 1.15, 0.94);
    torso.position.y = 0.78;
    body.add(torso);

    // Shoulder sash for panda or chest V-patch for bear
    const chestBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.12, 8, 18),
      secMat
    );
    chestBand.rotation.x = Math.PI / 2;
    chestBand.position.y = isPanda ? 1.05 : 0.9;
    if (isPanda) {
      body.add(chestBand);
    } else {
      const vPatch = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), secMat);
      vPatch.scale.set(1.15, 0.7, 0.4);
      vPatch.position.set(0, 0.92, 0.38);
      body.add(vPatch);
    }

    head.position.set(0, 1.38, 0.08);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), priMat);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), isPanda ? priMat : secMat);
    muzzle.position.set(0, -0.06, 0.28);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), noseMat);
    nose.position.set(0, -0.02, 0.4);
    head.add(skull, muzzle, nose);

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), isPanda ? secMat : priMat);
      ear.position.set(s * 0.26, 0.26, 0);
      head.add(ear);
      if (isPanda) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), secMat);
        patch.scale.set(1.1, 1.3, 0.45);
        patch.position.set(s * 0.13, 0.06, 0.27);
        head.add(patch);
      }
    }
    addCuteEyes(head, 0.13, 0.07, 0.3, 0x111827, 0.048);
    body.add(head);

    // Waving front arms & sturdy legs
    const armMat = isPanda ? secMat : priMat;
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.42, 1.02, 0.08);
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.36, 6, 10), armMat);
      armMesh.position.y = -0.2;
      arm.add(armMesh);
      if (isPanda && s === 1) {
        // Bamboo shoot in right paw!
        const bamboo = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.62, 8), accMat);
        bamboo.position.set(0.06, -0.34, 0.14);
        bamboo.rotation.z = -0.35;
        arm.add(bamboo);
      }
      body.add(arm);
      legs.push(arm);
    }
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.24, 0.42, 0);
      const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.26, 6, 10), armMat);
      legMesh.position.y = -0.18;
      leg.add(legMesh);
      body.add(leg);
      legs.push(leg);
    }
  } else if (spec.species === 'crocodile') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.15, 8, 14), priMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.2, 0.72, 1);
    torso.position.y = 0.34;
    body.add(torso);

    // Ridged dorsal scales along the back
    for (let i = 0; i < 6; i++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 5), accMat);
      ridge.position.set(0, 0.56, 0.45 - i * 0.22);
      body.add(ridge);
    }

    head.position.set(0, 0.38, 0.78);
    const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.85), priMat);
    upperSnout.position.set(0, 0.06, 0.34);
    head.add(upperSnout);

    const lowerJawGroup = new THREE.Group();
    lowerJawGroup.position.set(0, -0.02, 0.05);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.78), secMat);
    lowerJaw.position.set(0, -0.04, 0.32);
    lowerJawGroup.add(lowerJaw);
    // Cute triangular teeth along snout
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    for (const tz of [0.18, 0.38, 0.58]) {
      for (const s of [-1, 1]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), toothMat);
        tooth.position.set(s * 0.14, 0.04, tz);
        lowerJawGroup.add(tooth);
      }
    }
    head.add(lowerJawGroup);
    jaw = lowerJawGroup;
    addCuteEyes(head, 0.15, 0.18, 0.08, 0xfacc15, 0.055);
    body.add(head);

    tail.position.set(0, 0.34, -0.75);
    const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.35, 10), priMat);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.z = -0.68;
    tail.add(tailCone);
    body.add(tail);

    const legCoords = [
      [-0.36, 0.26, 0.42],
      [0.36, 0.26, 0.42],
      [-0.36, 0.26, -0.38],
      [0.36, 0.26, -0.38],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const lp = new THREE.Group();
      lp.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 6, 8), priMat);
      legMesh.rotation.z = Math.sign(lx) * 0.65;
      legMesh.position.y = -0.1;
      lp.add(legMesh);
      body.add(lp);
      legs.push(lp);
    }
  } else {
    // Giant Toucan / Macaw
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.45, 8, 12), priMat);
    torso.rotation.x = Math.PI * 0.42;
    torso.position.y = 0.45;
    body.add(torso);

    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), secMat);
    breast.position.set(0, 0.46, 0.22);
    body.add(breast);

    head.position.set(0, 0.68, 0.32);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), priMat);
    // Iconic big colorful toucan beak!
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.56, 10), accMat);
    beak.rotation.x = Math.PI / 2;
    beak.scale.set(0.72, 1, 1.15);
    beak.position.set(0, -0.02, 0.38);
    head.add(skull, beak);
    addCuteEyes(head, 0.11, 0.05, 0.12, 0x38bdf8, 0.045);
    body.add(head);

    // Big articulated wings
    const wingGeo = new THREE.BoxGeometry(0.95, 0.05, 0.36);
    const wingL = new THREE.Group();
    wingL.position.set(-0.2, 0.52, 0.02);
    const wLMesh = new THREE.Mesh(wingGeo, priMat);
    wLMesh.position.x = -0.46;
    const wLTip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 0.3), secMat);
    wLTip.position.x = -0.82;
    wingL.add(wLMesh, wLTip);

    const wingR = new THREE.Group();
    wingR.position.set(0.2, 0.52, 0.02);
    const wRMesh = new THREE.Mesh(wingGeo, priMat);
    wRMesh.position.x = 0.46;
    const wRTip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 0.3), secMat);
    wRTip.position.x = 0.82;
    wingR.add(wRMesh, wRTip);
    body.add(wingL, wingR);
    wings = [wingL, wingR];

    tail.position.set(0, 0.36, -0.34);
    const tailPlume = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.65), accMat);
    tailPlume.position.z = -0.32;
    tail.add(tailPlume);
    body.add(tail);
  }

  return { root, body, head, tail, legs, wings, trunk, fan, jaw, ears };
}

export class SurpriseAnimalDirector {
  public readonly spec: AnimalSpec;
  private parentGroup: THREE.Group;
  private rig: AnimalRig | null = null;
  private triggered = false;
  private finished = false;
  private animTime = 0;
  private duration = 5.4;
  private bannerTimer = 0;
  private sideDir: 1 | -1;
  private anchorX = 0;
  private anchorY = 1;
  private anchorZ = -30;
  private triggerZ: number;
  private splashEmitted = false;

  constructor(levelNumber: number, courseLength: number, parentGroup: THREE.Group) {
    this.spec = getSurpriseAnimalForLevel(levelNumber);
    this.parentGroup = parentGroup;
    this.sideDir = levelNumber % 2 === 0 ? 1 : -1;
    // Trigger reliably early-to-mid run so the player always enjoys this level's surprise animal!
    this.triggerZ = -Math.min(34, Math.max(22, courseLength * 0.2));
  }

  public getActiveBanner(): string | null {
    return this.bannerTimer > 0 ? this.spec.name : null;
  }

  public getWorldPosition(out: THREE.Vector3): boolean {
    if (!this.triggered || this.finished || !this.rig) return false;
    out.copy(this.rig.root.position);
    return true;
  }

  public step(
    dt: number,
    px: number,
    footY: number,
    pz: number,
    spawnBurst: (pos: THREE.Vector3, colorHex: number, count: number) => void
  ) {
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    }

    if (this.finished) return;

    if (!this.triggered) {
      if (pz <= this.triggerZ) {
        this.triggered = true;
        this.animTime = 0;
        this.bannerTimer = 3.4;
        this.anchorX = px;
        this.anchorY = Math.max(0, footY);
        this.anchorZ = pz - 13.5;

        this.rig = buildSurpriseAnimalRig(this.spec);
        this.parentGroup.add(this.rig.root);

        soundEngine.surpriseAnimalCall(this.spec.speciesIndex);
        spawnBurst(
          new THREE.Vector3(this.anchorX + this.sideDir * 4.5, this.anchorY + 1.8, this.anchorZ),
          this.spec.sparkHex,
          12
        );
      }
      return;
    }

    if (!this.rig) return;
    this.animTime += dt;
    const t = Math.min(1, this.animTime / this.duration);
    const rig = this.rig;
    const s = this.sideDir;

    // Smoothly track forward slightly so the animal stays clearly in view ahead of the runner!
    const viewZ = Math.min(this.anchorZ, pz - 9.5);

    if (this.spec.entryStyle === 'leap_across') {
      // Dramatic cliff-to-cliff acrobatic leap right over the jungle trail ahead!
      const x = this.anchorX + THREE.MathUtils.lerp(s * 9.5, -s * 10.5, t);
      const jumpArc = Math.sin(t * Math.PI) * 4.4 + Math.sin(t * Math.PI * 2) * 0.45;
      const y = this.anchorY + 0.6 + jumpArc;
      const z = viewZ - 2.5 - Math.sin(t * Math.PI) * 2.2;

      rig.root.position.set(x, y, z);
      rig.root.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      rig.body.rotation.x = -Math.cos(t * Math.PI) * 0.45;

      const stride = Math.sin(this.animTime * 15);
      rig.legs.forEach((leg, i) => {
        leg.rotation.x = (i < 2 ? 1 : -1) * (0.65 + stride * 0.55);
      });
      rig.tail.rotation.x = Math.sin(this.animTime * 11) * 0.42;
      rig.head.rotation.x = 0.12;
    } else if (this.spec.entryStyle === 'side_parade') {
      // Trots alongside the trail on a scenic side bank, waves / trumpets, then exits happily!
      const enterT = THREE.MathUtils.smoothstep(t, 0, 0.25);
      const exitT = THREE.MathUtils.smoothstep(t, 0.78, 1);
      const sideX = this.anchorX + s * (THREE.MathUtils.lerp(11.5, 4.3, enterT) + exitT * 9.5);
      const hop = Math.abs(Math.sin(this.animTime * 8.5)) * 0.28;
      const y = this.anchorY + 0.25 + hop;
      const z = pz - 8.8 - exitT * 6.5;

      rig.root.position.set(sideX, y, z);
      // Turn slightly toward the runner to say hello during the showcase middle phase!
      const greet = Math.sin(THREE.MathUtils.clamp((t - 0.22) / 0.56, 0, 1) * Math.PI);
      rig.root.rotation.y = (s > 0 ? -Math.PI * 0.72 : Math.PI * 0.72) * (0.4 + greet * 0.6);

      if (rig.trunk) {
        // Elephant raises trunk cheerfully & sprays celebratory sparkles!
        rig.trunk.rotation.x = -0.35 - greet * 1.45 + Math.sin(this.animTime * 9) * 0.22;
        if (greet > 0.85 && !this.splashEmitted) {
          this.splashEmitted = true;
          spawnBurst(new THREE.Vector3(sideX, y + 2.1, z), this.spec.sparkHex, 16);
        }
      }
      if (rig.ears) {
        const flap = Math.sin(this.animTime * 12) * 0.38;
        rig.ears[0].rotation.y = -0.25 + flap;
        rig.ears[1].rotation.y = 0.25 - flap;
      }
      // Panda/Bear wave their front arms excitedly!
      if (this.spec.species === 'panda' || this.spec.species === 'bear') {
        if (rig.legs[0]) rig.legs[0].rotation.z = -0.4 - greet * 1.9 + Math.sin(this.animTime * 14) * 0.35;
        if (rig.legs[1]) rig.legs[1].rotation.z = 0.4 + greet * 1.9 - Math.sin(this.animTime * 14) * 0.35;
        if (rig.legs[2]) rig.legs[2].rotation.x = Math.sin(this.animTime * 9) * 0.45;
        if (rig.legs[3]) rig.legs[3].rotation.x = -Math.sin(this.animTime * 9) * 0.45;
      } else {
        rig.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(this.animTime * 10 + (i % 2 === 0 ? 0 : Math.PI)) * 0.45;
        });
      }
    } else if (this.spec.entryStyle === 'peacock_fan') {
      // Glides down beside the path and unfurls its dazzling peacock tail fan!
      const enterT = THREE.MathUtils.smoothstep(t, 0, 0.24);
      const exitT = THREE.MathUtils.smoothstep(t, 0.78, 1);
      const x = this.anchorX + s * (THREE.MathUtils.lerp(9.5, 3.9, enterT) + exitT * 8.5);
      const glideY = (1 - enterT) * 3.8 + exitT * 4.5 + Math.abs(Math.sin(this.animTime * 7)) * 0.14;
      const z = pz - 8.5 - exitT * 5;

      rig.root.position.set(x, this.anchorY + 0.15 + glideY, z);
      rig.root.rotation.y = s > 0 ? -0.42 : 0.42;

      const fanOpen = Math.sin(THREE.MathUtils.clamp((t - 0.18) / 0.64, 0, 1) * Math.PI);
      if (rig.fan) {
        rig.fan.scale.set(0.25 + fanOpen * 0.95, 0.3 + fanOpen * 0.95, 1);
        rig.fan.rotation.x = -0.18 - fanOpen * 0.15;
        rig.fan.rotation.z = Math.sin(this.animTime * 10) * 0.08 * fanOpen;
      }
      if (fanOpen > 0.85 && !this.splashEmitted) {
        this.splashEmitted = true;
        spawnBurst(new THREE.Vector3(x, this.anchorY + 1.5, z), this.spec.sparkHex, 14);
      }
      rig.head.rotation.y = Math.sin(this.animTime * 5) * 0.28;
    } else if (this.spec.entryStyle === 'canyon_breach') {
      // Joyful emerald crocodile leaps out of the misty ravine in a splashy arc & dives back down!
      const x = this.anchorX + THREE.MathUtils.lerp(s * 6.5, -s * 6.5, t);
      const y = this.anchorY - 3.6 + Math.sin(t * Math.PI) * 7.8;
      const z = viewZ - 3.2;

      rig.root.position.set(x, y, z);
      rig.root.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      rig.body.rotation.x = -Math.cos(t * Math.PI) * 0.72;
      rig.tail.rotation.y = Math.sin(this.animTime * 16) * 0.55;
      if (rig.jaw) {
        rig.jaw.rotation.x = 0.25 + Math.abs(Math.sin(this.animTime * 10)) * 0.45;
      }
      if (t > 0.14 && !this.splashEmitted) {
        this.splashEmitted = true;
        spawnBurst(new THREE.Vector3(x, this.anchorY + 0.4, z), 0x38bdf8, 16);
      }
    } else if (this.spec.entryStyle === 'sky_swoop') {
      // Giant Toucan / Macaw corkscrew swoop high above the runner's path!
      const x = this.anchorX + Math.sin(t * Math.PI * 2.2) * 5.2 * s;
      const y = this.anchorY + 3.4 + Math.cos(t * Math.PI * 2) * 1.45 + Math.pow(t, 2.5) * 5.5;
      const z = pz - 9.0 - Math.sin(t * Math.PI) * 4.5;

      rig.root.position.set(x, y, z);
      rig.root.rotation.y = Math.atan2(Math.cos(t * Math.PI * 2.2) * s, -0.7);
      rig.body.rotation.z = -Math.cos(t * Math.PI * 2.2) * 0.45 * s;

      if (rig.wings) {
        const flap = Math.sin(this.animTime * 17) * 0.75;
        rig.wings[0].rotation.z = flap;
        rig.wings[1].rotation.z = -flap;
      }
    } else {
      // 'ferns_hop': Playful Fox darts out beside the trail, does a happy 360 spin-hop, and dashes away!
      const x = this.anchorX + THREE.MathUtils.lerp(s * 8.5, -s * 9.5, t);
      const midHop = Math.sin(THREE.MathUtils.clamp((t - 0.3) / 0.4, 0, 1) * Math.PI);
      const y = this.anchorY + 0.3 + Math.abs(Math.sin(this.animTime * 11)) * 0.55 + midHop * 2.2;
      const z = viewZ - 1.5;

      rig.root.position.set(x, y, z);
      const spinSpin = THREE.MathUtils.smoothstep(t, 0.32, 0.68) * Math.PI * 2;
      rig.root.rotation.y = (s > 0 ? -Math.PI / 2 : Math.PI / 2) + spinSpin;
      rig.tail.rotation.y = Math.sin(this.animTime * 16) * 0.55;
      rig.legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(this.animTime * 16 + (i < 2 ? 0 : Math.PI)) * 0.72;
      });
      if (midHop > 0.85 && !this.splashEmitted) {
        this.splashEmitted = true;
        spawnBurst(new THREE.Vector3(x, y + 0.5, z), this.spec.sparkHex, 12);
      }
    }

    if (t >= 1) {
      this.finished = true;
      this.removeRig();
    }
  }

  private removeRig() {
    if (!this.rig) return;
    this.parentGroup.remove(this.rig.root);
    this.rig.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
    this.rig = null;
  }

  public dispose() {
    this.removeRig();
  }
}
