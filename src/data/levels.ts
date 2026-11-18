import {
  BiomeType,
  CoinSpec,
  LevelSpec,
  ObstacleKind,
  ObstacleSpec,
  PlatformSegmentSpec,
} from '../types/game';

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const LEVEL_NAMES: string[] = [
  'Sunlit Trailhead',
  'Timber Crossing',
  'Canopy Stepping Stones',
  'Bouncing Grove',
  'Jaguar Bridge',
  'Emerald Vine Walk',
  'Howler Hollow',
  'Sunbeam Overlook',
  'Treetop Switchback',
  'Golden Orchid Run',
  'Mossy Canyon Gate',
  'Shattered Causeway',
  'Pendulum Gorge',
  'Boulder Run Ridge',
  'Ancient Sunken Plaza',
  'Carved Idol Pass',
  'Relic Archway',
  'Sandstone Gauntlet',
  'Sunken Courtyard',
  'Temple Terrace',
  'Mistfall Rapids',
  'Slick Stone Walkway',
  'Twin Cascade Cliffs',
  'Sweeper Gauntlet',
  'Twilight Spire Ascent',
  'Silver Spray Bridge',
  'Frosted Ledge Run',
  'Torrent Gorge',
  'Glacier Mist Crossing',
  'Cascading Summit',
  'Basalt Rim Trail',
  'Magma Chasm Hop',
  'Cinder Pendulum Keep',
  'Obsidian Switchback',
  'Ashfall Causeway',
  'Molten Archway',
  'Ember Crown Ridge',
  'Caldera Gauntlet',
  'Inferno Spire',
  "Emperor's Summit Gauntlet",
];

function getBiomeForLevel(level: number): BiomeType {
  if (level <= 10) return 'canopy';
  if (level <= 20) return 'ruins';
  if (level <= 30) return 'waterfall';
  return 'volcano';
}

function getDifficultyLabel(level: number): string {
  if (level <= 8) return 'Gentle';
  if (level <= 16) return 'Moderate';
  if (level <= 26) return 'Challenging';
  if (level <= 34) return 'Intense';
  return 'Master';
}

function buildLevel(levelNumber: number): LevelSpec {
  const rand = seededRandom(levelNumber * 7919 + 1337);
  const biome = getBiomeForLevel(levelNumber);
  const difficulty = (levelNumber - 1) / 39; // 0.0 -> 1.0

  const courseLength = 220 + levelNumber * 15; // 235m -> 820m
  const baseWidth = Math.max(4.4, 8.6 - difficulty * 3.8);
  const platforms: PlatformSegmentSpec[] = [];
  const obstacles: ObstacleSpec[] = [];
  const coins: CoinSpec[] = [];

  // Starting safe plaza
  platforms.push({
    id: `L${levelNumber}_start`,
    x: 0,
    y: 0,
    z: -8,
    width: 10,
    height: 2.2,
    depth: 22,
    kind: 'ground',
  });

  // Opening coins + Coin Box + Mystery ? Box + Blaster Mushroom on starting branch
  for (let i = 0; i < 3; i++) {
    coins.push({
      id: `L${levelNumber}_sc_${i}`,
      x: (i - 1) * 1.4,
      y: 1.7,
      z: -6 - i * 2.2,
      value: 1,
    });
  }

  obstacles.push(
    {
      id: `L${levelNumber}_start_coinbox`,
      kind: 'coin_box',
      x: -1.7,
      y: 3.65,
      z: -12,
      width: 10,
      reward: 'coins',
    },
    {
      id: `L${levelNumber}_start_mystery`,
      kind: 'mystery_block',
      x: 1.7,
      y: 3.65,
      z: -12,
      width: 10,
      reward: 'blaster',
    },
    {
      id: `L${levelNumber}_start_mush`,
      kind: 'power_mushroom',
      x: 0,
      y: 1.1,
      z: -15.5,
      width: 10,
      reward: 'blaster',
    }
  );

  let cursorZ = -19;
  let currentY = 0;
  let segIndex = 0;
  let obsIndex = 0;
  let coinIndex = 0;

  while (cursorZ > -courseLength + 24) {
    segIndex++;
    const roll = rand();

    // Decide gap probability & gap length (increases progressively!)
    const gapChance = Math.min(0.68, 0.16 + difficulty * 0.52);
    const hasGap = segIndex > 1 && rand() < gapChance;

    if (hasGap) {
      const gapLen = 2.6 + difficulty * 2.5 + rand() * 1.4;
      // Place a coin arc over the chasm to guide the jump
      const arcMidZ = cursorZ - gapLen * 0.5;
      coins.push({
        id: `L${levelNumber}_c_${coinIndex++}`,
        x: 0,
        y: currentY + 2.6,
        z: arcMidZ,
        value: 2,
      });
      cursorZ -= gapLen;
    }

    // Decide elevation change
    let deltaY = 0;
    if (levelNumber >= 2 && rand() < 0.35 + difficulty * 0.25) {
      deltaY = (rand() < 0.58 ? 1 : -1) * (0.9 + rand() * 1.3);
      currentY = Math.max(-2.5, Math.min(8.5, currentY + deltaY));
    }

    // Platform type progression
    let kind: PlatformSegmentSpec['kind'] = 'ground';
    let segDepth = 14 + rand() * 10 - difficulty * 3.5;
    let segWidth = baseWidth + (rand() - 0.5) * 1.2;
    let offsetX = levelNumber >= 3 ? (rand() - 0.5) * (1.8 + difficulty * 3.0) : 0;

    if (levelNumber >= 5 && roll < 0.18 + difficulty * 0.16) {
      kind = 'moving';
      segDepth = 6.5 + rand() * 3;
      segWidth = Math.max(3.6, baseWidth * 0.72);
    } else if (levelNumber >= 6 && roll >= 0.18 && roll < 0.32 + difficulty * 0.12) {
      kind = 'crumbling';
      segDepth = 5.5 + rand() * 2.5;
      segWidth = Math.max(3.6, baseWidth * 0.68);
    } else if (biome === 'waterfall' && roll >= 0.32 && roll < 0.52) {
      kind = 'ice';
    } else if (levelNumber >= 3 && roll >= 0.52 && roll < 0.66) {
      kind = 'bridge';
      segWidth = Math.max(3.1, baseWidth * 0.62);
    }

    const centerZ = cursorZ - segDepth * 0.5;
    const plat: PlatformSegmentSpec = {
      id: `L${levelNumber}_p_${segIndex}`,
      x: offsetX,
      y: currentY,
      z: centerZ,
      width: segWidth,
      height: kind === 'bridge' || kind === 'moving' || kind === 'crumbling' ? 0.8 : 2.2,
      depth: segDepth,
      kind,
    };

    if (kind === 'moving') {
      plat.moveAxis = rand() < 0.65 ? 'x' : 'y';
      plat.moveRange = plat.moveAxis === 'x' ? 2.4 + difficulty * 1.6 : 1.4 + difficulty * 1.0;
      plat.moveSpeed = 1.1 + difficulty * 1.3;
    }

    platforms.push(plat);

    // Populate segment with Mario-style obstacles, ?-blocks, bounce mushrooms, enemies, coins
    const platTopY = currentY + plat.height * 0.5;
    if (kind !== 'moving' && segDepth >= 7.5) {
      const slotCount = Math.max(1, Math.floor(segDepth / (8.5 - difficulty * 3.0)));
      for (let s = 0; s < slotCount; s++) {
        const zPos = cursorZ - 2.6 - s * ((segDepth - 4.8) / Math.max(1, slotCount));
        const laneX = offsetX + (rand() - 0.5) * (segWidth * 0.62);

        const obsRoll = rand();
        let chosenKind: ObstacleKind = 'log';

        if (obsRoll < 0.13) {
          chosenKind = 'mystery_block';
        } else if (obsRoll < 0.25) {
          chosenKind = 'coin_box';
        } else if (obsRoll < 0.34) {
          chosenKind = 'power_mushroom';
        } else if (obsRoll < 0.42 && levelNumber >= 2) {
          chosenKind = 'bounce_mushroom';
        } else if (obsRoll < 0.50 && levelNumber >= 2) {
          chosenKind = 'crate';
        } else if (obsRoll < 0.58) {
          chosenKind = 'pipe';
        } else if (obsRoll < 0.70) {
          chosenKind = 'log';
        } else if (obsRoll < 0.82 && levelNumber >= 2) {
          chosenKind = rand() < 0.55 ? 'crab' : 'beetle';
        } else if (obsRoll < 0.90 && levelNumber >= 4) {
          chosenKind = 'pendulum';
        } else if (obsRoll < 0.95 && levelNumber >= 7) {
          chosenKind = 'sweeper';
        } else if (levelNumber >= 5) {
          chosenKind = 'boulder_chute';
        } else {
          chosenKind = 'log';
        }

        const obs: ObstacleSpec = {
          id: `L${levelNumber}_o_${obsIndex++}`,
          kind: chosenKind,
          x: chosenKind === 'log' || chosenKind === 'pendulum' || chosenKind === 'sweeper' ? offsetX : laneX,
          y: platTopY,
          z: zPos,
          width: segWidth,
          scale: 1,
          speed: 1 + difficulty * 1.5,
          phase: rand() * Math.PI * 2,
          patrolRange: Math.max(1.2, segWidth * 0.36),
        };

        if (chosenKind === 'mystery_block') {
          obs.y = platTopY + 2.55;
          const r = rand();
          obs.reward = r < 0.42 ? 'blaster' : r < 0.65 ? 'coins' : r < 0.8 ? 'shield' : r < 0.92 ? 'magnet' : 'speed';
          coins.push({
            id: `L${levelNumber}_c_${coinIndex++}`,
            x: obs.x,
            y: obs.y + 1.05,
            z: obs.z,
            value: 2,
          });
        } else if (chosenKind === 'coin_box') {
          obs.y = platTopY + 2.55;
          obs.reward = 'coins';
          coins.push({
            id: `L${levelNumber}_c_${coinIndex++}`,
            x: obs.x,
            y: obs.y + 1.05,
            z: obs.z,
            value: 2,
          });
        } else if (chosenKind === 'power_mushroom') {
          obs.reward = 'blaster';
        } else if (chosenKind === 'pipe') {
          // Bonus coins perched atop the Mario pipe
          coins.push({
            id: `L${levelNumber}_c_${coinIndex++}`,
            x: obs.x,
            y: platTopY + 2.2,
            z: obs.z,
            value: 2,
          });
        } else if (chosenKind === 'bounce_mushroom') {
          // Place elevated bonus coins above bounce pad
          for (let k = 0; k < 3; k++) {
            coins.push({
              id: `L${levelNumber}_c_${coinIndex++}`,
              x: obs.x,
              y: platTopY + 2.5 + k * 1.1,
              z: obs.z - k * 1.4,
              value: 2,
            });
          }
        }

        obstacles.push(obs);

        // Scatter reachable trail coins
        if (rand() < 0.65) {
          coins.push({
            id: `L${levelNumber}_c_${coinIndex++}`,
            x: offsetX + (rand() - 0.5) * (segWidth * 0.55),
            y: platTopY + 1.0,
            z: zPos - 1.8,
            value: 1,
          });
        }
      }
    } else {
      // Moving or crumbling bridge coins
      coins.push({
        id: `L${levelNumber}_c_${coinIndex++}`,
        x: offsetX,
        y: platTopY + 1.1,
        z: centerZ,
        value: 2,
      });
    }

    cursorZ -= segDepth;
  }

  // Final Temple Goal Plaza
  const goalPlatZ = cursorZ - 12;
  platforms.push({
    id: `L${levelNumber}_goal`,
    x: 0,
    y: currentY,
    z: goalPlatZ,
    width: 11,
    height: 2.2,
    depth: 22,
    kind: 'ground',
  });

  // Victory coin row leading to flagpole
  for (let i = 0; i < 4; i++) {
    coins.push({
      id: `L${levelNumber}_gc_${i}`,
      x: 0,
      y: currentY + 1.9,
      z: cursorZ - 3 - i * 2.5,
      value: 2,
    });
  }

  return {
    levelNumber,
    name: LEVEL_NAMES[levelNumber - 1] ?? `Stage ${levelNumber}`,
    biome,
    difficultyLabel: getDifficultyLabel(levelNumber),
    parTime: Math.round(34 + levelNumber * 2.5),
    length: Math.abs(goalPlatZ - 4),
    gravity: -28 - difficulty * 3,
    groundFriction: biome === 'waterfall' ? 0.25 : 0.6,
    boulderRate: 0.25 + difficulty * 0.9,
    platforms,
    obstacles,
    coins,
    goalZ: goalPlatZ - 4,
    goalY: currentY + 1.1,
  };
}

export const ALL_LEVELS: LevelSpec[] = Array.from({ length: 40 }, (_, idx) =>
  buildLevel(idx + 1)
);

export function getLevelSpec(levelNumber: number): LevelSpec {
  const clamped = Math.max(1, Math.min(40, levelNumber));
  return ALL_LEVELS[clamped - 1];
}
