import { onMounted, onUnmounted, ref } from 'vue';

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function useRecorder(canvas, audioSource) {
  const status = ref('idle'),
    error = ref(''),
    recording = ref(false),
    countdown = ref(0);
  let recorder = null,
    canvasStream = null,
    durationTimer = 0,
    discard = false,
    sourceAudio = null;
  const cleanupTracks = () => {
    canvasStream?.getTracks().forEach((track) => track.stop());
    canvasStream = null;
  };
  const reset = () => {
    clearTimeout(durationTimer);
    durationTimer = 0;
    countdown.value = 0;
    recording.value = false;
    status.value = 'idle';
    recorder = null;
    sourceAudio = null;
    cleanupTracks();
  };
  const download = (blob) => {
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'eqlab-recording.webm';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stop = () => {
    discard = false;
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData?.();
      recorder.stop();
    }
  };
  const cancel = () => {
    discard = true;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else reset();
  };
  const start = (fps = 60, bitrate = 8_000_000, duration = 0) => {
    if (status.value !== 'idle') return;
    error.value = '';
    const target = canvas.value;
    if (!target?.captureStream || typeof window.MediaRecorder !== 'function') {
      error.value = 'Запись не поддерживается этим браузером';
      return;
    }
    discard = false;
    try {
      const source = audioSource?.() || {},
        videoStream = target.captureStream(fps);
      canvasStream = videoStream;
      const tracks = [...videoStream.getVideoTracks()];
      if (source.stream) tracks.push(...source.stream.getAudioTracks());
      const stream = new MediaStream(tracks),
        mimeType = MIME_TYPES.find((type) => window.MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('WebM-кодек недоступен');
      const chunks = [],
        audio = source.audio;
      let from = Number(audio?.dataset.selectionFrom) || 0,
        to = Number(audio?.dataset.selectionTo) || 0;
      if (audio && Number.isFinite(audio.duration) && to > from + 0.05) {
        audio.currentTime = from;
        duration = to - from;
      }
      const instance = new window.MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      recorder = instance;
      sourceAudio = audio;
      status.value = 'recording';
      recording.value = true;
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      instance.onerror = () => {
        error.value = 'Запись остановилась из-за ошибки';
        reset();
      };
      instance.onstop = () => {
        const shouldDownload = !discard && chunks.length > 0;
        if (sourceAudio) sourceAudio.pause();
        reset();
        if (shouldDownload) download(new Blob(chunks, { type: mimeType }));
      };
      instance.start(250);
      if (duration > 0) durationTimer = window.setTimeout(stop, duration * 1000);
      if (audio && audio.paused) audio.play().catch(() => {});
    } catch (reason) {
      error.value = reason?.message || 'Не удалось запустить запись';
      reset();
    }
  };
  onMounted(reset);
  onUnmounted(cancel);
  return { status, recording, countdown, error, start, stop, cancel, reset };
}
