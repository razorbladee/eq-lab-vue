import { onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioStream) {
  const recording = ref(false);
  const countdown = ref(0);
  const error = ref('');
  let recorder = null;
  let canvasStream = null;
  let timer = 0;

  const download = blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eqlab-recording.webm';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const cancel = () => {
    clearInterval(timer);
    timer = 0;
    countdown.value = 0;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
    canvasStream?.getTracks().forEach(track => track.stop());
    canvasStream = null;
    recording.value = false;
  };

  const start = async (seconds = 3, fps = 60) => {
    error.value = '';
    if (!canvas.value?.captureStream || !window.MediaRecorder) {
      error.value = 'Запись не поддерживается этим браузером';
      return;
    }
    cancel();
    canvasStream = canvas.value.captureStream(fps);
    const tracks = [...canvasStream.getVideoTracks()];
    const source = audioStream?.();
    if (source) tracks.push(...source.getAudioTracks());
    const stream = new MediaStream(tracks);
    const mimeType = MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { error.value = 'WebM-кодек недоступен'; cancel(); return; }
    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { error.value = 'Запись остановилась из-за ошибки'; cancel(); };
    recorder.onstop = () => { if (chunks.length) download(new Blob(chunks, { type: mimeType })); cancel(); };
    countdown.value = seconds;
    timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) { clearInterval(timer); timer = 0; recorder.start(250); recording.value = true; }
    }, 1000);
  };

  onUnmounted(cancel);
  return { recording, countdown, error, start, cancel };
}
