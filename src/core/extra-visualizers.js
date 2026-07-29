import { VIS, VMAP } from './visualizers.js';
import { clamp } from './palette.js';

const TAU = Math.PI * 2;
const R = (label, def, min, max, step = 0.01) => ({ label, def, min, max, step });
const T = (label, def) => ({ label, def, type: 'toggle' });

const add = (id, name, params, draw) => {
  if (VMAP[id]) return;
  const v = { id, name, group: 'extra', params, draw };
  VIS.push(v);
  VMAP[id] = v;
};

// 1. Oscilloscope Lissajous
add(
  'lissajousOrbit',
  'EXTRA // Lissajous Orbit',
  {
    complexity: R('Сложность', 3, 1, 10, 1),
    size: R('Размер', 0.8, 0.2, 2.0),
    thickness: R('Толщина', 2, 0.5, 8),
    speed: R('Вращение', 1, 0, 5),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p, t } = g;
    const r = Math.min(w, h) * 0.4 * p.size;
    g.add();

    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const f = i / 360;
      const waveVal1 = A.w((f + t * 0.1) % 1) * 2 - 1;
      const waveVal2 = A.w((f * p.complexity + t * 0.15) % 1) * 2 - 1;

      const angle = f * TAU + t * p.speed;
      const radius = r * (0.8 + A.b(f) * 0.4 + waveVal1 * 0.2);

      const x = cx + Math.cos(angle) * radius + waveVal2 * r * 0.2;
      const y = cy + Math.sin(angle * p.complexity) * radius * 0.5 + waveVal1 * r * 0.2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = g.col(A.beat % 1);
    ctx.lineWidth = p.thickness * (1 + A.beat * 2);
    g.alpha(0.8 + A.beat * 0.2);
    ctx.stroke();

    g.norm();
  },
);

// 2. ASCII Matrix
add(
  'asciiMatrix',
  'EXTRA // ASCII Matrix',
  {
    fontSize: R('Размер шрифта', 14, 8, 32, 1),
    density: R('Плотность', 0.5, 0.1, 1),
    speed: R('Скорость', 1, 0.1, 3),
  },
  (g) => {
    const { ctx, w, h, A, p, t } = g;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    const cols = Math.floor(w / p.fontSize);
    const rows = Math.floor(h / p.fontSize);

    ctx.font = p.fontSize + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    g.add();
    for (let x = 0; x < cols; x++) {
      const fx = x / cols;
      const band = A.b(fx);
      const colHeight = Math.floor(rows * band * p.density * 2);

      for (let y = 0; y < colHeight; y++) {
        const fy = y / rows;
        const charIdx = Math.floor((fx * 11 + fy * 31 + t * p.speed * 10) % chars.length);
        const char = chars[charIdx];

        const px = x * p.fontSize + p.fontSize / 2;
        // falling down
        const py = (y * p.fontSize + t * p.speed * 100) % h;

        g.alpha(1 - py / h + band * 0.5);
        ctx.fillStyle = g.col(fx + fy * 0.2 - t * 0.1);
        ctx.fillText(char, px, py);
      }
    }
    g.norm();
  },
);

// 3. Synthwave Retro Grid
add(
  'retroGrid',
  'EXTRA // Synthwave Grid',
  {
    lines: R('Линий', 20, 10, 50, 1),
    speed: R('Скорость', 2, 0, 5),
    height: R('Высота гор', 0.5, 0, 2),
    sun: T('Солнце', true),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p, t } = g;

    // Draw sun
    if (p.sun) {
      const sunR = Math.min(w, h) * 0.2;
      const sunY = cy - sunR * 0.2;
      const grad = ctx.createLinearGradient(cx, sunY - sunR, cx, sunY + sunR);
      grad.addColorStop(0, g.col(0.9));
      grad.addColorStop(1, g.col(0.1));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, sunY, sunR * (1 + A.beat * 0.1), 0, TAU);
      ctx.fill();

      // Sun stripes
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(
          cx - sunR,
          sunY + sunR * 0.2 + i * 20 - ((t * p.speed * 10) % 20),
          sunR * 2,
          4 + i * 2,
        );
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    g.add();
    ctx.strokeStyle = g.col(0.6);
    ctx.lineWidth = 2;

    // Horizontal moving lines
    for (let i = 0; i <= p.lines; i++) {
      const fi = i / p.lines;
      const offset = (fi + ((t * p.speed * 0.1) % (1 / p.lines))) % 1;
      // Perspective projection
      const y = cy + Math.pow(offset, 2) * (h - cy);
      const alpha = Math.pow(offset, 1.5);

      ctx.beginPath();
      for (let x = 0; x <= w; x += w / 40) {
        const fx = Math.abs(x / w - 0.5) * 2; // 0 at center, 1 at edges
        const band = A.b(fx);
        const terrain = band * h * 0.3 * p.height * alpha;

        ctx.lineTo(x, y - terrain);
      }
      g.alpha(alpha);
      ctx.stroke();
    }

    // Vertical perspective lines
    const vLines = 20;
    for (let i = 0; i <= vLines; i++) {
      const fx = i / vLines;
      ctx.beginPath();
      ctx.moveTo(w / 2 + (fx - 0.5) * w * 0.1, cy);
      ctx.lineTo(w / 2 + (fx - 0.5) * w * 3, h);
      g.alpha(0.3 + A.beat * 0.2);
      ctx.stroke();
    }

    g.norm();
  },
);

// 4. VHS Glitch
add(
  'vhsGlitch',
  'EXTRA // VHS Glitch',
  {
    intensity: R('Интенсивность', 1, 0, 3),
    scanlines: T('Сканлайны', true),
    rgbShift: R('RGB Сдвиг', 10, 0, 50, 1),
  },
  (g) => {
    const { ctx, w, h, A, p, t } = g;

    // Base blocky waveform
    ctx.fillStyle = g.col(A.beat);
    g.alpha(0.8);
    for (let i = 0; i < 40; i++) {
      const fx = i / 40;
      const v = A.b(fx);
      ctx.fillRect(fx * w, h / 2 - v * h * 0.4, w / 40 - 2, v * h * 0.8 + 2);
    }

    g.add();

    // RGB Shift (simulated by drawing offset colored blocks)
    const shift = p.rgbShift * A.flux * p.intensity;
    if (shift > 1) {
      g.alpha(0.5);
      ctx.fillStyle = 'red';
      for (let i = 0; i < 40; i += 3) {
        const fx = i / 40;
        ctx.fillRect(fx * w + shift, h / 2 - A.b(fx) * h * 0.4, w / 40, A.b(fx) * h * 0.8);
      }
      ctx.fillStyle = 'cyan';
      for (let i = 1; i < 40; i += 3) {
        const fx = i / 40;
        ctx.fillRect(fx * w - shift, h / 2 - A.b(fx) * h * 0.4, w / 40, A.b(fx) * h * 0.8);
      }
    }

    // Glitch bands
    if (A.flux > 0.6) {
      ctx.fillStyle = g.col(Math.random());
      const gy = Math.random() * h;
      const gh = 10 + Math.random() * 40 * p.intensity;
      ctx.fillRect(0, gy, w, gh);
    }

    // Scanlines
    if (p.scanlines) {
      g.norm();
      g.alpha(0.1);
      ctx.fillStyle = g.bg === '#0d0c12' ? '#ffffff' : '#000000';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }
    }

    g.norm();
  },
);

export const EXTRA_VISUALIZERS_COLLECTION = true;

// Neon / Ribbon additions
const createGrad = (ctx, w, g) => {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 1; i += 0.1) grad.addColorStop(i, g.col(i));
  return grad;
};

const drawNeonPath = (g, ctx, neon) => {
  g.norm();
  g.alpha(1);
  ctx.stroke();

  if (neon > 0) {
    g.add();
    const baseWidth = ctx.lineWidth;

    g.alpha(neon * 0.4);
    ctx.lineWidth = baseWidth * 3;
    ctx.stroke();

    g.alpha(neon * 0.15);
    ctx.lineWidth = baseWidth * 8;
    ctx.stroke();

    g.alpha(neon * 0.05);
    ctx.lineWidth = baseWidth * 16;
    ctx.stroke();

    ctx.lineWidth = baseWidth;
    g.norm();
  }
};

add(
  'ribbonFlow',
  'EXTRA // Ribbon Flow',
  {
    lines: R('Линий', 15, 5, 40, 1),
    complexity: R('Сложность', 2, 1, 5, 0.1),
    amplitude: R('Амплитуда', 1.2, 0.1, 3),
    speed: R('Скорость', 1, 0, 3),
    neon: R('Неон', 0.8, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p, t } = g;
    const grad = createGrad(ctx, w, g);
    ctx.strokeStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < p.lines; i++) {
      const fi = i / Math.max(1, p.lines - 1);
      const phaseOffset = fi * Math.PI * 2;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const fx = x / w;
        const audio = 0.5 + A.b(fx) * 1.5;
        const env = Math.sin(fx * Math.PI);

        const wave1 = Math.sin(fx * Math.PI * p.complexity * 2 + t * p.speed + phaseOffset);
        const wave2 = Math.sin(fx * Math.PI * p.complexity + t * p.speed * 0.5);

        const yOffset = (wave1 * 0.7 + wave2 * 0.3) * h * 0.25 * env * audio * p.amplitude;
        const vShift = (fi - 0.5) * h * 0.15 * env;

        const y = cy + yOffset + vShift;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      drawNeonPath(g, ctx, p.neon);
    }
  },
);

add(
  'quantumStrings',
  'EXTRA // Quantum Strings',
  {
    strings: R('Струн', 8, 1, 20, 1),
    spread: R('Разброс', 1, 0, 3),
    tension: R('Натяжение', 1, 0.1, 3),
    neon: R('Неон', 0.9, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p, t } = g;
    const grad = createGrad(ctx, w, g);
    ctx.strokeStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < p.strings; i++) {
      const fi = i / Math.max(1, p.strings - 1);
      const yBase = cy + (fi - 0.5) * h * 0.4 * p.spread;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const fx = x / w;
        const env = Math.sin(fx * Math.PI);
        const rawWave = A.w((fx + fi * 0.05 + t * 0.1) % 1) * 2 - 1;
        const yOffset = rawWave * h * 0.3 * env * p.tension;
        const y = yBase + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      drawNeonPath(g, ctx, p.neon);
    }
  },
);

add(
  'neonHelix',
  'EXTRA // Neon Helix',
  {
    strands: R('Нити', 2, 2, 6, 1),
    twists: R('Витков', 3, 1, 10, 1),
    radius: R('Радиус', 1, 0.1, 3),
    speed: R('Скорость', 1, 0, 3),
    neon: R('Неон', 1, 0, 1),
  },
  (g) => {
    const { ctx, w, h, cx, cy, A, p, t } = g;
    const grad = createGrad(ctx, w, g);
    ctx.strokeStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;

    for (let i = 0; i < p.strands; i++) {
      const strandPhase = (i / p.strands) * Math.PI * 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const fx = x / w;
        const env = Math.sin(fx * Math.PI);
        const audio = 1 + A.b(fx) * 1.5;
        const angle = fx * Math.PI * 2 * p.twists + t * p.speed + strandPhase;
        const currentRadius = h * 0.15 * p.radius * env * audio;
        const y = cy + Math.sin(angle) * currentRadius;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      drawNeonPath(g, ctx, p.neon);
    }
  },
);

add(
  'neonPillars',
  'EXTRA // Neon Pillars',
  {
    pillars: R('Столбов', 80, 20, 150, 1),
    thickness: R('Толщина', 2, 1, 10, 0.5),
    reflection: R('Отражение', 0.6, 0, 1),
    neon: R('Неон', 1, 0, 2),
    dots: T('Точки', true),
  },
  (g) => {
    const { ctx, w, h, A, p, t } = g;
    const baseY = h * 0.85;
    const num = Math.round(p.pillars);
    const step = w / num;

    g.add();

    if (!g.st.parts) g.st.parts = [];

    for (let i = 0; i < num; i++) {
      const fx = i / (num - 1 || 1);
      const x = i * step + step / 2;

      let val = A.b(fx);
      const jitter = Math.sin(i * 13.5 + t * 2) * 0.1;
      val = Math.max(0.01, val + val * jitter);

      const barHeight = val * h * 0.6;
      const yTop = baseY - barHeight;
      const col = g.col(fx);
      const brightness = Math.min(1, Math.pow(val, 1.5) * 2.5 + 0.1);

      if (p.reflection > 0) {
        const refHeight = barHeight * p.reflection;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY + refHeight);
        ctx.strokeStyle = col;
        ctx.lineWidth = p.thickness;
        g.alpha(0.15 * p.reflection * brightness);
        ctx.stroke();

        if (p.dots) {
          const refTop = baseY + refHeight;
          ctx.beginPath();
          ctx.arc(x, refTop, p.thickness, 0, TAU);
          ctx.fillStyle = col;
          g.alpha(0.2 * p.reflection * brightness);
          ctx.fill();
        }
      }

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, yTop);

      ctx.strokeStyle = col;
      ctx.lineWidth = p.thickness;
      g.alpha(0.4 + 0.6 * brightness);
      ctx.stroke();

      if (p.neon > 0 && brightness > 0.1) {
        const glowInt = p.neon * brightness;

        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, yTop);

        ctx.lineWidth = p.thickness * 3;
        g.alpha(0.3 * glowInt);
        ctx.stroke();

        ctx.lineWidth = p.thickness * 8;
        g.alpha(0.1 * glowInt);
        ctx.stroke();
      }

      if (p.dots) {
        g.alpha(0.5 + 0.5 * brightness);
        ctx.beginPath();
        ctx.arc(x, yTop, p.thickness * (1 + brightness * 0.5), 0, TAU);
        ctx.fillStyle = brightness > 0.6 ? '#fff' : col;
        ctx.fill();

        if (p.neon > 0 && brightness > 0.1) {
          const peakGlow = p.neon * brightness;
          ctx.beginPath();
          ctx.arc(x, yTop, p.thickness * 4, 0, TAU);
          ctx.fillStyle = col;
          g.alpha(0.5 * peakGlow);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, yTop, p.thickness * 9, 0, TAU);
          g.alpha(0.15 * peakGlow);
          ctx.fill();
        }
      }

      if (val > 0.6 && Math.random() < 0.1) {
        g.st.parts.push({
          x: x + (Math.random() - 0.5) * p.thickness,
          y: yTop,
          vy: 1 + Math.random() * 3,
          life: 0.5 + Math.random() * 1.5,
          col: col,
        });
      }
    }

    for (let i = g.st.parts.length - 1; i >= 0; i--) {
      const pt = g.st.parts[i];
      pt.y -= pt.vy * g.dt * 60;
      pt.vy *= 0.98;
      pt.life -= g.dt;
      if (pt.life <= 0) {
        g.st.parts.splice(i, 1);
        continue;
      }

      g.alpha(pt.life * p.neon);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.thickness * 0.8, 0, TAU);
      ctx.fillStyle = pt.col;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.thickness * 3, 0, TAU);
      g.alpha(pt.life * p.neon * 0.3);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(w, baseY);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, g.rgba(0, 0));
    grad.addColorStop(0.2, g.col(0.2));
    grad.addColorStop(0.8, g.col(0.8));
    grad.addColorStop(1, g.rgba(1, 0));

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    g.alpha(0.5);
    ctx.stroke();

    g.norm();
  },
);
