import { onMounted, onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioStream) {
  const status = ref('idle');
  const error = ref('');
  const recording = ref(false);
  const countdown = ref(0);
  let recorder = null;
  let canvasStream = null;
  let durationTimer = 0;
  let discard = false;

  const cleanupTracks = () => { canvasStream?.getTracks().forEach(track => track.stop()); canvasStream = null; };
  const reset = () => { clearTimeout(durationTimer); durationTimer = 0; countdown.value = 0; recording.value = false; status.value = 'idle'; recorder = null; cleanupTracks(); };
  const download = blob => { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'eqlab-recording.webm'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

  const stop = () => {
    discard = false;
    if (recorder && recorder.state !== 'inactive') { recorder.requestData?.(); recorder.stop(); }
  };
  const cancel = () => {
    discard = true;
    if (recorder && recorder.state !== 'inactive') recorder.stop(); else reset();
  };

  const start = (fps = 60, bitrate = 8_000_000, duration = 0) => {
    if (status.value !== 'idle') return;
    error.value = '';
    const target = canvas.value;
    if (!target?.captureStream || typeof window.MediaRecorder !== 'function') { error.value = 'Запись не поддерживается этим браузером'; return; }
    discard = false;
    try {
      const videoStream = target.captureStream(fps); canvasStream = videoStream;
      const tracks = [...videoStream.getVideoTracks()]; const source = audioStream?.();
      if (source) tracks.push(...source.getAudioTracks());
      const stream = new MediaStream(tracks);
      const mimeType = MIME_TYPES.find(type => window.MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('WebM-кодек недоступен');
      const chunks = [];
      const instance = new window.MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      recorder = instance; status.value = 'recording'; recording.value = true;
      instance.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      instance.onerror = () => { error.value = 'Запись остановилась из-за ошибки'; reset(); };
      instance.onstop = () => { const shouldDownload = !discard && chunks.length > 0; reset(); if (shouldDownload) download(new Blob(chunks, { type: mimeType })); };
      instance.start(250);
      if (duration > 0) durationTimer = window.setTimeout(stop, duration * 1000);
    } catch (reason) { error.value = reason?.message || 'Не удалось запустить запись'; reset(); }
  };

  onMounted(reset);
  onUnmounted(cancel);
  return { status, recording, countdown, error, start, stop, cancel, reset };
}
