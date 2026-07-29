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
const Effects = {
  items: structuredClone(defaults), states: Object.create(null),
  reset() { this.items = structuredClone(defaults); this.states = Object.create(null); },
  draw(g, phase) {
    const ctx = g.ctx;
    for (const [id, p] of Object.entries(this.items)) {
      if (!p.enabled || p.layer !== phase) continue;
      const n = Math.round(clamp(p.amount * g.q, 0, 900));
      const st = this.states[id] || (this.states[id] = { seeded: false, x: [], y: [], z: [], a: [] });
      if (id === 'aurora') drawAurora(g, p); else {
        if (!st.seeded || st.x.length !== n) seed(st, n, g.w, g.h);
        if (id === 'snow') drawSnow(g, p, st, n);
        if (id === 'rain') drawRain(g, p, st, n);
        if (id === 'bokeh') drawBokeh(g, p, st, n);
        if (id === 'fireflies') drawFireflies(g, p, st, n);
        if (id === 'dust') drawDust(g, p, st, n);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
};
function seed(st, n, w, h) { st.x.length = st.y.length = st.z.length = st.a.length = n; for (let i=0;i<n;i++){st.x[i]=Math.random()*w;st.y[i]=Math.random()*h;st.z[i]=.25+Math.random()*.75;st.a[i]=Math.random()*TAU;} st.seeded=true; }
function color(ctx, hex) { ctx.fillStyle = hex; ctx.strokeStyle = hex; }
function drawSnow(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],r=p.size*z*(.55+.45*Math.sin(g.t*p.speed+st.a[i])),wind=Math.sin(g.t*.35+st.a[i])*10;st.y[i]+=g.dt*p.speed*(18+52*z);st.x[i]+=g.dt*(wind+5);if(st.y[i]>g.h+8){st.y[i]=-8;st.x[i]=Math.random()*g.w;}if(st.x[i]>g.w+8)st.x[i]=-8;color(c,p.color);c.globalAlpha=p.opacity*(.25+.75*z);c.beginPath();c.arc(st.x[i],st.y[i],Math.max(.5,r),0,TAU);c.fill();}c.restore();}
function drawRain(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';c.lineCap='round';for(let i=0;i<n;i++){const z=st.z[i],len=p.size*(12+36*z);st.y[i]+=g.dt*p.speed*(180+260*z);st.x[i]+=g.dt*p.speed*24;if(st.y[i]>g.h+len){st.y[i]=-len;st.x[i]=Math.random()*g.w;}color(c,p.color);c.globalAlpha=p.opacity*(.18+.7*z);c.lineWidth=Math.max(.45,p.size*z);c.beginPath();c.moveTo(st.x[i],st.y[i]);c.lineTo(st.x[i]-p.size*2,st.y[i]-len);c.stroke();}c.restore();}
function drawBokeh(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],r=p.size*(.35+.9*z),x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*18;st.y[i]-=g.dt*p.speed*(4+12*z);if(st.y[i]<-r){st.y[i]=g.h+r;st.x[i]=Math.random()*g.w;}color(c,p.color);c.globalAlpha=p.opacity*(.08+.26*z);c.beginPath();c.arc(x,st.y[i],r,0,TAU);c.fill();c.globalAlpha*=.8;c.lineWidth=1; c.beginPath();c.arc(x,st.y[i],r*.78,0,TAU);c.stroke();}c.restore();}
function drawFireflies(g,p,st,n){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const z=st.z[i],x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*22,y=st.y[i]+Math.cos(g.t*p.speed*.7+st.a[i])*18,r=p.size*(.45+.8*z),pulse=.3+.7*(.5+.5*Math.sin(g.t*3+st.a[i]));color(c,p.color);c.globalAlpha=p.opacity*pulse*(.25+.6*z);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}c.restore();}
function drawDust(g,p,st,n){const c=g.ctx;c.save();for(let i=0;i<n;i++){const z=st.z[i],x=st.x[i]+Math.sin(g.t*p.speed+st.a[i])*12,y=st.y[i]+Math.cos(g.t*p.speed*.8+st.a[i])*10,r=p.size*(.35+.65*z);color(c,p.color);c.globalAlpha=p.opacity*(.2+.65*z);c.fillRect(x,y,r,r);}c.restore();}
function drawAurora(g,p){const c=g.ctx;c.save();c.globalCompositeOperation='lighter';for(let l=0;l<p.amount;l++){const f=l/Math.max(1,p.amount-1),pts=[];for(let i=0;i<=80;i++){const x=i/80,y=g.h*(.2+f*.34)+Math.sin(x*5+g.t*p.speed+l)*g.h*(.045+.06*g.A.b(x));pts.push([x*g.w,y]);}c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineTo(g.w,g.h*.56);c.lineTo(0,g.h*.56);c.closePath();color(c,p.color);c.globalAlpha=p.opacity*(.04+.05*(1-f));c.fill();}c.restore();}
function mountPanel(){const rail=document.querySelector('.rail');if(!rail||document.querySelector('[data-effects-panel]'))return;const box=document.createElement('details');box.className='sec';box.open=true;box.dataset.effectsPanel='';box.innerHTML='<summary>Эффекты · фоновые слои</summary><div class="sec-body effects-panel-body"><p class="effects-note">Отдельные слои, ограничены adaptive quality. Включай несколько сразу.</p><div class="effects-list"></div></div>';const list=box.querySelector('.effects-list');for(const [id,p] of Object.entries(Effects.items)){const row=document.createElement('div');row.className='effect-row';row.innerHTML='<div class="effect-head"><label><input type="checkbox" data-key="enabled"> <span>'+labels[id]+'</span></label><select data-key="layer" aria-label="Layer"><option value="back">За EQ</option><option value="front">Перед EQ</option></select></div><div class="effect-controls"><label>Opacity <output data-out="opacity"></output><input type="range" data-key="opacity" min="0" max="1" step=".01"></label><label>Amount <output data-out="amount"></output><input type="range" data-key="amount" min="10" max="900" step="1"></label><label>Speed <output data-out="speed"></output><input type="range" data-key="speed" min="0" max="3" step=".01"></label><label>Size <output data-out="size"></output><input type="range" data-key="size" min=".4" max="64" step=".1"></label><label>Color <input type="color" data-key="color"></label></div>';for(const input of row.querySelectorAll('[data-key]')){const k=input.dataset.key;input.value=p[k];if(input.type==='checkbox')input.checked=p[k];input.addEventListener('input',()=>{p[k]=input.type==='checkbox'?input.checked:input.valueAsNumber||input.value;const out=row.querySelector('[data-out="'+k+'"]');if(out)out.textContent=typeof p[k]==='number'?p[k].toFixed(2):p[k];Effects.states=Object.create(null);});}for(const out of row.querySelectorAll('[data-out]')){const k=out.dataset.out;out.textContent=typeof p[k]==='number'?p[k].toFixed(2):p[k];}list.appendChild(row);}rail.appendChild(box);}
if(typeof window!=='undefined'){window.__EQ_EFFECTS__=Effects;window.addEventListener('DOMContentLoaded',()=>setTimeout(mountPanel,0));setTimeout(mountPanel,80);}
export { Effects, mountPanel };
