import { VIS, VMAP } from '../visualizers.js';
import { TAU, mulberry, R, T, SEL, ring, glowDot, stars } from './utils.js';
import { clamp, lerp, Palette } from '../palette.js';
import { Audio } from '../audio.js';

const def = (id, name, group, params, draw, init) => {
  const v = { id, name, group, params, draw, init };
  VIS.push(v);
  VMAP[id] = v;
};

/* ==================== ЧАСТИЦЫ ==================== */
def(
  'particles',
  'Particle Burst',
  'particles',
  {
    count: R('Частиц', 350, 40, 1400, 10),
    gravity: R('Гравитация', 0, -1, 1),
    spread: R('Разлёт', 1, 0.2, 3),
    size: R('Размер', 2.4, 0.5, 9, 0.1),
    life: R('Жизнь', 1, 0.2, 3),
    burst: R('Взрыв на бит', 1, 0, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(40, Math.round(p.count * g.q)),
      st = g.st;
    if (!st.a || st.n !== n) {
      st.a = new Float32Array(n * 5);
      st.n = n;
      const r = mulberry(7);
      for (let i = 0; i < n; i++) st.a[i * 5 + 4] = r();
    }
    const a = st.a,
      boost = 1 + A.beat * p.burst * 2.2;
    g.add();
    for (let i = 0; i < n; i++) {
      const o = i * 5;
      let x = a[o],
        y = a[o + 1],
        vx = a[o + 2],
        vy = a[o + 3],
        life = a[o + 4];
      life -= g.dt / Math.max(0.15, p.life);
      if (life <= 0 || x < -40 || x > w + 40 || y < -40 || y > h + 40) {
        const ang = Math.random() * TAU,
          sp = (30 + Math.random() * 220) * p.spread * boost;
        x = cx;
        y = cy;
        vx = Math.cos(ang) * sp;
        vy = Math.sin(ang) * sp;
        life = 1;
      }
      const v = A.b(i / n);
      vy += p.gravity * 220 * g.dt;
      vx *= 1 - g.dt * 0.6;
      vy *= 1 - g.dt * 0.6;
      x += vx * g.dt * (1 + v * 2.2) * g.S.speed;
      y += vy * g.dt * (1 + v * 2.2) * g.S.speed;
      a[o] = x;
      a[o + 1] = y;
      a[o + 2] = vx;
      a[o + 3] = vy;
      a[o + 4] = life;
      g.alpha(clamp(life * (0.25 + v), 0, 1));
      glowDot(g, x, y, (1 + v * 4) * p.size, i / n);
    }
    g.norm();
  },
);

def(
  'galaxy',
  'Galaxy Field',
  'particles',
  {
    stars: R('Звёзд', 600, 80, 1600, 10),
    arms: R('Рукавов', 3, 1, 8, 1),
    spin: R('Вращение', 0.25, -1, 1),
    twinkle: R('Мерцание', 0.5, 0, 1),
    size: R('Размер', 1, 0.3, 3),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.round(p.stars * g.q),
      a = stars(g, n, 31337);
    const arms = Math.round(p.arms),
      Rm = Math.min(w, h) * 0.48;
    g.add();
    for (let i = 0; i < n; i++) {
      const t = a[i * 4],
        jitter = a[i * 4 + 1] - 0.5,
        arm = (a[i * 4 + 2] * arms) | 0;
      const v = A.b(t);
      const ang = t * 4.2 + (arm / arms) * TAU + g.t * p.spin + jitter * 0.5;
      const r = t * Rm * (1 + v * 0.2);
      const tw = 1 - p.twinkle * 0.5 * (0.5 + 0.5 * Math.sin(g.t * 6 + i));
      g.alpha(clamp((0.12 + v * 0.8) * tw, 0, 1));
      glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.55, (1 + v * 5) * p.size, t);
    }
    g.norm();
  },
);

def(
  'particleGalaxy',
  'Particle Galaxy',
  'particles',
  {
    count: R('Частиц', 500, 80, 1400, 10),
    orbit: R('Орбита', 1, 0.2, 3),
    cluster: R('Кучность', 0.5, 0, 1),
    size: R('Размер', 1.8, 0.3, 6, 0.1),
    bassPull: R('Тяга низа', 0.8, 0, 2),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.round(p.count * g.q),
      a = stars(g, n, 909);
    const Rm = Math.min(w, h) * 0.46;
    g.add();
    for (let i = 0; i < n; i++) {
      const seed = a[i * 4],
        band = a[i * 4 + 1],
        v = A.b(band);
      const rad = Math.pow(seed, 1 + p.cluster * 1.6) * Rm;
      const speed = p.orbit * (1.6 - seed) * (1 + A.level);
      const ang = seed * TAU + g.t * speed;
      const pull = 1 - A.bass * p.bassPull * 0.22;
      g.alpha(0.12 + v * 0.8);
      glowDot(
        g,
        cx + Math.cos(ang) * rad * pull,
        cy + Math.sin(ang) * rad * pull * 0.72,
        (1 + v * 5) * p.size,
        band,
      );
    }
    g.norm();
  },
);

def(
  'constellation',
  'Constellation',
  'particles',
  {
    nodes: R('Узлов', 110, 20, 320, 1),
    link: R('Дистанция связи', 90, 20, 240, 1),
    drift: R('Дрейф', 0.5, 0, 2),
    size: R('Размер', 2, 0.5, 6, 0.1),
    fill: T('Заливка треугольников', false),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.round(p.nodes * g.q),
      a = stars(g, n, 6060);
    const st = g.st;
    if (!st.px || st.px.length !== n * 2) st.px = new Float32Array(n * 2);
    const px = st.px;
    for (let i = 0; i < n; i++) {
      const v = A.b(a[i * 4 + 2]);
      px[i * 2] = (a[i * 4] * w + Math.sin(g.t * p.drift * 0.7 + i) * 30 * (1 + v)) % w;
      px[i * 2 + 1] = a[i * 4 + 1] * h + Math.cos(g.t * p.drift * 0.6 + i * 1.3) * 26 * (1 + v * 2);
    }
    ctx.lineWidth = 1;
    const dmax = p.link,
      d2 = dmax * dmax;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < Math.min(n, i + 9); j++) {
        const dx = px[i * 2] - px[j * 2],
          dy = px[i * 2 + 1] - px[j * 2 + 1],
          dd = dx * dx + dy * dy;
        if (dd > d2) continue;
        g.alpha((1 - dd / d2) * 0.35);
        ctx.strokeStyle = g.col(i / n);
        ctx.beginPath();
        ctx.moveTo(px[i * 2], px[i * 2 + 1]);
        ctx.lineTo(px[j * 2], px[j * 2 + 1]);
        ctx.stroke();
        if (p.fill && j === i + 2) {
          g.alpha(0.05);
          ctx.fillStyle = g.col(i / n);
          ctx.fill();
        }
      }
    }
    g.add();
    for (let i = 0; i < n; i++) {
      const v = A.b(a[i * 4 + 2]);
      g.alpha(0.3 + v * 0.7);
      glowDot(g, px[i * 2], px[i * 2 + 1], (1 + v * 4) * p.size, a[i * 4 + 2]);
    }
    g.norm();
  },
);

def(
  'nebula',
  'Nebula Dust',
  'particles',
  {
    puffs: R('Облаков', 120, 20, 320, 1),
    size: R('Размер', 24, 4, 80, 1),
    drift: R('Дрейф', 0.5, 0, 2),
    depth: R('Глубина', 0.5, 0, 1),
    bright: R('Яркость', 0.6, 0.1, 1.5),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.round(p.puffs * g.q),
      a = stars(g, n, 4711);
    g.add();
    for (let i = 0; i < n; i++) {
      const f = a[i * 4 + 2],
        v = A.b(f),
        z = a[i * 4 + 3];
      const x = (a[i * 4] * w + Math.sin(g.t * p.drift * 0.3 + i) * 40 * z) % w;
      const y = a[i * 4 + 1] * h + Math.cos(g.t * p.drift * 0.25 + i) * 30 * z;
      const s = p.size * (0.4 + z * p.depth * 2) * (0.6 + v * 1.4);
      g.alpha(clamp((0.05 + v * 0.3) * p.bright, 0, 0.6));
      glowDot(g, x, y, s, f);
    }
    g.norm();
  },
);

def(
  'meteor',
  'Meteor Shower',
  'particles',
  {
    count: R('Метеоров', 60, 8, 220, 1),
    speed: R('Скорость', 1, 0.2, 3),
    angle: R('Угол', 0.4, -1, 1),
    tail: R('Хвост', 70, 10, 240, 1),
    thick: R('Толщина', 1.6, 0.4, 5, 0.1),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.round(p.count * g.q),
      a = stars(g, n, 8123);
    const dx = Math.cos(p.angle * 1.2),
      dy = Math.sin(p.angle * 1.2) + 0.8;
    g.add();
    for (let i = 0; i < n; i++) {
      const f = a[i * 4 + 2],
        v = A.b(f),
        sp = (0.05 + a[i * 4 + 3] * 0.2) * p.speed * (1 + v * 2.4);
      const prog = ((a[i * 4] + g.t * sp) % 1.2) - 0.1;
      const x = prog * w * 1.3 * dx + a[i * 4 + 1] * w - w * 0.15;
      const y = prog * h * 1.3 * dy;
      const L = p.tail * (0.4 + v * 1.6);
      g.alpha(0.2 + v * 0.8);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick * (0.5 + v);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - L * dx, y - L * dy);
      ctx.stroke();
      glowDot(g, x, y, 2 + v * 7, f);
    }
    g.norm();
  },
);

def(
  'quantum',
  'Quantum Threads',
  'particles',
  {
    threads: R('Нитей', 18, 4, 48, 1),
    jitter: R('Дрожь', 0.4, 0, 1),
    links: T('Связи', true),
    phase: R('Фаза', 0.7, 0, 2),
    thick: R('Толщина', 1.3, 0.4, 4, 0.1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(4, Math.round(p.threads * g.q));
    const st = g.st;
    if (!st.pts || st.n !== n) {
      st.pts = new Float32Array(n * 24);
      st.n = n;
    }
    g.add();
    for (let l = 0; l < n; l++) {
      const f = l / n;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const x = i / 23,
          v = A.b(x * 0.8 + f * 0.2);
        const y =
          cy +
          Math.sin(x * 8 + f * 5 + g.t * p.phase * 3) * (v * h * 0.3 + 10) * g.S.amp +
          (f - 0.5) * h * 0.5 +
          Math.sin(g.t * 20 + i * 3 + l) * p.jitter * 10 * v;
        st.pts[l * 24 + i] = y;
        i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
      }
      g.alpha(0.2 + A.b(f) * 0.7);
      ctx.strokeStyle = g.col(f);
      ctx.lineWidth = p.thick;
      ctx.stroke();
    }
    if (p.links) {
      ctx.lineWidth = 0.8;
      for (let l = 0; l < n - 1; l++)
        for (let i = 0; i < 24; i += 4) {
          g.alpha(0.1);
          ctx.strokeStyle = g.col(l / n);
          ctx.beginPath();
          ctx.moveTo((i / 23) * w, st.pts[l * 24 + i]);
          ctx.lineTo((i / 23) * w, st.pts[(l + 1) * 24 + i]);
          ctx.stroke();
        }
    }
    g.norm();
  },
);

def(
  'waveMesh',
  'Wave Mesh',
  'particles',
  {
    rows: R('Строк', 16, 4, 40, 1),
    cols: R('Колонок', 32, 8, 80, 1),
    amp: R('Амплитуда', 0.8, 0, 2),
    persp: R('Перспектива', 0.5, 0, 1),
    thick: R('Толщина', 1, 0.3, 3, 0.1),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const R2 = Math.max(4, Math.round(p.rows * g.q)),
      C = Math.max(8, Math.round(p.cols * g.q));
    const st = g.st;
    const need = R2 * C;
    if (!st.z || st.z.length !== need) st.z = new Float32Array(need);
    // сдвигаем историю вглубь: строка 0 — новая
    for (let r = R2 - 1; r > 0; r--) st.z.copyWithin(r * C, (r - 1) * C, r * C);
    for (let c = 0; c < C; c++) st.z[c] = A.b(c / C);
    ctx.lineWidth = p.thick;
    for (let r = R2 - 1; r >= 0; r--) {
      const f = r / R2,
        z = 1 - f * p.persp * 0.72;
      const y0 = h * (0.28 + f * 0.62);
      ctx.beginPath();
      for (let c = 0; c < C; c++) {
        const x = lerp(w * 0.5, (c / (C - 1)) * w, z);
        const y = y0 - st.z[r * C + c] * h * 0.26 * p.amp * g.S.amp;
        c ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      g.alpha(0.12 + (1 - f) * 0.7);
      ctx.strokeStyle = g.col(1 - f);
      ctx.stroke();
    }
    g.alpha(1);
  },
);
