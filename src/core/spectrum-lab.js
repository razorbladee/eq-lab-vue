import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const add = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'spectrum-lab', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};
const glowPath = (g, pts, color, width, alpha = 0.8) => {
  const c = g.ctx;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  g.alpha(alpha * 0.12);
  c.strokeStyle = color;
  c.lineWidth = width * 7;
  c.stroke();
  g.alpha(alpha);
  c.lineWidth = width;
  c.stroke();
};
const stars = (g, n, seed = 1) => {
  const { ctx, w, h } = g;
  for (let i = 0; i < n * g.q; i++) {
    const f = (i * 0.61803398875 + seed * 0.13) % 1,
      x = (f * w + Math.sin(g.t * 0.7 + i) * w * 0.035) % w,
      y = h * (0.08 + ((i * 0.371 + seed) % 0.82));
    g.alpha(0.04 + g.A.b(f) * 0.3);
    ctx.fillStyle = g.col(f);
    ctx.fillRect(x, y, 1 + (i % 3), 1 + (i % 2));
  }
};
const hud = (g) => {
  const { ctx, w, h } = g,
    m = Math.min(w, h) * 0.06,
    l = m * 0.9;
  g.alpha(0.45);
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
const label = (g, t, x, y, c = 0.5) => {
  g.ctx.font = '700 9px Space Mono,monospace';
  g.alpha(0.7);
  g.ctx.fillStyle = g.col(c);
  g.ctx.fillText(t, x, y);
};

add(
  'labLiquidMetal',
  'LAB // Liquid Metal Field',
  {
    layers: R('Потоков', 8, 3, 18, 1),
    samples: R('Сэмплов', 220, 60, 520, 10),
    turbulence: R('Турбулентность', 0.6, 0, 2),
    bloom: R('Блум', 0.8, 0, 2),
    particles: R('Частиц', 180, 30, 500, 10),
  },
  (g) => {
    const { w, h, A, p } = g;
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i <= p.samples; i++) {
        const x = i / p.samples,
          v = A.b((x + f * 0.1) % 1),
          y =
            h * 0.5 +
            Math.sin(x * 7 + g.t * (1 + f) + l) * h * (0.04 + v * 0.2) * p.turbulence +
            (f - 0.5) * h * 0.16 +
            Math.sin(x * 31 + g.t * 2 + l) * h * 0.018;
        pts.push([x * w, y]);
      }
      glowPath(g, pts, g.col(f), 1.1 + (1 - f) * 1.6, 0.12 + (1 - f) * 0.62);
    }
    stars(g, p.particles, 2);
    g.norm();
  },
);

add(
  'labParticleNebula',
  'LAB // Particle Nebula',
  {
    particles: R('Частиц', 520, 120, 1400, 10),
    clouds: R('Облаков', 9, 3, 20, 1),
    spread: R('Разлёт', 1, 0.2, 2),
    twinkle: R('Мерцание', 0.7, 0, 1.5),
    labels: T('Метки', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g;
    g.add();
    for (let i = 0; i < p.particles * g.q; i++) {
      const f = (i * 0.618) % 1,
        band = A.b(f),
        a = f * TAU * p.clouds + g.t * (0.15 + band),
        r = Math.min(w, h) * (0.05 + ((i * 1.37) % 1) * 0.48) * p.spread,
        x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a) * r * 0.62,
        sz = 0.6 + band * 4 + p.twinkle * (0.5 + 0.5 * Math.sin(g.t * 6 + i));
      g.alpha(0.08 + band * 0.75);
      ctx.fillStyle = g.col(f);
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    g.norm();
    if (p.labels) {
      label(g, 'NEBULA / LIVE', w * 0.07, h * 0.12, 0.16);
      label(g, 'PARTICLE DENSITY', w * 0.72, h * 0.12, 0.86);
    }
  },
);

add(
  'labOrbitalArcs',
  'LAB // Orbital Arc Engine',
  {
    orbits: R('Орбит', 8, 2, 18, 1),
    arcs: R('Дугов', 24, 6, 72, 1),
    radius: R('Радиус', 0.28, 0.12, 0.45),
    spin: R('Вращение', 0.7, -2, 2),
    nodes: T('Узлы', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      r = Math.min(w, h) * p.radius;
    g.add();
    for (let o = 0; o < p.orbits; o++) {
      const z = o / Math.max(1, p.orbits - 1),
        rr = r * (0.35 + z * 1.7),
        pts = [];
      for (let i = 0; i <= 90; i++) {
        const f = i / 90,
          a = f * TAU + g.t * p.spin * (1 - z) + z * 3,
          v = A.b(f);
        pts.push([
          cx + Math.cos(a) * rr * (1 + v * 0.2),
          cy + Math.sin(a) * rr * (0.35 + z * 0.55),
        ]);
      }
      glowPath(g, pts, g.col(z), 0.8 + z, 0.12 + (1 - z) * 0.45);
    }
    for (let i = 0; i < p.arcs; i++) {
      const f = (i * 0.618) % 1,
        a = f * TAU + g.t * p.spin,
        rr = r * (0.7 + A.b(f));
      g.alpha(0.16 + A.b(f) * 0.7);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = 1 + A.b(f) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, a, a + Math.PI * (0.12 + A.b(f) * 0.3));
      ctx.stroke();
      if (p.nodes) {
        ctx.fillStyle = g.col(1 - f);
        ctx.fillRect(cx + Math.cos(a) * rr - 2, cy + Math.sin(a) * rr * 0.6 - 2, 4, 4);
      }
    }
    g.norm();
  },
);

add(
  'labGlitchLattice',
  'LAB // Glitch Lattice',
  {
    rows: R('Строк', 22, 8, 48, 1),
    cols: R('Колонок', 44, 16, 96, 1),
    jitter: R('Джиттер', 0.5, 0, 2),
    split: R('RGB Split', 0.6, 0, 1.5),
    scan: R('Сканер', 0.8, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g;
    for (let y = 0; y < p.rows; y++) {
      const fy = y / (p.rows - 1),
        v = A.b(fy),
        yy = h * (0.16 + fy * 0.68) + Math.sin(g.t * 5 + y) * p.jitter * 2;
      for (let x = 0; x < p.cols; x++) {
        const fx = x / (p.cols - 1),
          b = A.b(fx),
          xx = w * (0.07 + fx * 0.86) + Math.sin(g.t * 8 + y * 2 + x) * p.jitter;
        g.alpha(0.05 + (v + b) * 0.28);
        ctx.fillStyle = g.col(fx);
        ctx.fillRect(xx, yy, Math.max(1, (w / p.cols) * 0.5), 1 + b * 4);
        if (p.split) {
          g.alpha(0.18);
          ctx.fillStyle = g.col(Math.min(1, fx + p.split * 0.04));
          ctx.fillRect(xx + p.split * 5, yy, 2, 1);
        }
      }
    }
    const sx = ((g.t * p.scan * 0.18) % 1) * w;
    g.alpha(0.55);
    ctx.fillStyle = g.col(0.7);
    ctx.fillRect(sx, h * 0.1, 1, h * 0.78);
    g.norm();
  },
);

add(
  'labPrismaticTunnel',
  'LAB // Prismatic Tunnel',
  {
    rings: R('Колец', 26, 8, 60, 1),
    sides: R('Граней', 7, 3, 14, 1),
    speed: R('Скорость', 1, 0.2, 3),
    warp: R('Warp', 0.7, 0, 2),
    core: T('Ядро', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      rm = Math.min(w, h) * 0.7;
    g.add();
    for (let i = 0; i < p.rings; i++) {
      const z = (i / p.rings + g.t * p.speed * 0.12) % 1,
        v = A.b(1 - z),
        rr = Math.pow(z, 1.7) * rm * (1 + v * 0.28),
        rot = g.t * 0.4 + z * p.warp * 3;
      ctx.beginPath();
      for (let s = 0; s <= p.sides; s++) {
        const a = (s / p.sides) * TAU + rot,
          x = cx + Math.cos(a) * rr,
          y = cy + Math.sin(a) * rr * 0.62;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      g.alpha(0.06 + (1 - z) * 0.5 + v * 0.2);
      ctx.strokeStyle = g.col(z);
      ctx.lineWidth = 1 + (1 - z) * 2;
      ctx.stroke();
    }
    if (p.core) {
      g.alpha(0.8 + A.beat * 0.2);
      ctx.fillStyle = g.col(0.55);
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + A.bass * 20, 0, TAU);
      ctx.fill();
    }
    g.norm();
  },
);

add(
  'labHeatmap',
  'LAB // Audio Heatmap',
  {
    rows: R('Строк', 42, 16, 90, 2),
    cols: R('Колонок', 96, 32, 180, 2),
    contrast: R('Контраст', 1.6, 0.4, 3),
    scroll: R('Скорость', 1, 0.2, 4),
    marks: T('Частотные метки', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      cols = Math.round(p.cols),
      rows = Math.round(p.rows),
      st = g.st;
    if (!st.lines || st.lines.length !== cols * rows) st.lines = new Float32Array(cols * rows);
    st.acc = (st.acc || 0) + g.dt * 60 * p.scroll;
    if (st.acc > 1) {
      st.acc = 0;
      st.lines.copyWithin(cols, 0, cols * (rows - 1));
      for (let x = 0; x < cols; x++) st.lines[x] = Math.pow(A.b(x / cols), 1 / p.contrast);
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = clamp(st.lines[y * cols + x], 0, 1),
          s = Math.pow(v, 0.7);
        g.alpha(0.04 + s * 0.8);
        ctx.fillStyle = g.col(x / cols);
        ctx.fillRect(
          (x * w) / cols,
          (y * h) / rows,
          Math.max(1, w / cols + 0.4),
          Math.max(1, h / rows + 0.4),
        );
      }
    if (p.marks) {
      label(g, '60 Hz', w * 0.08, h * 0.9, 0.1);
      label(g, '1 kHz', w * 0.48, h * 0.9, 0.5);
      label(g, '16 kHz', w * 0.84, h * 0.9, 0.9);
    }
    g.norm();
  },
);

add(
  'labCymaticBloom',
  'LAB // Cymatic Bloom',
  {
    modes: R('Моды', 12, 3, 24, 1),
    rings: R('Кольца', 16, 5, 34, 1),
    detail: R('Деталь', 220, 80, 520, 10),
    warp: R('Warp', 1, 0.1, 2),
    dust: T('Песок', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      detail = Math.round(p.detail * g.q),
      maxR = Math.min(w, h) * 0.42;
    g.add();
    for (let r = 1; r <= p.rings; r++) {
      const f = r / p.rings,
        v = A.b(f),
        pts = [];
      for (let i = 0; i <= detail; i++) {
        const a = (i / detail) * TAU,
          n = Math.sin(a * p.modes + g.t * 0.4) * Math.cos(a * (p.modes - 2) - g.t * 0.2),
          rr = f * maxR + n * v * maxR * 0.12 * p.warp;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      glowPath(g, pts, g.col(f), 0.6 + v * 1.7, 0.08 + v * 0.45);
    }
    if (p.dust) stars(g, 220, 9);
    g.norm();
  },
);

add(
  'labSpectralComet',
  'LAB // Spectral Comet',
  {
    particles: R('Частиц', 420, 80, 1100, 10),
    tail: R('Хвост', 0.8, 0.1, 2),
    orbit: R('Орбита', 1, 0.2, 3),
    spark: R('Искры', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g;
    g.add();
    for (let i = 0; i < p.particles * g.q; i++) {
      const f = (i * 0.618) % 1,
        v = A.b(f),
        a = f * TAU + g.t * p.orbit * (1 + v),
        r = Math.min(w, h) * (0.08 + f * 0.44),
        x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a) * r * 0.55,
        sz = 1 + v * 4 + p.spark * A.beat;
      g.alpha(0.08 + v * 0.7);
      ctx.fillStyle = g.col(f);
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      for (let t = 1; t < 4; t++) {
        g.alpha(0.04 + v * 0.12);
        ctx.fillRect(
          x - Math.cos(a) * t * sz * p.tail,
          y - Math.sin(a) * t * sz * p.tail,
          sz * 0.5,
          sz * 0.5,
        );
      }
    }
    g.norm();
  },
);

add(
  'labFluidContour',
  'LAB // Fluid Contour',
  {
    layers: R('Контуров', 14, 4, 30, 1),
    samples: R('Сэмплов', 220, 60, 520, 10),
    flow: R('Поток', 0.8, -2, 2),
    thickness: R('Толщина', 1.4, 0.4, 4),
    ribbons: T('Ленты', true),
  },
  (g) => {
    const { w, h, A, p } = g;
    for (let l = 0; l < p.layers; l++) {
      const f = l / Math.max(1, p.layers - 1),
        pts = [];
      for (let i = 0; i <= p.samples; i++) {
        const x = i / p.samples,
          v = A.b((x + f * 0.08) % 1),
          y =
            h * 0.5 +
            Math.sin(x * 7 + g.t * p.flow + f * 4) * h * (0.04 + v * 0.2) +
            (f - 0.5) * h * 0.22;
        pts.push([x * w, y]);
      }
      glowPath(g, pts, g.col(f), p.thickness * (1 - f * 0.5), 0.12 + (1 - f) * 0.58);
      if (p.ribbons && l % 2 === 0) {
        const fill = pts.concat([
          [w, h * 0.5],
          [0, h * 0.5],
        ]);
        g.alpha(0.025);
        g.ctx.beginPath();
        fill.forEach(([x, y], i) => (i ? g.ctx.lineTo(x, y) : g.ctx.moveTo(x, y)));
        g.ctx.closePath();
        g.ctx.fillStyle = g.col(f);
        g.ctx.fill();
      }
    }
    g.norm();
  },
);

add(
  'labKineticBars',
  'LAB // Kinetic Barfield',
  {
    bars: R('Полос', 64, 16, 140, 1),
    segments: R('Сегментов', 18, 5, 32, 1),
    wave: R('Волновой сдвиг', 0.7, 0, 2),
    reflection: T('Отражение', true),
    glow: R('Свечение', 0.8, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.round(p.bars * g.q),
      seg = Math.round(p.segments),
      bw = (w / n) * 0.62,
      base = h * 0.68;
    g.add();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f),
        lit = Math.round(v * seg * (0.7 + 0.3 * Math.sin(g.t * 2 + i * p.wave))),
        x = (i * w) / n + (w / n - bw) / 2;
      for (let s = 0; s < seg; s++) {
        const on = s < lit,
          y = base - s * h * 0.028;
        g.alpha(on ? 0.18 + (s / seg) * 0.75 : 0.025);
        ctx.fillStyle = g.col((s / seg + f) * 0.5);
        ctx.fillRect(x, y, bw, Math.max(1, h * 0.018));
        if (p.reflection && on) {
          g.alpha(0.05);
          ctx.fillRect(x, base + (s + 1) * h * 0.016, bw, h * 0.01);
        }
      }
    }
    g.norm();
  },
);

add(
  'labVectorHalo',
  'LAB // Vector Halo',
  {
    points: R('Точек', 420, 120, 1000, 10),
    rings: R('Колец', 6, 2, 14, 1),
    radius: R('Радиус', 0.28, 0.1, 0.44),
    rotation: R('Вращение', 0.5, -2, 2),
    echo: T('Эхо', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g,
      r = Math.min(w, h) * p.radius;
    g.add();
    for (let q = 0; q < p.rings; q++) {
      const z = q / Math.max(1, p.rings - 1),
        pts = [];
      for (let i = 0; i < p.points; i++) {
        const f = i / p.points,
          v = A.b(f),
          a = f * TAU + g.t * p.rotation * (1 + z),
          rr = r * (0.7 + z * 0.8) + v * Math.min(w, h) * 0.12;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.5 + z * 0.5)]);
      }
      glowPath(g, pts, g.col(z), 0.7 + (1 - z), 0.08 + (1 - z) * 0.45);
      if (p.echo && q % 2 === 0)
        glowPath(
          g,
          pts.map(([x, y]) => [x, cy + (cy - y) * 1.2]),
          g.col(1 - z),
          0.5,
          0.12,
        );
    }
    g.norm();
  },
);
