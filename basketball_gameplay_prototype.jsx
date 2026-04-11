import React, { useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Vec2 = { x: number; y: number };
type GestureType =
  | "none"
  | "cross_left"
  | "cross_right"
  | "between_left"
  | "between_right"
  | "behind_left"
  | "behind_right"
  | "shot_start";
type MoveState = "idle" | "dribble" | "gather" | "shooting" | "recovery";
type BallHand = "left" | "right";
type TrailPoint = { x: number; y: number; t: number };
type GamePhase = "menu" | "playing" | "gameover";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  type: "confetti" | "spark";
};

type ScorePopup = {
  x: number;
  y: number;
  text: string;
  life: number;
  vy: number;
};

type PlayerState = {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  stamina: number;
  ballHand: BallHand;
  moveState: MoveState;
  dribblePhase: number;
  shotMeter: number;
  shotHolding: boolean;
  shotReleasedAt: number | null;
  flash: number;
  currentMoveLabel: string;
  moveTimer: number;
};

type DefenderState = {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  contesting: boolean;
  contestTimer: number;
};

type BallFlight = {
  active: boolean;
  t: number;
  duration: number;
  p0: Vec2;
  p1: Vec2;
  p2: Vec2;
  quality: number;
  isThree: boolean;
  madeShot: boolean;
};

type GestureResult = { type: GestureType; confidence: number; debug: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const COURT_W = 1000;
const COURT_H = 1600;
const JOYSTICK_RADIUS = 72;
const MAX_TRAIL = 28;
const FIXED_STEP = 1 / 120;
const MAX_DT = 1 / 20;
const BASKET_WORLD: Vec2 = { x: 500, y: 210 };
const THREE_PT_DIST = 400;
const GAME_DURATION = 90;
const SHOT_CLOCK = 24;

// ─── Math Utils ───────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const normalize = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const vdist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const angleOf = (v: Vec2) => Math.atan2(v.y, v.x);

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function bezier(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const t1 = 1 - t;
  return {
    x: t1 * t1 * p0.x + 2 * t1 * t * p1.x + t * t * p2.x,
    y: t1 * t1 * p0.y + 2 * t1 * t * p1.y + t * t * p2.y,
  };
}

function isInsideThree(pos: Vec2): boolean {
  return vdist(pos, BASKET_WORLD) < THREE_PT_DIST;
}

// ─── Gesture Classifier ───────────────────────────────────────────────────────
function classifyGesture(points: TrailPoint[]): GestureResult {
  if (points.length < 4) return { type: "none", confidence: 0, debug: "too_few" };
  const start = points[0];
  const end = points[points.length - 1];
  const delta = { x: end.x - start.x, y: end.y - start.y };
  const dist2 = Math.hypot(delta.x, delta.y);
  const duration = Math.max(1, end.t - start.t);
  const vx = delta.x / duration;
  const vy = delta.y / duration;
  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  let signedCurvature = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = sub(points[i], points[i - 1]);
    const b = sub(points[i + 1], points[i]);
    signedCurvature += a.x * b.y - a.y * b.x;
  }

  const upward = delta.y < -56 && absY > absX * 1.05;
  const curvedEnough = Math.abs(signedCurvature) > 1800 && dist2 > 56;
  const diagDownRight = delta.x > 36 && delta.y > 32;
  const diagDownLeft = delta.x < -36 && delta.y > 32;
  const strongHorizontal = absX > 48 && absX > absY * 1.3;

  if (upward && Math.abs(vy) > 0.5) return { type: "shot_start", confidence: 0.95, debug: "up_swipe" };
  if (curvedEnough) {
    if (delta.x > 0) return { type: "behind_right", confidence: 0.82, debug: "curve+" };
    return { type: "behind_left", confidence: 0.82, debug: "curve-" };
  }
  if (diagDownRight) return { type: "between_right", confidence: 0.84, debug: "diag_r" };
  if (diagDownLeft) return { type: "between_left", confidence: 0.84, debug: "diag_l" };
  if (strongHorizontal) {
    if (delta.x > 0 && Math.abs(vx) > 0.5) return { type: "cross_right", confidence: 0.9, debug: "horiz_r" };
    if (delta.x < 0 && Math.abs(vx) > 0.5) return { type: "cross_left", confidence: 0.9, debug: "horiz_l" };
  }
  return { type: "none", confidence: 0.2, debug: "unknown" };
}

// ─── DPR Hook ─────────────────────────────────────────────────────────────────
function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    const update = () => setDpr(Math.min(window.devicePixelRatio || 1, 3));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return dpr;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BasketballGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dpr = useDevicePixelRatio();

  const [uiStats, setUiStats] = useState({
    fps: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    phase: "menu" as GamePhase,
    move: "Idle",
    shot: "--",
  });

  const simRef = useRef({
    phase: "menu" as GamePhase,
    score: 0,
    timeLeft: GAME_DURATION,
    shotClock: SHOT_CLOCK,
    justStarted: false,

    player: {
      pos: { x: COURT_W * 0.5, y: COURT_H * 0.68 },
      vel: { x: 0, y: 0 },
      facing: -Math.PI / 2,
      stamina: 1,
      ballHand: "right" as BallHand,
      moveState: "idle" as MoveState,
      dribblePhase: 0,
      shotMeter: 0,
      shotHolding: false,
      shotReleasedAt: null as number | null,
      flash: 0,
      currentMoveLabel: "Idle",
      moveTimer: 0,
    } as PlayerState,

    defender: {
      pos: { x: COURT_W * 0.52, y: COURT_H * 0.44 },
      vel: { x: 0, y: 0 },
      facing: Math.PI / 2,
      contesting: false,
      contestTimer: 0,
    } as DefenderState,

    ballFlight: {
      active: false,
      t: 0,
      duration: 0,
      p0: { x: 0, y: 0 },
      p1: { x: 0, y: 0 },
      p2: { x: 0, y: 0 },
      quality: 0,
      isThree: false,
      madeShot: false,
    } as BallFlight,

    particles: [] as Particle[],
    scorePopups: [] as ScorePopup[],

    joystickOrigin: { x: 120, y: 1320 } as Vec2,
    joystickKnob: { x: 120, y: 1320 } as Vec2,
    moveInput: { x: 0, y: 0 } as Vec2,
    pointerMap: new Map<number, Vec2>(),
    leftStickId: null as number | null,
    gestureId: null as number | null,
    gestureTrail: [] as TrailPoint[],
    gestureDebug: "—",
    accumulator: 0,
    lastTime: 0,
    fpsSamples: [] as number[],
    arenaW: 0,
    arenaH: 0,
  });

  const CONFETTI_COLORS = useMemo(
    () => ["#ff4444", "#00d4ff", "#ffd700", "#44ff88", "#ff88ff", "#ff8800", "#ffffff"],
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    const sim = simRef.current;

    // ── Resize ──────────────────────────────────────────────────────────────
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.arenaW = w;
      sim.arenaH = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── Coordinate helpers ───────────────────────────────────────────────────
    const toScreen = (w: Vec2): Vec2 => ({
      x: (w.x / COURT_W) * sim.arenaW,
      y: (w.y / COURT_H) * sim.arenaH,
    });
    const ws = (u: number) => u * (sim.arenaW / COURT_W);
    const hs = (u: number) => u * (sim.arenaH / COURT_H);

    // ── Particles ─────────────────────────────────────────────────────────────
    const emitScore = (sx: number, sy: number, isThree: boolean) => {
      const count = isThree ? 48 : 28;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 90 + Math.random() * 220;
        sim.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 120,
          life: 1,
          maxLife: 0.9 + Math.random() * 0.4,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 5 + Math.random() * 7,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 10,
          type: "confetti",
        });
      }
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        sim.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * 140,
          vy: Math.sin(angle) * 140,
          life: 1,
          maxLife: 0.5,
          color: "#ffd700",
          size: 3,
          rotation: 0,
          rotSpeed: 0,
          type: "spark",
        });
      }
    };

    const addPopup = (wx: number, wy: number, text: string) => {
      const s = toScreen({ x: wx, y: wy });
      sim.scorePopups.push({ x: s.x, y: s.y, text, life: 1.2, vy: -70 });
    };

    // ── Shot launch ──────────────────────────────────────────────────────────
    const launchShot = (quality: number) => {
      if (sim.ballFlight.active) return;
      const p = sim.player;
      const three = !isInsideThree(p.pos);
      const d = vdist(p.pos, BASKET_WORLD);
      const flightTime = 0.45 + d / 1100;

      const midX = (p.pos.x + BASKET_WORLD.x) * 0.5;
      const midY = Math.min(p.pos.y, BASKET_WORLD.y) - COURT_H * (0.22 + quality * 0.12);

      // Shot success: green=make, yellow=50/50, red=miss
      const delta = Math.abs(quality - 0.68);
      let madeShot = false;
      if (delta < 0.05) madeShot = true;
      else if (delta < 0.13) madeShot = Math.random() < 0.52;

      sim.ballFlight = {
        active: true,
        t: 0,
        duration: flightTime,
        p0: { ...p.pos },
        p1: { x: midX, y: midY },
        p2: { ...BASKET_WORLD },
        quality,
        isThree: three,
        madeShot,
      };
    };

    const resolveShot = () => {
      const bf = sim.ballFlight;
      if (!bf.madeShot) return;
      const pts = bf.isThree ? 3 : 2;
      sim.score += pts;
      sim.shotClock = SHOT_CLOCK;
      const bs = toScreen(BASKET_WORLD);
      emitScore(bs.x, bs.y, bf.isThree);
      addPopup(BASKET_WORLD.x, BASKET_WORLD.y - 100, bf.isThree ? "+3" : "+2");
    };

    // ── Move trigger ─────────────────────────────────────────────────────────
    const triggerMove = (type: GestureType) => {
      const p = sim.player;
      if (type === "none" || sim.phase !== "playing") return;
      if (type === "shot_start") {
        p.moveState = "gather";
        p.shotHolding = true;
        p.shotMeter = 0;
        p.currentMoveLabel = "Loading…";
        p.moveTimer = 0.25;
        return;
      }
      p.moveState = "dribble";
      p.moveTimer = 0.18;
      p.flash = 1;
      switch (type) {
        case "cross_left":    p.ballHand = "left";  p.currentMoveLabel = "Crossover ←"; p.vel.x -= 85; break;
        case "cross_right":   p.ballHand = "right"; p.currentMoveLabel = "Crossover →"; p.vel.x += 85; break;
        case "between_left":  p.ballHand = "left";  p.currentMoveLabel = "Btw Legs ←";  p.vel.x -= 62; p.vel.y -= 32; break;
        case "between_right": p.ballHand = "right"; p.currentMoveLabel = "Btw Legs →";  p.vel.x += 62; p.vel.y -= 32; break;
        case "behind_left":   p.ballHand = "left";  p.currentMoveLabel = "Behind ←";    p.vel.x -= 74; break;
        case "behind_right":  p.ballHand = "right"; p.currentMoveLabel = "Behind →";    p.vel.x += 74; break;
      }
    };

    const endShot = () => {
      const p = sim.player;
      if (!p.shotHolding) return;
      p.shotHolding = false;
      p.moveState = "shooting";
      p.shotReleasedAt = p.shotMeter;
      p.moveTimer = 0.32;
      p.currentMoveLabel = "Release!";
      p.flash = 1;
      launchShot(p.shotMeter);
    };

    // ── Pointer events ───────────────────────────────────────────────────────
    const getPoint = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const resetGame = () => {
      sim.phase = "playing";
      sim.score = 0;
      sim.timeLeft = GAME_DURATION;
      sim.shotClock = SHOT_CLOCK;
      sim.particles = [];
      sim.scorePopups = [];
      sim.ballFlight.active = false;
      sim.justStarted = true;
      const p = sim.player;
      p.pos = { x: COURT_W * 0.5, y: COURT_H * 0.68 };
      p.vel = { x: 0, y: 0 };
      p.moveState = "idle";
      p.currentMoveLabel = "Idle";
      p.shotHolding = false;
      p.shotReleasedAt = null;
      p.stamina = 1;
      p.flash = 0;
      sim.defender.pos = { x: COURT_W * 0.52, y: COURT_H * 0.44 };
      sim.defender.vel = { x: 0, y: 0 };
      sim.moveInput = { x: 0, y: 0 };
    };

    const onPointerDown = (e: PointerEvent) => {
      const pt = getPoint(e);
      sim.pointerMap.set(e.pointerId, pt);
      canvas.setPointerCapture(e.pointerId);

      if (sim.phase === "menu" || sim.phase === "gameover") {
        resetGame();
        return;
      }

      if (sim.justStarted) {
        sim.justStarted = false;
        return;
      }

      const leftZone = pt.x < sim.arenaW * 0.42;
      if (leftZone && sim.leftStickId === null) {
        sim.leftStickId = e.pointerId;
        sim.joystickOrigin = pt;
        sim.joystickKnob = pt;
      } else if (!leftZone && sim.gestureId === null) {
        sim.gestureId = e.pointerId;
        sim.gestureTrail = [{ x: pt.x, y: pt.y, t: performance.now() }];
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = getPoint(e);
      sim.pointerMap.set(e.pointerId, pt);

      if (sim.leftStickId === e.pointerId) {
        const delta = sub(pt, sim.joystickOrigin);
        const len = Math.hypot(delta.x, delta.y);
        const n = len > 0 ? { x: delta.x / len, y: delta.y / len } : { x: 0, y: 0 };
        sim.joystickKnob = len > JOYSTICK_RADIUS ? add(sim.joystickOrigin, mul(n, JOYSTICK_RADIUS)) : pt;
        sim.moveInput = len > 8 ? n : { x: 0, y: 0 };
      }

      if (sim.gestureId === e.pointerId) {
        sim.gestureTrail.push({ x: pt.x, y: pt.y, t: performance.now() });
        if (sim.gestureTrail.length > MAX_TRAIL) sim.gestureTrail.shift();
        if (sim.player.shotHolding) {
          const depth = clamp((sim.gestureTrail[0].y - pt.y) / (sim.arenaH * 0.18), 0, 1);
          sim.player.shotMeter = depth;
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (sim.leftStickId === e.pointerId) {
        sim.leftStickId = null;
        sim.moveInput = { x: 0, y: 0 };
        sim.joystickKnob = sim.joystickOrigin;
      }
      if (sim.gestureId === e.pointerId) {
        if (sim.player.shotHolding) {
          endShot();
        } else {
          const result = classifyGesture(sim.gestureTrail);
          sim.gestureDebug = result.type === "none" ? "—" : result.type.replace(/_/g, " ");
          triggerMove(result.type);
        }
        sim.gestureId = null;
        sim.gestureTrail = [];
      }
      sim.pointerMap.delete(e.pointerId);
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    };

    const onPointerCancel = (e: PointerEvent) => onPointerUp(e);

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", onPointerCancel, { passive: true });

    // ── Simulation ───────────────────────────────────────────────────────────
    const simulate = (dt: number) => {
      if (sim.phase !== "playing") return;

      const p = sim.player;
      const def = sim.defender;

      // Timers
      sim.timeLeft = Math.max(0, sim.timeLeft - dt);
      sim.shotClock = Math.max(0, sim.shotClock - dt);
      if (sim.timeLeft <= 0) { sim.phase = "gameover"; return; }
      if (sim.shotClock <= 0) { sim.shotClock = SHOT_CLOCK; }

      // Player movement
      const moveAccel = 450;
      const maxSpeed = 240;
      const friction = 8.8;

      if (!p.shotHolding && p.moveState !== "shooting" && !sim.ballFlight.active) {
        p.vel.x += sim.moveInput.x * moveAccel * dt;
        p.vel.y += sim.moveInput.y * moveAccel * dt;
      }
      p.vel.x *= Math.exp(-friction * dt);
      p.vel.y *= Math.exp(-friction * dt);

      const spd = Math.hypot(p.vel.x, p.vel.y);
      if (spd > maxSpeed) {
        const n = normalize(p.vel);
        p.vel = mul(n, maxSpeed);
      }

      p.pos.x = clamp(p.pos.x + p.vel.x * dt, 100, COURT_W - 100);
      p.pos.y = clamp(p.pos.y + p.vel.y * dt, 300, COURT_H - 120);

      if (spd > 3) p.facing = lerp(p.facing, Math.atan2(p.vel.y, p.vel.x), 0.18);
      p.dribblePhase += dt * (4 + spd * 0.026);
      p.flash = Math.max(0, p.flash - dt * 3.5);
      p.moveTimer = Math.max(0, p.moveTimer - dt);

      if (p.shotHolding) {
        p.shotMeter = clamp(p.shotMeter + dt * 0.32, 0, 1);
        p.currentMoveLabel = "Shot Load";
      }

      // State machine
      if (p.moveState === "shooting" && p.moveTimer <= 0) { p.moveState = "recovery"; p.moveTimer = 0.14; }
      else if (p.moveState === "recovery" && p.moveTimer <= 0) { p.moveState = "idle"; p.currentMoveLabel = spd > 10 ? "Move" : "Idle"; }
      else if (p.moveState === "dribble" && p.moveTimer <= 0) { p.moveState = "idle"; p.currentMoveLabel = spd > 10 ? "Move" : "Idle"; }
      else if (p.moveState === "gather" && !p.shotHolding && p.moveTimer <= 0) { p.moveState = "idle"; }

      p.stamina = clamp(p.stamina - spd * 0.00006 * dt + 0.045 * dt, 0.2, 1);

      // Defender AI
      const toDef = sub(p.pos, def.pos);
      const defDist = Math.hypot(toDef.x, toDef.y);
      const defSpeed = clamp(165 + sim.score * 1.8, 165, 250);
      const desired = 135;

      if (defDist > desired + 25) {
        const n = normalize(toDef);
        def.vel.x = lerp(def.vel.x, n.x * defSpeed, dt * 4.5);
        def.vel.y = lerp(def.vel.y, n.y * defSpeed, dt * 4.5);
      } else if (defDist < desired - 25) {
        const n = normalize(toDef);
        def.vel.x = lerp(def.vel.x, -n.x * defSpeed * 0.5, dt * 4);
        def.vel.y = lerp(def.vel.y, -n.y * defSpeed * 0.5, dt * 4);
      } else {
        def.vel.x = lerp(def.vel.x, p.vel.x * 0.72, dt * 3.5);
        def.vel.y = lerp(def.vel.y, p.vel.y * 0.42, dt * 3.5);
      }

      def.vel.x *= Math.exp(-5.5 * dt);
      def.vel.y *= Math.exp(-5.5 * dt);
      def.pos.x = clamp(def.pos.x + def.vel.x * dt, 80, COURT_W - 80);
      def.pos.y = clamp(def.pos.y + def.vel.y * dt, 180, COURT_H - 180);
      def.facing = lerp(def.facing, Math.atan2(p.pos.y - def.pos.y, p.pos.x - def.pos.x), dt * 5.5);
      def.contesting = defDist < 170 && p.moveState === "shooting";
      def.contestTimer = Math.max(0, def.contestTimer - dt);
      if (def.contesting) def.contestTimer = 0.35;

      // Ball flight
      const bf = sim.ballFlight;
      if (bf.active) {
        bf.t += dt / bf.duration;
        if (bf.t >= 1) {
          bf.t = 1;
          bf.active = false;
          resolveShot();
          p.moveState = "recovery";
          p.moveTimer = 0.4;
        }
      }

      // Particles
      const gravity = 320;
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const part = sim.particles[i];
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.vy += gravity * dt;
        part.vx *= Math.exp(-1.8 * dt);
        part.rotation += part.rotSpeed * dt;
        part.life -= dt / part.maxLife;
        if (part.life <= 0) sim.particles.splice(i, 1);
      }

      // Score popups
      for (let i = sim.scorePopups.length - 1; i >= 0; i--) {
        const sp = sim.scorePopups[i];
        sp.y += sp.vy * dt;
        sp.vy *= Math.exp(-2.5 * dt);
        sp.life -= dt;
        if (sp.life <= 0) sim.scorePopups.splice(i, 1);
      }
    };

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  DRAW FUNCTIONS                                                      ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    const drawCourt = () => {
      const W = sim.arenaW;
      const H = sim.arenaH;

      // ── Floor ──────────────────────────────────────────────────────────────
      const floorGrad = ctx.createLinearGradient(0, 0, 0, H);
      floorGrad.addColorStop(0, "#c8892a");
      floorGrad.addColorStop(0.5, "#b87828");
      floorGrad.addColorStop(1, "#a06820");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, W, H);

      // Wood planks
      ctx.save();
      const plankW = Math.max(12, W / 24);
      for (let x = 0; x < W; x += plankW) {
        const even = Math.floor(x / plankW) % 2 === 0;
        ctx.fillStyle = even ? "rgba(255,210,140,0.09)" : "rgba(0,0,0,0.07)";
        ctx.fillRect(x, 0, plankW, H);
      }
      ctx.restore();

      // Arena light (top spotlight)
      const spotlight = ctx.createRadialGradient(W * 0.5, H * 0.06, 0, W * 0.5, H * 0.5, H * 0.7);
      spotlight.addColorStop(0, "rgba(255,248,210,0.14)");
      spotlight.addColorStop(0.55, "rgba(0,0,0,0)");
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, W, H);

      // ── Paint / Key ─────────────────────────────────────────────────────────
      const paintX = W * 0.28;
      const paintW = W * 0.44;
      const paintH = H * 0.21;

      const paintGrad = ctx.createLinearGradient(0, 0, 0, paintH);
      paintGrad.addColorStop(0, "#c81e3a");
      paintGrad.addColorStop(1, "#8a1228");
      ctx.fillStyle = paintGrad;
      ctx.fillRect(paintX, 0, paintW, paintH);

      // Lane hash marks
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const my = paintH * (0.44 + i * 0.14);
        ctx.beginPath(); ctx.moveTo(paintX - W * 0.025, my); ctx.lineTo(paintX, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(paintX + paintW, my); ctx.lineTo(paintX + paintW + W * 0.025, my); ctx.stroke();
      }

      // Paint border
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = Math.max(2.5, W / 200);
      ctx.strokeRect(paintX, 0, paintW, paintH);

      // ── Free throw line + circle ─────────────────────────────────────────────
      const ftCX = W * 0.5;
      const ftCY = paintH;
      const ftR = paintW * 0.5;

      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = Math.max(2.5, W / 200);
      ctx.beginPath();
      ctx.arc(ftCX, ftCY, ftR, 0, Math.PI, false); // bottom solid half
      ctx.stroke();
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(ftCX, ftCY, ftR, Math.PI, Math.PI * 2, false); // top dashed half
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Backboard ─────────────────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = Math.max(4, W / 90);
      ctx.beginPath();
      ctx.moveTo(W * 0.405, H * 0.046);
      ctx.lineTo(W * 0.595, H * 0.046);
      ctx.stroke();

      // Inner box
      ctx.lineWidth = 2;
      ctx.strokeRect(W * 0.458, H * 0.030, W * 0.084, H * 0.025);

      // ── Rim glow & circle ─────────────────────────────────────────────────────
      const rimS = toScreen(BASKET_WORLD);
      const rimR = ws(38);

      // Glow halo
      const rimGlow = ctx.createRadialGradient(rimS.x, rimS.y, 0, rimS.x, rimS.y, rimR * 3.2);
      rimGlow.addColorStop(0, "rgba(255,140,30,0.55)");
      rimGlow.addColorStop(0.4, "rgba(255,100,10,0.18)");
      rimGlow.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = rimGlow;
      ctx.beginPath();
      ctx.arc(rimS.x, rimS.y, rimR * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = Math.max(5, W / 80);
      ctx.beginPath();
      ctx.arc(rimS.x, rimS.y, rimR, 0, Math.PI * 2);
      ctx.stroke();

      // ── 3-pt arc ─────────────────────────────────────────────────────────────
      const basketS = toScreen(BASKET_WORLD);
      const threeR = ws(THREE_PT_DIST);
      const cornerX_L = W * 0.085;
      const cornerX_R = W * 0.915;

      // Where the arc meets the side lines (y coord)
      const dx_L = basketS.x - cornerX_L;
      const dx_R = cornerX_R - basketS.x;
      const sqrtL = Math.max(0, threeR * threeR - dx_L * dx_L);
      const sqrtR = Math.max(0, threeR * threeR - dx_R * dx_R);
      const cornerY_L = basketS.y + Math.sqrt(sqrtL);
      const cornerY_R = basketS.y + Math.sqrt(sqrtR);

      const angL = Math.atan2(cornerY_L - basketS.y, cornerX_L - basketS.x);
      const angR = Math.atan2(cornerY_R - basketS.y, cornerX_R - basketS.x);

      // Glow pass
      ctx.shadowColor = "rgba(150,220,255,0.35)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = Math.max(2.5, W / 200);

      // Corner lines
      ctx.beginPath(); ctx.moveTo(cornerX_L, 0); ctx.lineTo(cornerX_L, cornerY_L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cornerX_R, 0); ctx.lineTo(cornerX_R, cornerY_R); ctx.stroke();

      // Main arc (right corner → left corner going through bottom)
      ctx.beginPath();
      ctx.arc(basketS.x, basketS.y, threeR, angR, angL, false);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Restricted area (under rim) ──────────────────────────────────────────
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rimS.x, rimS.y, ws(95), 0, Math.PI, false);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ── Half-court markings ───────────────────────────────────────────────────
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, W * 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // ── Draw attached ball ───────────────────────────────────────────────────
    const drawAttachedBall = () => {
      if (sim.ballFlight.active) return;
      const p = sim.player;
      const s = toScreen(p.pos);
      const bsc = Math.min(sim.arenaW, sim.arenaH) / 900;
      const handX = p.ballHand === "right" ? 34 : -34;
      const bounce = Math.abs(Math.sin(p.dribblePhase * 4.2));
      const ballY = 20 + bounce * 46;
      const bx = s.x + handX * bsc;
      const by = s.y + ballY * bsc;
      const br = 13 * bsc;

      // Floor shadow
      ctx.fillStyle = `rgba(0,0,0,${0.18 + bounce * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(bx, s.y + 46 * bsc, br * (1.4 - bounce * 0.5), br * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      const bglow = ctx.createRadialGradient(bx, by, 0, bx, by, br * 2.2);
      bglow.addColorStop(0, "rgba(255,160,50,0.55)");
      bglow.addColorStop(1, "rgba(255,100,0,0)");
      ctx.fillStyle = bglow;
      ctx.beginPath(); ctx.arc(bx, by, br * 2.2, 0, Math.PI * 2); ctx.fill();

      // Ball
      const ballGrad = ctx.createRadialGradient(bx - br * 0.32, by - br * 0.32, 0, bx, by, br);
      ballGrad.addColorStop(0, "#f4a455");
      ballGrad.addColorStop(1, "#c96020");
      ctx.fillStyle = ballGrad;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

      // Seams
      ctx.strokeStyle = "rgba(0,0,0,0.38)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - br, by); ctx.lineTo(bx + br, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - br); ctx.lineTo(bx, by + br); ctx.stroke();

      // Shine
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.arc(bx - br * 0.26, by - br * 0.28, br * 0.28, 0, Math.PI * 2); ctx.fill();
    };

    // ── Draw ball in flight ──────────────────────────────────────────────────
    const drawBallFlight = () => {
      const bf = sim.ballFlight;
      if (!bf.active) return;

      // Trail
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const t = Math.max(0, bf.t - (steps - i) * 0.022);
        const pos = bezier(bf.p0, bf.p1, bf.p2, t);
        const s = toScreen(pos);
        const alpha = (i / steps) * 0.55;
        const r = 5 + i * 0.7;
        ctx.fillStyle = `rgba(255,150,40,${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }

      // Current ball position
      const pos = bezier(bf.p0, bf.p1, bf.p2, bf.t);
      const s = toScreen(pos);
      const br = 15;

      // Floor shadow (projected straight down)
      const ss = toScreen({ x: pos.x, y: COURT_H * 0.97 });
      const shadowScale = clamp(1 - bf.t * 0.6, 0.15, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.22 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(ss.x, ss.y, br * shadowScale * 1.6, br * shadowScale * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      const bglow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, br * 2.4);
      bglow.addColorStop(0, "rgba(255,170,50,0.7)");
      bglow.addColorStop(1, "rgba(255,100,0,0)");
      ctx.fillStyle = bglow;
      ctx.beginPath(); ctx.arc(s.x, s.y, br * 2.4, 0, Math.PI * 2); ctx.fill();

      // Ball
      const ballGrad = ctx.createRadialGradient(s.x - br * 0.3, s.y - br * 0.3, 0, s.x, s.y, br);
      ballGrad.addColorStop(0, "#f4a455");
      ballGrad.addColorStop(1, "#c96020");
      ctx.fillStyle = ballGrad;
      ctx.beginPath(); ctx.arc(s.x, s.y, br, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x - br, s.y); ctx.lineTo(s.x + br, s.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x, s.y - br); ctx.lineTo(s.x, s.y + br); ctx.stroke();
    };

    // ── Draw player ──────────────────────────────────────────────────────────
    const drawPlayer = () => {
      const p = sim.player;
      const s = toScreen(p.pos);
      const spd = Math.hypot(p.vel.x, p.vel.y);
      const bob = Math.sin(p.dribblePhase * 2.6) * Math.min(10, 3 + spd * 0.02);
      const bsc = Math.min(sim.arenaW, sim.arenaH) / 900;
      const legSwing = Math.sin(p.dribblePhase * 2.6) * Math.min(14, spd * 0.06) * bsc;
      const armSwing = Math.sin(p.dribblePhase * 2.6 + Math.PI) * Math.min(12, spd * 0.05) * bsc;

      ctx.save();
      ctx.translate(s.x, s.y + bob * 0.12);
      ctx.rotate(p.facing * 0.055);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 46 * bsc, 36 * bsc, 13 * bsc, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flash ring (move cue)
      if (p.flash > 0.01) {
        const ringR = 48 * bsc + (1 - p.flash) * 18;
        const fg = ctx.createRadialGradient(0, 0, ringR * 0.6, 0, 0, ringR);
        fg.addColorStop(0, `rgba(0,212,255,${p.flash * 0.6})`);
        fg.addColorStop(1, "rgba(0,212,255,0)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.fill();
      }

      // Legs
      ctx.strokeStyle = "#1a2340";
      ctx.lineWidth = 11 * bsc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-10 * bsc, 34 * bsc); ctx.lineTo(-16 * bsc + legSwing, 76 * bsc);
      ctx.moveTo(10 * bsc, 34 * bsc); ctx.lineTo(16 * bsc - legSwing, 76 * bsc);
      ctx.stroke();

      // Shoes
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath(); ctx.ellipse(-16 * bsc + legSwing, 80 * bsc, 11 * bsc, 5 * bsc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16 * bsc - legSwing, 80 * bsc, 11 * bsc, 5 * bsc, 0, 0, Math.PI * 2); ctx.fill();

      // Body
      const bodyGrad = ctx.createLinearGradient(-28 * bsc, -54 * bsc, 28 * bsc, 34 * bsc);
      bodyGrad.addColorStop(0, "#00d4ff");
      bodyGrad.addColorStop(0.35, "#1a2340");
      bodyGrad.addColorStop(1, "#0d1520");
      ctx.fillStyle = bodyGrad;
      rrect(ctx, -28 * bsc, -54 * bsc, 56 * bsc, 90 * bsc, 18 * bsc);
      ctx.fill();

      // Jersey stripe
      ctx.fillStyle = "rgba(0,212,255,0.35)";
      ctx.fillRect(-28 * bsc, -10 * bsc, 56 * bsc, 6 * bsc);

      // Jersey number
      ctx.fillStyle = "#00d4ff";
      ctx.font = `bold ${Math.max(10, 14 * bsc)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("23", 0, -22 * bsc);

      // Arms
      ctx.strokeStyle = "#d4a572";
      ctx.lineWidth = 9 * bsc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-26 * bsc, -24 * bsc); ctx.lineTo(-36 * bsc + armSwing, 16 * bsc);
      ctx.moveTo(26 * bsc, -24 * bsc); ctx.lineTo(36 * bsc - armSwing, 16 * bsc);
      ctx.stroke();

      // Head
      ctx.fillStyle = "#d4a572";
      ctx.beginPath(); ctx.arc(0, -72 * bsc, 20 * bsc, 0, Math.PI * 2); ctx.fill();

      // Hair
      ctx.fillStyle = "#1a0a00";
      ctx.beginPath(); ctx.ellipse(0, -80 * bsc, 18 * bsc, 10 * bsc, 0, 0, Math.PI); ctx.fill();

      ctx.restore();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    };

    // ── Draw defender ────────────────────────────────────────────────────────
    const drawDefender = () => {
      if (sim.phase !== "playing") return;
      const def = sim.defender;
      const s = toScreen(def.pos);
      const bsc = Math.min(sim.arenaW, sim.arenaH) / 900;
      const bob = Math.sin(performance.now() * 0.0028) * 3;

      ctx.save();
      ctx.translate(s.x, s.y + bob);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, 46 * bsc, 34 * bsc, 12 * bsc, 0, 0, Math.PI * 2);
      ctx.fill();

      // Contest glow
      if (def.contestTimer > 0) {
        ctx.globalAlpha = clamp(def.contestTimer * 2, 0, 1);
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 50 * bsc, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Legs (wide defensive stance)
      ctx.strokeStyle = "#3d1515";
      ctx.lineWidth = 11 * bsc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-14 * bsc, 34 * bsc); ctx.lineTo(-22 * bsc, 74 * bsc);
      ctx.moveTo(14 * bsc, 34 * bsc); ctx.lineTo(22 * bsc, 74 * bsc);
      ctx.stroke();

      // Shoes
      ctx.fillStyle = "#cc2222";
      ctx.beginPath(); ctx.ellipse(-22 * bsc, 77 * bsc, 11 * bsc, 5 * bsc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(22 * bsc, 77 * bsc, 11 * bsc, 5 * bsc, 0, 0, Math.PI * 2); ctx.fill();

      // Body
      const bodyGrad = ctx.createLinearGradient(-28 * bsc, -54 * bsc, 28 * bsc, 34 * bsc);
      bodyGrad.addColorStop(0, "#ff4444");
      bodyGrad.addColorStop(0.35, "#3d1515");
      bodyGrad.addColorStop(1, "#1a0000");
      ctx.fillStyle = bodyGrad;
      rrect(ctx, -28 * bsc, -54 * bsc, 56 * bsc, 90 * bsc, 18 * bsc);
      ctx.fill();

      // Arms (wide, defensive)
      ctx.strokeStyle = "#c07858";
      ctx.lineWidth = 9 * bsc;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-26 * bsc, -24 * bsc); ctx.lineTo(-54 * bsc, -6 * bsc);
      ctx.moveTo(26 * bsc, -24 * bsc); ctx.lineTo(54 * bsc, -6 * bsc);
      ctx.stroke();

      // Head
      ctx.fillStyle = "#c07858";
      ctx.beginPath(); ctx.arc(0, -72 * bsc, 20 * bsc, 0, Math.PI * 2); ctx.fill();

      // Hair
      ctx.fillStyle = "#0a0500";
      ctx.beginPath(); ctx.ellipse(0, -80 * bsc, 18 * bsc, 10 * bsc, 0, 0, Math.PI); ctx.fill();

      ctx.restore();
    };

    // ── Draw joystick ────────────────────────────────────────────────────────
    const drawJoystick = () => {
      if (sim.leftStickId === null || sim.phase !== "playing") return;
      ctx.save();

      // Outer ring
      ctx.fillStyle = "rgba(0,212,255,0.06)";
      ctx.beginPath(); ctx.arc(sim.joystickOrigin.x, sim.joystickOrigin.y, JOYSTICK_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,212,255,0.32)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Knob
      const kx = sim.joystickKnob.x;
      const ky = sim.joystickKnob.y;
      const kg = ctx.createRadialGradient(kx - 6, ky - 6, 0, kx, ky, 32);
      kg.addColorStop(0, "rgba(0,212,255,0.6)");
      kg.addColorStop(1, "rgba(0,80,180,0.28)");
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(kx, ky, 32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,212,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    // ── Draw gesture trail ───────────────────────────────────────────────────
    const drawGestureTrail = () => {
      if (sim.gestureTrail.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < sim.gestureTrail.length; i++) {
        const a = sim.gestureTrail[i - 1];
        const b = sim.gestureTrail[i];
        const alpha = i / sim.gestureTrail.length;
        const isShotMode = sim.player.shotHolding;
        ctx.strokeStyle = isShotMode
          ? `rgba(255,220,60,${0.12 + alpha * 0.72})`
          : `rgba(0,212,255,${0.1 + alpha * 0.68})`;
        ctx.lineWidth = 3 + alpha * 8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    };

    // ── Draw shot meter ──────────────────────────────────────────────────────
    const drawShotMeter = () => {
      const p = sim.player;
      if (!p.shotHolding && p.shotReleasedAt === null) return;

      const W = sim.arenaW;
      const H = sim.arenaH;
      const mx = W * 0.845;
      const my = H * 0.30;
      const mw = 26;
      const mh = H * 0.32;

      ctx.save();

      // Panel background
      rrect(ctx, mx - 14, my - 20, mw + 52, mh + 40, 20);
      ctx.fillStyle = "rgba(4,8,22,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Green zone highlight
      const greenY0 = my + mh * (1 - 0.82);
      const greenY1 = my + mh * (1 - 0.55);
      ctx.fillStyle = "rgba(34,197,94,0.18)";
      ctx.fillRect(mx, greenY0, mw, greenY1 - greenY0);

      // Track gradient
      const trackGrad = ctx.createLinearGradient(0, my + mh, 0, my);
      trackGrad.addColorStop(0, "#ef4444");
      trackGrad.addColorStop(0.20, "#f97316");
      trackGrad.addColorStop(0.40, "#facc15");
      trackGrad.addColorStop(0.55, "#a3e635");
      trackGrad.addColorStop(0.68, "#22c55e");
      trackGrad.addColorStop(0.80, "#a3e635");
      trackGrad.addColorStop(0.90, "#facc15");
      trackGrad.addColorStop(1, "#ef4444");

      rrect(ctx, mx, my, mw, mh, 12);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();

      const filled = p.shotHolding ? p.shotMeter : (p.shotReleasedAt ?? 0);
      const fillH = mh * clamp(filled, 0, 1);
      rrect(ctx, mx, my + mh - fillH, mw, fillH, 12);
      ctx.fillStyle = trackGrad;
      ctx.fill();

      // Perfect line (at 0.68)
      const perfY = my + mh * (1 - 0.68);
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(mx - 7, perfY); ctx.lineTo(mx + mw + 18, perfY); ctx.stroke();
      ctx.setLineDash([]);

      // Label
      const fs = Math.max(10, W * 0.027);
      ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      if (p.shotHolding) {
        ctx.fillStyle = "#ffd700";
        ctx.fillText("SHOT", mx + mw * 0.5, my - 22);
      } else if (p.shotReleasedAt !== null) {
        const delta = Math.abs(p.shotReleasedAt - 0.68);
        let label = "MISS"; let color = "#ef4444";
        if (delta < 0.05) { label = "GREEN!"; color = "#22c55e"; }
        else if (delta < 0.13) { label = "CLOSE"; color = "#facc15"; }
        ctx.fillStyle = color;
        ctx.fillText(label, mx + mw * 0.5, my - 22);
      }

      ctx.restore();
      ctx.textAlign = "left";
    };

    // ── Draw HUD ─────────────────────────────────────────────────────────────
    const drawHud = () => {
      if (sim.phase !== "playing") return;
      const W = sim.arenaW;
      const H = sim.arenaH;
      const pad = 12;

      ctx.save();

      // ── Score + timer center panel ──────────────────────────────────────────
      const hudW = Math.min(W * 0.52, 300);
      const hudH = 74;
      const hudX = W * 0.5 - hudW * 0.5;
      const hudY = pad;

      rrect(ctx, hudX, hudY, hudW, hudH, 16);
      ctx.fillStyle = "rgba(4,8,22,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Score
      ctx.fillStyle = "#ffd700";
      ctx.font = `900 ${Math.max(24, W * 0.068)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${sim.score}`, W * 0.5, hudY + hudH * 0.65);

      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = `500 ${Math.max(9, W * 0.024)}px Inter, system-ui, sans-serif`;
      ctx.fillText("PTS", W * 0.5, hudY + hudH * 0.88);

      // Timer (right)
      const tM = Math.floor(sim.timeLeft / 60);
      const tS = Math.floor(sim.timeLeft % 60);
      ctx.fillStyle = sim.timeLeft < 10 ? "#ef4444" : "rgba(255,255,255,0.9)";
      ctx.font = `700 ${Math.max(16, W * 0.042)}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(`${tM}:${tS.toString().padStart(2, "0")}`, hudX + hudW - 12, hudY + hudH * 0.56);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `400 ${Math.max(8, W * 0.02)}px Inter, system-ui, sans-serif`;
      ctx.fillText("TIME", hudX + hudW - 12, hudY + hudH * 0.8);

      // FPS (left)
      const avgFps = sim.fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, sim.fpsSamples.length);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `400 ${Math.max(8, W * 0.018)}px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(`${avgFps.toFixed(0)}fps`, hudX + 10, hudY + hudH * 0.56);

      // Stamina
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `400 ${Math.max(8, W * 0.018)}px Inter, system-ui, sans-serif`;
      ctx.fillText("STM", hudX + 10, hudY + hudH * 0.8);

      // Stamina bar
      const stmX = hudX + 10;
      const stmY = hudY + hudH + 7;
      const stmW = hudW * 0.32;
      const stmH = 5;
      rrect(ctx, stmX, stmY, stmW, stmH, 3);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fill();
      rrect(ctx, stmX, stmY, stmW * sim.player.stamina, stmH, 3);
      ctx.fillStyle = sim.player.stamina > 0.4 ? "#00d4ff" : "#facc15";
      ctx.fill();

      // ── Shot clock (right side) ─────────────────────────────────────────────
      const scW = 60;
      const scH = 52;
      const scX = W - scW - pad;
      const scY = pad;
      const scLow = sim.shotClock < 6;

      rrect(ctx, scX, scY, scW, scH, 12);
      ctx.fillStyle = "rgba(4,8,22,0.88)";
      ctx.fill();
      ctx.strokeStyle = scLow ? "#ef4444" : "rgba(255,255,255,0.14)";
      ctx.lineWidth = scLow ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = scLow ? "#ef4444" : "rgba(255,255,255,0.92)";
      ctx.font = `800 ${Math.max(18, W * 0.056)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(Math.ceil(sim.shotClock).toString(), scX + scW * 0.5, scY + scH * 0.65);
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = `400 ${Math.max(8, W * 0.02)}px Inter, system-ui, sans-serif`;
      ctx.fillText("SHOT", scX + scW * 0.5, scY + scH * 0.88);

      ctx.restore();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    };

    // ── Draw 2pt/3pt indicator above player ─────────────────────────────────
    const drawPositionBadge = () => {
      if (sim.phase !== "playing" || sim.ballFlight.active) return;
      const p = sim.player;
      const s = toScreen(p.pos);
      const three = !isInsideThree(p.pos);
      const bsc = Math.min(sim.arenaW, sim.arenaH) / 900;

      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = three ? "#ffd700" : "#00d4ff";
      ctx.font = `700 ${Math.max(9, sim.arenaW * 0.022)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(three ? "3PT" : "2PT", s.x, s.y - 104 * bsc);
      ctx.restore();
      ctx.textAlign = "left";
    };

    // ── Draw particles ───────────────────────────────────────────────────────
    const drawParticles = () => {
      for (const p of sim.particles) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.type === "confetti") {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.28, p.size, p.size * 0.55);
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.size * 2.2, 0); ctx.stroke();
        }
        ctx.restore();
      }
    };

    // ── Draw score popups ────────────────────────────────────────────────────
    const drawScorePopups = () => {
      for (const sp of sim.scorePopups) {
        const alpha = clamp(sp.life, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${Math.max(26, sim.arenaW * 0.088)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 4;
        ctx.strokeText(sp.text, sp.x, sp.y);
        ctx.fillStyle = "#ffd700";
        ctx.fillText(sp.text, sp.x, sp.y);
        ctx.restore();
      }
      ctx.textAlign = "left";
    };

    // ── Draw menu ────────────────────────────────────────────────────────────
    const drawMenu = () => {
      const W = sim.arenaW;
      const H = sim.arenaH;
      const t = performance.now() * 0.001;

      ctx.fillStyle = "rgba(5,8,20,0.75)";
      ctx.fillRect(0, 0, W, H);

      // Pulsing title glow
      const glowR = ctx.createRadialGradient(W * 0.5, H * 0.36, 0, W * 0.5, H * 0.36, W * 0.55);
      glowR.addColorStop(0, `rgba(0,212,255,${0.16 + Math.sin(t) * 0.06})`);
      glowR.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowR;
      ctx.fillRect(0, H * 0.1, W, H * 0.6);

      ctx.textAlign = "center";

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.max(30, W * 0.115)}px Inter, system-ui, sans-serif`;
      ctx.fillText("JAXON", W * 0.5, H * 0.34);

      ctx.fillStyle = "#00d4ff";
      ctx.font = `700 ${Math.max(14, W * 0.046)}px Inter, system-ui, sans-serif`;
      ctx.fillText("BASKETBALL", W * 0.5, H * 0.41);

      // Tap to play
      const btnW = W * 0.58;
      const btnH = H * 0.065;
      const btnX = W * 0.5 - btnW * 0.5;
      const btnY = H * 0.52;
      const pulse = 1 + Math.sin(t * 2) * 0.03;

      ctx.save();
      ctx.translate(W * 0.5, btnY + btnH * 0.5);
      ctx.scale(pulse, pulse);
      ctx.translate(-W * 0.5, -(btnY + btnH * 0.5));

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, "#00d4ff");
      btnGrad.addColorStop(1, "#0050cc");
      rrect(ctx, btnX, btnY, btnW, btnH, btnH * 0.5);
      ctx.fillStyle = btnGrad;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.max(15, W * 0.048)}px Inter, system-ui, sans-serif`;
      ctx.fillText("TAP TO PLAY", W * 0.5, btnY + btnH * 0.66);

      // Controls hint
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = `400 ${Math.max(9, W * 0.026)}px Inter, system-ui, sans-serif`;
      ctx.fillText("LEFT: Joystick   RIGHT: Swipe to dribble & shoot", W * 0.5, H * 0.65);

      ctx.textAlign = "left";
    };

    // ── Draw game over ───────────────────────────────────────────────────────
    const drawGameOver = () => {
      const W = sim.arenaW;
      const H = sim.arenaH;

      ctx.fillStyle = "rgba(5,8,20,0.84)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";

      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.max(22, W * 0.082)}px Inter, system-ui, sans-serif`;
      ctx.fillText("GAME OVER", W * 0.5, H * 0.30);

      ctx.fillStyle = "#ffd700";
      ctx.font = `900 ${Math.max(42, W * 0.16)}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${sim.score}`, W * 0.5, H * 0.44);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `500 ${Math.max(13, W * 0.036)}px Inter, system-ui, sans-serif`;
      ctx.fillText("POINTS", W * 0.5, H * 0.50);

      // Rating
      let rating = "ROOKIE";
      if (sim.score >= 30) rating = "ALL STAR ★★★";
      else if (sim.score >= 20) rating = "PRO ★★";
      else if (sim.score >= 10) rating = "STARTER ★";
      ctx.fillStyle = "#00d4ff";
      ctx.font = `700 ${Math.max(12, W * 0.034)}px Inter, system-ui, sans-serif`;
      ctx.fillText(rating, W * 0.5, H * 0.56);

      // Replay button
      const btnW = W * 0.58;
      const btnH = H * 0.065;
      const btnX = W * 0.5 - btnW * 0.5;
      const btnY = H * 0.62;

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, "#ff4444");
      btnGrad.addColorStop(1, "#aa0000");
      rrect(ctx, btnX, btnY, btnW, btnH, btnH * 0.5);
      ctx.fillStyle = btnGrad;
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.max(15, W * 0.048)}px Inter, system-ui, sans-serif`;
      ctx.fillText("PLAY AGAIN", W * 0.5, btnY + btnH * 0.66);

      ctx.textAlign = "left";
    };

    // ── Main render ──────────────────────────────────────────────────────────
    const draw = () => {
      drawCourt();
      drawParticles();
      drawDefender();
      drawPlayer();
      drawAttachedBall();
      drawBallFlight();
      drawPositionBadge();
      drawJoystick();
      drawGestureTrail();
      drawShotMeter();
      drawHud();
      drawScorePopups();
      if (sim.phase === "menu") drawMenu();
      if (sim.phase === "gameover") drawGameOver();
    };

    // ── RAF loop ─────────────────────────────────────────────────────────────
    let raf = 0;
    const frame = (time: number) => {
      if (sim.lastTime === 0) sim.lastTime = time;
      const dt = Math.min((time - sim.lastTime) / 1000, MAX_DT);
      sim.lastTime = time;

      sim.accumulator += dt;
      while (sim.accumulator >= FIXED_STEP) {
        simulate(FIXED_STEP);
        sim.accumulator -= FIXED_STEP;
      }

      sim.fpsSamples.push(1 / Math.max(dt, 0.0001));
      if (sim.fpsSamples.length > 30) sim.fpsSamples.shift();

      // Throttled React state update
      setUiStats((prev) => {
        const fps = sim.fpsSamples.reduce((a, b) => a + b, 0) / sim.fpsSamples.length;
        const shotLabel =
          sim.player.shotReleasedAt === null ? "--"
          : Math.abs(sim.player.shotReleasedAt - 0.68) < 0.05 ? "GREEN"
          : Math.abs(sim.player.shotReleasedAt - 0.68) < 0.13 ? "CLOSE"
          : "MISS";
        const next = {
          fps,
          score: sim.score,
          timeLeft: sim.timeLeft,
          phase: sim.phase,
          move: sim.player.currentMoveLabel,
          shot: shotLabel,
        };
        if (
          Math.abs(prev.fps - next.fps) < 3 &&
          prev.score === next.score &&
          prev.phase === next.phase
        ) return prev;
        return next;
      });

      draw();
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [dpr, CONFETTI_COLORS]);

  return (
    <div className="flex flex-col bg-black text-white" style={{ height: "100dvh" }}>
      {/* Stat strip */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-white/10 bg-black/90">
        <span className="text-base font-black tracking-widest text-white">JAXON</span>
        <div className="flex gap-2">
          <StatBadge label="PTS" value={uiStats.score.toString()} accent="#ffd700" />
          <StatBadge label="MOVE" value={uiStats.move} />
          <StatBadge label="SHOT" value={uiStats.shot} accent={uiStats.shot === "GREEN" ? "#22c55e" : undefined} />
          <StatBadge label="FPS" value={uiStats.fps.toFixed(0)} />
        </div>
      </div>

      {/* Canvas area — fills remaining space */}
      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden bg-black"
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  );
}

function StatBadge({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 min-w-[48px]">
      <span className="text-[9px] tracking-[0.15em] text-white/38 uppercase">{label}</span>
      <span className="text-xs font-bold truncate max-w-[64px]" style={{ color: accent ?? "white" }}>
        {value}
      </span>
    </div>
  );
}
