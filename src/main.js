import './core/experimental-visualizers.js';
import './core/neon-visualizers.js';
import './core/future-visualizers.js';
import './core/reference-visualizers.js';
import './core/reference-detail-visualizers.js';
import './core/spectrum-lab.js';
import './core/beyond-spectrum.js';
import './core/effects.js';
import { createApp } from 'vue';
import App from './App.vue';
import EffectsPanel from './components/EffectsPanel.vue';
import './style.css';
import './effects.css';

const app = createApp(App);
app.mount('#app');
const rail = document.querySelector('.rail');
if (rail && !rail.querySelector('[data-effects-panel]')) {
  const host = document.createElement('div');
  rail.appendChild(host);
  createApp(EffectsPanel).mount(host);
}
