# EQ Lab roadmap

## Фаза 0: стабилизация
- [x] CI, smoke, Waterfall fix, persistence, lifecycle cleanup.

## Фаза 1: persistence и ресурсы
- [x] Восстановление состояния, валидация, cleanup RAF/timers/audio/object URLs.

## Фаза 2: Vue-декомпозиция
- [x] EffectsPanel переведён на Vue template.
- [x] Убран DOM injection и legacy effects UI.
- [x] Добавлены composables для visualizer state, audio source, export и app controller.
- [x] Добавлены независимые SourcePanel, VisualizerBrowser, ReactionPanel, StageView и InspectorPanel.
- [x] Все новые панели имеют Vue props/events и могут подключаться без глобального DOM API.
- [ ] Подключить панели в App.vue и удалить дублирующий legacy template.
- [ ] Разбить visualizers.js на коллекции через единый registry API.

## Следом
1. Закрыть wiring панелей в App.vue.
2. Фаза 3: WebM recorder с Canvas + audio.
3. Versioned presets и share URL.
