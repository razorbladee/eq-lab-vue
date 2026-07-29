import { VIS, VMAP } from '../visualizers.js';
import { TAU, mulberry, R, T, SEL, ring, glowDot, stars } from './utils.js';
import { clamp, lerp, Palette } from '../palette.js';
import { Audio } from '../audio.js';

const def = (id, name, group, params, draw, init) => {
  const v = { id, name, group, params, draw, init };
  VIS.push(v);
  VMAP[id] = v;
};

/* ==================== ФОРМЫ / РАДИАЛЬНОЕ ==================== */
def(
  'radial',
  'Radial Spectrum',
  'radial',
  {
    rings: R('Кольца', 4, 1, 10, 1),
    inner: R('Ядро', 0.18, 0.04, 0.5),
    spike: R('Шипы', 0.3, 0.05, 0.8),
    rot: R('Вращение', 0.12, -1, 1),
    sym: T('Симметрия', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const R0 = Math.min(w, h) * p.inner,
      N = Math.max(48, Math.round(180 * g.q));
    const rings = Math.max(1, Math.round(p.rings));
    for (let r = 0; r < rings; r++) {
      const f = r / rings;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = i / N,
          a = t * TAU + g.t * p.rot + f * 0.3;
        const src = p.sym ? (t < 0.5 ? t * 2 : (1 - t) * 2) : t;
        const v = A.b(src);
        const rr = R0 * (1 + f * 0.3) + v * Math.min(w, h) * p.spike * g.S.amp;
        const x = cx + Math.cos(a) * rr,
          y = cy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      g.alpha(0.25 + (1 - f) * 0.55);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      g.alpha(0.06);
      ctx.fillStyle = g.col(f);
      ctx.fill();
    }
    g.alpha(0.7);
    ctx.strokeStyle = g.col(1);
    ctx.lineWidth = 1 + A.bass * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R0 * 0.72, 0, TAU);
    ctx.stroke();
    g.alpha(1);
  },
);

def(
  'orbit',
  'Orbit Ring',
  'radial',
  {
    sats: R('Спутников', 90, 8, 260, 1),
    radius: R('Радиус', 0.26, 0.08, 0.45),
    wobble: R('Колебание', 0.4, 0, 1),
    spin: R('Вращение', 0.5, -2, 2),
    size: R('Размер', 1, 0.3, 3),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(8, Math.round(p.sats * g.q)),
      R0 = Math.min(w, h) * p.radius;
    g.add();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f),
        a = f * TAU + g.t * p.spin;
      const rr = R0 + v * Math.min(w, h) * 0.22 * g.S.amp + Math.sin(g.t * 2 + i) * p.wobble * 14;
      g.alpha(0.25 + v * 0.75);
      glowDot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, (2 + v * 8) * p.size, f);
    }
    g.norm();
    g.alpha(0.3);
    ctx.strokeStyle = g.col(0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R0, 0, TAU);
    ctx.stroke();
    g.alpha(1);
  },
);

def(
  'rings',
  'Concentric Rings',
  'radial',
  {
    rings: R('Кольца', 18, 4, 48, 1),
    gap: R('Шаг', 14, 4, 44, 1),
    thick: R('Толщина', 2, 0.5, 8, 0.1),
    breathe: R('Дыхание', 0.8, 0, 2),
    fade: R('Спад', 0.5, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(4, Math.round(p.rings * g.q));
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f);
      const r = (i + 1) * p.gap * (1 + v * p.breathe * 0.5) * g.S.amp;
      g.alpha(clamp((0.15 + v) * (1 - f * p.fade), 0, 1));
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick * (1 + v);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }
    g.alpha(1);
  },
);

def(
  'spiral',
  'Spiral Spectrum',
  'radial',
  {
    turns: R('Витков', 12, 2, 32, 1),
    points: R('Точек', 480, 100, 1400, 10),
    thick: R('Толщина', 2, 0.5, 7, 0.1),
    grow: R('Рост', 0.8, 0.2, 1.4),
    spin: R('Вращение', 0.4, -2, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(100, Math.round(p.points * g.q)),
      Rm = Math.min(w, h) * 0.46;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1),
        a = t * p.turns * TAU + g.t * p.spin;
      const v = A.b(t);
      const r = Math.pow(t, p.grow) * Rm * (1 + v * 0.35 * g.S.amp);
      const x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    g.add();
    g.alpha(0.25);
    ctx.strokeStyle = g.col(0.3);
    ctx.lineWidth = p.thick * 4;
    ctx.stroke();
    g.alpha(0.95);
    ctx.strokeStyle = g.col(0.9);
    ctx.lineWidth = p.thick;
    ctx.stroke();
    g.norm();
  },
);

def(
  'fractal',
  'Fractal Bloom',
  'radial',
  {
    petals: R('Лепестков', 6, 3, 16, 1),
    depth: R('Глубина', 3, 1, 6, 1),
    twist: R('Скрутка', 0.6, 0, 2),
    shrink: R('Сжатие', 0.62, 0.3, 0.9),
    thick: R('Толщина', 1.4, 0.4, 4, 0.1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const P = Math.round(p.petals),
      D = Math.round(p.depth);
    const R0 = Math.min(w, h) * 0.38;
    g.add();
    for (let d = 0; d < D; d++) {
      const scale = Math.pow(p.shrink, d),
        v = A.b(d / D);
      const rot = g.t * p.twist * (d % 2 ? -1 : 1) * 0.5;
      for (let k = 0; k < P; k++) {
        const a = (k / P) * TAU + rot;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40,
            ang = a + Math.sin(t * Math.PI) * 0.7;
          const r = R0 * scale * Math.sin(t * Math.PI) * (1 + v * 0.8 * g.S.amp);
          const x = cx + Math.cos(ang) * r,
            y = cy + Math.sin(ang) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        g.alpha(0.16 + v * 0.5);
        ctx.strokeStyle = g.col(d / D);
        ctx.lineWidth = p.thick;
        ctx.stroke();
      }
    }
    g.norm();
  },
);

def(
  'kaleido',
  'Kaleidoscope',
  'radial',
  {
    mirrors: R('Зеркал', 8, 3, 18, 1),
    zoom: R('Зум', 1, 0.3, 2),
    rot: R('Вращение', 0.3, -2, 2),
    complexity: R('Сложность', 6, 2, 14, 1),
    thick: R('Толщина', 1.6, 0.4, 5, 0.1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const M = Math.round(p.mirrors),
      C = Math.round(p.complexity * g.q);
    const R0 = Math.min(w, h) * 0.46 * p.zoom;
    g.add();
    for (let m = 0; m < M; m++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((m / M) * TAU + g.t * p.rot * 0.4);
      if (m % 2) ctx.scale(1, -1);
      for (let k = 0; k < C; k++) {
        const f = k / C,
          v = A.b(f);
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const t = i / 20,
            r = R0 * (f * 0.7 + t * 0.3) * (1 + v * 0.5 * g.S.amp);
          const a = t * (1.1 + f) + Math.sin(g.t + k) * 0.3;
          i
            ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.alpha(0.14 + v * 0.55);
        ctx.strokeStyle = g.col(f);
        ctx.lineWidth = p.thick;
        ctx.stroke();
      }
      ctx.restore();
    }
    g.norm();
  },
);

def(
  'spectrumOrb',
  'Spectrum Orb',
  'radial',
  {
    pts: R('Точек', 220, 60, 700, 5),
    radius: R('Радиус', 0.24, 0.08, 0.42),
    squash: R('Сжатие', 0.55, 0.15, 1),
    spin: R('Вращение', 0.5, -2, 2),
    size: R('Размер', 1, 0.3, 3),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(60, Math.round(p.pts * g.q)),
      R0 = Math.min(w, h) * p.radius;
    g.add();
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f);
      const lat = Math.acos(1 - 2 * ((i + 0.5) / n)),
        lon = f * TAU * 9 + g.t * p.spin;
      const r = R0 * (1 + v * 0.6 * g.S.amp);
      const x = cx + Math.sin(lat) * Math.cos(lon) * r;
      const y = cy + Math.cos(lat) * r * p.squash;
      g.alpha(0.2 + v * 0.8);
      glowDot(g, x, y, (1.5 + v * 6) * p.size, f);
    }
    g.norm();
    g.alpha(0.35);
    ctx.strokeStyle = g.col(0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R0, R0 * p.squash, 0, 0, TAU);
    ctx.stroke();
    g.alpha(1);
  },
);

def(
  'cyberGlobe',
  'Cyber Globe',
  'radial',
  {
    meridians: R('Меридианов', 14, 4, 32, 1),
    parallels: R('Параллелей', 8, 3, 20, 1),
    spin: R('Вращение', 0.5, -2, 2),
    tilt: R('Наклон', 0.4, 0, 1),
    thick: R('Толщина', 1.2, 0.4, 4, 0.1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const R0 = Math.min(w, h) * 0.36 * (1 + A.bass * 0.06);
    const M = Math.round(p.meridians * g.q),
      P2 = Math.round(p.parallels);
    const sq = 0.3 + p.tilt * 0.6;
    for (let i = 0; i < M; i++) {
      const f = i / M,
        v = A.b(f);
      const ph = f * Math.PI + g.t * p.spin * 0.4;
      const rx = Math.abs(Math.cos(ph)) * R0;
      g.alpha(0.12 + v * 0.7);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, R0, 0, 0, TAU);
      ctx.stroke();
    }
    for (let j = 1; j < P2; j++) {
      const f = j / P2,
        v = A.b(1 - f),
        y = cy + (f - 0.5) * 2 * R0 * sq;
      const rr = Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) * 2, 2))) * R0;
      g.alpha(0.12 + v * 0.6);
      ctx.strokeStyle = g.col(1 - f);
      ctx.lineWidth = p.thick;
      ctx.beginPath();
      ctx.ellipse(cx, y, rr, rr * sq * 0.4, 0, 0, TAU);
      ctx.stroke();
    }
    g.alpha(1);
  },
);

def(
  'vortex',
  'Vortex Tunnel',
  'radial',
  {
    arms: R('Рукавов', 4, 1, 12, 1),
    twist: R('Скрутка', 1.2, 0.2, 3),
    pts: R('Точек', 240, 60, 700, 5),
    pull: R('Втягивание', 0.8, 0, 2),
    size: R('Размер', 1, 0.3, 3),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const arms = Math.round(p.arms),
      n = Math.max(60, Math.round((p.pts * g.q) / arms));
    const Rm = Math.min(w, h) * 0.5;
    g.add();
    for (let a = 0; a < arms; a++) {
      for (let i = 0; i < n; i++) {
        const t = i / n,
          v = A.b(t);
        const ang = (a / arms) * TAU + t * p.twist * 6 + g.t * (1 + p.pull * (1 - t));
        const r = t * Rm * (1 + v * 0.3 * g.S.amp);
        g.alpha(0.15 + v * 0.7);
        glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.62, (1 + v * 6) * p.size, t);
      }
    }
    g.norm();
  },
);

def(
  'singularity',
  'Singularity',
  'radial',
  {
    disk: R('Диск', 0.16, 0.04, 0.4),
    spin: R('Вращение', 0.8, -2, 2),
    jets: R('Джеты', 0.6, 0, 1),
    dust: R('Пыль', 260, 60, 900, 10),
    warp: R('Искажение', 0.5, 0, 1.5),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const R0 = Math.min(w, h) * p.disk,
      n = Math.round(p.dust * g.q);
    const a = stars(g, n, 555);
    g.add();
    for (let i = 0; i < n; i++) {
      const seed = a[i * 4],
        f = a[i * 4 + 1],
        v = A.b(f);
      const ang = seed * TAU + g.t * p.spin * (1.6 - f);
      const r = R0 * (1.1 + f * 3.4) * (1 + v * p.warp * 0.4);
      g.alpha(0.1 + v * 0.6);
      glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.34, 1.5 + v * 5, f);
    }
    if (p.jets > 0.01) {
      for (let s = -1; s <= 1; s += 2) {
        const grd = ctx.createLinearGradient(cx, cy, cx, cy + s * h * 0.5);
        grd.addColorStop(0, Palette.rgba(1, 0.55 * p.jets * (0.4 + A.treble)));
        grd.addColorStop(1, Palette.rgba(0.3, 0));
        ctx.fillStyle = grd;
        const wd = R0 * (0.35 + A.treble * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx - wd, cy);
        ctx.lineTo(cx + wd, cy);
        ctx.lineTo(cx + wd * 3, cy + s * h * 0.5);
        ctx.lineTo(cx - wd * 3, cy + s * h * 0.5);
        ctx.fill();
      }
    }
    g.norm();
    g.alpha(1);
    ctx.fillStyle = g.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, R0 * (0.9 + A.bass * 0.12), 0, TAU);
    ctx.fill();
    g.alpha(0.8);
    ctx.strokeStyle = g.col(1);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
);

def(
  'wormhole',
  'Wormhole',
  'radial',
  {
    rings: R('Кольца', 22, 6, 48, 1),
    warp: R('Искажение', 0.8, 0, 2),
    speed: R('Скорость', 1, 0.2, 3),
    twist: R('Скрутка', 0.6, 0, 2),
    thick: R('Толщина', 1.6, 0.4, 5, 0.1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(6, Math.round(p.rings * g.q)),
      Rm = Math.min(w, h) * 0.62;
    for (let i = 0; i < n; i++) {
      const z = (i / n + ((g.t * p.speed * 0.18) % 1)) % 1;
      const v = A.b(1 - z),
        r = Math.pow(z, 1.7) * Rm * (1 + v * 0.3);
      const ox = Math.sin(g.t * 0.8 + z * 5) * p.warp * 40 * z;
      const oy = Math.cos(g.t * 0.6 + z * 4) * p.warp * 30 * z;
      g.alpha(clamp((1 - z) * (0.25 + v), 0, 1));
      ctx.strokeStyle = g.col(z);
      ctx.lineWidth = p.thick * (1 + v * 2);
      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.rotate(z * p.twist * 3 + g.t * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    g.alpha(1);
  },
);

def(
  'tunnel',
  'Neon Tunnel',
  'radial',
  {
    segs: R('Сегментов', 18, 6, 44, 1),
    sides: R('Граней', 6, 3, 16, 1),
    speed: R('Скорость', 1, 0.2, 3),
    spin: R('Вращение', 0.4, -2, 2),
    thick: R('Толщина', 2, 0.5, 6, 0.1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(6, Math.round(p.segs * g.q)),
      sides = Math.round(p.sides),
      Rm = Math.min(w, h) * 0.7;
    g.add();
    for (let i = 0; i < n; i++) {
      const z = (i / n + ((g.t * p.speed * 0.2) % 1)) % 1;
      const v = A.b(1 - z),
        r = Math.pow(z, 2) * Rm * (1 + v * 0.25);
      g.alpha(clamp((1 - z) * (0.2 + v * 0.9), 0, 1));
      ctx.strokeStyle = g.col(z);
      ctx.lineWidth = p.thick * (1 - z * 0.6);
      ring(ctx, cx, cy, r, sides, g.t * p.spin + z * 1.2);
      ctx.closePath();
      ctx.stroke();
    }
    g.norm();
  },
);
