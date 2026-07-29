# EQ Lab roadmap

Полный план сохранён: стабилизация, persistence, Vue-декомпозиция, экспорт, пресеты, timeline, performance, accessibility и plugin API.

## Фаза 0. Базовая защита проекта
- [x] CI, lint, format check, smoke-runner и production build.
- [x] Waterfall fix, issue/PR templates и commit conventions.
- [ ] Branch protection и покадровый smoke всех сцен.

## Фаза 1. Persistence и ресурсы
- [x] Восстановление и валидация состояния.
- [x] Cleanup RAF, timers, ResizeObserver, listeners, mic tracks, AudioContext и object URLs.

## Фаза 2. Vue-декомпозиция
- [x] SourcePanel, VisualizerBrowser, ReactionPanel, StageView, InspectorPanel и EffectsPanel.
- [x] Цвет EQ, эффекты и исходный spacing/layout.
- [x] Composables и удаление DOM injection.
- [ ] JSDoc/TypeScript contracts для visualizer API.
- [ ] Разбиение visualizers.js по коллекциям.

## Фаза 3. Экспорт и production UX
- [x] WebM MVP: Canvas + доступный audio track, stop/save, cancel, codec fallback.
- [x] Настройки FPS, bitrate и опциональной длительности.
- [ ] Настройка разрешения записи.
- [ ] PNG/JPEG/WebP export.
- [ ] Keyboard shortcuts, help и performance mode.
- [ ] Browser compatibility warning.

## Фаза 4. Пресеты и обмен
- [ ] Именованные versioned presets.
- [ ] JSON import/export и share URL.
- [ ] Избранное, recent, duplicate, reset и thumbnail gallery.
- [ ] Отдельное хранение эффектов и media geometry.

## Фаза 5. Timeline и live performance
- [ ] Keyframes, transitions и beat-synced cuts.
- [ ] Playlist, shuffle, MIDI Learn и input device selection.
- [ ] Tap tempo, BPM lock и subdivisions.
- [ ] Undo/redo.

## Фаза 6. Производительность
- [ ] Scene profiler, quality profiles и recording profile.
- [ ] OffscreenCanvas spike, object pools, visibility pause и memory budget.
- [ ] Visual regression snapshots.

## Фаза 7. Доступность и polish
- [ ] Keyboard navigation, focus states, reduced motion и flash safety.
- [ ] RU/EN localization, onboarding, mobile touch UX и command palette.

## Фаза 8. Расширяемость
- [ ] Visualizer lifecycle API и JSON parameter schema.
- [ ] Dev sandbox, plugin loader, examples, contribution guide и releases.

## Следующие шаги

1. Настройка разрешения записи и PNG/JPEG/WebP.
2. Keyboard shortcuts, help и performance mode.
3. Versioned presets + JSON import/export + share URL.
