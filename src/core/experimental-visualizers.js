import { VIS, VMAP } from './visualizers.js';
import { clamp, lerp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });

function register(id, name, group, params, draw) {
  if (VMAP[id]) return;
  const visualizer = { id, name, group, params, draw };
  VIS.push(visualizer);
  VMAP[id] = visualizer;
}

register('vectorscope', 'Phosphor Vectorscope', 'waves', {
  points: R('Точек', 720, 160, 1600, 20),
  delay: R('Сдвиг канала', 0.23, 0.02, 0.48),
  rotation: R('Вращение', 0.08, -1, 1),
  glow: R('Фосфор', 0.8, 0, 1.5),
  persistence: R('Послесвечение', 5, 1, 12, 1),
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(120, Math.round(p.points * g.q));
  const radius = Math.min(w, h) * 0.38 * (0.78 + A.level * 0.25);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(g.t * p.rotation);
  g.add();
  for (let pass = Math.round(p.persistence); pass >= 0; pass--) {
    const drift = pass * 0.0018;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const xWave = A.w((t + drift) % 1);
      const yWave = A.w((t + p.delay + drift * 1.7) % 1);
      const breath = 0.72 + A.b(t) * 0.42 * g.S.amp;
      const x = xWave * radius * breath;
      const y = yWave * radius * breath;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    g.alpha((0.68 / (pass + 1)) * (0.35 + p.glow * 0.65));
    ctx.strokeStyle = g.col(pass / Math.max(1, p.persistence));
    ctx.lineWidth = pass === 0 ? 1.35 : 1 + pass * 0.65;
    ctx.stroke();
  }
  g.norm();
  ctx.restore();
});

register('cymatics', 'Cymatic Plate', 'radial', {
  modes: R('Моды', 8, 3, 18, 1),
  rings: R('Кольца', 13, 4, 28, 1),
  detail: R('Детализация', 240, 80, 520, 10),
  warp: R('Деформация', 0.75, 0, 2),
  dust: T('Звуковая пыль', true),
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const modes = Math.round(p.modes);
  const rings = Math.max(3, Math.round(p.rings * g.q));
  const detail = Math.max(60, Math.round(p.detail * g.q));
  const maxR = Math.min(w, h) * 0.45;
  g.add();
  for (let r = 1; r <= rings; r++) {
    const f = r / rings;
    const energy = A.b(f);
    ctx.beginPath();
    for (let i = 0; i <= detail; i++) {
      const a = (i / detail) * TAU;
      const nodal = Math.sin(a * modes + g.t * 0.35) * Math.cos(a * (modes - 2) - g.t * 0.2);
      const rr = f * maxR + nodal * energy * maxR * 0.11 * p.warp * g.S.amp;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    g.alpha(0.08 + energy * 0.55 + (1 - f) * 0.08);
    ctx.strokeStyle = g.col((f + A.beat * 0.12) % 1);
    ctx.lineWidth = 0.7 + energy * 1.8;
    ctx.stroke();
  }
  if (p.dust) {
    const grains = Math.round(180 * g.q);
    for (let i = 0; i < grains; i++) {
      const f = (i * 0.61803398875) % 1;
      const a = i * 2.399963 + g.t * 0.03;
      const energy = A.b(f);
      const node = Math.abs(Math.sin(a * modes));
      const rr = maxR * Math.sqrt(f) * (0.9 + energy * 0.12);
      const size = 0.5 + node * (1.2 + energy * 2.4);
      g.alpha(0.08 + energy * 0.38);
      ctx.fillStyle = g.col(f);
      ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size, size);
    }
  }
  g.norm();
});

register('terrainFlow', 'Spectral Terrain', 'futuristic', {
  rows: R('Глубина', 42, 14, 80, 1),
  cols: R('Разрешение', 72, 24, 140, 2),
  height: R('Высота', 0.7, 0.15, 1.5),
  perspective: R('Перспектива', 0.72, 0.2, 1),
  drift: R('Дрейф', 0.45, -2, 2),
}, g => {
  const { ctx, w, h, p, A } = g;
  const rows = Math.max(12, Math.round(p.rows * g.q));
  const cols = Math.max(20, Math.round(p.cols * g.q));
  const st = g.st;
  const size = rows * cols;
  if (!st.map || st.map.length !== size) {
    st.map = new Float32Array(size);
    st.acc = 0;
  }
  st.acc += g.dt * 32;
  if (st.acc >= 1) {
    st.acc %= 1;
    st.map.copyWithin(cols, 0, size - cols);
    for (let c = 0; c < cols; c++) st.map[c] = A.b(c / (cols - 1));
  }
  ctx.lineWidth = 1;
  for (let r = rows - 1; r >= 0; r--) {
    const depth = r / (rows - 1);
    const scale = lerp(1, 0.2, depth * p.perspective);
    const yBase = h * (0.84 - depth * 0.66);
    const drift = Math.sin(g.t * p.drift + depth * 5) * w * 0.035 * depth;
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const xNorm = c / (cols - 1);
      const value = st.map[r * cols + c];
      const x = w * 0.5 + (xNorm - 0.5) * w * scale + drift;
      const y = yBase - value * h * 0.24 * p.height * scale * g.S.amp;
      c ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    g.alpha(0.08 + (1 - depth) * 0.7);
    ctx.strokeStyle = g.col(1 - depth);
    ctx.stroke();
  }
  g.alpha(1);
});

register('recurrence', 'Recurrence Matrix', 'spectrum', {
  cells: R('Матрица', 52, 24, 88, 2),
  threshold: R('Порог сходства', 0.13, 0.03, 0.4),
  contrast: R('Контраст', 1.5, 0.5, 4),
  phase: R('Фазовый сдвиг', 0.17, 0, 0.5),
  mirror: T('Зеркальная симметрия', true),
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(20, Math.round(p.cells * Math.sqrt(g.q)));
  const side = Math.min(w, h) * 0.82;
  const ox = (w - side) / 2;
  const oy = (h - side) / 2;
  const cell = side / n;
  for (let y = 0; y < n; y++) {
    const ay = A.w((y / n + p.phase) % 1);
    for (let x = 0; x < n; x++) {
      if (p.mirror && x < y) continue;
      const ax = A.w(x / n);
      const spectral = Math.abs(A.b(x / n) - A.b(y / n));
      const distance = Math.abs(ax - ay) * 0.72 + spectral * 0.28;
      const hit = clamp(1 - distance / Math.max(0.01, p.threshold), 0, 1);
      if (hit <= 0) continue;
      const value = Math.pow(hit, 1 / p.contrast);
      g.alpha(0.08 + value * 0.88);
      ctx.fillStyle = g.col((x + y) / (n * 2));
      ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
      if (p.mirror && x !== y) ctx.fillRect(ox + y * cell, oy + x * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
  g.alpha(1);
});

register('magneticField', 'Magnetic Bass Field', 'particles', {
  lines: R('Силовых линий', 26, 8, 64, 1),
  particles: R('Частиц', 360, 80, 1000, 10),
  bend: R('Искривление', 0.9, 0.1, 2.5),
  flow: R('Поток', 0.7, -2, 2),
  pulse: R('Импульс бита', 1, 0, 2),
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const lines = Math.max(6, Math.round(p.lines * g.q));
  const count = Math.max(60, Math.round(p.particles * g.q));
  const radius = Math.min(w, h) * (0.16 + A.bass * 0.08 * p.pulse);
  g.add();
  for (let l = 0; l < lines; l++) {
    const f = l / lines;
    const sign = l % 2 ? 1 : -1;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const angle = (t - 0.5) * Math.PI * 1.65;
      const reach = radius * (1.2 + f * 2.2) * (1 + A.b(f) * 0.35 * g.S.amp);
      const x = cx + Math.sin(angle) * reach;
      const y = cy + sign * Math.cos(angle) * radius * (0.35 + f * p.bend) + Math.sin(g.t + f * 9) * 5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    g.alpha(0.06 + A.b(f) * 0.35);
    ctx.strokeStyle = g.col(f);
    ctx.lineWidth = 0.7 + A.b(f) * 1.3;
    ctx.stroke();
  }
  for (let i = 0; i < count; i++) {
    const f = (i * 0.61803398875) % 1;
    const lane = (i % lines) / lines;
    const t = (f + g.t * p.flow * (0.04 + lane * 0.08)) % 1;
    const sign = i % 2 ? 1 : -1;
    const angle = (t - 0.5) * Math.PI * 1.65;
    const energy = A.b(lane);
    const reach = radius * (1.2 + lane * 2.2) * (1 + energy * 0.35);
    const x = cx + Math.sin(angle) * reach;
    const y = cy + sign * Math.cos(angle) * radius * (0.35 + lane * p.bend);
    const size = 0.7 + energy * 3.2 + A.beat * p.pulse * 1.5;
    g.alpha(0.12 + energy * 0.75);
    ctx.fillStyle = g.col(lane);
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
  g.norm();
});

register('echoTomography', 'Echo Tomography', 'futuristic', {
  slices: R('Срезов', 28, 8, 64, 1),
  rays: R('Лучей', 96, 32, 220, 4),
  depth: R('Глубина', 0.72, 0.1, 1.4),
  twist: R('Скрутка', 0.55, -2, 2),
  scan: R('Сканер', 0.8, 0, 2),
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const slices = Math.max(6, Math.round(p.slices * g.q));
  const rays = Math.max(24, Math.round(p.rays * g.q));
  const maxR = Math.min(w, h) * 0.48;
  g.add();
  for (let s = slices - 1; s >= 0; s--) {
    const z = s / Math.max(1, slices - 1);
    const phase = g.t * p.scan * 0.35 - z * p.depth * 4;
    const base = maxR * (0.08 + z * 0.92);
    ctx.beginPath();
    for (let i = 0; i <= rays; i++) {
      const f = i / rays;
      const a = f * TAU + z * p.twist + phase;
      const energy = A.b((f + z * 0.17) % 1);
      const ripple = Math.sin(a * 3 - phase * 2) * energy * maxR * 0.06 * g.S.amp;
      const r = base + ripple;
      const squash = 0.35 + z * 0.55;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * squash + (z - 0.5) * h * 0.18;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    g.alpha(0.04 + (1 - z) * 0.26 + A.b(z) * 0.32);
    ctx.strokeStyle = g.col((z + g.t * 0.03) % 1);
    ctx.lineWidth = 0.7 + (1 - z) * 1.4;
    ctx.stroke();
  }
  g.norm();
});
