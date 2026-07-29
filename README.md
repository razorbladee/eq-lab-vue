# EQ Lab Full

Vue 3 + Vite + Tailwind project with 49 visualizers split into maintainable modules.

- `src/core/audio.js`: Web Audio, FFT mapping, AGC, beat detection
- `src/core/palette.js`: color LUT and glow sprites
- `src/core/visualizers.js`: visualizer registry and renderers
- `src/core/engine.js`: canvas loop, adaptive quality, resizing
- `src/App.vue`: UI, state, persistence, source controls

```bash
npm install
npm run dev
npm run lint
npm run format:check
npm run build
```
