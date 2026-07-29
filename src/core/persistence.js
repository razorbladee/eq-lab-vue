import { clamp } from './palette.js';

const STORAGE_KEY = 'eqlab.v2';
const STORAGE_VERSION = 3;

const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));

function safeGlobalValue(key, value, fallback) {
  if (typeof fallback === 'boolean') return typeof value === 'boolean' ? value : fallback;
  if (typeof fallback === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof fallback === 'string') return typeof value === 'string' ? value : fallback;
  return fallback;
}

function sanitizeParams(raw, visualizers) {
  const result = {};
  for (const visualizer of visualizers) {
    const source = isRecord(raw?.[visualizer.id]) ? raw[visualizer.id] : {};
    const target = {};
    for (const [key, schema] of Object.entries(visualizer.params)) {
      const value = source[key];
      if (schema.type === 'toggle') target[key] = typeof value === 'boolean' ? value : schema.def;
      else if (schema.type === 'select') target[key] = schema.options?.includes(value) ? value : schema.def;
      else target[key] = Number.isFinite(value) ? clamp(value, schema.min, schema.max) : schema.def;
    }
    result[visualizer.id] = target;
  }
  return result;
}

function loadState(defaults, visualizers) {
  const fallback = { g: { ...defaults }, params: sanitizeParams({}, visualizers), dark: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('invalid persisted state');
    const source = isRecord(parsed.g) ? parsed.g : {};
    const g = {};
    for (const [key, fallbackValue] of Object.entries(defaults)) {
      g[key] = safeGlobalValue(key, source[key], fallbackValue);
    }
    return {
      g,
      params: sanitizeParams(parsed.params, visualizers),
      dark: typeof parsed.dark === 'boolean' ? parsed.dark : null,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

function saveState(g, params, dark) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, g: clone(g), params: clone(params), dark: !!dark }));
  } catch {
    // Private mode and exhausted storage must not break rendering.
  }
}

export { STORAGE_KEY, STORAGE_VERSION, loadState, saveState };
