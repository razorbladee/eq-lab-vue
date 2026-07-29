/* ------------------------------------------------------------------
   1. ПАЛИТРА
   LUT из STOPS цветов + кэш спрайтов свечения.
   Всё, что рисуется, берёт цвет отсюда: Palette.at / rgba / sprite.
   ------------------------------------------------------------------ */

/** Размер таблицы цветов. Меньше ~64 — видимые ступени на градиентах. */
const STOPS = 256;
// Legacy scenes referenced STOPS as a browser global. Keep the compatibility
// binding until visualizers.js is fully split into explicit ES modules.
if (typeof globalThis !== 'undefined') globalThis.STOPS = STOPS;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const h = String(hex == null ? '' : hex).trim().replace('#', '');
  const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
  const n = parseInt(s, 16);
  if (!Number.isFinite(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hslToRgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [f(h + 1 / 3) * 255 | 0, f(h) * 255 | 0, f(h - 1 / 3) * 255 | 0]; }

const Palette = {
  key: '', rev: 0,
  r: new Uint8Array(STOPS), g: new Uint8Array(STOPS), b: new Uint8Array(STOPS),
  str: new Array(STOPS).fill('rgb(255,255,255)'),
  sprites: new Array(16).fill(null),
  build(mode, c1, c2, hueOffset) {
    const off = mode === 'spectrum' ? (hueOffset | 0) : 0;
    const key = mode + '|' + c1 + '|' + c2 + '|' + off;
    if (key === this.key) return;
    this.key = key; this.rev++;
    const A = hexToRgb(c1), B = hexToRgb(c2);
    for (let i = 0; i < STOPS; i++) {
      const t = i / (STOPS - 1);
      let c;
      if (mode === 'single') c = A;
      else if (mode === 'spectrum') c = hslToRgb(t * 300 + off, .92, .61);
      else if (mode === 'split') c = t < .5 ? A : B;
      else {
        const m = t * t * (3 - 2 * t);
        c = [Math.sqrt(lerp(A[0] ** 2, B[0] ** 2, m)) | 0,
             Math.sqrt(lerp(A[1] ** 2, B[1] ** 2, m)) | 0,
             Math.sqrt(lerp(A[2] ** 2, B[2] ** 2, m)) | 0];
      }
      this.r[i] = c[0]; this.g[i] = c[1]; this.b[i] = c[2];
      this.str[i] = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }
    this.sprites.fill(null);
  },
  idx(x) { return x > 0 ? (x < 1 ? (x * (STOPS - 1)) | 0 : STOPS - 1) : 0; },
  at(x) { return this.str[this.idx(x)]; },
  rgba(x, a) { const i = this.idx(x); return 'rgba(' + this.r[i] + ',' + this.g[i] + ',' + this.b[i] + ',' + a + ')'; },
  sprite(x) {
    const k = clamp((x * 15) | 0, 0, 15);
    if (this.sprites[k]) return this.sprites[k];
    const s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const c = cv.getContext('2d');
    const i = (k / 15 * (STOPS - 1)) | 0;
    const grd = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, `rgba(${this.r[i]},${this.g[i]},${this.b[i]},1)`);
    grd.addColorStop(.35, `rgba(${this.r[i]},${this.g[i]},${this.b[i]},.42)`);
    grd.addColorStop(1, `rgba(${this.r[i]},${this.g[i]},${this.b[i]},0)`);
    c.fillStyle = grd; c.fillRect(0, 0, s, s);
    this.sprites[k] = cv;
    return cv;
  }
};

export { Palette, STOPS, clamp, lerp, hexToRgb, hslToRgb };
