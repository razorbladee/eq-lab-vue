<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { VIS, VMAP } from './core/visualizers';
import { Audio, ALGOS } from './core/audio';
import { Engine } from './core/engine';
import { clamp } from './core/palette';
import { revoke, disposeAudio, disposeEffects } from './core/lifecycle';
import { useAppController } from './composables/useAppController';
import { useRecorder } from './composables/useRecorder';
import SourcePanel from './components/SourcePanel.vue';
import VisualizerBrowser from './components/VisualizerBrowser.vue';
import ReactionPanel from './components/ReactionPanel.vue';
import StageView from './components/StageView.vue';
import AudioPlayerPanel from './components/AudioPlayerPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import EffectsPanel from './components/EffectsPanel.vue';
import RecorderPanel from './components/RecorderPanel.vue';
import { GSCHEMA, MUSIC, GROUPS, GROUP_SHORT } from './core/constants.js';
import { useStore } from './composables/useStore.js';

const playing = ref(false);
const { g, params, dark, saveState } = useStore(() => syncEngine());
const mic = ref(false),
  hasFile = ref(false),
  dragging = ref(false),
  fileName = ref(''),
  fps = ref(60),
  res = ref('--'),
  qualityPct = ref(100),
  bpm = ref('--'),
  railOpen = ref(false),
  inspOpen = ref(false),
  error = ref(null),
  audioEl = ref(null),
  canvasEl = ref(null),
  frameEl = ref(null);
let audioUrl = '',
  statusTimer = 0,
  meterRaf = 0,
  resizeObserver = null;
document.documentElement.classList.toggle('dark', dark.value);
const controller = useAppController({ visualizers: VIS, visualizerMap: VMAP, state: g, params });
const {
  query,
  group,
  filtered,
  current,
  currentParams,
  setParam,
  resetParams,
  randomParams,
  cycle,
  random,
} = controller;
const paramKeys = computed(() => Object.keys(current.value.params));
const algoList = Object.keys(ALGOS).map((id) => ({ id, name: ALGOS[id].name })),
  algoHint = computed(() => (ALGOS[g.algo] || ALGOS.balanced).hint),
  bandKeys = [
    { k: 'gBass', short: 'Bass' },
    { k: 'gLowMid', short: 'Low' },
    { k: 'gMid', short: 'Mid' },
    { k: 'gHighMid', short: 'High' },
    { k: 'gTreble', short: 'Trbl' },
  ],
  reactKeys = ['amp', 'speed', 'smooth', 'trail'],
  frameKeys = ['zoomW', 'zoomH', 'posX', 'posY'],
  formats = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9', '2:1'];
const frameStyle = computed(() => {
    const [a, b] = g.format.split(':').map(Number);
    return { '--ar': a + '/' + b, '--arn': a / b };
  }),
  sourceLabel = computed(() =>
    mic.value
      ? 'Микрофон · live'
      : fileName.value || (g.demo ? 'Демо-сигнал' : 'Источник не выбран'),
  ),
  fmt = (v) =>
    typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')) : v;
const syncEngine = () => {
  Engine.S = { ...g, playing: playing.value };
  Engine.P = { ...(params[g.preset] || {}) };
  Engine.states = Object.create(null);
};
const recorder = useRecorder(canvasEl, () => ({
  stream: Audio.recordDest?.stream || null,
  audio: audioEl.value,
}));
const applyMusic = () => {
  const m = MUSIC[g.music];
  if (!m) return;
  [g.gBass, g.gLowMid, g.gMid, g.gHighMid, g.gTreble] = m.bands;
  g.smooth = m.smooth;
  g.amp = m.amp;
  g.speed = m.speed;
  g.algo = m.algo;
  g.trail = m.trail;
};
const loadFile = (f) => {
  if (!f) return;
  if (f.type && !f.type.startsWith('audio/')) {
    error.value = { id: 'source', msg: 'Выберите поддерживаемый аудиофайл' };
    return;
  }
  Audio.ensure(audioEl.value);
  if (Audio.ac && Audio.ac.state === 'suspended') {
    Audio.ac.resume().catch(() => {});
  }
  revoke(audioUrl);
  audioUrl = URL.createObjectURL(f);
  audioEl.value.src = audioUrl;
  fileName.value = f.name;
  hasFile.value = true;
  g.demo = false;
  mic.value = false;
  Audio.micOff();
  audioEl.value.play().catch(() => {
    error.value = { id: 'source', msg: 'Браузер не смог воспроизвести этот формат' };
  });
};
const togglePlay = async () => {
  if (!audioEl.value?.src) return;
  Audio.ensure(audioEl.value);
  await Audio.ac.resume();
  if (audioEl.value.paused) {
    await audioEl.value.play().catch(() => {});
  } else audioEl.value.pause();
};
const toggleMicrophone = async () => {
  Audio.ensure(audioEl.value);
  await Audio.ac.resume();
  if (mic.value) {
    Audio.micOff();
    mic.value = false;
    return;
  }
  try {
    audioEl.value.pause();
    await Audio.micOn();
    mic.value = true;
    g.demo = false;
    error.value = null;
  } catch (reason) {
    error.value = { id: 'microphone', msg: reason?.message || 'Нет доступа к микрофону' };
  }
};
const snapshot = () => {
  if (!Engine.canvas) return;
  Engine.canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'eqlab-' + g.preset + '.png';
    link.click();
    setTimeout(() => revoke(url), 0);
  }, 'image/png');
};
const toggleFull = () =>
  document.fullscreenElement ? document.exitFullscreen() : frameEl.value?.requestFullscreen?.();
const resetFrame = () => {
  g.zoomW = g.zoomH = 1;
  g.posX = g.posY = 50;
};
const toggleTheme = () => {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  saveState(g, params, dark.value);
};
const onStageReady = (refs) => {
  canvasEl.value = refs.canvas.value;
  frameEl.value = refs.frame.value;
  Engine.mount(canvasEl.value);
  Engine.onErr = (id, msg) => {
    error.value = { id, msg };
  };
  Engine.resize();
  syncEngine();
  Engine.start();
};
const onAudioReady = (source) => {
  audioEl.value = source.value;
  Audio.ensure(audioEl.value);
};
const onPlayState = (value) => {
  playing.value = value;
  syncEngine();
};
const onDrop = (e) => {
  dragging.value = false;
  loadFile(e.dataTransfer.files[0]);
};
watch(playing, () => syncEngine());
onMounted(() => {
  statusTimer = setInterval(() => {
    fps.value = Engine.fps;
    res.value = Engine.canvas ? Engine.canvas.width + '×' + Engine.canvas.height : '--';
    qualityPct.value = Math.round(Engine.q * 100);
    bpm.value = Audio.bpm || '--';
  }, 500);
  nextTick(() => {
    if (frameEl.value) {
      resizeObserver = new ResizeObserver(() => Engine.resize());
      resizeObserver.observe(frameEl.value);
    }
  });
});
onUnmounted(() => {
  recorder.cancel();
  clearInterval(statusTimer);

  resizeObserver?.disconnect();
  Engine.stop();
  Engine.onErr = null;
  revoke(audioUrl);
  audioUrl = '';
  void disposeEffects();
  void disposeAudio(audioEl.value);
});
</script>
<template>
  <div id="app" v-cloak class="shell">
    <header
      class="relative flex items-center justify-between px-4 py-2.5 border-b"
      style="border-color: var(--line); background: var(--panel)"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button class="btn xl:hidden" @click="railOpen = !railOpen">☰</button>
        <span class="mono font-bold text-[13px] tracking-[0.2em]">EQ&nbsp;LAB</span>
      </div>

      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 text-center pointer-events-none hidden sm:block"
      >
        <span
          class="mono text-[10px] tracking-[0.14em] uppercase truncate block"
          style="color: var(--ink-3)"
          >{{ sourceLabel }}</span
        >
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span class="hidden sm:inline mono text-[10px] nums mr-2" style="color: var(--ink-3)"
          ><span v-if="bpm !== '--'">BEAT · {{ bpm }} &nbsp;|&nbsp; </span>{{ fps }} FPS /
          {{ res }} / Q{{ qualityPct }}</span
        >
        <select v-model="g.format" style="width: auto; min-width: 88px" class="mono text-[12px]">
          <option v-for="format in formats" :key="format">{{ format }}</option>
        </select>
        <button class="btn" @click="snapshot">PNG</button>
        <button class="btn" @click="toggleFull">⛶</button>
        <button class="btn" @click="toggleTheme">{{ dark ? '☀' : '☾' }}</button>
        <button class="btn xl:hidden" @click="inspOpen = !inspOpen">⚙</button>
      </div>
    </header>
    <div class="body-row">
      <aside class="rail" :class="{ open: railOpen }">
        <SourcePanel
          :playing="playing"
          :microphone="mic"
          :has-file="hasFile"
          :demo="g.demo"
          :load-file="loadFile"
          :toggle-microphone="toggleMicrophone"
          @update:demo="g.demo = $event"
        /><VisualizerBrowser
          :items="filtered"
          :selected="g.preset"
          :query="query"
          :group="group"
          :groups="GROUPS"
          :labels="GROUP_SHORT"
          :cycle="cycle"
          :random="random"
          @update:selected="g.preset = $event"
          @update:query="query = $event"
          @update:group="group = $event"
        /><ReactionPanel
          :state="g"
          :algorithms="algoList"
          :hint="algoHint"
          :music="MUSIC"
          :schema="GSCHEMA"
          :keys="reactKeys"
          :apply-music="applyMusic"
        /><EffectsPanel />
      </aside>
      <StageView
        :frame-style="frameStyle"
        :dragging="dragging"
        :meters="meters"
        :bands="bandKeys"
        :bpm="bpm"
        :error="error"
        @ready="onStageReady"
        @dragover="dragging = true"
        @dragleave="dragging = false"
        @drop="onDrop"
      /><AudioPlayerPanel
        :playing="playing"
        :has-file="hasFile"
        :file-name="fileName"
        @ready="onAudioReady"
        @toggle="togglePlay"
        @play-state="onPlayState"
      /><InspectorPanel
        :current="current"
        :params="currentParams"
        :state="g"
        :schema="GSCHEMA"
        :frame-keys="frameKeys"
        :param-keys="paramKeys"
        :group-short="GROUP_SHORT"
        :formats="formats"
        :dark="dark"
        :reset-params="resetParams"
        :random-params="randomParams"
        :reset-frame="resetFrame"
        :set-param="setParam"
        :fmt="fmt"
        :snapshot="snapshot"
        :toggle-full="toggleFull"
        :toggle-theme="toggleTheme"
        ><RecorderPanel
          :recording="recorder.recording"
          :countdown="recorder.countdown"
          :error="recorder.error"
          :start="recorder.start"
          :stop="recorder.stop"
          :cancel="recorder.cancel"
      /></InspectorPanel>
      <div
        class="scrim xl:hidden"
        v-if="railOpen || inspOpen"
        @click="
          railOpen = false;
          inspOpen = false;
        "
      ></div>
    </div>
  </div>
</template>
