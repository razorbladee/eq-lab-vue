import { VIS, VMAP } from '../visualizers.js';
import { TAU, mulberry, R, T, SEL, ring, glowDot, stars } from './utils.js';
import { clamp, lerp, Palette } from '../palette.js';
import { Audio } from '../audio.js';

const def = (id, name, group, params, draw, init) => {
  const v = { id, name, group, params, draw, init };
  VIS.push(v);
  VMAP[id] = v;
};

/* ==================== СПЕКТР ==================== */
def(
  'bars',
  'Spectrum Bars',
  'spectrum',
  {
    count: R('Полос', 64, 8, 192, 1),
    gap: R('Зазор', 0.22, 0, 0.9),
    round: R('Скругление', 0.35, 0, 1),
    curve: R('Кривая', 1.6, 0.5, 3),
    floorMix: R('Отражение', 0.35, 0, 1),
    peakCap: T('Пик-маркер', true),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(8, Math.round(p.count * g.q));
    const cw = w / n,
      bw = Math.max(1, cw * (1 - p.gap)),
      base = h * 0.72;
    const rr = ctx.roundRect ? Math.min(bw / 2, bw * p.round) : 0;
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = Math.pow(A.b(x), p.curve);
      const bh = v * base * g.S.amp,
        bx = i * cw + (cw - bw) / 2,
        y = h * 0.78 - bh;
      ctx.fillStyle = g.col(x);
      g.alpha(0.92);
      if (rr) {
        ctx.beginPath();
        ctx.roundRect(bx, y, bw, Math.max(1, bh), rr);
        ctx.fill();
      } else ctx.fillRect(bx, y, bw, Math.max(1, bh));
      if (p.floorMix > 0.01) {
        g.alpha(p.floorMix * 0.3);
        ctx.fillRect(bx, h * 0.78 + 2, bw, Math.max(1, bh * 0.45));
      }
      if (p.peakCap) {
        const pv = Math.pow(A.pk(x), p.curve);
        g.alpha(0.85);
        ctx.fillStyle = g.col(1 - x);
        ctx.fillRect(bx, h * 0.78 - pv * base * g.S.amp - 3, bw, 2);
      }
    }
    g.alpha(1);
  },
);

def(
  'glowbars',
  'Neon Glow Bars',
  'spectrum',
  {
    count: R('Полос', 48, 8, 128, 1),
    gap: R('Зазор', 0.3, 0, 0.8),
    bloom: R('Блум', 1, 0, 2),
    rise: R('Подъём', 0.4, 0.05, 1),
    cap: T('Шапка', true),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(8, Math.round(p.count * g.q));
    const cw = w / n,
      bw = Math.max(2, cw * (1 - p.gap));
    const st = g.st;
    if (!st.v || st.v.length !== n) st.v = new Float32Array(n);
    g.add();
    for (let i = 0; i < n; i++) {
      const x = i / n,
        target = A.b(x);
      st.v[i] += (target - st.v[i]) * clamp(g.dt * 60 * p.rise, 0.02, 1);
      const bh = st.v[i] * st.v[i] * h * 0.46 * g.S.amp,
        bx = i * cw + (cw - bw) / 2;
      if (p.bloom > 0.01) {
        const s = g.sprite(x),
          r = bw * (1 + p.bloom * 1.6);
        g.alpha(0.4 * p.bloom);
        ctx.drawImage(s, bx + bw / 2 - r / 2, cy - bh - r / 2, r, r);
        ctx.drawImage(s, bx + bw / 2 - r / 2, cy + bh - r / 2, r, r);
      }
      ctx.fillStyle = g.col(x);
      g.alpha(0.9);
      ctx.fillRect(bx, cy - bh, bw, bh * 2);
      if (p.cap) {
        g.alpha(1);
        ctx.fillStyle = g.col(1 - x);
        ctx.fillRect(bx, cy - bh - 2, bw, 2);
        ctx.fillRect(bx, cy + bh, bw, 2);
      }
    }
    g.norm();
  },
);

def(
  'mirror',
  'Mirror Spectrum',
  'spectrum',
  {
    count: R('Полос', 72, 16, 180, 1),
    split: R('Разделение', 0.5, 0, 1),
    tilt: R('Наклон', 0, -1, 1),
    gap: R('Зазор', 0.2, 0, 0.8),
    curve: R('Кривая', 1.4, 0.5, 3),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(16, Math.round(p.count * g.q));
    const cw = w / n,
      bw = Math.max(1, cw * (1 - p.gap)),
      mid = h * (0.2 + p.split * 0.6);
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = Math.pow(A.b(x < 0.5 ? x * 2 : (1 - x) * 2), p.curve);
      const up = v * h * 0.42 * g.S.amp,
        bx = i * cw,
        sk = (x - 0.5) * p.tilt * h * 0.12;
      ctx.fillStyle = g.col(x);
      g.alpha(0.9);
      ctx.fillRect(bx, mid - up + sk, bw, up);
      g.alpha(0.32);
      ctx.fillRect(bx, mid + sk, bw, up * 0.72);
    }
    g.alpha(1);
  },
);

def(
  'equalizer3d',
  '3D Equalizer',
  'spectrum',
  {
    cols: R('Колонок', 28, 8, 64, 1),
    depth: R('Глубина', 0.45, 0, 1),
    tilt: R('Скос', 0.4, 0, 1),
    leds: R('Сегментов', 14, 3, 32, 1),
    lit: T('Тень', true),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(8, Math.round(p.cols * g.q)),
      cw = (w / n) * 0.78;
    const dz = p.depth * 26,
      dy = -p.tilt * 20,
      seg = Math.max(3, Math.round(p.leds));
    for (let i = n - 1; i >= 0; i--) {
      const x = i / n,
        v = A.b(x),
        bx = i * (w / n) + 4;
      const lit = Math.round(v * seg);
      for (let s = 0; s < seg; s++) {
        const sh = (h * 0.5) / seg,
          y = h * 0.8 - s * sh;
        const on = s < lit;
        if (p.lit) {
          g.alpha(on ? 0.35 : 0.06);
          ctx.fillStyle = g.col(s / seg);
          ctx.beginPath();
          ctx.moveTo(bx + cw, y);
          ctx.lineTo(bx + cw + dz, y + dy);
          ctx.lineTo(bx + cw + dz, y + dy - sh * 0.8);
          ctx.lineTo(bx + cw, y - sh * 0.8);
          ctx.fill();
        }
        g.alpha(on ? 0.95 : 0.07);
        ctx.fillStyle = g.col(s / seg);
        ctx.fillRect(bx, y - sh * 0.8, cw, sh * 0.8);
      }
    }
    g.alpha(1);
  },
);

def(
  'spectrumCube',
  'Spectrum Cube',
  'spectrum',
  {
    cells: R('Ячеек', 10, 4, 22, 1),
    rot: R('Вращение', 0.3, -2, 2),
    tiltP: R('Перспектива', 0.5, 0, 1),
    wire: T('Каркас', true),
    lift: R('Подъём', 0.6, 0, 1.5),
  },
  (g) => {
    const { ctx, w, h, cx, cy, p, A } = g;
    const n = Math.max(4, Math.round(p.cells * g.q));
    const size = Math.min(w, h) * 0.62,
      cell = size / n,
      rot = g.t * p.rot;
    const ca = Math.cos(rot),
      sa = Math.sin(rot),
      sq = 0.35 + p.tiltP * 0.5;
    for (let iy = 0; iy < n; iy++)
      for (let ix = 0; ix < n; ix++) {
        const u = (ix / (n - 1) - 0.5) * size,
          vv = (iy / (n - 1) - 0.5) * size;
        const rx = u * ca - vv * sa,
          rz = u * sa + vv * ca;
        const val = A.b(Math.hypot(ix / n - 0.5, iy / n - 0.5) * 1.6);
        const px = cx + rx,
          py = cy + rz * sq - val * h * 0.28 * p.lift * g.S.amp;
        const s = cell * (0.5 + val * 0.8);
        ctx.fillStyle = g.col(val);
        g.alpha(0.28 + val * 0.7);
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        if (p.wire) {
          g.alpha(0.16);
          ctx.strokeStyle = g.col(1 - val);
          ctx.lineWidth = 0.8;
          ctx.strokeRect(px - cell / 2, py - cell / 2, cell, cell);
        }
      }
    g.alpha(1);
  },
);

def(
  'tower',
  'Neon Towers',
  'spectrum',
  {
    towers: R('Башен', 24, 8, 64, 1),
    segs: R('Секций', 14, 4, 32, 1),
    segGap: R('Зазор секций', 0.25, 0, 0.8),
    cap: T('Купол', true),
    sway: R('Качание', 0.3, 0, 1),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(8, Math.round(p.towers * g.q)),
      cw = (w / n) * 0.72;
    const seg = Math.max(4, Math.round(p.segs)),
      sh = (h * 0.62) / seg;
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x),
        lit = v * seg;
      const bx = i * (w / n) + (w / n - cw) / 2 + Math.sin(g.t * 1.4 + i * 0.4) * p.sway * 6;
      for (let s = 0; s < seg; s++) {
        const on = s < lit,
          y = h * 0.88 - s * sh;
        g.alpha(on ? 0.3 + (s / seg) * 0.7 : 0.06);
        ctx.fillStyle = g.col(s / seg);
        ctx.fillRect(bx, y - sh * (1 - p.segGap), cw, sh * (1 - p.segGap));
      }
      if (p.cap) {
        g.alpha(0.9);
        ctx.fillStyle = g.col(1);
        ctx.beginPath();
        ctx.arc(bx + cw / 2, h * 0.88 - lit * sh - 4, Math.max(1.5, cw * 0.22), 0, TAU);
        ctx.fill();
      }
    }
    g.alpha(1);
  },
);

def(
  'waterfall',
  'Spectrum Waterfall',
  'spectrum',
  {
    cols: R('Колонок', 96, 32, 192, 1),
    rows: R('Строк', 64, 24, 128, 1),
    scroll: R('Прокрутка', 1, 0.2, 4),
    contrast: R('Контраст', 1.4, 0.4, 3),
    smoothImg: T('Сглаживание', true),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const cols = Math.round(p.cols),
      rows = Math.round(p.rows),
      key = cols + 'x' + rows + Palette.rev;
    const st = g.st;
    if (st.key !== key) {
      st.key = key;
      st.oc = document.createElement('canvas');
      st.oc.width = cols;
      st.oc.height = rows;
      st.oct = st.oc.getContext('2d');
      st.img = st.oct.createImageData(cols, 1);
      st.row = 0;
      st.acc = 0;
    }
    st.acc += g.dt * 60 * p.scroll;
    while (st.acc >= 1) {
      st.acc -= 1;
      const d = st.img.data;
      for (let i = 0; i < cols; i++) {
        const v = clamp(Math.pow(A.b(i / cols), 1 / p.contrast), 0, 1);
        const idx = clamp((v * (STOPS - 1)) | 0, 0, STOPS - 1),
          o = i * 4;
        d[o] = Palette.r[idx];
        d[o + 1] = Palette.g[idx];
        d[o + 2] = Palette.b[idx];
        d[o + 3] = clamp(v * 300, 0, 255) | 0;
      }
      st.oct.putImageData(st.img, 0, st.row);
      st.row = (st.row + 1) % rows;
    }
    ctx.imageSmoothingEnabled = !!p.smoothImg;
    const top = rows - st.row;
    ctx.drawImage(st.oc, 0, st.row, cols, top, 0, 0, w, (h * top) / rows);
    if (st.row)
      ctx.drawImage(st.oc, 0, 0, cols, st.row, 0, (h * top) / rows, w, (h * st.row) / rows);
    ctx.imageSmoothingEnabled = true;
  },
);

def(
  'sparkline',
  'Sparkline Peaks',
  'spectrum',
  {
    points: R('Точек', 160, 32, 480, 1),
    tension: R('Сглаживание', 0.5, 0, 1),
    fill: R('Заливка', 0.35, 0, 1),
    dots: T('Пики точками', true),
    thick: R('Толщина', 2, 0.5, 6, 0.1),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(32, Math.round(p.points * g.q));
    const st = g.st;
    if (!st.v || st.v.length !== n) st.v = new Float32Array(n);
    const k = clamp(g.dt * lerp(60, 5, p.tension), 0.02, 1);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      st.v[i] += (A.b(x) - st.v[i]) * k;
      const y = h * 0.82 - st.v[i] * h * 0.64 * g.S.amp;
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    if (p.fill > 0.01) {
      ctx.save();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, Palette.rgba(0.8, p.fill * 0.55));
      grd.addColorStop(1, Palette.rgba(0.1, 0));
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = g.col(0.75);
    ctx.lineWidth = p.thick;
    g.alpha(0.95);
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (p.dots) {
      for (let i = 0; i < n; i += Math.max(1, (n / 40) | 0)) {
        const x = i / (n - 1),
          pv = A.pk(x);
        ctx.fillStyle = g.col(x);
        g.alpha(0.8);
        ctx.fillRect(x * w - 1.5, h * 0.82 - pv * h * 0.64 * g.S.amp - 1.5, 3, 3);
      }
    }
    g.alpha(1);
  },
);

def(
  'dots',
  'Dot Matrix',
  'spectrum',
  {
    cols: R('Колонок', 40, 12, 96, 1),
    rows: R('Строк', 10, 3, 26, 1),
    size: R('Размер', 1.2, 0.3, 3),
    falloff: R('Спад', 0.5, 0, 1),
    wave: R('Волна', 0.6, 0, 2),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const cx2 = Math.max(12, Math.round(p.cols * g.q)),
      ry = Math.max(3, Math.round(p.rows));
    const dw = w / cx2,
      dh = h / ry;
    for (let i = 0; i < cx2; i++) {
      const x = i / cx2,
        v = A.b(x);
      for (let j = 0; j < ry; j++) {
        const f = j / (ry - 1),
          lit = v * (1 + p.wave * Math.sin(g.t * 2 + i * 0.3)) - f * p.falloff;
        if (lit <= 0.02) {
          g.alpha(0.05);
        } else {
          g.alpha(clamp(lit, 0, 1));
        }
        const s = Math.max(1, dw * 0.34 * p.size * (lit > 0 ? 1 : 0.5));
        ctx.fillStyle = g.col(f);
        ctx.fillRect(i * dw + dw / 2 - s / 2, h - j * dh - dh / 2 - s / 2, s, s);
      }
    }
    g.alpha(1);
  },
);

def(
  'grid',
  'Laser Grid',
  'spectrum',
  {
    lines: R('Линий', 36, 8, 96, 1),
    spread: R('Разлёт', 0.6, 0.1, 1),
    beam: R('Луч', 1.6, 0.3, 6, 0.1),
    jitter: R('Джиттер', 0.2, 0, 1),
    cross: T('Поперечины', true),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(8, Math.round(p.lines * g.q));
    const rnd = mulberry(1337);
    g.add();
    ctx.lineWidth = p.beam;
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x),
        len = v * h * p.spread * g.S.amp;
      const jx = (rnd() - 0.5) * p.jitter * 16 * v;
      ctx.strokeStyle = g.col(x);
      g.alpha(0.2 + v * 0.8);
      ctx.beginPath();
      ctx.moveTo(x * w + jx, cy - len);
      ctx.lineTo(x * w + jx, cy + len);
      ctx.stroke();
    }
    if (p.cross) {
      for (let j = 1; j < 6; j++) {
        const y = cy + (j - 3) * h * 0.12;
        g.alpha(0.12);
        ctx.strokeStyle = g.col(j / 6);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
    g.norm();
  },
);

def(
  'shards',
  'Crystal Shards',
  'spectrum',
  {
    shards: R('Осколков', 40, 8, 120, 1),
    sharp: R('Острота', 0.5, 0.05, 1),
    skew: R('Скос', 0.3, -1, 1),
    outline: T('Обводка', true),
    depth: R('Глубина', 0.5, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(8, Math.round(p.shards * g.q)),
      cw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x),
        top = cy - v * h * 0.44 * g.S.amp;
      const bx = i * cw,
        sk = p.skew * cw * 2;
      ctx.beginPath();
      ctx.moveTo(bx, cy + v * h * 0.12 * p.depth);
      ctx.lineTo(bx + cw * p.sharp + sk, top);
      ctx.lineTo(bx + cw, cy - v * h * 0.1);
      ctx.closePath();
      ctx.fillStyle = g.col(x);
      g.alpha(0.28 + v * 0.6);
      ctx.fill();
      if (p.outline) {
        g.alpha(0.6);
        ctx.strokeStyle = g.col(1 - x);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    g.alpha(1);
  },
);

def(
  'glitch',
  'Glitch Spectrum',
  'spectrum',
  {
    slices: R('Срезов', 18, 4, 64, 1),
    shift: R('Сдвиг', 0.4, 0, 1),
    rgb: R('RGB-сплит', 0.5, 0, 1),
    tear: R('Разрывы', 0.3, 0, 1),
    block: R('Блок', 1, 0.2, 3),
  },
  (g) => {
    const { ctx, w, h, cy, p, A } = g;
    const n = Math.max(4, Math.round(p.slices));
    const rnd = mulberry(((g.t * 12) | 0) * 7919);
    g.add();
    for (let s = 0; s < n; s++) {
      const f = s / n,
        off = (rnd() - 0.5) * p.shift * w * 0.3 * (A.flux + 0.2);
      const sh = h / n,
        y = s * sh;
      for (let ch = 0; ch < 3; ch++) {
        const cOff = (ch - 1) * p.rgb * 12;
        g.alpha(0.36);
        ctx.fillStyle = g.col(ch / 2);
        for (let i = 0; i < 48; i++) {
          const x = i / 48,
            v = A.b(x * 0.9 + f * 0.1);
          if (rnd() < p.tear * 0.12) continue;
          ctx.fillRect(
            x * w + off + cOff,
            y,
            Math.max(1, (w / 48) * p.block),
            sh * clamp(v * 1.6, 0.05, 1),
          );
        }
      }
    }
    g.norm();
    g.alpha(1);
    void cy;
  },
);

def(
  'fire',
  'Bass Fire',
  'spectrum',
  {
    flames: R('Языков', 90, 20, 220, 1),
    turb: R('Турбулентность', 0.8, 0, 2),
    height: R('Высота', 0.6, 0.1, 1),
    embers: R('Искры', 60, 0, 300, 1),
    bassBoost: R('Низ', 1.2, 0, 3),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(20, Math.round(p.flames * g.q));
    g.add();
    for (let i = 0; i < n; i++) {
      const x = i / n,
        v = A.b(x * 0.55) * (1 + A.bass * p.bassBoost);
      const fh = v * h * p.height * g.S.amp;
      const sway = Math.sin(g.t * 3 + i * 0.5) * p.turb * 18 * v;
      ctx.beginPath();
      ctx.moveTo(x * w, h);
      ctx.quadraticCurveTo(x * w + sway, h - fh * 0.6, x * w + sway * 1.6, h - fh);
      ctx.strokeStyle = g.col(clamp(v, 0, 1));
      ctx.lineWidth = Math.max(1, (w / n) * 0.9);
      g.alpha(0.25 + v * 0.6);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    const em = Math.round(p.embers * g.q);
    if (em) {
      const st = g.st;
      if (!st.e || st.e.length !== em * 3) {
        st.e = new Float32Array(em * 3);
        const r = mulberry(99);
        for (let i = 0; i < em; i++) {
          st.e[i * 3] = r();
          st.e[i * 3 + 1] = r();
          st.e[i * 3 + 2] = 0.3 + r();
        }
      }
      for (let i = 0; i < em; i++) {
        st.e[i * 3 + 1] -= g.dt * (0.06 + A.bass * 0.3) * st.e[i * 3 + 2];
        if (st.e[i * 3 + 1] < 0) {
          st.e[i * 3 + 1] = 1;
          st.e[i * 3] = (st.e[i * 3] + 0.37) % 1;
        }
        const y = st.e[i * 3 + 1] * h;
        g.alpha(clamp(st.e[i * 3 + 1] * 0.8, 0, 0.8));
        glowDot(
          g,
          st.e[i * 3] * w + Math.sin(g.t * 2 + i) * 8,
          y,
          2 + A.bass * 4,
          1 - st.e[i * 3 + 1],
        );
      }
    }
    g.norm();
  },
);

def(
  'neoncity',
  'Neon City',
  'spectrum',
  {
    towers: R('Домов', 40, 12, 90, 1),
    windows: T('Окна', true),
    bloom: R('Блум', 1, 0, 2),
    depth: R('Глубина', 0.5, 0, 1),
    skyline: R('Линия неба', 0.55, 0.2, 0.9),
  },
  (g) => {
    const { ctx, w, h, p, A } = g;
    const n = Math.max(12, Math.round(p.towers * g.q)),
      cw = w / n;
    for (let pass = 0; pass < 2; pass++) {
      const back = pass === 0,
        sc = back ? 0.62 : 1,
        off = back ? cw * 0.5 : 0;
      if (!back || p.depth > 0.05)
        for (let i = 0; i < n; i++) {
          const x = i / n,
            v = A.b(back ? (x + 0.07) % 1 : x);
          const bh = (h * 0.12 + v * h * p.skyline) * sc * g.S.amp;
          const bx = i * cw + off;
          ctx.fillStyle = g.col(x);
          g.alpha(back ? 0.18 * p.depth : 0.55 + v * 0.4);
          ctx.fillRect(bx, h - bh, cw * 0.86, bh);
          if (p.bloom > 0.01 && !back) {
            const s = g.sprite(x),
              r = cw * (2 + p.bloom * 2);
            g.alpha(0.25 * p.bloom * v);
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(s, bx + cw * 0.43 - r / 2, h - bh - r / 2, r, r);
            ctx.globalCompositeOperation = 'source-over';
          }
          if (p.windows && !back) {
            g.alpha(0.8);
            ctx.fillStyle = g.col(1 - x);
            for (let y = h - bh + 6; y < h - 4; y += 9)
              for (let xx = bx + 3; xx < bx + cw * 0.8; xx += 7)
                if (((xx * 13 + y * 7) | 0) % 5 < 2 + v * 3) ctx.fillRect(xx, y, 2, 3);
          }
        }
    }
    g.alpha(1);
  },
);
