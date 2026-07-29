function moveVisualizerControls() {
  const rail = document.querySelector('.rail');
  const inspector = document.querySelector('.insp');
  if (!rail || !inspector || inspector.dataset.controlsMoved) return;
  const frameSection = [...rail.querySelectorAll('.sec')].find(el => el.querySelector('summary')?.textContent.includes('Цвет и кадр'));
  if (frameSection) inspector.prepend(frameSection);
  const header = inspector.querySelector('h2')?.parentElement;
  if (!header || inspector.querySelector('[data-eq-colors]')) return;
  const section = document.createElement('details');
  section.className = 'sec';
  section.open = true;
  section.dataset.eqColors = '';
  section.innerHTML = '<summary>Цвет EQ</summary><div class="sec-body eq-color-controls"><label><span class="plabel">Режим</span><select data-eq-color="mode"><option value="duo">Дуо-градиент</option><option value="single">Один цвет</option><option value="spectrum">Спектр</option><option value="split">Сплит</option></select></label><div class="grid grid-cols-2 gap-2"><label><span class="plabel">A</span><input type="color" data-eq-color="c1"></label><label><span class="plabel">B</span><input type="color" data-eq-color="c2"></label></div><label><span class="plabel">Прокрутка оттенка</span><input type="range" data-eq-color="cycle" min="0" max="2" step=".02"></label></div>';
  inspector.insertBefore(section, header.nextSibling);
  const sync = () => { const s = window.__EQ_ENGINE__?.S; if (!s) return; section.querySelector('[data-eq-color="mode"]').value = s.colorMode; section.querySelector('[data-eq-color="c1"]').value = s.c1; section.querySelector('[data-eq-color="c2"]').value = s.c2; section.querySelector('[data-eq-color="cycle"]').value = s.cycle; };
  const bind = (key, input) => input.addEventListener('input', () => { if (window.__EQ_ENGINE__?.S) window.__EQ_ENGINE__.S[key] = input.type === 'range' ? input.valueAsNumber : input.value; });
  section.querySelectorAll('[data-eq-color]').forEach(input => bind(input.dataset.eqColor, input));
  sync(); inspector.dataset.controlsMoved = 'true';
}
window.addEventListener('DOMContentLoaded', () => setTimeout(moveVisualizerControls, 120));
setTimeout(moveVisualizerControls, 120);
export { moveVisualizerControls };
