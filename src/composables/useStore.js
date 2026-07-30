import { reactive, ref, watch } from 'vue';
import { VIS } from '../core/visualizers.js';
import { loadState, saveState } from '../core/persistence.js';
import { DEFAULTS } from '../core/constants.js';

export function useStore(onSyncEngine) {
  const restored = loadState(DEFAULTS, VIS);
  const g = reactive(restored.g);
  const params = reactive(restored.params);
  const dark = ref(restored.dark ?? document.documentElement.classList.contains('dark'));

  watch(
    g,
    () => {
      onSyncEngine();
      saveState(g, params, dark.value);
    },
    { deep: true },
  );

  watch(
    params,
    () => {
      onSyncEngine();
      saveState(g, params, dark.value);
    },
    { deep: true },
  );

  watch(
    () => g.preset,
    () => onSyncEngine(),
  );

  return { g, params, dark, saveState: () => saveState(g, params, dark.value) };
}
