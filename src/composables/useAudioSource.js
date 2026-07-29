import { onUnmounted, ref } from 'vue';
import { Audio } from '../core/audio';
import { revoke } from '../core/lifecycle';

export function useAudioSource(audioElement) {
  const fileName = ref('');
  const hasFile = ref(false);
  const microphone = ref(false);
  const error = ref(null);
  let objectUrl = '';

  const loadFile = file => {
    if (!file) return;
    if (file.type && !file.type.startsWith('audio/')) {
      error.value = 'Выберите поддерживаемый аудиофайл';
      return;
    }
    const element = audioElement.value;
    Audio.ensure(element);
    revoke(objectUrl);
    objectUrl = URL.createObjectURL(file);
    element.src = objectUrl;
    fileName.value = file.name;
    hasFile.value = true;
    microphone.value = false;
    Audio.micOff();
    element.play().catch(() => { error.value = 'Браузер не смог воспроизвести этот формат'; });
  };
  const toggleMicrophone = async () => {
    Audio.ensure(audioElement.value);
    await Audio.ac.resume();
    if (microphone.value) { Audio.micOff(); microphone.value = false; return; }
    try { audioElement.value.pause(); await Audio.micOn(); microphone.value = true; error.value = null; }
    catch (reason) { error.value = reason?.message || 'Нет доступа к микрофону'; }
  };
  onUnmounted(() => { revoke(objectUrl); objectUrl = ''; Audio.micOff(); });
  return { fileName, hasFile, microphone, error, loadFile, toggleMicrophone };
}
