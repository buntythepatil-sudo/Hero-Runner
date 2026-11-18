import React from 'react';
import { Check, Coins, Clock, Target, X } from 'lucide-react';
import { DailyMissionSpec, DailyMissionState } from '../types/game';

interface DailyMissionsModalProps {
  specs: DailyMissionSpec[];
  state: DailyMissionState;
  totalCoins: number;
  onClaimMission: (missionId: string) => void;
  onClaimAll: () => void;
  onClose: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  specs,
  state,
  totalCoins,
  onClaimMission,
  onClaimAll,
  onClose,
}) => {
  const completedCount = specs.filter((s) => state.missions[s.id]?.completed).length;
  const claimableSpecs = specs.filter((s) => {
    const p = state.missions[s.id];
    return p?.completed && !p.claimed;
  });
  const totalClaimableCoins = claimableSpecs.reduce((sum, s) => sum + s.rewardCoins, 0);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ backgroundColor: '#0e1b16' }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-stone-50">
            Daily Missions
          </h2>
          <p className="text-[11px] text-stone-400">
            {state.dateKey} · {completedCount} of {specs.length} completed
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 font-mono-tabular text-xs font-bold text-amber-300">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span>{totalCoins}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-300 hover:bg-white/10 active:bg-white/15"
            aria-label="Close Daily Missions"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scroll">
        <div className="mx-auto max-w-md space-y-4">
          {claimableSpecs.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3.5">
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-300">
                  Rewards Ready
                </div>
                <div className="mt-0.5 text-xs text-stone-200 font-mono-tabular">
                  {claimableSpecs.length} mission{claimableSpecs.length > 1 ? 's' : ''} · +{totalClaimableCoins} coins
                </div>
              </div>
              <button
                type="button"
                onClick={onClaimAll}
                className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-stone-950 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
              >
                Claim All
              </button>
            </div>
          )}

          <div className="space-y-3">
            {specs.map((spec) => {
              const prog = state.missions[spec.id] ?? {
                id: spec.id,
                progress: 0,
                completed: false,
                claimed: false,
              };

              const isSpeed = spec.kind === 'speed_clear';
              const ratio = isSpeed
                ? prog.completed
                  ? 1
                  : 0
                : Math.min(1, prog.progress / Math.max(1, spec.target));

              const progressText = isSpeed
                ? prog.completed
                  ? 'Goal met'
                  : `Target under ${spec.target}s`
                : `${Math.min(prog.progress, spec.target)} / ${spec.target}`;

              return (
                <div
                  key={spec.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    prog.claimed
                      ? 'border-emerald-400/20 bg-emerald-950/25'
                      : prog.completed
                      ? 'border-amber-400/45 bg-amber-400/10'
                      : 'border-white/12 bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-stone-100">
                        {isSpeed ? (
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate">{spec.title}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-stone-300">
                        {spec.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {prog.claimed ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 whitespace-nowrap">
                          <Check className="h-3.5 w-3.5" />
                          <span>Claimed</span>
                        </div>
                      ) : prog.completed ? (
                        <button
                          type="button"
                          onClick={() => onClaimMission(spec.id)}
                          className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-xs font-extrabold text-stone-950 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>Claim +{spec.rewardCoins}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 font-mono-tabular text-xs font-bold text-amber-300 whitespace-nowrap">
                          <Coins className="h-3.5 w-3.5 text-amber-400" />
                          <span>+{spec.rewardCoins}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-mono-tabular text-stone-400">
                      <span>{progressText}</span>
                      <span>{Math.round(ratio * 100)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full origin-left rounded-full transition-transform duration-200 ${
                          prog.claimed
                            ? 'bg-emerald-400'
                            : prog.completed
                            ? 'bg-amber-400'
                            : 'bg-emerald-500/80'
                        }`}
                        style={{ transform: `scaleX(${Math.max(0.03, ratio)})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
