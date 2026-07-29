const noop = () => {};
const gradient = { addColorStop: noop };
const imageData = (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
const context = new Proxy({
  canvas: { width: 960, height: 540 },
  createImageData: imageData,
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  measureText: text => ({ width: String(text).length * 7 }),
  getImageData: (_x, _y, w, h) => imageData(w, h),
}, { get: (target, key) => key in target ? target[key] : noop, set: (target, key, value) => { target[key] = value; return true; } });

globalThis.document = { createElement: tag => tag === 'canvas' ? { width: 1, height: 1, getContext: () => context } : {} };
globalThis.Image = class {};

await import('../src/core/experimental-visualizers.js');
await import('../src/core/neon-visualizers.js');
await import('../src/core/future-visualizers.js');
await import('../src/core/reference-visualizers.js');
await import('../src/core/reference-detail-visualizers.js');
await import('../src/core/spectrum-lab.js');
await import('../src/core/beyond-spectrum.js');
const { VIS, VMAP } = await import('../src/core/visualizers.js');
const { Audio } = await import('../src/core/audio.js');
const { Palette } = await import('../src/core/palette.js');

if (VIS.length < 40) throw new Error(`Visualizer registry is unexpectedly small: ${VIS.length}`);
if (Object.keys(VMAP).length !== VIS.length) throw new Error('VIS and VMAP are out of sync');
for (const visualizer of VIS) {
  if (!visualizer.id || !visualizer.name || typeof visualizer.draw !== 'function') throw new Error(`Invalid visualizer: ${visualizer.id || 'unknown'}`);
  for (const [key, schema] of Object.entries(visualizer.params)) {
    if (schema.def === undefined) throw new Error(`${visualizer.id}.${key} has no default`);
  }
}

Palette.build('duo', '#ff5a2d', '#3ea8ff', 0);
for (let i = 0; i < Audio.bands.length; i++) Audio.bands[i] = (Math.sin(i * .13) + 1) * .35;
const waterfall = VMAP.waterfall;
const p = Object.fromEntries(Object.entries(waterfall.params).map(([key, schema]) => [key, schema.def]));
const g = {
  ctx: context, w: 960, h: 540, cx: 480, cy: 270, t: 1, dt: 1 / 60, q: .5,
  A: Audio, S: { amp: 1, speed: 1 }, p, st: {}, bg: '#0d0c12',
  col: x => Palette.at(x), rgba: (x, a) => Palette.rgba(x, a), sprite: x => Palette.sprite(x),
  alpha: a => { context.globalAlpha = a; }, add: () => { context.globalCompositeOperation = 'lighter'; },
  norm: () => { context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1; },
};
waterfall.draw(g);
console.log(`Smoke OK: ${VIS.length} visualizers registered; Spectrum Waterfall rendered.`);
