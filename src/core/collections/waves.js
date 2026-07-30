import { VIS, VMAP } from '../visualizers.js';
import { TAU, mulberry, R, T, SEL, ring, glowDot, stars } from './utils.js';
import { clamp, lerp, Palette } from '../palette.js';
import { Audio } from '../audio.js';

const def = (id, name, group, params, draw, init) => {
  const v = { id, name, group, params, draw, init };
  VIS.push(v);
  VMAP[id] = v;
};

def(
  'wave',
  'Neon Waveform',
  'waves',
  {
    layers: R('Слои', 9, 1, 24, 1),
    spread: R('Разброс', 0.34, 0, 1),
    wobble: R('Дрожь', 0.5, 0, 2),
    thick: R('Толщина', 2, 0.4, 8, 0.1),
    glow: R('Свечение', 0.55, 0, 1),
    mirrored: T('Зеркало', true),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const L = Math.max(1, Math.round(p.layers * g.q)),
      step = Math.max(2, (10 / g.q) | 0);
    ctx.lineCap = 'round';
    if (p.glow > 0.01) {
      g.add();
    }
    for (let l = 0; l < L; l++) {
      const f = l / L,
        amp = h * 0.34 * (1 - f * p.spread) * g.S.amp;
      ctx.beginPath();
      for (let i = 0; i <= 512; i += 1) {
        const x = (i / 512) * w;
        const y =
          cy + A.w(i / 512) * amp + Math.sin(i * 0.05 + g.t * 2 + l * 0.8) * p.wobble * 9 * (1 + f);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick * (1 - f * 0.55);
      g.alpha(lerp(0.9, 0.13, f) * (1 - p.glow * 0.3));
      ctx.stroke();
      if (p.mirrored) {
        ctx.save();
        ctx.translate(0, cy * 2);
        ctx.scale(1, -1);
        ctx.globalAlpha *= 0.4;
        ctx.stroke();
        ctx.restore();
      }
    }
    g.norm();
    void step;
  },
);

def(
  'aurora',
  'Aurora Flow',
  'waves',
  {
    sheets: R('Полотна', 14, 3, 34, 1),
    drift: R('Дрейф', 0.6, 0, 2),
    height: R('Высота', 0.45, 0.05, 1),
    veil: R('Вуаль', 0.5, 0, 1),
    tilt: R('Наклон', 0.3, -1, 1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const S = Math.max(3, Math.round(p.sheets * g.q));
    g.add();
    for (let l = 0; l < S; l++) {
      const f = l / S;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let i = 0; i <= 96; i++) {
        const x = i / 96,
          v = A.b(x * 0.8 + f * 0.12);
        const y =
          cy +
          Math.sin(x * 7 + f * 2.4 + g.t * p.drift * 1.6) * v * h * p.height +
          (f - 0.5) * h * 0.5 * p.veil +
          x * p.tilt * h * 0.18;
        ctx.lineTo(x * w, y);
      }
      ctx.lineTo(w, cy);
      g.alpha(0.05 + A.level * 0.1);
      ctx.fillStyle = g.col(f);
      ctx.fill();
      g.alpha(0.22);
      ctx.strokeStyle = g.col(1 - f);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    g.norm();
  },
);

def(
  'ribbon',
  'Prismatic Ribbon',
  'waves',
  {
    width: R('Ширина', 14, 2, 46, 0.5),
    twist: R('Скрутка', 1, 0, 3),
    segs: R('Сегменты', 180, 32, 420, 1),
    split: R('Хром. сдвиг', 0.5, 0, 1),
    speed: R('Ход', 1, 0, 3),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(32, Math.round(p.segs * g.q));
    g.add();
    for (let ch = 0; ch < 3; ch++) {
      const off = (ch - 1) * p.split * 14;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = i / n;
        const y =
          cy +
          A.w(x) * h * 0.3 * g.S.amp +
          Math.sin(x * 9 * p.twist + g.t * p.speed * 2) * h * 0.1 +
          off;
        i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
      }
      ctx.lineWidth = p.width * (1 - Math.abs(ch - 1) * 0.35);
      ctx.strokeStyle = g.col(ch / 2);
      g.alpha(ch === 1 ? 0.55 : 0.3);
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, p.width * 0.16);
    ctx.strokeStyle = g.col(0.5);
    g.alpha(0.95);
    ctx.stroke();
    g.norm();
  },
);

def(
  'holoWave',
  'Holographic Wave',
  'waves',
  {
    sheets: R('Листы', 18, 4, 40, 1),
    tilt: R('Наклон', 0.4, 0, 1),
    scan: R('Скан-линии', 0.4, 0, 1),
    phase: R('Фаза', 0.6, 0, 2),
    depth: R('Глубина', 0.5, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const S = Math.max(4, Math.round(p.sheets * g.q));
    g.add();
    for (let l = 0; l < S; l++) {
      const f = l / S,
        z = 1 - f * p.depth;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120,
          v = A.b(x);
        const y =
          cy +
          Math.sin(x * 14 + l * 0.24 + g.t * p.phase * 2) * (6 + v * h * 0.3) * g.S.amp +
          (f - 0.5) * h * 0.55 * p.tilt;
        i ? ctx.lineTo(lerp(w * 0.5, x * w, z), y) : ctx.moveTo(lerp(w * 0.5, x * w, z), y);
      }
      g.alpha(0.1 + f * 0.12);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    g.norm();
    if (p.scan > 0.01) {
      g.alpha(p.scan * 0.16);
      ctx.fillStyle = g.col(0.5);
      for (let y = (g.t * 40) % 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);
    }
    g.alpha(1);
  },
);

def(
  'liquid',
  'Liquid Glass',
  'waves',
  {
    layers: R('Слои', 10, 2, 26, 1),
    visc: R('Вязкость', 0.5, 0, 1),
    blob: R('Капли', 0.8, 0, 2),
    rim: R('Кромка', 0.5, 0, 1),
    scale: R('Масштаб', 1, 0.3, 2),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const L = Math.max(2, Math.round(p.layers * g.q));
    const st = g.st;
    if (!st.s) st.s = new Float32Array(64);
    for (let i = 0; i < 64; i++)
      st.s[i] += (A.b(i / 64) - st.s[i]) * clamp(g.dt * lerp(14, 1.6, p.visc), 0.01, 1);
    for (let l = 0; l < L; l++) {
      const f = l / L;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= 63; i++) {
        const x = i / 63;
        const y =
          cy +
          (st.s[i] - 0.35) * h * 0.38 * p.scale * g.S.amp +
          Math.sin(x * 6 * p.blob + g.t * 1.2 + l) * h * 0.06 +
          (f - 0.5) * h * 0.3;
        ctx.lineTo(x * w, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      g.alpha(0.09);
      ctx.fillStyle = g.col(f);
      ctx.fill();
      if (p.rim > 0.01) {
        g.alpha(p.rim * 0.5);
        ctx.strokeStyle = g.col(1 - f);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    g.alpha(1);
  },
);

def(
  'harmonic',
  'Harmonic Flow',
  'waves',
  {
    harmonics: R('Гармоники', 5, 1, 14, 1),
    phase: R('Фаза', 0.6, 0, 2),
    spread: R('Разброс', 0.5, 0, 1),
    thick: R('Толщина', 1.4, 0.4, 5, 0.1),
    detune: R('Расстройка', 0.3, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const H = Math.max(1, Math.round(p.harmonics));
    g.add();
    for (let k = 1; k <= H; k++) {
      const f = k / H,
        v = A.b(f * 0.85);
      ctx.beginPath();
      for (let i = 0; i <= 220; i++) {
        const x = i / 220;
        const y =
          cy +
          Math.sin(x * TAU * k * (1 + p.detune * 0.12) + g.t * p.phase * 3 * k * 0.3) *
            v *
            h *
            0.34 *
            g.S.amp +
          (f - 0.5) * h * p.spread * 0.5;
        i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
      }
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick;
      g.alpha(0.28 + v * 0.5);
      ctx.stroke();
    }
    g.norm();
  },
);

def(
  'pulse',
  'Neon Pulse',
  'waves',
  {
    rings: R('Импульсы', 5, 1, 14, 1),
    thick: R('Толщина', 4, 1, 14, 0.5),
    ripple: R('Рябь', 0.8, 0, 2),
    bassGain: R('Реакция низа', 1.4, 0, 3),
    decay: R('Затухание', 0.6, 0.1, 2),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const st = g.st;
    if (!st.r) st.r = [];
    if (A.beat > 0.8 && (!st.last || g.t - st.last > 0.12)) {
      st.last = g.t;
      st.r.push({ r: 0, v: A.bass });
    }
    if (st.r.length > 40) st.r.splice(0, st.r.length - 40);
    g.add();
    for (let i = st.r.length - 1; i >= 0; i--) {
      const o = st.r[i];
      o.r += (g.dt * (140 + o.v * 340)) / p.decay;
      const a = 1 - o.r / (Math.max(w, h) * 0.75);
      if (a <= 0) {
        st.r.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(w / 2, cy, o.r, 0, TAU);
      ctx.strokeStyle = g.col(1 - a);
      ctx.lineWidth = p.thick * a;
      g.alpha(a * 0.7);
      ctx.stroke();
    }
    const R2 = Math.max(1, Math.round(p.rings));
    for (let l = 0; l < R2; l++) {
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const y =
          cy +
          Math.sin(x * 12 * p.ripple + g.t * 3 + l) * A.bass * h * 0.2 * p.bassGain * g.S.amp +
          A.w(x) * h * 0.12;
        i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
      }
      ctx.strokeStyle = g.col(l / R2);
      ctx.lineWidth = p.thick * (1 - (l / R2) * 0.6);
      g.alpha(0.3 + A.level * 0.5);
      ctx.stroke();
    }
    g.norm();
  },
);
