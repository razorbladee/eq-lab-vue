import { Palette, clamp } from './palette.js';
import { Audio } from './audio.js';
import { VIS, VMAP } from './visualizers.js';

/* ------------------------------------------------------------------
   4. РЕНДЕР-ДВИЖОК
   Канвас, DPR, адаптивное качество, состояние сцен, кадровый цикл.
   ------------------------------------------------------------------ */

const Engine = {
  canvas: null, ctx: null, g: null, W: 0, H: 0, DPR: 1, raf: 0, last: 0,
  q: 1, ema: 16, frames: 0, fpsAcc: 0, fps: 60,
  states: Object.create(null),
  S: null, P: null, onErr: null,
  bgOf: { ink: '#0d0c12', slate: '#141a1f', paper: '#f5f2ec' },

  mount(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.g = {
      ctx: this.ctx, w: 0, h: 0, cx: 0, cy: 0, t: 0, dt: .016, q: 1,
      A: Audio, S: null, p: null, st: null, bg: '#0d0c12',
      col: x => Palette.at(x),
      rgba: (x, a) => Palette.rgba(x, a),
      sprite: x => Palette.sprite(x),
      alpha: a => { this.ctx.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a; },
      add: () => { this.ctx.globalCompositeOperation = 'lighter'; },
      norm: () => { this.ctx.globalCompositeOperation = 'source-over'; this.ctx.globalAlpha = 1; }
    };
  },

  /** Пересчёт буфера. Пиксели ограничены, чтобы 4K-мониторы не убивали FPS. */
  resize() {
    const c = this.canvas, r = c.getBoundingClientRect();
    if (!c || r.width < 2 || r.height < 2) return;
    const MAXPX = 2.6e6;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = r.width * r.height * dpr * dpr;
    if (px > MAXPX) dpr *= Math.sqrt(MAXPX / px);
    const bw = Math.max(2, Math.round(r.width * dpr)), bh = Math.max(2, Math.round(r.height * dpr));

    // Геометрию в CSS-пикселях обновляем всегда, даже если размер буфера не
    // изменился: иначе центр сцены залипает в (0,0) и половина сцен пуста.
    this.DPR = dpr; this.W = r.width; this.H = r.height;
    this.g.w = r.width; this.g.h = r.height; this.g.cx = r.width / 2; this.g.cy = r.height / 2;

    if (c.width === bw && c.height === bh) return;
    c.width = bw; c.height = bh;
    // Смена формата = новая геометрия: сбрасываем состояния сцен и кэши
    this.states = Object.create(null);
    Palette.sprites.fill(null);
    this.paintBg();
  },

  paintBg() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.g.bg;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
  },

  state(id) {
    let s = this.states[id];
    if (!s) s = this.states[id] = {};
    return s;
  },

  start() {
    if (this.raf) return;
    const loop = now => {
      this.raf = requestAnimationFrame(loop);
      const dt = this.last ? clamp((now - this.last) / 1000, .001, .05) : .016;
      this.last = now;
      this.tick(dt, now);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0; this.last = 0;
  },

  tick(dt, now) {
    const S = this.S, P = this.P;
    if (!S || !this.canvas) return;
    if (!this.W || !this.H) { this.resize(); if (!this.W || !this.H) return; }

    // Адаптивное качество: держим ~60 FPS даже на тяжёлых сценах
    this.ema += ((dt * 1000) - this.ema) * .08;
    this.frames++; this.fpsAcc += dt;
    if (this.fpsAcc > .5) { this.fps = Math.round(this.frames / this.fpsAcc); this.frames = 0; this.fpsAcc = 0; }
    if (S.autoQuality) {
      if (this.ema > 20.5 && this.q > .42) this.q = Math.max(.42, this.q - .035);
      else if (this.ema < 13.5 && this.q < 1) this.q = Math.min(1, this.q + .012);
    } else this.q = 1;

    Audio.update(dt, S);
    Palette.build(S.colorMode, S.c1, S.c2, (now * S.cycle * .02) % 360 | 0);

    const ctx = this.ctx, W = this.W, H = this.H;
    const bg = S.canvasBg === 'theme'
      ? (document.documentElement.classList.contains('dark') ? '#12111a' : '#f2efe8')
      : (this.bgOf[S.canvasBg] || '#0d0c12');
    this.g.bg = bg;

    ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(1 - S.trail, .035, 1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    const vis = VMAP[S.preset] || VIS[0];
    const g = this.g;
    g.dt = dt; g.t += dt * S.speed; g.q = this.q; g.S = S; g.p = P; g.st = this.state(vis.id);

    ctx.save();
    ctx.translate(W / 2 + (S.posX - 50) * W / 100, H / 2 + (S.posY - 50) * H / 100);
    ctx.scale(S.zoomW, S.zoomH);
    ctx.translate(-W / 2, -H / 2);

    // Полный сброс состояния ctx: сцены не должны наследовать друг у друга
    // lineCap, толщину, шрифт и сглаживание картинок.
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.lineWidth = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '400 12px "Space Mono",ui-monospace,monospace';
    ctx.imageSmoothingEnabled = true;

    try {
      vis.draw(g);
    } catch (e) {
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (this.onErr) this.onErr(vis.id, e.message || String(e));
      return;
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
};

export { Engine };
