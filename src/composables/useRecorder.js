import { onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioStream) {
  const recording = ref(false);
  const countdown = ref(0);
  const error = ref('');
  let recorder = null;
  let canvasStream = null;
  let cancelled = false;

  const cleanupTracks = () => {
    canvasStream?.getTracks().forEach(track => track.stop());
    canvasStream = null;
  };

  const reset = () => {
    countdown.value = 0;
    recording.value = false;
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
      active.stop();
      return;
    }
    reset();
  };

  const start = (fps = 60) => {
    // This function is only called by the explicit Record button.
    if (recording.value || countdown.value) return;
    error.value = '';
    if (!canvas.value?.captureStream || !window.MediaRecorder) {
      error.value = 'Запись не поддерживается этим браузером';
      return;
    }
    cancelled = false;
    const videoStream = canvas.value.captureStream(fps);
    canvasStream = videoStream;
    const tracks = [...videoStream.getVideoTracks()];
    const source = audioStream?.();
    if (source) tracks.push(...source.getAudioTracks());
    const stream = new MediaStream(tracks);
    const mimeType = MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      error.value = 'WebM-кодек недоступен';
      reset();
      return;
    }
    const chunks = [];
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { error.value = 'Запись остановилась из-за ошибки'; reset(); };
      recorder.onstop = () => {
        const shouldDownload = !cancelled && chunks.length > 0;
        reset();
        if (shouldDownload) download(new Blob(chunks, { type: mimeType }));
      };
      recorder.start(250);
      recording.value = true;
    } catch (reason) {
      error.value = reason?.message || 'Не удалось запустить запись';
      reset();
    }
  };

  onUnmounted(cancel);
  return { recording, countdown, error, start, cancel };
}
