import * as THREE from 'three';
import type { CharacterRig } from './characterBuilder';

export type CharacterAnimState =
  | 'IDLE'
  | 'RUNNING'
  | 'TURNING_LEFT'
  | 'TURNING_RIGHT'
  | 'JUMPING'
  | 'FALLING'
  | 'SLIDING'
  | 'STUMBLING'
  | 'LANDING'
  | 'SWINGING'
  | 'DEATH';

export interface KinematicsInput {
  speedHoriz: number;
  velY: number;
  grounded: boolean;
  time: number;
  dt: number;
  strafeVelX: number;
  laneSwitchDir: -1 | 0 | 1;
  laneSwitchProgress: number;
  isSliding: boolean;
  slideProgress: number;
  jumpAnticipation: number;
  landingTimer: number;
  landingImpact: number;
  stumbleTimer: number;
  stumbleDir: number;
  isDead: boolean;
  deathElapsed: number;
  hasBlaster: boolean;
  flipProgress: number;
  isSwinging?: boolean;
  vineAngle?: number;
  vineAngVel?: number;
  hasLangoorPet?: boolean;
  langoorCheerTimer?: number;
  isWardrobeIdle?: boolean;
}

export interface KinematicsOutput {
  state: CharacterAnimState;
  runPhase: number;
  runBlend: number;
  slideWeight: number;
  strideBob: number;
}

// Pre-allocated zero-GC scratch math objects for quaternion slerp blending
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _targetQuat = new THREE.Quaternion();

interface JointPose {
  bodyPosY: number;
  bodyPosZ: number;
  bodyRot: [number, number, number];
  hipsRot: [number, number, number];
  chestRot: [number, number, number];
  headRot: [number, number, number];
  leftArmRot: [number, number, number];
  rightArmRot: [number, number, number];
  leftElbowX: number;
  rightElbowX: number;
  leftHipRot: [number, number, number];
  rightHipRot: [number, number, number];
  leftKneeX: number;
  rightKneeX: number;
  leftAnkleX: number;
  rightAnkleX: number;
  rootYaw: number;
}

const _pose: JointPose = {
  bodyPosY: 0,
  bodyPosZ: 0,
  bodyRot: [0, 0, 0],
  hipsRot: [0, 0, 0],
  chestRot: [0, 0, 0],
  headRot: [0, 0, 0],
  leftArmRot: [0, 0, 0],
  rightArmRot: [0, 0, 0],
  leftElbowX: 0.25,
  rightElbowX: 0.25,
  leftHipRot: [0, 0, 0],
  rightHipRot: [0, 0, 0],
  leftKneeX: 0,
  rightKneeX: 0,
  leftAnkleX: 0,
  rightAnkleX: 0,
  rootYaw: 0,
};

function slerpJoint(
  obj: THREE.Object3D,
  rx: number,
  ry: number,
  rz: number,
  alpha: number
) {
  _euler.set(rx, ry, rz, 'YXZ');
  _targetQuat.setFromEuler(_euler);
  obj.quaternion.slerp(_targetQuat, alpha);
}

function updateEyeBlink(rig: CharacterRig, time: number) {
  const st = rig.animState;
  const blinkDur = 0.14;
  if (time > st.blinkNextTime + blinkDur) {
    st.blinkNextTime = time + 2.7 + (Math.sin(time * 13.7) * 0.5 + 0.5) * 2.5;
  }
  const dtBlink = time - st.blinkNextTime;
  let blinkAmt = 0;
  if (dtBlink >= 0 && dtBlink <= blinkDur) {
    blinkAmt = Math.sin((dtBlink / blinkDur) * Math.PI);
  }
  for (let i = 0; i < rig.eyelids.length; i++) {
    rig.eyelids[i].rotation.x = blinkAmt * 0.72;
  }
}

/**
 * Resolve clean, non-conflicting animation state machine transitions from gameplay telemetry.
 */
function resolveAnimState(input: KinematicsInput): CharacterAnimState {
  if (input.isDead) return 'DEATH';
  if (input.isSwinging) return 'SWINGING';
  if (input.stumbleTimer > 0.01) return 'STUMBLING';
  if (input.isSliding) return 'SLIDING';

  if (!input.grounded) {
    if (input.velY > -1.2 || input.flipProgress > 0) {
      return 'JUMPING';
    }
    return 'FALLING';
  }

  if (input.jumpAnticipation > 0.05) {
    return 'JUMPING';
  }

  if (input.landingTimer > 0.01) {
    return 'LANDING';
  }

  if (input.laneSwitchDir === -1 || input.strafeVelX < -2.4) {
    return 'TURNING_LEFT';
  }
  if (input.laneSwitchDir === 1 || input.strafeVelX > 2.4) {
    return 'TURNING_RIGHT';
  }

  if (input.speedHoriz > 0.35) {
    return 'RUNNING';
  }

  return 'IDLE';
}

/**
 * Evaluate a biomechanical human sprint stride with realistic heel-to-toe ankle articulation,
 * stance cushioning, swing heel-kick, pelvic twist, ribcage counter-rotation & subtle stride variation.
 */
function evaluateRunningStride(
  pose: JointPose,
  pL: number,
  runB: number,
  time: number,
  speedNorm: number
) {
  const pR = pL + Math.PI;
  // Subtle organic stride-to-stride harmonic variation so running feels alive, not robotic
  const microVar = Math.sin(time * 1.9) * 0.035 + Math.cos(time * 3.1) * 0.02;

  // Hip flexion/extension: strong forward drive (+X) and energetic push-off behind (-X)
  const evalHip = (p: number) => {
    const forwardDrive = Math.cos(p);
    const pushBias = -0.07 * Math.sin(p) - 0.04;
    const amp = (0.54 + 0.24 * speedNorm + microVar * 0.5) * (0.45 + 0.55 * runB);
    return (forwardDrive * amp + pushBias * runB);
  };

  // Knee flexion (always <= 0, bending backward):
  // - High heel recovery during swing phase (-sin > 0)
  // - Cushioning absorption during early stance (+sin > 0)
  // - Nearly extended at heel strike & push-off
  const evalKnee = (p: number) => {
    const swingRecovery = Math.pow(Math.max(0, -Math.sin(p - 0.24)), 1.32);
    const stanceCushion = Math.pow(Math.max(0, Math.sin(p + 0.38)), 1.25) * 0.34;
    return -(0.09 + swingRecovery * (1.18 + 0.26 * speedNorm) + stanceCushion) * runB - 0.04 * (1 - runB);
  };

  // Heel-to-toe ankle articulation:
  // - Positive (+X): dorsiflexion (toes up at heel strike & swing clearance)
  // - Zero: mid-stance flat planted foot
  // - Negative (-X): plantarflexion (explosive toe-off push behind)
  const evalAnkle = (p: number) => {
    const heelStrike = Math.pow(Math.max(0, Math.cos(p - 0.22)), 1.8) * 0.30;
    const toeOff = Math.pow(Math.max(0, -Math.cos(p + 0.32)), 1.55) * 0.44;
    const swingClear = Math.max(0, -Math.sin(p - 0.15)) * 0.16;
    return (heelStrike + swingClear - toeOff) * runB;
  };

  const lHip = evalHip(pL);
  const rHip = evalHip(pR);
  const lKnee = evalKnee(pL);
  const rKnee = evalKnee(pR);
  const lAnkle = evalAnkle(pL);
  const rAnkle = evalAnkle(pR);

  // Opposite arm pumping with natural shoulder rotation & elbow folding
  const lArmPhase = -Math.cos(pL);
  const rArmPhase = -Math.cos(pR);
  const armAmp = (0.46 + 0.34 * speedNorm) * runB;
  const lArmX = lArmPhase * armAmp - 0.05 * runB;
  const rArmX = rArmPhase * armAmp - 0.05 * runB;
  // Elbows fold tighter on forward upswing (~110 deg) and open slightly on backswing (~75 deg)
  const lElbowX = THREE.MathUtils.lerp(0.26, 0.88 + Math.max(0, lArmPhase) * 0.52 + Math.max(0, -lArmPhase) * 0.12, runB);
  const rElbowX = THREE.MathUtils.lerp(0.26, 0.88 + Math.max(0, rArmPhase) * 0.52 + Math.max(0, -rArmPhase) * 0.12, runB);
  const lArmZ = THREE.MathUtils.lerp(-0.07, -0.10 - Math.max(0, -lArmPhase) * 0.06, runB);
  const rArmZ = THREE.MathUtils.lerp(0.07, 0.10 + Math.max(0, -rArmPhase) * 0.06, runB);
  // Subtle inward forearm cross-body drive at top of swing
  const lArmY = Math.max(0, lArmPhase) * 0.22 * runB;
  const rArmY = -Math.max(0, rArmPhase) * 0.22 * runB;

  // Vertical COG wave synchronized to ground contact so stance foot never floats or clips
  // Lowest during mid-stance (cushion), highest during flight push-off
  const strideDip = -Math.cos(2 * pL - 0.58) * 0.052 * runB;
  const footPlantOffset = -0.028 * runB;

  // Pelvis twists with lead leg & drops gently on swing-side hip (Trendelenburg drop)
  const hipTwistY = Math.cos(pL) * 0.11 * runB;
  const hipDropZ = Math.sin(pL) * 0.045 * runB;

  // Ribcage & shoulders counter-rotate smoothly against pelvis + athletic forward sprint lean
  const chestCounterY = -Math.cos(pL) * 0.19 * runB;
  const chestLeanX = (-0.11 - 0.14 * speedNorm + Math.cos(2 * pL) * 0.025 + microVar * 0.3) * runB;
  const chestRollZ = -hipDropZ * 0.72;

  // Head stabilization: cancels torso pitch, twist & roll to keep eyes locked down the trail
  const headPitchX = -chestLeanX * 0.84 + Math.sin(time * 1.4) * 0.015;
  const headYawY = -(hipTwistY + chestCounterY) * 0.75 + Math.sin(time * 0.9) * 0.025;
  const headRollZ = -(hipDropZ + chestRollZ) * 0.8;

  pose.bodyPosY = strideDip + footPlantOffset;
  pose.bodyPosZ = 0;
  pose.bodyRot[0] = 0;
  pose.bodyRot[1] = 0;
  pose.bodyRot[2] = 0;

  pose.hipsRot[0] = -0.03 * runB;
  pose.hipsRot[1] = hipTwistY;
  pose.hipsRot[2] = hipDropZ;

  pose.chestRot[0] = chestLeanX;
  pose.chestRot[1] = chestCounterY;
  pose.chestRot[2] = chestRollZ;

  pose.headRot[0] = headPitchX;
  pose.headRot[1] = headYawY;
  pose.headRot[2] = headRollZ;

  pose.leftArmRot[0] = lArmX;
  pose.leftArmRot[1] = lArmY;
  pose.leftArmRot[2] = lArmZ;

  pose.rightArmRot[0] = rArmX;
  pose.rightArmRot[1] = rArmY;
  pose.rightArmRot[2] = rArmZ;

  pose.leftElbowX = lElbowX;
  pose.rightElbowX = rElbowX;

  pose.leftHipRot[0] = lHip;
  pose.leftHipRot[1] = 0;
  pose.leftHipRot[2] = -hipDropZ * 0.6;

  pose.rightHipRot[0] = rHip;
  pose.rightHipRot[1] = 0;
  pose.rightHipRot[2] = -hipDropZ * 0.6;

  pose.leftKneeX = lKnee;
  pose.rightKneeX = rKnee;
  pose.leftAnkleX = lAnkle;
  pose.rightAnkleX = rAnkle;
  pose.rootYaw = 0;
}

/**
 * Full Temple Run-Style Character Kinematics Solver with 10-state FSM,
 * quaternion slerp blending, secondary motion, and zero per-frame allocations.
 */
export function updateCharacterKinematics(
  rig: CharacterRig,
  input: KinematicsInput
): KinematicsOutput {
  rig.blasterGroup.visible = input.hasBlaster && !input.isDead && !input.isSliding && !input.isSwinging;
  const st = rig.animState;
  const dt = input.dt > 0 ? Math.min(input.dt, 0.05) : 0.016;
  st.lastTime = input.time;

  if (!input.isDead) {
    updateEyeBlink(rig, input.time);
  } else {
    // Eyes gently close during defeat fall
    for (let i = 0; i < rig.eyelids.length; i++) {
      rig.eyelids[i].rotation.x = THREE.MathUtils.damp(rig.eyelids[i].rotation.x, 0.65, 8, dt);
    }
  }

  // Wardrobe / Menu Showcase Idle
  if (input.isWardrobeIdle) {
    st.currentState = 'IDLE';
    st.runBlend = THREE.MathUtils.damp(st.runBlend, 0, 10, dt);
    st.airBlend = THREE.MathUtils.damp(st.airBlend, 0, 10, dt);
    st.slideBlend = THREE.MathUtils.damp(st.slideBlend, 0, 10, dt);
    st.turnYaw = THREE.MathUtils.damp(st.turnYaw, 0, 10, dt);

    const breathe = Math.sin(input.time * 2.2);
    const alpha = 1 - Math.exp(-12 * dt);
    rig.root.rotation.y = st.turnYaw;
    rig.bodyPivot.position.set(0, breathe * 0.018, 0);
    slerpJoint(rig.bodyPivot, 0, 0, 0, alpha);
    slerpJoint(rig.hipsPivot, 0, Math.sin(input.time * 0.8) * 0.03, Math.sin(input.time * 0.9) * 0.015, alpha);
    slerpJoint(rig.chestPivot, breathe * 0.018, Math.sin(input.time * 0.85) * 0.04, -Math.sin(input.time * 0.9) * 0.012, alpha);
    slerpJoint(
      rig.headGroup,
      Math.sin(input.time * 1.4) * 0.032,
      Math.sin(input.time * 0.9) * 0.095,
      Math.cos(input.time * 1.1) * 0.022,
      alpha
    );
    slerpJoint(rig.leftArmPivot, breathe * 0.055, 0, -0.075, alpha);
    slerpJoint(rig.rightArmPivot, -breathe * 0.055, 0, 0.075, alpha);
    slerpJoint(rig.leftElbowPivot, 0.25, 0, 0, alpha);
    slerpJoint(rig.rightElbowPivot, 0.25, 0, 0, alpha);
    slerpJoint(rig.leftLegPivot, 0, 0, 0, alpha);
    slerpJoint(rig.rightLegPivot, 0, 0, 0, alpha);
    slerpJoint(rig.leftKneePivot, -0.04, 0, 0, alpha);
    slerpJoint(rig.rightKneePivot, -0.04, 0, 0, alpha);
    slerpJoint(rig.leftAnklePivot, 0.02, 0, 0, alpha);
    slerpJoint(rig.rightAnklePivot, 0.02, 0, 0, alpha);

    rig.scarfTail.rotation.x = -0.18 - Math.sin(input.time * 3) * 0.05;
    rig.scarfTail.rotation.z = Math.cos(input.time * 2.2) * 0.03;
    if (rig.ponyTailPivot) {
      rig.ponyTailPivot.rotation.set(0.05 + breathe * 0.03, 0, Math.sin(input.time * 1.6) * 0.03);
    }
    if (rig.wingLeft && rig.wingRight) {
      const flap = Math.sin(input.time * 3.5) * 0.14;
      rig.wingLeft.rotation.y = 0.25 + flap;
      rig.wingRight.rotation.y = -0.25 - flap;
    }
    updateLangoorPetKinematics(rig, input, 'IDLE', 0, 0, 0, st.runPhase, dt);
    return { state: 'IDLE', runPhase: st.runPhase, runBlend: 0, slideWeight: 0, strideBob: 0 };
  }

  // 1. Resolve Clean Animation State Machine
  const nextState = resolveAnimState(input);
  if (nextState !== st.currentState) {
    st.prevState = st.currentState;
    st.currentState = nextState;
    st.stateTime = 0;
  } else {
    st.stateTime += dt;
  }

  // 2. Smooth Continuous Motion Parameters (delta-time based, zero snapping)
  const speedNorm = THREE.MathUtils.clamp(input.speedHoriz / 12.2, 0, 1.25);
  const wantsRun =
    input.grounded &&
    !input.isSliding &&
    !input.isDead &&
    input.speedHoriz > 0.35;
  const targetRun = wantsRun ? THREE.MathUtils.clamp(input.speedHoriz / 9.8, 0.22, 1.0) : 0;
  st.runBlend = THREE.MathUtils.damp(st.runBlend, targetRun, 14, dt);
  st.airBlend = THREE.MathUtils.damp(st.airBlend, input.grounded ? 0 : 1, 16, dt);
  st.slideBlend = THREE.MathUtils.damp(st.slideBlend, input.isSliding ? 1 : 0, 18, dt);

  // Advance gait phase smoothly proportional to true world horizontal velocity so feet never slide
  if (input.grounded && !input.isSliding && !input.isDead && input.speedHoriz > 0.35) {
    // Calibrated stride frequency: matches ~1.7m stride length per half-cycle at 11.2 m/s
    const strideFreq = 4.9 + input.speedHoriz * 0.84;
    st.runPhase = (st.runPhase + dt * strideFreq) % (Math.PI * 2);
  }

  const runB = st.runBlend;
  const pL = st.runPhase;
  const breathe = Math.sin(input.time * 2.6);

  // 3. Evaluate Pose for Active FSM State
  let blendSpeed = 15; // Exponential quaternion slerp rate

  if (nextState === 'IDLE') {
    blendSpeed = 12;
    _pose.bodyPosY = breathe * 0.016;
    _pose.bodyPosZ = 0;
    _pose.bodyRot[0] = 0;
    _pose.bodyRot[1] = 0;
    _pose.bodyRot[2] = 0;
    _pose.hipsRot[0] = 0;
    _pose.hipsRot[1] = Math.sin(input.time * 1.0) * 0.025;
    _pose.hipsRot[2] = Math.sin(input.time * 1.1) * 0.015;
    _pose.chestRot[0] = breathe * 0.018;
    _pose.chestRot[1] = -_pose.hipsRot[1] * 0.6;
    _pose.chestRot[2] = -_pose.hipsRot[2] * 0.7;
    _pose.headRot[0] = Math.sin(input.time * 1.4) * 0.025;
    _pose.headRot[1] = Math.sin(input.time * 0.85) * 0.07;
    _pose.headRot[2] = 0;
    _pose.leftArmRot[0] = breathe * 0.05;
    _pose.leftArmRot[1] = 0;
    _pose.leftArmRot[2] = -0.08;
    _pose.rightArmRot[0] = -breathe * 0.05;
    _pose.rightArmRot[1] = 0;
    _pose.rightArmRot[2] = 0.08;
    _pose.leftElbowX = 0.28;
    _pose.rightElbowX = 0.28;
    _pose.leftHipRot[0] = 0.02;
    _pose.leftHipRot[1] = 0;
    _pose.leftHipRot[2] = 0;
    _pose.rightHipRot[0] = -0.02;
    _pose.rightHipRot[1] = 0;
    _pose.rightHipRot[2] = 0;
    _pose.leftKneeX = -0.05;
    _pose.rightKneeX = -0.05;
    _pose.leftAnkleX = 0.02;
    _pose.rightAnkleX = 0.02;
    _pose.rootYaw = 0;
  } else if (nextState === 'RUNNING') {
    blendSpeed = 16;
    evaluateRunningStride(_pose, pL, Math.max(0.25, runB), input.time, speedNorm);
    // Subtle residual lane bank when finishing small lateral corrections
    const subtleBank = THREE.MathUtils.clamp(-input.strafeVelX * 0.032, -0.18, 0.18);
    _pose.bodyRot[2] = subtleBank;
    _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.034, -0.22, 0.22);
  } else if (nextState === 'TURNING_LEFT' || nextState === 'TURNING_RIGHT') {
    blendSpeed = 19;
    const dir = nextState === 'TURNING_LEFT' ? -1 : 1; // -1 = moving left (-X), +1 = moving right (+X)
    // Bell curve over lane switch duration or smooth velocity-driven intensity
    const switchBell =
      input.laneSwitchProgress > 0 && input.laneSwitchProgress < 1
        ? Math.sin(input.laneSwitchProgress * Math.PI)
        : THREE.MathUtils.clamp(Math.abs(input.strafeVelX) / 7.5, 0.25, 1.0);

    evaluateRunningStride(_pose, pL, Math.max(0.45, runB), input.time, Math.max(0.6, speedNorm));

    // Lean into the movement direction (+Z tilts left, -Z tilts right)
    _pose.bodyRot[2] = -dir * 0.24 * switchBell;
    _pose.bodyPosY -= 0.045 * switchBell; // Athletic weight drop during lateral cut

    // Hips & shoulders rotate slightly into the lane cut with natural counter-balance
    _pose.hipsRot[1] += -dir * 0.18 * switchBell;
    _pose.hipsRot[2] += -dir * 0.08 * switchBell;
    _pose.chestRot[1] += -dir * 0.14 * switchBell;
    _pose.chestRot[2] += -dir * 0.10 * switchBell;
    _pose.chestRot[0] -= 0.06 * switchBell;

    // Head looks slightly ahead into the target lane while staying horizon-level
    _pose.headRot[1] += -dir * 0.16 * switchBell;
    _pose.headRot[2] = dir * 0.24 * switchBell;

    // Legs perform a crisp lateral cross-step & outside-leg push-off
    if (dir < 0) {
      // Cutting Left: right leg drives laterally, left leg abducts to catch
      _pose.leftHipRot[2] = -0.14 * switchBell;
      _pose.rightHipRot[2] = 0.12 * switchBell;
      _pose.leftArmRot[2] -= 0.16 * switchBell;
      _pose.rightArmRot[2] += 0.22 * switchBell;
    } else {
      // Cutting Right: left leg drives laterally, right leg abducts to catch
      _pose.rightHipRot[2] = 0.14 * switchBell;
      _pose.leftHipRot[2] = -0.12 * switchBell;
      _pose.rightArmRot[2] += 0.16 * switchBell;
      _pose.leftArmRot[2] -= 0.22 * switchBell;
    }

    _pose.rootYaw = -dir * 0.28 * switchBell;
  } else if (nextState === 'JUMPING') {
    blendSpeed = 19;
    const tuck =
      input.flipProgress > 0 && input.flipProgress < 1
        ? Math.sin(input.flipProgress * Math.PI)
        : 0;

    if (input.grounded && input.jumpAnticipation > 0.05) {
      // Crisp pre-takeoff crouch anticipation: lower hips, bend knees, load arms back
      const c = input.jumpAnticipation;
      _pose.bodyPosY = -0.16 * c;
      _pose.bodyPosZ = 0;
      _pose.bodyRot[0] = 0;
      _pose.bodyRot[1] = 0;
      _pose.bodyRot[2] = THREE.MathUtils.clamp(-input.strafeVelX * 0.025, -0.14, 0.14);
      _pose.hipsRot[0] = -0.14 * c;
      _pose.hipsRot[1] = 0;
      _pose.hipsRot[2] = 0;
      _pose.chestRot[0] = -0.26 * c;
      _pose.chestRot[1] = 0;
      _pose.chestRot[2] = 0;
      _pose.headRot[0] = 0.24 * c;
      _pose.headRot[1] = 0;
      _pose.headRot[2] = 0;
      _pose.leftArmRot[0] = -0.45 * c;
      _pose.leftArmRot[1] = 0;
      _pose.leftArmRot[2] = -0.16;
      _pose.rightArmRot[0] = -0.45 * c;
      _pose.rightArmRot[1] = 0;
      _pose.rightArmRot[2] = 0.16;
      _pose.leftElbowX = 0.95;
      _pose.rightElbowX = 0.95;
      _pose.leftHipRot[0] = 0.52 * c;
      _pose.leftHipRot[1] = 0;
      _pose.leftHipRot[2] = 0;
      _pose.rightHipRot[0] = 0.44 * c;
      _pose.rightHipRot[1] = 0;
      _pose.rightHipRot[2] = 0;
      _pose.leftKneeX = -0.95 * c;
      _pose.rightKneeX = -0.88 * c;
      _pose.leftAnkleX = 0.24 * c;
      _pose.rightAnkleX = 0.22 * c;
      _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.03, -0.2, 0.2);
    } else {
      // Airborne upward push-off -> apex athletic leap -> optional double-jump tuck
      const riseT = THREE.MathUtils.clamp(input.velY / 13.5, 0, 1);
      // Lead leg lifts high, trail leg extends at takeoff then tucks smoothly toward apex
      _pose.bodyPosY = 0.03;
      _pose.bodyPosZ = 0;
      _pose.bodyRot[0] = 0;
      _pose.bodyRot[1] = 0;
      _pose.bodyRot[2] = THREE.MathUtils.clamp(-input.strafeVelX * 0.032, -0.22, 0.22);

      _pose.hipsRot[0] = THREE.MathUtils.lerp(0.06, -0.18, tuck);
      _pose.hipsRot[1] = THREE.MathUtils.lerp(0.14, 0, tuck);
      _pose.hipsRot[2] = 0;

      // Subtle forward body inclination during leap
      _pose.chestRot[0] = THREE.MathUtils.lerp(-0.14 - riseT * 0.06, -0.42, tuck);
      _pose.chestRot[1] = THREE.MathUtils.lerp(-0.16, 0, tuck);
      _pose.chestRot[2] = 0;

      _pose.headRot[0] = THREE.MathUtils.lerp(0.12, 0.22, tuck);
      _pose.headRot[1] = 0;
      _pose.headRot[2] = -_pose.bodyRot[2] * 0.6;

      // Arms drive upward on takeoff to lift body momentum
      _pose.leftArmRot[0] = THREE.MathUtils.lerp(0.82 + riseT * 0.46, 1.05, tuck);
      _pose.leftArmRot[1] = 0.1;
      _pose.leftArmRot[2] = THREE.MathUtils.lerp(-0.26 - riseT * 0.14, -0.14, tuck);
      _pose.rightArmRot[0] = THREE.MathUtils.lerp(-0.36 + riseT * 0.68, 1.05, tuck);
      _pose.rightArmRot[1] = -0.1;
      _pose.rightArmRot[2] = THREE.MathUtils.lerp(0.26 + riseT * 0.14, 0.14, tuck);
      _pose.leftElbowX = THREE.MathUtils.lerp(0.76 + (1 - riseT) * 0.25, 1.52, tuck);
      _pose.rightElbowX = THREE.MathUtils.lerp(0.76 + (1 - riseT) * 0.25, 1.52, tuck);

      // Asymmetric athletic runner leap (front knee driven up, back leg trailing & folding)
      _pose.leftHipRot[0] = THREE.MathUtils.lerp(0.84 + riseT * 0.16, 1.38, tuck);
      _pose.leftHipRot[1] = 0;
      _pose.leftHipRot[2] = -0.05;
      _pose.rightHipRot[0] = THREE.MathUtils.lerp(-0.46 + (1 - riseT) * 0.32, 1.28, tuck);
      _pose.rightHipRot[1] = 0;
      _pose.rightHipRot[2] = 0.05;

      _pose.leftKneeX = THREE.MathUtils.lerp(-1.12, -1.85, tuck);
      _pose.rightKneeX = THREE.MathUtils.lerp(-0.38 - (1 - riseT) * 0.46, -1.82, tuck);

      // Plantarflexed push-off on trail foot, alert forefoot on lead foot
      _pose.leftAnkleX = THREE.MathUtils.lerp(0.14, -0.25, tuck);
      _pose.rightAnkleX = THREE.MathUtils.lerp(-0.38 * riseT, -0.25, tuck);

      _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.038, -0.25, 0.25);
    }
  } else if (nextState === 'FALLING') {
    blendSpeed = 14;
    const fallT = THREE.MathUtils.clamp((-input.velY - 1.0) / 14.0, 0, 1);

    _pose.bodyPosY = 0.01;
    _pose.bodyPosZ = 0;
    _pose.bodyRot[0] = 0;
    _pose.bodyRot[1] = 0;
    _pose.bodyRot[2] = THREE.MathUtils.clamp(-input.strafeVelX * 0.032, -0.22, 0.22);

    _pose.hipsRot[0] = -0.06;
    _pose.hipsRot[1] = 0.05;
    _pose.hipsRot[2] = 0;

    // Slight forward preparation to meet the ground
    _pose.chestRot[0] = -0.14 - fallT * 0.10;
    _pose.chestRot[1] = -0.05;
    _pose.chestRot[2] = 0;

    // Look down slightly toward upcoming landing spot
    _pose.headRot[0] = 0.06 - fallT * 0.10;
    _pose.headRot[1] = 0;
    _pose.headRot[2] = -_pose.bodyRot[2] * 0.65;

    // Arms raise outward and slightly up for mid-air balance
    _pose.leftArmRot[0] = 0.34 + fallT * 0.28;
    _pose.leftArmRot[1] = 0;
    _pose.leftArmRot[2] = -0.42 - fallT * 0.22;
    _pose.rightArmRot[0] = 0.26 + fallT * 0.28;
    _pose.rightArmRot[1] = 0;
    _pose.rightArmRot[2] = 0.42 + fallT * 0.22;
    _pose.leftElbowX = 0.62;
    _pose.rightElbowX = 0.62;

    // Extend legs downward toward the ground ready to absorb landing impact
    _pose.leftHipRot[0] = THREE.MathUtils.lerp(0.46, 0.26, fallT);
    _pose.leftHipRot[1] = 0;
    _pose.leftHipRot[2] = -0.04;
    _pose.rightHipRot[0] = THREE.MathUtils.lerp(-0.18, 0.08, fallT);
    _pose.rightHipRot[1] = 0;
    _pose.rightHipRot[2] = 0.04;

    _pose.leftKneeX = THREE.MathUtils.lerp(-0.62, -0.34, fallT);
    _pose.rightKneeX = THREE.MathUtils.lerp(-0.52, -0.28, fallT);

    // Reach toes gently downward for soft forefoot touchdown
    _pose.leftAnkleX = -0.18;
    _pose.rightAnkleX = -0.14;

    _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.036, -0.24, 0.24);
  } else if (nextState === 'LANDING') {
    blendSpeed = 22;
    // Smooth impact compression curve peaking right after contact then rebounding into running
    const landT = THREE.MathUtils.clamp(input.landingTimer / 0.18, 0, 1);
    const impact = Math.sin(landT * Math.PI) * THREE.MathUtils.clamp(input.landingImpact, 0.35, 1.0);

    // Start from running stride if moving, so landing seamlessly flows into running!
    evaluateRunningStride(_pose, pL, Math.max(0.15, runB), input.time, speedNorm);

    // Absorb vertical impact through hips, knees, ankles & upper body
    _pose.bodyPosY -= 0.20 * impact;
    _pose.hipsRot[0] -= 0.12 * impact;
    _pose.chestRot[0] -= 0.22 * impact;
    _pose.headRot[0] += 0.18 * impact;

    _pose.leftHipRot[0] = THREE.MathUtils.lerp(_pose.leftHipRot[0], 0.56, impact * 0.72);
    _pose.rightHipRot[0] = THREE.MathUtils.lerp(_pose.rightHipRot[0], 0.42, impact * 0.72);
    _pose.leftKneeX = THREE.MathUtils.lerp(_pose.leftKneeX, -1.06, impact * 0.78);
    _pose.rightKneeX = THREE.MathUtils.lerp(_pose.rightKneeX, -0.94, impact * 0.78);
    _pose.leftAnkleX = THREE.MathUtils.lerp(_pose.leftAnkleX, 0.32, impact * 0.75);
    _pose.rightAnkleX = THREE.MathUtils.lerp(_pose.rightAnkleX, 0.28, impact * 0.75);

    // Arms dip slightly outward for balance recovery
    _pose.leftArmRot[2] -= 0.24 * impact;
    _pose.rightArmRot[2] += 0.24 * impact;
    _pose.leftArmRot[0] -= 0.18 * impact;
    _pose.rightArmRot[0] -= 0.18 * impact;

    _pose.bodyRot[2] = THREE.MathUtils.clamp(-input.strafeVelX * 0.032, -0.18, 0.18);
    _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.034, -0.22, 0.22);
  } else if (nextState === 'SLIDING') {
    blendSpeed = 18;
    // Smooth entry & rise envelope (0..0.14 ease in, 0.14..0.78 full low slide, 0.78..1.0 rise back to sprint)
    const p = THREE.MathUtils.clamp(input.slideProgress, 0, 1);
    const enterT = THREE.MathUtils.smoothstep(p, 0, 0.14);
    const exitT = 1 - THREE.MathUtils.smoothstep(p, 0.78, 1.0);
    const slideEnv = enterT * exitT;

    // Evaluate underlying running pose so entry & recovery seamlessly crossfade!
    evaluateRunningStride(_pose, pL, Math.max(0.5, runB), input.time, speedNorm);

    // Authentic Temple Run athletic slide:
    // - Hips drop very low to the track (-0.54m)
    // - Upper torso leans backward (+0.52 rad) while keeping head upright watching obstacles ahead
    // - Lead leg (left) extends forward along track; trail leg (right) tucks tightly beneath hip
    // - Arms extend out & slightly behind for balance
    const bank = THREE.MathUtils.clamp(-input.strafeVelX * 0.025, -0.15, 0.15);

    _pose.bodyPosY = THREE.MathUtils.lerp(_pose.bodyPosY, -0.54, slideEnv);
    _pose.bodyPosZ = THREE.MathUtils.lerp(0, 0.12, slideEnv);
    _pose.bodyRot[0] = 0;
    _pose.bodyRot[1] = 0;
    _pose.bodyRot[2] = THREE.MathUtils.lerp(bank, bank + 0.06, slideEnv);

    _pose.hipsRot[0] = THREE.MathUtils.lerp(_pose.hipsRot[0], 0.24, slideEnv);
    _pose.hipsRot[1] = THREE.MathUtils.lerp(_pose.hipsRot[1], -0.22, slideEnv);
    _pose.hipsRot[2] = THREE.MathUtils.lerp(_pose.hipsRot[2], -0.06, slideEnv);

    _pose.chestRot[0] = THREE.MathUtils.lerp(_pose.chestRot[0], 0.56, slideEnv);
    _pose.chestRot[1] = THREE.MathUtils.lerp(_pose.chestRot[1], 0.18, slideEnv);
    _pose.chestRot[2] = THREE.MathUtils.lerp(_pose.chestRot[2], 0.05, slideEnv);

    // Head tucks forward against reclined spine to stay completely level with trail ahead
    _pose.headRot[0] = THREE.MathUtils.lerp(_pose.headRot[0], -0.62, slideEnv);
    _pose.headRot[1] = THREE.MathUtils.lerp(_pose.headRot[1], 0.06, slideEnv);
    _pose.headRot[2] = 0;

    // Balance arms: right arm trailing close to ground for stability, left arm forward-out for balance
    _pose.leftArmRot[0] = THREE.MathUtils.lerp(_pose.leftArmRot[0], 0.54, slideEnv);
    _pose.leftArmRot[1] = 0.12 * slideEnv;
    _pose.leftArmRot[2] = THREE.MathUtils.lerp(_pose.leftArmRot[2], -0.58, slideEnv);
    _pose.rightArmRot[0] = THREE.MathUtils.lerp(_pose.rightArmRot[0], -0.58, slideEnv);
    _pose.rightArmRot[1] = -0.12 * slideEnv;
    _pose.rightArmRot[2] = THREE.MathUtils.lerp(_pose.rightArmRot[2], 0.52, slideEnv);
    _pose.leftElbowX = THREE.MathUtils.lerp(_pose.leftElbowX, 0.72, slideEnv);
    _pose.rightElbowX = THREE.MathUtils.lerp(_pose.rightElbowX, 0.45, slideEnv);

    // Lead leg extends forward; tucked rear knee slides neatly underneath
    _pose.leftHipRot[0] = THREE.MathUtils.lerp(_pose.leftHipRot[0], 1.32, slideEnv);
    _pose.leftHipRot[1] = 0;
    _pose.leftHipRot[2] = -0.08 * slideEnv;
    _pose.leftKneeX = THREE.MathUtils.lerp(_pose.leftKneeX, -0.22, slideEnv);
    _pose.leftAnkleX = THREE.MathUtils.lerp(_pose.leftAnkleX, 0.28, slideEnv);

    _pose.rightHipRot[0] = THREE.MathUtils.lerp(_pose.rightHipRot[0], 0.62, slideEnv);
    _pose.rightHipRot[1] = 0;
    _pose.rightHipRot[2] = 0.22 * slideEnv;
    _pose.rightKneeX = THREE.MathUtils.lerp(_pose.rightKneeX, -1.72, slideEnv);
    _pose.rightAnkleX = THREE.MathUtils.lerp(_pose.rightAnkleX, -0.36, slideEnv);

    _pose.rootYaw = THREE.MathUtils.lerp(0, THREE.MathUtils.clamp(-input.strafeVelX * 0.03, -0.18, 0.18), slideEnv);
  } else if (nextState === 'STUMBLING') {
    blendSpeed = 19;
    // Realistic recoil -> off-balance arm windmill -> athletic recovery back into stride
    const tNorm = THREE.MathUtils.clamp(input.stumbleTimer / 0.52, 0, 1); // 1 on hit -> 0 recovered
    const recoil = Math.sin(tNorm * Math.PI);
    const flail = Math.sin(input.time * 24) * tNorm;
    const hitSide = input.stumbleDir >= 0 ? 1 : -1;

    evaluateRunningStride(_pose, pL, Math.max(0.3, runB), input.time, speedNorm * 0.65);

    _pose.bodyPosY -= 0.14 * recoil;
    _pose.bodyPosZ = 0.08 * recoil;
    _pose.bodyRot[2] = hitSide * 0.22 * recoil;

    // Initial backward torso jolt then forward recovery hunch
    const pitchRecoil = tNorm > 0.55 ? 0.32 * ((tNorm - 0.55) / 0.45) : -0.28 * (tNorm / 0.55);
    _pose.hipsRot[0] += pitchRecoil * 0.35;
    _pose.hipsRot[1] += hitSide * 0.26 * recoil;
    _pose.chestRot[0] += pitchRecoil;
    _pose.chestRot[1] += -hitSide * 0.22 * recoil + flail * 0.14;
    _pose.chestRot[2] += hitSide * 0.14 * recoil;

    _pose.headRot[0] = -pitchRecoil * 0.65;
    _pose.headRot[1] = -hitSide * 0.16 * recoil;
    _pose.headRot[2] = -hitSide * 0.22 * recoil;

    // Asymmetric balance-catching arm flail
    _pose.leftArmRot[0] = 0.55 * recoil + flail * 0.52;
    _pose.leftArmRot[2] = -0.62 * recoil - 0.15;
    _pose.rightArmRot[0] = 0.45 * recoil - flail * 0.52;
    _pose.rightArmRot[2] = 0.62 * recoil + 0.15;
    _pose.leftElbowX = 0.68;
    _pose.rightElbowX = 0.68;

    // Slight knee buckle to catch footing
    _pose.leftKneeX -= 0.35 * recoil;
    _pose.rightKneeX -= 0.28 * recoil;
    _pose.rootYaw = hitSide * 0.18 * recoil;
  } else if (nextState === 'DEATH') {
    // DEATH: realistic stumble-collapse forward/side tumble onto the jungle floor
    blendSpeed = 11;
    const dT = THREE.MathUtils.clamp(input.deathElapsed / 0.72, 0, 1);
    const fallEase = dT * dT * (3 - 2 * dT);
    const bounce = dT > 0.72 ? Math.sin(((dT - 0.72) / 0.28) * Math.PI) * 0.05 : 0;

    _pose.bodyPosY = THREE.MathUtils.lerp(0, -0.76, fallEase) + bounce;
    _pose.bodyPosZ = THREE.MathUtils.lerp(0, -0.28, fallEase);
    _pose.bodyRot[0] = THREE.MathUtils.lerp(0, -1.46, fallEase); // collapse forward onto chest/side
    _pose.bodyRot[1] = THREE.MathUtils.lerp(0, 0.28, fallEase);
    _pose.bodyRot[2] = THREE.MathUtils.lerp(0, 0.34, fallEase);

    _pose.hipsRot[0] = -0.12 * fallEase;
    _pose.hipsRot[1] = 0.18 * fallEase;
    _pose.hipsRot[2] = 0;

    _pose.chestRot[0] = 0.18 * fallEase;
    _pose.chestRot[1] = -0.22 * fallEase;
    _pose.chestRot[2] = 0.08 * fallEase;

    _pose.headRot[0] = 0.26 * fallEase;
    _pose.headRot[1] = -0.45 * fallEase;
    _pose.headRot[2] = 0.18 * fallEase;

    // Arms reach out instinctively to break fall then settle
    _pose.leftArmRot[0] = THREE.MathUtils.lerp(0.85, 1.35, fallEase);
    _pose.leftArmRot[1] = 0.15 * fallEase;
    _pose.leftArmRot[2] = THREE.MathUtils.lerp(-0.65, -0.48, fallEase);
    _pose.rightArmRot[0] = THREE.MathUtils.lerp(0.75, 1.15, fallEase);
    _pose.rightArmRot[1] = -0.18 * fallEase;
    _pose.rightArmRot[2] = THREE.MathUtils.lerp(0.65, 0.56, fallEase);
    _pose.leftElbowX = THREE.MathUtils.lerp(0.45, 0.85, fallEase);
    _pose.rightElbowX = THREE.MathUtils.lerp(0.45, 0.65, fallEase);

    _pose.leftHipRot[0] = 0.22 * fallEase;
    _pose.leftHipRot[1] = 0;
    _pose.leftHipRot[2] = -0.12 * fallEase;
    _pose.rightHipRot[0] = -0.15 * fallEase;
    _pose.rightHipRot[1] = 0;
    _pose.rightHipRot[2] = 0.14 * fallEase;
    _pose.leftKneeX = -0.58 * fallEase;
    _pose.rightKneeX = -0.26 * fallEase;
    _pose.leftAnkleX = -0.35 * fallEase;
    _pose.rightAnkleX = -0.30 * fallEase;
    _pose.rootYaw = 0;
  } else if (nextState === 'SWINGING') {
    blendSpeed = 18;
    const va = input.vineAngle ?? 0;
    const vw = input.vineAngVel ?? 0;
    const swingLag = THREE.MathUtils.clamp(-vw * 0.18, -0.45, 0.45);
    const legKick = THREE.MathUtils.clamp(-va * 0.72 + swingLag * 0.65, -0.7, 0.85);

    _pose.bodyPosY = 0;
    _pose.bodyPosZ = 0;
    _pose.bodyRot[0] = THREE.MathUtils.clamp(va * 0.55 + swingLag * 0.45, -0.58, 0.58);
    _pose.bodyRot[1] = 0;
    _pose.bodyRot[2] = THREE.MathUtils.clamp(-input.strafeVelX * 0.03, -0.22, 0.22);

    _pose.hipsRot[0] = 0.14 + legKick * 0.24;
    _pose.hipsRot[1] = 0;
    _pose.hipsRot[2] = 0;

    _pose.chestRot[0] = -0.14 - swingLag * 0.2;
    _pose.chestRot[1] = 0;
    _pose.chestRot[2] = 0;

    // Head looks ahead toward the landing cliff
    _pose.headRot[0] = -_pose.bodyRot[0] * 0.55 - 0.12;
    _pose.headRot[1] = THREE.MathUtils.clamp(-input.strafeVelX * 0.04, -0.2, 0.2);
    _pose.headRot[2] = 0;

    // Both hands raised high overhead clutching the braided jungle vine knot!
    _pose.leftArmRot[0] = -2.92;
    _pose.leftArmRot[1] = 0.22;
    _pose.leftArmRot[2] = 0.22;
    _pose.rightArmRot[0] = -2.92;
    _pose.rightArmRot[1] = -0.22;
    _pose.rightArmRot[2] = -0.22;
    _pose.leftElbowX = 0.24;
    _pose.rightElbowX = 0.24;

    // Athletic tucked/trailing legs responding smoothly to pendulum momentum
    _pose.leftHipRot[0] = 0.36 + legKick * 0.52;
    _pose.leftHipRot[1] = 0;
    _pose.leftHipRot[2] = -0.05;
    _pose.rightHipRot[0] = 0.12 + legKick * 0.44;
    _pose.rightHipRot[1] = 0;
    _pose.rightHipRot[2] = 0.05;
    _pose.leftKneeX = -0.78 - Math.max(0, legKick) * 0.32;
    _pose.rightKneeX = -0.56 - Math.max(0, legKick) * 0.24;
    _pose.leftAnkleX = -0.28;
    _pose.rightAnkleX = -0.28;
    _pose.rootYaw = THREE.MathUtils.clamp(-input.strafeVelX * 0.03, -0.2, 0.2);
  }

  // Override right arm smoothly if aiming Jungle Blaster (unless sliding/swinging/dead)
  if (input.hasBlaster && !input.isDead && !input.isSliding && !input.isSwinging) {
    _pose.rightArmRot[0] = 0.52;
    _pose.rightArmRot[1] = 0;
    _pose.rightArmRot[2] = 0.08;
    _pose.rightElbowX = 0.72;
  }

  // 4. Apply Smooth Quaternion Slerp & Exponential Position Damping to All Joints
  const qAlpha = 1 - Math.exp(-blendSpeed * dt);

  rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, _pose.bodyPosY, blendSpeed, dt);
  rig.bodyPivot.position.z = THREE.MathUtils.damp(rig.bodyPivot.position.z, _pose.bodyPosZ, blendSpeed, dt);

  slerpJoint(rig.bodyPivot, _pose.bodyRot[0], _pose.bodyRot[1], _pose.bodyRot[2], qAlpha);
  slerpJoint(rig.hipsPivot, _pose.hipsRot[0], _pose.hipsRot[1], _pose.hipsRot[2], qAlpha);
  slerpJoint(rig.chestPivot, _pose.chestRot[0], _pose.chestRot[1], _pose.chestRot[2], qAlpha);
  slerpJoint(rig.headGroup, _pose.headRot[0], _pose.headRot[1], _pose.headRot[2], qAlpha);

  slerpJoint(rig.leftArmPivot, _pose.leftArmRot[0], _pose.leftArmRot[1], _pose.leftArmRot[2], qAlpha);
  slerpJoint(rig.rightArmPivot, _pose.rightArmRot[0], _pose.rightArmRot[1], _pose.rightArmRot[2], qAlpha);
  slerpJoint(rig.leftElbowPivot, _pose.leftElbowX, 0, 0, qAlpha);
  slerpJoint(rig.rightElbowPivot, _pose.rightElbowX, 0, 0, qAlpha);

  slerpJoint(rig.leftLegPivot, _pose.leftHipRot[0], _pose.leftHipRot[1], _pose.leftHipRot[2], qAlpha);
  slerpJoint(rig.rightLegPivot, _pose.rightHipRot[0], _pose.rightHipRot[1], _pose.rightHipRot[2], qAlpha);
  slerpJoint(rig.leftKneePivot, _pose.leftKneeX, 0, 0, qAlpha);
  slerpJoint(rig.rightKneePivot, _pose.rightKneeX, 0, 0, qAlpha);
  slerpJoint(rig.leftAnklePivot, _pose.leftAnkleX, 0, 0, qAlpha);
  slerpJoint(rig.rightAnklePivot, _pose.rightAnkleX, 0, 0, qAlpha);

  st.turnYaw = THREE.MathUtils.damp(st.turnYaw, _pose.rootYaw, 14, dt);
  rig.root.rotation.y = st.turnYaw;

  // 5. Secondary Motion: Scarf, Ponytail, Backpack, Hip Satchel/Pouch & Cosmetic Wings
  const motionEnergy = input.isDead ? 0 : Math.max(runB, st.airBlend * 0.75, st.slideBlend * 0.85);
  const targetScarfX =
    -0.16 -
    motionEnergy * 0.58 -
    Math.sin(input.time * 16) * (0.04 + motionEnergy * 0.09) +
    THREE.MathUtils.clamp(-input.velY * 0.03, -0.35, 0.35);
  const targetScarfZ =
    Math.cos(input.time * 11) * (0.03 + motionEnergy * 0.08) +
    THREE.MathUtils.clamp(-input.strafeVelX * 0.03, -0.25, 0.25);
  rig.scarfTail.rotation.x = THREE.MathUtils.damp(rig.scarfTail.rotation.x, targetScarfX, 14, dt);
  rig.scarfTail.rotation.z = THREE.MathUtils.damp(rig.scarfTail.rotation.z, targetScarfZ, 14, dt);

  if (rig.ponyTailPivot) {
    const ponyPitch =
      0.06 +
      motionEnergy * 0.38 +
      Math.sin(2 * pL - 0.8) * 0.14 * runB +
      THREE.MathUtils.clamp(-input.velY * 0.035, -0.32, 0.42);
    const ponySway =
      Math.cos(pL) * 0.12 * runB +
      THREE.MathUtils.clamp(-input.strafeVelX * 0.032, -0.28, 0.28);
    rig.ponyTailPivot.rotation.x = THREE.MathUtils.damp(rig.ponyTailPivot.rotation.x, ponyPitch, 13, dt);
    rig.ponyTailPivot.rotation.z = THREE.MathUtils.damp(rig.ponyTailPivot.rotation.z, ponySway, 13, dt);
  }

  // Subtle inertial pack bounce on footsteps and landings
  const packBounceY = Math.sin(2 * pL - 1.1) * 0.014 * runB + (nextState === 'LANDING' ? -0.022 : 0);
  rig.backpackGroup.position.y = THREE.MathUtils.damp(rig.backpackGroup.position.y, 1.18 + packBounceY, 16, dt);
  rig.backpackGroup.rotation.x = THREE.MathUtils.damp(
    rig.backpackGroup.rotation.x,
    Math.sin(2 * pL - 1.1) * 0.04 * runB,
    14,
    dt
  );

  // Subtle hip gear jiggle synced to opposite legs
  if (rig.hipSatchel) {
    const satchelSwing = -0.08 + Math.sin(pL + Math.PI) * 0.07 * runB + THREE.MathUtils.clamp(-input.strafeVelX * 0.015, -0.1, 0.1);
    rig.hipSatchel.rotation.z = THREE.MathUtils.damp(rig.hipSatchel.rotation.z, satchelSwing, 14, dt);
  }
  if (rig.leftPouch) {
    const pouchSwing = 0.08 + Math.sin(pL) * 0.07 * runB + THREE.MathUtils.clamp(-input.strafeVelX * 0.015, -0.1, 0.1);
    rig.leftPouch.rotation.z = THREE.MathUtils.damp(rig.leftPouch.rotation.z, pouchSwing, 14, dt);
  }

  if (rig.wingLeft && rig.wingRight) {
    const flapSpeed = input.grounded ? 4.2 : 11.5;
    const flapAmp = input.grounded ? 0.14 : 0.34;
    const flap = Math.sin(input.time * flapSpeed) * flapAmp;
    rig.wingLeft.rotation.y = 0.25 + flap;
    rig.wingRight.rotation.y = -0.25 - flap;
  }

  // Dynamic Shoulder Pet Langoor Kinematics (rides naturally on explorer's right shoulder + lifelike idles)
  updateLangoorPetKinematics(rig, input, nextState, runB, st.airBlend, st.slideBlend, pL, dt);

  const strideBob =
    nextState === 'RUNNING' || nextState === 'TURNING_LEFT' || nextState === 'TURNING_RIGHT'
      ? Math.sin(2 * pL - 0.4) * 0.045 * runB
      : 0;

  return {
    state: nextState,
    runPhase: st.runPhase,
    runBlend: st.runBlend,
    slideWeight: st.slideBlend,
    strideBob,
  };
}

/**
 * Lifelike shoulder-companion kinematics & subtle procedural idle behaviors:
 * - Curious saccadic looking around (head yaw/pitch/inquisitive roll tilts)
 * - Periodic double-flick tail & tail-tip twitches with S-curve lag
 * - Quick ambient ear twitches & natural eye blinks
 * - Soft shoulder breathing, weight shifts & occasional playful paw fidget
 */
function updateLangoorPetKinematics(
  rig: CharacterRig,
  input: KinematicsInput,
  nextState: CharacterAnimState,
  runB: number,
  airB: number,
  slideTuck: number,
  pL: number,
  dt: number
): void {
  const pet = rig.langoorPet;
  const showPet = Boolean(input.hasLangoorPet);
  pet.root.visible = showPet;
  if (!showPet) return;

  const t = input.time;
  const idle = pet.idleState;
  const isDead = nextState === 'DEATH';
  // Idle weight is 1 when standing/paused and gently stays ~0.35 even while cruising so micro-idles stay alive
  const calmFactor = isDead ? 0 : THREE.MathUtils.clamp(1 - runB * 0.65 - airB * 0.45 - slideTuck * 0.7, 0.2, 1);
  const fullIdle = isDead ? 0 : THREE.MathUtils.clamp(1 - runB - airB - slideTuck, 0, 1);

  const cheerAmt =
    input.langoorCheerTimer && input.langoorCheerTimer > 0
      ? Math.sin(Math.min(1, input.langoorCheerTimer / 0.9) * Math.PI)
      : 0;

  // 1. Periodic Curious Look-Around Glances (saccadic head target shifts every 2.1–4.3s)
  if (!isDead && t >= idle.nextLookTime) {
    // Deterministic-feeling organic variety using time-hashed pseudo-random angles
    const seed = Math.sin(t * 12.9898 + 78.233) * 43758.5453;
    const r1 = seed - Math.floor(seed);
    const seed2 = Math.sin(t * 39.3467 + 11.135) * 24634.6345;
    const r2 = seed2 - Math.floor(seed2);
    const seed3 = Math.sin(t * 73.156 + 4.812) * 19191.313;
    const r3 = seed3 - Math.floor(seed3);

    if (r1 < 0.26) {
      // Glance left toward the explorer's cheek/face affectionately
      idle.lookTargetYaw = -0.46 - r2 * 0.24;
      idle.lookTargetPitch = -0.08 + r3 * 0.08;
      idle.lookTargetRoll = 0.14 + r2 * 0.08;
    } else if (r1 < 0.56) {
      // Look right out over the jungle canopy & cliffs
      idle.lookTargetYaw = 0.34 + r2 * 0.34;
      idle.lookTargetPitch = -0.05 + r3 * 0.14;
      idle.lookTargetRoll = -0.10 - r3 * 0.09;
    } else if (r1 < 0.78) {
      // Peek curiously upward at treetops / passing birds
      idle.lookTargetYaw = (r2 - 0.5) * 0.48;
      idle.lookTargetPitch = -0.22 - r3 * 0.12;
      idle.lookTargetRoll = (r2 - 0.5) * 0.22;
    } else {
      // Alert forward scan down the trail
      idle.lookTargetYaw = (r2 - 0.5) * 0.16;
      idle.lookTargetPitch = 0.04;
      idle.lookTargetRoll = (r3 - 0.5) * 0.08;
    }
    idle.nextLookTime = t + 1.9 + r3 * 2.3;
  }

  // 2. Intermittent Playful Tail Twitching (crisp double-flick every 1.8–4.0s)
  if (!isDead && t >= idle.nextTailTwitchTime + idle.tailTwitchDuration) {
    const r = Math.abs(Math.sin(t * 17.31 + 3.7));
    idle.nextTailTwitchTime = t + 1.6 + r * 2.4;
    idle.tailTwitchDuration = 0.36 + (r * 0.18);
    idle.tailTwitchDir = r > 0.5 ? 1 : -1;
  }
  const tailTwitchElapsed = t - idle.nextTailTwitchTime;
  const tailTwitchEnv =
    !isDead && tailTwitchElapsed >= 0 && tailTwitchElapsed <= idle.tailTwitchDuration
      ? Math.sin((tailTwitchElapsed / idle.tailTwitchDuration) * Math.PI)
      : 0;
  // Crisp double-flick waveform on base and lagged snap on tip
  const tailTwitchWave =
    tailTwitchEnv * Math.sin(tailTwitchElapsed * 28) * 0.22 * idle.tailTwitchDir;
  const tailTipTwitchWave =
    tailTwitchEnv * Math.sin(tailTwitchElapsed * 32 - 0.65) * 0.42 * idle.tailTwitchDir;

  // 3. Subtle Ear Flicks (quick twitch on one ear every 2.4–5.0s)
  if (!isDead && t >= idle.nextEarTwitchTime + 0.22) {
    const r = Math.abs(Math.cos(t * 23.17 + 1.9));
    idle.nextEarTwitchTime = t + 2.2 + r * 2.8;
    idle.earTwitchSide = r > 0.5 ? 1 : -1;
  }
  const earElapsed = t - idle.nextEarTwitchTime;
  const earFlick =
    !isDead && earElapsed >= 0 && earElapsed <= 0.22
      ? Math.sin((earElapsed / 0.22) * Math.PI * 2) * Math.sin((earElapsed / 0.22) * Math.PI) * 0.32
      : 0;
  pet.leftEar.rotation.z = idle.earTwitchSide === -1 ? earFlick : 0;
  pet.rightEar.rotation.z = idle.earTwitchSide === 1 ? -earFlick : 0;
  pet.leftEar.rotation.y = idle.earTwitchSide === -1 ? earFlick * 0.6 : 0;
  pet.rightEar.rotation.y = idle.earTwitchSide === 1 ? -earFlick * 0.6 : 0;

  // 4. Natural Periodic Eye Blinks (every 2.4–4.8s)
  let blinkAmt = 0;
  if (!isDead) {
    const blinkElapsed = t - idle.nextBlinkTime;
    if (blinkElapsed >= 0 && blinkElapsed <= 0.14) {
      blinkAmt = Math.sin((blinkElapsed / 0.14) * Math.PI);
    } else if (blinkElapsed > 0.14) {
      const r = Math.abs(Math.sin(t * 19.7 + 0.8));
      idle.nextBlinkTime = t + 2.3 + r * 2.6;
    }
  }
  for (const lid of pet.eyelids) {
    lid.scale.y = THREE.MathUtils.lerp(0.08, 1.05, blinkAmt);
    lid.position.y = THREE.MathUtils.lerp(0.026, 0.014, blinkAmt);
  }

  // 5. Occasional Playful Right-Paw Fidget / Chin Pat when calm & not cheering
  if (!isDead && t >= idle.nextPawFidgetTime + idle.pawFidgetDuration) {
    const r = Math.abs(Math.sin(t * 11.43 + 5.2));
    idle.nextPawFidgetTime = t + 4.4 + r * 4.2;
    idle.pawFidgetDuration = 0.95 + r * 0.45;
  }
  const fidgetElapsed = t - idle.nextPawFidgetTime;
  const pawFidgetEnv =
    !isDead &&
    cheerAmt < 0.05 &&
    slideTuck < 0.15 &&
    fidgetElapsed >= 0 &&
    fidgetElapsed <= idle.pawFidgetDuration
      ? Math.sin((fidgetElapsed / idle.pawFidgetDuration) * Math.PI) * calmFactor
      : 0;

  // 6. Soft Shoulder Breathing, Weight Shift & Dynamic Ride Posture
  const petBreathe = Math.sin(t * 3.15) * 0.011 * calmFactor;
  const idleShiftZ = Math.sin(t * 1.15) * 0.045 * fullIdle;
  const petBounce = isDead
    ? -0.05
    : petBreathe +
      Math.sin(2 * pL - 0.9) * 0.022 * runB +
      (nextState === 'LANDING' ? -0.032 : 0) +
      cheerAmt * Math.abs(Math.sin(t * 16)) * 0.075 -
      slideTuck * 0.04;

  const petLeanZ =
    THREE.MathUtils.clamp(-input.strafeVelX * 0.035, -0.26, 0.26) + idleShiftZ;
  const petPitchX =
    nextState === 'SLIDING'
      ? -0.34
      : nextState === 'SWINGING'
      ? -0.22
      : nextState === 'JUMPING'
      ? -0.14
      : nextState === 'STUMBLING'
      ? 0.22
      : -0.06 * runB + Math.sin(t * 3.15) * 0.028 * fullIdle;

  pet.root.position.y = THREE.MathUtils.damp(pet.root.position.y, pet.baseY + petBounce, 15, dt);
  pet.root.rotation.x = THREE.MathUtils.damp(pet.root.rotation.x, petPitchX, 13, dt);
  pet.root.rotation.z = THREE.MathUtils.damp(pet.root.rotation.z, petLeanZ, 13, dt);
  pet.root.rotation.y = THREE.MathUtils.damp(
    pet.root.rotation.y,
    0.08 + petLeanZ * 0.4 + idle.lookTargetYaw * 0.18 * fullIdle,
    10,
    dt
  );

  // Expressive Head Look-Around + Inquisitive Roll Tilt + Lane Look-Ahead
  const petHeadYaw =
    THREE.MathUtils.clamp(-input.strafeVelX * 0.045, -0.34, 0.34) +
    idle.lookTargetYaw * calmFactor +
    Math.sin(t * 1.7) * 0.055 * calmFactor;
  const petHeadPitch =
    -petPitchX * 0.65 +
    (nextState === 'FALLING' ? -0.14 : 0) +
    idle.lookTargetPitch * calmFactor +
    Math.sin(t * 2.4) * 0.025;
  const petHeadRoll =
    idle.lookTargetRoll * calmFactor +
    Math.sin(t * 1.45) * 0.035 * fullIdle;
  pet.headPivot.rotation.x = THREE.MathUtils.damp(pet.headPivot.rotation.x, petHeadPitch, 9.5, dt);
  pet.headPivot.rotation.y = THREE.MathUtils.damp(pet.headPivot.rotation.y, petHeadYaw, 8.5, dt);
  pet.headPivot.rotation.z = THREE.MathUtils.damp(pet.headPivot.rotation.z, petHeadRoll, 9.0, dt);

  // Arms: Left paw rests on explorer's collar; right paw fidgets/waves playfully when idle or cheering
  const fidgetArmLift = pawFidgetEnv * (-1.18 + Math.sin(t * 13) * 0.16);
  const targetLeftArmX =
    cheerAmt > 0.05
      ? -1.85 + Math.sin(t * 20) * 0.35
      : 0.35 + slideTuck * 0.4 + Math.sin(t * 3.15) * 0.04 * fullIdle;
  const targetRightArmX =
    cheerAmt > 0.05
      ? -2.05 - Math.sin(t * 20) * 0.35
      : 0.22 - runB * 0.15 + slideTuck * 0.45 + fidgetArmLift;
  pet.leftArm.rotation.x = THREE.MathUtils.damp(pet.leftArm.rotation.x, targetLeftArmX, 13, dt);
  pet.leftArm.rotation.z = THREE.MathUtils.damp(pet.leftArm.rotation.z, 0.28 - cheerAmt * 0.55, 13, dt);
  pet.rightArm.rotation.x = THREE.MathUtils.damp(pet.rightArm.rotation.x, targetRightArmX, 13, dt);
  pet.rightArm.rotation.z = THREE.MathUtils.damp(
    pet.rightArm.rotation.z,
    -0.12 + cheerAmt * 0.45 + pawFidgetEnv * 0.24,
    13,
    dt
  );

  // Long Graceful Tail: organic sway + crisp intermittent base & tip twitches + turn counter-balance
  const tailPitch =
    0.08 +
    runB * 0.16 +
    airB * 0.28 +
    Math.sin(2 * pL - 1.2) * 0.12 * runB +
    Math.sin(t * 2.1) * 0.07 * calmFactor +
    Math.abs(tailTwitchWave) * 0.35 +
    cheerAmt * 0.24;
  const tailSway =
    Math.sin(t * 2.8) * (0.12 + fullIdle * 0.06) +
    Math.sin(t * 4.7) * (0.07 + runB * 0.11) +
    tailTwitchWave -
    THREE.MathUtils.clamp(-input.strafeVelX * 0.045, -0.35, 0.35);
  pet.tailPivot.rotation.x = THREE.MathUtils.damp(pet.tailPivot.rotation.x, tailPitch, 11, dt);
  pet.tailPivot.rotation.z = THREE.MathUtils.damp(pet.tailPivot.rotation.z, tailSway, 11, dt);

  // Secondary articulated tail tip flick/curl with slight phase lag for lifelike whip
  const tailTipPitch =
    Math.sin(t * 3.1 - 0.8) * 0.11 +
    Math.abs(tailTipTwitchWave) * 0.38 +
    cheerAmt * Math.sin(t * 14) * 0.22;
  const tailTipSway =
    Math.sin(t * 2.8 - 0.9) * 0.18 +
    tailTipTwitchWave +
    Math.cos(t * 5.2) * 0.08 * runB;
  pet.tailTipPivot.rotation.x = THREE.MathUtils.damp(pet.tailTipPivot.rotation.x, tailTipPitch, 14, dt);
  pet.tailTipPivot.rotation.z = THREE.MathUtils.damp(pet.tailTipPivot.rotation.z, tailTipSway, 14, dt);
}
