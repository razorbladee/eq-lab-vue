# EQ Lab

Интерактивная аудиовизуальная лаборатория на Vue 3. Приложение анализирует трек или сигнал микрофона через Web Audio API и в реальном времени рисует аудиореактивные Canvas-сцены.

## Что умеет проект

- Большой набор аудиореактивных визуализаторов и отдельные коллекции новых сцен.
- Источники сигнала: локальный аудиофайл, микрофон или встроенный демо-сигнал.
- 20 алгоритмов реакции, пять частотных зон, жанровые пресеты, палитры и adaptive quality.
- Экспорт PNG, запись Canvas и доступного аудиовыхода в WebM, полноэкранный режим.
- Автосохранение настроек в `localStorage`, светлая и тёмная темы, адаптивные панели и cleanup ресурсов.

## Запись WebM

Панель `Запись WebM` запускает короткий countdown, пишет Canvas через `captureStream()` и добавляет аудиотрек из Web Audio `MediaStreamDestination`, если он доступен. Результат скачивается локально как `eqlab-recording.webm`; браузер должен поддерживать `MediaRecorder` и WebM.

## Эффекты

В панели **Эффекты · фоновые слои** доступны независимые слои: `Snowfall`, `Rain streaks`, `Bokeh lights`, `Fireflies`, `Floating dust` и `Aurora veil`.

Каждый эффект можно включить отдельно и настроить без изменения визуализатора: opacity, amount, speed, size, color и layer. Медиа-слои поддерживают локальные изображения и видео.

## Быстрый старт

Нужен Node.js 20 или новее и npm.

```bash
npm ci
npm run dev
```

Для доступа к микрофону браузеру нужен `localhost` или HTTPS.

## Команды

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
npm run check
```

## Архитектура

```text
src/
├── App.vue
├── components/            Vue panels, including RecorderPanel
├── composables/            state, audio, export and recorder logic
└── core/                   Web Audio, Canvas engine, effects, palette and scene registry
```

Проект полностью клиентский: пользовательские аудио, микрофон, изображения и видео не загружаются на сервер.
