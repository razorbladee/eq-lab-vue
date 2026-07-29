# EQ Lab

Полная текущая версия EQ Lab сохранена в `eq-lab-vue (2).html`: 49 визуализаторов, Vue-интерфейс, Tailwind-верстка, отдельные параметры, localStorage, темы, микрофон и адаптивный Canvas.

Vite + Vue запускают этот файл через `src/App.vue`, без урезания функциональности и без дублирования огромного реестра визуализаторов.

```bash
npm install
npm run dev
npm run lint
npm run format:check
npm run build
```

Открывать приложение нужно через Vite, а не двойным кликом по HTML: микрофон и Web Audio требуют localhost или HTTPS.
