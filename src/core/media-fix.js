import { Effects } from './effects.js';

const drawMedia = Effects.drawMedia.bind(Effects);
Effects.drawMedia = (g, slot) => {
  const media = Effects.media[slot];
  if (!media) return;
  if (slot === 'background') {
    const original = { ...media };
    Object.assign(media, { x: 50, y: 50, width: 100, height: 100 });
    drawMedia(g, slot);
    Object.assign(media, original);
  } else {
    drawMedia(g, slot);
  }
};
