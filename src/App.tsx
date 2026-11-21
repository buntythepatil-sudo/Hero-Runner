import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { GameOverlays } from './components/GameOverlays';
import { HUD } from './components/HUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { WardrobeModal } from './components/WardrobeModal';
import {
  COSMETIC_ITEMS,
  DEFAULT_EQUIPPED,
  STARTER_UNLOCKED_IDS,
} from './data/cosmetics';
import {
  countClaimableMissions,
  getDailyMissionsForDay,
  getLocalDayKey,
  syncDailyMissionState,
  totalClaimableMissionCoins,
} from './data/dailyMissions';
import { getLevelSpec } from './data/levels';
import { getFestivalForLevel } from './engine/festivalSystem';
import {
  JungleGameCanvas,
  TouchInputBridge,
} from './engine/JungleGameCanvas';
import {
  CosmeticItem,
  DailyMissionProgress,
  DailyMissionSpec,
  GamePhase,
  Gender,
  GraphicsQuality,
  LevelClearSummary,
  LiveHudState,
  SaveData,
  WeatherMode,
} from './types/game';

function detectDefaultGraphicsQuality(): GraphicsQuality {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 8;
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (isMobile && cores <= 4) return 'medium';
  return 'high';
}

function normalizeGraphicsQuality(val: unknown): GraphicsQuality {
  if (val === 'low' || val === 'medium' || val === 'high') return val;
  return detectDefaultGraphicsQuality();
}

const STORAGE_KEY = 'jungle_quest_3d_save_v3';
const PREV_STORAGE_KEY = 'jungle_quest_3d_save_v2';
const LEGACY_STORAGE_KEY = 'jungle_quest_3d_save_v1';

function normalizeLevelTopTimes(
  bestTimes: Record<number, number> | undefined,
  topTimes: Record<number, number[]> | undefined
): Record<number, number[]> {
  const result: Record<number, number[]> = {};
  if (topTimes) {
    for (const [key, list] of Object.entries(topTimes)) {
      const lvl = Number(key);
      if (!Number.isFinite(lvl) || !Array.isArray(list)) continue;
      const cleaned = list
        .filter((t) => typeof t === 'number' && Number.isFinite(t) && t > 0)
        .sort((a, b) => a - b)
        .slice(0, 3);
      if (cleaned.length > 0) {
        result[lvl] = cleaned;
      }
    }
  }
  if (bestTimes) {
    for (const [key, best] of Object.entries(bestTimes)) {
      const lvl = Number(key);
      if (!Number.isFinite(lvl) || typeof best !== 'number' || !Number.isFinite(best) || best <= 0) {
        continue;
      }
      if (!result[lvl] || result[lvl].length === 0) {
        result[lvl] = [best];
      }
    }
  }
  return result;
}

function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const levelBestTimes = parsed.levelBestTimes ?? {};
      return {
        coins: typeof parsed.coins === 'number' ? parsed.coins : 30,
        highestUnlockedLevel: Math.max(1, Math.min(40, parsed.highestUnlockedLevel ?? 1)),
        levelStars: parsed.levelStars ?? {},
        levelBestTimes,
        levelTopTimes: normalizeLevelTopTimes(levelBestTimes, parsed.levelTopTimes),
        unlockedCosmetics: Array.from(
          new Set([...STARTER_UNLOCKED_IDS, ...(parsed.unlockedCosmetics ?? [])])
        ),
        equipped: { ...DEFAULT_EQUIPPED, ...(parsed.equipped ?? {}) },
        autoRun: Boolean(parsed.autoRun),
        muted: Boolean(parsed.muted),
        weatherMode:
          parsed.weatherMode === 'auto' ||
          parsed.weatherMode === 'rain' ||
          parsed.weatherMode === 'mist' ||
          parsed.weatherMode === 'clear'
            ? parsed.weatherMode
            : 'auto',
        graphicsQuality: normalizeGraphicsQuality(parsed.graphicsQuality),
        festivalMode: Boolean(parsed.festivalMode),
        dailyMissions: syncDailyMissionState(parsed.dailyMissions),
      };
    }
    const prevRaw = localStorage.getItem(PREV_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (prevRaw) {
      const parsed = JSON.parse(prevRaw) as Partial<SaveData>;
      const migratedEquipped = { ...DEFAULT_EQUIPPED, ...(parsed.equipped ?? {}) };
      if (migratedEquipped.hat === 'hat_none' || migratedEquipped.hat === 'hat_fedora') {
        migratedEquipped.hat = 'hat_cowboy';
      }
      if (migratedEquipped.outfit === 'outfit_ranger') {
        migratedEquipped.outfit = 'outfit_cowboy';
      }
      if (migratedEquipped.boots === 'boots_leather') {
        migratedEquipped.boots = 'boots_cowboy';
      }
      if (migratedEquipped.color === 'color_olive') {
        migratedEquipped.color = 'color_crimson';
      }
      const levelBestTimes = parsed.levelBestTimes ?? {};
      return {
        coins: typeof parsed.coins === 'number' ? parsed.coins : 30,
        highestUnlockedLevel: Math.max(1, Math.min(40, parsed.highestUnlockedLevel ?? 1)),
        levelStars: parsed.levelStars ?? {},
        levelBestTimes,
        levelTopTimes: normalizeLevelTopTimes(levelBestTimes, parsed.levelTopTimes),
        unlockedCosmetics: Array.from(
          new Set([...STARTER_UNLOCKED_IDS, ...(parsed.unlockedCosmetics ?? [])])
        ),
        equipped: migratedEquipped,
        autoRun: Boolean(parsed.autoRun),
        muted: Boolean(parsed.muted),
        weatherMode: 'auto',
        graphicsQuality: detectDefaultGraphicsQuality(),
        festivalMode: false,
        dailyMissions: syncDailyMissionState(parsed.dailyMissions),
      };
    }
  } catch {
    // ignore corrupted save
  }
  return {
    coins: 30,
    highestUnlockedLevel: 1,
    levelStars: {},
    levelBestTimes: {},
    levelTopTimes: {},
    unlockedCosmetics: [...STARTER_UNLOCKED_IDS],
    equipped: { ...DEFAULT_EQUIPPED },
    autoRun: false,
    muted: false,
    weatherMode: 'auto',
    graphicsQuality: detectDefaultGraphicsQuality(),
    festivalMode: false,
    dailyMissions: syncDailyMissionState(undefined),
  };
}

function advanceDailyMissions(
  prev: SaveData,
  updater: (spec: DailyMissionSpec, current: DailyMissionProgress) => DailyMissionProgress
): SaveData['dailyMissions'] {
  const dayKey = getLocalDayKey();
  const synced = syncDailyMissionState(prev.dailyMissions, dayKey);
  const specs = getDailyMissionsForDay(dayKey);
  const nextMissions = { ...synced.missions };
  for (const spec of specs) {
    const cur = nextMissions[spec.id] ?? {
      id: spec.id,
      progress: 0,
      completed: false,
      claimed: false,
    };
    nextMissions[spec.id] = updater(spec, cur);
  }
  return {
    dateKey: dayKey,
    missions: nextMissions,
  };
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [currentLevel, setCurrentLevel] = useState<number>(() =>
    Math.min(40, loadSaveData().highestUnlockedLevel)
  );
  const [runNonce, setRunNonce] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [returnPhase, setReturnPhase] = useState<GamePhase>('menu');
  const [summary, setSummary] = useState<LevelClearSummary | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<{
    coinsEarned: number;
    points: number;
  } | null>(null);

  const initialSpec = getLevelSpec(currentLevel);
  const [hud, setHud] = useState<LiveHudState>({
    level: initialSpec.levelNumber,
    levelName: initialSpec.name,
    biome: initialSpec.biome,
    lives: 3,
    maxLives: 3,
    sessionCoins: 0,
    progress: 0,
    elapsedTime: 0,
    speedMps: 0,
    activePowerUp: null,
    powerUpRemaining: 0,
    stompCombo: 0,
    weather: 'clear',
    festivalId: save.festivalMode ? getFestivalForLevel(initialSpec.levelNumber).id : null,
    festivalName: save.festivalMode ? getFestivalForLevel(initialSpec.levelNumber).name : null,
  });

  const touchBridgeRef = useRef<TouchInputBridge>({
    left: false,
    right: false,
    forward: false,
    backward: false,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    laneLeftPressed: false,
    laneRightPressed: false,
    firePressed: false,
  });

  // Sync audio mute & save data
  useEffect(() => {
    soundEngine.muted = save.muted;
    if (!save.muted) {
      soundEngine.updateEnvironment({ biome: hud.biome, phase });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // ignore storage quota errors
    }
  }, [save, hud.biome, phase]);

  // Unlock WebAudio ambient engine cleanly on first user gesture
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Escape key pause / modal close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setPhase((prev) => {
          if (prev === 'playing') return 'paused';
          if (prev === 'paused') return 'playing';
          if (prev === 'wardrobe' || prev === 'levels' || prev === 'missions') return returnPhase;
          return prev;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [returnPhase]);

  const startLevel = useCallback((lvl: number) => {
    const clamped = Math.max(1, Math.min(40, lvl));
    const spec = getLevelSpec(clamped);
    const fest = getFestivalForLevel(clamped);
    setCurrentLevel(clamped);
    setRunNonce((n) => n + 1);
    setSummary(null);
    setGameOverSummary(null);
    setHud({
      level: spec.levelNumber,
      levelName: spec.name,
      biome: spec.biome,
      lives: 3,
      maxLives: 3,
      sessionCoins: 0,
      progress: 0,
      elapsedTime: 0,
      speedMps: 0,
      activePowerUp: null,
      powerUpRemaining: 0,
      stompCombo: 0,
      weather: spec.biome === 'waterfall' ? 'mist' : 'clear',
      hasLangoorPet: false,
      onVine: false,
      surpriseAnimalName: null,
      extraLifeBanner: false,
      festivalId: save.festivalMode ? fest.id : null,
      festivalName: save.festivalMode ? fest.name : null,
    });
    setPhase('playing');
  }, [save.festivalMode]);

  const handleSessionCoinsChange = useCallback((delta: number) => {
    setSave((prev) => ({
      ...prev,
      coins: prev.coins + delta,
      dailyMissions: advanceDailyMissions(prev, (spec, cur) => {
        if (spec.kind !== 'collect_coins' || cur.completed) return cur;
        const nextProg = Math.min(spec.target, cur.progress + delta);
        return {
          ...cur,
          progress: nextProg,
          completed: nextProg >= spec.target,
        };
      }),
    }));
  }, []);

  const handleBoxHit = useCallback(() => {
    setSave((prev) => ({
      ...prev,
      dailyMissions: advanceDailyMissions(prev, (spec, cur) => {
        if (spec.kind !== 'hit_boxes' || cur.completed) return cur;
        const nextProg = Math.min(spec.target, cur.progress + 1);
        return {
          ...cur,
          progress: nextProg,
          completed: nextProg >= spec.target,
        };
      }),
    }));
  }, []);

  const handleEnemyDefeated = useCallback(() => {
    setSave((prev) => ({
      ...prev,
      dailyMissions: advanceDailyMissions(prev, (spec, cur) => {
        if (spec.kind !== 'stomp_enemies' || cur.completed) return cur;
        const nextProg = Math.min(spec.target, cur.progress + 1);
        return {
          ...cur,
          progress: nextProg,
          completed: nextProg >= spec.target,
        };
      }),
    }));
  }, []);

  const handleLevelCleared = useCallback(
    (elapsedSeconds: number, sessionCoins: number, livesRemaining: number) => {
      const spec = getLevelSpec(currentLevel);
      const stars =
        elapsedSeconds <= spec.parTime
          ? 3
          : elapsedSeconds <= spec.parTime * 1.45
          ? 2
          : 1;
      const bonusCoins = 12 + currentLevel * 4;
      const points =
        currentLevel * 100 +
        sessionCoins * 25 +
        bonusCoins * 10 +
        stars * 250 +
        livesRemaining * 150;

      const newlyUnlocked: CosmeticItem[] = [];
      setSave((prev) => {
        const nextUnlocked = new Set(prev.unlockedCosmetics);
        for (const item of COSMETIC_ITEMS) {
          if (
            item.unlockLevel !== undefined &&
            currentLevel >= item.unlockLevel &&
            !nextUnlocked.has(item.id)
          ) {
            nextUnlocked.add(item.id);
            newlyUnlocked.push(item);
          }
        }

        const prevStars = prev.levelStars[currentLevel] ?? 0;
        const prevBest = prev.levelBestTimes[currentLevel];
        const prevTop =
          prev.levelTopTimes[currentLevel] ??
          (prevBest !== undefined ? [prevBest] : []);
        const nextTop = [...prevTop, elapsedSeconds]
          .filter((t) => Number.isFinite(t) && t > 0)
          .sort((a, b) => a - b)
          .slice(0, 3);

        return {
          ...prev,
          coins: prev.coins + bonusCoins,
          highestUnlockedLevel: Math.min(
            40,
            Math.max(prev.highestUnlockedLevel, currentLevel + 1)
          ),
          levelStars: {
            ...prev.levelStars,
            [currentLevel]: Math.max(prevStars, stars),
          },
          levelBestTimes: {
            ...prev.levelBestTimes,
            [currentLevel]:
              nextTop[0] ??
              (prevBest === undefined ? elapsedSeconds : Math.min(prevBest, elapsedSeconds)),
          },
          levelTopTimes: {
            ...prev.levelTopTimes,
            [currentLevel]: nextTop,
          },
          unlockedCosmetics: Array.from(nextUnlocked),
          dailyMissions: advanceDailyMissions(prev, (mSpec, cur) => {
            if (cur.completed) return cur;
            if (mSpec.kind === 'speed_clear' && elapsedSeconds <= mSpec.target) {
              return { ...cur, progress: 1, completed: true };
            }
            if (mSpec.kind === 'flawless_clear' && livesRemaining >= 3) {
              return { ...cur, progress: 1, completed: true };
            }
            if (mSpec.kind === 'complete_levels') {
              const nextProg = Math.min(mSpec.target, cur.progress + 1);
              return {
                ...cur,
                progress: nextProg,
                completed: nextProg >= mSpec.target,
              };
            }
            return cur;
          }),
        };
      });

      setSummary({
        level: currentLevel,
        coinsEarned: sessionCoins,
        bonusCoins,
        points,
        timeSeconds: elapsedSeconds,
        stars,
        newlyUnlockedItems: newlyUnlocked,
      });

      setPhase('finishing');
    },
    [currentLevel]
  );

  const handleFinishAnimationComplete = useCallback(() => {
    soundEngine.mysteryBlock();
    setPhase((prev) => {
      if (prev !== 'finishing') return prev;
      return currentLevel === 40 ? 'victory' : 'levelComplete';
    });
  }, [currentLevel]);

  const handleGameOver = useCallback(
    (sessionCoins: number, progress: number) => {
      const distancePoints = Math.round(progress * (80 + currentLevel * 35));
      const points = distancePoints + sessionCoins * 25;
      setGameOverSummary({ coinsEarned: sessionCoins, points });
      setPhase('gameOver');
    },
    [currentLevel]
  );

  const openModal = (target: 'wardrobe' | 'levels' | 'missions') => {
    if (phase === 'playing') {
      setReturnPhase('paused');
    } else if (phase !== 'wardrobe' && phase !== 'levels' && phase !== 'missions') {
      setReturnPhase(phase);
    }
    setPhase(target);
  };

  const closeModal = () => {
    setPhase(returnPhase === 'playing' ? 'paused' : returnPhase);
  };

  const handleClaimMission = useCallback((missionId: string) => {
    soundEngine.mysteryBlock();
    setSave((prev) => {
      const dayKey = getLocalDayKey();
      const synced = syncDailyMissionState(prev.dailyMissions, dayKey);
      const specs = getDailyMissionsForDay(dayKey);
      const targetSpec = specs.find((s) => s.id === missionId);
      const cur = synced.missions[missionId];
      if (!targetSpec || !cur || !cur.completed || cur.claimed) return prev;
      return {
        ...prev,
        coins: prev.coins + targetSpec.rewardCoins,
        dailyMissions: {
          dateKey: dayKey,
          missions: {
            ...synced.missions,
            [missionId]: { ...cur, claimed: true },
          },
        },
      };
    });
  }, []);

  const handleClaimAllMissions = useCallback(() => {
    soundEngine.mysteryBlock();
    setSave((prev) => {
      const dayKey = getLocalDayKey();
      const synced = syncDailyMissionState(prev.dailyMissions, dayKey);
      const specs = getDailyMissionsForDay(dayKey);
      let bonus = 0;
      const nextMissions = { ...synced.missions };
      for (const spec of specs) {
        const cur = nextMissions[spec.id];
        if (cur?.completed && !cur.claimed) {
          bonus += spec.rewardCoins;
          nextMissions[spec.id] = { ...cur, claimed: true };
        }
      }
      if (bonus === 0) return prev;
      return {
        ...prev,
        coins: prev.coins + bonus,
        dailyMissions: {
          dateKey: dayKey,
          missions: nextMissions,
        },
      };
    });
  }, []);

  const handleChangeGender = (gender: Gender) => {
    soundEngine.equip();
    setSave((prev) => ({
      ...prev,
      equipped: { ...prev.equipped, gender },
    }));
  };

  const handleEquip = (item: CosmeticItem) => {
    soundEngine.equip();
    setSave((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [item.category]: item.id,
      },
    }));
  };

  const handlePurchase = (item: CosmeticItem) => {
    if (save.coins < item.price || save.unlockedCosmetics.includes(item.id)) return;
    soundEngine.mysteryBlock();
    setSave((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      unlockedCosmetics: [...prev.unlockedCosmetics, item.id],
      equipped: {
        ...prev.equipped,
        [item.category]: item.id,
      },
    }));
  };

  const todayKey = getLocalDayKey();
  const dailyMissionSpecs = getDailyMissionsForDay(todayKey);
  const dailyMissionState = syncDailyMissionState(save.dailyMissions, todayKey);
  const claimableMissionsCount = countClaimableMissions(dailyMissionState, dailyMissionSpecs);
  const claimableMissionCoins = totalClaimableMissionCoins(dailyMissionState, dailyMissionSpecs);

  const currentWeatherMode: WeatherMode = save.weatherMode ?? 'auto';
  const currentGraphicsQuality: GraphicsQuality = save.graphicsQuality ?? 'high';
  const isFestivalMode = Boolean(save.festivalMode);

  const handleSetFestivalMode = useCallback(
    (enabled: boolean) => {
      if (enabled) soundEngine.mysteryBlock();
      else soundEngine.equip();
      setSave((prev) => ({ ...prev, festivalMode: enabled }));
      const fest = getFestivalForLevel(currentLevel);
      setHud((h) => ({
        ...h,
        festivalId: enabled ? fest.id : null,
        festivalName: enabled ? fest.name : null,
      }));
    },
    [currentLevel]
  );

  const handleToggleFestivalMode = useCallback(() => {
    handleSetFestivalMode(!isFestivalMode);
  }, [handleSetFestivalMode, isFestivalMode]);

  const handleCycleWeatherMode = useCallback(() => {
    const weatherOrder: WeatherMode[] = ['auto', 'rain', 'mist', 'clear'];
    const next = weatherOrder[(weatherOrder.indexOf(currentWeatherMode) + 1) % weatherOrder.length];
    setSave((prev) => ({ ...prev, weatherMode: next }));
    if (next !== 'auto') {
      setHud((h) => ({ ...h, weather: next }));
    }
  }, [currentWeatherMode]);

  const handleSetGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    setSave((prev) => ({ ...prev, graphicsQuality: quality }));
  }, []);

  const handleCycleGraphicsQuality = useCallback(() => {
    const order: GraphicsQuality[] = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(currentGraphicsQuality) + 1) % order.length];
    setSave((prev) => ({ ...prev, graphicsQuality: next }));
  }, [currentGraphicsQuality]);

  return (
    <div
      className={`relative h-dvh w-screen overflow-hidden bg-[#081a14] ${
        currentGraphicsQuality === 'low' ? 'low-gfx' : ''
      }`}
    >
      {/* Full-Bleed 3D WebGL + Cannon-ES Physics Jungle Canvas */}
      <JungleGameCanvas
        levelNumber={currentLevel}
        runNonce={runNonce}
        phase={phase}
        customization={save.equipped}
        autoRun={save.autoRun}
        weatherMode={currentWeatherMode}
        graphicsQuality={currentGraphicsQuality}
        festivalMode={isFestivalMode}
        touchBridgeRef={touchBridgeRef}
        onHudUpdate={setHud}
        onSessionCoinsChange={handleSessionCoinsChange}
        onBoxHit={handleBoxHit}
        onEnemyDefeated={handleEnemyDefeated}
        onLevelCleared={handleLevelCleared}
        onFinishAnimationComplete={handleFinishAnimationComplete}
        onGameOver={handleGameOver}
      />

      {/* Non-occluding Top HUD + Mobile Touch Controls */}
      <HUD
        hud={hud}
        totalCoins={save.coins}
        phase={phase}
        autoRun={save.autoRun}
        muted={save.muted}
        weatherMode={currentWeatherMode}
        graphicsQuality={currentGraphicsQuality}
        festivalMode={isFestivalMode}
        claimableMissionsCount={claimableMissionsCount}
        touchBridgeRef={touchBridgeRef}
        onToggleAutoRun={() =>
          setSave((prev) => ({ ...prev, autoRun: !prev.autoRun }))
        }
        onCycleWeatherMode={handleCycleWeatherMode}
        onCycleGraphicsQuality={handleCycleGraphicsQuality}
        onToggleFestivalMode={handleToggleFestivalMode}
        onToggleMute={() =>
          setSave((prev) => {
            const nextMuted = !prev.muted;
            soundEngine.muted = nextMuted;
            if (!nextMuted) soundEngine.unlock();
            return { ...prev, muted: nextMuted };
          })
        }
        onPauseToggle={() =>
          setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))
        }
        onOpenWardrobe={() => openModal('wardrobe')}
        onOpenLevels={() => openModal('levels')}
        onOpenMissions={() => openModal('missions')}
      />

      {/* Menu / Pause / Level Complete / Game Over / Victory */}
      <GameOverlays
        phase={phase}
        runNonce={runNonce}
        currentLevel={currentLevel}
        highestUnlockedLevel={save.highestUnlockedLevel}
        totalCoins={save.coins}
        graphicsQuality={currentGraphicsQuality}
        festivalMode={isFestivalMode}
        claimableMissionsCount={claimableMissionsCount}
        claimableMissionCoins={claimableMissionCoins}
        summary={summary}
        gameOverSummary={gameOverSummary}
        onStartLevel={startLevel}
        onResume={() => setPhase('playing')}
        onRetry={() => startLevel(currentLevel)}
        onChangeGraphicsQuality={handleSetGraphicsQuality}
        onChangeFestivalMode={handleSetFestivalMode}
        onOpenWardrobe={() => openModal('wardrobe')}
        onOpenLevels={() => openModal('levels')}
        onOpenMissions={() => openModal('missions')}
        onClaimAllMissions={handleClaimAllMissions}
      />

      {/* 3D Explorer Wardrobe & Character Gender Studio */}
      {phase === 'wardrobe' && (
        <WardrobeModal
          coins={save.coins}
          highestUnlockedLevel={save.highestUnlockedLevel}
          unlockedIds={save.unlockedCosmetics}
          equipped={save.equipped}
          onChangeGender={handleChangeGender}
          onEquip={handleEquip}
          onPurchase={handlePurchase}
          onClose={closeModal}
        />
      )}

      {/* 40-Level Expedition Map */}
      {phase === 'levels' && (
        <LevelSelectModal
          currentLevel={currentLevel}
          highestUnlocked={save.highestUnlockedLevel}
          levelStars={save.levelStars}
          levelTopTimes={save.levelTopTimes}
          festivalMode={isFestivalMode}
          onSelectLevel={(lvl) => startLevel(lvl)}
          onClose={closeModal}
        />
      )}

      {/* Daily Missions */}
      {phase === 'missions' && (
        <DailyMissionsModal
          specs={dailyMissionSpecs}
          state={dailyMissionState}
          totalCoins={save.coins}
          onClaimMission={handleClaimMission}
          onClaimAll={handleClaimAllMissions}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
