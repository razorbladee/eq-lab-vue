// Effects owns rendering state only. UI is implemented by Vue in components/EffectsPanel.vue.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const defaults = {
  snow: {
    enabled: false,
    layer: 'back',
    opacity: 0.5,
    amount: 260,
    speed: 0.7,
    size: 2.4,
    color: '#bfe7ff',
  },
  rain: {
    enabled: false,
    layer: 'back',
    opacity: 0.42,
    amount: 180,
    speed: 1.2,
    size: 1.2,
    color: '#65cfff',
  },
  bokeh: {
    enabled: false,
    layer: 'back',
    opacity: 0.34,
    amount: 36,
    speed: 0.35,
    size: 32,
    color: '#ff6bd6',
  },
  fireflies: {
    enabled: false,
    layer: 'back',
    opacity: 0.5,
    amount: 90,
    speed: 0.55,
    size: 3.5,
    color: '#baff7a',
  },
  dust: {
    enabled: false,
    layer: 'front',
    opacity: 0.18,
    amount: 240,
    speed: 0.22,
    size: 1.4,
    color: '#d6c8ff',
  },
  aurora: {
    enabled: false,
    layer: 'back',
    opacity: 0.28,
    amount: 5,
    speed: 0.25,
    size: 0.6,
    color: '#8a7dff',
  },
};
const mediaDefaults = {
  background: {
    enabled: false,
    url: '',
    type: '',
    opacity: 0.7,
    fit: 'cover',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    asset: null,
  },
  cover: {
    enabled: false,
    url: '',
    type: '',
    opacity: 1,
    fit: 'contain',
    x: 50,
    y: 50,
    width: 34,
    height: 34,
    asset: null,
  },
};
const Effects = {
  items: structuredClone(defaults),
  media: structuredClone(mediaDefaults),
  states: Object.create(null),
  selected: 'snow',
  reset() {
    this.items = structuredClone(defaults);
    this.media = structuredClone(mediaDefaults);
    this.states = Object.create(null);
  },
  setAsset(slot, file) {
    if (!file) return;
    const old = this.media[slot];
    if (old?.url) URL.revokeObjectURL(old.url);
    const url = URL.createObjectURL(file),
      isVideo = file.type.startsWith('video/');
    const asset = isVideo ? document.createElement('video') : new Image();
    asset.muted = true;
    asset.loop = true;
    asset.playsInline = true;
    const ready = () => {
      this.media[slot] = { ...this.media[slot], enabled: true, url, type: file.type, asset };
      this.states['media:' + slot] = { url, asset, ready: true };
      if (isVideo) asset.play().catch(() => {});
    };
    asset.onload = ready;
    asset.onloadeddata = ready;
    asset.onerror = () => {
      this.media[slot].enabled = false;
      URL.revokeObjectURL(url);
    };
    asset.src = url;
  },
  draw(g, phase) {
    for (const [id, p] of Object.entries(this.items)) {
      if (!p.enabled || p.layer !== phase) continue;
      const n = Math.round(clamp(p.amount * g.q, 0, 900));
      const st =
        this.states[id] || (this.states[id] = { seeded: false, x: [], y: [], z: [], a: [] });
      if (id === 'aurora') drawAurora(g, p);
      else {
        if (!st.seeded || st.x.length !== n) seed(st, n, g.w, g.h);
        if (id === 'snow') drawSnow(g, p, st, n);
        if (id === 'rain') drawRain(g, p, st, n);
        if (id === 'bokeh') drawBokeh(g, p, st, n);
        if (id === 'fireflies') drawFireflies(g, p, st, n);
        if (id === 'dust') drawDust(g, p, st, n);
      }
    }
    g.ctx.globalAlpha = 1;
    g.ctx.globalCompositeOperation = 'source-over';
  },
  drawMedia(g, slot) {
    const media = this.media[slot],
      asset = media?.asset || this.states['media:' + slot]?.asset;
    if (!media?.enabled || !asset) return;
    const isVideo = media.type.startsWith('video/'),
      ready = isVideo ? asset.readyState >= 2 : asset.complete && asset.naturalWidth > 0;
    if (!ready) return;
    const ratio = isVideo
      ? asset.videoWidth / asset.videoHeight
      : asset.naturalWidth / asset.naturalHeight;
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    const box = mediaBox(g.w, g.h, media, ratio),
      ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(Number(media.opacity) || 0, 0, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(asset, box.x, box.y, box.w, box.h);
    ctx.restore();
  },
};
function mediaBox(w, h, m, ratio) {
  const bw = (w * m.width) / 100,
    bh = (h * m.height) / 100,
    x = (w * m.x) / 100 - bw / 2,
    y = (h * m.y) / 100 - bh / 2;
  if (m.fit === 'stretch') return { x, y, w: bw, h: bh };
  const contain = m.fit === 'contain',
    boxRatio = bw / bh;
  let dw = bw,
    dh = bh;
  if (ratio > boxRatio === contain) dh = bw / ratio;
  else dw = bh * ratio;
  return { x: x + (bw - dw) / 2, y: y + (bh - dh) / 2, w: dw, h: dh };
}
function seed(st, n, w, h) {
  st.x.length = st.y.length = st.z.length = st.a.length = n;
  for (let i = 0; i < n; i++) {
    st.x[i] = Math.random() * w;
    st.y[i] = Math.random() * h;
    st.z[i] = 0.25 + Math.random() * 0.75;
    st.a[i] = Math.random() * TAU;
  }
  st.seeded = true;
}
function color(ctx, hex) {
  ctx.fillStyle = hex;
  ctx.strokeStyle = hex;
}
function drawSnow(g, p, st, n) {
  const c = g.ctx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = st.z[i],
      r = p.size * z * (0.55 + 0.45 * Math.sin(g.t * p.speed + st.a[i])),
      wind = Math.sin(g.t * 0.35 + st.a[i]) * 10;
    st.y[i] += g.dt * p.speed * (18 + 52 * z);
    st.x[i] += g.dt * (wind + 5);
    if (st.y[i] > g.h + 8) {
      st.y[i] = -8;
      st.x[i] = Math.random() * g.w;
    }
    if (st.x[i] > g.w + 8) st.x[i] = -8;
    color(c, p.color);
    c.globalAlpha = p.opacity * (0.25 + 0.75 * z);
    c.beginPath();
    c.arc(st.x[i], st.y[i], Math.max(0.5, r), 0, TAU);
    c.fill();
  }
  c.restore();
}
function drawRain(g, p, st, n) {
  const c = g.ctx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const z = st.z[i],
      len = p.size * (12 + 36 * z);
    st.y[i] += g.dt * p.speed * (180 + 260 * z);
    st.x[i] += g.dt * p.speed * 24;
    if (st.y[i] > g.h + len) {
      st.y[i] = -len;
      st.x[i] = Math.random() * g.w;
    }
    color(c, p.color);
    c.globalAlpha = p.opacity * (0.18 + 0.7 * z);
    c.lineWidth = Math.max(0.45, p.size * z);
    c.beginPath();
    c.moveTo(st.x[i], st.y[i]);
    c.lineTo(st.x[i] - p.size * 2, st.y[i] - len);
    c.stroke();
  }
  c.restore();
}
function drawBokeh(g, p, st, n) {
  const c = g.ctx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = st.z[i],
      r = p.size * (0.35 + 0.9 * z),
      x = st.x[i] + Math.sin(g.t * p.speed + st.a[i]) * 18;
    st.y[i] -= g.dt * p.speed * (4 + 12 * z);
    if (st.y[i] < -r) {
      st.y[i] = g.h + r;
      st.x[i] = Math.random() * g.w;
    }
    color(c, p.color);
    c.globalAlpha = p.opacity * (0.08 + 0.26 * z);
    c.beginPath();
    c.arc(x, st.y[i], r, 0, TAU);
    c.fill();
    c.globalAlpha *= 0.8;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, st.y[i], r * 0.78, 0, TAU);
    c.stroke();
  }
  c.restore();
}
function drawFireflies(g, p, st, n) {
  const c = g.ctx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = st.z[i],
      x = st.x[i] + Math.sin(g.t * p.speed + st.a[i]) * 22,
      y = st.y[i] + Math.cos(g.t * p.speed * 0.7 + st.a[i]) * 18,
      r = p.size * (0.45 + 0.8 * z),
      pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(g.t * 3 + st.a[i]));
    color(c, p.color);
    c.globalAlpha = p.opacity * pulse * (0.25 + 0.6 * z);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();
}
function drawDust(g, p, st, n) {
  const c = g.ctx;
  c.save();
  for (let i = 0; i < n; i++) {
    const z = st.z[i],
      x = st.x[i] + Math.sin(g.t * p.speed + st.a[i]) * 12,
      y = st.y[i] + Math.cos(g.t * p.speed * 0.8 + st.a[i]) * 10,
      r = p.size * (0.35 + 0.65 * z);
    color(c, p.color);
    c.globalAlpha = p.opacity * (0.2 + 0.65 * z);
    c.fillRect(x, y, r, r);
  }
  c.restore();
}
function drawAurora(g, p) {
  const c = g.ctx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let l = 0; l < p.amount; l++) {
    const f = l / Math.max(1, p.amount - 1);
    c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const x = i / 80,
        y =
          g.h * (0.2 + f * 0.34) +
          Math.sin(x * 5 + g.t * p.speed + l) * g.h * (0.045 + 0.06 * g.A.b(x));
      i ? c.lineTo(x * g.w, y) : c.moveTo(x * g.w, y);
    }
    c.lineTo(g.w, g.h * 0.56);
    c.lineTo(0, g.h * 0.56);
    c.closePath();
    color(c, p.color);
    c.globalAlpha = p.opacity * (0.04 + 0.05 * (1 - f));
    c.fill();
  }
  c.restore();
}

export { Effects };
