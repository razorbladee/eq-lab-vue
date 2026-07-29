<script setup>
import { ref, shallowRef, watch, computed, onMounted, onUnmounted } from 'vue';
import { Audio } from '../core/audio';

const props = defineProps({
  src: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  from: { type: Number, default: 0 },
  to: { type: Number, default: 0 },
});

const emit = defineEmits(['update:from', 'update:to']);

const wrap = ref(null);
const canvas = ref(null);
const peaks = shallowRef([]);
const loading = ref(false);

const isDragging = ref(null); // 'left', 'right', or 'center'
let dragStartX = 0;
let dragStartFrom = 0;
let dragStartTo = 0;

const fmt = (value) => {
  const s = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Render waveform
const extractPeaks = async (buffer, samples) => {
  const channelData = buffer.getChannelData(0);
  const step = Math.ceil(channelData.length / samples);
  const result = new Float32Array(samples);
  let maxPeak = 0;

  for (let i = 0; i < samples; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx < channelData.length) {
        const val = Math.abs(channelData[idx]);
        if (val > max) max = val;
      }
    }
    result[i] = max;
    if (max > maxPeak) maxPeak = max;
  }

  // Normalize
  if (maxPeak > 0) {
    for (let i = 0; i < samples; i++) {
      result[i] /= maxPeak;
    }
  }
  return result;
};

const draw = () => {
  if (!canvas.value || !wrap.value) return;
  const rect = wrap.value.getBoundingClientRect();
  if (rect.width === 0) return;

  canvas.value.width = rect.width;
  canvas.value.height = rect.height;

  const ctx = canvas.value.getContext('2d');
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  if (peaks.value.length === 0) return;

  const style = getComputedStyle(canvas.value);
  const accent = style.getPropertyValue('--accent').trim();
  ctx.fillStyle = accent || '#ff5a2d';

  const p = peaks.value;
  const step = w / (p.length - 1);

  ctx.beginPath();
  ctx.moveTo(0, h / 2);

  // Draw top half
  for (let i = 0; i < p.length; i++) {
    const val = p[i] * h * 0.9;
    ctx.lineTo(i * step, (h - val) / 2);
  }

  // Draw bottom half
  for (let i = p.length - 1; i >= 0; i--) {
    const val = p[i] * h * 0.9;
    ctx.lineTo(i * step, (h + val) / 2);
  }

  ctx.closePath();
  ctx.fill();
};

watch(
  () => props.src,
  async (newSrc) => {
    peaks.value = [];
    draw();
    if (!newSrc) return;

    loading.value = true;
    try {
      const res = await fetch(newSrc);
      const arrayBuffer = await res.arrayBuffer();
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ctx = new OfflineCtx(1, 1, 44100);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (ctx.state !== 'closed') ctx.close();
      peaks.value = await extractPeaks(audioBuffer, 800);
      draw();
    } catch (err) {
      console.error('Waveform err:', err);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

// Interactivity
const getPos = (e) => {
  const rect = wrap.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  return x / rect.width; // 0 to 1
};

const onPointerDown = (e, type) => {
  if (!props.duration) return;
  e.preventDefault();
  isDragging.value = type;
  dragStartX = getPos(e);
  dragStartFrom = props.from;
  dragStartTo = props.to;

  if (type === 'track') {
    const t = dragStartX * props.duration;
    const targetLen = Math.min(10, props.duration);
    const newFrom = Math.max(0, Math.min(props.duration - targetLen, t - targetLen / 2));
    const newTo = newFrom + targetLen;
    emit('update:from', newFrom);
    emit('update:to', newTo);
    isDragging.value = 'right';
    dragStartFrom = newFrom;
    dragStartTo = newTo;
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
};

const onPointerMove = (e) => {
  if (!isDragging.value || !props.duration) return;

  const currentX = getPos(e);
  const deltaT = (currentX - dragStartX) * props.duration;

  let newFrom = dragStartFrom;
  let newTo = dragStartTo;

  if (isDragging.value === 'left') {
    newFrom = Math.max(0, Math.min(dragStartFrom + deltaT, dragStartTo - 0.05));
    emit('update:from', newFrom);
  } else if (isDragging.value === 'right') {
    newTo = Math.max(newFrom + 0.05, Math.min(props.duration, dragStartTo + deltaT));
    emit('update:to', newTo);
  } else if (isDragging.value === 'center') {
    const range = dragStartTo - dragStartFrom;
    newFrom = Math.max(0, Math.min(props.duration - range, dragStartFrom + deltaT));
    newTo = newFrom + range;
    emit('update:from', newFrom);
    emit('update:to', newTo);
  }
};

const onPointerUp = () => {
  isDragging.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
};

onMounted(() => {
  const ro = new ResizeObserver(() => draw());
  ro.observe(wrap.value);
  onUnmounted(() => ro.disconnect());
});

const leftPct = computed(() => (props.duration ? (props.from / props.duration) * 100 : 0));
const widthPct = computed(() =>
  props.duration ? ((props.to - props.from) / props.duration) * 100 : 100,
);
</script>
<template>
  <div
    class="region-wrap"
    ref="wrap"
    @pointerdown="(e) => e.target === wrap && onPointerDown(e, 'track')"
  >
    <canvas ref="canvas" class="region-canvas"></canvas>

    <div class="region-track" :style="{ left: leftPct + '%', width: widthPct + '%' }">
      <div class="region-center" @pointerdown.stop="(e) => onPointerDown(e, 'center')">
        <span class="region-label center-label">{{ fmt(to - from) }}</span>
      </div>
      <div
        class="region-handle region-handle-l"
        @pointerdown.stop="(e) => onPointerDown(e, 'left')"
      >
        <span class="region-label handle-label">{{ fmt(from) }}</span>
      </div>
      <div
        class="region-handle region-handle-r"
        @pointerdown.stop="(e) => onPointerDown(e, 'right')"
      >
        <span class="region-label handle-label">{{ fmt(to) }}</span>
      </div>
    </div>

    <div v-if="loading" class="region-loader">Загрузка...</div>
  </div>
</template>
<style scoped>
.region-wrap {
  position: relative;
  width: 100%;
  height: 48px;

  background: var(--panel-2);
  border-radius: 6px;
  user-select: none;
  touch-action: none;
  cursor: text;
  border: 1px solid var(--line);
}
.region-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.7;
  pointer-events: none;
  border-radius: 6px;
}
.region-track {
  position: absolute;
  top: 0;
  bottom: 0;
  box-shadow: inset 0 0 0 1px var(--accent);
}
.region-track::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  opacity: 0.15;
  pointer-events: none;
}
.region-center {
  position: absolute;
  inset: 0;
  cursor: grab;
}
.region-center:active {
  cursor: grabbing;
}
.region-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  background: var(--accent);
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.1s;
}
.region-handle:hover,
.region-handle:active {
  opacity: 1;
}
.region-handle::after {
  content: '';
  width: 2px;
  height: 12px;
  background: var(--panel);
  border-radius: 1px;
}
.region-handle-l {
  left: 0;
  transform: translateX(-50%);
}
.region-handle-r {
  right: 0;
  transform: translateX(50%);
}
.region-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  pointer-events: none;
  border-radius: 6px;
}

/* Labels */
.region-label {
  position: absolute;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  font-weight: 700;
  z-index: 10;
}
.handle-label {
  top: -26px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line);
}
.center-label {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
