import { BiomeType, GamePhase } from '../types/game';

interface DrumPatternConfig {
  bpm: number;
  swing: number;
  // 16-step patterns (0..15, 16th notes per bar)
  dunun: number[]; // 0=rest, 1=soft, 2=accented bass hit
  djembeTone: number[]; // 0=rest, 1=ghost, 2=open tone
  djembeSlap: number[]; // 0=rest, 1=slap
  talkingDrum: number[]; // 0=rest, 1=bend up, 2=bend down
  bell: number[]; // 0=rest, 1=low bell, 2=high bell
  shekere: number[]; // 0=rest, 1=soft shake, 2=accent shake
}

const BIOME_DRUM_PATTERNS: Record<BiomeType, DrumPatternConfig> = {
  // Vibrant West African djembe & shekere expedition groove
  canopy: {
    bpm: 112,
    swing: 0.022,
    dunun:       [2, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 2, 0, 1, 0],
    djembeTone:  [0, 0, 2, 0, 1, 0, 0, 2, 2, 0, 0, 1, 0, 2, 0, 1],
    djembeSlap:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    talkingDrum: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    bell:        [2, 0, 1, 0, 2, 0, 2, 0, 0, 1, 0, 2, 0, 1, 0, 0],
    shekere:     [2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1],
  },
  // Deep ceremonial talking-drum & echoing dunun syncopation
  ruins: {
    bpm: 106,
    swing: 0.018,
    dunun:       [2, 0, 0, 0, 1, 0, 2, 0, 2, 0, 0, 1, 0, 0, 2, 0],
    djembeTone:  [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 2, 0, 1, 0, 0, 2],
    djembeSlap:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    talkingDrum: [0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 0],
    bell:        [2, 0, 0, 1, 0, 2, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1],
    shekere:     [1, 0, 2, 1, 1, 0, 2, 1, 1, 0, 2, 1, 1, 0, 2, 1],
  },
  // Flowing riverine polyrhythm with bright melodic tones
  waterfall: {
    bpm: 116,
    swing: 0.024,
    dunun:       [2, 0, 0, 1, 0, 2, 0, 0, 2, 0, 1, 0, 0, 2, 0, 0],
    djembeTone:  [0, 2, 0, 1, 0, 0, 2, 1, 0, 2, 0, 2, 1, 0, 2, 0],
    djembeSlap:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    talkingDrum: [0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 2],
    bell:        [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1, 0, 0],
    shekere:     [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
  },
  // Driving volcanic summit war-drums & crisp rapid slaps
  volcano: {
    bpm: 124,
    swing: 0.012,
    dunun:       [2, 0, 1, 0, 2, 0, 2, 1, 2, 0, 1, 0, 2, 1, 2, 0],
    djembeTone:  [0, 2, 0, 2, 0, 1, 0, 2, 0, 2, 0, 2, 1, 0, 2, 1],
    djembeSlap:  [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1],
    talkingDrum: [0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0],
    bell:        [2, 0, 1, 2, 0, 1, 2, 0, 2, 0, 1, 2, 0, 1, 2, 0],
    shekere:     [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
  },
};

export class AfricanDrumEngine {
  private ctx: AudioContext;
  private outputBus: GainNode;
  private noiseBuf: AudioBuffer;
  private wetDelay: DelayNode;
  private wetGain: GainNode;

  private stepIndex = 0;
  private barIndex = 0;
  private nextStepTime = 0;
  private timerId: number | null = null;

  private biome: BiomeType = 'canopy';
  private phase: GamePhase = 'menu';
  private energyMultiplier = 1.0;
  private active = true;

  constructor(ctx: AudioContext, destination: AudioNode, noiseBuffer: AudioBuffer) {
    this.ctx = ctx;
    this.noiseBuf = noiseBuffer;

    // Drum mix bus: warm compression -> 4x makeup boost -> soft saturation -> safety limiter
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, ctx.currentTime);
    comp.knee.setValueAtTime(10, ctx.currentTime);
    comp.ratio.setValueAtTime(3.2, ctx.currentTime);
    comp.attack.setValueAtTime(0.005, ctx.currentTime);
    comp.release.setValueAtTime(0.12, ctx.currentTime);

    const makeupGain = ctx.createGain();
    makeupGain.gain.setValueAtTime(3.6, ctx.currentTime);

    const softClipper = ctx.createWaveShaper();
    const curveLen = 1024;
    const curve = new Float32Array(curveLen);
    for (let i = 0; i < curveLen; i++) {
      const x = (i * 2) / (curveLen - 1) - 1;
      curve[i] = Math.tanh(x * 1.35) / Math.tanh(1.35);
    }
    softClipper.curve = curve;
    softClipper.oversample = '2x';

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-1.5, ctx.currentTime);
    limiter.knee.setValueAtTime(2, ctx.currentTime);
    limiter.ratio.setValueAtTime(16, ctx.currentTime);
    limiter.attack.setValueAtTime(0.001, ctx.currentTime);
    limiter.release.setValueAtTime(0.075, ctx.currentTime);

    this.outputBus = ctx.createGain();
    this.outputBus.gain.setValueAtTime(0.58, ctx.currentTime);

    // Subtle open-air jungle clearing slapback reflection
    this.wetDelay = ctx.createDelay(0.4);
    this.wetDelay.delayTime.setValueAtTime(0.115, ctx.currentTime);
    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.setValueAtTime(1450, ctx.currentTime);
    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.18, ctx.currentTime);

    this.outputBus.connect(comp);
    this.outputBus.connect(this.wetDelay);
    this.wetDelay.connect(wetFilter);
    wetFilter.connect(this.wetGain);
    this.wetGain.connect(comp);
    comp.connect(makeupGain);
    makeupGain.connect(softClipper);
    softClipper.connect(limiter);
    limiter.connect(destination);

    this.nextStepTime = ctx.currentTime + 0.08;
  }

  public start() {
    if (this.timerId !== null || typeof window === 'undefined') return;
    this.nextStepTime = Math.max(this.nextStepTime, this.ctx.currentTime + 0.05);
    this.timerId = window.setInterval(() => this.scheduleLookahead(), 55);
  }

  public setState(biome: BiomeType, phase: GamePhase, rainLevel = 0, active = true) {
    this.biome = biome;
    this.phase = phase;
    this.active = active;

    const now = this.ctx.currentTime;
    let targetGain = 0.58;
    if (phase === 'playing') {
      targetGain = 0.92 - rainLevel * 0.08;
      this.energyMultiplier = 1.12;
    } else if (phase === 'finishing') {
      targetGain = 0.96;
      this.energyMultiplier = 1.18;
    } else if (phase === 'menu' || phase === 'wardrobe' || phase === 'levels' || phase === 'missions') {
      targetGain = 0.58;
      this.energyMultiplier = 0.92;
    } else {
      // paused / gameOver / levelComplete / victory
      targetGain = 0.34;
      this.energyMultiplier = 0.78;
    }

    this.outputBus.gain.setTargetAtTime(targetGain, now, 0.22);
  }

  private scheduleLookahead() {
    if (!this.active || this.ctx.state !== 'running') {
      this.nextStepTime = this.ctx.currentTime + 0.06;
      return;
    }

    const now = this.ctx.currentTime;
    if (this.nextStepTime < now - 0.25) {
      // Recover cleanly after tab suspension without burst catch-up
      this.nextStepTime = now + 0.04;
    }

    const pattern = BIOME_DRUM_PATTERNS[this.biome];
    const stepDuration = 60 / pattern.bpm / 4; // 16th note

    while (this.nextStepTime < now + 0.14) {
      const s = this.stepIndex % 16;
      const swingOffset = s % 2 === 1 ? pattern.swing * stepDuration * 4 : 0;
      const t = this.nextStepTime + swingOffset;

      this.scheduleStep(t, s, pattern);

      this.nextStepTime += stepDuration;
      this.stepIndex = (this.stepIndex + 1) % 16;
      if (this.stepIndex === 0) {
        this.barIndex = (this.barIndex + 1) % 4;
      }
    }
  }

  private scheduleStep(t: number, step: number, p: DrumPatternConfig) {
    const isPlaying = this.phase === 'playing' || this.phase === 'finishing';
    const isMenuOrBrowse =
      this.phase === 'menu' ||
      this.phase === 'wardrobe' ||
      this.phase === 'levels' ||
      this.phase === 'missions';
    const barFill = this.barIndex === 3 && step >= 12;

    // 1. Dunun (deep double-headed bass drum foundation)
    const dununHit = p.dunun[step];
    if (dununHit > 0) {
      const vel = (dununHit === 2 ? 0.95 : 0.58) * this.energyMultiplier;
      this.triggerDunun(t, vel, dununHit === 2 ? 64 : 74);
    }

    // 2. Djembe Open Tone (warm mid-range goblet drum)
    const toneHit = p.djembeTone[step];
    if (toneHit > 0 && (isPlaying || step % 2 === 0)) {
      const vel = (toneHit === 2 ? 0.72 : 0.34) * this.energyMultiplier;
      const pitchShift = barFill && step === 14 ? 1.12 : 1.0;
      this.triggerDjembeTone(t, vel, pitchShift);
    } else if (barFill && isPlaying && (step === 13 || step === 15)) {
      // Subtle 4th-bar turnaround fill
      this.triggerDjembeTone(t, 0.52 * this.energyMultiplier, 1.08);
    }

    // 3. Djembe Slap (crisp hand-edge accent — active in gameplay & lively fill)
    if ((isPlaying || (isMenuOrBrowse && step === 4)) && p.djembeSlap[step] > 0) {
      this.triggerDjembeSlap(t, (isPlaying ? 0.65 : 0.38) * this.energyMultiplier);
    }

    // 4. Talking Drum / Tama (melodic tension-bent pitch calls)
    const talkHit = p.talkingDrum[step];
    if (talkHit > 0 && (this.barIndex % 2 === 1 || isPlaying)) {
      this.triggerTalkingDrum(t, 0.45 * this.energyMultiplier, talkHit === 1);
    }

    // 5. Agogô / Gankogui Iron Bell timeline
    const bellHit = p.bell[step];
    if (bellHit > 0 && (isPlaying || (isMenuOrBrowse && step % 4 === 0))) {
      this.triggerBell(t, (bellHit === 2 ? 0.24 : 0.17) * this.energyMultiplier, bellHit === 2);
    }

    // 6. Gourd Shekere bead shaker
    const shakeHit = p.shekere[step];
    if (shakeHit > 0 && (isPlaying || step % 2 === 0)) {
      this.triggerShekere(t, (shakeHit === 2 ? 0.28 : 0.14) * this.energyMultiplier);
    }
  }

  private triggerDunun(t: number, vel: number, rootHz: number) {
    const osc = this.ctx.createOscillator();
    const harmOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const harmGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(rootHz * 2.15, t);
    osc.frequency.exponentialRampToValueAtTime(rootHz, t + 0.055);
    osc.frequency.exponentialRampToValueAtTime(rootHz * 0.86, t + 0.34);

    harmOsc.type = 'triangle';
    harmOsc.frequency.setValueAtTime(rootHz * 2.4, t);
    harmOsc.frequency.exponentialRampToValueAtTime(rootHz * 1.48, t + 0.09);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.48 * vel, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

    harmGain.gain.setValueAtTime(0.0001, t);
    harmGain.gain.linearRampToValueAtTime(0.16 * vel, t + 0.005);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    harmOsc.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(this.outputBus);

    osc.start(t);
    harmOsc.start(t);
    osc.stop(t + 0.38);
    harmOsc.stop(t + 0.15);

    // Warm mallet beater transient
    const beater = this.ctx.createBufferSource();
    beater.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(560, t);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.20 * vel, t + 0.003);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
    beater.connect(lp);
    lp.connect(bg);
    bg.connect(this.outputBus);
    beater.start(t, Math.random() * 0.15, 0.04);
  }

  private triggerDjembeTone(t: number, vel: number, pitchScale = 1.0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();

    const baseHz = 164 * pitchScale;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseHz * 1.85, t);
    osc.frequency.exponentialRampToValueAtTime(baseHz, t + 0.035);

    bp.type = 'lowpass';
    bp.frequency.setValueAtTime(980, t);
    bp.frequency.exponentialRampToValueAtTime(360, t + 0.15);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.34 * vel, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.outputBus);
    osc.start(t);
    osc.stop(t + 0.20);

    // Skin palm thud
    const skin = this.ctx.createBufferSource();
    skin.buffer = this.noiseBuf;
    const skinBp = this.ctx.createBiquadFilter();
    skinBp.type = 'bandpass';
    skinBp.frequency.setValueAtTime(880 * pitchScale, t);
    skinBp.Q.setValueAtTime(1.5, t);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.14 * vel, t + 0.003);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    skin.connect(skinBp);
    skinBp.connect(sg);
    sg.connect(this.outputBus);
    skin.start(t, Math.random() * 0.15, 0.035);
  }

  private triggerDjembeSlap(t: number, vel: number) {
    // Crisp high membrane snap
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(225, t + 0.045);

    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.24 * vel, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    osc.connect(og);
    og.connect(this.outputBus);
    osc.start(t);
    osc.stop(t + 0.085);

    // Tight whippy slap crack
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2150, t);
    bp.Q.setValueAtTime(2.1, t);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(0.28 * vel, t + 0.002);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
    crack.connect(bp);
    bp.connect(cg);
    cg.connect(this.outputBus);
    crack.start(t, Math.random() * 0.15, 0.05);
  }

  private triggerTalkingDrum(t: number, vel: number, bendUp: boolean) {
    const osc = this.ctx.createOscillator();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    if (bendUp) {
      osc.frequency.setValueAtTime(192, t);
      osc.frequency.exponentialRampToValueAtTime(286, t + 0.11);
      osc.frequency.exponentialRampToValueAtTime(235, t + 0.24);
    } else {
      osc.frequency.setValueAtTime(272, t);
      osc.frequency.exponentialRampToValueAtTime(176, t + 0.16);
    }

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, t);
    bp.Q.setValueAtTime(1.6, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.35 * vel, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.outputBus);
    osc.start(t);
    osc.stop(t + 0.27);
  }

  private triggerBell(t: number, vel: number, high: boolean) {
    const root = high ? 840 : 620;
    const partials = [1.0, 2.04];
    for (let i = 0; i < partials.length; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(root * partials[i], t);
      const dur = i === 0 ? 0.13 : 0.075;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime((i === 0 ? 0.12 : 0.045) * vel, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.outputBus);
      osc.start(t);
      osc.stop(t + dur + 0.015);
    }
  }

  private triggerShekere(t: number, vel: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(4200, t);
    hp.Q.setValueAtTime(1.4, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.048);

    src.connect(hp);
    hp.connect(g);
    g.connect(this.outputBus);
    src.start(t, Math.random() * 0.15, 0.055);
  }

  public dispose() {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
