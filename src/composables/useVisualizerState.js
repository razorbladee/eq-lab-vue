import { computed, reactive, watch } from 'vue';

export function useVisualizerState(visualizers, initial = {}) {
  const values = reactive({ ...initial });
  for (const visualizer of visualizers) {
    if (!values[visualizer.id]) values[visualizer.id] = {};
    for (const [key, schema] of Object.entries(visualizer.params)) {
      if (values[visualizer.id][key] === undefined) values[visualizer.id][key] = schema.def;
    }
  }
  const current = (id) => computed(() => values[id] || {});
  const reset = (id) => {
    const visualizer = visualizers.find((item) => item.id === id);
    if (!visualizer) return;
    for (const [key, schema] of Object.entries(visualizer.params)) values[id][key] = schema.def;
  };
  const set = (id, key, value) => {
    if (values[id]) values[id][key] = value;
  };
  return {
    values,
    current,
    reset,
    set,
    watchState: (callback) => watch(values, callback, { deep: true }),
  };
}
