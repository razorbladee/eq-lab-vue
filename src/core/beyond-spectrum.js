import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
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
const label = (g, t, x, y, c = 0.5) => {
  g.ctx.font = '700 9px Space Mono,monospace';
  g.alpha(0.7);
  g.ctx.fillStyle = g.col(c);
  g.ctx.fillText(t, x, y);
};

const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const add = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'beyond-spectrum', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};
const fade = (g) => {
  g.ctx.fillStyle = g.bg;
  g.ctx.globalAlpha = 0.16;
  g.ctx.fillRect(0, 0, g.w, g.h);
  g.ctx.globalAlpha = 1;
};
const dot = (g, x, y, r, c, a = 0.7) => {
  g.alpha(a);
  g.ctx.fillStyle = g.col(c);
  g.ctx.beginPath();
  g.ctx.arc(x, y, r, 0, TAU);
  g.ctx.fill();
};
const fieldDots = (g, n, seed = 1) => {
  for (let i = 0; i < n * g.q; i++) {
    const f = (i * 0.61803398875 + seed * 0.11) % 1,
      x = f * g.w,
      y = ((i * 0.371 + seed) % 1) * g.h;
    dot(g, x, y, 1 + g.A.b(f) * 3, f, 0.08 + g.A.b(f) * 0.25);
  }
};

add(
  'beyondReaction',
  'BEYOND // Reaction Diffusion',
  {
    cells: R('Разрешение', 72, 24, 128, 4),
    iterations: R('Итерации', 4, 1, 12, 1),
    feed: R('Питание', 0.055, 0.01, 0.1),
    kill: R('Стабилизация', 0.062, 0.03, 0.09),
    contrast: R('Контраст', 1.5, 0.5, 3),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(20, Math.round(p.cells * Math.sqrt(g.q))),
      st = g.st;
    if (!st.a || st.n !== n) {
      st.n = n;
      st.a = new Float32Array(n * n);
      st.b = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) st.a[i] = 0.92;
    }
    for (let k = 0; k < p.iterations; k++) {
      for (let y = 1; y < n - 1; y++)
        for (let x = 1; x < n - 1; x++) {
          const i = y * n + x,
            source = A.b(x / n) * 0.08 + A.beat * 0.06,
            u = st.a[i],
            v = st.b[i],
            lap = st.b[i - 1] + st.b[i + 1] + st.b[i - n] + st.b[i + n] - 4 * v;
          st.b[i] = clamp(v + (0.16 * lap + source - u * v * v + p.feed * (1 - v)) * 1.1, 0, 1);
          st.a[i] = clamp(
            u +
              (0.08 * (st.a[i - 1] + st.a[i + 1] + st.a[i - n] + st.a[i + n] - 4 * u) -
                u * v * v +
                (1 - u) * 0.01),
            0,
            1,
          );
        }
    }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = Math.pow(clamp(st.b[y * n + x], 0, 1), 1 / p.contrast);
        g.alpha(0.03 + v * 0.9);
        ctx.fillStyle = g.col((x / n + v * 0.35) % 1);
        ctx.fillRect((x * w) / n, (y * h) / n, Math.ceil(w / n + 1), Math.ceil(h / n + 1));
      }
    g.norm();
  },
);

add(
  'beyondCurl',
  'BEYOND // Curl Noise Flow',
  {
    particles: R('Потоков', 900, 180, 2200, 20),
    speed: R('Скорость', 0.8, 0.1, 2),
    curl: R('Закрутка', 1, 0.1, 3),
    trail: R('Шлейф', 0.82, 0.1, 0.98),
    turbulence: R('Турбулентность', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      st = g.st,
      n = Math.max(80, Math.round(p.particles * g.q));
    if (!st.x || st.n !== n) {
      st.n = n;
      st.x = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        st.x[i * 3] = Math.random() * w;
        st.x[i * 3 + 1] = Math.random() * h;
        st.x[i * 3 + 2] = Math.random();
      }
    }
    ctx.globalAlpha = 1 - p.trail;
    ctx.fillStyle = g.bg;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const o = i * 3,
        x = st.x[o],
        y = st.x[o + 1],
        f = st.x[o + 2],
        v = A.b(f),
        a = Math.sin(x * 0.012 + g.t * p.turbulence) + Math.cos(y * 0.015 - g.t) * p.curl,
        ang = a * 2.4 + v * 3;
      st.x[o] = (x + Math.cos(ang) * (1 + v * 8) * p.speed + w) % w;
      st.x[o + 1] = (y + Math.sin(ang) * (1 + v * 8) * p.speed + h) % h;
      st.x[o + 2] = (f + 0.001) % 1;
      dot(g, st.x[o], st.x[o + 1], 0.7 + v * 2.5, f, 0.15 + v * 0.6);
    }
    g.norm();
  },
);

add(
  'beyondLorenz',
  'BEYOND // Lorenz Attractor',
  {
    particles: R('Частиц', 520, 80, 1200, 10),
    chaos: R('Хаос', 1, 0.1, 2),
    depth: R('Глубина', 0.7, 0.1, 1.5),
    beatPush: R('Импульс бита', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      st = g.st,
      n = Math.max(40, Math.round(p.particles * g.q));
    if (!st.a || st.n !== n) {
      st.n = n;
      st.a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        st.a[i * 3] = (i / n - 0.5) * 0.4;
        st.a[i * 3 + 1] = 0;
        st.a[i * 3 + 2] = 1;
      }
    }
    g.add();
    for (let i = 0; i < n; i++) {
      const o = i * 3,
        x = st.a[o],
        y = st.a[o + 1],
        z = st.a[o + 2],
        dt = 0.012 * p.chaos * (1 + A.beat * p.beatPush);
      st.a[o] += 10 * (y - x) * dt;
      st.a[o + 1] += (x * (28 - z) - y) * dt;
      st.a[o + 2] += (x * y - (8 * z) / 3) * dt;
      const sx = w * 0.5 + st.a[o] * w * 0.022,
        sy = h * 0.5 + (st.a[o + 2] - 28) * h * 0.018 * p.depth;
      dot(g, sx, sy, 1 + A.b(i / n) * 3, i / n, 0.08 + A.b(i / n) * 0.55);
    }
    g.norm();
  },
);

add(
  'beyondVoronoi',
  'BEYOND // Voronoi Pulse Field',
  {
    sites: R('Ячеек', 48, 12, 120, 1),
    pulse: R('Пульсация', 1, 0.1, 3),
    jitter: R('Дрейф', 0.5, 0, 2),
    edges: T('Рёбра', true),
    labels: T('Сигналы', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      st = g.st,
      n = Math.max(12, Math.round(p.sites * g.q));
    if (!st.s || st.n !== n) {
      st.n = n;
      st.s = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        st.s[i * 3] = Math.random();
        st.s[i * 3 + 1] = Math.random();
        st.s[i * 3 + 2] = Math.random();
      }
    }
    for (let y = 0; y < Math.round(h / 12); y++)
      for (let x = 0; x < Math.round(w / 12); x++) {
        let best = 1e9,
          second = 1e9,
          bi = 0;
        for (let i = 0; i < n; i++) {
          const sx = st.s[i * 3] * w,
            sy = st.s[i * 3 + 1] * h,
            dd = (x * 12 - sx) ** 2 + (y * 12 - sy) ** 2;
          if (dd < best) {
            second = best;
            best = dd;
            bi = i;
          } else if (dd < second) second = dd;
        }
        const f = bi / n,
          v = A.b(f),
          edge = clamp(1 - Math.abs(Math.sqrt(second) - Math.sqrt(best)) / 18, 0, 1);
        g.alpha(0.04 + v * 0.45 + edge * 0.25);
        ctx.fillStyle = g.col((f + g.t * 0.03) % 1);
        ctx.fillRect(x * 12, y * 12, 13, 13);
      }
    for (let i = 0; i < n; i++) {
      const f = i / n,
        v = A.b(f),
        x = st.s[i * 3] * w,
        y = st.s[i * 3 + 1] * h;
      st.s[i * 3] += Math.sin(g.t * 0.5 + i) * p.jitter * 0.0004;
      st.s[i * 3 + 1] += Math.cos(g.t * 0.4 + i) * p.jitter * 0.0004;
      dot(g, x, y, 2 + v * 10, f, 0.4 + v * 0.5);
    }
    g.norm();
  },
);

add(
  'beyondMetaballs',
  'BEYOND // Metaball Fluid',
  {
    blobs: R('Сгустков', 12, 3, 28, 1),
    resolution: R('Деталь', 72, 24, 120, 4),
    viscosity: R('Вязкость', 0.7, 0.1, 1.6),
    pulse: R('Пульс', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, A, p } = g;
    const b = Array.from({ length: p.blobs }, (_, i) => {
      const f = i / p.blobs;
      return {
        x: w * (0.12 + f * 0.76),
        y: h * (0.5 + Math.sin(g.t * (0.4 + f) + i) * 0.28),
        r: Math.min(w, h) * (0.04 + A.b(f) * 0.12 * p.pulse),
      };
    });
    const step = Math.max(5, Math.round((12 / p.resolution) * 72));
    for (let y = 0; y < h; y += step)
      for (let x = 0; x < w; x += step) {
        let sum = 0;
        for (const q of b) sum += (q.r * q.r) / ((x - q.x) ** 2 + (y - q.y) ** 2 + 20);
        const v = clamp(sum * 0.36, 0, 1);
        if (v > 0.18) {
          g.alpha(v * 0.8);
          ctx.fillStyle = g.col((x / w + g.t * 0.04) % 1);
          ctx.fillRect(x, y, step + 1, step + 1);
        }
      }
    g.norm();
  },
);

add(
  'beyondCells',
  'BEYOND // Cellular Bloom',
  {
    size: R('Клеток', 64, 24, 110, 2),
    steps: R('Шагов', 3, 1, 8, 1),
    decay: R('Распад', 0.92, 0.7, 0.99),
    seed: R('Сиды', 7, 1, 20, 1),
    glow: T('Свечение', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g,
      n = Math.max(20, Math.round(p.size * Math.sqrt(g.q))),
      st = g.st;
    if (!st.a || st.n !== n) {
      st.n = n;
      st.a = new Uint8Array(n * n);
      for (let i = 0; i < n * n; i++) st.a[i] = Math.random() > 0.78 ? 1 : 0;
    }
    for (let s = 0; s < p.steps; s++) {
      const b = new Uint8Array(n * n);
      for (let y = 1; y < n - 1; y++)
        for (let x = 1; x < n - 1; x++) {
          const i = y * n + x,
            c =
              st.a[i - 1] +
              st.a[i + 1] +
              st.a[i - n] +
              st.a[i + n] +
              st.a[i - n - 1] +
              st.a[i - n + 1] +
              st.a[i + n - 1] +
              st.a[i + n + 1];
          b[i] = c === 3 || (c === 2 && st.a[i]) ? 1 : 0;
        }
      st.a = b;
    }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = st.a[y * n + x] * A.b(x / n);
        if (v) {
          g.alpha(0.18 + v * 0.8);
          ctx.fillStyle = g.col((x / n + g.t * 0.02) % 1);
          ctx.fillRect((x * w) / n, (y * h) / n, Math.ceil(w / n + 1), Math.ceil(h / n + 1));
          if (p.glow) {
            g.alpha(0.08);
            ctx.fillRect((x * w) / n - 3, (y * h) / n - 3, w / n + 7, h / n + 7);
          }
        }
      }
    g.norm();
  },
);

add(
  'beyondRaymarch',
  'BEYOND // Audio Raymarch',
  {
    rings: R('Слоёв', 34, 10, 70, 1),
    depth: R('Глубина', 1, 0.2, 2),
    twist: R('Скрутка', 0.8, -2, 2),
    beat: R('Удар', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p } = g;
    g.add();
    for (let i = p.rings; i > 0; i--) {
      const z = i / p.rings,
        v = A.b(z),
        r = Math.min(w, h) * (0.04 + z * 0.48) * (1 + v * 0.18),
        a = g.t * p.twist + z * 4;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.sin(g.t + z * 5) * w * 0.08 * z,
        cy + Math.cos(g.t * 0.7 + z) * h * 0.05 * z,
        r,
        r * (0.42 + z * 0.4),
        a,
        0,
        TAU,
      );
      g.alpha(0.03 + (1 - z) * 0.45 + v * 0.3);
      ctx.strokeStyle = g.col((z + g.t * 0.03) % 1);
      ctx.lineWidth = 1 + (1 - z) * 2 + A.beat * p.beat;
      ctx.stroke();
    }
    g.norm();
  },
);

add(
  'beyondSmoke',
  'BEYOND // Chromatic Smoke',
  {
    ribbons: R('Дымовых лент', 18, 5, 42, 1),
    samples: R('Сэмплов', 180, 60, 420, 1),
    curl: R('Закрутка', 1, 0.1, 3),
    haze: R('Туман', 0.7, 0, 1.5),
  },
  (g) => {
    const { w, h, A, p } = g;
    for (let l = 0; l < p.ribbons; l++) {
      const f = l / Math.max(1, p.ribbons - 1),
        pts = [];
      for (let i = 0; i <= p.samples; i++) {
        const x = i / p.samples,
          v = A.b((x + f * 0.2) % 1),
          y =
            h * 0.5 +
            Math.sin(x * 5 + g.t * p.curl + f * 8) * h * (0.08 + v * 0.18) +
            Math.sin(x * 18 - g.t + f) * h * 0.04;
        pts.push([x * w, y + (f - 0.5) * h * 0.18]);
      }
      glowPath(
        g,
        pts,
        g.col((f + g.t * 0.02) % 1),
        0.7 + (1 - f) * 1.7,
        0.05 + (1 - f) * 0.25 * p.haze,
      );
    }
    fieldDots(g, 240, 4);
    g.norm();
  },
);

add(
  'beyondTopography',
  'BEYOND // Topographic Heatfield',
  {
    contours: R('Контуров', 30, 8, 70, 1),
    samples: R('Сэмплов', 180, 60, 420, 1),
    elevation: R('Рельеф', 0.8, 0.1, 2),
    labels: T('Координаты', true),
  },
  (g) => {
    const { ctx, w, h, A, p } = g;
    for (let c = 0; c < p.contours; c++) {
      const z = c / p.contours,
        pts = [];
      for (let i = 0; i <= p.samples; i++) {
        const f = i / p.samples,
          heat = A.b((f + z * 0.14) % 1),
          y =
            h * (0.16 + z * 0.7) +
            Math.sin(f * 9 + g.t * 0.6 + z * 4) * h * (0.03 + heat * 0.14) * p.elevation;
        pts.push([f * w, y]);
      }
      glowPath(g, pts, g.col((z + heatHue(g, z)) % 1), 0.7 + heat(A, z), 0.08 + heat(A, z) * 0.45);
    }
    if (p.labels) {
      label(g, 'FIELD 07', w * 0.07, h * 0.12, 0.12);
      label(g, 'X 04.882 / Y 11.420', w * 0.67, h * 0.12, 0.88);
    }
    g.norm();
  },
);

function heat(A, g) {
  return (A.b(g) % 1) * 0.9 + 0.5;
}
function heatHue(A, g) {
  return A.b(g * 0.73) * 0.2;
}
