import { DailyMissionSpec, DailyMissionState } from '../types/game';

export function getLocalDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDayKey(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COIN_MISSIONS: Omit<DailyMissionSpec, 'id'>[] = [
  {
    kind: 'collect_coins',
    title: 'Gold Rush',
    description: 'Collect 25 coins across your jungle runs today.',
    target: 25,
    rewardCoins: 20,
  },
  {
    kind: 'collect_coins',
    title: 'Treasure Trail',
    description: 'Collect 45 coins across your jungle runs today.',
    target: 45,
    rewardCoins: 35,
  },
  {
    kind: 'collect_coins',
    title: 'Canopy Prospector',
    description: 'Collect 65 coins across your jungle runs today.',
    target: 65,
    rewardCoins: 50,
  },
];

const SPEED_MISSIONS: Omit<DailyMissionSpec, 'id'>[] = [
  {
    kind: 'speed_clear',
    title: 'Quick Draw Dash',
    description: 'Finish any level in under 45 seconds.',
    target: 45,
    rewardCoins: 25,
  },
  {
    kind: 'speed_clear',
    title: 'Lightning Trailblazer',
    description: 'Finish any level in under 38 seconds.',
    target: 38,
    rewardCoins: 35,
  },
  {
    kind: 'speed_clear',
    title: 'Canyon Sprint',
    description: 'Finish any level in under 32 seconds.',
    target: 32,
    rewardCoins: 45,
  },
];

const ADVENTURE_MISSIONS: Omit<DailyMissionSpec, 'id'>[] = [
  {
    kind: 'hit_boxes',
    title: 'Lucky Hat Hunter',
    description: 'Bump 4 Mystery or Coin boxes from below.',
    target: 4,
    rewardCoins: 25,
  },
  {
    kind: 'stomp_enemies',
    title: 'Trail Tamer',
    description: 'Stomp or blast 4 critters, crates, or boulders.',
    target: 4,
    rewardCoins: 30,
  },
  {
    kind: 'flawless_clear',
    title: 'Untouched Cowboy',
    description: 'Finish any level with all 3 hearts intact.',
    target: 1,
    rewardCoins: 40,
  },
  {
    kind: 'complete_levels',
    title: 'Double Expedition',
    description: 'Complete 2 levels in today’s expedition.',
    target: 2,
    rewardCoins: 35,
  },
];

export function getDailyMissionsForDay(dayKey: string): DailyMissionSpec[] {
  const seed = hashDayKey(dayKey);
  const coinPick = COIN_MISSIONS[seed % COIN_MISSIONS.length];
  const speedPick = SPEED_MISSIONS[(seed >>> 4) % SPEED_MISSIONS.length];
  const advPick = ADVENTURE_MISSIONS[(seed >>> 8) % ADVENTURE_MISSIONS.length];

  return [
    { ...coinPick, id: `${dayKey}_slot0_${coinPick.kind}_${coinPick.target}` },
    { ...speedPick, id: `${dayKey}_slot1_${speedPick.kind}_${speedPick.target}` },
    { ...advPick, id: `${dayKey}_slot2_${advPick.kind}_${advPick.target}` },
  ];
}

export function syncDailyMissionState(
  existing: DailyMissionState | undefined,
  dayKey = getLocalDayKey()
): DailyMissionState {
  const specs = getDailyMissionsForDay(dayKey);
  const isSameDay = existing?.dateKey === dayKey;
  const missions: DailyMissionState['missions'] = {};

  for (const spec of specs) {
    const prev = isSameDay ? existing?.missions[spec.id] : undefined;
    missions[spec.id] = prev
      ? {
          id: spec.id,
          progress: prev.progress,
          completed: prev.completed,
          claimed: prev.claimed,
        }
      : {
          id: spec.id,
          progress: 0,
          completed: false,
          claimed: false,
        };
  }

  return {
    dateKey: dayKey,
    missions,
  };
}

export function countClaimableMissions(
  state: DailyMissionState,
  specs: DailyMissionSpec[]
): number {
  let count = 0;
  for (const spec of specs) {
    const prog = state.missions[spec.id];
    if (prog?.completed && !prog.claimed) {
      count++;
    }
  }
  return count;
}

export function totalClaimableMissionCoins(
  state: DailyMissionState,
  specs: DailyMissionSpec[]
): number {
  let total = 0;
  for (const spec of specs) {
    const prog = state.missions[spec.id];
    if (prog?.completed && !prog.claimed) {
      total += spec.rewardCoins;
    }
  }
  return total;
}
