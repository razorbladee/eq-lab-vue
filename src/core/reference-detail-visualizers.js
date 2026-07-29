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
const line = (g, pts, color, width, alpha = 0.8) => {
  const c = g.ctx;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  g.alpha(alpha * 0.1);
  c.strokeStyle = color;
  c.lineWidth = width * 7;
  c.stroke();
  g.alpha(alpha);
  c.lineWidth = width;
  c.stroke();
};
const frame = (g) => {
  const { ctx, w, h } = g,
    m = Math.min(w, h) * 0.07,
    l = m * 0.9;
  g.alpha(0.7);
  ctx.strokeStyle = g.col(0.1);
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
const dust = (g, n) => {
  const { ctx, w, h } = g;
  for (let i = 0; i < n * g.q; i++) {
    const f = (i * 0.61803398875) % 1,
      x = (f * w + Math.sin(g.t + i) * w * 0.025) % w,
      y = h * (0.16 + ((i * 0.371) % 0.65)),
      s = 1 + (i % 3) * 0.6;
    g.alpha(0.05 + g.A.b(f) * 0.3);
    ctx.fillStyle = g.col(f);
    ctx.fillRect(x, y, s, s);
  }
};

add(
  'refInterferenceRibbon',
  'REFERENCE // Interference Ribbon',
  {
    layers: R('Слоёв волн', 18, 4, 32, 1),
    samples: R('Сэмплов', 280, 80, 620, 10),
    amplitude: R('Амплитуда', 1, 0.2, 2),
    phase: R('Фазовый сдвиг', 0.8, -2, 2),
    particles: R('Пыль', 320, 40, 800, 10),
    labels: T('BASS / TREBLE', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g;
    frame(g);
    const n = Math.max(80, Math.round(p.samples * g.q));
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1),
          b = A.b(x * 0.6),
          t = A.b(0.4 + x * 0.6),
          carrier = Math.sin(x * 12 + g.t * p.phase + l * 0.37),
          detail = Math.sin(x * 42 - g.t * 1.6 + l) * A.b(x) * 0.035;
        pts.push([
          x * w,
          h * 0.46 +
            carrier * h * (0.025 + (b + t) * 0.12) * p.amplitude +
            detail * h +
            (f - 0.5) * h * 0.16,
        ]);
      }
      line(g, pts, g.col(f), 0.7 + (1 - f) * 1.7, 0.12 + (1 - f) * 0.72);
    }
    dust(g, p.particles);
    if (p.labels) {
      ctx.font = '700 10px Space Mono,monospace';
      g.alpha(0.85);
      ctx.fillStyle = g.col(0.05);
      ctx.fillText('BASS', w * 0.07, h * 0.83);
      ctx.fillStyle = g.col(0.94);
      ctx.fillText('TREBLE', w * 0.84, h * 0.83);
      for (let i = 0; i < 18; i++) {
        const v = A.b(i / 18);
        g.alpha(0.2 + v * 0.6);
        ctx.fillRect(w * 0.07 + i * 6, h * 0.85, 3, 2 + v * 3);
        ctx.fillRect(w * 0.84 + i * 6, h * 0.85, 3, 2 + v * 3);
      }
    }
    g.norm();
  },
);

add(
  'refPrismReflection',
  'REFERENCE // Prism Reflection Array',
  {
    points: R('Каналов', 64, 20, 140, 1),
    bands: R('Слоёв', 5, 2, 10, 1),
    height: R('Высота', 1, 0.2, 2),
    depth: R('Глубина', 0.8, 0.1, 1.8),
    triangles: T('Микротреугольники', true),
    particles: R('Маркеров', 90, 20, 240, 1),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      base = h * 0.6,
      n = Math.max(20, Math.round(p.points * g.q)),
      step = w / n;
    frame(g);
    for (let b = 0; b < p.bands; b++) {
      const bf = b / Math.max(1, p.bands - 1),
        pts = [];
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1),
          v = A.b(f),
          shape = Math.pow(Math.max(0, Math.sin(f * TAU * (2 + b * 0.45) + g.t * 0.2 + b)), 2.3),
          y = base - (v * 0.12 + shape * 0.55) * h * p.height - (bf - 0.5) * h * 0.03;
        pts.push([i * step, y]);
      }
      line(g, pts, g.col(bf), 0.8 + (1 - bf) * 1.5, 0.15 + (1 - bf) * 0.6);
      for (let i = 0; i < n - 1; i++) {
        const f = i / (n - 1),
          a = pts[i],
          z = pts[i + 1],
          peak = Math.min(a[1], z[1]);
        ctx.beginPath();
        ctx.moveTo(a[0], base);
        ctx.lineTo((a[0] + z[0]) / 2, peak);
        ctx.lineTo(z[0], base);
        ctx.closePath();
        g.alpha(0.035 + A.b(f) * 0.2);
        ctx.fillStyle = g.col(f);
        ctx.fill();
        if (p.triangles && i % 3 === 0) {
          g.alpha(0.42);
          ctx.strokeStyle = g.col(1 - f);
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }
    }
    line(
      g,
      Array.from({ length: n }, (_, i) => [i * step, base]),
      g.col(0.5),
      1.2,
      0.65,
    );
    for (let i = 0; i < p.particles * g.q; i++) {
      const f = (i * 0.754877) % 1,
        x = f * w,
        y = base - h * (0.08 + ((i * 0.37) % 0.34));
      g.alpha(0.1 + A.b(f) * 0.55);
      ctx.fillStyle = g.col(f);
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 4) * 0.5, 0, TAU);
      ctx.fill();
    }
    line(
      g,
      Array.from({ length: n }, (_, i) => {
        const f = i / (n - 1),
          v = A.b(f);
        return [
          i * step,
          base +
            (v * 0.12 + Math.pow(Math.max(0, Math.sin(f * TAU * 2 + g.t * 0.2)), 2.3) * 0.55) *
              h *
              p.height *
              p.depth,
        ];
      }),
      g.col(0.75),
      0.7,
      0.18,
    );
    g.norm();
  },
);
