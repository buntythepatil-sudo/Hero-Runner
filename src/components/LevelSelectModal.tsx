import React, { useState } from 'react';
import { Lock, Play, RotateCcw, Star, Trophy, X } from 'lucide-react';
import { ALL_LEVELS } from '../data/levels';
import { BiomeType } from '../types/game';

interface LevelSelectModalProps {
  currentLevel: number;
  highestUnlocked: number;
  levelStars: Record<number, number>;
  levelTopTimes: Record<number, number[]>;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

type ModalTab = 'levels' | 'bestScores';
type ScoreFilter = 'all' | 'cleared';

const BIOME_GROUPS: { biome: BiomeType; title: string; range: string }[] = [
  { biome: 'canopy', title: 'Sunlit Jungle Canopy', range: 'Levels 1–10' },
  { biome: 'ruins', title: 'Mossy Canyon Ruins', range: 'Levels 11–20' },
  { biome: 'waterfall', title: 'Mistfall Cascades', range: 'Levels 21–30' },
  { biome: 'volcano', title: 'Volcanic Temple Summit', range: 'Levels 31–40' },
];

function formatBestTime(sec: number): string {
  if (sec >= 60) {
    const mins = Math.floor(sec / 60);
    const rem = sec - mins * 60;
    return `${mins}:${rem.toFixed(2).padStart(5, '0')}`;
  }
  return `${sec.toFixed(2)}s`;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevel,
  highestUnlocked,
  levelStars,
  levelTopTimes,
  onSelectLevel,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('levels');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');

  const clearedCount = ALL_LEVELS.filter(
    (lvl) => (levelTopTimes[lvl.levelNumber]?.length ?? 0) > 0
  ).length;
  const totalStars = ALL_LEVELS.reduce(
    (sum, lvl) => sum + (levelStars[lvl.levelNumber] ?? 0),
    0
  );
  const threeStarCount = ALL_LEVELS.filter(
    (lvl) => (levelStars[lvl.levelNumber] ?? 0) === 3
  ).length;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ backgroundColor: '#0e1b16' }}
    >
      {/* Header + Tabs */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-stone-50 truncate">
              40-Level Expedition
            </h2>
            <p className="text-[11px] text-stone-400">
              {activeTab === 'levels'
                ? 'Select a stage to run or replay for 3 stars'
                : 'Top 3 fastest times achieved on each course'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-300 hover:bg-white/10 active:bg-white/15 shrink-0"
            aria-label="Close Level Select"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-3">
          <div
            role="tablist"
            aria-label="Level select views"
            className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/35 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'levels'}
              onClick={() => setActiveTab('levels')}
              className={`min-h-[40px] rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'levels'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              Levels
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'bestScores'}
              onClick={() => setActiveTab('bestScores')}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'bestScores'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span>Best Scores</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scroll">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {activeTab === 'levels' ? (
            BIOME_GROUPS.map((group) => {
              const levels = ALL_LEVELS.filter((l) => l.biome === group.biome);
              return (
                <section key={group.biome}>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h3 className="font-display text-sm font-bold text-stone-100">
                      {group.title}
                    </h3>
                    <span className="text-[11px] text-stone-400">{group.range}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {levels.map((lvl) => {
                      const unlocked = lvl.levelNumber <= highestUnlocked;
                      const stars = levelStars[lvl.levelNumber] || 0;
                      const bestTime = levelTopTimes[lvl.levelNumber]?.[0];
                      const isCurrent = lvl.levelNumber === currentLevel;

                      return (
                        <button
                          key={lvl.levelNumber}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => onSelectLevel(lvl.levelNumber)}
                          className={`flex min-h-[88px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                            !unlocked
                              ? 'border-white/5 bg-white/3 opacity-50 cursor-not-allowed'
                              : isCurrent
                              ? 'border-amber-400 bg-amber-400/12'
                              : 'border-white/12 bg-white/5 hover:bg-white/10 active:bg-white/14'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-mono-tabular text-xs font-bold text-amber-400">
                              {String(lvl.levelNumber).padStart(2, '0')}
                            </span>
                            {unlocked ? (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s <= stars
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-stone-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <Lock className="h-3 w-3 text-stone-500" />
                            )}
                          </div>
                          <div className="mt-1.5 w-full">
                            <div className="truncate text-xs font-semibold text-stone-100">
                              {lvl.name}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-stone-400">
                              <span>{lvl.difficultyLabel}</span>
                              {bestTime !== undefined && (
                                <span className="font-mono-tabular text-emerald-300">
                                  {formatBestTime(bestTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            <>
              {/* Clean Summary & Filter Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300 font-mono-tabular">
                  <span>Cleared {clearedCount}/40</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span className="text-amber-300">Stars {totalStars}/120</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span className="text-emerald-300">3-Star Courses {threeStarCount}</span>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/35 p-1">
                  <button
                    type="button"
                    onClick={() => setScoreFilter('all')}
                    className={`min-h-[34px] rounded-md px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      scoreFilter === 'all'
                        ? 'bg-white/15 text-stone-50'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    All 40
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreFilter('cleared')}
                    className={`min-h-[34px] rounded-md px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      scoreFilter === 'cleared'
                        ? 'bg-white/15 text-stone-50'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Cleared ({clearedCount})
                  </button>
                </div>
              </div>

              {scoreFilter === 'cleared' && clearedCount === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/4 p-6 text-center">
                  <p className="font-display text-base font-bold text-stone-100">
                    No Course Times Recorded Yet
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    Complete a level to log your fastest 3 runs and chase 3-star par times.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectLevel(currentLevel)}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 font-display text-sm font-extrabold text-stone-950 active:scale-[0.98] transition-transform"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Play Level {currentLevel}</span>
                  </button>
                </div>
              ) : (
                BIOME_GROUPS.map((group) => {
                  const biomeLevels = ALL_LEVELS.filter((l) => {
                    if (l.biome !== group.biome) return false;
                    if (scoreFilter === 'cleared') {
                      return (levelTopTimes[l.levelNumber]?.length ?? 0) > 0;
                    }
                    return true;
                  });
                  if (biomeLevels.length === 0) return null;

                  return (
                    <section key={group.biome}>
                      <div className="mb-2.5 flex items-baseline justify-between">
                        <h3 className="font-display text-sm font-bold text-stone-100">
                          {group.title}
                        </h3>
                        <span className="text-[11px] text-stone-400">{group.range}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {biomeLevels.map((lvl) => {
                          const unlocked = lvl.levelNumber <= highestUnlocked;
                          const stars = levelStars[lvl.levelNumber] || 0;
                          const times = levelTopTimes[lvl.levelNumber] ?? [];
                          const isCurrent = lvl.levelNumber === currentLevel;

                          return (
                            <button
                              key={lvl.levelNumber}
                              type="button"
                              disabled={!unlocked}
                              onClick={() => onSelectLevel(lvl.levelNumber)}
                              className={`flex flex-col rounded-xl border p-3.5 text-left transition-colors ${
                                !unlocked
                                  ? 'border-white/5 bg-white/3 opacity-50 cursor-not-allowed'
                                  : isCurrent
                                  ? 'border-amber-400/70 bg-amber-400/10 hover:bg-amber-400/15'
                                  : 'border-white/12 bg-white/5 hover:bg-white/9 active:bg-white/12'
                              }`}
                            >
                              {/* Course Header */}
                              <div className="flex w-full items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                                    <span className="font-mono-tabular text-amber-400 shrink-0">
                                      {String(lvl.levelNumber).padStart(2, '0')}
                                    </span>
                                    <span className="truncate">{lvl.name}</span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-400 font-mono-tabular">
                                    <span>3★ Par {lvl.parTime.toFixed(0)}s</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{lvl.difficultyLabel}</span>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {unlocked ? (
                                    <>
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3].map((s) => (
                                          <Star
                                            key={s}
                                            className={`h-3.5 w-3.5 ${
                                              s <= stars
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-stone-600'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                                        {times.length > 0 ? (
                                          <>
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            <span>Replay</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play className="h-2.5 w-2.5 fill-current" />
                                            <span>Play</span>
                                          </>
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <Lock className="h-3.5 w-3.5 text-stone-500" />
                                  )}
                                </div>
                              </div>

                              {/* Top 3 Times Rows */}
                              <div className="mt-3 w-full divide-y divide-white/8 border-t border-white/10 pt-1">
                                {[0, 1, 2].map((idx) => {
                                  const t = times[idx];
                                  const rankColor =
                                    idx === 0
                                      ? 'text-amber-300'
                                      : idx === 1
                                      ? 'text-stone-200'
                                      : 'text-amber-500/80';
                                  const beatPar = t !== undefined && t <= lvl.parTime;
                                  const delta = t !== undefined ? t - lvl.parTime : 0;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between py-1.5 text-xs font-mono-tabular"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className={`w-5 font-bold ${t !== undefined ? rankColor : 'text-stone-600'}`}>
                                          #{idx + 1}
                                        </span>
                                        <span
                                          className={
                                            t !== undefined
                                              ? idx === 0
                                                ? 'font-bold text-stone-50'
                                                : 'font-semibold text-stone-200'
                                              : 'text-stone-600'
                                          }
                                        >
                                          {t !== undefined ? formatBestTime(t) : '--.--s'}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[11px] ${
                                          t === undefined
                                            ? 'text-stone-600'
                                            : beatPar
                                            ? 'font-semibold text-emerald-300'
                                            : 'text-stone-400'
                                        }`}
                                      >
                                        {t === undefined
                                          ? unlocked
                                            ? 'Unclaimed'
                                            : 'Locked'
                                          : beatPar
                                          ? '3★ Pace'
                                          : `+${delta.toFixed(2)}s par`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
