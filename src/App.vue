<script>
import { ref, watch, reactive, computed, onMounted } from 'vue';
import { VIS, VMAP } from './core/visualizers';
import { ALGOS } from './core/audio';
import { Engine } from './core/engine';
import { clamp } from './core/palette';

const KEY = 'eqlab.v2';

const GSCHEMA = {
  amp:    { label: 'Амплитуда', min: .3, max: 2.5, step: .05 },
  speed:  { label: 'Скорость', min: .1, max: 3, step: .05 },
  smooth: { label: 'Сглаживание FFT', min: 0, max: .95, step: .01 },
  trail:  { label: 'Шлейф', min: 0, max: .97, step: .01 },
  zoomW:  { label: 'Ширина обзора', min: .4, max: 1.6, step: .01 },
  zoomH:  { label: 'Высота обзора', min: .4, max: 1.6, step: .01 },
  posX:   { label: 'Смещение X', min: 0, max: 100, step: 1 },
  posY:   { label: 'Смещение Y', min: 0, max: 100, step: 1 }
};

const MUSIC = {
  edm:       { bands: [1.75, 1.15, .85, 1.05, 1.4], smooth: .5,  amp: 1.35, speed: 1.35, algo: 'bassPunch', trail: .5 },
  ambient:   { bands: [.7, .9, 1.2, 1.1, 1],        smooth: .88, amp: .9,  speed: .55, algo: 'cinematic', trail: .82 },
  rock:      { bands: [1.35, 1.25, 1.45, 1.15, 1.05], smooth: .66, amp: 1.15, speed: 1.1, algo: 'attack', trail: .4 },
  hiphop:    { bands: [1.9, 1.3, .9, .85, 1.1],     smooth: .58, amp: 1.25, speed: .95, algo: 'beatPulse', trail: .55 },
  classical: { bands: [.8, 1, 1.2, 1.3, 1.35],      smooth: .82, amp: 1,   speed: .7,  algo: 'balanced', trail: .7 },
  podcast:   { bands: [.5, 1.35, 1.8, 1.05, .6],    smooth: .9,  amp: .8,  speed: .45, algo: 'midFocus', trail: .35 }
};

const PALETTES = [
  { name: 'Ember',  c1: '#ff5a2d', c2: '#ffd166' },
  { name: 'Ice',    c1: '#3ea8ff', c2: '#b6f7ff' },
  { name: 'Toxic',  c1: '#c6ff3d', c2: '#00d9a3' },
  { name: 'Orchid', c1: '#ff3d9a', c2: '#7b5cff' },
  { name: 'Mono',   c1: '#f3f0ea', c2: '#8e8b86' },
  { name: 'Dusk',   c1: '#ff8a3d', c2: '#2b4bff' }
];

export default {
  setup() {
    const audioEl = ref(null), canvasEl = ref(null), frameEl = ref(null), stageEl = ref(null), beatEl = ref(null);
    const meterEls = reactive([]);

    const defaults = {
      preset: 'bars', algo: 'balanced', music: 'custom',
      colorMode: 'duo', c1: '#ff5a2d', c2: '#3ea8ff', cycle: 0, canvasBg: 'ink',
      format: '16:9', amp: 1, speed: 1, smooth: .58, trail: .35,
      zoomW: 1, zoomH: 1, posX: 50, posY: 50,
      gBass: 1, gLowMid: 1, gMid: 1, gHighMid: 1, gTreble: 1,
      agc: true, demo: true, autoQuality: true
    };

    const g = reactive({ ...defaults });
    const params = reactive({});
    const dark = ref(document.documentElement.classList.contains('dark'));
    const playing = ref(false), mic = ref(false), hasFile = ref(false), drag = ref(false);
    const fileName = ref(''), fps = ref(60), res = ref('--'), qualityPct = ref(100), bpm = ref('--');
    const railOpen = ref(false), inspOpen = ref(false), err = ref(null);
    const recording = ref(false);
    let recorder = null, recordChunks = [];
    const q = ref(''), grpFilter = ref('');

    /* ---------- дефолты параметров для каждого визуализатора ---------- */
    function seedParams() {
      VIS.forEach(v => {
        if (!params[v.id]) params[v.id] = {};
        Object.keys(v.params).forEach(k => {
          if (params[v.id][k] === undefined) params[v.id][k] = v.params[k].def;
        });
      });
    }

    /* ---------- localStorage ---------- */
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.g) Object.keys(defaults).forEach(k => { if (s.g[k] !== undefined) g[k] = s.g[k]; });
        if (s.params) Object.keys(s.params).forEach(id => { if (VMAP[id]) params[id] = { ...s.params[id] }; });
        if (s.dark !== undefined) {
          dark.value = !!s.dark;
          document.documentElement.classList.toggle('dark', dark.value);
        }
      }
    } catch (e) { /* повреждённое хранилище игнорируем */ }
    seedParams();
    if (!VMAP[g.preset]) g.preset = 'bars';

    let saveT = 0;
    const save = () => {
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify({ g: { ...g }, params: JSON.parse(JSON.stringify(params)), dark: dark.value }));
        } catch (e) { /* квота */ }
      }, 220);
    };

    /* ---------- Плоские снимки для рендер-цикла (без reactive-прокси в горячем коде) ---------- */
    const sync = () => {
      Engine.S = { ...g, playing: playing.value };
      Engine.P = { ...(params[g.preset] || {}) };
    };
    watch(g, () => { sync(); save(); }, { deep: true });
    watch(params, () => { sync(); save(); }, { deep: true });
    watch(playing, sync);

    const current = computed(() => VMAP[g.preset] || VIS[0]);
    const p = computed(() => params[g.preset] || {});
    const paramKeys = computed(() => Object.keys(current.value.params));

    const groupList = [
      { id: 'waves', name: 'Волны' }, { id: 'spectrum', name: 'Спектр' },
      { id: 'radial', name: 'Формы' }, { id: 'particles', name: 'Частицы' },
      { id: 'futuristic', name: 'Футуризм' }
    ];
    const groupShort = { waves: 'Волны', spectrum: 'Спектр', radial: 'Формы', particles: 'Частицы', futuristic: 'Футуризм' };

    const filtered = computed(() => {
      const s = q.value.trim().toLowerCase();
      return VIS.filter(v =>
        (!grpFilter.value || v.group === grpFilter.value) &&
        (!s || v.name.toLowerCase().includes(s) || v.id.toLowerCase().includes(s)));
    });

    const algoList = Object.keys(ALGOS).map(id => ({ id, name: ALGOS[id].name }));
    const algoHint = computed(() => (ALGOS[g.algo] || ALGOS.balanced).hint);
    const bandKeys = [
      { k: 'gBass', label: 'Bass', short: 'Bass' }, { k: 'gLowMid', label: 'Low-mid', short: 'Low' },
      { k: 'gMid', label: 'Mid', short: 'Mid' }, { k: 'gHighMid', label: 'High-mid', short: 'High' },
      { k: 'gTreble', label: 'Treble', short: 'Trbl' }
    ];
    const globalKeys = { react: ['amp', 'speed', 'smooth', 'trail'], frame: ['zoomW', 'zoomH', 'posX', 'posY'] };
    const formats = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9', '2:1'];

    const frameStyle = computed(() => {
      const [a, b] = g.format.split(':').map(Number);
      return { '--ar': a + '/' + b, '--arn': (a / b) };
    });
    const sourceLabel = computed(() =>
      mic.value ? 'Микрофон · live' : fileName.value ? fileName.value : g.demo ? 'Демо-сигнал' : 'Источник не выбран');

    /* ---------- действия ---------- */
    const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')) : v;
    const setP = (k, v) => { params[g.preset][k] = v; };

    function resetParams() {
      const s = current.value.params;
      Object.keys(s).forEach(k => params[g.preset][k] = s[k].def);
    }
    function randomParams() {
      const s = current.value.params;
      Object.keys(s).forEach(k => {
        const d = s[k];
        if (d.type === 'toggle') params[g.preset][k] = Math.random() > .5;
        else if (d.type === 'select') params[g.preset][k] = d.options[(Math.random() * d.options.length) | 0];
        else {
          const raw = d.min + Math.random() * (d.max - d.min);
          params[g.preset][k] = Math.round(raw / d.step) * d.step;
        }
      });
    }
    function cyclePreset(dir) {
      const list = filtered.value.length ? filtered.value : VIS;
      const i = list.findIndex(v => v.id === g.preset);
      g.preset = list[(i + dir + list.length) % list.length].id;
    }
    function randomPreset() {
      const list = filtered.value.length ? filtered.value : VIS;
      g.preset = list[(Math.random() * list.length) | 0].id;
    }
    function applyMusic() {
      const m = MUSIC[g.music];
      if (!m) return;
      g.gBass = m.bands[0]; g.gLowMid = m.bands[1]; g.gMid = m.bands[2];
      g.gHighMid = m.bands[3]; g.gTreble = m.bands[4];
      g.smooth = m.smooth; g.amp = m.amp; g.speed = m.speed; g.algo = m.algo; g.trail = m.trail;
    }
    function setPalette(pal) { g.c1 = pal.c1; g.c2 = pal.c2; if (g.colorMode === 'spectrum') g.colorMode = 'duo'; }
    function resetFrame() { g.zoomW = 1; g.zoomH = 1; g.posX = 50; g.posY = 50; }
    function toggleTheme() {
      dark.value = !dark.value;
      document.documentElement.classList.toggle('dark', dark.value);
      save();
    }

    function loadFile(f) {
      if (!f) return;
      Audio.ensure(audioEl.value);
      if (mic.value) { Audio.micOff(); mic.value = false; }
      if (audioEl.value.src.startsWith('blob:')) URL.revokeObjectURL(audioEl.value.src);
      audioEl.value.src = URL.createObjectURL(f);
      fileName.value = f.name;
      hasFile.value = true;
      g.demo = false;
      audioEl.value.play().catch(() => {});
    }
    const onFile = e => loadFile(e.target.files[0]);
    const onDrop = e => { drag.value = false; loadFile(e.dataTransfer.files[0]); };

    async function togglePlay() {
      const el = audioEl.value;
      if (!el.src) return;
      Audio.ensure(el);
      await Audio.ac.resume();
      if (el.paused) { await el.play().catch(() => {}); } else el.pause();
    }
    async function toggleMic() {
      Audio.ensure(audioEl.value);
      await Audio.ac.resume();
      if (mic.value) { Audio.micOff(); mic.value = false; return; }
      try {
        audioEl.value.pause();
        await Audio.micOn();
        mic.value = true; g.demo = false;
      } catch (e) { mic.value = false; fileName.value = 'нет доступа к микрофону'; }
    }
    async function toggleRecord() {
      if (recording.value) { recorder?.stop(); return; }
      Audio.ensure(audioEl.value); await Audio.ac.resume();
      const videoTrack = Engine.canvas.captureStream(30).getVideoTracks()[0];
      const audioTrack = Audio.recordDest?.stream.getAudioTracks()[0];
      const stream = new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      recordChunks = []; recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined);
      recorder.ondataavailable = event => { if (event.data.size) recordChunks.push(event.data); };
      recorder.onstop = () => { const url = URL.createObjectURL(new Blob(recordChunks, { type: 'video/webm' })); const link = document.createElement('a'); link.href = url; link.download = 'eq-lab-' + g.preset + '.webm'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); stream.getTracks().forEach(track => track.stop()); recording.value = false; };
      recorder.start(1000); recording.value = true;
    }

    function snapshot() {
      Engine.canvas.toBlob(b => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'eqlab-' + g.preset + '-' + g.format.replace(':', 'x') + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    }
    function toggleFull() {
      const el = frameEl.value;
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen && el.requestFullscreen();
    }

    /* ---------- монтирование ---------- */
    onMounted(() => {
      Engine.mount(canvasEl.value);
      Engine.onErr = (id, msg) => { err.value = { id, msg }; g.preset = 'bars'; };
      sync();
      Engine.resize();
      Engine.start();

      const ro = new ResizeObserver(() => Engine.resize());
      ro.observe(frameEl.value);
      window.addEventListener('resize', () => Engine.resize());

      const el = audioEl.value;
      el.addEventListener('play', () => { playing.value = true; });
      el.addEventListener('pause', () => { playing.value = false; });
      el.addEventListener('ended', () => { playing.value = false; });

      // UI-метрики отдельным медленным таймером: реактивность не в rAF
      setInterval(() => {
        fps.value = Engine.fps;
        res.value = Engine.canvas.width + '×' + Engine.canvas.height;
        qualityPct.value = Math.round(Engine.q * 100);
        bpm.value = Audio.bpm || '--';
      }, 500);

      // Метры и бит — через transform, без пересчёта лейаута
      const bandsRef = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
      const paint = () => {
        for (let i = 0; i < 5; i++) {
          const el2 = meterEls[i];
          if (el2) el2.style.transform = 'scaleX(' + clamp(Audio[bandsRef[i]], 0, 1).toFixed(3) + ')';
        }
        if (beatEl.value) beatEl.value.style.opacity = (.18 + Audio.beat * .82).toFixed(2);
        requestAnimationFrame(paint);
      };
      requestAnimationFrame(paint);

      window.addEventListener('keydown', e => {
        if (/input|select|textarea/i.test(e.target.tagName)) return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') cyclePreset(1);
        else if (e.code === 'ArrowLeft') cyclePreset(-1);
        else if (e.key.toLowerCase() === 'r') randomPreset();
        else if (e.key.toLowerCase() === 't') toggleTheme();
        else if (e.key.toLowerCase() === 'f') toggleFull();
      });

      watch(() => g.format, () => nextTick(() => Engine.resize()));
      watch(() => g.preset, () => { err.value = null; inspOpen.value = window.innerWidth > 1180 ? inspOpen.value : inspOpen.value; });
    });

    return {
      g, params, p, current, paramKeys, dark, playing, recording, mic, hasFile, drag, fps, res, qualityPct, bpm,
      railOpen, inspOpen, err, q, grpFilter, filtered, groupList, groupShort, algoList, algoHint,
      bandKeys, globalKeys, gschema: GSCHEMA, formats, palettes: PALETTES, frameStyle, sourceLabel,
      audioEl, canvasEl, frameEl, stageEl, beatEl, meterEls,
      fmt, setP, resetParams, randomParams, cyclePreset, randomPreset, applyMusic, setPalette,
      resetFrame, toggleTheme, onFile, onDrop, togglePlay, toggleMic, toggleRecord, snapshot, toggleFull
    };
  }
};

</script>

<template>

<div id="app" v-cloak class="shell">

  <!-- ================= ВЕРХНЯЯ ПАНЕЛЬ ================= -->
  <header class="flex items-center gap-3 px-4 py-2.5 border-b" style="border-color:var(--line);background:var(--panel)">
    <button class="btn xl:hidden" style="padding:8px 10px" @click="railOpen=!railOpen" title="Управление">☰</button>

    <div class="flex items-baseline gap-2.5 min-w-0">
      <span class="mono font-bold text-[13px] tracking-[0.2em]">EQ&nbsp;LAB</span>
      <span class="mono text-[10px] tracking-[0.14em] uppercase truncate" style="color:var(--ink-3)">{{ sourceLabel }}</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <div class="hidden sm:flex items-center gap-2 mono text-[10.5px] tracking-[0.1em] uppercase nums"
           style="color:var(--ink-3)">
        <span :style="{color: fps < 45 ? 'var(--accent)' : 'var(--ink-3)'}">{{ fps }} FPS</span>
        <span style="opacity:.4">/</span>
        <span>{{ res }}</span>
        <span style="opacity:.4">/</span>
        <span>Q{{ qualityPct }}</span>
      </div>
      <select v-model="g.format" style="width:auto;min-width:88px" class="mono text-[12px]" title="Формат кадра">
        <option v-for="f in formats" :key="f" :value="f">{{ f }}</option>
      </select>
      <button class="btn" @click="snapshot" title="Скачать PNG">PNG</button>
      <button class="btn" :class="{'btn-live':recording}" @click="toggleRecord">{{ recording ? '■ Стоп' : '● WebM' }}</button>
      <button class="btn" @click="toggleFull" title="На весь экран">⛶</button>
      <button class="btn" @click="toggleTheme" :title="dark ? 'Светлая тема' : 'Тёмная тема'">
        {{ dark ? '☀' : '☾' }}
      </button>
      <button class="btn xl:hidden" style="padding:8px 10px" @click="inspOpen=!inspOpen" title="Параметры">⚙</button>
    </div>
  </header>

  <div class="body-row">

    <!-- ================= ЛЕВАЯ ПАНЕЛЬ ================= -->
    <aside class="rail" :class="{open:railOpen}">

      <details class="sec" open>
        <summary>Источник</summary>
        <div class="sec-body flex flex-col gap-2.5">
          <div class="grid grid-cols-2 gap-2">
            <label class="btn" style="cursor:pointer">
              Файл
              <input type="file" accept="audio/*" class="hidden" @change="onFile">
            </label>
            <button class="btn" :class="{'btn-live':mic}" @click="toggleMic">
              {{ mic ? 'Стоп мик' : 'Микрофон' }}
            </button>
          </div>
          <button class="btn btn-primary" @click="togglePlay" :disabled="!hasFile">
            {{ playing ? '⏸ Пауза' : '▶ Играть' }}
          </button>
          <audio ref="audioEl" controls preload="metadata"></audio>
          <label class="flex items-center justify-between gap-3 text-[12.5px]" style="color:var(--ink-2)">
            Демо-сигнал без звука
            <span class="sw" :data-on="g.demo" role="switch" :aria-checked="g.demo" tabindex="0"
                  @click="g.demo=!g.demo" @keydown.space.prevent="g.demo=!g.demo"><i></i></span>
          </label>
          <p class="text-[11.5px]" style="color:var(--ink-3)" v-if="!hasFile && !mic">
            Перетащите трек на кадр или включите микрофон. Пока источника нет, сцену ведёт синтетический бит.
          </p>
        </div>
      </details>

      <details class="sec" open>
        <summary>Визуализатор · {{ filtered.length }}</summary>
        <div class="sec-body flex flex-col gap-2.5">
          <input type="search" v-model="q" placeholder="Поиск: aurora, bars, tunnel…">
          <div class="flex flex-wrap gap-1.5">
            <button class="chip" v-for="grp in groupList" :key="grp.id"
                    :aria-pressed="grpFilter===grp.id" @click="grpFilter = grpFilter===grp.id ? '' : grp.id">
              {{ grp.name }}
            </button>
          </div>
          <div class="plist" role="listbox">
            <button v-for="v in filtered" :key="v.id" class="pitem" role="option"
                    :aria-current="g.preset===v.id" @click="g.preset=v.id">
              <b></b><span>{{ v.name }}</span><em>{{ groupShort[v.group] }}</em>
            </button>
            <p v-if="!filtered.length" class="text-[12px] py-3 px-1" style="color:var(--ink-3)">
              Ничего не нашлось. Сбросьте фильтр.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn" @click="cyclePreset(-1)">← Пред</button>
            <button class="btn" @click="cyclePreset(1)">След →</button>
          </div>
          <button class="btn" @click="randomPreset">🎲 Случайный</button>
        </div>
      </details>

      <details class="sec" open>
        <summary>Реакция на звук</summary>
        <div class="sec-body flex flex-col gap-3">
          <label class="block">
            <span class="plabel">Алгоритм</span>
            <select v-model="g.algo">
              <option v-for="a in algoList" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </label>
          <p class="text-[11.5px] -mt-1" style="color:var(--ink-3)">{{ algoHint }}</p>
          <label class="block">
            <span class="plabel">Жанровый пресет</span>
            <select v-model="g.music" @change="applyMusic">
              <option value="custom">Custom</option>
              <option value="edm">EDM / Bass</option>
              <option value="ambient">Ambient</option>
              <option value="rock">Rock</option>
              <option value="hiphop">Hip-Hop</option>
              <option value="classical">Classical</option>
              <option value="podcast">Voice / Podcast</option>
            </select>
          </label>
          <label class="flex items-center justify-between gap-3 text-[12.5px]" style="color:var(--ink-2)">
            Авто-усиление (AGC)
            <span class="sw" :data-on="g.agc" role="switch" :aria-checked="g.agc" tabindex="0"
                  @click="g.agc=!g.agc" @keydown.space.prevent="g.agc=!g.agc"><i></i></span>
          </label>
          <div v-for="k in globalKeys.react" :key="k">
            <span class="plabel">{{ gschema[k].label }}<span class="pval">{{ fmt(g[k]) }}</span></span>
            <input type="range" :min="gschema[k].min" :max="gschema[k].max" :step="gschema[k].step"
                   :value="g[k]" @input="g[k]=+$event.target.value">
          </div>
          <div class="hr"></div>
          <span class="mono text-[10px] tracking-[0.13em] uppercase" style="color:var(--ink-3)">Полосы</span>
          <div v-for="b in bandKeys" :key="b.k">
            <span class="plabel">{{ b.label }}<span class="pval">{{ fmt(g[b.k]) }}×</span></span>
            <input type="range" min="0" max="2.5" step="0.05" :value="g[b.k]" @input="g[b.k]=+$event.target.value">
          </div>
        </div>
      </details>

      <details class="sec">
        <summary>Цвет</summary>
        <div class="sec-body flex flex-col gap-3">
          <label class="block">
            <span class="plabel">Режим</span>
            <select v-model="g.colorMode">
              <option value="duo">Дуо-градиент</option>
              <option value="single">Один цвет</option>
              <option value="spectrum">Спектр</option>
              <option value="split">Сплит (жёсткий)</option>
            </select>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="plabel">A</span><input type="color" v-model="g.c1"></label>
            <label class="block"><span class="plabel">B</span><input type="color" v-model="g.c2"></label>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button class="chip" v-for="p in palettes" :key="p.name" @click="setPalette(p)">{{ p.name }}</button>
          </div>
          <div>
            <span class="plabel">Прокрутка оттенка<span class="pval">{{ fmt(g.cycle) }}</span></span>
            <input type="range" min="0" max="2" step="0.02" :value="g.cycle" @input="g.cycle=+$event.target.value">
          </div>
          <label class="block">
            <span class="plabel">Фон кадра</span>
            <select v-model="g.canvasBg">
              <option value="ink">Ink</option>
              <option value="slate">Slate</option>
              <option value="paper">Paper</option>
              <option value="theme">По теме</option>
            </select>
          </label>
        </div>
      </details>

      <details class="sec">
        <summary>Кадр и движение</summary>
        <div class="sec-body flex flex-col gap-3">
          <div v-for="k in globalKeys.frame" :key="k">
            <span class="plabel">{{ gschema[k].label }}<span class="pval">{{ fmt(g[k]) }}</span></span>
            <input type="range" :min="gschema[k].min" :max="gschema[k].max" :step="gschema[k].step"
                   :value="g[k]" @input="g[k]=+$event.target.value">
          </div>
          <label class="flex items-center justify-between gap-3 text-[12.5px]" style="color:var(--ink-2)">
            Адаптивное качество
            <span class="sw" :data-on="g.autoQuality" role="switch" :aria-checked="g.autoQuality" tabindex="0"
                  @click="g.autoQuality=!g.autoQuality" @keydown.space.prevent="g.autoQuality=!g.autoQuality"><i></i></span>
          </label>
          <button class="btn" @click="resetFrame">Сбросить кадр</button>
        </div>
      </details>

      <details class="sec">
        <summary>Горячие клавиши</summary>
        <div class="sec-body flex flex-col gap-2 text-[12px]" style="color:var(--ink-2)">
          <div class="flex justify-between"><span>Play / Pause</span><kbd>Space</kbd></div>
          <div class="flex justify-between"><span>Смена визуализатора</span><kbd>← →</kbd></div>
          <div class="flex justify-between"><span>Случайный</span><kbd>R</kbd></div>
          <div class="flex justify-between"><span>Тема</span><kbd>T</kbd></div>
          <div class="flex justify-between"><span>Полный экран</span><kbd>F</kbd></div>
        </div>
      </details>
    </aside>

    <!-- ================= СЦЕНА ================= -->
    <main class="stage" ref="stageEl">
      <div class="frame" ref="frameEl" :style="frameStyle"
           @dragover.prevent="drag=true" @dragleave="drag=false" @drop.prevent="onDrop">
        <canvas ref="canvasEl"></canvas>
        <div class="drop" v-if="drag">Отпустите трек</div>
      </div>

      <div class="stage-foot flex items-center gap-4">
        <div class="flex-1 grid grid-cols-5 gap-2">
          <div v-for="(b,i) in bandKeys" :key="b.k">
            <div class="meter" :class="{alt:i>2}"><i :ref="el => meterEls[i] = el"></i></div>
            <span class="mono text-[9px] tracking-[0.1em] uppercase" style="color:var(--ink-3)">{{ b.short }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 mono text-[10px] tracking-[0.12em] uppercase" style="color:var(--ink-3)">
          <span ref="beatEl" style="width:9px;height:9px;border-radius:50%;background:var(--accent);
                opacity:.2;transition:opacity .09s linear"></span>
          BEAT · {{ bpm }} BPM
        </div>
      </div>

      <p v-if="err" class="mono text-[11px] max-w-[70ch] text-center" style="color:var(--accent)">
        Визуализатор «{{ err.id }}» упал: {{ err.msg }}. Переключён на Spectrum Bars.
      </p>
    </main>

    <!-- ================= ПРАВАЯ ПАНЕЛЬ ================= -->
    <aside class="insp" :class="{open:inspOpen}">
      <div class="px-4 pt-4 pb-3 border-b sticky top-0 z-10" style="border-color:var(--line);background:var(--panel)">
        <div class="mono text-[10px] tracking-[0.14em] uppercase" style="color:var(--ink-3)">Параметры</div>
        <h2 class="text-[19px] font-semibold leading-tight mt-1" style="text-wrap:balance">{{ current.name }}</h2>
        <div class="mono text-[10px] tracking-[0.1em] uppercase mt-1" style="color:var(--ink-3)">
          {{ groupShort[current.group] }} · {{ paramKeys.length }} контролов
        </div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button class="btn" @click="resetParams">Сброс</button>
          <button class="btn" @click="randomParams">🎲 Случайно</button>
        </div>
      </div>

      <div class="px-4 py-4 flex flex-col gap-3.5">
        <template v-for="k in paramKeys" :key="k">
          <label v-if="current.params[k].type==='toggle'"
                 class="flex items-center justify-between gap-3 text-[12.5px]" style="color:var(--ink-2)">
            {{ current.params[k].label }}
            <span class="sw" :data-on="!!p[k]" role="switch" :aria-checked="!!p[k]" tabindex="0"
                  @click="setP(k,!p[k])" @keydown.space.prevent="setP(k,!p[k])"><i></i></span>
          </label>

          <label v-else-if="current.params[k].type==='select'" class="block">
            <span class="plabel">{{ current.params[k].label }}</span>
            <select :value="p[k]" @change="setP(k,$event.target.value)">
              <option v-for="o in current.params[k].options" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <div v-else>
            <span class="plabel">{{ current.params[k].label }}<span class="pval">{{ fmt(p[k]) }}</span></span>
            <input type="range" :min="current.params[k].min" :max="current.params[k].max"
                   :step="current.params[k].step" :value="p[k]" @input="setP(k,+$event.target.value)">
          </div>
        </template>

        <div class="hr"></div>
        <p class="text-[11.5px]" style="color:var(--ink-3)">
          Каждый визуализатор держит свой набор значений. Всё пишется в память браузера и переживает перезагрузку.
        </p>
      </div>
    </aside>
  </div>

  <div class="scrim xl:hidden" v-if="railOpen || inspOpen" @click="railOpen=false;inspOpen=false"></div>
</div>


</template>
