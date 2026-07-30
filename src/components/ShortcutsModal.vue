<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  shortcuts: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    @click="close"
  >
    <div
      class="bg-panel border rounded-lg shadow-xl max-w-md w-full"
      style="border-color: var(--line); background: var(--panel)"
      @click.stop
    >
      <div class="flex items-center justify-between p-4 border-b" style="border-color: var(--line)">
        <h2 class="mono font-bold text-[13px] tracking-[0.1em]">Горячие клавиши</h2>
        <button class="btn" @click="close">✕</button>
      </div>
      <div class="p-4 space-y-3">
        <div
          v-for="sc in shortcuts"
          :key="sc.keys"
          class="flex justify-between items-center text-sm"
        >
          <span style="color: var(--ink-2)">{{ sc.desc }}</span>
          <div class="flex gap-1">
            <kbd
              v-for="key in sc.keys.split('+')"
              :key="key"
              class="px-2 py-1 bg-ink border rounded mono text-[10px]"
              style="border-color: var(--line); background: var(--input)"
              >{{ key }}</kbd
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
