import { computed, ref } from 'vue';

export function useAppController({ visualizers, visualizerMap, state, params }) {
  const query = ref('');
  const group = ref('');
  const filtered = computed(() => {
    const term = query.value.trim().toLowerCase();
    return visualizers.filter(
      (item) =>
        (!group.value || item.group === group.value) &&
        (!term || item.id.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)),
    );
  });
  const current = computed(() => visualizerMap[state.preset] || visualizers[0]);
  const currentParams = computed(() => params[state.preset] || {});
  const setParam = (key, value) => {
    if (params[state.preset]) params[state.preset][key] = value;
  };
  const resetParams = () => {
    for (const [key, schema] of Object.entries(current.value.params)) setParam(key, schema.def);
  };
  const randomParams = () => {
    for (const [key, schema] of Object.entries(current.value.params)) {
      if (schema.type === 'toggle') setParam(key, Math.random() > 0.5);
      else if (schema.type !== 'select')
        setParam(
          key,
          Math.round((schema.min + Math.random() * (schema.max - schema.min)) / schema.step) *
            schema.step,
        );
    }
  };
  const cycle = (direction) => {
    const list = filtered.value.length ? filtered.value : visualizers;
    const index = list.findIndex((item) => item.id === state.preset);
    state.preset = list[(index + direction + list.length) % list.length].id;
  };
  const random = () => {
    const list = filtered.value.length ? filtered.value : visualizers;
    state.preset = list[(Math.random() * list.length) | 0].id;
  };
  return {
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
  };
}
