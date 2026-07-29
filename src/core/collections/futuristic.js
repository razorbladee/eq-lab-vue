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
  'matrix',
  'Data Rain',
  'futuristic',
  {
    cols: R('Колонок', 40, 12, 80, 1),
    fall: R('Скорость', 1, 0.2, 3),
    tail: R('Хвост', 7, 2, 16, 1),
    glyph: R('Кегль', 13, 8, 26, 1),
    bright: R('Яркость', 0.8, 0.2, 1.5),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(12, Math.round(p.cols * g.q)),
      cw = w / n,
      tail = Math.round(p.tail);
    const st = g.st;
    if (!st.y || st.y.length !== n) {
      st.y = new Float32Array(n);
      const r = mulberry(4242);
      for (let i = 0; i < n; i++) st.y[i] = r() * h;
    }
    ctx.font = '700 ' + Math.round(p.glyph) + 'px "Space Mono",monospace';
    ctx.textBaseline = 'middle';
    const G = '01<>{}[]/\\|=+*#$%&@';
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x);
      st.y[i] += g.dt * (60 + v * 640) * p.fall;
      if (st.y[i] > h + tail * p.glyph) st.y[i] = -20;
      for (let k = 0; k < tail; k++) {
        const y = st.y[i] - k * p.glyph * 1.05;
        if (y < -20 || y > h + 20) continue;
        g.alpha(clamp((1 - k / tail) * (0.18 + v) * p.bright, 0, 1));
        ctx.fillStyle = g.col(k === 0 ? 1 : x);
        ctx.fillText(G[(i * 7 + k * 3 + ((g.t * 8) | 0)) % G.length], i * cw + cw * 0.2, y);
      }
    }
    g.alpha(1);
  },
);

def(
  'hud',
  'Cyber HUD',
  'futuristic',
  {
    ring: R('Радиус', 0.28, 0.1, 0.45),
    ticks: R('Делений', 48, 12, 120, 1),
    corners: T('Уголки', true),
    readout: T('Телеметрия', true),
    sweep: R('Развёртка', 0.6, 0, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const R0 = Math.min(w, h) * p.ring,
      n = Math.round(p.ticks * g.q);
    if (p.corners) {
      g.alpha(0.5);
      ctx.strokeStyle = g.col(0.2);
      ctx.lineWidth = 1.5;
      const m = Math.min(w, h) * 0.06,
        L = Math.min(w, h) * 0.12;
      [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ].forEach(([x, y, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(x + L * sx, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + L * sy);
        ctx.stroke();
      });
    }
    g.alpha(0.3);
    ctx.strokeStyle = g.col(0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R0 * 1.28, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2,
        v = A.b(i / n);
      const r0 = R0 * 1.06,
        r1 = r0 + v * R0 * 1.1 * g.S.amp;
      g.alpha(0.25 + v * 0.75);
      ctx.strokeStyle = g.col(i / n);
      ctx.lineWidth = Math.max(1, ((TAU * R0) / n) * 0.6);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    const sa = g.t * p.sweep * 2;
    g.alpha(0.7);
    ctx.strokeStyle = g.col(1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R0 * 0.82, sa, sa + 1.2);
    ctx.stroke();
    g.alpha(0.9);
    ctx.fillStyle = g.col(0.9);
    ctx.beginPath();
    ctx.arc(cx, cy, R0 * 0.3 * (1 + A.bass * 0.5), 0, TAU);
    ctx.fill();
    if (p.readout) {
      ctx.font = '700 11px "Space Mono",monospace';
      ctx.textBaseline = 'alphabetic';
      g.alpha(0.75);
      ctx.fillStyle = g.col(0.5);
      const m = Math.min(w, h) * 0.06 + 6;
      ctx.fillText(
        'SIGNAL ' + ((A.level * 100) | 0).toString().padStart(3, '0') + '%',
        m + 14,
        m + 22,
      );
      ctx.fillText(
        'BASS ' +
          ((A.bass * 100) | 0) +
          '  MID ' +
          ((A.mid * 100) | 0) +
          '  HI ' +
          ((A.treble * 100) | 0),
        m + 14,
        h - m - 8,
      );
      ctx.fillText('BPM ' + (A.bpm || '--'), w - m - 74, h - m - 8);
    }
    g.alpha(1);
  },
);

def(
  'radar',
  'Audio Radar',
  'futuristic',
  {
    sweep: R('Развёртка', 1, 0.2, 3),
    rings: R('Кольца', 4, 2, 8, 1),
    blips: R('Отметок', 72, 16, 200, 1),
    fade: R('Затухание', 1.4, 0.3, 4),
    grid: T('Сетка', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const R0 = Math.min(w, h) * 0.42,
      n = Math.max(16, Math.round(p.blips * g.q));
    const a0 = (g.t * p.sweep * 1.6) % TAU;
    if (p.grid) {
      g.alpha(0.22);
      ctx.strokeStyle = g.col(0.3);
      ctx.lineWidth = 1;
      for (let i = 1; i <= p.rings; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R0 * i) / p.rings, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0);
        ctx.stroke();
      }
    }
    g.add();
    const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a0) * R0, cy + Math.sin(a0) * R0);
    grd.addColorStop(0, Palette.rgba(0.9, 0.5));
    grd.addColorStop(1, Palette.rgba(0.9, 0));
    ctx.strokeStyle = grd;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * R0, cy + Math.sin(a0) * R0);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        a = f * TAU,
        v = A.b(f),
        d = (a0 - a + TAU) % TAU;
      const age = clamp(1 - (d / TAU) * p.fade, 0, 1);
      if (age <= 0.02) continue;
      const r = R0 * clamp(v * 1.15, 0.05, 1);
      g.alpha(age * (0.3 + v));
      glowDot(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + v * 9, f);
    }
    g.norm();
  },
);

def(
  'synthwave',
  'Synthwave Grid',
  'futuristic',
  {
    horizon: R('Горизонт', 0.55, 0.3, 0.8),
    speed: R('Скорость', 1, 0.2, 3),
    sun: R('Солнце', 0.18, 0, 0.4),
    peaks: R('Пики', 0.5, 0, 1),
    lines: R('Линий', 16, 6, 40, 1),
  },
  (g) => {
    const { ctx, w, h, cx, p, A } = g;
    const hy = h * p.horizon;
    if (p.sun > 0.01) {
      const R0 = Math.min(w, h) * p.sun * (1 + A.bass * 0.18);
      g.add();
      for (let i = 6; i > 0; i--) {
        g.alpha(0.06);
        ctx.fillStyle = g.col(0.9);
        ctx.beginPath();
        ctx.arc(cx, hy, R0 * (1 + i * 0.18), 0, TAU);
        ctx.fill();
      }
      g.norm();
      g.alpha(0.9);
      ctx.fillStyle = g.col(0.85);
      ctx.beginPath();
      ctx.arc(cx, hy, R0, 0, TAU);
      ctx.fill();
      g.alpha(1);
      ctx.fillStyle = g.bg;
      for (let i = 0; i < 7; i++)
        ctx.fillRect(cx - R0, hy - R0 * 0.1 + i * R0 * 0.26, R0 * 2, R0 * 0.09 + i * 0.5);
    }
    g.alpha(0.5);
    ctx.strokeStyle = g.col(0.35);
    ctx.lineWidth = 1.2;
    const L = Math.round(p.lines);
    for (let i = 0; i < L; i++) {
      const f = (i / L + ((g.t * p.speed * 0.18) % (1 / L))) % 1;
      const y = hy + Math.pow(f, 2.4) * (h - hy);
      g.alpha(0.12 + f * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      g.alpha(0.28);
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.02, hy);
      ctx.lineTo(cx + i * w * 0.5, h);
      ctx.stroke();
    }
    if (p.peaks > 0.01) {
      ctx.beginPath();
      ctx.moveTo(0, hy);
      for (let i = 0; i <= 64; i++) {
        const x = i / 64;
        ctx.lineTo(x * w, hy - A.b(x) * h * 0.22 * p.peaks * g.S.amp);
      }
      ctx.lineTo(w, hy);
      g.alpha(0.85);
      ctx.strokeStyle = g.col(1);
      ctx.lineWidth = 2;
      ctx.stroke();
      g.alpha(0.16);
      ctx.fillStyle = g.col(0.6);
      ctx.fill();
    }
    g.alpha(1);
  },
);

def(
  'hologram',
  'Hologram Scan',
  'futuristic',
  {
    gap: R('Шаг линий', 12, 4, 40, 1),
    jitter: R('Джиттер', 0.35, 0, 1),
    flicker: R('Мерцание', 0.3, 0, 1),
    edge: T('Рамка', true),
    bend: R('Изгиб', 0.5, 0, 1.5),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const step = Math.max(4, Math.round(p.gap / g.q));
    const fl = 1 - p.flicker * 0.5 * (0.5 + 0.5 * Math.sin(g.t * 37));
    g.add();
    for (let y = 0; y < h; y += step) {
      const f = y / h,
        v = A.b(1 - f);
      const bend = Math.sin(f * 6 + g.t * 2) * p.bend * 26 * v;
      g.alpha((0.08 + v * 0.8) * fl);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let i = 1; i <= 8; i++) {
        const x = i / 8;
        ctx.lineTo(
          x * w,
          y +
            Math.sin(x * 5 + g.t * 3 + f * 8) * bend +
            (mulberry((y | 0) * 31 + i)() - 0.5) * p.jitter * 10 * v,
        );
      }
      ctx.stroke();
    }
    g.norm();
    if (p.edge) {
      g.alpha(0.5);
      ctx.strokeStyle = g.col(0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.05, h * 0.06, w * 0.9, h * 0.88);
      const sy = (g.t * 120) % h;
      g.alpha(0.4);
      ctx.fillStyle = g.col(1);
      ctx.fillRect(0, sy, w, 2);
    }
    g.alpha(1);
  },
);

def(
  'circuit',
  'Circuit Board',
  'futuristic',
  {
    traces: R('Дорожек', 30, 8, 80, 1),
    pulse: R('Импульсы', 1, 0.2, 3),
    nodes: T('Узлы', true),
    branch: R('Ветвление', 0.5, 0, 1),
    thick: R('Толщина', 1.4, 0.5, 4, 0.1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(8, Math.round(p.traces * g.q));
    const rnd = mulberry(2024);
    ctx.lineCap = 'square';
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x),
        r1 = rnd(),
        r2 = rnd();
      const bx = x * w,
        len = v * h * 0.34 * g.S.amp,
        dir = r1 > 0.5 ? 1 : -1;
      g.alpha(0.15 + v * 0.8);
      ctx.strokeStyle = g.col(x);
      ctx.lineWidth = p.thick;
      ctx.beginPath();
      ctx.moveTo(bx, cy);
      ctx.lineTo(bx, cy - len * dir);
      ctx.lineTo(bx + (((r2 - 0.5) * w) / n) * 4 * p.branch, cy - len * dir);
      ctx.stroke();
      if (p.nodes) {
        const t = (g.t * p.pulse + r1 * 3) % 1;
        g.alpha(clamp(1 - t, 0, 1));
        ctx.fillStyle = g.col(1 - x);
        const py = cy - len * dir * t;
        ctx.fillRect(bx - 2, py - 2, 4, 4);
        g.alpha(0.7);
        ctx.fillRect(bx - 1.5, cy - len * dir - 1.5, 3, 3);
      }
    }
    g.alpha(1);
  },
);

def(
  'lightning',
  'Audio Lightning',
  'futuristic',
  {
    bolts: R('Разрядов', 3, 1, 12, 1),
    branch: R('Ветви', 0.5, 0, 1),
    jag: R('Излом', 0.5, 0.05, 1),
    thresh: R('Порог', 0.35, 0, 1),
    thick: R('Толщина', 2, 0.5, 6, 0.1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const active = A.beat > (1 - p.thresh) * 0.6 || A.bass > 1 - p.thresh * 0.7;
    const st = g.st;
    if (!st.seed) st.seed = 1;
    if (active && g.t - (st.last || 0) > 0.06) {
      st.last = g.t;
      st.seed = (st.seed * 16807) % 2147483647;
    }
    const age = clamp(1 - (g.t - (st.last || -9)) * 5, 0, 1);
    if (age <= 0) {
      g.alpha(1);
      return;
    }
    g.add();
    const B = Math.max(1, Math.round(p.bolts));
    for (let b = 0; b < B; b++) {
      const rnd = mulberry(st.seed + b * 977);
      ctx.beginPath();
      let x = 0,
        y = cy + (rnd() - 0.5) * h * 0.3;
      ctx.moveTo(x, y);
      const steps = 26;
      for (let i = 1; i <= steps; i++) {
        x = (i / steps) * w;
        y += (rnd() - 0.5) * h * 0.3 * p.jag * (0.4 + A.level);
        y = clamp(y, h * 0.08, h * 0.92);
        ctx.lineTo(x, y);
        if (rnd() < p.branch * 0.22) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rnd() - 0.5) * w * 0.12, y + (rnd() - 0.5) * h * 0.3);
          ctx.moveTo(x, y);
        }
      }
      g.alpha(age * 0.3);
      ctx.strokeStyle = g.col(0.3);
      ctx.lineWidth = p.thick * 5;
      ctx.stroke();
      g.alpha(age);
      ctx.strokeStyle = g.col(1);
      ctx.lineWidth = p.thick;
      ctx.stroke();
    }
    g.norm();
  },
);

def(
  'plasma',
  'Plasma Storm',
  'futuristic',
  {
    blobs: R('Сгустков', 9, 3, 26, 1),
    turb: R('Турбулентность', 0.8, 0, 2),
    contrast: R('Контраст', 1, 0.3, 2),
    cycle: R('Цикл', 0.5, 0, 2),
    size: R('Размер', 1, 0.3, 2.5),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(3, Math.round(p.blobs * g.q));
    g.add();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f);
      const a = f * TAU + g.t * p.turb * (0.4 + f);
      const r = Math.min(w, h) * (0.1 + f * 0.34) * (1 + v * 0.5);
      const x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a * 1.3) * r * 0.7;
      const s = Math.min(w, h) * 0.3 * p.size * (0.25 + v * p.contrast);
      g.alpha(clamp(0.1 + v * 0.5, 0, 0.8));
      glowDot(g, x, y, s, (f + g.t * p.cycle * 0.2) % 1);
    }
    g.norm();
  },
);
