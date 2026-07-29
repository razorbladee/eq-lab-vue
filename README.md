# EQ Lab

Vue 3 + Vite + Tailwind v4 audio visualizer project.

## Run

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run format
npm run format:check
npm run build
```

The project includes per-visualizer state in localStorage, Canvas rendering, audio playback, dark/light theme, responsive Tailwind layout, and WebM recording with `canvas.captureStream()` and `MediaRecorder`.

The original single-file implementation is preserved in `legacy/eq222-original.html`.
