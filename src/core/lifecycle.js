import { Audio } from './audio.js';
import { Effects } from './effects.js';

function revoke(url) {
  if (url) URL.revokeObjectURL(url);
}

async function disposeAudio(audioElement) {
  if (audioElement) {
    audioElement.pause();
    audioElement.removeAttribute('src');
    audioElement.load();
  }
  for (const node of [Audio.mediaSrc, Audio.an, Audio.out, Audio.sink]) {
    try {
      node?.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  const context = Audio.ac;
  Audio.ac = Audio.an = Audio.mediaSrc = Audio.out = Audio.sink = Audio.recordDest = null;
  Audio.ready = false;
  Audio.live = false;
  if (context && context.state !== 'closed') await context.close().catch(() => {});
}

function disposeEffects() {
  for (const media of Object.values(Effects.media)) {
    if (media.asset?.pause) media.asset.pause();
    revoke(media.url);
    media.asset = null;
    media.url = '';
    media.enabled = false;
  }
  Effects.states = Object.create(null);
  document.querySelector('[data-effects-panel]')?.remove();
}

export { revoke, disposeAudio, disposeEffects };
