import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

const fullVisualizer = 'eq-lab-vue (2).html';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'copy-full-visualizer',
      writeBundle() {
        const dist = resolve('dist');
        mkdirSync(dist, { recursive: true });
        copyFileSync(resolve(fullVisualizer), resolve(dist, fullVisualizer));
      },
    },
  ],
});
