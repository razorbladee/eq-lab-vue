import './core/disable-legacy-effects.js';
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
import './style.css';
import './effects.css';

createApp(App).mount('#app');
