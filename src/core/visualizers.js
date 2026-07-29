import { clamp, lerp, Palette } from './palette.js';
import { Audio } from './audio.js';
const TAU = Math.PI * 2;
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = (label, def, min, max, step = .01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const SEL = (label, def, options) => ({ label, def, type: 'select', options });

/* ------------------------------------------------------------------
   5. РЕЕСТР ВИЗУАЛИЗАТОРОВ
   Каждый: свои параметры + своя логика чтения звука.
   g = {ctx,w,h,cx,cy,t,dt,q,A,S,p,st,col,rgba,sprite,alpha,add,norm,rng}
   ------------------------------------------------------------------ */
const VIS = [];
const def = (id, name, group, params, draw, init) => VIS.push({ id, name, group, params, draw, init });

/* ---------- helpers для рисования ---------- */
function ring(ctx, cx, cy, r, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = i / sides * TAU + rot;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}
function glowDot(g, x, y, r, cx) {
  const s = g.sprite(cx);
  g.ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
}
function stars(g, n, seed) {
  const st = g.st, key = n + ':' + seed + ':' + (g.w | 0) + 'x' + (g.h | 0);
  if (st.key !== key) {
    const rnd = mulberry(seed);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      a[i * 4] = rnd(); a[i * 4 + 1] = rnd(); a[i * 4 + 2] = rnd(); a[i * 4 + 3] = rnd();
    }
    st.key = key; st.a = a; st.n = n;
  }
  return st.a;
}

/* ==================== ВОЛНЫ ==================== */
def('wave', 'Neon Waveform', 'waves', {
  layers: R('Слои', 9, 1, 24, 1), spread: R('Разброс', .34, 0, 1),
  wobble: R('Дрожь', .5, 0, 2), thick: R('Толщина', 2, .4, 8, .1),
  glow: R('Свечение', .55, 0, 1), mirrored: T('Зеркало', true)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const L = Math.max(1, Math.round(p.layers * g.q)), step = Math.max(2, (10 / g.q) | 0);
  ctx.lineCap = 'round';
  if (p.glow > .01) { g.add(); }
  for (let l = 0; l < L; l++) {
    const f = l / L, amp = h * .34 * (1 - f * p.spread) * g.S.amp;
    ctx.beginPath();
    for (let i = 0; i <= 512; i += 1) {
      const x = i / 512 * w;
      const y = cy + A.w(i / 512) * amp
        + Math.sin(i * .05 + g.t * 2 + l * .8) * p.wobble * 9 * (1 + f);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = g.col(f);
    ctx.lineWidth = p.thick * (1 - f * .55);
    g.alpha(lerp(.9, .13, f) * (1 - p.glow * .3));
    ctx.stroke();
    if (p.mirrored) { ctx.save(); ctx.translate(0, cy * 2); ctx.scale(1, -1); ctx.globalAlpha *= .4; ctx.stroke(); ctx.restore(); }
  }
  g.norm();
  void step;
});

def('aurora', 'Aurora Flow', 'waves', {
  sheets: R('Полотна', 14, 3, 34, 1), drift: R('Дрейф', .6, 0, 2),
  height: R('Высота', .45, .05, 1), veil: R('Вуаль', .5, 0, 1), tilt: R('Наклон', .3, -1, 1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const S = Math.max(3, Math.round(p.sheets * g.q));
  g.add();
  for (let l = 0; l < S; l++) {
    const f = l / S;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    for (let i = 0; i <= 96; i++) {
      const x = i / 96, v = A.b(x * .8 + f * .12);
      const y = cy + Math.sin(x * 7 + f * 2.4 + g.t * p.drift * 1.6) * v * h * p.height
        + (f - .5) * h * .5 * p.veil + x * p.tilt * h * .18;
      ctx.lineTo(x * w, y);
    }
    ctx.lineTo(w, cy);
    g.alpha(.05 + A.level * .1);
    ctx.fillStyle = g.col(f);
    ctx.fill();
    g.alpha(.22);
    ctx.strokeStyle = g.col(1 - f); ctx.lineWidth = 1; ctx.stroke();
  }
  g.norm();
});

def('ribbon', 'Prismatic Ribbon', 'waves', {
  width: R('Ширина', 14, 2, 46, .5), twist: R('Скрутка', 1, 0, 3),
  segs: R('Сегменты', 180, 32, 420, 1), split: R('Хром. сдвиг', .5, 0, 1), speed: R('Ход', 1, 0, 3)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(32, Math.round(p.segs * g.q));
  g.add();
  for (let ch = 0; ch < 3; ch++) {
    const off = (ch - 1) * p.split * 14;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      const y = cy + A.w(x) * h * .3 * g.S.amp + Math.sin(x * 9 * p.twist + g.t * p.speed * 2) * h * .1 + off;
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    ctx.lineWidth = p.width * (1 - Math.abs(ch - 1) * .35);
    ctx.strokeStyle = g.col(ch / 2);
    g.alpha(ch === 1 ? .55 : .3);
    ctx.lineJoin = 'round'; ctx.stroke();
  }
  ctx.lineWidth = Math.max(1, p.width * .16); ctx.strokeStyle = g.col(.5); g.alpha(.95); ctx.stroke();
  g.norm();
});

def('holoWave', 'Holographic Wave', 'waves', {
  sheets: R('Листы', 18, 4, 40, 1), tilt: R('Наклон', .4, 0, 1),
  scan: R('Скан-линии', .4, 0, 1), phase: R('Фаза', .6, 0, 2), depth: R('Глубина', .5, 0, 1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const S = Math.max(4, Math.round(p.sheets * g.q));
  g.add();
  for (let l = 0; l < S; l++) {
    const f = l / S, z = 1 - f * p.depth;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, v = A.b(x);
      const y = cy + Math.sin(x * 14 + l * .24 + g.t * p.phase * 2) * (6 + v * h * .3) * g.S.amp
        + (f - .5) * h * .55 * p.tilt;
      i ? ctx.lineTo(lerp(w * .5, x * w, z), y) : ctx.moveTo(lerp(w * .5, x * w, z), y);
    }
    g.alpha(.10 + f * .12); ctx.strokeStyle = g.col(f); ctx.lineWidth = 1.4; ctx.stroke();
  }
  g.norm();
  if (p.scan > .01) {
    g.alpha(p.scan * .16); ctx.fillStyle = g.col(.5);
    for (let y = (g.t * 40) % 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  }
  g.alpha(1);
});

def('liquid', 'Liquid Glass', 'waves', {
  layers: R('Слои', 10, 2, 26, 1), visc: R('Вязкость', .5, 0, 1),
  blob: R('Капли', .8, 0, 2), rim: R('Кромка', .5, 0, 1), scale: R('Масштаб', 1, .3, 2)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const L = Math.max(2, Math.round(p.layers * g.q));
  const st = g.st; if (!st.s) st.s = new Float32Array(64);
  for (let i = 0; i < 64; i++) st.s[i] += (A.b(i / 64) - st.s[i]) * clamp(g.dt * lerp(14, 1.6, p.visc), .01, 1);
  for (let l = 0; l < L; l++) {
    const f = l / L;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i <= 63; i++) {
      const x = i / 63;
      const y = cy + (st.s[i] - .35) * h * .38 * p.scale * g.S.amp
        + Math.sin(x * 6 * p.blob + g.t * 1.2 + l) * h * .06 + (f - .5) * h * .3;
      ctx.lineTo(x * w, y);
    }
    ctx.lineTo(w, h); ctx.closePath();
    g.alpha(.09); ctx.fillStyle = g.col(f); ctx.fill();
    if (p.rim > .01) { g.alpha(p.rim * .5); ctx.strokeStyle = g.col(1 - f); ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  g.alpha(1);
});

def('harmonic', 'Harmonic Flow', 'waves', {
  harmonics: R('Гармоники', 5, 1, 14, 1), phase: R('Фаза', .6, 0, 2),
  spread: R('Разброс', .5, 0, 1), thick: R('Толщина', 1.4, .4, 5, .1), detune: R('Расстройка', .3, 0, 1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const H = Math.max(1, Math.round(p.harmonics));
  g.add();
  for (let k = 1; k <= H; k++) {
    const f = k / H, v = A.b(f * .85);
    ctx.beginPath();
    for (let i = 0; i <= 220; i++) {
      const x = i / 220;
      const y = cy + Math.sin(x * TAU * k * (1 + p.detune * .12) + g.t * p.phase * 3 * k * .3)
        * v * h * .34 * g.S.amp + (f - .5) * h * p.spread * .5;
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick; g.alpha(.28 + v * .5); ctx.stroke();
  }
  g.norm();
});

def('pulse', 'Neon Pulse', 'waves', {
  rings: R('Импульсы', 5, 1, 14, 1), thick: R('Толщина', 4, 1, 14, .5),
  ripple: R('Рябь', .8, 0, 2), bassGain: R('Реакция низа', 1.4, 0, 3), decay: R('Затухание', .6, .1, 2)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const st = g.st; if (!st.r) st.r = [];
  if (A.beat > .8 && (!st.last || g.t - st.last > .12)) { st.last = g.t; st.r.push({ r: 0, v: A.bass }); }
  if (st.r.length > 40) st.r.splice(0, st.r.length - 40);
  g.add();
  for (let i = st.r.length - 1; i >= 0; i--) {
    const o = st.r[i];
    o.r += g.dt * (140 + o.v * 340) / p.decay;
    const a = 1 - o.r / (Math.max(w, h) * .75);
    if (a <= 0) { st.r.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(w / 2, cy, o.r, 0, TAU);
    ctx.strokeStyle = g.col(1 - a); ctx.lineWidth = p.thick * a; g.alpha(a * .7); ctx.stroke();
  }
  const R2 = Math.max(1, Math.round(p.rings));
  for (let l = 0; l < R2; l++) {
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const y = cy + Math.sin(x * 12 * p.ripple + g.t * 3 + l) * A.bass * h * .2 * p.bassGain * g.S.amp
        + A.w(x) * h * .12;
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    ctx.strokeStyle = g.col(l / R2); ctx.lineWidth = p.thick * (1 - l / R2 * .6);
    g.alpha(.3 + A.level * .5); ctx.stroke();
  }
  g.norm();
});

/* ==================== СПЕКТР ==================== */
def('bars', 'Spectrum Bars', 'spectrum', {
  count: R('Полос', 64, 8, 192, 1), gap: R('Зазор', .22, 0, .9),
  round: R('Скругление', .35, 0, 1), curve: R('Кривая', 1.6, .5, 3),
  floorMix: R('Отражение', .35, 0, 1), peakCap: T('Пик-маркер', true)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(8, Math.round(p.count * g.q));
  const cw = w / n, bw = Math.max(1, cw * (1 - p.gap)), base = h * .72;
  const rr = ctx.roundRect ? Math.min(bw / 2, bw * p.round) : 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, v = Math.pow(A.b(x), p.curve);
    const bh = v * base * g.S.amp, bx = i * cw + (cw - bw) / 2, y = h * .78 - bh;
    ctx.fillStyle = g.col(x); g.alpha(.92);
    if (rr) { ctx.beginPath(); ctx.roundRect(bx, y, bw, Math.max(1, bh), rr); ctx.fill(); }
    else ctx.fillRect(bx, y, bw, Math.max(1, bh));
    if (p.floorMix > .01) {
      g.alpha(p.floorMix * .3);
      ctx.fillRect(bx, h * .78 + 2, bw, Math.max(1, bh * .45));
    }
    if (p.peakCap) {
      const pv = Math.pow(A.pk(x), p.curve);
      g.alpha(.85); ctx.fillStyle = g.col(1 - x);
      ctx.fillRect(bx, h * .78 - pv * base * g.S.amp - 3, bw, 2);
    }
  }
  g.alpha(1);
});

def('glowbars', 'Neon Glow Bars', 'spectrum', {
  count: R('Полос', 48, 8, 128, 1), gap: R('Зазор', .3, 0, .8),
  bloom: R('Блум', 1, 0, 2), rise: R('Подъём', .4, .05, 1), cap: T('Шапка', true)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(8, Math.round(p.count * g.q));
  const cw = w / n, bw = Math.max(2, cw * (1 - p.gap));
  const st = g.st; if (!st.v || st.v.length !== n) st.v = new Float32Array(n);
  g.add();
  for (let i = 0; i < n; i++) {
    const x = i / n, target = A.b(x);
    st.v[i] += (target - st.v[i]) * clamp(g.dt * 60 * p.rise, .02, 1);
    const bh = st.v[i] * st.v[i] * h * .46 * g.S.amp, bx = i * cw + (cw - bw) / 2;
    if (p.bloom > .01) {
      const s = g.sprite(x), r = bw * (1 + p.bloom * 1.6);
      g.alpha(.4 * p.bloom);
      ctx.drawImage(s, bx + bw / 2 - r / 2, cy - bh - r / 2, r, r);
      ctx.drawImage(s, bx + bw / 2 - r / 2, cy + bh - r / 2, r, r);
    }
    ctx.fillStyle = g.col(x); g.alpha(.9);
    ctx.fillRect(bx, cy - bh, bw, bh * 2);
    if (p.cap) { g.alpha(1); ctx.fillStyle = g.col(1 - x); ctx.fillRect(bx, cy - bh - 2, bw, 2); ctx.fillRect(bx, cy + bh, bw, 2); }
  }
  g.norm();
});

def('mirror', 'Mirror Spectrum', 'spectrum', {
  count: R('Полос', 72, 16, 180, 1), split: R('Разделение', .5, 0, 1),
  tilt: R('Наклон', 0, -1, 1), gap: R('Зазор', .2, 0, .8), curve: R('Кривая', 1.4, .5, 3)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(16, Math.round(p.count * g.q));
  const cw = w / n, bw = Math.max(1, cw * (1 - p.gap)), mid = h * (.2 + p.split * .6);
  for (let i = 0; i < n; i++) {
    const x = i / n, v = Math.pow(A.b(x < .5 ? x * 2 : (1 - x) * 2), p.curve);
    const up = v * h * .42 * g.S.amp, bx = i * cw, sk = (x - .5) * p.tilt * h * .12;
    ctx.fillStyle = g.col(x); g.alpha(.9);
    ctx.fillRect(bx, mid - up + sk, bw, up);
    g.alpha(.32);
    ctx.fillRect(bx, mid + sk, bw, up * .72);
  }
  g.alpha(1);
});

def('equalizer3d', '3D Equalizer', 'spectrum', {
  cols: R('Колонок', 28, 8, 64, 1), depth: R('Глубина', .45, 0, 1),
  tilt: R('Скос', .4, 0, 1), leds: R('Сегментов', 14, 3, 32, 1), lit: T('Тень', true)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(8, Math.round(p.cols * g.q)), cw = w / n * .78;
  const dz = p.depth * 26, dy = -p.tilt * 20, seg = Math.max(3, Math.round(p.leds));
  for (let i = n - 1; i >= 0; i--) {
    const x = i / n, v = A.b(x), bx = i * (w / n) + 4;
    const lit = Math.round(v * seg);
    for (let s = 0; s < seg; s++) {
      const sh = h * .5 / seg, y = h * .8 - s * sh;
      const on = s < lit;
      if (p.lit) {
        g.alpha(on ? .35 : .06); ctx.fillStyle = g.col(s / seg);
        ctx.beginPath(); ctx.moveTo(bx + cw, y); ctx.lineTo(bx + cw + dz, y + dy);
        ctx.lineTo(bx + cw + dz, y + dy - sh * .8); ctx.lineTo(bx + cw, y - sh * .8); ctx.fill();
      }
      g.alpha(on ? .95 : .07); ctx.fillStyle = g.col(s / seg);
      ctx.fillRect(bx, y - sh * .8, cw, sh * .8);
    }
  }
  g.alpha(1);
});

def('spectrumCube', 'Spectrum Cube', 'spectrum', {
  cells: R('Ячеек', 10, 4, 22, 1), rot: R('Вращение', .3, -2, 2),
  tiltP: R('Перспектива', .5, 0, 1), wire: T('Каркас', true), lift: R('Подъём', .6, 0, 1.5)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(4, Math.round(p.cells * g.q));
  const size = Math.min(w, h) * .62, cell = size / n, rot = g.t * p.rot;
  const ca = Math.cos(rot), sa = Math.sin(rot), sq = .35 + p.tiltP * .5;
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const u = (ix / (n - 1) - .5) * size, vv = (iy / (n - 1) - .5) * size;
    const rx = u * ca - vv * sa, rz = u * sa + vv * ca;
    const val = A.b(Math.hypot(ix / n - .5, iy / n - .5) * 1.6);
    const px = cx + rx, py = cy + rz * sq - val * h * .28 * p.lift * g.S.amp;
    const s = cell * (.5 + val * .8);
    ctx.fillStyle = g.col(val); g.alpha(.28 + val * .7);
    ctx.fillRect(px - s / 2, py - s / 2, s, s);
    if (p.wire) { g.alpha(.16); ctx.strokeStyle = g.col(1 - val); ctx.lineWidth = .8; ctx.strokeRect(px - cell / 2, py - cell / 2, cell, cell); }
  }
  g.alpha(1);
});

def('tower', 'Neon Towers', 'spectrum', {
  towers: R('Башен', 24, 8, 64, 1), segs: R('Секций', 14, 4, 32, 1),
  segGap: R('Зазор секций', .25, 0, .8), cap: T('Купол', true), sway: R('Качание', .3, 0, 1)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(8, Math.round(p.towers * g.q)), cw = w / n * .72;
  const seg = Math.max(4, Math.round(p.segs)), sh = h * .62 / seg;
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x), lit = v * seg;
    const bx = i * (w / n) + (w / n - cw) / 2 + Math.sin(g.t * 1.4 + i * .4) * p.sway * 6;
    for (let s = 0; s < seg; s++) {
      const on = s < lit, y = h * .88 - s * sh;
      g.alpha(on ? .3 + (s / seg) * .7 : .06);
      ctx.fillStyle = g.col(s / seg);
      ctx.fillRect(bx, y - sh * (1 - p.segGap), cw, sh * (1 - p.segGap));
    }
    if (p.cap) {
      g.alpha(.9); ctx.fillStyle = g.col(1);
      ctx.beginPath(); ctx.arc(bx + cw / 2, h * .88 - lit * sh - 4, Math.max(1.5, cw * .22), 0, TAU); ctx.fill();
    }
  }
  g.alpha(1);
});

def('waterfall', 'Spectrum Waterfall', 'spectrum', {
  cols: R('Колонок', 96, 32, 192, 1), rows: R('Строк', 64, 24, 128, 1),
  scroll: R('Прокрутка', 1, .2, 4), contrast: R('Контраст', 1.4, .4, 3), smoothImg: T('Сглаживание', true)
}, g => {
  const { ctx, w, h, p, A } = g;
  const cols = Math.round(p.cols), rows = Math.round(p.rows), key = cols + 'x' + rows + Palette.rev;
  const st = g.st;
  if (st.key !== key) {
    st.key = key;
    st.oc = document.createElement('canvas'); st.oc.width = cols; st.oc.height = rows;
    st.oct = st.oc.getContext('2d'); st.img = st.oct.createImageData(cols, 1); st.row = 0; st.acc = 0;
  }
  st.acc += g.dt * 60 * p.scroll;
  while (st.acc >= 1) {
    st.acc -= 1;
    const d = st.img.data;
    for (let i = 0; i < cols; i++) {
      const v = clamp(Math.pow(A.b(i / cols), 1 / p.contrast), 0, 1);
      const idx = clamp((v * (STOPS - 1)) | 0, 0, STOPS - 1), o = i * 4;
      d[o] = Palette.r[idx]; d[o + 1] = Palette.g[idx]; d[o + 2] = Palette.b[idx];
      d[o + 3] = clamp(v * 300, 0, 255) | 0;
    }
    st.oct.putImageData(st.img, 0, st.row);
    st.row = (st.row + 1) % rows;
  }
  ctx.imageSmoothingEnabled = !!p.smoothImg;
  const top = rows - st.row;
  ctx.drawImage(st.oc, 0, st.row, cols, top, 0, 0, w, h * top / rows);
  if (st.row) ctx.drawImage(st.oc, 0, 0, cols, st.row, 0, h * top / rows, w, h * st.row / rows);
  ctx.imageSmoothingEnabled = true;
});

def('sparkline', 'Sparkline Peaks', 'spectrum', {
  points: R('Точек', 160, 32, 480, 1), tension: R('Сглаживание', .5, 0, 1),
  fill: R('Заливка', .35, 0, 1), dots: T('Пики точками', true), thick: R('Толщина', 2, .5, 6, .1)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(32, Math.round(p.points * g.q));
  const st = g.st; if (!st.v || st.v.length !== n) st.v = new Float32Array(n);
  const k = clamp(g.dt * lerp(60, 5, p.tension), .02, 1);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    st.v[i] += (A.b(x) - st.v[i]) * k;
    const y = h * .82 - st.v[i] * h * .64 * g.S.amp;
    i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
  }
  if (p.fill > .01) {
    ctx.save(); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, Palette.rgba(.8, p.fill * .55)); grd.addColorStop(1, Palette.rgba(.1, 0));
    ctx.fillStyle = grd; ctx.fill(); ctx.restore();
  }
  ctx.strokeStyle = g.col(.75); ctx.lineWidth = p.thick; g.alpha(.95); ctx.lineJoin = 'round'; ctx.stroke();
  if (p.dots) {
    for (let i = 0; i < n; i += Math.max(1, (n / 40) | 0)) {
      const x = i / (n - 1), pv = A.pk(x);
      ctx.fillStyle = g.col(x); g.alpha(.8);
      ctx.fillRect(x * w - 1.5, h * .82 - pv * h * .64 * g.S.amp - 1.5, 3, 3);
    }
  }
  g.alpha(1);
});

def('dots', 'Dot Matrix', 'spectrum', {
  cols: R('Колонок', 40, 12, 96, 1), rows: R('Строк', 10, 3, 26, 1),
  size: R('Размер', 1.2, .3, 3), falloff: R('Спад', .5, 0, 1), wave: R('Волна', .6, 0, 2)
}, g => {
  const { ctx, w, h, p, A } = g;
  const cx2 = Math.max(12, Math.round(p.cols * g.q)), ry = Math.max(3, Math.round(p.rows));
  const dw = w / cx2, dh = h / ry;
  for (let i = 0; i < cx2; i++) {
    const x = i / cx2, v = A.b(x);
    for (let j = 0; j < ry; j++) {
      const f = j / (ry - 1), lit = v * (1 + p.wave * Math.sin(g.t * 2 + i * .3)) - f * p.falloff;
      if (lit <= .02) { g.alpha(.05); } else { g.alpha(clamp(lit, 0, 1)); }
      const s = Math.max(1, dw * .34 * p.size * (lit > 0 ? 1 : .5));
      ctx.fillStyle = g.col(f);
      ctx.fillRect(i * dw + dw / 2 - s / 2, h - j * dh - dh / 2 - s / 2, s, s);
    }
  }
  g.alpha(1);
});

def('grid', 'Laser Grid', 'spectrum', {
  lines: R('Линий', 36, 8, 96, 1), spread: R('Разлёт', .6, .1, 1),
  beam: R('Луч', 1.6, .3, 6, .1), jitter: R('Джиттер', .2, 0, 1), cross: T('Поперечины', true)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(8, Math.round(p.lines * g.q));
  const rnd = mulberry(1337);
  g.add();
  ctx.lineWidth = p.beam;
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x), len = v * h * p.spread * g.S.amp;
    const jx = (rnd() - .5) * p.jitter * 16 * v;
    ctx.strokeStyle = g.col(x); g.alpha(.2 + v * .8);
    ctx.beginPath();
    ctx.moveTo(x * w + jx, cy - len); ctx.lineTo(x * w + jx, cy + len); ctx.stroke();
  }
  if (p.cross) {
    for (let j = 1; j < 6; j++) {
      const y = cy + (j - 3) * h * .12;
      g.alpha(.12); ctx.strokeStyle = g.col(j / 6);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }
  g.norm();
});

def('shards', 'Crystal Shards', 'spectrum', {
  shards: R('Осколков', 40, 8, 120, 1), sharp: R('Острота', .5, .05, 1),
  skew: R('Скос', .3, -1, 1), outline: T('Обводка', true), depth: R('Глубина', .5, 0, 1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(8, Math.round(p.shards * g.q)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x), top = cy - v * h * .44 * g.S.amp;
    const bx = i * cw, sk = p.skew * cw * 2;
    ctx.beginPath();
    ctx.moveTo(bx, cy + v * h * .12 * p.depth);
    ctx.lineTo(bx + cw * p.sharp + sk, top);
    ctx.lineTo(bx + cw, cy - v * h * .1);
    ctx.closePath();
    ctx.fillStyle = g.col(x); g.alpha(.28 + v * .6); ctx.fill();
    if (p.outline) { g.alpha(.6); ctx.strokeStyle = g.col(1 - x); ctx.lineWidth = 1; ctx.stroke(); }
  }
  g.alpha(1);
});

def('glitch', 'Glitch Spectrum', 'spectrum', {
  slices: R('Срезов', 18, 4, 64, 1), shift: R('Сдвиг', .4, 0, 1),
  rgb: R('RGB-сплит', .5, 0, 1), tear: R('Разрывы', .3, 0, 1), block: R('Блок', 1, .2, 3)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(4, Math.round(p.slices));
  const rnd = mulberry(((g.t * 12) | 0) * 7919);
  g.add();
  for (let s = 0; s < n; s++) {
    const f = s / n, off = (rnd() - .5) * p.shift * w * .3 * (A.flux + .2);
    const sh = h / n, y = s * sh;
    for (let ch = 0; ch < 3; ch++) {
      const cOff = (ch - 1) * p.rgb * 12;
      g.alpha(.36);
      ctx.fillStyle = g.col(ch / 2);
      for (let i = 0; i < 48; i++) {
        const x = i / 48, v = A.b(x * .9 + f * .1);
        if (rnd() < p.tear * .12) continue;
        ctx.fillRect(x * w + off + cOff, y, Math.max(1, w / 48 * p.block), sh * clamp(v * 1.6, .05, 1));
      }
    }
  }
  g.norm(); g.alpha(1); void cy;
});

def('fire', 'Bass Fire', 'spectrum', {
  flames: R('Языков', 90, 20, 220, 1), turb: R('Турбулентность', .8, 0, 2),
  height: R('Высота', .6, .1, 1), embers: R('Искры', 60, 0, 300, 1), bassBoost: R('Низ', 1.2, 0, 3)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(20, Math.round(p.flames * g.q));
  g.add();
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x * .55) * (1 + A.bass * p.bassBoost);
    const fh = v * h * p.height * g.S.amp;
    const sway = Math.sin(g.t * 3 + i * .5) * p.turb * 18 * v;
    ctx.beginPath();
    ctx.moveTo(x * w, h);
    ctx.quadraticCurveTo(x * w + sway, h - fh * .6, x * w + sway * 1.6, h - fh);
    ctx.strokeStyle = g.col(clamp(v, 0, 1)); ctx.lineWidth = Math.max(1, w / n * .9);
    g.alpha(.25 + v * .6); ctx.lineCap = 'round'; ctx.stroke();
  }
  const em = Math.round(p.embers * g.q);
  if (em) {
    const st = g.st;
    if (!st.e || st.e.length !== em * 3) { st.e = new Float32Array(em * 3); const r = mulberry(99); for (let i = 0; i < em; i++) { st.e[i * 3] = r(); st.e[i * 3 + 1] = r(); st.e[i * 3 + 2] = .3 + r(); } }
    for (let i = 0; i < em; i++) {
      st.e[i * 3 + 1] -= g.dt * (.06 + A.bass * .3) * st.e[i * 3 + 2];
      if (st.e[i * 3 + 1] < 0) { st.e[i * 3 + 1] = 1; st.e[i * 3] = (st.e[i * 3] + .37) % 1; }
      const y = st.e[i * 3 + 1] * h;
      g.alpha(clamp(st.e[i * 3 + 1] * .8, 0, .8));
      glowDot(g, st.e[i * 3] * w + Math.sin(g.t * 2 + i) * 8, y, 2 + A.bass * 4, 1 - st.e[i * 3 + 1]);
    }
  }
  g.norm();
});

def('neoncity', 'Neon City', 'spectrum', {
  towers: R('Домов', 40, 12, 90, 1), windows: T('Окна', true),
  bloom: R('Блум', 1, 0, 2), depth: R('Глубина', .5, 0, 1), skyline: R('Линия неба', .55, .2, .9)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(12, Math.round(p.towers * g.q)), cw = w / n;
  for (let pass = 0; pass < 2; pass++) {
    const back = pass === 0, sc = back ? .62 : 1, off = back ? cw * .5 : 0;
    if (!back || p.depth > .05) for (let i = 0; i < n; i++) {
      const x = i / n, v = A.b(back ? (x + .07) % 1 : x);
      const bh = (h * .12 + v * h * p.skyline) * sc * g.S.amp;
      const bx = i * cw + off;
      ctx.fillStyle = g.col(x); g.alpha(back ? .18 * p.depth : .55 + v * .4);
      ctx.fillRect(bx, h - bh, cw * .86, bh);
      if (p.bloom > .01 && !back) {
        const s = g.sprite(x), r = cw * (2 + p.bloom * 2);
        g.alpha(.25 * p.bloom * v);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(s, bx + cw * .43 - r / 2, h - bh - r / 2, r, r);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (p.windows && !back) {
        g.alpha(.8); ctx.fillStyle = g.col(1 - x);
        for (let y = h - bh + 6; y < h - 4; y += 9)
          for (let xx = bx + 3; xx < bx + cw * .8; xx += 7)
            if (((xx * 13 + y * 7) | 0) % 5 < 2 + v * 3) ctx.fillRect(xx, y, 2, 3);
      }
    }
  }
  g.alpha(1);
});

def('matrix', 'Data Rain', 'futuristic', {
  cols: R('Колонок', 40, 12, 80, 1), fall: R('Скорость', 1, .2, 3),
  tail: R('Хвост', 7, 2, 16, 1), glyph: R('Кегль', 13, 8, 26, 1), bright: R('Яркость', .8, .2, 1.5)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.max(12, Math.round(p.cols * g.q)), cw = w / n, tail = Math.round(p.tail);
  const st = g.st;
  if (!st.y || st.y.length !== n) { st.y = new Float32Array(n); const r = mulberry(4242); for (let i = 0; i < n; i++) st.y[i] = r() * h; }
  ctx.font = '700 ' + Math.round(p.glyph) + 'px "Space Mono",monospace';
  ctx.textBaseline = 'middle';
  const G = '01<>{}[]/\\|=+*#$%&@';
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x);
    st.y[i] += g.dt * (60 + v * 640) * p.fall;
    if (st.y[i] > h + tail * p.glyph) st.y[i] = -20;
    for (let k = 0; k < tail; k++) {
      const y = st.y[i] - k * p.glyph * 1.05;
      if (y < -20 || y > h + 20) continue;
      g.alpha(clamp((1 - k / tail) * (.18 + v) * p.bright, 0, 1));
      ctx.fillStyle = g.col(k === 0 ? 1 : x);
      ctx.fillText(G[((i * 7 + k * 3 + ((g.t * 8) | 0)) % G.length)], i * cw + cw * .2, y);
    }
  }
  g.alpha(1);
});

def('hud', 'Cyber HUD', 'futuristic', {
  ring: R('Радиус', .28, .1, .45), ticks: R('Делений', 48, 12, 120, 1),
  corners: T('Уголки', true), readout: T('Телеметрия', true), sweep: R('Развёртка', .6, 0, 2)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const R0 = Math.min(w, h) * p.ring, n = Math.round(p.ticks * g.q);
  if (p.corners) {
    g.alpha(.5); ctx.strokeStyle = g.col(.2); ctx.lineWidth = 1.5;
    const m = Math.min(w, h) * .06, L = Math.min(w, h) * .12;
    [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x + L * sx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L * sy); ctx.stroke();
    });
  }
  g.alpha(.3); ctx.strokeStyle = g.col(.4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R0 * 1.28, 0, TAU); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU - Math.PI / 2, v = A.b(i / n);
    const r0 = R0 * 1.06, r1 = r0 + v * R0 * 1.1 * g.S.amp;
    g.alpha(.25 + v * .75); ctx.strokeStyle = g.col(i / n); ctx.lineWidth = Math.max(1, TAU * R0 / n * .6);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
  const sa = g.t * p.sweep * 2;
  g.alpha(.7); ctx.strokeStyle = g.col(1); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R0 * .82, sa, sa + 1.2); ctx.stroke();
  g.alpha(.9); ctx.fillStyle = g.col(.9);
  ctx.beginPath(); ctx.arc(cx, cy, R0 * .3 * (1 + A.bass * .5), 0, TAU); ctx.fill();
  if (p.readout) {
    ctx.font = '700 11px "Space Mono",monospace'; ctx.textBaseline = 'alphabetic';
    g.alpha(.75); ctx.fillStyle = g.col(.5);
    const m = Math.min(w, h) * .06 + 6;
    ctx.fillText('SIGNAL ' + (A.level * 100 | 0).toString().padStart(3, '0') + '%', m + 14, m + 22);
    ctx.fillText('BASS ' + (A.bass * 100 | 0) + '  MID ' + (A.mid * 100 | 0) + '  HI ' + (A.treble * 100 | 0), m + 14, h - m - 8);
    ctx.fillText('BPM ' + (A.bpm || '--'), w - m - 74, h - m - 8);
  }
  g.alpha(1);
});

def('radar', 'Audio Radar', 'futuristic', {
  sweep: R('Развёртка', 1, .2, 3), rings: R('Кольца', 4, 2, 8, 1),
  blips: R('Отметок', 72, 16, 200, 1), fade: R('Затухание', 1.4, .3, 4), grid: T('Сетка', true)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const R0 = Math.min(w, h) * .42, n = Math.max(16, Math.round(p.blips * g.q));
  const a0 = g.t * p.sweep * 1.6 % TAU;
  if (p.grid) {
    g.alpha(.22); ctx.strokeStyle = g.col(.3); ctx.lineWidth = 1;
    for (let i = 1; i <= p.rings; i++) { ctx.beginPath(); ctx.arc(cx, cy, R0 * i / p.rings, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); ctx.stroke();
    }
  }
  g.add();
  const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a0) * R0, cy + Math.sin(a0) * R0);
  grd.addColorStop(0, Palette.rgba(.9, .5)); grd.addColorStop(1, Palette.rgba(.9, 0));
  ctx.strokeStyle = grd; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R0, cy + Math.sin(a0) * R0); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const f = i / n, a = f * TAU, v = A.b(f), d = ((a0 - a + TAU) % TAU);
    const age = clamp(1 - d / TAU * p.fade, 0, 1);
    if (age <= .02) continue;
    const r = R0 * clamp(v * 1.15, .05, 1);
    g.alpha(age * (.3 + v));
    glowDot(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + v * 9, f);
  }
  g.norm();
});

def('synthwave', 'Synthwave Grid', 'futuristic', {
  horizon: R('Горизонт', .55, .3, .8), speed: R('Скорость', 1, .2, 3),
  sun: R('Солнце', .18, 0, .4), peaks: R('Пики', .5, 0, 1), lines: R('Линий', 16, 6, 40, 1)
}, g => {
  const { ctx, w, h, cx, p, A } = g;
  const hy = h * p.horizon;
  if (p.sun > .01) {
    const R0 = Math.min(w, h) * p.sun * (1 + A.bass * .18);
    g.add();
    for (let i = 6; i > 0; i--) { g.alpha(.06); ctx.fillStyle = g.col(.9); ctx.beginPath(); ctx.arc(cx, hy, R0 * (1 + i * .18), 0, TAU); ctx.fill(); }
    g.norm();
    g.alpha(.9); ctx.fillStyle = g.col(.85);
    ctx.beginPath(); ctx.arc(cx, hy, R0, 0, TAU); ctx.fill();
    g.alpha(1); ctx.fillStyle = g.bg;
    for (let i = 0; i < 7; i++) ctx.fillRect(cx - R0, hy - R0 * .1 + i * R0 * .26, R0 * 2, R0 * .09 + i * .5);
  }
  g.alpha(.5); ctx.strokeStyle = g.col(.35); ctx.lineWidth = 1.2;
  const L = Math.round(p.lines);
  for (let i = 0; i < L; i++) {
    const f = ((i / L) + (g.t * p.speed * .18) % (1 / L)) % 1;
    const y = hy + Math.pow(f, 2.4) * (h - hy);
    g.alpha(.12 + f * .4);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let i = -10; i <= 10; i++) {
    g.alpha(.28);
    ctx.beginPath(); ctx.moveTo(cx + i * w * .02, hy); ctx.lineTo(cx + i * w * .5, h); ctx.stroke();
  }
  if (p.peaks > .01) {
    ctx.beginPath(); ctx.moveTo(0, hy);
    for (let i = 0; i <= 64; i++) {
      const x = i / 64;
      ctx.lineTo(x * w, hy - A.b(x) * h * .22 * p.peaks * g.S.amp);
    }
    ctx.lineTo(w, hy);
    g.alpha(.85); ctx.strokeStyle = g.col(1); ctx.lineWidth = 2; ctx.stroke();
    g.alpha(.16); ctx.fillStyle = g.col(.6); ctx.fill();
  }
  g.alpha(1);
});

def('hologram', 'Hologram Scan', 'futuristic', {
  gap: R('Шаг линий', 12, 4, 40, 1), jitter: R('Джиттер', .35, 0, 1),
  flicker: R('Мерцание', .3, 0, 1), edge: T('Рамка', true), bend: R('Изгиб', .5, 0, 1.5)
}, g => {
  const { ctx, w, h, p, A } = g;
  const step = Math.max(4, Math.round(p.gap / g.q));
  const fl = 1 - p.flicker * .5 * (0.5 + 0.5 * Math.sin(g.t * 37));
  g.add();
  for (let y = 0; y < h; y += step) {
    const f = y / h, v = A.b(1 - f);
    const bend = Math.sin(f * 6 + g.t * 2) * p.bend * 26 * v;
    g.alpha((.08 + v * .8) * fl);
    ctx.strokeStyle = g.col(f); ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let i = 1; i <= 8; i++) {
      const x = i / 8;
      ctx.lineTo(x * w, y + Math.sin(x * 5 + g.t * 3 + f * 8) * bend + (mulberry((y | 0) * 31 + i)() - .5) * p.jitter * 10 * v);
    }
    ctx.stroke();
  }
  g.norm();
  if (p.edge) {
    g.alpha(.5); ctx.strokeStyle = g.col(.8); ctx.lineWidth = 1;
    ctx.strokeRect(w * .05, h * .06, w * .9, h * .88);
    const sy = (g.t * 120) % h;
    g.alpha(.4); ctx.fillStyle = g.col(1); ctx.fillRect(0, sy, w, 2);
  }
  g.alpha(1);
});

def('circuit', 'Circuit Board', 'futuristic', {
  traces: R('Дорожек', 30, 8, 80, 1), pulse: R('Импульсы', 1, .2, 3),
  nodes: T('Узлы', true), branch: R('Ветвление', .5, 0, 1), thick: R('Толщина', 1.4, .5, 4, .1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(8, Math.round(p.traces * g.q));
  const rnd = mulberry(2024);
  ctx.lineCap = 'square';
  for (let i = 0; i < n; i++) {
    const x = i / n, v = A.b(x), r1 = rnd(), r2 = rnd();
    const bx = x * w, len = v * h * .34 * g.S.amp, dir = r1 > .5 ? 1 : -1;
    g.alpha(.15 + v * .8); ctx.strokeStyle = g.col(x); ctx.lineWidth = p.thick;
    ctx.beginPath();
    ctx.moveTo(bx, cy);
    ctx.lineTo(bx, cy - len * dir);
    ctx.lineTo(bx + (r2 - .5) * w / n * 4 * p.branch, cy - len * dir);
    ctx.stroke();
    if (p.nodes) {
      const t = (g.t * p.pulse + r1 * 3) % 1;
      g.alpha(clamp(1 - t, 0, 1)); ctx.fillStyle = g.col(1 - x);
      const py = cy - len * dir * t;
      ctx.fillRect(bx - 2, py - 2, 4, 4);
      g.alpha(.7); ctx.fillRect(bx - 1.5, cy - len * dir - 1.5, 3, 3);
    }
  }
  g.alpha(1);
});

def('lightning', 'Audio Lightning', 'futuristic', {
  bolts: R('Разрядов', 3, 1, 12, 1), branch: R('Ветви', .5, 0, 1),
  jag: R('Излом', .5, .05, 1), thresh: R('Порог', .35, 0, 1), thick: R('Толщина', 2, .5, 6, .1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const active = A.beat > (1 - p.thresh) * .6 || A.bass > 1 - p.thresh * .7;
  const st = g.st; if (!st.seed) st.seed = 1;
  if (active && g.t - (st.last || 0) > .06) { st.last = g.t; st.seed = (st.seed * 16807) % 2147483647; }
  const age = clamp(1 - (g.t - (st.last || -9)) * 5, 0, 1);
  if (age <= 0) { g.alpha(1); return; }
  g.add();
  const B = Math.max(1, Math.round(p.bolts));
  for (let b = 0; b < B; b++) {
    const rnd = mulberry(st.seed + b * 977);
    ctx.beginPath();
    let x = 0, y = cy + (rnd() - .5) * h * .3;
    ctx.moveTo(x, y);
    const steps = 26;
    for (let i = 1; i <= steps; i++) {
      x = i / steps * w;
      y += (rnd() - .5) * h * .3 * p.jag * (.4 + A.level);
      y = clamp(y, h * .08, h * .92);
      ctx.lineTo(x, y);
      if (rnd() < p.branch * .22) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - .5) * w * .12, y + (rnd() - .5) * h * .3);
        ctx.moveTo(x, y);
      }
    }
    g.alpha(age * .3); ctx.strokeStyle = g.col(.3); ctx.lineWidth = p.thick * 5; ctx.stroke();
    g.alpha(age); ctx.strokeStyle = g.col(1); ctx.lineWidth = p.thick; ctx.stroke();
  }
  g.norm();
});

def('plasma', 'Plasma Storm', 'futuristic', {
  blobs: R('Сгустков', 9, 3, 26, 1), turb: R('Турбулентность', .8, 0, 2),
  contrast: R('Контраст', 1, .3, 2), cycle: R('Цикл', .5, 0, 2), size: R('Размер', 1, .3, 2.5)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(3, Math.round(p.blobs * g.q));
  g.add();
  for (let i = 0; i < n; i++) {
    const f = i / n, v = A.b(f);
    const a = f * TAU + g.t * p.turb * (.4 + f);
    const r = Math.min(w, h) * (.1 + f * .34) * (1 + v * .5);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a * 1.3) * r * .7;
    const s = Math.min(w, h) * .3 * p.size * (.25 + v * p.contrast);
    g.alpha(clamp(.1 + v * .5, 0, .8));
    glowDot(g, x, y, s, (f + g.t * p.cycle * .2) % 1);
  }
  g.norm();
});

/* ==================== ФОРМЫ / РАДИАЛЬНОЕ ==================== */
def('radial', 'Radial Spectrum', 'radial', {
  rings: R('Кольца', 4, 1, 10, 1), inner: R('Ядро', .18, .04, .5),
  spike: R('Шипы', .3, .05, .8), rot: R('Вращение', .12, -1, 1), sym: T('Симметрия', true)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const R0 = Math.min(w, h) * p.inner, N = Math.max(48, Math.round(180 * g.q));
  const rings = Math.max(1, Math.round(p.rings));
  for (let r = 0; r < rings; r++) {
    const f = r / rings;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * TAU + g.t * p.rot + f * .3;
      const src = p.sym ? (t < .5 ? t * 2 : (1 - t) * 2) : t;
      const v = A.b(src);
      const rr = R0 * (1 + f * .3) + v * Math.min(w, h) * p.spike * g.S.amp;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    g.alpha(.25 + (1 - f) * .55); ctx.strokeStyle = g.col(f); ctx.lineWidth = 1.6; ctx.stroke();
    g.alpha(.06); ctx.fillStyle = g.col(f); ctx.fill();
  }
  g.alpha(.7); ctx.strokeStyle = g.col(1); ctx.lineWidth = 1 + A.bass * 3;
  ctx.beginPath(); ctx.arc(cx, cy, R0 * .72, 0, TAU); ctx.stroke();
  g.alpha(1);
});

def('orbit', 'Orbit Ring', 'radial', {
  sats: R('Спутников', 90, 8, 260, 1), radius: R('Радиус', .26, .08, .45),
  wobble: R('Колебание', .4, 0, 1), spin: R('Вращение', .5, -2, 2), size: R('Размер', 1, .3, 3)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(8, Math.round(p.sats * g.q)), R0 = Math.min(w, h) * p.radius;
  g.add();
  for (let i = 0; i < n; i++) {
    const f = i / n, v = A.b(f), a = f * TAU + g.t * p.spin;
    const rr = R0 + v * Math.min(w, h) * .22 * g.S.amp + Math.sin(g.t * 2 + i) * p.wobble * 14;
    g.alpha(.25 + v * .75);
    glowDot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, (2 + v * 8) * p.size, f);
  }
  g.norm();
  g.alpha(.3); ctx.strokeStyle = g.col(.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke(); g.alpha(1);
});

def('rings', 'Concentric Rings', 'radial', {
  rings: R('Кольца', 18, 4, 48, 1), gap: R('Шаг', 14, 4, 44, 1),
  thick: R('Толщина', 2, .5, 8, .1), breathe: R('Дыхание', .8, 0, 2), fade: R('Спад', .5, 0, 1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(4, Math.round(p.rings * g.q));
  for (let i = 0; i < n; i++) {
    const f = i / n, v = A.b(f);
    const r = (i + 1) * p.gap * (1 + v * p.breathe * .5) * g.S.amp;
    g.alpha(clamp((.15 + v) * (1 - f * p.fade), 0, 1));
    ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick * (1 + v);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }
  g.alpha(1);
});

def('spiral', 'Spiral Spectrum', 'radial', {
  turns: R('Витков', 12, 2, 32, 1), points: R('Точек', 480, 100, 1400, 10),
  thick: R('Толщина', 2, .5, 7, .1), grow: R('Рост', .8, .2, 1.4), spin: R('Вращение', .4, -2, 2)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(100, Math.round(p.points * g.q)), Rm = Math.min(w, h) * .46;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = t * p.turns * TAU + g.t * p.spin;
    const v = A.b(t);
    const r = Math.pow(t, p.grow) * Rm * (1 + v * .35 * g.S.amp);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  g.add();
  g.alpha(.25); ctx.strokeStyle = g.col(.3); ctx.lineWidth = p.thick * 4; ctx.stroke();
  g.alpha(.95); ctx.strokeStyle = g.col(.9); ctx.lineWidth = p.thick; ctx.stroke();
  g.norm();
});

def('fractal', 'Fractal Bloom', 'radial', {
  petals: R('Лепестков', 6, 3, 16, 1), depth: R('Глубина', 3, 1, 6, 1),
  twist: R('Скрутка', .6, 0, 2), shrink: R('Сжатие', .62, .3, .9), thick: R('Толщина', 1.4, .4, 4, .1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const P = Math.round(p.petals), D = Math.round(p.depth);
  const R0 = Math.min(w, h) * .38;
  g.add();
  for (let d = 0; d < D; d++) {
    const scale = Math.pow(p.shrink, d), v = A.b(d / D);
    const rot = g.t * p.twist * (d % 2 ? -1 : 1) * .5;
    for (let k = 0; k < P; k++) {
      const a = k / P * TAU + rot;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, ang = a + Math.sin(t * Math.PI) * .7;
        const r = R0 * scale * Math.sin(t * Math.PI) * (1 + v * .8 * g.S.amp);
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      g.alpha(.16 + v * .5); ctx.strokeStyle = g.col(d / D); ctx.lineWidth = p.thick; ctx.stroke();
    }
  }
  g.norm();
});

def('kaleido', 'Kaleidoscope', 'radial', {
  mirrors: R('Зеркал', 8, 3, 18, 1), zoom: R('Зум', 1, .3, 2),
  rot: R('Вращение', .3, -2, 2), complexity: R('Сложность', 6, 2, 14, 1), thick: R('Толщина', 1.6, .4, 5, .1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const M = Math.round(p.mirrors), C = Math.round(p.complexity * g.q);
  const R0 = Math.min(w, h) * .46 * p.zoom;
  g.add();
  for (let m = 0; m < M; m++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(m / M * TAU + g.t * p.rot * .4);
    if (m % 2) ctx.scale(1, -1);
    for (let k = 0; k < C; k++) {
      const f = k / C, v = A.b(f);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, r = R0 * (f * .7 + t * .3) * (1 + v * .5 * g.S.amp);
        const a = t * (1.1 + f) + Math.sin(g.t + k) * .3;
        i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.alpha(.14 + v * .55); ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick; ctx.stroke();
    }
    ctx.restore();
  }
  g.norm();
});

def('spectrumOrb', 'Spectrum Orb', 'radial', {
  pts: R('Точек', 220, 60, 700, 5), radius: R('Радиус', .24, .08, .42),
  squash: R('Сжатие', .55, .15, 1), spin: R('Вращение', .5, -2, 2), size: R('Размер', 1, .3, 3)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(60, Math.round(p.pts * g.q)), R0 = Math.min(w, h) * p.radius;
  g.add();
  for (let i = 0; i < n; i++) {
    const f = i / n, v = A.b(f);
    const lat = Math.acos(1 - 2 * ((i + .5) / n)), lon = f * TAU * 9 + g.t * p.spin;
    const r = R0 * (1 + v * .6 * g.S.amp);
    const x = cx + Math.sin(lat) * Math.cos(lon) * r;
    const y = cy + Math.cos(lat) * r * p.squash;
    g.alpha(.2 + v * .8);
    glowDot(g, x, y, (1.5 + v * 6) * p.size, f);
  }
  g.norm();
  g.alpha(.35); ctx.strokeStyle = g.col(.6); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy, R0, R0 * p.squash, 0, 0, TAU); ctx.stroke(); g.alpha(1);
});

def('cyberGlobe', 'Cyber Globe', 'radial', {
  meridians: R('Меридианов', 14, 4, 32, 1), parallels: R('Параллелей', 8, 3, 20, 1),
  spin: R('Вращение', .5, -2, 2), tilt: R('Наклон', .4, 0, 1), thick: R('Толщина', 1.2, .4, 4, .1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const R0 = Math.min(w, h) * .36 * (1 + A.bass * .06);
  const M = Math.round(p.meridians * g.q), P2 = Math.round(p.parallels);
  const sq = .3 + p.tilt * .6;
  for (let i = 0; i < M; i++) {
    const f = i / M, v = A.b(f);
    const ph = f * Math.PI + g.t * p.spin * .4;
    const rx = Math.abs(Math.cos(ph)) * R0;
    g.alpha(.12 + v * .7); ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, R0, 0, 0, TAU); ctx.stroke();
  }
  for (let j = 1; j < P2; j++) {
    const f = j / P2, v = A.b(1 - f), y = cy + (f - .5) * 2 * R0 * sq;
    const rr = Math.sqrt(Math.max(0, 1 - Math.pow((f - .5) * 2, 2))) * R0;
    g.alpha(.12 + v * .6); ctx.strokeStyle = g.col(1 - f); ctx.lineWidth = p.thick;
    ctx.beginPath(); ctx.ellipse(cx, y, rr, rr * sq * .4, 0, 0, TAU); ctx.stroke();
  }
  g.alpha(1);
});

def('vortex', 'Vortex Tunnel', 'radial', {
  arms: R('Рукавов', 4, 1, 12, 1), twist: R('Скрутка', 1.2, .2, 3),
  pts: R('Точек', 240, 60, 700, 5), pull: R('Втягивание', .8, 0, 2), size: R('Размер', 1, .3, 3)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const arms = Math.round(p.arms), n = Math.max(60, Math.round(p.pts * g.q / arms));
  const Rm = Math.min(w, h) * .5;
  g.add();
  for (let a = 0; a < arms; a++) {
    for (let i = 0; i < n; i++) {
      const t = i / n, v = A.b(t);
      const ang = a / arms * TAU + t * p.twist * 6 + g.t * (1 + p.pull * (1 - t));
      const r = t * Rm * (1 + v * .3 * g.S.amp);
      g.alpha(.15 + v * .7);
      glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * .62, (1 + v * 6) * p.size, t);
    }
  }
  g.norm();
});

def('singularity', 'Singularity', 'radial', {
  disk: R('Диск', .16, .04, .4), spin: R('Вращение', .8, -2, 2),
  jets: R('Джеты', .6, 0, 1), dust: R('Пыль', 260, 60, 900, 10), warp: R('Искажение', .5, 0, 1.5)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const R0 = Math.min(w, h) * p.disk, n = Math.round(p.dust * g.q);
  const a = stars(g, n, 555);
  g.add();
  for (let i = 0; i < n; i++) {
    const seed = a[i * 4], f = a[i * 4 + 1], v = A.b(f);
    const ang = seed * TAU + g.t * p.spin * (1.6 - f);
    const r = R0 * (1.1 + f * 3.4) * (1 + v * p.warp * .4);
    g.alpha(.1 + v * .6);
    glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * .34, 1.5 + v * 5, f);
  }
  if (p.jets > .01) {
    for (let s = -1; s <= 1; s += 2) {
      const grd = ctx.createLinearGradient(cx, cy, cx, cy + s * h * .5);
      grd.addColorStop(0, Palette.rgba(1, .55 * p.jets * (.4 + A.treble)));
      grd.addColorStop(1, Palette.rgba(.3, 0));
      ctx.fillStyle = grd;
      const wd = R0 * (.35 + A.treble * .5);
      ctx.beginPath(); ctx.moveTo(cx - wd, cy); ctx.lineTo(cx + wd, cy);
      ctx.lineTo(cx + wd * 3, cy + s * h * .5); ctx.lineTo(cx - wd * 3, cy + s * h * .5); ctx.fill();
    }
  }
  g.norm();
  g.alpha(1); ctx.fillStyle = g.bg;
  ctx.beginPath(); ctx.arc(cx, cy, R0 * (.9 + A.bass * .12), 0, TAU); ctx.fill();
  g.alpha(.8); ctx.strokeStyle = g.col(1); ctx.lineWidth = 1.5; ctx.stroke();
});

def('wormhole', 'Wormhole', 'radial', {
  rings: R('Кольца', 22, 6, 48, 1), warp: R('Искажение', .8, 0, 2),
  speed: R('Скорость', 1, .2, 3), twist: R('Скрутка', .6, 0, 2), thick: R('Толщина', 1.6, .4, 5, .1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(6, Math.round(p.rings * g.q)), Rm = Math.min(w, h) * .62;
  for (let i = 0; i < n; i++) {
    const z = ((i / n) + (g.t * p.speed * .18) % 1) % 1;
    const v = A.b(1 - z), r = Math.pow(z, 1.7) * Rm * (1 + v * .3);
    const ox = Math.sin(g.t * .8 + z * 5) * p.warp * 40 * z;
    const oy = Math.cos(g.t * .6 + z * 4) * p.warp * 30 * z;
    g.alpha(clamp((1 - z) * (.25 + v), 0, 1));
    ctx.strokeStyle = g.col(z); ctx.lineWidth = p.thick * (1 + v * 2);
    ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(z * p.twist * 3 + g.t * .2);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * .82, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  g.alpha(1);
});

def('tunnel', 'Neon Tunnel', 'radial', {
  segs: R('Сегментов', 18, 6, 44, 1), sides: R('Граней', 6, 3, 16, 1),
  speed: R('Скорость', 1, .2, 3), spin: R('Вращение', .4, -2, 2), thick: R('Толщина', 2, .5, 6, .1)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(6, Math.round(p.segs * g.q)), sides = Math.round(p.sides), Rm = Math.min(w, h) * .7;
  g.add();
  for (let i = 0; i < n; i++) {
    const z = ((i / n) + (g.t * p.speed * .2) % 1) % 1;
    const v = A.b(1 - z), r = Math.pow(z, 2) * Rm * (1 + v * .25);
    g.alpha(clamp((1 - z) * (.2 + v * .9), 0, 1));
    ctx.strokeStyle = g.col(z); ctx.lineWidth = p.thick * (1 - z * .6);
    ring(ctx, cx, cy, r, sides, g.t * p.spin + z * 1.2);
    ctx.closePath(); ctx.stroke();
  }
  g.norm();
});

/* ==================== ЧАСТИЦЫ ==================== */
def('particles', 'Particle Burst', 'particles', {
  count: R('Частиц', 350, 40, 1400, 10), gravity: R('Гравитация', 0, -1, 1),
  spread: R('Разлёт', 1, .2, 3), size: R('Размер', 2.4, .5, 9, .1),
  life: R('Жизнь', 1, .2, 3), burst: R('Взрыв на бит', 1, 0, 2)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.max(40, Math.round(p.count * g.q)), st = g.st;
  if (!st.a || st.n !== n) {
    st.a = new Float32Array(n * 5); st.n = n;
    const r = mulberry(7); for (let i = 0; i < n; i++) st.a[i * 5 + 4] = r();
  }
  const a = st.a, boost = 1 + A.beat * p.burst * 2.2;
  g.add();
  for (let i = 0; i < n; i++) {
    const o = i * 5;
    let x = a[o], y = a[o + 1], vx = a[o + 2], vy = a[o + 3], life = a[o + 4];
    life -= g.dt / Math.max(.15, p.life);
    if (life <= 0 || x < -40 || x > w + 40 || y < -40 || y > h + 40) {
      const ang = Math.random() * TAU, sp = (30 + Math.random() * 220) * p.spread * boost;
      x = cx; y = cy; vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; life = 1;
    }
    const v = A.b(i / n);
    vy += p.gravity * 220 * g.dt;
    vx *= 1 - g.dt * .6; vy *= 1 - g.dt * .6;
    x += vx * g.dt * (1 + v * 2.2) * g.S.speed;
    y += vy * g.dt * (1 + v * 2.2) * g.S.speed;
    a[o] = x; a[o + 1] = y; a[o + 2] = vx; a[o + 3] = vy; a[o + 4] = life;
    g.alpha(clamp(life * (.25 + v), 0, 1));
    glowDot(g, x, y, (1 + v * 4) * p.size, i / n);
  }
  g.norm();
});

def('galaxy', 'Galaxy Field', 'particles', {
  stars: R('Звёзд', 600, 80, 1600, 10), arms: R('Рукавов', 3, 1, 8, 1),
  spin: R('Вращение', .25, -1, 1), twinkle: R('Мерцание', .5, 0, 1), size: R('Размер', 1, .3, 3)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.round(p.stars * g.q), a = stars(g, n, 31337);
  const arms = Math.round(p.arms), Rm = Math.min(w, h) * .48;
  g.add();
  for (let i = 0; i < n; i++) {
    const t = a[i * 4], jitter = a[i * 4 + 1] - .5, arm = (a[i * 4 + 2] * arms) | 0;
    const v = A.b(t);
    const ang = t * 4.2 + arm / arms * TAU + g.t * p.spin + jitter * .5;
    const r = t * Rm * (1 + v * .2);
    const tw = 1 - p.twinkle * .5 * (.5 + .5 * Math.sin(g.t * 6 + i));
    g.alpha(clamp((.12 + v * .8) * tw, 0, 1));
    glowDot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * .55, (1 + v * 5) * p.size, t);
  }
  g.norm();
});

def('particleGalaxy', 'Particle Galaxy', 'particles', {
  count: R('Частиц', 500, 80, 1400, 10), orbit: R('Орбита', 1, .2, 3),
  cluster: R('Кучность', .5, 0, 1), size: R('Размер', 1.8, .3, 6, .1), bassPull: R('Тяга низа', .8, 0, 2)
}, g => {
  const { ctx, w, h, cx, cy, p, A } = g;
  const n = Math.round(p.count * g.q), a = stars(g, n, 909);
  const Rm = Math.min(w, h) * .46;
  g.add();
  for (let i = 0; i < n; i++) {
    const seed = a[i * 4], band = a[i * 4 + 1], v = A.b(band);
    const rad = Math.pow(seed, 1 + p.cluster * 1.6) * Rm;
    const speed = p.orbit * (1.6 - seed) * (1 + A.level);
    const ang = seed * TAU + g.t * speed;
    const pull = 1 - A.bass * p.bassPull * .22;
    g.alpha(.12 + v * .8);
    glowDot(g, cx + Math.cos(ang) * rad * pull, cy + Math.sin(ang) * rad * pull * .72,
      (1 + v * 5) * p.size, band);
  }
  g.norm();
});

def('constellation', 'Constellation', 'particles', {
  nodes: R('Узлов', 110, 20, 320, 1), link: R('Дистанция связи', 90, 20, 240, 1),
  drift: R('Дрейф', .5, 0, 2), size: R('Размер', 2, .5, 6, .1), fill: T('Заливка треугольников', false)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.round(p.nodes * g.q), a = stars(g, n, 6060);
  const st = g.st; if (!st.px || st.px.length !== n * 2) st.px = new Float32Array(n * 2);
  const px = st.px;
  for (let i = 0; i < n; i++) {
    const v = A.b(a[i * 4 + 2]);
    px[i * 2] = (a[i * 4] * w + Math.sin(g.t * p.drift * .7 + i) * 30 * (1 + v)) % w;
    px[i * 2 + 1] = a[i * 4 + 1] * h + Math.cos(g.t * p.drift * .6 + i * 1.3) * 26 * (1 + v * 2);
  }
  ctx.lineWidth = 1;
  const dmax = p.link, d2 = dmax * dmax;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < Math.min(n, i + 9); j++) {
      const dx = px[i * 2] - px[j * 2], dy = px[i * 2 + 1] - px[j * 2 + 1], dd = dx * dx + dy * dy;
      if (dd > d2) continue;
      g.alpha((1 - dd / d2) * .35);
      ctx.strokeStyle = g.col(i / n);
      ctx.beginPath(); ctx.moveTo(px[i * 2], px[i * 2 + 1]); ctx.lineTo(px[j * 2], px[j * 2 + 1]); ctx.stroke();
      if (p.fill && j === i + 2) { g.alpha(.05); ctx.fillStyle = g.col(i / n); ctx.fill(); }
    }
  }
  g.add();
  for (let i = 0; i < n; i++) {
    const v = A.b(a[i * 4 + 2]);
    g.alpha(.3 + v * .7);
    glowDot(g, px[i * 2], px[i * 2 + 1], (1 + v * 4) * p.size, a[i * 4 + 2]);
  }
  g.norm();
});

def('nebula', 'Nebula Dust', 'particles', {
  puffs: R('Облаков', 120, 20, 320, 1), size: R('Размер', 24, 4, 80, 1),
  drift: R('Дрейф', .5, 0, 2), depth: R('Глубина', .5, 0, 1), bright: R('Яркость', .6, .1, 1.5)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.round(p.puffs * g.q), a = stars(g, n, 4711);
  g.add();
  for (let i = 0; i < n; i++) {
    const f = a[i * 4 + 2], v = A.b(f), z = a[i * 4 + 3];
    const x = (a[i * 4] * w + Math.sin(g.t * p.drift * .3 + i) * 40 * z) % w;
    const y = a[i * 4 + 1] * h + Math.cos(g.t * p.drift * .25 + i) * 30 * z;
    const s = p.size * (.4 + z * p.depth * 2) * (.6 + v * 1.4);
    g.alpha(clamp((.05 + v * .3) * p.bright, 0, .6));
    glowDot(g, x, y, s, f);
  }
  g.norm();
});

def('meteor', 'Meteor Shower', 'particles', {
  count: R('Метеоров', 60, 8, 220, 1), speed: R('Скорость', 1, .2, 3),
  angle: R('Угол', .4, -1, 1), tail: R('Хвост', 70, 10, 240, 1), thick: R('Толщина', 1.6, .4, 5, .1)
}, g => {
  const { ctx, w, h, p, A } = g;
  const n = Math.round(p.count * g.q), a = stars(g, n, 8123);
  const dx = Math.cos(p.angle * 1.2), dy = Math.sin(p.angle * 1.2) + .8;
  g.add();
  for (let i = 0; i < n; i++) {
    const f = a[i * 4 + 2], v = A.b(f), sp = (.05 + a[i * 4 + 3] * .2) * p.speed * (1 + v * 2.4);
    const prog = (a[i * 4] + g.t * sp) % 1.2 - .1;
    const x = prog * w * 1.3 * dx + a[i * 4 + 1] * w - w * .15;
    const y = prog * h * 1.3 * dy;
    const L = p.tail * (.4 + v * 1.6);
    g.alpha(.2 + v * .8);
    ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick * (.5 + v);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - L * dx, y - L * dy); ctx.stroke();
    glowDot(g, x, y, 2 + v * 7, f);
  }
  g.norm();
});

def('quantum', 'Quantum Threads', 'particles', {
  threads: R('Нитей', 18, 4, 48, 1), jitter: R('Дрожь', .4, 0, 1),
  links: T('Связи', true), phase: R('Фаза', .7, 0, 2), thick: R('Толщина', 1.3, .4, 4, .1)
}, g => {
  const { ctx, w, h, cy, p, A } = g;
  const n = Math.max(4, Math.round(p.threads * g.q));
  const st = g.st; if (!st.pts || st.n !== n) { st.pts = new Float32Array(n * 24); st.n = n; }
  g.add();
  for (let l = 0; l < n; l++) {
    const f = l / n;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const x = i / 23, v = A.b(x * .8 + f * .2);
      const y = cy + Math.sin(x * 8 + f * 5 + g.t * p.phase * 3) * (v * h * .3 + 10) * g.S.amp
        + (f - .5) * h * .5 + Math.sin(g.t * 20 + i * 3 + l) * p.jitter * 10 * v;
      st.pts[l * 24 + i] = y;
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    g.alpha(.2 + A.b(f) * .7); ctx.strokeStyle = g.col(f); ctx.lineWidth = p.thick; ctx.stroke();
  }
  if (p.links) {
    ctx.lineWidth = .8;
    for (let l = 0; l < n - 1; l++) for (let i = 0; i < 24; i += 4) {
      g.alpha(.10);
      ctx.strokeStyle = g.col(l / n);
      ctx.beginPath();
      ctx.moveTo(i / 23 * w, st.pts[l * 24 + i]); ctx.lineTo(i / 23 * w, st.pts[(l + 1) * 24 + i]); ctx.stroke();
    }
  }
  g.norm();
});

def('waveMesh', 'Wave Mesh', 'particles', {
  rows: R('Строк', 16, 4, 40, 1), cols: R('Колонок', 32, 8, 80, 1),
  amp: R('Амплитуда', .8, 0, 2), persp: R('Перспектива', .5, 0, 1), thick: R('Толщина', 1, .3, 3, .1)
}, g => {
  const { ctx, w, h, p, A } = g;
  const R2 = Math.max(4, Math.round(p.rows * g.q)), C = Math.max(8, Math.round(p.cols * g.q));
  const st = g.st;
  const need = R2 * C;
  if (!st.z || st.z.length !== need) st.z = new Float32Array(need);
  // сдвигаем историю вглубь: строка 0 — новая
  for (let r = R2 - 1; r > 0; r--) st.z.copyWithin(r * C, (r - 1) * C, r * C);
  for (let c = 0; c < C; c++) st.z[c] = A.b(c / C);
  ctx.lineWidth = p.thick;
  for (let r = R2 - 1; r >= 0; r--) {
    const f = r / R2, z = 1 - f * p.persp * .72;
    const y0 = h * (.28 + f * .62);
    ctx.beginPath();
    for (let c = 0; c < C; c++) {
      const x = lerp(w * .5, c / (C - 1) * w, z);
      const y = y0 - st.z[r * C + c] * h * .26 * p.amp * g.S.amp;
      c ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    g.alpha(.12 + (1 - f) * .7); ctx.strokeStyle = g.col(1 - f); ctx.stroke();
  }
  g.alpha(1);
});

/* Быстрый доступ */
const VMAP = {};
VIS.forEach(v => VMAP[v.id] = v);

/* ------------------------------------------------------------------
   6. РЕНДЕР-ДВИЖОК
   ------------------------------------------------------------------ */

export { VIS, VMAP };
