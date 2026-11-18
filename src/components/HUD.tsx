import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudFog,
  CloudRain,
  Coins,
  Flame,
  Heart,
  ListChecks,
  Map,
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
import { TouchInputBridge } from '../engine/JungleGameCanvas';
import { GamePhase, LiveHudState, WeatherMode } from '../types/game';

interface HUDProps {
  hud: LiveHudState;
  totalCoins: number;
  phase: GamePhase;
  autoRun: boolean;
  muted: boolean;
  weatherMode: WeatherMode;
  claimableMissionsCount: number;
  touchBridgeRef: React.MutableRefObject<TouchInputBridge>;
  onToggleAutoRun: () => void;
  onCycleWeatherMode: () => void;
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
  claimableMissionsCount,
  touchBridgeRef,
  onToggleAutoRun,
  onCycleWeatherMode,
  onToggleMute,
  onPauseToggle,
  onOpenWardrobe,
  onOpenLevels,
  onOpenMissions,
}) => {
  const isPlaying = phase === 'playing';
  const hideMenuButtons = isPlaying || phase === 'finishing';
  const hasBlaster = hud.activePowerUp === 'blaster';
  const activeWeather = weatherMode === 'auto' ? hud.weather : weatherMode;
  const weatherLabel =
    activeWeather === 'rain' ? 'Rain' : activeWeather === 'mist' ? 'Mist' : 'Clear';

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
      tb.firePressed = false;
      setPressedMap({});
    }
  }, [isPlaying, touchBridgeRef]);

  const setTouch = (key: keyof TouchInputBridge, val: boolean) => {
    touchBridgeRef.current[key] = val;
    setPressedMap((prev) => (prev[key] === val ? prev : { ...prev, [key]: val }));
  };

  const dpadClass = (active: boolean) =>
    `flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform touch-none ${
      active
        ? 'scale-90 border-amber-200 bg-amber-400 text-stone-950 shadow-inner'
        : 'border-white/25 text-white shadow-md'
    }`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3">
      {/* Compact Portrait Mobile Top HUD */}
      <div className="flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          {/* Level + Progress */}
          <div
            className="flex flex-1 min-w-0 items-center gap-2.5 rounded-2xl border border-white/20 px-3 py-2 shadow-lg"
            style={{ backgroundColor: 'rgba(14, 30, 22, 0.88)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="font-mono-tabular text-amber-400 shrink-0">
                  L{hud.level}/40
                </span>
                <span aria-hidden="true" className="text-stone-500">·</span>
                <span className="truncate text-stone-100">{hud.levelName}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-transform duration-75 origin-left"
                  style={{ transform: `scaleX(${Math.max(0.04, hud.progress)})` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" aria-label={`Lives ${hud.lives} of ${hud.maxLives}`}>
              {Array.from({ length: hud.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < hud.lives
                      ? 'fill-rose-500 text-rose-400'
                      : 'fill-transparent text-stone-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Coins & Timer */}
          <div
            className="flex items-center gap-2.5 rounded-2xl border border-white/20 px-3 py-2 text-xs font-bold shrink-0 shadow-lg"
            style={{ backgroundColor: 'rgba(14, 30, 22, 0.88)' }}
          >
            <div className="flex items-center gap-1 text-amber-300 font-mono-tabular">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{totalCoins}</span>
            </div>
            <span className="font-mono-tabular text-stone-300">
              {formatTime(hud.elapsedTime)}
            </span>
          </div>
        </div>

        {/* Compact Action Row */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={onCycleWeatherMode}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 px-2 py-1.5 text-[11px] font-semibold text-stone-100 shadow-lg active:bg-white/15 whitespace-nowrap shrink-0"
            style={{ backgroundColor: 'rgba(14, 30, 22, 0.86)' }}
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
                <span className="hidden sm:inline text-stone-300"> · {weatherLabel}</span>
              )}
            </span>
          </button>

          <div
            className="flex items-center gap-0.5 sm:gap-1 rounded-xl border border-white/15 p-1 shadow-lg"
            style={{ backgroundColor: 'rgba(14, 30, 22, 0.86)' }}
          >
            <button
              type="button"
              onClick={onToggleAutoRun}
              className={`px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                autoRun
                  ? 'bg-emerald-400 text-stone-950'
                  : 'text-stone-300 active:bg-white/15'
              }`}
            >
              Auto {autoRun ? 'On' : 'Off'}
            </button>
            {!hideMenuButtons && (
              <>
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
      </div>

      {/* In-Screen Mobile Gamepad Thumb Controls (Always shown during gameplay) */}
      {isPlaying && (
        <div className="flex items-end justify-between gap-2 pb-2 pt-2">
          {/* Left Thumb Zone: Power-Up Badge placed directly OVER Arrow Keys */}
          <div className="flex flex-col items-center gap-2">
            {hud.activePowerUp && (
              <div
                className={`pointer-events-none flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 shadow-lg ${
                  hasBlaster
                    ? 'border-orange-300/60 text-orange-100'
                    : hud.activePowerUp === 'shield'
                    ? 'border-sky-300/60 text-sky-100'
                    : hud.activePowerUp === 'magnet'
                    ? 'border-amber-300/60 text-amber-100'
                    : 'border-emerald-300/60 text-emerald-100'
                }`}
                style={{
                  backgroundColor: hasBlaster
                    ? 'rgba(90, 28, 8, 0.92)'
                    : hud.activePowerUp === 'shield'
                    ? 'rgba(14, 42, 62, 0.92)'
                    : hud.activePowerUp === 'magnet'
                    ? 'rgba(72, 46, 8, 0.92)'
                    : 'rgba(12, 54, 34, 0.92)',
                }}
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
                <span className="font-mono-tabular text-[11px] font-extrabold text-white/90">
                  {Math.ceil(hud.powerUpRemaining)}s
                </span>
              </div>
            )}

            <div className="pointer-events-auto grid grid-cols-3 gap-1.5 touch-none select-none">
              <div />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTouch('forward', true);
                }}
                onPointerUp={() => setTouch('forward', false)}
                onPointerCancel={() => setTouch('forward', false)}
                onLostPointerCapture={() => setTouch('forward', false)}
                className={dpadClass(Boolean(pressedMap.forward))}
                style={!pressedMap.forward ? { backgroundColor: 'rgba(14, 30, 22, 0.86)' } : undefined}
                aria-label="Move Forward"
              >
                <ChevronUp className="h-6 w-6" />
              </button>
              <div />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTouch('left', true);
                }}
                onPointerUp={() => setTouch('left', false)}
                onPointerCancel={() => setTouch('left', false)}
                onLostPointerCapture={() => setTouch('left', false)}
                className={dpadClass(Boolean(pressedMap.left))}
                style={!pressedMap.left ? { backgroundColor: 'rgba(14, 30, 22, 0.86)' } : undefined}
                aria-label="Steer Left"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTouch('right', true);
                }}
                onPointerUp={() => setTouch('right', false)}
                onPointerCancel={() => setTouch('right', false)}
                onLostPointerCapture={() => setTouch('right', false)}
                className={dpadClass(Boolean(pressedMap.right))}
                style={!pressedMap.right ? { backgroundColor: 'rgba(14, 30, 22, 0.86)' } : undefined}
                aria-label="Steer Right"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
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
                      : 'border-orange-200 bg-gradient-to-b from-orange-400 to-red-600 text-white'
                    : pressedMap.firePressed
                    ? 'scale-90 border-white/30 bg-stone-800 text-stone-300'
                    : 'border-white/20 bg-black/60 text-stone-400'
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
                  pressedMap.jumpHeld
                    ? 'scale-90 border-white bg-amber-300 text-stone-950 ring-4 ring-amber-300/45'
                    : 'border-amber-100/80 bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950'
                }`}
                aria-label="Jump"
              >
                JUMP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
