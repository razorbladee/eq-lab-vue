import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });
const add = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'neon', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};
const stroke = (g, points, color, width, alpha) => {
  const { ctx } = g;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  g.alpha(alpha * 0.16); ctx.strokeStyle = color; ctx.lineWidth = width * 5; ctx.stroke();
  g.alpha(alpha); ctx.lineWidth = width; ctx.stroke();
};
const cornerFrame = (g, pad = 0.07, len = 0.08) => {
  const { ctx, w, h } = g;
  const x = w * pad, y = h * pad, dx = w * len, dy = h * len;
  g.alpha(0.58); ctx.strokeStyle = g.col(0.12); ctx.lineWidth = 1;
  [[x,y,1,1],[w-x,y,-1,1],[x,h-y,1,-1],[w-x,h-y,-1,-1]].forEach(([a,b,sx,sy]) => { ctx.beginPath(); ctx.moveTo(a + dx*sx,b); ctx.lineTo(a,b); ctx.lineTo(a,b + dy*sy); ctx.stroke(); });
};

add('futurePrismMesh', 'FUTURE // Prism Mesh', {
  points: R('Вершин', 42, 12, 100, 1), height: R('Высота', 0.8, 0.2, 1.6), depth: R('Глубина', 0.7, 0.1, 1.5), reflection: T('Зеркальное дно', true), particles: T('Парящие маркеры', true),
}, g => {
  const { ctx, w, h, A, p } = g, n = Math.max(12, Math.round(p.points * g.q)), base = h * 0.6, step = w / n, pts = [];
  cornerFrame(g);
  for (let i = 0; i < n; i++) { const f = i / (n - 1), v = A.b(f), y = base - v * h * 0.34 * p.height; pts.push([i * step, y]); }
  for (let i = 0; i < n - 1; i++) { const f = i / (n - 1), a = pts[i], b = pts[i+1]; ctx.beginPath(); ctx.moveTo(a[0], base); ctx.lineTo(a[0] + step/2, a[1]); ctx.lineTo(b[0], base); ctx.closePath(); g.alpha(0.08 + A.b(f) * 0.28); ctx.fillStyle = g.col(f); ctx.fill(); g.alpha(0.62); ctx.strokeStyle = g.col(f); ctx.lineWidth = 0.8; ctx.stroke(); }
  stroke(g, pts, g.col(0.46), 1.7, 0.9);
  if (p.reflection) stroke(g, pts.map(([x,y]) => [x, base + (base-y)*0.75]), g.col(0.7), 0.7, 0.2);
  if (p.particles) { for (let i = 0; i < 55 * g.q; i++) { const f = (i * 0.618) % 1, x = f*w, y = h*(0.18 + ((i*0.37 + g.t*0.03)%0.4)); g.alpha(0.15 + A.b(f)*0.6); ctx.fillStyle = g.col(f); ctx.fillRect(x,y,2,2); } }
  g.norm();
});

add('futureBassTreble', 'FUTURE // Bass / Treble Ribbon', {
  layers: R('Слоёв', 7, 2, 16, 1), amplitude: R('Амплитуда', 0.8, 0.2, 1.8), particles: R('Частиц', 180, 40, 420, 10), labels: T('Подписи зон', true),
}, g => {
  const { ctx, w, h, A, p } = g;
  for (let l = 0; l < p.layers; l++) { const f = l / Math.max(1,p.layers-1), pts=[]; for (let i=0;i<=180;i++){ const x=i/180, bass=A.b(x*0.55), treble=A.b(0.45+x*0.55), y=h*0.46 + Math.sin(x*8+g.t*(1+f)+l)*h*(0.06+(bass+treble)*0.12)*p.amplitude + (f-0.5)*h*0.18; pts.push([x*w,y]); } stroke(g,pts,g.col(f),1.1+(1-f),0.18+(1-f)*0.55); }
  for (let i=0;i<p.particles*g.q;i++){ const f=(i*0.618033)%1, x=f*w, y=h*0.46+Math.sin(f*9+g.t)*h*0.16; g.alpha(0.08+A.b(f)*0.5); ctx.fillStyle=g.col(f); ctx.fillRect(x,y,1.5,1.5); }
  if (p.labels) { ctx.font='700 10px Space Mono, monospace'; g.alpha(0.8); ctx.fillStyle=g.col(0.05); ctx.fillText('BASS',w*0.06,h*0.82); ctx.fillStyle=g.col(0.92); ctx.fillText('TREBLE',w*0.85,h*0.82); for(let i=0;i<14;i++){ g.alpha(0.25+A.b(i/14)*0.6); ctx.fillRect(w*0.06+i*6,h*0.84,3,2); ctx.fillRect(w*0.85+i*6,h*0.84,3,2); } }
  g.norm();
});

add('futurePulseHud', 'FUTURE // Pulse HUD', {
  points: R('Сэмплов', 220, 60, 520, 10), grid: T('Сетка', true), markers: T('Маркеры', true), scan: R('Сканер', 1, 0, 2),
}, g => {
  const { ctx, w, h, A, p } = g, n=Math.max(40,Math.round(p.points*g.q)), y0=h*0.55, pts=[];
  cornerFrame(g,0.055,0.07);
  if(p.grid){g.alpha(0.08);ctx.strokeStyle=g.col(0.45);ctx.lineWidth=1;for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(w*0.08,h*(0.18+i*0.08));ctx.lineTo(w*0.92,h*(0.18+i*0.08));ctx.stroke();}}
  for(let i=0;i<n;i++){const x=i/(n-1),v=A.b(x), y=y0-v*h*0.36*g.S.amp+Math.sin(x*30+g.t*3)*v*7;pts.push([x*w,y]);}
  stroke(g,pts,g.col(0.45),1.4,0.92);
  if(p.scan){const x=((g.t*p.scan*0.18)%1)*w;g.alpha(0.6);ctx.fillStyle=g.col(0.75);ctx.fillRect(x,h*0.18,1,h*0.66);}
  if(p.markers){g.alpha(0.75);ctx.font='9px Space Mono, monospace';ctx.fillStyle=g.col(0.2);ctx.fillText('SIGNAL / LIVE',w*0.08,h*0.15);ctx.fillText('FFT 4096',w*0.78,h*0.15);ctx.fillText('BPM '+(A.bpm||'--'),w*0.08,h*0.88);ctx.fillText('GAIN '+Math.round(A.level*100)+'%',w*0.78,h*0.88);}
  g.norm();
});

add('futureSpectralCore', 'FUTURE // Spectral Core', {
  rings: R('Колец', 12, 4, 28, 1), rays: R('Лучей', 64, 24, 140, 4), rotation: R('Вращение', 0.5, -2, 2), orbit: R('Орбита', 0.7, 0, 2),
}, g => {
  const { ctx, w, h, cx, cy, A, p } = g, r=Math.min(w,h)*0.35, rays=Math.max(16,Math.round(p.rays*g.q));
  cornerFrame(g,0.1,0.06); g.add();
  for(let ring=1;ring<=p.rings;ring++){const z=ring/p.rings, rr=r*z*(0.72+A.b(z)*0.3);ctx.beginPath();for(let i=0;i<=rays;i++){const f=i/rays,a=f*TAU+g.t*p.rotation+z*p.orbit,v=A.b(f),x=cx+Math.cos(a)*rr*(1+v*0.22),y=cy+Math.sin(a)*rr*(0.55+z*0.35);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}g.alpha(0.08+A.b(z)*0.36);ctx.strokeStyle=g.col(z);ctx.lineWidth=1+z;ctx.stroke();}
  for(let i=0;i<rays;i++){const f=i/rays,v=A.b(f),a=f*TAU+g.t*p.rotation,rr=r*(0.45+v*0.7),s=1+v*5;g.alpha(0.2+v*0.75);ctx.fillStyle=g.col(f);ctx.fillRect(cx+Math.cos(a)*rr-s/2,cy+Math.sin(a)*rr*0.6-s/2,s,s);}
  g.alpha(0.8+A.beat*0.2);ctx.fillStyle=g.col(0.5);ctx.beginPath();ctx.arc(cx,cy,8+A.bass*18,0,TAU);ctx.fill();g.norm();
});

add('futureWaveformFrame', 'FUTURE // Waveform Frame', {
  points: R('Точек', 180, 60, 420, 1), thickness: R('Толщина', 1.4, 0.4, 4), reflection: T('Отражение', true), frame: T('Рамка', true), bloom: R('Блум', 0.8, 0, 2),
}, g => {
  const { ctx, w, h, A, p }=g,n=Math.max(40,Math.round(p.points*g.q)),y0=h*0.52,pts=[];
  if(p.frame){cornerFrame(g,0.06,0.08);g.alpha(0.28);ctx.strokeStyle=g.col(0.4);ctx.strokeRect(w*0.06,h*0.13,w*0.88,h*0.68);}
  for(let i=0;i<n;i++){const x=i/(n-1),v=A.b(x),y=y0-v*h*0.32*g.S.amp;pts.push([x*w,y]);}
  stroke(g,pts,g.col(0.48),p.thickness,0.9); if(p.reflection)stroke(g,pts.map(([x,y])=>[x,h*1.04-y]),g.col(0.74),0.7,0.18);
  if(p.bloom){g.add();g.alpha(p.bloom*0.08);ctx.filter='blur(8px)';stroke(g,pts,g.col(0.55),5,1);ctx.filter='none';g.norm();}
});
