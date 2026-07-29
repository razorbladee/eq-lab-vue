import './core/disable-legacy-effects.js';
import './core/experimental-visualizers.js';
import './core/neon-visualizers.js';
import './core/future-visualizers.js';
import './core/reference-visualizers.js';
import './core/reference-detail-visualizers.js';
import './core/spectrum-lab.js';
import './core/beyond-spectrum.js';
import './core/effects.js';
import { createApp, h } from 'vue';
import App from './App.vue';
import EffectsPanel from './components/EffectsPanel.vue';
import './style.css';
import './effects.css';

const Root = {
  render: () => h('div', { class: 'app-root' }, [h(App), h(EffectsPanel)]),
};

createApp(Root).mount('#app');
