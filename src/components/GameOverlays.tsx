import React, { useEffect, useRef, useState } from 'react';
import { Coins, Gauge, ListChecks, Map, Play, RotateCcw, Shirt, Sparkles, Star, Trophy } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getLevelSpec } from '../data/levels';
import { getFestivalForLevel } from '../engine/festivalSystem';
import { GamePhase, GraphicsQuality, LevelClearSummary } from '../types/game';
import { ConfettiBurst } from './ConfettiBurst';

interface GameOverlaysProps {
  phase: GamePhase;
  runNonce: number;
  currentLevel: number;
  highestUnlockedLevel: number;
  totalCoins: number;
  graphicsQuality: GraphicsQuality;
  festivalMode: boolean;
  claimableMissionsCount: number;
  claimableMissionCoins: number;
  summary: LevelClearSummary | null;
  gameOverSummary: { coinsEarned: number; points: number } | null;
  onStartLevel: (level: number) => void;
  onResume: () => void;
  onRetry: () => void;
  onChangeGraphicsQuality: (quality: GraphicsQuality) => void;
  onChangeFestivalMode: (enabled: boolean) => void;
  onOpenWardrobe: () => void;
  onOpenLevels: () => void;
  onOpenMissions: () => void;
  onClaimAllMissions: () => void;
}

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  phase,
  runNonce,
  currentLevel,
  highestUnlockedLevel,
  totalCoins,
  graphicsQuality,
  festivalMode,
  claimableMissionsCount,
  claimableMissionCoins,
  summary,
  gameOverSummary,
  onStartLevel,
  onResume,
  onRetry,
  onChangeGraphicsQuality,
  onChangeFestivalMode,
  onOpenWardrobe,
  onOpenLevels,
  onOpenMissions,
  onClaimAllMissions,
}) => {
  const isEndPhase =
    phase === 'levelComplete' || phase === 'victory' || phase === 'gameOver';

  // Step 1: Show Coins Collection & Points first; Step 2: Show Level Card on click/tap
  const [showLevelCard, setShowLevelCard] = useState(false);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const endEnteredAtRef = useRef<number>(0);

  const isClearedEnd =
    (phase === 'levelComplete' || phase === 'victory') && Boolean(summary);
  const targetCourseCoins = isClearedEnd
    ? summary!.coinsEarned
    : gameOverSummary?.coinsEarned ?? 0;
  const targetBonusCoins = isClearedEnd ? summary!.bonusCoins : 0;
  const targetTotalCoins = targetCourseCoins + targetBonusCoins;
  const targetPoints = isClearedEnd
    ? summary!.points
    : gameOverSummary?.points ?? 0;

  useEffect(() => {
    if (!isEndPhase) {
      setShowLevelCard(false);
      return;
    }
    setShowLevelCard(false);
    endEnteredAtRef.current = performance.now();

    let rafId = 0;
    const startAt = performance.now();
    const durationMs = 720;

    const animateCounters = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCoins(Math.round(targetTotalCoins * eased));
      setDisplayPoints(Math.round(targetPoints * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(animateCounters);
      }
    };
    rafId = requestAnimationFrame(animateCounters);
    return () => cancelAnimationFrame(rafId);
  }, [isEndPhase, phase, runNonce, targetTotalCoins, targetPoints]);

  useEffect(() => {
    if (!isEndPhase || showLevelCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (performance.now() - endEnteredAtRef.current < 260) return;
        e.preventDefault();
        soundEngine.equip();
        setShowLevelCard(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEndPhase, showLevelCard]);

  if (
    phase === 'playing' ||
    phase === 'finishing' ||
    phase === 'wardrobe' ||
    phase === 'levels' ||
    phase === 'missions'
  ) {
    return null;
  }

  const handleRevealLevelCard = () => {
    if (performance.now() - endEnteredAtRef.current < 260) return;
    soundEngine.equip();
    setShowLevelCard(true);
  };

  const levelSpec = getLevelSpec(currentLevel);
  const currentFestival = getFestivalForLevel(currentLevel);
  const isThreeStarClear =
    (phase === 'levelComplete' || phase === 'victory') && summary?.stars === 3;

  const renderFestivalSelector = () => (
    <div
      className={`mt-3 rounded-xl border px-3 py-2 transition-colors ${
        festivalMode
          ? 'border-amber-300/45 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/12 to-sky-500/15'
          : 'border-white/12 bg-black/25'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-200">
          <Sparkles
            className={`h-3.5 w-3.5 shrink-0 ${
              festivalMode ? 'text-amber-300' : 'text-stone-400'
            }`}
          />
          <span>Background Mode</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-black/35 p-0.5">
          <button
            type="button"
            onClick={() => onChangeFestivalMode(false)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
              !festivalMode
                ? 'bg-emerald-400 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => onChangeFestivalMode(true)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
              festivalMode
                ? 'bg-gradient-to-r from-amber-300 via-pink-400 to-orange-400 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Festival
          </button>
        </div>
      </div>
      {festivalMode && (
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[10px]">
          <span className="font-bold text-amber-200 truncate">
            L{currentLevel}: {currentFestival.name} · {currentFestival.subtitle}
          </span>
          <span className="text-stone-300/80 shrink-0">Diwali, Holi, Uttarayan & more</span>
        </div>
      )}
    </div>
  );

  const renderQualitySelector = () => (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-black/25 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-300">
        <Gauge className="h-3.5 w-3.5 text-emerald-300" />
        <span>Graphics</span>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-black/30 p-0.5">
        {QUALITY_OPTIONS.map((opt) => {
          const active = graphicsQuality === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeGraphicsQuality(opt.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-300 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <ConfettiBurst
        active={isThreeStarClear}
        triggerKey={summary ? `${summary.level}-${summary.timeSeconds}` : 'none'}
      />
      {isEndPhase && !showLevelCard ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleRevealLevelCard}
          className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center p-6 select-none"
          style={{ backgroundColor: 'rgba(6, 15, 11, 0.72)' }}
          aria-label="Coins collected and points earned. Click anywhere to view level card."
        >
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em] ${
                phase === 'gameOver'
                  ? 'text-rose-300'
                  : phase === 'victory'
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }`}
            >
              {phase === 'victory' ? (
                <Trophy className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>
                {phase === 'gameOver'
                  ? 'Run Complete'
                  : phase === 'victory'
                  ? 'All 40 Levels Cleared'
                  : 'Stage Cleared'}
              </span>
            </div>

            {/* Coins Collection Showcase */}
            <div className="mt-6 w-full rounded-2xl border border-amber-300/35 bg-black/45 px-6 py-5 shadow-[0_12px_36px_rgba(245,158,11,0.22)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/85">
                Coins Collected
              </div>
              <div className="mt-2 flex items-center justify-center gap-2.5 font-display text-5xl font-extrabold text-amber-300 font-mono-tabular drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)]">
                <Coins className="h-9 w-9 text-amber-400 shrink-0" />
                <span>+{displayCoins.toLocaleString()}</span>
              </div>
              {isClearedEnd ? (
                <div className="mt-2.5 flex items-center justify-center gap-3 text-xs font-mono-tabular text-stone-300">
                  <span>Course +{targetCourseCoins}</span>
                  <span aria-hidden="true" className="text-white/25">·</span>
                  <span className="text-emerald-300">Clear Bonus +{targetBonusCoins}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs text-stone-300">
                  Saved to Coin Bank ({totalCoins.toLocaleString()} total)
                </div>
              )}
            </div>

            {/* Points Earned Showcase */}
            <div className="mt-3.5 w-full rounded-2xl border border-emerald-300/30 bg-black/45 px-6 py-5 shadow-[0_12px_32px_rgba(16,185,129,0.18)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200/85">
                Points Earned
              </div>
              <div className="mt-1.5 font-display text-5xl font-extrabold text-stone-50 font-mono-tabular drop-shadow-[0_2px_12px_rgba(52,211,153,0.35)]">
                {displayPoints.toLocaleString()}
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-bold tracking-wide text-stone-100">
              Tap anywhere to view Level Card
            </div>
          </div>
        </div>
      ) : (
      <div
        className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 pb-6"
        style={{ backgroundColor: 'rgba(6, 15, 11, 0.58)' }}
      >
        <div className="hud-glass-card w-full max-w-md rounded-2xl p-5">
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

            {renderFestivalSelector()}
            {renderQualitySelector()}

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onStartLevel(currentLevel)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950 shadow-[0_8px_22px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-transform"
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
            {renderFestivalSelector()}
            {renderQualitySelector()}
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 px-5 py-3.5 font-display text-base font-extrabold text-stone-950 shadow-[0_8px_22px_rgba(245,158,11,0.35)]"
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
      )}
    </>
  );
};
