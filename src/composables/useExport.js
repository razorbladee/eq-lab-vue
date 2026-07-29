import { ref } from 'vue';
import { revoke } from '../core/lifecycle';

export function useExport(canvas, name = 'eqlab') {
  const exporting = ref(false);
  const png = () =>
    new Promise((resolve, reject) => {
      if (!canvas.value) return reject(new Error('Canvas is not mounted'));
      canvas.value.toBlob((blob) => {
        if (!blob) return reject(new Error('PNG export failed'));
        const url = URL.createObjectURL(blob),
          link = document.createElement('a');
        link.href = url;
        link.download = `${name}.png`;
        link.click();
        setTimeout(() => revoke(url), 0);
        resolve();
      }, 'image/png');
    });
  return { exporting, png };
}
