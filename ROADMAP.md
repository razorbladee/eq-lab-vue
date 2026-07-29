# EQ Lab roadmap

Цель: превратить экспериментальную аудиовизуальную лабораторию в стабильный creative tool, не потеряв скорость добавления сцен.

## Принципы

- Сначала стабильность и измеримость, потом новые визуализаторы.
- Каждая фаза завершается работающей production-сборкой и проверяемыми критериями.
- Тяжёлые вычисления обязаны учитывать adaptive quality.
- Аудио и пользовательские медиа остаются локальными.
- Новая функциональность идёт через небольшие коммиты, без переписываний main вслепую.

## Фаза 0. Базовая защита проекта

- [x] Добавить CI: lint, форматирование и production build.
- [x] Зафиксировать roadmap.
- [x] Исправить падение `Spectrum Waterfall` из-за отсутствующего импорта `STOPS`.
- [x] Добавить smoke-runner реестра визуализаторов и Waterfall.
- [ ] Включить защиту ветки `main` и обязательный зелёный CI перед merge.
- [ ] Расширить render smoke до покадрового прогона каждой сцены.
- [x] Завести шаблоны issue/PR и правила commit messages.

**Готово, когда:** чистый checkout проходит `npm ci && npm run check`, а каждая зарегистрированная сцена рисует несколько кадров без исключений.

## Фаза 1. Persistence и управление ресурсами

- [x] Восстанавливать `g`, параметры сцен и тему из `localStorage`, с валидацией и миграцией схемы.
- [x] Добавить версию persisted state и безопасный сброс повреждённых данных.
- [x] Освобождать RAF, интервалы, `ResizeObserver`, DOM listeners, microphone tracks и AudioContext при unmount.
- [x] Отзывать object URL аудио, изображений, видео и экспортов.
- [x] Защитить повторный mount/unmount и повторный выбор того же файла.
- [x] Показывать понятные ошибки доступа к микрофону и неподдерживаемых форматов.

**Готово, когда:** настройки переживают reload, а после закрытия приложения не остаются активные таймеры, потоки и object URL.

## Фаза 2. Декомпозиция Vue-приложения

- [x] Разбить UI на `SourcePanel`, `VisualizerBrowser`, `ReactionPanel`, `StageView`, `InspectorPanel` и `EffectsPanel`.
- [x] Вынести состояние в composables: `useAudioSource`, `useVisualizerState`, `useExport`, `useAppController`.
- [x] Перенести императивную DOM-панель эффектов в Vue.
- [x] Убрать глобальные `window.__EQ_*` для UI и DOM injection из runtime.
- [x] Восстановить правую секцию «Цвет EQ», левую секцию эффектов и исходные spacing tokens.
- [ ] Типизировать контракты визуализаторов через TypeScript или JSDoc typedefs.
- [ ] Разделить большой `visualizers.js` по коллекциям и оставить единый registry API.

**Готово, когда:** UI не создаётся через `document.querySelector/innerHTML`, а добавление сцены не требует правок монолитного компонента.

## Фаза 3. Экспорт и production UX

- [ ] Реализовать запись Canvas + аудио через `MediaRecorder`.
- [ ] Поддержать WebM profiles, выбор FPS, разрешения, bitrate и длительности.
- [ ] Добавить обратный отсчёт, индикатор записи, отмену и корректное завершение.
- [ ] Сделать PNG export устойчивым к ошибкам и добавить JPEG/WebP.
- [ ] Добавить keyboard shortcuts и справку по ним.
- [ ] Сделать настоящий performance mode без панелей и курсора.
- [ ] Добавить предупреждения о несовместимости браузера и codec fallback.

**Готово, когда:** пользователь может загрузить трек, собрать сцену и получить синхронный ролик без внешних инструментов.

## Фаза 4. Пресеты и обмен

- [ ] Сохранять именованные пресеты сцены, реакции, палитры, эффектов и формата.
- [ ] Импортировать и экспортировать preset JSON с версией схемы.
- [ ] Кодировать компактный preset в share URL без аудиофайла.
- [ ] Добавить избранное, recent presets, duplicate и reset.
- [ ] Добавить thumbnail preview и preset gallery.
- [ ] Сохранять эффекты и media geometry отдельно от session assets.

**Готово, когда:** конфигурацию можно повторить на другом устройстве одной ссылкой или JSON-файлом.

## Фаза 5. Timeline и live performance

- [ ] Timeline с keyframes для глобальных и scene-specific параметров.
- [ ] Переходы между визуализаторами и палитрами, beat-synced cuts.
- [ ] Playlist сцен с длительностью, shuffle и автоматизацией.
- [ ] MIDI Learn для knobs/faders/pads.
- [ ] Выбор аудиовхода и реакция на смену устройств.
- [ ] Tap tempo, manual BPM lock и subdivision 1/2, 1/4, 1/8.
- [ ] Undo/redo и история изменений.

**Готово, когда:** EQ Lab пригоден для живого выступления и заранее собранного визуального сета.

## Фаза 6. Производительность и качество изображения

- [ ] Встроенный profiler по сценам: frame time, allocations, draw calls и quality level.
- [ ] Quality profiles для desktop/mobile/recording.
- [ ] OffscreenCanvas/Worker spike для подходящих сцен.
- [ ] Общие object pools для частиц и буферов, исключение allocations внутри hot loops.
- [ ] Пауза рендера при скрытой вкладке и battery-aware quality.
- [ ] Pixel-ratio и memory budget по устройству.
- [ ] Визуальные regression snapshots для эталонных сцен.

**Готово, когда:** типовой мобильный аппарат держит целевой frame budget, а recording profile выдаёт стабильное качество.

## Фаза 7. Доступность и polish

- [ ] Полная клавиатурная навигация и focus states.
- [ ] Корректные labels, roles, switch semantics и live regions.
- [ ] Reduced motion и режим пониженной интенсивности вспышек.
- [ ] Локализация RU/EN без строк, зашитых в компоненты.
- [ ] Онбординг: source → scene → tune → export.
- [ ] Responsive UX для mobile portrait и touch controls.
- [ ] Командная палитра для быстрого поиска действий и сцен.

**Готово, когда:** основной сценарий проходим с клавиатуры и понятен новому пользователю без чтения README.

## Фаза 8. Расширяемость

- [ ] Документированный Visualizer API и lifecycle `init/draw/resize/dispose`.
- [ ] JSON schema параметров: range, toggle, select, color и groups.
- [ ] Dev sandbox для одной сцены с synthetic audio fixtures.
- [ ] Plugin loader для локальных community visualizers с явными permissions.
- [ ] Галерея примеров и contribution guide.
- [ ] SemVer, changelog и GitHub Releases.

**Готово, когда:** сторонний автор может добавить безопасную сцену без изучения внутренностей приложения.

## Приоритет следующих коммитов

1. MediaRecorder MVP: Canvas + audio, WebM, countdown, cancel, codec fallback.
2. Export UX: PNG/JPEG/WebP и keyboard shortcuts.
3. Versioned presets + JSON import/export + share URL.
4. Timeline MVP + transitions.
5. Profiler и recording quality profile.
