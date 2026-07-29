import { clamp, lerp, Palette } from '../palette.js';
import { Audio } from '../audio.js';
export const TAU = Math.PI * 2;
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
export const T = (label, def) => ({ label, def, type: 'toggle' });
export const SEL = (label, def, options) => ({ label, def, type: 'select', options });

/* ------------------------------------------------------------------
   5. РЕЕСТР ВИЗУАЛИЗАТОРОВ
   Каждый: свои параметры + своя логика чтения звука.
   g = {ctx,w,h,cx,cy,t,dt,q,A,S,p,st,col,rgba,sprite,alpha,add,norm,rng}
   ------------------------------------------------------------------ */

/* ---------- helpers для рисования ---------- */
export function ring(ctx, cx, cy, r, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * TAU + rot;
    const x = cx + Math.cos(a) * r,
      y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}
export function glowDot(g, x, y, r, cx) {
  const s = g.sprite(cx);
  g.ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
}
export function stars(g, n, seed) {
  const st = g.st,
    key = n + ':' + seed + ':' + (g.w | 0) + 'x' + (g.h | 0);
  if (st.key !== key) {
    const rnd = mulberry(seed);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      a[i * 4] = rnd();
      a[i * 4 + 1] = rnd();
      a[i * 4 + 2] = rnd();
      a[i * 4 + 3] = rnd();
    }
    st.key = key;
    st.a = a;
    st.n = n;
  }
  return st.a;
}

/* ==================== ВОЛНЫ ==================== */
