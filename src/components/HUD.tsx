import React, { useState } from 'react';
import {
  Clock,
  CloudFog,
  CloudRain,
  Coins,
  Flame,
  Gauge,
  Heart,
  Leaf,
  ListChecks,
  Map,
  Move,
  Pause,
  Play,
  Shield,
  Shirt,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { getFestivalForLevel } from '../engine/festivalSystem';
import { TouchInputBridge } from '../engine/JungleGameCanvas';
import {
  GamePhase,
  GraphicsQuality,
  LiveHudState,
  WeatherMode,
} from '../types/game';

interface HUDProps {
  hud: LiveHudState;
  totalCoins: number;
  phase: GamePhase;
  autoRun: boolean;
  muted: boolean;
  weatherMode: WeatherMode;
  graphicsQuality: GraphicsQuality;
  festivalMode: boolean;
  claimableMissionsCount: number;
  touchBridgeRef: React.MutableRefObject<TouchInputBridge>;
  onToggleAutoRun: () => void;
  onCycleWeatherMode: () => void;
  onCycleGraphicsQuality: () => void;
  onToggleFestivalMode: () => void;
  onToggleMute: () => void;
  onPauseToggle: () => void;
  onOpenWardrobe: () => void;
  onOpenLevels: () => void;
  onOpenMissions: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  totalCoins,
  phase,
  autoRun,
  muted,
  weatherMode,
  graphicsQuality,
  festivalMode,
  claimableMissionsCount,
  touchBridgeRef,
  onToggleAutoRun,
  onCycleWeatherMode,
  onCycleGraphicsQuality,
  onToggleFestivalMode,
  onToggleMute,
  onPauseToggle,
  onOpenWardrobe,
  onOpenLevels,
  onOpenMissions,
}) => {
  const activeFestival = getFestivalForLevel(hud.level);
  const isPlaying = phase === 'playing';
  const hideMenuButtons = isPlaying || phase === 'finishing';
  const hasBlaster = hud.activePowerUp === 'blaster';
  const activeWeather = weatherMode === 'auto' ? hud.weather : weatherMode;
  const weatherLabel =
    activeWeather === 'rain' ? 'Rain' : activeWeather === 'mist' ? 'Mist' : 'Clear';
  const qualityLabel =
    graphicsQuality === 'high' ? 'High' : graphicsQuality === 'medium' ? 'Med' : 'Low';
  const progressPct = Math.max(4, Math.min(100, Math.round(hud.progress * 100)));

  const [pressedMap, setPressedMap] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!isPlaying) {
      const tb = touchBridgeRef.current;
      tb.left = false;
      tb.right = false;
      tb.forward = false;
      tb.backward = false;
      tb.sprint = false;
      tb.jumpPressed = false;
      tb.jumpHeld = false;
      tb.laneLeftPressed = false;
      tb.laneRightPressed = false;
      tb.firePressed = false;
      setPressedMap({});
    }
  }, [isPlaying, touchBridgeRef]);

  const setTouch = (key: keyof TouchInputBridge, val: boolean) => {
    touchBridgeRef.current[key] = val;
    setPressedMap((prev) => (prev[key] === val ? prev : { ...prev, [key]: val }));
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between safe-hud-pad">
      {/* Premium Glass Portrait Mobile Top HUD */}
      <div className="flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          {/* Level + Glowing Emerald-to-Gold Progress + Hearts */}
          <div className="hud-glass flex flex-1 min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono-tabular font-bold text-amber-300 shrink-0">
                    L{hud.level}/40
                  </span>
                  <span aria-hidden="true" className="text-emerald-200/40">·</span>
                  <span className="truncate text-stone-50 drop-shadow-sm">{hud.levelName}</span>
                </div>
                <span className="hidden xs:inline font-mono-tabular text-[10px] text-emerald-200/80 shrink-0">
                  {progressPct}%
                </span>
              </div>
              <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-black/35 p-0.5 ring-1 ring-white/10">
                <div
                  className="progress-bar-glow relative h-full rounded-full transition-[width] duration-75 ease-out"
                  style={{ width: `${progressPct}%` }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-100 shadow-[0_0_8px_#fef08a]"
                  />
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-0.5 shrink-0 pl-0.5"
              aria-label={`Lives ${hud.lives} of ${hud.maxLives}`}
            >
              {Array.from({ length: hud.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-3.5 w-3.5 transition-transform ${
                    i < hud.lives
                      ? 'fill-rose-500 text-rose-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.55)]'
                      : 'fill-transparent text-stone-500/70'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Coins & Timer Glass Module */}
          <div className="hud-glass flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shrink-0">
            <div className="flex items-center gap-1 text-amber-300 font-mono-tabular">
              <Coins className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              <span>{totalCoins}</span>
            </div>
            <span aria-hidden="true" className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1 font-mono-tabular text-emerald-50/90">
              <Clock className="h-3 w-3 text-emerald-300/80 hidden sm:inline" />
              <span>{formatTime(hud.elapsedTime)}</span>
            </div>
          </div>
        </div>

        {/* Compact Glass Action Row */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCycleWeatherMode}
              className="hud-glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-stone-100 active:bg-white/15 whitespace-nowrap shrink-0"
              aria-label={`Weather mode: ${weatherMode === 'auto' ? `Dynamic (${weatherLabel})` : weatherLabel}. Click to switch.`}
              title={`Weather: ${weatherMode === 'auto' ? `Dynamic (${weatherLabel})` : weatherLabel}`}
            >
              {activeWeather === 'rain' ? (
                <CloudRain className="h-3.5 w-3.5 text-sky-300 shrink-0" />
              ) : activeWeather === 'mist' ? (
                <CloudFog className="h-3.5 w-3.5 text-emerald-200 shrink-0" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              )}
              <span>
                {weatherMode === 'auto' ? 'Auto' : weatherLabel}
                {weatherMode === 'auto' && (
                  <span className="hidden sm:inline text-emerald-100/75"> · {weatherLabel}</span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleFestivalMode}
              className={`hud-glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                festivalMode
                  ? 'border-amber-300/70 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                  : 'text-stone-200 active:bg-white/15'
              }`}
              aria-pressed={festivalMode}
              title={
                festivalMode
                  ? `Festival Mode ON: ${activeFestival.name} (${activeFestival.subtitle})`
                  : 'Enable Festival Mode (Diwali, Holi, Uttarayan, Halloween & more)'
              }
            >
              <Sparkles
                className={`h-3.5 w-3.5 shrink-0 ${
                  festivalMode ? 'text-amber-300' : 'text-stone-300'
                }`}
              />
              <span>{festivalMode ? activeFestival.name : 'Festival'}</span>
            </button>
          </div>

          <div className="hud-glass flex items-center gap-0.5 sm:gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={onToggleAutoRun}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                autoRun
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-300 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-200 active:bg-white/15'
              }`}
            >
              Auto {autoRun ? 'On' : 'Off'}
            </button>
            {!hideMenuButtons && (
              <>
                <button
                  type="button"
                  onClick={onCycleGraphicsQuality}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-200 active:bg-white/15 whitespace-nowrap shrink-0"
                  title={`Graphics quality: ${qualityLabel}`}
                >
                  <Gauge className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{qualityLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenMissions}
                  className={`flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] font-semibold active:bg-white/15 whitespace-nowrap shrink-0 ${
                    claimableMissionsCount > 0 ? 'text-emerald-300' : 'text-stone-200'
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>
                    Missions{claimableMissionsCount > 0 ? ` (${claimableMissionsCount})` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLevels}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] font-semibold text-stone-200 active:bg-white/15 whitespace-nowrap shrink-0"
                >
                  <Map className="h-3.5 w-3.5" />
                  <span>Levels</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenWardrobe}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 active:bg-white/15 whitespace-nowrap shrink-0"
                >
                  <Shirt className="h-3.5 w-3.5" />
                  <span>Gear</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded-lg text-stone-200 active:bg-white/15"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            {(phase === 'playing' || phase === 'paused') && (
              <button
                type="button"
                onClick={onPauseToggle}
                className="p-1.5 rounded-lg text-stone-200 active:bg-white/15"
                aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
              >
                {phase === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Fun-only Surprise Animal Cameo Banner */}
        {isPlaying && hud.surpriseAnimalName && (
          <div className="pointer-events-none flex justify-center pt-0.5">
            <div className="hud-glass flex items-center gap-2 rounded-2xl border-amber-300/65 px-3.5 py-1.5 text-xs font-bold text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>Surprise Guest:</span>
              <span className="text-emerald-200">{hud.surpriseAnimalName}</span>
            </div>
          </div>
        )}

        {/* Restored Extra Life Toast */}
        {isPlaying && hud.extraLifeBanner && (
          <div className="pointer-events-none flex justify-center pt-0.5">
            <div className="hud-glass flex items-center gap-1.5 rounded-2xl border-rose-300/75 px-3.5 py-1.5 text-xs font-extrabold text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.45)]">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-200 shrink-0" />
              <span>+1 Extra Life Restored!</span>
            </div>
          </div>
        )}
      </div>

      {/* In-Screen Mobile Gamepad Thumb Controls (Always shown during gameplay) */}
      {isPlaying && (
        <div className="flex items-end justify-between gap-2 pb-1 pt-2">
          {/* Left Thumb Zone: Companion & Power-Up Badges + Open Swipe Space */}
          <div className="flex flex-col items-start gap-2">
            {hud.onVine && (
              <div className="hud-glass pointer-events-none flex items-center gap-1.5 rounded-xl border-emerald-300/75 px-2.5 py-1 text-[11px] font-bold text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.45)] whitespace-nowrap">
                <Leaf className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <span>Vine Swing · Tap LAUNCH</span>
              </div>
            )}
            {hud.hasLangoorPet && (
              <div className="hud-glass pointer-events-none flex items-center gap-1.5 rounded-xl border-sky-300/60 px-2.5 py-1 text-[11px] font-bold text-sky-100 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                <span>Langoor Pet</span>
              </div>
            )}
            {hud.activePowerUp && (
              <div
                className={`hud-glass pointer-events-none flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 ${
                  hasBlaster
                    ? 'border-orange-300/60 text-orange-100'
                    : hud.activePowerUp === 'shield'
                    ? 'border-sky-300/60 text-sky-100'
                    : hud.activePowerUp === 'magnet'
                    ? 'border-amber-300/60 text-amber-100'
                    : 'border-emerald-300/60 text-emerald-100'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap">
                  {hud.activePowerUp === 'blaster' && <Flame className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                  {hud.activePowerUp === 'shield' && <Shield className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                  {hud.activePowerUp === 'magnet' && <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  {hud.activePowerUp === 'speed' && <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  <span>
                    {hud.activePowerUp === 'blaster'
                      ? 'Blaster Active'
                      : hud.activePowerUp === 'shield'
                      ? 'Shield Active'
                      : hud.activePowerUp === 'magnet'
                      ? 'Magnet Active'
                      : 'Speed Boost'}
                  </span>
                </div>
                <span className="font-mono-tabular text-[11px] font-extrabold text-white/95">
                  {Math.ceil(hud.powerUpRemaining)}s
                </span>
              </div>
            )}

            <div className="pointer-events-none flex items-center gap-1.5 px-1 text-[11px] font-semibold text-white/75 drop-shadow">
              <Move className="h-4 w-4 text-amber-300/90 shrink-0" />
              <span>{autoRun ? 'Swipe ↑ sprint · ← → move' : 'Swipe ↑ run · ↓ stop · ← → move'}</span>
            </div>
          </div>

          {/* Right Thumb Zone: FIRE placed directly OVER JUMP */}
          <div className="pointer-events-auto flex items-end gap-2.5 touch-none select-none">
            <div className="flex flex-col items-center gap-2.5">
              {/* FIRE button directly OVER JUMP */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTouch('firePressed', true);
                }}
                onPointerUp={() => setPressedMap((prev) => ({ ...prev, firePressed: false }))}
                onPointerCancel={() => setPressedMap((prev) => ({ ...prev, firePressed: false }))}
                onLostPointerCapture={() => setPressedMap((prev) => ({ ...prev, firePressed: false }))}
                className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 font-display text-[11px] font-extrabold shadow-xl transition-transform touch-none ${
                  hasBlaster
                    ? pressedMap.firePressed
                      ? 'scale-90 border-yellow-100 bg-orange-400 text-white ring-4 ring-orange-400/50'
                      : 'border-orange-200 bg-gradient-to-b from-orange-400 to-red-600 text-white shadow-[0_0_16px_rgba(249,115,22,0.55)]'
                    : pressedMap.firePressed
                    ? 'scale-90 border-white/30 bg-stone-800 text-stone-300'
                    : 'hud-glass border-white/25 text-stone-300'
                }`}
                aria-label="Shoot Blaster Gun"
              >
                <Flame className="h-4 w-4" />
                <span>FIRE</span>
              </button>

              {/* JUMP button directly below FIRE */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTouch('jumpPressed', true);
                  setTouch('jumpHeld', true);
                }}
                onPointerUp={() => setTouch('jumpHeld', false)}
                onPointerCancel={() => setTouch('jumpHeld', false)}
                onLostPointerCapture={() => setTouch('jumpHeld', false)}
                className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 font-display text-sm font-extrabold shadow-2xl transition-transform touch-none ${
                  hud.onVine
                    ? pressedMap.jumpHeld
                      ? 'scale-90 border-white bg-emerald-300 text-stone-950 ring-4 ring-emerald-300/55'
                      : 'border-emerald-200 bg-gradient-to-b from-emerald-300 via-emerald-400 to-amber-400 text-stone-950 shadow-[0_8px_24px_rgba(52,211,153,0.6)]'
                    : pressedMap.jumpHeld
                    ? 'scale-90 border-white bg-amber-300 text-stone-950 ring-4 ring-amber-300/45'
                    : 'border-amber-100/85 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-stone-950 shadow-[0_8px_24px_rgba(245,158,11,0.45)]'
                }`}
                aria-label={hud.onVine ? 'Launch off vine' : 'Jump'}
              >
                {hud.onVine ? 'LAUNCH' : 'JUMP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
