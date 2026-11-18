import React from 'react';
import { Lock, Star, X } from 'lucide-react';
import { ALL_LEVELS } from '../data/levels';
import { BiomeType } from '../types/game';

interface LevelSelectModalProps {
  currentLevel: number;
  highestUnlocked: number;
  levelStars: Record<number, number>;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

const BIOME_GROUPS: { biome: BiomeType; title: string; range: string }[] = [
  { biome: 'canopy', title: 'Sunlit Jungle Canopy', range: 'Levels 1–5' },
  { biome: 'ruins', title: 'Mossy Canyon Ruins', range: 'Levels 6–10' },
  { biome: 'waterfall', title: 'Mistfall Cascades', range: 'Levels 11–15' },
  { biome: 'volcano', title: 'Volcanic Temple Summit', range: 'Levels 16–20' },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevel,
  highestUnlocked,
  levelStars,
  onSelectLevel,
  onClose,
}) => {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ backgroundColor: '#0e1b16' }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-50">
            20-Level Expedition
          </h2>
          <p className="text-[11px] text-stone-400">
            Each level escalates in physics challenge
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-stone-300 active:bg-white/10"
          aria-label="Close Level Select"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
        {BIOME_GROUPS.map((group) => {
          const levels = ALL_LEVELS.filter((l) => l.biome === group.biome);
          return (
            <section key={group.biome}>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h3 className="font-display text-sm font-bold text-stone-100">
                  {group.title}
                </h3>
                <span className="text-[11px] text-stone-400">{group.range}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {levels.map((lvl) => {
                  const unlocked = lvl.levelNumber <= highestUnlocked;
                  const stars = levelStars[lvl.levelNumber] || 0;
                  const isCurrent = lvl.levelNumber === currentLevel;

                  return (
                    <button
                      key={lvl.levelNumber}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onSelectLevel(lvl.levelNumber)}
                      className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                        !unlocked
                          ? 'border-white/5 bg-white/3 opacity-50 cursor-not-allowed'
                          : isCurrent
                          ? 'border-amber-400 bg-amber-400/12'
                          : 'border-white/12 bg-white/5 active:bg-white/12'
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
                        <div className="mt-0.5 text-[10px] text-stone-400">
                          {lvl.difficultyLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
