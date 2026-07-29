# EQ Lab roadmap

## Фаза 0: стабилизация
- [x] CI, smoke, Waterfall fix, persistence, lifecycle cleanup.

## Фаза 1: persistence и ресурсы
- [x] Восстановление состояния, валидация, cleanup RAF/timers/audio/object URLs.

## Фаза 2: Vue-декомпозиция
- [x] EffectsPanel переведён на Vue template и больше не создаётся через `innerHTML`.
- [x] Убран DOM query/mount из `main.js`, панель подключается как часть Vue root через `Teleport`.
- [x] Добавлены composables `useVisualizerState`, `useAudioSource`, `useExport`.
- [x] Effects core теперь отвечает только за состояние и Canvas rendering, UI-монтаж из него удалён.
- [ ] Разбить App.vue на SourcePanel, VisualizerBrowser, ReactionPanel, StageView, InspectorPanel.
- [ ] Вынести orchestration App.vue в `useAppController`.
- [ ] Разбить visualizers.js на коллекции через единый registry API.

## Следом
1. Фаза 3: WebM recorder с Canvas + audio.
2. Versioned presets и share URL.
3. Timeline MVP и transitions.
