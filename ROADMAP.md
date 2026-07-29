# EQ Lab roadmap

Цель: превратить экспериментальную аудиовизуальную лабораторию в стабильный creative tool, не потеряв скорость добавления сцен.

## Принципы

- Сначала стабильность и измеримость, потом новые визуализаторы.
- Каждая фаза завершается работающей production-сборкой.
- Тяжёлые вычисления учитывают adaptive quality.
- Аудио и пользовательские медиа остаются локальными.

## Фаза 0. Базовая защита проекта

- [x] CI: lint, форматирование, smoke и production build.
- [x] Roadmap, шаблоны issue/PR и commit conventions.
- [x] Исправление runtime-падения Spectrum Waterfall.
- [x] Registry smoke и обязательный render smoke для Waterfall.
- [ ] Включить branch protection для `main` в настройках GitHub.
- [ ] Расширить render smoke до покадрового прогона каждой сцены.

## Фаза 1. Persistence и управление ресурсами

- [x] Восстановление глобальных и scene-specific настроек из `localStorage`.
- [x] Версия persisted state, валидация, ограничение диапазонов и сброс повреждённых данных.
- [x] Cleanup RAF, интервалов, ResizeObserver, DOM listeners, microphone tracks и AudioContext.
- [x] Отзыв object URL аудио, изображений, видео и экспортов.
- [x] Повторный выбор файла и безопасный повторный mount/unmount.
- [x] Понятные ошибки микрофона и форматов.

## Фаза 2. Декомпозиция Vue-приложения

- [ ] Разбить `App.vue` на панели и StageView.
- [ ] Вынести состояние в composables.
- [ ] Перенести императивную панель эффектов в Vue.
- [ ] Типизировать Visualizer API и разбить `visualizers.js`.

## Фаза 3. Экспорт и production UX

- [ ] Запись Canvas + аудио через MediaRecorder.
- [ ] FPS, разрешение, bitrate, countdown и codec fallback.
- [ ] PNG/JPEG/WebP, shortcuts и performance mode.

## Фаза 4. Пресеты и обмен

- [ ] Именованные и версионированные presets.
- [ ] JSON import/export и share URL.
- [ ] Избранное, recent и thumbnail gallery.

## Фаза 5. Timeline и live performance

- [ ] Timeline, keyframes и transitions.
- [ ] Playlist, MIDI Learn, input devices и BPM lock.
- [ ] Undo/redo.

## Фаза 6. Производительность

- [ ] Scene profiler и quality profiles.
- [ ] OffscreenCanvas spike, object pools и visibility pause.
- [ ] Visual regression snapshots.

## Фаза 7. Доступность и polish

- [ ] Keyboard navigation, reduced motion и flash safety.
- [ ] RU/EN localization, onboarding и touch UX.

## Фаза 8. Расширяемость

- [ ] Lifecycle `init/draw/resize/dispose` и JSON schema параметров.
- [ ] Scene sandbox, plugin loader, contribution gallery и releases.

## Следующие PR/коммиты

1. Полный render smoke каждой сцены.
2. Vue EffectsPanel вместо DOM injection.
3. Рабочий WebM recorder.
4. Versioned presets + import/export.
5. Timeline MVP.
