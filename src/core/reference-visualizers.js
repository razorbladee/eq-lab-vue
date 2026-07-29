import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const add = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'reference-new', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};
const path = (g, pts, color, width, alpha = 0.8) => {
  const { ctx } = g;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  g.alpha(alpha * 0.12);
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 6;
  ctx.stroke();
  g.alpha(alpha);
  ctx.lineWidth = width;
  ctx.stroke();
};
const grid = (g, step = 32) => {
  const { ctx, w, h } = g;
  g.alpha(0.055);
  ctx.strokeStyle = g.col(0.48);
  ctx.lineWidth = 0.6;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.12);
    ctx.lineTo(x, h * 0.86);
    ctx.stroke();
  }
  for (let y = h * 0.12; y < h * 0.86; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
};
const corners = (g) => {
  const { ctx, w, h } = g,
    m = Math.min(w, h) * 0.07,
    l = Math.min(w, h) * 0.075;
  g.alpha(0.65);
  ctx.strokeStyle = g.col(0.12);
  ctx.lineWidth = 1;
  [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + sx * l, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * l);
    ctx.stroke();
  });
};
const dust = (g, count, seed = 1, spread = 0.8) => {
  const { ctx, w, h } = g;
  for (let i = 0; i < count * g.q; i++) {
    const f = (i * 0.61803398875 + seed * 0.071) % 1,
      x = (f * w + Math.sin(g.t * 0.4 + i * 2.7) * w * 0.05 * spread) % w,
      y = h * (0.18 + ((i * 0.371 + seed) % 0.57)) + Math.cos(g.t * 0.7 + i) * 9;
    const s = 0.8 + (i % 4) * 0.55;
    g.alpha(0.06 + g.A.b(f) * 0.34);
    ctx.fillStyle = g.col(f);
    ctx.fillRect(x, y, s, s);
  }
};
const label = (g, text, x, y, color = 0.5) => {
  g.ctx.font = '700 10px Space Mono, monospace';
  g.alpha(0.75);
  g.ctx.fillStyle = g.col(color);
  g.ctx.fillText(text, x, y);
};

add(
  'refPrismSpectrum',
  'REFERENCE // Prism Spectrum',
  {
    points: R('Вершин', 54, 16, 120, 1),
    height: R('Высота', 0.9, 0.2, 1.8),
    layers: R('Слоёв отражения', 5, 1, 10, 1),
    dust: T('Парящие треугольники', true),
    grid: T('Сетка', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(16, Math.round(p.points * g.q)),
      base = h * 0.62,
      step = w / n,
      pts = [];
    if (p.grid) grid(g, 42);
    corners(g);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1),
        v = A.b(f),
        y = base - v * h * 0.37 * p.height * (0.82 + 0.18 * Math.sin(g.t + i));
      pts.push([i * step, y]);
    }
    for (let i = 0; i < n - 1; i++) {
      const f = i / (n - 1),
        a = pts[i],
        b = pts[i + 1];
      ctx.beginPath();
      ctx.moveTo(a[0], base);
      ctx.lineTo((a[0] + b[0]) / 2, a[1]);
      ctx.lineTo(b[0], base);
      ctx.closePath();
      g.alpha(0.05 + A.b(f) * 0.28);
      ctx.fillStyle = g.col(f);
      ctx.fill();
      g.alpha(0.62);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
    for (let k = 1; k <= p.layers; k++) {
      const scale = 1 + k * 0.018;
      path(
        g,
        pts.map(([x, y]) => [w / 2 + (x - w / 2) * scale, base + (y - base) * scale]),
        g.col(k / p.layers),
        1.2,
        0.22 / k,
      );
    }
    path(g, pts, g.col(0.45), 1.8, 0.95);
    const ref = pts.map(([x, y]) => [x, base + (base - y) * 0.82]);
    path(g, ref, g.col(0.75), 0.7, 0.22);
    if (p.dust) dust(g, 90, 2);
    g.norm();
  },
);

add(
  'refRibbonLabels',
  'REFERENCE // Bass Treble Ribbon',
  {
    layers: R('Слоёв', 12, 3, 22, 1),
    amplitude: R('Амплитуда', 1, 0.2, 2),
    particles: R('Частиц', 280, 40, 700, 10),
    labelBars: R('Индикаторов зон', 18, 6, 28, 1),
  },
  (g) => {
    const { ctx, w, h, A, p } = g;
    grid(g, 48);
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i <= 240; i++) {
        const x = i / 240,
          bass = A.b(x * 0.58),
          treble = A.b(0.42 + x * 0.58),
          envelope = 0.05 + (bass + treble) * 0.13,
          y =
            h * 0.46 +
            Math.sin(x * (8 + f * 2) + g.t * (1.2 + f) + l * 0.7) * h * envelope * p.amplitude +
            Math.sin(x * 31 + g.t * 2.4 + l) * h * 0.018 * A.b(x) +
            (f - 0.5) * h * 0.18;
        pts.push([x * w, y]);
      }
      path(g, pts, g.col(f), 1.05 + (1 - f) * 1.6, 0.16 + (1 - f) * 0.68);
    }
    dust(g, p.particles, 4, 1.4);
    label(g, 'BASS', w * 0.06, h * 0.82, 0.04);
    label(g, 'TREBLE', w * 0.84, h * 0.82, 0.94);
    for (let i = 0; i < p.labelBars; i++) {
      const v = A.b(i / p.labelBars);
      g.alpha(0.2 + v * 0.55);
      ctx.fillStyle = g.col(i / p.labelBars);
      ctx.fillRect(w * 0.06 + i * 6, h * 0.845, 3, 2 + v * 3);
      ctx.fillRect(w * 0.84 + i * 6, h * 0.845, 3, 2 + v * 3);
    }
    g.norm();
  },
);

add(
  'refMultiWave',
  'REFERENCE // Multiwave Field',
  {
    layers: R('Волн', 11, 3, 24, 1),
    amplitude: R('Амплитуда', 1, 0.2, 2),
    particles: R('Частиц', 320, 40, 800, 10),
    phase: R('Фаза', 0.8, -2, 2),
    interference: R('Интерференция', 0.7, 0, 2),
  },
  (g) => {
    const { w, h, A, p } = g;
    grid(g, 38);
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i <= 260; i++) {
        const x = i / 260,
          v = A.b((x + f * 0.13) % 1),
          y =
            h * 0.5 +
            Math.sin(x * (9 + f * 3) + g.t * p.phase + f * 5) *
              h *
              (0.035 + v * 0.17) *
              p.amplitude +
            Math.sin(x * 25 - g.t * 1.7 + f * 8) * h * 0.025 * p.interference +
            (f - 0.5) * h * 0.16;
        pts.push([x * w, y]);
      }
      path(g, pts, g.col(f), 1 + (1 - f) * 1.4, 0.16 + (1 - f) * 0.62);
    }
    dust(g, p.particles, 7, 1.8);
    g.norm();
  },
);

add(
  'refDotPeakfield',
  'REFERENCE // Dot Peak Field',
  {
    points: R('Точек', 360, 100, 900, 10),
    peaks: R('Пиков', 6, 2, 14, 1),
    amplitude: R('Амплитуда', 1, 0.2, 2),
    trails: R('Слоёв точек', 5, 1, 12, 1),
    markers: T('Пиковые маркеры', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(80, Math.round(p.points * g.q));
    grid(g, 46);
    for (let t = p.trails; t >= 0; t--) {
      const shift = t * 0.014,
        pts = [];
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1),
          v = A.b(x),
          peak = Math.pow(Math.max(0, Math.sin(x * p.peaks * Math.PI + g.t * 0.55 - shift * 7)), 8),
          y = h * 0.56 - (v * 0.2 + peak * 0.55) * h * p.amplitude + shift * h * 0.18;
        pts.push([x * w, y]);
        g.alpha((0.08 + v * 0.4) / (t + 1));
        ctx.fillStyle = g.col(x);
        ctx.fillRect(x * w - 1.6, y - 1.6, 3.2, 3.2);
      }
      path(g, pts, g.col(0.48), 0.5, 0.12 / (t + 1));
    }
    if (p.markers) {
      for (let i = 0; i < p.peaks; i++) {
        const x = (i + 0.5) / p.peaks,
          y = h * 0.56 - A.b(x) * h * 0.2 * p.amplitude - h * 0.45;
        g.alpha(0.7);
        ctx.fillStyle = g.col(x);
        ctx.beginPath();
        ctx.arc(x * w, y, 2 + A.b(x) * 3, 0, TAU);
        ctx.fill();
      }
    }
    g.norm();
  },
);

add(
  'refWaveformHud',
  'REFERENCE // Waveform HUD',
  {
    points: R('Сэмплов', 320, 80, 720, 10),
    height: R('Высота', 0.95, 0.2, 1.8),
    bloom: R('Блум', 1, 0, 2),
    grid: T('Сетка', true),
    telemetry: T('Телеметрия', true),
    scan: R('Сканирующая линия', 0.8, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(80, Math.round(p.points * g.q)),
      y0 = h * 0.55,
      pts = [];
    corners(g);
    if (p.grid) grid(g, 36);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1),
        v = A.b(x),
        carrier = Math.sin(x * 34 + g.t * 3.2) * v * h * 0.025,
        y = y0 - v * h * 0.37 * p.height + carrier;
      pts.push([x * w, y]);
    }
    for (let k = 4; k >= 0; k--)
      path(
        g,
        pts.map(([x, y]) => [x, y + Math.sin(x * 0.03 + k) * k * 2]),
        g.col(0.2 + k * 0.16),
        1 + (4 - k) * 0.55,
        k === 0 ? 0.9 : 0.08,
      );
    if (p.bloom) {
      g.add();
      ctx.filter = 'blur(9px)';
      path(g, pts, g.col(0.55), 6, p.bloom * 0.08);
      ctx.filter = 'none';
      g.norm();
    }
    if (p.scan) {
      const x = ((g.t * p.scan * 0.16) % 1) * w;
      g.alpha(0.65);
      ctx.fillStyle = g.col(0.75);
      ctx.fillRect(x, h * 0.12, 1, h * 0.72);
    }
    if (p.telemetry) {
      label(g, 'SIGNAL / LIVE', w * 0.08, h * 0.15, 0.16);
      label(g, 'FFT 4096', w * 0.78, h * 0.15, 0.78);
      label(g, 'BPM ' + (A.bpm || '--'), w * 0.08, h * 0.88, 0.16);
      label(g, 'GAIN ' + Math.round(A.level * 100) + '%', w * 0.78, h * 0.88, 0.78);
    }
    g.norm();
  },
);
