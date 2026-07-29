// EffectsPanel is now owned by Vue. Kept as a tiny compatibility switch so
// older effect code cannot inject a second panel into the DOM.
if (typeof globalThis !== 'undefined') globalThis.__EQ_DISABLE_LEGACY_PANEL__ = true;
