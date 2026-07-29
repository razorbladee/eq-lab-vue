import { onMounted, onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioStream) {
  const status = ref('idle');
  const error = ref('');
  let recorder = null;
  let canvasStream = null;
  let cancelled = false;

  const recording = ref(false);
  const countdown = ref(0);

  const cleanupTracks = () => {
    canvasStream?.getTracks().forEach(track => track.stop());
    canvasStream = null;
  };

  const reset = () => {
    countdown.value = 0;
    recording.value = false;
    status.value = 'idle';
    recorder = null;
    cleanupTracks();
  };

  const download = blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eqlab-recording.webm';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const cancel = () => {
    cancelled = true;
    const active = recorder;
    if (active && active.state !== 'inactive') {
      try { active.stop(); } catch { reset(); }
      return;
    }
    reset();
  };

  const start = (fps = 60) => {
    if (status.value !== 'idle') return;
    error.value = '';
    const target = canvas.value;
    if (!target?.captureStream || typeof window.MediaRecorder !== 'function') {
      error.value = 'Запись не поддерживается этим браузером';
      return;
    }
    cancelled = false;
    try {
      const videoStream = target.captureStream(fps);
      canvasStream = videoStream;
      const tracks = [...videoStream.getVideoTracks()];
      const source = audioStream?.();
      if (source) tracks.push(...source.getAudioTracks());
      const stream = new MediaStream(tracks);
      const mimeType = MIME_TYPES.find(type => window.MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('WebM-кодек недоступен');
      const chunks = [];
      const instance = new window.MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      recorder = instance;
      status.value = 'recording';
      recording.value = true;
      instance.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      instance.onerror = () => {
        error.value = 'Запись остановилась из-за ошибки';
        reset();
      };
      instance.onstop = () => {
        const shouldDownload = !cancelled && chunks.length > 0;
        reset();
        if (shouldDownload) download(new Blob(chunks, { type: mimeType }));
      };
      instance.start(250);
    } catch (reason) {
      error.value = reason?.message || 'Не удалось запустить запись';
      reset();
    }
  };

  onMounted(reset);
  onUnmounted(cancel);
  return { status, recording, countdown, error, start, cancel, reset };
}
