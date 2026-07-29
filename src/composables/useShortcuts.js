import { onMounted, onUnmounted } from 'vue';

export function useShortcuts(handlers) {
  function onKeydown(e) {
    // Не перехватываем фокус в инпутах
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      // Исключение: Ctrl+P должен работать всегда, но обычно браузеры блокируют печать.
      // Если мы хотим свой шорткат, перехватываем, но для инпутов лучше не ломать дефолт.
      if (!(e.ctrlKey && e.code === 'KeyP')) {
        return;
      }
    }

    if (e.ctrlKey && e.code === 'KeyP') {
      e.preventDefault();
      handlers.toggleHelp?.();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      handlers.togglePlay?.();
      return;
    }

    if (e.code === 'KeyF') {
      e.preventDefault();
      handlers.toggleFull?.();
      return;
    }

    if (e.code === 'KeyR') {
      e.preventDefault();
      handlers.toggleRecord?.();
      return;
    }

    if (e.code === 'KeyM') {
      e.preventDefault();
      handlers.toggleMic?.();
      return;
    }

    if (e.code === 'KeyS') {
      e.preventDefault();
      handlers.snapshot?.();
      return;
    }

    if (e.code === 'KeyT') {
      e.preventDefault();
      handlers.toggleTheme?.();
      return;
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
  });

  return {
    list: [
      { keys: 'Space', desc: 'Воспроизведение / Пауза' },
      { keys: 'F', desc: 'Полноэкранный режим' },
      { keys: 'R', desc: 'Начать / Остановить запись' },
      { keys: 'M', desc: 'Включить / Выключить микрофон' },
      { keys: 'S', desc: 'Сделать скриншот (PNG)' },
      { keys: 'T', desc: 'Переключить тему' },
      { keys: 'Ctrl+P', desc: 'Показать эту справку' },
    ],
  };
}
