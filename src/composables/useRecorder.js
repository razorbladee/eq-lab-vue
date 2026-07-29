import { onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioStream) {
  const recording = ref(false);
  const countdown = ref(0);
  const error = ref('');
  let recorder = null;
  let canvasStream = null;
  let timer = 0;
  let cancelled = false;

  const cleanupTracks = () => {
    canvasStream?.getTracks().forEach(track => track.stop());
    canvasStream = null;
  };

  const download = blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eqlab-recording.webm';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const reset = () => {
    clearInterval(timer);
    timer = 0;
    countdown.value = 0;
    recording.value = false;
    recorder = null;
    cleanupTracks();
  };

  const cancel = () => {
    cancelled = true;
    clearInterval(timer);
    timer = 0;
    countdown.value = 0;
    const active = recorder;
    if (active && active.state !== 'inactive') active.stop();
    else reset();
  };

  const start = async (seconds = 3, fps = 60) => {
    error.value = '';
    if (recording.value || countdown.value) return;
    if (!canvas.value?.captureStream || !window.MediaRecorder) {
      error.value = 'Запись не поддерживается этим браузером';
      return;
    }
    cancelled = false;
    const stream = canvas.value.captureStream(fps);
    canvasStream = stream;
    const tracks = [...stream.getVideoTracks()];
    const source = audioStream?.();
    if (source) tracks.push(...source.getAudioTracks());
    const recordStream = new MediaStream(tracks);
    const mimeType = MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      error.value = 'WebM-кодек недоступен';
      reset();
      return;
    }
    const chunks = [];
    try {
      recorder = new MediaRecorder(recordStream, { mimeType, videoBitsPerSecond: 8_000_000 });
    } catch (reason) {
      error.value = reason?.message || 'Не удалось запустить запись';
      reset();
      return;
    }
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      error.value = 'Запись остановилась из-за ошибки';
      reset();
    };
    recorder.onstop = () => {
      const shouldDownload = !cancelled && chunks.length > 0;
      reset();
      if (shouldDownload) download(new Blob(chunks, { type: mimeType }));
    };
    countdown.value = Math.max(0, Math.floor(seconds));
    if (!countdown.value) {
      recorder.start(250);
      recording.value = true;
      return;
    }
    timer = setInterval(() => {
      countdown.value = Math.max(0, countdown.value - 1);
      if (countdown.value === 0) {
        clearInterval(timer);
        timer = 0;
        if (!cancelled && recorder?.state === 'inactive') {
          recorder.start(250);
          recording.value = true;
        }
      }
    }, 1000);
  };

  onUnmounted(cancel);
  return { recording, countdown, error, start, cancel };
}
