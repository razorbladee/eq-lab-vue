# EQ Lab roadmap

## Фаза 0: стабилизация
- [x] CI, smoke, Waterfall fix, persistence, lifecycle cleanup.

## Фаза 1: persistence и ресурсы
- [x] Восстановление состояния, валидация, cleanup RAF/timers/audio/object URLs.

## Фаза 2: Vue-декомпозиция
- [x] EffectsPanel возвращён на левую панель, без innerHTML и DOM-mount хаков.
- [x] InspectorPanel возвращён с отдельной секцией «Цвет EQ».
- [x] SourcePanel, VisualizerBrowser, ReactionPanel, StageView и InspectorPanel подключены через Vue.
- [x] Layout spacing и визуальные токены восстановлены.

## Следом
1. Фаза 3: WebM recorder с Canvas + audio.
2. Versioned presets и share URL.
3. Timeline MVP и transitions.
