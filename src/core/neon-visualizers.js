import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const register = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'neon', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};
const line = (g, pts, color, width = 1, alpha = 0.8) => {
  const { ctx } = g;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  g.alpha(alpha * 0.16);
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 5;
  ctx.stroke();
  g.alpha(alpha);
  ctx.lineWidth = width;
  ctx.stroke();
};

register(
  'neonDottedCurve',
  'Neon Dotted Curve',
  {
    points: R('Точек', 180, 40, 420, 1),
    waves: R('Волн', 3, 1, 6, 1),
    spread: R('Разлёт', 0.42, 0.05, 1),
    dot: R('Размер точки', 1.7, 0.5, 5),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(40, Math.round(p.points * g.q));
    for (let l = 0; l < p.waves; l++) {
      const f = l / Math.max(1, p.waves - 1),
        pts = [];
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1),
          v = A.b(x),
          y =
            h * 0.5 +
            Math.sin(x * 9 + g.t * (1.2 + f) + l) * (h * 0.11 + v * h * 0.22) +
            (f - 0.5) * h * p.spread;
        pts.push([x * w, y]);
        g.alpha(0.22 + v * 0.68);
        ctx.fillStyle = g.col(f);
        ctx.fillRect(x * w - p.dot / 2, y - p.dot / 2, p.dot, p.dot);
      }
      line(g, pts, g.col(f), 0.5, 0.18);
    }
    g.norm();
  },
);

register(
  'neonLollipop',
  'Neon Lollipop Spectrum',
  {
    count: R('Палочек', 72, 16, 180, 1),
    height: R('Высота', 0.7, 0.2, 1.6),
    dot: R('Шарик', 2.4, 0.5, 6),
    mirror: T('Зеркало', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(16, Math.round(p.count * g.q)),
      base = h * 0.57,
      step = w / n;
    g.add();
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1),
        v = Math.pow(A.b(x), 0.72),
        len = v * h * 0.35 * p.height,
        xx = i * step + step / 2;
      g.alpha(0.18 + v * 0.7);
      ctx.strokeStyle = g.col(x);
      ctx.lineWidth = Math.max(0.8, step * 0.14);
      ctx.beginPath();
      ctx.moveTo(xx, base);
      ctx.lineTo(xx, base - len);
      ctx.stroke();
      g.alpha(0.7 + v * 0.3);
      ctx.fillStyle = g.col(x);
      ctx.beginPath();
      ctx.arc(xx, base - len, p.dot * (0.7 + v * 0.5), 0, TAU);
      ctx.fill();
      if (p.mirror) {
        g.alpha(0.16 + v * 0.35);
        ctx.beginPath();
        ctx.moveTo(xx, base);
        ctx.lineTo(xx, base + len * 0.55);
        ctx.stroke();
      }
    }
    g.norm();
  },
);

register(
  'neonSpectrumRing',
  'Neon Spectrum Ring',
  {
    bars: R('Делений', 96, 24, 220, 1),
    radius: R('Радиус', 0.28, 0.12, 0.44),
    depth: R('Глубина', 0.7, 0.1, 1.5),
    ticks: T('Тики', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      n = Math.max(24, Math.round(p.bars * g.q)),
      r0 = Math.min(w, h) * p.radius;
    g.add();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        a = f * TAU - Math.PI / 2,
        v = A.b(f),
        r1 = r0 + v * Math.min(w, h) * 0.24 * p.depth * g.S.amp;
      g.alpha(0.18 + v * 0.8);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = Math.max(1, (Math.min(w, h) / n) * 1.4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
      if (p.ticks && i % 4 === 0) {
        g.alpha(0.25);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r0 - 9), cy + Math.sin(a) * (r0 - 9));
        ctx.lineTo(cx + Math.cos(a) * (r0 - 3), cy + Math.sin(a) * (r0 - 3));
        ctx.stroke();
      }
    }
    g.alpha(0.35);
    ctx.strokeStyle = g.col(0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r0 * 0.78, 0, TAU);
    ctx.stroke();
    g.norm();
  },
);

register(
  'neonPulseLine',
  'Neon Pulse Line',
  {
    points: R('Точек', 240, 60, 600, 10),
    spikes: R('Шипы', 1.4, 0.2, 3),
    mirror: T('Отражение', true),
    bloom: R('Блум', 0.8, 0, 2),
  },
  (g) => {
    const { w, h, A, p } = g,
      n = Math.max(40, Math.round(p.points * g.q)),
      pts = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1),
        v = A.b(x),
        y = h * 0.54 - v * h * 0.35 * p.spikes + Math.sin(x * 23 + g.t * 2) * v * 8;
      pts.push([x * w, y]);
    }
    line(g, pts, g.col(0.42), 1.4, 0.9);
    if (p.mirror)
      line(
        g,
        pts.map(([x, y]) => [x, h * 1.08 - y]),
        g.col(0.72),
        0.7,
        0.22,
      );
    g.norm();
  },
);

register(
  'neonMountain',
  'Neon Mountain Peaks',
  {
    points: R('Вершин', 52, 12, 120, 1),
    height: R('Высота', 0.75, 0.2, 1.4),
    fill: R('Заливка', 0.25, 0, 0.8),
    reflection: T('Отражение', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(12, Math.round(p.points * g.q)),
      pts = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1),
        v = A.b(x);
      pts.push([x * w, h * 0.62 - v * h * 0.34 * p.height]);
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(0, h * 0.62);
    ctx.closePath();
    g.alpha(p.fill * 0.22);
    ctx.fillStyle = g.col(0.5);
    ctx.fill();
    line(g, pts, g.col(0.42), 1.5, 0.9);
    if (p.reflection)
      line(
        g,
        pts.map(([x, y]) => [x, h * 1.24 - y]),
        g.col(0.72),
        0.8,
        0.18,
      );
    g.norm();
  },
);

register(
  'neonWaveRibbon',
  'Neon Wave Ribbon',
  {
    layers: R('Лент', 5, 2, 14, 1),
    amplitude: R('Амплитуда', 0.8, 0.1, 1.8),
    twist: R('Скрутка', 0.7, -2, 2),
    particles: T('Искры', true),
  },
  (g) => {
    const { w, h, A, p } = g;
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i <= 180; i++) {
        const x = i / 180,
          v = A.b((x + f * 0.1) % 1),
          y =
            h * 0.5 +
            Math.sin(x * 10 + g.t * (1 + p.twist) + f * 4) * h * (0.07 + v * 0.18) * p.amplitude +
            (f - 0.5) * h * 0.16;
        pts.push([x * w, y]);
      }
      line(g, pts, g.col(f), 1 + (1 - f) * 0.8, 0.24 + (1 - f) * 0.55);
    }
    g.norm();
  },
);

register(
  'neonRadarSweep',
  'Neon Radar Sweep',
  {
    rings: R('Кольца', 5, 2, 10, 1),
    blips: R('Меток', 80, 20, 180, 1),
    sweep: R('Скорость сканера', 1, 0.2, 3),
    labels: T('Метки частот', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      r = Math.min(w, h) * 0.39,
      a0 = g.t * p.sweep * 1.6;
    for (let i = 1; i <= p.rings; i++) {
      g.alpha(0.08 + (i / p.rings) * 0.13);
      ctx.strokeStyle = g.col(i / p.rings);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / p.rings, 0, TAU);
      ctx.stroke();
    }
    g.alpha(0.65);
    ctx.strokeStyle = g.col(0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.stroke();
    for (let i = 0; i < p.blips * g.q; i++) {
      const f = (i * 0.618) % 1,
        a = f * TAU,
        d = (a0 - a + TAU) % TAU,
        age = clamp(1 - d / (TAU * 0.36), 0, 1),
        v = A.b(f);
      if (age <= 0) continue;
      g.alpha(age * (0.2 + v));
      ctx.fillStyle = g.col(f);
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * r * (0.25 + v * 0.75),
        cy + Math.sin(a) * r * (0.25 + v * 0.75),
        1.2 + v * 4,
        0,
        TAU,
      );
      ctx.fill();
    }
    g.norm();
  },
);

register(
  'neonTimeline',
  'Neon Track Timeline',
  {
    points: R('Точек', 180, 60, 420, 1),
    progress: R('Прогресс', 0.62, 0, 1),
    height: R('Высота волны', 0.7, 0.2, 1.5),
    timecode: T('Таймкод', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(40, Math.round(p.points * g.q)),
      y0 = h * 0.54,
      pts = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      pts.push([x * w, y0 - A.b(x) * h * 0.28 * p.height]);
    }
    line(g, pts, g.col(0.45), 1.25, 0.8);
    g.alpha(0.35);
    ctx.strokeStyle = g.col(0.5);
    ctx.beginPath();
    ctx.moveTo(0, y0 + 4);
    ctx.lineTo(w, y0 + 4);
    ctx.stroke();
    g.alpha(0.9);
    ctx.fillStyle = g.col(0.2);
    ctx.fillRect(w * p.progress, y0 - h * 0.34, 1, h * 0.48);
    if (p.timecode) {
      ctx.font = '10px Space Mono, monospace';
      g.alpha(0.8);
      ctx.fillStyle = g.col(0.1);
      ctx.fillText('00:37', 0, h * 0.78);
      ctx.fillStyle = g.col(0.9);
      ctx.fillText('03:42', w - 34, h * 0.78);
    }
    g.norm();
  },
);

register(
  'neonBandMeter',
  'Neon Band Meter',
  {
    bands: R('Полос', 32, 8, 64, 1),
    segments: R('Сегментов', 14, 4, 28, 1),
    gap: R('Зазор', 0.18, 0.02, 0.6),
    reflection: T('Отражение', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(8, Math.round(p.bands * g.q)),
      seg = Math.round(p.segments),
      bw = (w / n) * (1 - p.gap),
      base = h * 0.78;
    for (let i = 0; i < n; i++) {
      const f = i / n,
        lit = Math.round(A.b(f) * seg),
        x = (i * w) / n + (w / n - bw) / 2;
      for (let s = 0; s < seg; s++) {
        const on = s < lit,
          y = base - s * h * 0.035;
        g.alpha(on ? 0.25 + (s / seg) * 0.7 : 0.035);
        ctx.fillStyle = g.col(s / seg);
        ctx.fillRect(x, y, bw, Math.max(1, h * 0.022));
        if (p.reflection && on) {
          g.alpha(0.06);
          ctx.fillRect(x, base + (s + 1) * h * 0.018, bw, h * 0.012);
        }
      }
    }
    g.norm();
  },
);

register(
  'neonTrianglePeaks',
  'Neon Triangle Peaks',
  {
    points: R('Пиков', 42, 12, 100, 1),
    height: R('Высота', 0.8, 0.2, 1.5),
    wire: T('Каркас', true),
    dust: T('Пыль', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(12, Math.round(p.points * g.q)),
      base = h * 0.66,
      step = w / n;
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f),
        x = i * step,
        top = base - v * h * 0.38 * p.height;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + step * 0.5, top);
      ctx.lineTo(x + step, base);
      ctx.closePath();
      g.alpha(0.12 + v * 0.5);
      ctx.fillStyle = g.col(f);
      ctx.fill();
      if (p.wire) {
        g.alpha(0.7);
        ctx.strokeStyle = g.col(1 - f);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      if (p.dust && v > 0.2) {
        g.alpha(v * 0.7);
        ctx.fillStyle = g.col(f);
        ctx.fillRect(x + step * 0.5 - 1, top - 2, 2, 2);
      }
    }
    g.norm();
  },
);

register(
  'neonFrequencyScale',
  'Neon Frequency Scale',
  {
    markers: R('Маркеров', 8, 4, 16, 1),
    height: R('Высота', 0.5, 0.2, 1.2),
    labels: T('Подписи', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      base = h * 0.64,
      labels = ['60', '120', '250', '500', '1k', '2k', '4k', '8k', '16k'],
      n = Math.round(p.markers);
    g.alpha(0.25);
    ctx.strokeStyle = g.col(0.5);
    ctx.beginPath();
    ctx.moveTo(w * 0.06, base);
    ctx.lineTo(w * 0.94, base);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const f = i / Math.max(1, n - 1),
        x = w * (0.06 + f * 0.88),
        v = A.b(f),
        len = h * (0.04 + v * p.height * 0.3);
      g.alpha(0.35 + v * 0.6);
      ctx.strokeStyle = g.col(f);
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - len);
      ctx.stroke();
      ctx.fillStyle = g.col(f);
      ctx.beginPath();
      ctx.arc(x, base - len, 2 + v * 2, 0, TAU);
      ctx.fill();
      if (p.labels) {
        ctx.font = '9px Space Mono, monospace';
        g.alpha(0.7);
        ctx.fillText(labels[Math.round(f * (labels.length - 1))] + ' Hz', x - 9, base + 18);
      }
    }
    g.norm();
  },
);

register(
  'neonFramedSpectrum',
  'Neon Framed Spectrum',
  {
    count: R('Полос', 96, 24, 180, 1),
    frame: T('Рамка', true),
    center: T('Центральный импульс', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(24, Math.round(p.count * g.q)),
      base = h * 0.62,
      step = w / n;
    if (p.frame) {
      g.alpha(0.55);
      ctx.strokeStyle = g.col(0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.04, h * 0.1, w * 0.92, h * 0.72);
    }
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f),
        bh = v * h * 0.25,
        x = i * step;
      g.alpha(0.15 + v * 0.8);
      ctx.fillStyle = g.col(f);
      ctx.fillRect(x, base - bh, Math.max(1, step * 0.55), bh);
    }
    if (p.center) {
      const v = A.b(0.5),
        r = 18 + v * 40;
      g.alpha(0.25 + v * 0.4);
      ctx.fillStyle = g.col(0.55);
      ctx.beginPath();
      ctx.arc(w / 2, base, r, 0, TAU);
      ctx.fill();
    }
    g.norm();
  },
);
