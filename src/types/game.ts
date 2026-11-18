export type Gender = 'male' | 'female';

export type CosmeticCategory =
  | 'hat'
  | 'outfit'
  | 'backpack'
  | 'boots'
  | 'trail'
  | 'color';

export type BiomeType = 'canopy' | 'ruins' | 'waterfall' | 'volcano';

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'levelComplete'
  | 'gameOver'
  | 'victory'
  | 'wardrobe'
  | 'levels'
  | 'missions';

export type PowerUpType = 'shield' | 'magnet' | 'speed' | 'blaster';

export type DailyMissionKind =
  | 'collect_coins'
  | 'speed_clear'
  | 'hit_boxes'
  | 'stomp_enemies'
  | 'flawless_clear'
  | 'complete_levels';

export interface DailyMissionSpec {
  id: string;
  kind: DailyMissionKind;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
}

export interface DailyMissionProgress {
  id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyMissionState {
  dateKey: string;
  missions: Record<string, DailyMissionProgress>;
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  description: string;
  price: number;
  unlockLevel?: number;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  metalness?: number;
  roughness?: number;
  emissiveHex?: string;
}

export interface CharacterCustomization {
  gender: Gender;
  hat: string;
  outfit: string;
  backpack: string;
  boots: string;
  trail: string;
  color: string;
}

export interface SaveData {
  coins: number;
  highestUnlockedLevel: number;
  levelStars: Record<number, number>;
  levelBestTimes: Record<number, number>;
  unlockedCosmetics: string[];
  equipped: CharacterCustomization;
  autoRun: boolean;
  muted: boolean;
  dailyMissions?: DailyMissionState;
}

export interface PlatformSegmentSpec {
  id: string;
  x: number;
  y: number;
  z: number; // Center Z (course goes from z = 0 toward negative Z)
  width: number;
  height: number;
  depth: number;
  kind: 'ground' | 'bridge' | 'moving' | 'crumbling' | 'ice' | 'ramp';
  moveAxis?: 'x' | 'y' | 'z';
  moveRange?: number;
  moveSpeed?: number;
  rampTilt?: number;
}

export type ObstacleKind =
  | 'log'
  | 'boulder_chute'
  | 'pendulum'
  | 'sweeper'
  | 'crab'
  | 'beetle'
  | 'bounce_mushroom'
  | 'power_mushroom'
  | 'mystery_block'
  | 'coin_box'
  | 'crate'
  | 'pipe'
  | 'spike_strip';

export interface ObstacleSpec {
  id: string;
  kind: ObstacleKind;
  x: number;
  y: number;
  z: number;
  width?: number;
  scale?: number;
  patrolRange?: number;
  speed?: number;
  phase?: number;
  reward?: 'coins' | 'shield' | 'magnet' | 'speed' | 'blaster';
}

export interface CoinSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  value: number;
}

export interface LevelSpec {
  levelNumber: number;
  name: string;
  biome: BiomeType;
  difficultyLabel: string;
  parTime: number;
  length: number;
  gravity: number;
  groundFriction: number;
  boulderRate: number;
  platforms: PlatformSegmentSpec[];
  obstacles: ObstacleSpec[];
  coins: CoinSpec[];
  goalZ: number;
  goalY: number;
}

export interface LiveHudState {
  level: number;
  levelName: string;
  biome: BiomeType;
  lives: number;
  maxLives: number;
  sessionCoins: number;
  progress: number; // 0..1
  elapsedTime: number;
  speedMps: number;
  activePowerUp: PowerUpType | null;
  powerUpRemaining: number;
  stompCombo: number;
}

export interface LevelClearSummary {
  level: number;
  coinsEarned: number;
  bonusCoins: number;
  timeSeconds: number;
  stars: number;
  newlyUnlockedItems: CosmeticItem[];
}
