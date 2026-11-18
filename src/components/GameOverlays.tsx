import React from 'react';
import { Coins, ListChecks, Map, Play, RotateCcw, Shirt, Star, Trophy } from 'lucide-react';
import { getLevelSpec } from '../data/levels';
import { GamePhase, LevelClearSummary } from '../types/game';
import { ConfettiBurst } from './ConfettiBurst';

interface GameOverlaysProps {
  phase: GamePhase;
  currentLevel: number;
  highestUnlockedLevel: number;
  totalCoins: number;
  claimableMissionsCount: number;
  claimableMissionCoins: number;
  summary: LevelClearSummary | null;
  onStartLevel: (level: number) => void;
  onResume: () => void;
  onRetry: () => void;
  onOpenWardrobe: () => void;
  onOpenLevels: () => void;
  onOpenMissions: () => void;
  onClaimAllMissions: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  phase,
  currentLevel,
  highestUnlockedLevel,
  totalCoins,
  claimableMissionsCount,
  claimableMissionCoins,
  summary,
  onStartLevel,
  onResume,
  onRetry,
  onOpenWardrobe,
  onOpenLevels,
  onOpenMissions,
  onClaimAllMissions,
}) => {
  if (
    phase === 'playing' ||
    phase === 'finishing' ||
    phase === 'wardrobe' ||
    phase === 'levels' ||
    phase === 'missions'
  ) {
    return null;
  }

  const levelSpec = getLevelSpec(currentLevel);
  const isThreeStarClear =
    (phase === 'levelComplete' || phase === 'victory') && summary?.stars === 3;

  return (
    <>
      <ConfettiBurst
        active={isThreeStarClear}
        triggerKey={summary ? `${summary.level}-${summary.timeSeconds}` : 'none'}
      />
      <div
        className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 pb-6"
        style={{ backgroundColor: 'rgba(8, 17, 13, 0.72)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/15 p-5 shadow-2xl"
          style={{ backgroundColor: '#10221b' }}
        >
        {phase === 'menu' && (
          <div>
            <div className="text-[11px] font-semibold text-amber-400">
              Portrait 3D Rear-View Platformer · 40 Levels
            </div>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-50">
              Jungle Quest 3D
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-300">
              Use the on-screen D-Pad, FIRE, and JUMP buttons behind your
              cowboy explorer! Leap across branches, bump ?-blocks, stomp jungle
              critters, and dodge boulders with real 3D physics.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
              <div>
                <div className="text-stone-400">Unlocked Stage</div>
                <div className="mt-0.5 font-mono-tabular font-bold text-stone-100">
                  Level {highestUnlockedLevel} / 40
                </div>
              </div>
              <div>
                <div className="text-stone-400">Coin Bank</div>
                <div className="mt-0.5 flex items-center gap-1 font-mono-tabular font-bold text-amber-300">
                  <Coins className="h-3.5 w-3.5" />
                  <span>{totalCoins}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onStartLevel(currentLevel)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950 active:scale-[0.98] transition-transform"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Level {currentLevel}</span>
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onOpenWardrobe}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-3 text-xs font-bold text-stone-100 active:bg-white/14"
                >
                  <Shirt className="h-4 w-4 text-amber-300" />
                  <span>Wardrobe</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLevels}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-3 text-xs font-bold text-stone-100 active:bg-white/14"
                >
                  <Map className="h-4 w-4 text-emerald-300" />
                  <span>40 Levels</span>
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenMissions}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold whitespace-nowrap ${
                  claimableMissionsCount > 0
                    ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/15 bg-white/8 text-stone-100 active:bg-white/14'
                }`}
              >
                <ListChecks className="h-4 w-4 text-emerald-300" />
                <span>
                  Daily Missions
                  {claimableMissionsCount > 0
                    ? ` · Claim +${claimableMissionCoins}`
                    : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onStartLevel(1)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-xs font-bold text-stone-200 active:bg-white/14"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
                <span>Restart from Level 1</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div>
            <div className="text-xs font-semibold text-stone-400">
              Level {currentLevel} / 40 · {levelSpec.name}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-stone-50">
              Paused
            </h2>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Resume</span>
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-3 text-xs font-bold text-stone-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Restart</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenWardrobe}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-3 text-xs font-bold text-stone-100"
                >
                  <Shirt className="h-4 w-4 text-amber-300" />
                  <span>Wardrobe</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onStartLevel(1)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/12 px-4 py-2.5 text-xs font-bold text-rose-200 active:bg-rose-500/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart from Level 1</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'levelComplete' && summary && (
          <div>
            <div className="text-xs font-semibold text-emerald-400">
              Level {summary.level} Complete
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-stone-50">
              {getLevelSpec(summary.level).name}
            </h2>

            <div className="mt-3 flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`h-6 w-6 ${
                    s <= summary.stars
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-600'
                  }`}
                />
              ))}
              <span className="ml-2 font-mono-tabular text-xs text-stone-300">
                {summary.timeSeconds.toFixed(1)}s
              </span>
              {summary.stars === 3 && (
                <span className="ml-auto text-xs font-bold text-amber-300">
                  3-Star Clear
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
              <div>
                <div className="text-stone-400">Points</div>
                <div className="mt-0.5 font-mono-tabular font-bold text-stone-100">
                  {summary.points.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Course Coins</div>
                <div className="mt-0.5 font-mono-tabular font-bold text-amber-300">
                  +{summary.coinsEarned}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Clear Bonus</div>
                <div className="mt-0.5 font-mono-tabular font-bold text-emerald-300">
                  +{summary.bonusCoins}
                </div>
              </div>
            </div>

            {summary.newlyUnlockedItems.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-2.5">
                <div className="text-[11px] font-bold text-amber-300">
                  Cosmetic Unlocked
                </div>
                <div className="mt-0.5 text-xs font-semibold text-stone-100">
                  {summary.newlyUnlockedItems.map((i) => i.name).join(', ')}
                </div>
              </div>
            )}

            {claimableMissionsCount > 0 && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 p-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-emerald-300">
                    Daily Mission Complete
                  </div>
                  <div className="text-xs font-mono-tabular text-stone-100">
                    {claimableMissionsCount} ready · +{claimableMissionCoins} coins
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClaimAllMissions}
                  className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-extrabold text-stone-950 whitespace-nowrap shrink-0"
                >
                  Claim
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onStartLevel(Math.min(40, summary.level + 1))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Next: Level {Math.min(40, summary.level + 1)}</span>
              </button>
              <button
                type="button"
                onClick={onOpenWardrobe}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-xs font-bold text-stone-100"
              >
                <Shirt className="h-4 w-4 text-amber-300" />
                <span>Spend Coins in Wardrobe</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'gameOver' && (
          <div>
            <div className="text-xs font-semibold text-rose-400">
              Level {currentLevel} · {levelSpec.name}
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-stone-50">
              Out of Hearts
            </h2>
            <p className="mt-1.5 text-xs text-stone-300">
              All collected coins were saved. Try again or upgrade your style!
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry Level {currentLevel}</span>
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onOpenWardrobe}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-xs font-bold text-stone-100"
                >
                  <Shirt className="h-4 w-4 text-amber-300" />
                  <span>Wardrobe</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLevels}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-xs font-bold text-stone-100"
                >
                  <Map className="h-4 w-4" />
                  <span>Levels</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onStartLevel(1)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-xs font-bold text-stone-200 active:bg-white/14"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
                <span>Restart from Level 1</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'victory' && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Trophy className="h-4 w-4" />
              <span>All 40 Levels Conquered</span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-stone-50">
              Temple Summit Champion
            </h2>
            {summary && (
              <>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${
                        s <= summary.stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-600'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-mono-tabular text-xs text-stone-300">
                    {summary.timeSeconds.toFixed(1)}s
                  </span>
                  {summary.stars === 3 && (
                    <span className="ml-auto text-xs font-bold text-amber-300">
                      3-Star Clear
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
                  <div>
                    <div className="text-stone-400">Points</div>
                    <div className="mt-0.5 font-mono-tabular font-bold text-stone-100">
                      {summary.points.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-400">Course Coins</div>
                    <div className="mt-0.5 font-mono-tabular font-bold text-amber-300">
                      +{summary.coinsEarned}
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-400">Clear Bonus</div>
                    <div className="mt-0.5 font-mono-tabular font-bold text-emerald-300">
                      +{summary.bonusCoins}
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="mt-1.5 text-xs leading-relaxed text-stone-300">
              You conquered every biome through Level 40! Replay any level for 3
              stars or unlock every cosmetic in the Wardrobe.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onOpenLevels}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950"
              >
                <Map className="h-4 w-4" />
                <span>Replay Any Level</span>
              </button>
              <button
                type="button"
                onClick={onOpenWardrobe}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-xs font-bold text-stone-100"
              >
                <Shirt className="h-4 w-4 text-amber-300" />
                <span>Wardrobe</span>
              </button>
              <button
                type="button"
                onClick={() => onStartLevel(1)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-xs font-bold text-stone-200 active:bg-white/14"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
                <span>Restart from Level 1</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
