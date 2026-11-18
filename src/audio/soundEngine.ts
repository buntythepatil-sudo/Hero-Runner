import { BiomeType, GamePhase } from '../types/game';
import { AfricanDrumEngine } from './africanDrums';

export type TerrainType = 'dirt' | 'grass' | 'stone' | 'wood' | 'ice';

interface BiomeAmbientProfile {
  birds: number;
  insects: number;
  water: number;
  breeze: number;
  waterCutoff: number;
  waterQ: number;
  sparkleGain: number;
  sparkleFreq: number;
}

const BIOME_AMBIENT_PROFILES: Record<BiomeType, BiomeAmbientProfile> = {
  canopy: {
    birds: 0.95,
    insects: 0.85,
    water: 0.30,
    breeze: 0.50,
    waterCutoff: 950,
    waterQ: 0.7,
    sparkleGain: 0.42,
    sparkleFreq: 1650,
  },
  ruins: {
    birds: 0.62,
    insects: 0.72,
    water: 0.48,
    breeze: 0.64,
    waterCutoff: 760,
    waterQ: 0.85,
    sparkleGain: 0.34,
    sparkleFreq: 1400,
  },
  waterfall: {
    birds: 0.30,
    insects: 0.26,
    water: 1.0,
    breeze: 0.70,
    waterCutoff: 1550,
    waterQ: 0.55,
    sparkleGain: 0.92,
    sparkleFreq: 1950,
  },
  volcano: {
    birds: 0.12,
    insects: 0.16,
    water: 0.62,
    breeze: 0.80,
    waterCutoff: 230,
    waterQ: 1.2,
    sparkleGain: 0.14,
    sparkleFreq: 980,
  },
};

export interface AmbientEnvState {
  biome: BiomeType;
  phase: GamePhase;
  playerY?: number;
  speedHoriz?: number;
  nearWater?: boolean;
  rainLevel?: number;
}

interface AmbientGraph {
  masterGain: GainNode;
  waterGain: GainNode;
  waterLowpass: BiquadFilterNode;
  waterSparkleGain: GainNode;
  waterSparkleFilter: BiquadFilterNode;
  insectGain: GainNode;
  breezeGain: GainNode;
  birdBus: GainNode;
  sources: AudioBufferSourceNode[];
  lfos: OscillatorNode[];
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private pageHidden = false;

  private ambient: AmbientGraph | null = null;
  private musicMasterGain: GainNode | null = null;
  private drums: AfricanDrumEngine | null = null;
  private footstepNoiseBuf: AudioBuffer | null = null;
  private schedulerId: number | null = null;
  private nextBirdTime = 0;
  private nextCritterTime = 0;
  private lastWildlifeScatterAt = 0;

  private envState: Required<AmbientEnvState> = {
    biome: 'canopy',
    phase: 'menu',
    playerY: 1,
    speedHoriz: 0,
    nearWater: false,
    rainLevel: 0,
  };

  private effectiveBirdLevel = 0.5;
  private effectiveInsectLevel = 0.5;

  constructor() {
    if (typeof document !== 'undefined') {
      this.pageHidden = document.hidden;
      document.addEventListener('visibilitychange', () => {
        this.pageHidden = document.hidden;
        this.applyAmbientTargets();
      });
    }
  }

  public get muted(): boolean {
    return this._muted;
  }

  public set muted(val: boolean) {
    if (this._muted === val) return;
    this._muted = val;
    if (!val) {
      this.ensureAmbientStarted();
    }
    this.applyAmbientTargets();
  }

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if (this._muted && !allowWhenMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this._muted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    if (this._muted) return;
    if (this.ctx && this.ctx.state === 'running' && this.ambient) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.ensureAmbientStarted();
        this.applyAmbientTargets();
      }).catch(() => {});
    } else {
      this.ensureAmbientStarted();
      this.applyAmbientTargets();
    }
  }

  private createSeamlessPinkNoiseBuffer(ctx: AudioContext, seconds = 4.0): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      data[i] = Math.max(-1, Math.min(1, sample));
    }

    // Crossfade head & tail for click-free looping
    const fadeLen = Math.min(Math.floor(sampleRate * 0.12), Math.floor(length * 0.1));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const tailIdx = length - fadeLen + i;
      const mixed = data[i] * t + data[tailIdx] * (1 - t);
      data[i] = mixed;
      data[tailIdx] = mixed;
    }

    return buffer;
  }

  private createSeamlessWhiteNoiseBuffer(ctx: AudioContext, seconds = 3.0): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const fadeLen = Math.min(Math.floor(sampleRate * 0.08), Math.floor(length * 0.1));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const tailIdx = length - fadeLen + i;
      const mixed = data[i] * t + data[tailIdx] * (1 - t);
      data[i] = mixed;
      data[tailIdx] = mixed;
    }
    return buffer;
  }

  private ensureAmbientStarted() {
    if (this._muted || this.ambient) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.connect(ctx.destination);

    const pinkBuffer = this.createSeamlessPinkNoiseBuffer(ctx, 4.0);
    const whiteBuffer = this.createSeamlessWhiteNoiseBuffer(ctx, 3.0);

    const sources: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // 1. Flowing Water / Geothermal Rumble Body
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = pinkBuffer;
    waterSrc.loop = true;

    const waterLowpass = ctx.createBiquadFilter();
    waterLowpass.type = 'lowpass';
    waterLowpass.frequency.setValueAtTime(900, now);
    waterLowpass.Q.setValueAtTime(0.7, now);

    const waterGain = ctx.createGain();
    waterGain.gain.setValueAtTime(0.04, now);

    const waterSurgeLfo = ctx.createOscillator();
    waterSurgeLfo.frequency.setValueAtTime(0.18, now);
    const waterSurgeAmt = ctx.createGain();
    waterSurgeAmt.gain.setValueAtTime(160, now);
    waterSurgeLfo.connect(waterSurgeAmt);
    waterSurgeAmt.connect(waterLowpass.frequency);

    waterSrc.connect(waterLowpass);
    waterLowpass.connect(waterGain);
    waterGain.connect(masterGain);

    // Water Rapids Sparkle / Babble Layer
    const sparkleSrc = ctx.createBufferSource();
    sparkleSrc.buffer = whiteBuffer;
    sparkleSrc.loop = true;

    const waterSparkleFilter = ctx.createBiquadFilter();
    waterSparkleFilter.type = 'bandpass';
    waterSparkleFilter.frequency.setValueAtTime(1650, now);
    waterSparkleFilter.Q.setValueAtTime(1.4, now);

    const sparkleModGain = ctx.createGain();
    sparkleModGain.gain.setValueAtTime(0.65, now);
    const sparkleLfo = ctx.createOscillator();
    sparkleLfo.frequency.setValueAtTime(0.31, now);
    const sparkleLfoDepth = ctx.createGain();
    sparkleLfoDepth.gain.setValueAtTime(0.28, now);
    sparkleLfo.connect(sparkleLfoDepth);
    sparkleLfoDepth.connect(sparkleModGain.gain);

    const waterSparkleGain = ctx.createGain();
    waterSparkleGain.gain.setValueAtTime(0.015, now);

    sparkleSrc.connect(waterSparkleFilter);
    waterSparkleFilter.connect(sparkleModGain);
    sparkleModGain.connect(waterSparkleGain);
    waterSparkleGain.connect(masterGain);

    // 2. Insects Chorus Layer (Warm Tropical Crickets & Cicadas)
    const insectSrc = ctx.createBufferSource();
    insectSrc.buffer = whiteBuffer;
    insectSrc.loop = true;

    const insectBandA = ctx.createBiquadFilter();
    insectBandA.type = 'bandpass';
    insectBandA.frequency.setValueAtTime(3950, now);
    insectBandA.Q.setValueAtTime(7.5, now);

    const insectBandB = ctx.createBiquadFilter();
    insectBandB.type = 'bandpass';
    insectBandB.frequency.setValueAtTime(4820, now);
    insectBandB.Q.setValueAtTime(8.5, now);

    const insectPulseGain = ctx.createGain();
    insectPulseGain.gain.setValueAtTime(0.55, now);

    // Rapid subtle cricket pulse + slow swarm breath
    const insectTrillLfo = ctx.createOscillator();
    insectTrillLfo.frequency.setValueAtTime(16.5, now);
    const insectTrillDepth = ctx.createGain();
    insectTrillDepth.gain.setValueAtTime(0.35, now);
    insectTrillLfo.connect(insectTrillDepth);
    insectTrillDepth.connect(insectPulseGain.gain);

    const insectSwellGain = ctx.createGain();
    insectSwellGain.gain.setValueAtTime(0.65, now);
    const insectSwellLfo = ctx.createOscillator();
    insectSwellLfo.frequency.setValueAtTime(0.22, now);
    const insectSwellDepth = ctx.createGain();
    insectSwellDepth.gain.setValueAtTime(0.32, now);
    insectSwellLfo.connect(insectSwellDepth);
    insectSwellDepth.connect(insectSwellGain.gain);

    const insectGain = ctx.createGain();
    insectGain.gain.setValueAtTime(0.018, now);

    insectSrc.connect(insectBandA);
    insectSrc.connect(insectBandB);
    insectBandA.connect(insectPulseGain);
    insectBandB.connect(insectPulseGain);
    insectPulseGain.connect(insectSwellGain);
    insectSwellGain.connect(insectGain);
    insectGain.connect(masterGain);

    // 3. Soft Canopy Breeze / Foliage Rustle
    const breezeSrc = ctx.createBufferSource();
    breezeSrc.buffer = pinkBuffer;
    breezeSrc.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.setValueAtTime(510, now);
    breezeFilter.Q.setValueAtTime(0.75, now);

    const breezeLfo = ctx.createOscillator();
    breezeLfo.frequency.setValueAtTime(0.14, now);
    const breezeLfoAmt = ctx.createGain();
    breezeLfoAmt.gain.setValueAtTime(150, now);
    breezeLfo.connect(breezeLfoAmt);
    breezeLfoAmt.connect(breezeFilter.frequency);

    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.025, now);

    breezeSrc.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(masterGain);

    // 4. Distant Bird & Critter Bus with Soft Canopy Echo
    const birdBus = ctx.createGain();
    birdBus.gain.setValueAtTime(1.0, now);

    const birdDistanceLP = ctx.createBiquadFilter();
    birdDistanceLP.type = 'lowpass';
    birdDistanceLP.frequency.setValueAtTime(3600, now);

    const echoDelay = ctx.createDelay(0.5);
    echoDelay.delayTime.setValueAtTime(0.17, now);
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.setValueAtTime(0.24, now);
    const echoWet = ctx.createGain();
    echoWet.gain.setValueAtTime(0.32, now);

    birdBus.connect(birdDistanceLP);
    birdDistanceLP.connect(masterGain);
    birdDistanceLP.connect(echoDelay);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(echoWet);
    echoWet.connect(masterGain);

    sources.push(waterSrc, sparkleSrc, insectSrc, breezeSrc);
    lfos.push(waterSurgeLfo, sparkleLfo, insectTrillLfo, insectSwellLfo, breezeLfo);

    sources.forEach((s, idx) => s.start(now, idx * 0.43));
    lfos.forEach((l) => l.start(now));

    this.ambient = {
      masterGain,
      waterGain,
      waterLowpass,
      waterSparkleGain,
      waterSparkleFilter,
      insectGain,
      breezeGain,
      birdBus,
      sources,
      lfos,
    };

    // 5. African Drum Ensemble Background Music
    const musicMaster = ctx.createGain();
    musicMaster.gain.setValueAtTime(this._muted || this.pageHidden ? 0.0001 : 1.0, now);
    musicMaster.connect(ctx.destination);
    this.musicMasterGain = musicMaster;

    this.drums = new AfricanDrumEngine(ctx, musicMaster, whiteBuffer);
    this.drums.setState(
      this.envState.biome,
      this.envState.phase,
      this.envState.rainLevel,
      !(this._muted || this.pageHidden)
    );
    this.drums.start();

    this.nextBirdTime = now + 0.8;
    this.nextCritterTime = now + 1.4;

    if (this.schedulerId === null && typeof window !== 'undefined') {
      this.schedulerId = window.setInterval(() => {
        this.tickAmbientScheduler();
      }, 360);
    }
  }

  public updateEnvironment(state: AmbientEnvState) {
    this.envState = {
      biome: state.biome,
      phase: state.phase,
      playerY: state.playerY ?? 1,
      speedHoriz: state.speedHoriz ?? 0,
      nearWater: state.nearWater ?? false,
      rainLevel: state.rainLevel ?? 0,
    };
    if (!this._muted && this.ctx && this.ctx.state === 'running' && !this.ambient) {
      this.ensureAmbientStarted();
    }
    this.applyAmbientTargets();
  }

  private applyAmbientTargets() {
    if (!this.ctx || !this.ambient) return;

    const now = this.ctx.currentTime;
    const { biome, phase, playerY, speedHoriz, nearWater, rainLevel } = this.envState;
    const prof = BIOME_AMBIENT_PROFILES[biome];

    // Phase-aware master mix
    let phaseMix = 0.42;
    if (phase === 'playing') phaseMix = 1.0;
    else if (phase === 'paused' || phase === 'gameOver' || phase === 'levelComplete' || phase === 'victory') {
      phaseMix = 0.22;
    }

    const activeMaster = this._muted || this.pageHidden ? 0.0001 : phaseMix;

    // Subtle in-level elevation, water-crossing & velocity shifts
    const altitudeNorm = Math.max(0, Math.min(1, (playerY - 0.5) / 7));
    const speedNorm = Math.max(0, Math.min(1, speedHoriz / 14));
    const waterProximityBoost = (nearWater ? 0.34 : 0) + (playerY < 1.0 ? 0.14 : 0) - altitudeNorm * 0.2;
    const rain = Math.max(0, Math.min(1, rainLevel));

    const waterLevel = Math.max(0.08, Math.min(1.3, prof.water * (1 + waterProximityBoost)));
    const insectLevel = Math.max(0.05, Math.min(1.15, prof.insects * (1 - altitudeNorm * 0.18) * (1 - rain * 0.45)));
    const breezeLevel = Math.max(0.15, Math.min(1.3, prof.breeze * (1 + altitudeNorm * 0.28 + speedNorm * 0.22)));
    const birdLevel = Math.max(0.05, Math.min(1.2, prof.birds * (1 + altitudeNorm * 0.12)));

    this.effectiveBirdLevel = birdLevel;
    this.effectiveInsectLevel = insectLevel;

    const tc = 0.55;
    this.ambient.masterGain.gain.setTargetAtTime(activeMaster, now, 0.28);
    const isActive = !(this._muted || this.pageHidden);
    if (this.musicMasterGain) {
      this.musicMasterGain.gain.setTargetAtTime(isActive ? 1.0 : 0.0001, now, 0.22);
    }
    this.drums?.setState(biome, phase, rain, isActive);
    this.ambient.waterGain.gain.setTargetAtTime(0.095 * waterLevel, now, tc);
    this.ambient.waterLowpass.frequency.setTargetAtTime(
      prof.waterCutoff * (1 + (nearWater ? 0.16 : 0)),
      now,
      tc
    );
    this.ambient.waterLowpass.Q.setTargetAtTime(prof.waterQ, now, tc);
    this.ambient.waterSparkleGain.gain.setTargetAtTime(0.032 * waterLevel * prof.sparkleGain + 0.022 * rain, now, tc);
    this.ambient.waterSparkleFilter.frequency.setTargetAtTime(prof.sparkleFreq + rain * 400, now, tc);
    this.ambient.insectGain.gain.setTargetAtTime(0.026 * insectLevel, now, tc);
    this.ambient.breezeGain.gain.setTargetAtTime(0.038 * breezeLevel + 0.018 * rain, now, tc);
  }

  private tickAmbientScheduler() {
    if (this._muted || this.pageHidden || !this.ctx || !this.ambient) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const { biome, phase } = this.envState;

    // Prevent queued bursts if context paused briefly
    if (this.nextBirdTime < now - 0.5) {
      this.nextBirdTime = now + 0.6;
    }
    if (this.nextCritterTime < now - 0.5) {
      this.nextCritterTime = now + 0.9;
    }

    const phaseScale = phase === 'playing' ? 1.0 : 0.6;

    if (now >= this.nextBirdTime) {
      this.spawnDistantBirdCall(biome, this.effectiveBirdLevel * phaseScale);
      const baseGap =
        biome === 'canopy'
          ? 2.1 + Math.random() * 2.6
          : biome === 'ruins'
          ? 3.2 + Math.random() * 3.4
          : biome === 'waterfall'
          ? 4.4 + Math.random() * 4.2
          : 7.5 + Math.random() * 6.5;
      this.nextBirdTime = now + baseGap;
    }

    if (now >= this.nextCritterTime) {
      if (this.effectiveInsectLevel > 0.22) {
        this.spawnTreeFrogOrKatydid(this.effectiveInsectLevel * phaseScale);
      }
      this.nextCritterTime = now + 2.8 + Math.random() * 4.0;
    }
  }

  private scheduleBirdTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    delay: number,
    gainPeak: number,
    pan: number,
    type: OscillatorType = 'sine'
  ) {
    if (!this.ctx || !this.ambient) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.035, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), now);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ambient.birdBus);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private spawnDistantBirdCall(biome: BiomeType, intensity: number) {
    if (intensity <= 0.04) return;
    const pan = (Math.random() - 0.5) * 1.5;
    const baseGain = (0.022 + Math.random() * 0.022) * Math.min(1.15, intensity);
    const pitchVar = 0.92 + Math.random() * 0.16;

    const r = Math.random();
    if (biome === 'volcano' || (biome === 'ruins' && r > 0.72)) {
      // Distant soaring hawk / canyon cry
      this.scheduleBirdTone(1880 * pitchVar, 1080 * pitchVar, 0.42, 0, baseGain * 0.95, pan, 'triangle');
      this.scheduleBirdTone(1640 * pitchVar, 960 * pitchVar, 0.34, 0.48, baseGain * 0.7, pan, 'sine');
    } else if (r < 0.32) {
      // Tropical songbird 3-note warble
      this.scheduleBirdTone(1680 * pitchVar, 2380 * pitchVar, 0.09, 0, baseGain, pan, 'sine');
      this.scheduleBirdTone(2120 * pitchVar, 2680 * pitchVar, 0.11, 0.11, baseGain * 1.05, pan, 'sine');
      this.scheduleBirdTone(2300 * pitchVar, 1780 * pitchVar, 0.16, 0.25, baseGain * 0.85, pan, 'sine');
    } else if (r < 0.62) {
      // Canopy dove / toucan warm coo
      this.scheduleBirdTone(840 * pitchVar, 620 * pitchVar, 0.22, 0, baseGain * 1.1, pan, 'sine');
      this.scheduleBirdTone(740 * pitchVar, 540 * pitchVar, 0.28, 0.28, baseGain * 0.95, pan, 'sine');
    } else if (r < 0.85) {
      // Rainforest flute thrush two-tone whistle
      this.scheduleBirdTone(1320 * pitchVar, 1560 * pitchVar, 0.18, 0, baseGain, pan, 'sine');
      this.scheduleBirdTone(1240 * pitchVar, 1020 * pitchVar, 0.24, 0.22, baseGain * 0.9, pan, 'sine');
    } else {
      // Bright distant canopy parakeet twin chirp
      this.scheduleBirdTone(2350 * pitchVar, 3050 * pitchVar, 0.07, 0, baseGain * 0.75, pan, 'triangle');
      this.scheduleBirdTone(2650 * pitchVar, 2150 * pitchVar, 0.08, 0.09, baseGain * 0.7, pan, 'triangle');
    }
  }

  private spawnTreeFrogOrKatydid(intensity: number) {
    const pan = (Math.random() - 0.5) * 1.6;
    const gain = 0.011 * Math.min(1, intensity);
    const freq = (2850 + Math.random() * 650);
    this.scheduleBirdTone(freq, freq * 1.08, 0.035, 0, gain, pan, 'sine');
    this.scheduleBirdTone(freq * 1.02, freq * 0.95, 0.04, 0.065, gain * 0.85, pan, 'sine');
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.ensureAmbientStarted();

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  jump() {
    this.tone(240, 560, 0.14, 'triangle', 0.15);
  }

  doubleJump() {
    this.tone(420, 840, 0.15, 'sine', 0.14);
  }

  coin() {
    this.tone(987, 987, 0.06, 'sine', 0.12, 0);
    this.tone(1318, 1318, 0.16, 'sine', 0.13, 0.055);
  }

  stomp() {
    this.tone(280, 90, 0.13, 'square', 0.12, 0);
    this.tone(360, 620, 0.12, 'triangle', 0.12, 0.04);
  }

  bouncePad() {
    this.tone(190, 740, 0.24, 'sine', 0.16);
  }

  mysteryBlock() {
    this.tone(523, 523, 0.06, 'triangle', 0.14, 0);
    this.tone(659, 659, 0.06, 'triangle', 0.14, 0.06);
    this.tone(784, 1046, 0.18, 'triangle', 0.15, 0.12);
  }

  hurt() {
    this.tone(220, 70, 0.26, 'sawtooth', 0.16);
  }

  equip() {
    this.tone(520, 780, 0.09, 'sine', 0.1);
  }

  shoot() {
    this.tone(720, 180, 0.11, 'square', 0.12);
  }

  powerUp() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.tone(n, n * 1.08, 0.1, 'triangle', 0.13, idx * 0.055);
    });
  }

  levelClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, n, 0.16, 'triangle', 0.15, idx * 0.09);
    });
  }

  monkeyChirp() {
    this.tone(540, 880, 0.08, 'sine', 0.1, 0);
    this.tone(760, 480, 0.09, 'sine', 0.09, 0.085);
  }

  wildlifeScatter(kind: 'parrot' | 'butterfly' | 'hummingbird') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastWildlifeScatterAt < 0.35) return;
    this.lastWildlifeScatterAt = now;

    if (kind === 'parrot') {
      // Soft startled tropical double-squawk + gentle wing-flutter puff
      this.scheduleBirdTone(1240, 1680, 0.085, 0, 0.042, (Math.random() - 0.5) * 0.8, 'triangle');
      this.scheduleBirdTone(1520, 1120, 0.1, 0.095, 0.036, (Math.random() - 0.5) * 0.8, 'triangle');
      const noiseBuf = this.getFootstepNoiseBuffer(ctx);
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.065;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(900 + i * 180, t);
        bp.Q.setValueAtTime(1.4, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + 0.014);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        src.connect(bp);
        bp.connect(g);
        g.connect(ctx.destination);
        src.start(t, Math.random() * 0.1, 0.06);
      }
    } else if (kind === 'hummingbird') {
      this.scheduleBirdTone(2650, 3250, 0.055, 0, 0.022, (Math.random() - 0.5) * 0.7, 'sine');
      this.scheduleBirdTone(3100, 2500, 0.06, 0.06, 0.018, (Math.random() - 0.5) * 0.7, 'sine');
    } else {
      // Soft airy wing shimmer for scattering butterflies
      const noiseBuf = this.getFootstepNoiseBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2100, now);
      bp.Q.setValueAtTime(2.0, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.016, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now, Math.random() * 0.1, 0.16);
    }
  }

  birdFlockFlyover(variant = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.ensureAmbientStarted();

    const now = ctx.currentTime;
    const v = ((variant % 5) + 5) % 5;
    const pitchMult = [1.0, 0.72, 1.28, 0.88, 1.12][v];
    const oscPrimary: OscillatorType = v === 1 ? 'sawtooth' : v === 2 ? 'sine' : 'triangle';

    // 1. Swooshing wingbeat rush passing from behind overhead into the sky ahead
    const noiseBuf = this.createSeamlessPinkNoiseBuffer(ctx, 1.9);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.3, now);
    filter.frequency.setValueAtTime(320 * (0.9 + v * 0.05), now);
    filter.frequency.exponentialRampToValueAtTime(920 * (0.9 + v * 0.05), now + 0.55);
    filter.frequency.exponentialRampToValueAtTime(360, now + 1.65);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.0001, now);
    // Wingbeat swell envelope
    const beats = [0.12, 0.36, 0.60, 0.86, 1.12, 1.38];
    beats.forEach((t, idx) => {
      const peak = idx < 3 ? 0.085 - idx * 0.008 : 0.055 - (idx - 3) * 0.014;
      whooshGain.gain.linearRampToValueAtTime(Math.max(0.01, peak), now + t);
      whooshGain.gain.linearRampToValueAtTime(0.012, now + t + 0.14);
    });
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.75);

    noiseSrc.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + 1.8);

    // 2. Overlapping stereo flock calls sweeping overhead (varied per bird species)
    const flockCalls: Array<{
      f1: number;
      f2: number;
      dur: number;
      delay: number;
      pan: number;
      gain: number;
      type: OscillatorType;
    }> = [
      { f1: 1480 * pitchMult, f2: 2240 * pitchMult, dur: 0.14, delay: 0.04, pan: -0.45, gain: 0.075, type: oscPrimary },
      { f1: 2150 * pitchMult, f2: 1620 * pitchMult, dur: 0.16, delay: 0.19, pan: -0.25, gain: 0.065, type: 'sine' },
      { f1: 1850 * pitchMult, f2: 2680 * pitchMult, dur: 0.12, delay: 0.32, pan: 0.35, gain: 0.08, type: oscPrimary },
      { f1: 2420 * pitchMult, f2: 1790 * pitchMult, dur: 0.18, delay: 0.50, pan: 0.15, gain: 0.07, type: 'sine' },
      { f1: 1680 * pitchMult, f2: 2350 * pitchMult, dur: 0.13, delay: 0.72, pan: -0.55, gain: 0.055, type: 'sine' },
      { f1: 2050 * pitchMult, f2: 1440 * pitchMult, dur: 0.22, delay: 0.94, pan: 0.45, gain: 0.05, type: oscPrimary },
    ];

    for (const c of flockCalls) {
      const start = now + c.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      osc.type = c.type;
      osc.frequency.setValueAtTime(c.f1, start);
      osc.frequency.exponentialRampToValueAtTime(c.f2, start + c.dur);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(c.gain * (oscPrimary === 'sawtooth' ? 0.55 : 1), start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + c.dur);

      panner.pan.setValueAtTime(c.pan, start);

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + c.dur + 0.03);
    }
  }

  private getFootstepNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.footstepNoiseBuf && this.footstepNoiseBuf.sampleRate === ctx.sampleRate) {
      return this.footstepNoiseBuf;
    }
    const len = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.08 * white) / 1.08;
      data[i] = white * 0.65 + last * 1.4;
    }
    this.footstepNoiseBuf = buf;
    return buf;
  }

  public footstep(terrain: TerrainType, intensity = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;
    const volScale = Math.min(1.35, Math.max(0.55, intensity)) * (0.88 + Math.random() * 0.22);
    const noiseBuf = this.getFootstepNoiseBuffer(ctx);

    if (terrain === 'grass') {
      // Soft leafy brush + muted earthy pad
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.setValueAtTime(1.05 * pitchJitter, now);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1750 * pitchJitter, now);
      bp.frequency.exponentialRampToValueAtTime(980, now + 0.075);
      bp.Q.setValueAtTime(1.15, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.065 * volScale, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now, Math.random() * 0.15, 0.1);

      const thump = ctx.createOscillator();
      const thumpG = ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(105 * pitchJitter, now);
      thump.frequency.exponentialRampToValueAtTime(52, now + 0.05);
      thumpG.gain.setValueAtTime(0.032 * volScale, now);
      thumpG.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      thump.connect(thumpG);
      thumpG.connect(ctx.destination);
      thump.start(now);
      thump.stop(now + 0.06);
    } else if (terrain === 'dirt') {
      // Gritty dry earth crunch + warm thud
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.setValueAtTime(0.9 * pitchJitter, now);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920 * pitchJitter, now);
      bp.frequency.exponentialRampToValueAtTime(480, now + 0.075);
      bp.Q.setValueAtTime(1.45, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.078 * volScale, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now, Math.random() * 0.15, 0.1);

      const thump = ctx.createOscillator();
      const thumpG = ctx.createGain();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(138 * pitchJitter, now);
      thump.frequency.exponentialRampToValueAtTime(58, now + 0.055);
      thumpG.gain.setValueAtTime(0.055 * volScale, now);
      thumpG.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      thump.connect(thumpG);
      thumpG.connect(ctx.destination);
      thump.start(now);
      thump.stop(now + 0.065);
    } else if (terrain === 'stone') {
      // Crisp hard heel clack + stony transient
      const osc = ctx.createOscillator();
      const oscG = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.042);
      oscG.gain.setValueAtTime(0.075 * volScale, now);
      oscG.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
      osc.connect(oscG);
      oscG.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);

      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.setValueAtTime(1.25 * pitchJitter, now);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1600, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.055 * volScale, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(ctx.destination);
      src.start(now, Math.random() * 0.15, 0.045);
    } else if (terrain === 'wood') {
      // Hollow resonant plank knock
      const bodyOsc = ctx.createOscillator();
      const bodyG = ctx.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(225 * pitchJitter, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(118, now + 0.058);
      bodyG.gain.setValueAtTime(0.088 * volScale, now);
      bodyG.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      bodyOsc.connect(bodyG);
      bodyG.connect(ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.07);

      const knock = ctx.createOscillator();
      const knockG = ctx.createGain();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(720 * pitchJitter, now);
      knock.frequency.exponentialRampToValueAtTime(380, now + 0.025);
      knockG.gain.setValueAtTime(0.04 * volScale, now);
      knockG.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      knock.connect(knockG);
      knockG.connect(ctx.destination);
      knock.start(now);
      knock.stop(now + 0.035);
    } else {
      // Ice: crisp glassy scrape + high crystalline tick
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.setValueAtTime(1.4 * pitchJitter, now);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2900 * pitchJitter, now);
      bp.Q.setValueAtTime(2.6, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.052 * volScale, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now, Math.random() * 0.15, 0.065);

      const tick = ctx.createOscillator();
      const tickG = ctx.createGain();
      tick.type = 'sine';
      tick.frequency.setValueAtTime(580 * pitchJitter, now);
      tick.frequency.exponentialRampToValueAtTime(240, now + 0.03);
      tickG.gain.setValueAtTime(0.04 * volScale, now);
      tickG.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      tick.connect(tickG);
      tickG.connect(ctx.destination);
      tick.start(now);
      tick.stop(now + 0.04);
    }
  }
}

export const soundEngine = new SoundEngine();
