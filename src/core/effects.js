const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const defaults = {
  snow: { enabled: false, layer: 'back', opacity: .5, amount: 260, speed: .7, size: 2.4, color: '#bfe7ff' },
  rain: { enabled: false, layer: 'back', opacity: .42, amount: 180, speed: 1.2, size: 1.2, color: '#65cfff' },
  bokeh: { enabled: false, layer: 'back', opacity: .34, amount: 36, speed: .35, size: 32, color: '#ff6bd6' },
  fireflies: { enabled: false, layer: 'back', opacity: .5, amount: 90, speed: .55, size: 3.5, color: '#baff7a' },
  dust: { enabled: false, layer: 'front', opacity: .18, amount: 240, speed: .22, size: 1.4, color: '#d6c8ff' },
  aurora: { enabled: false, layer: 'back', opacity: .28, amount: 5, speed: .25, size: .6, color: '#8a7dff' },
};
const labels = { snow: 'Snowfall', rain: 'Rain streaks', bokeh: 'Bokeh lights', fireflies: 'Fireflies', dust: 'Floating dust', aurora: 'Aurora veil' };
const mediaDefaults = { background: { enabled: false, url: '', type: '', opacity: .7, fit: 'cover', x: 50, y: 50, width: 100, height: 100, asset: null }, cover: { enabled: false, url: '', type: '', opacity: 1, fit: 'contain', x: 50, y: 50, width: 34, height: 34, asset: null } };
const Effects = {
  items: structuredClone(defaults),
  media: structuredClone(mediaDefaults),
  states: Object.create(null),
  selected: 'snow',
  reset() { this.items = structuredClone(defaults); this.media = structuredClone(mediaDefaults); this.states = Object.create(null); },
  draw(g, phase) {
    for (const [id, p] of Object.entries(this.items)) {
      if (!p.enabled || p.layer !== phase) continue;
      const n = Math.round(clamp(p.amount * g.q, 0, 900));
      const st = this.states[id] || (this.states[id] = { seeded: false, x: [], y: [], z: [], a: [] });
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
    const media = this.media[slot];
    if (!media?.enabled) return;
    const record = this.states['media:' + slot];
    const asset = media.asset || record?.asset;
    if (!asset) return;
    const isVideo = media.type.startsWith('video/');
    const ready = isVideo ? asset.readyState >= 2 : asset.complete && asset.naturalWidth > 0;
    if (!ready) return;
    const ratio = isVideo ? asset.videoWidth / asset.videoHeight : asset.naturalWidth / asset.naturalHeight;
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    const box = mediaBox(g.w, g.h, media, ratio);
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(Number(media.opacity) || 0, 0, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(asset, box.x, box.y, box.w, box.h);
    ctx.restore();
  },
};
function mediaBox(w, h, media, ratio) { const bw = w * media.width / 100, bh = h * media.height / 100, x = w * media.x / 100 - bw / 2, y = h * media.y / 100 - bh / 2; if (media.fit === 'stretch') return { x, y, w: bw, h: bh }; const contain = media.fit === 'contain', boxRatio = bw / bh; let dw = bw, dh = bh; if ((ratio > boxRatio) === contain) dh = bw / ratio; else dw = bh * ratio; return { x: x + (bw - dw) / 2, y: y + (bh - dh) / 2, w: dw, h: dh }; }
function seed(st,n,w,h){st.x.length=st.y.length=st.z.length=st.a.length=n;for(let i=0;i<n;i++){st.x[i]=Math.random()*w;st.y[i]=Math.random()*h;st.z[i]=.25+Math.random()*.75;st.a[i]=Math.random()*TAU;}st.seeded=true;}
function color(ctx,hex){ctx.fillStyle=hex;ctx.strokeStyle=hex;}
function drawSnow(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],r=p.size*z*(.55+.45*Math.sin(g.t*p.speed+st.a[i])),wind=Math.sin(g.t*.35+st.a[i])*10;st.y[i]+=g.dt*p.speed*(18+52*z);st.x[i]+=g.dt*(wind+5);if(st.y[i]>g.h+8){st.y[i]=-8;st.x[i]=Math.random()*g.w;}if(st.x[i]>g.w+8)st.x[i]=-8;color(c,p.color);c.globalAlpha=p.opacity*(.25+.75*z);c.beginPath();c.arc(st.x[i],st.y[i],Math.max(.5,r),0,TAU);c.fill();}c.restore();}
function drawRain(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';c.lineCap='round';for(let i=0;i<n;i++){const z=st.z[i],len=p.size*(12+36*z);st.y[i]+=g.dt*p.speed*(180+260*z);st.x[i]+=g.dt*p.speed*24;if(st.y[i]>g.h+len){st.y[i]=-len;st.x[i]=Math.random()*g.w;}color(c,p.color);c.globalAlpha=p.opacity*(.18+.7*z);c.lineWidth=Math.max(.45,p.size*z);c.beginPath();c.moveTo(st.x[i],st.y[i]);c.lineTo(st.x[i]-p.size*2,st.y[i]-len);c.stroke();}c.restore();}
function drawBokeh(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],r=p.size*(.35+.9*z),x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*18;st.y[i]-=g.dt*p.speed*(4+12*z);if(st.y[i]<-r){st.y[i]=g.h+r;st.x[i]=Math.random()*g.w;}color(c,p.color);c.globalAlpha=p.opacity*(.08+.26*z);c.beginPath();c.arc(x,st.y[i],r,0,TAU);c.fill();c.globalAlpha*=.8;c.lineWidth=1;c.beginPath();c.arc(x,st.y[i],r*.78,0,TAU);c.stroke();}c.restore();}
function drawFireflies(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*22,y=st.y[i]+Math.cos(g.t*p.speed*.7+st.a[i])*18,r=p.size*(.45+.8*z),pulse=.3+.7*(.5+.5*Math.sin(g.t*3+st.a[i]));color(c,p.color);c.globalAlpha=p.opacity*pulse*(.25+.6*z);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}c.restore();}
function drawDust(g,p,st,n){const c=g.ctx;c.save();for(let i=0;i<n;i++){const z=st.z[i],x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*12,y=st.y[i]+Math.cos(g.t*p.speed*.8+st.a[i])*10,r=p.size*(.35+.65*z);color(c,p.color);c.globalAlpha=p.opacity*(.2+.65*z);c.fillRect(x,y,r,r);}c.restore();}
function drawAurora(g,p){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let l=0;l<p.amount;l++){const f=l/Math.max(1,p.amount-1),pts=[];for(let i=0;i<=80;i++){const x=i/80,y=g.h*(.2+f*.34)+Math.sin(x*5+g.t*p.speed+l)*g.h*(.045+.06*g.A.b(x));pts.push([x*g.w,y]);}c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineTo(g.w,g.h*.56);c.lineTo(0,g.h*.56);c.closePath();color(c,p.color);c.globalAlpha=p.opacity*(.04+.05*(1-f));c.fill();}c.restore();}
function setAsset(slot,file){if(!file)return;const old=Effects.media[slot];if(old?.url)URL.revokeObjectURL(old.url);const url=URL.createObjectURL(file);const isVideo=file.type.startsWith('video/');const asset=isVideo?document.createElement('video'):new Image();asset.muted=true;asset.loop=true;asset.playsInline=true;const ready=()=>{Effects.media[slot].asset=asset;Effects.media[slot].url=url;Effects.media[slot].type=file.type;Effects.media[slot].enabled=true;Effects.states['media:'+slot]={url,asset,ready:true};if(isVideo)asset.play().catch(()=>{});};asset.onload=ready;asset.onloadeddata=ready;asset.onerror=()=>{Effects.media[slot].enabled=false;};asset.src=url;}
function mountPanel(){const rail=document.querySelector('.rail');if(!rail||document.querySelector('[data-effects-panel]'))return;const box=document.createElement('details');box.className='sec';box.open=true;box.dataset.effectsPanel='';box.innerHTML='<summary>Эффекты и медиа-слои</summary><div class="sec-body effects-panel-body"><label class="effect-select-label">Эффект<select class="effect-select"></select></label><div class="effect-editor"></div><div class="media-divider">Медиа-слои</div><div class="media-editor"></div></div>';rail.appendChild(box);const select=box.querySelector('.effect-select'),editor=box.querySelector('.effect-editor'),media=box.querySelector('.media-editor');for(const id of Object.keys(Effects.items)){const o=document.createElement('option');o.value=id;o.textContent=labels[id];select.appendChild(o);}const render=()=>{const id=select.value,p=Effects.items[id];editor.innerHTML='<div class="effect-head"><label><input type="checkbox" data-key="enabled"> <span>'+labels[id]+'</span></label><select data-key="layer"><option value="back">За EQ</option><option value="front">Перед EQ</option></select></div><div class="effect-controls"><label>Opacity<output data-out="opacity"></output><input type="range" data-key="opacity" min="0" max="1" step=".01"></label><label>Amount<output data-out="amount"></output><input type="range" data-key="amount" min="10" max="900"></label><label>Speed<output data-out="speed"></output><input type="range" data-key="speed" min="0" max="3" step=".01"></label><label>Size<output data-out="size"></output><input type="range" data-key="size" min=".4" max="64" step=".1"></label><label>Color<input type="color" data-key="color"></label></div>';for(const input of editor.querySelectorAll('[data-key]')){const k=input.dataset.key;input.value=p[k];if(input.type==='checkbox')input.checked=p[k];input.addEventListener('input',()=>{p[k]=input.type==='checkbox'?input.checked:input.valueAsNumber||input.value;const out=editor.querySelector('[data-out="'+k+'"]');if(out)out.textContent=typeof p[k]==='number'?p[k].toFixed(2):p[k];Effects.states=Object.create(null);});}for(const out of editor.querySelectorAll('[data-out]'))out.textContent=Number(p[out.dataset.out]).toFixed(2);};select.addEventListener('change',render);render();const mediaRows=[['background','Фон'],['cover','Обложка по центру']];for(const[slot,title]of mediaRows){const m=Effects.media[slot],row=document.createElement('div');row.className='media-row';row.innerHTML='<strong>'+title+'</strong><small>Изображение или видео</small><input type="file" accept="image/*,video/*" data-media-file><label>Видимость <input type="checkbox" data-media-enabled></label><label>Прозрачность <output data-media-out="opacity"></output><input type="range" data-media="opacity" min="0" max="1" step=".01"></label><label>Растяжение<select data-media="fit"><option value="cover">Cover</option><option value="contain">Contain</option><option value="stretch">Stretch</option></select></label>';if(slot==='cover')row.innerHTML+='<div class="cover-controls"><label>X <input type="range" data-media="x" min="0" max="100"></label><label>Y <input type="range" data-media="y" min="0" max="100"></label><label>Ширина <input type="range" data-media="width" min="5" max="100"></label><label>Высота <input type="range" data-media="height" min="5" max="100"></label></div>';for(const el of row.querySelectorAll('[data-media]')){const k=el.dataset.media;el.value=m[k];el.addEventListener('input',()=>{m[k]=el.valueAsNumber||el.value;const o=row.querySelector('[data-media-out="'+k+'"]');if(o)o.textContent=Number(m[k]).toFixed(2);});}row.querySelector('[data-media-enabled]').checked=m.enabled;row.querySelector('[data-media-enabled]').addEventListener('input',e=>m.enabled=e.target.checked);row.querySelector('[data-media-file]').addEventListener('change',e=>setAsset(slot,e.target.files[0]));media.appendChild(row);}}
if(typeof window!=='undefined'){window.__EQ_EFFECTS__=Effects;window.addEventListener('DOMContentLoaded',()=>setTimeout(mountPanel,0));setTimeout(mountPanel,80);}
export { Effects, mountPanel };
