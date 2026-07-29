<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

const canvas = ref(null);
const audio = ref(null);
const fileName = ref('Демо-сигнал');
const playing = ref(false);
const recording = ref(false);
const dark = ref(true);
const preset = ref(localStorage.getItem('eq.preset') || 'bars');
const state = reactive(
  JSON.parse(
    localStorage.getItem('eq.state') ||
      '{"amp":1,"speed":1,"smooth":0.58,"count":64,"glow":0.7,"bass":1,"mid":1,"treble":1}',
  ),
);

const presets = [
  { id: 'bars', name: 'Spectrum Bars', hint: 'Логарифмический спектр с пиками' },
  { id: 'wave', name: 'Neon Waveform', hint: 'Временная волна с многослойным шлейфом' },
  { id: 'radial', name: 'Radial Spectrum', hint: 'Радиальная форма с реакцией на бас' },
  { id: 'particles', name: 'Particle Burst', hint: 'Частицы на импульсах и transient' },
  { id: 'waterfall', name: 'Spectrum Waterfall', hint: 'История спектра с плавной прокруткой' },
];

const parameterSchema = {
  amp: ['Амплитуда', 0.3, 2.5, 0.05],
  speed: ['Скорость', 0.1, 3, 0.05],
  smooth: ['Сглаживание', 0, 0.95, 0.01],
  count: ['Плотность', 8, 192, 1],
  glow: ['Свечение', 0, 1, 0.01],
  bass: ['Bass', 0, 2.5, 0.05],
  mid: ['Mid', 0, 2.5, 0.05],
  treble: ['Treble', 0, 2.5, 0.05],
};

const current = computed(() => presets.find((item) => item.id === preset.value) || presets[0]);
const parameters = computed(() => Object.entries(parameterSchema));

let ctx;
let analyser;
let source;
let audioContext;
let animationFrame;
let mediaRecorder;
let chunks = [];
let destination;
let frequencyData;
let timeData;
let smoothed = new Float32Array(256);
let lastFrame = 0;
let demoTime = 0;

function persist() {
  localStorage.setItem('eq.preset', preset.value);
  localStorage.setItem('eq.state', JSON.stringify(state));
}

watch([preset, state], persist, { deep: true });

function resizeCanvas() {
  if (!canvas.value) return;

  const bounds = canvas.value.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width * dpr));
  const height = Math.max(1, Math.round(bounds.height * dpr));

  if (canvas.value.width === width && canvas.value.height === height) return;

  canvas.value.width = width;
  canvas.value.height = height;
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function ensureAudio() {
  if (analyser) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = state.smooth;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.fftSize);
  destination = audioContext.createMediaStreamDestination();

  if (audio.value) {
    source = audioContext.createMediaElementSource(audio.value);
    source.connect(analyser);
    source.connect(audioContext.destination);
    source.connect(destination);
  }
}

function loadFile(event) {
  const file = event.target.files?.[0];
  if (!file || !audio.value) return;

  ensureAudio();
  audio.value.src = URL.createObjectURL(file);
  fileName.value = file.name;
  audio.value.play().catch(() => {});
}

function togglePlay() {
  ensureAudio();
  if (!audio.value?.src) return;

  if (audio.value.paused) {
    audio.value.play().catch(() => {});
  } else {
    audio.value.pause();
  }
}

function color(position) {
  return `hsl(${18 + 220 * position} 92% 64%)`;
}

function getSpectrum() {
  if (analyser) {
    analyser.smoothingTimeConstant = state.smooth;
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);
  }

  const output = [];

  for (let index = 0; index < 256; index += 1) {
    const position = index / 255;
    const bin = Math.min(
      frequencyData?.length - 1 || 0,
      Math.max(0, Math.floor(position ** 2.2 * (frequencyData?.length || 1))),
    );
    const raw = (frequencyData?.[bin] || 0) / 255;
    const multiplier = position < 0.15 ? state.bass : position < 0.7 ? state.mid : state.treble;
    const response = raw > smoothed[index] ? 0.42 : 0.16;

    smoothed[index] += (raw * multiplier - smoothed[index]) * response;
    output[index] = smoothed[index];
  }

  return output;
}

function drawWaveform(data, width, height) {
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height / 2 + Math.sin(index * 0.08 + demoTime * 3) * value * height * 0.35 * state.amp;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });

  ctx.strokeStyle = color(0.45);
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
}

function drawRadial(data, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.18;

  ctx.beginPath();
  data.forEach((value, index) => {
    const angle = (index / data.length) * Math.PI * 2;
    const currentRadius = radius + value * Math.min(width, height) * 0.3 * state.amp;
    const x = centerX + Math.cos(angle) * currentRadius;
    const y = centerY + Math.sin(angle) * currentRadius;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = color(0.65);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawParticles(data, width, height) {
  const count = Math.round(state.count * 2);

  for (let index = 0; index < count; index += 1) {
    const position = index / count;
    const value = data[(index * 7) % data.length];
    const angle = position * Math.PI * 2 + demoTime * 0.5;
    const radius = value * Math.min(width, height) * 0.4 + 20;

    ctx.fillStyle = color(position);
    ctx.globalAlpha = 0.25 + value;
    ctx.beginPath();
    ctx.arc(
      width / 2 + Math.cos(angle) * radius,
      height / 2 + Math.sin(angle) * radius,
      1 + value * 7,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawBars(data, width, height) {
  const count = Math.max(8, Math.round(state.count));
  const barWidth = (width / count) * 0.8;

  for (let index = 0; index < count; index += 1) {
    const position = index / count;
    const value = data[Math.floor(position * data.length)];
    const barHeight = value ** 2 * height * 0.72 * state.amp;
    const x = index * (width / count);

    ctx.fillStyle = color(position);
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, height * 0.78 - barHeight, barWidth, Math.max(1, barHeight));
    ctx.globalAlpha = 0.22;
    ctx.fillRect(x, height * 0.78 + 4, barWidth, barHeight * 0.35);
  }
}

function draw(now = 0) {
  animationFrame = requestAnimationFrame(draw);
  const delta = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
  lastFrame = now;
  demoTime += delta;
  resizeCanvas();

  if (!canvas.value || !ctx) return;

  const width = canvas.value.clientWidth;
  const height = canvas.value.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = dark.value ? '#0d0c12' : '#f3efe8';
  ctx.fillRect(0, 0, width, height);

  const data = getSpectrum();

  if (!analyser) {
    data.forEach((_, index) => {
      const position = index / data.length;
      data[index] = Math.max(
        0,
        ((Math.sin(demoTime * 4 + position * 18) + 1) / 3) * Math.exp(-position * 2) +
          (Math.sin(demoTime * 9 + position * 80) + 1) / 12,
      );
    });
  }

  if (preset.value === 'wave') drawWaveform(data, width, height);
  else if (preset.value === 'radial') drawRadial(data, width, height);
  else if (preset.value === 'particles') drawParticles(data, width, height);
  else drawBars(data, width, height);

  ctx.globalAlpha = 1;
}

async function toggleRecording() {
  ensureAudio();
  if (recording.value) {
    mediaRecorder.stop();
    return;
  }

  await audioContext.resume();
  const stream = canvas.value.captureStream(30);
  const audioTrack = destination?.stream.getAudioTracks()[0];
  if (audioTrack) stream.addTrack(audioTrack);

  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );

  chunks = [];
  mediaRecorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined,
  );
  mediaRecorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  mediaRecorder.onstop = () => {
    const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `eq-lab-${preset.value}.webm`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    recording.value = false;
  };
  mediaRecorder.start(1_000);
  recording.value = true;
}

function toggleTheme() {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
}

onMounted(() => {
  ctx = canvas.value.getContext('2d', { alpha: false, desynchronized: true });
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  animationFrame = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  window.removeEventListener('resize', resizeCanvas);
  audioContext?.close();
});
</script>

<template>
  <div
    class="min-h-screen"
    :class="dark ? 'bg-[#12111a] text-[#f2eee8]' : 'bg-[#f3efe8] text-[#27231e]'"
  >
    <header class="flex items-center gap-3 border-b border-white/10 px-5 py-3">
      <strong class="font-mono tracking-[.2em]">EQ LAB</strong>
      <span class="text-xs opacity-50">{{ fileName }}</span>
      <div class="ml-auto flex gap-2">
        <button class="rounded border border-white/15 px-3 py-2 text-sm" @click="toggleTheme">
          {{ dark ? '☀' : '☾' }}
        </button>
        <button
          class="rounded bg-[#ff7048] px-3 py-2 text-sm font-semibold text-[#21110c]"
          @click="toggleRecording"
        >
          {{ recording ? '■ Остановить' : '● Записать WebM' }}
        </button>
      </div>
    </header>

    <main class="grid min-h-[calc(100vh-61px)] grid-cols-[260px_1fr_250px] max-[1000px]:grid-cols-1">
      <aside class="border-r border-white/10 p-4 max-[1000px]:border-r-0 max-[1000px]:border-b">
        <label class="mb-3 block rounded border border-dashed border-white/20 p-3 text-center text-sm">
          Открыть аудио
          <input class="hidden" type="file" accept="audio/*" @change="loadFile" />
        </label>
        <button class="mb-4 w-full rounded bg-white/10 px-3 py-2" @click="togglePlay">
          {{ playing ? '⏸ Пауза' : '▶ Играть' }}
        </button>
        <audio ref="audio" class="mb-5 w-full" controls @play="playing = true" @pause="playing = false" />

        <div class="mb-2 font-mono text-xs uppercase tracking-widest opacity-50">Визуализатор</div>
        <button
          v-for="visualizer in presets"
          :key="visualizer.id"
          class="mb-1 block w-full rounded px-3 py-2 text-left text-sm"
          :class="preset === visualizer.id ? 'bg-[#ff7048] text-[#21110c]' : 'bg-white/5'"
          @click="preset = visualizer.id"
        >
          {{ visualizer.name }}
        </button>
      </aside>

      <section class="flex min-h-0 flex-col items-center justify-center gap-4 p-5">
        <canvas ref="canvas" class="aspect-video w-full max-w-[1100px] rounded-xl border border-white/10" />
        <div class="text-center text-xs opacity-50">
          {{ current.hint }} · {{ recording ? 'идёт запись WebM' : '' }}
        </div>
      </section>

      <aside class="border-l border-white/10 p-4 max-[1000px]:border-l-0 max-[1000px]:border-t">
        <div class="mb-4 font-mono text-xs uppercase tracking-widest opacity-50">
          Параметры {{ current.name }}
        </div>
        <label v-for="([key, config]) in parameters" :key="key" class="mb-4 block text-sm">
          <span class="mb-1 flex justify-between opacity-70">
            <span>{{ config[0] }}</span>
            <b>{{ Number(state[key]).toFixed(2) }}</b>
          </span>
          <input
            v-model.number="state[key]"
            class="range w-full"
            type="range"
            :min="config[1]"
            :max="config[2]"
            :step="config[3]"
          />
        </label>
      </aside>
    </main>
  </div>
</template>
