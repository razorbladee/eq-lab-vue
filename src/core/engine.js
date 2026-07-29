import { Palette, clamp } from './palette.js';
import { Audio } from './audio.js';
import { VIS, VMAP } from './visualizers.js';
import { Effects } from './effects.js';

const drawFallback = (g) => {
  const { ctx, w, h, A } = g;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 2;
  ctx.strokeStyle = g.col(.55);
  ctx.globalAlpha = .9;
  ctx.beginPath();
  for (let i = 0; i <= 160; i++) {
    const x = i / 160;
    const y = h * .5 + A.w(x) * h * .28 + Math.sin(x * 18 + g.t) * A.b(x) * 8;
    i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
};

const Engine = {
  canvas: null, ctx: null, g: null, W: 0, H: 0, DPR: 1, raf: 0, last: 0,
  q: 1, ema: 16, frames: 0, fpsAcc: 0, fps: 60,
  states: Object.create(null), S: null, P: null, onErr: null,
  bgOf: { ink: '#0d0c12', slate: '#141a1f', paper: '#f5f2ec' },
  mount(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }); this.g = { ctx: this.ctx, w: 0, h: 0, cx: 0, cy: 0, t: 0, dt: .016, q: 1, A: Audio, S: null, p: null, st: null, bg: '#0d0c12', col: x => Palette.at(x), rgba: (x,a) => Palette.rgba(x,a), sprite: x => Palette.sprite(x), alpha: a => { this.ctx.globalAlpha = clamp(a,0,1); }, add: () => { this.ctx.globalCompositeOperation = 'lighter'; }, norm: () => { this.ctx.globalCompositeOperation = 'source-over'; this.ctx.globalAlpha = 1; } }; },
  resize() { const c=this.canvas,r=c?.getBoundingClientRect(); if(!c||!r||r.width<2||r.height<2)return; const maxPixels=2.6e6; let dpr=Math.min(window.devicePixelRatio||1,2); const pixels=r.width*r.height*dpr*dpr; if(pixels>maxPixels)dpr*=Math.sqrt(maxPixels/pixels); const width=Math.max(2,Math.round(r.width*dpr)),height=Math.max(2,Math.round(r.height*dpr)); this.DPR=dpr;this.W=r.width;this.H=r.height;this.g.w=r.width;this.g.h=r.height;this.g.cx=r.width/2;this.g.cy=r.height/2; if(c.width===width&&c.height===height)return; c.width=width;c.height=height;this.states=Object.create(null);Effects.states=Object.create(null);Palette.sprites.fill(null);this.paintBg(); },
  paintBg(){const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.fillStyle=this.g.bg;c.fillRect(0,0,this.canvas.width,this.canvas.height);},
  state(id){return this.states[id]||(this.states[id]={});},
  start(){if(this.raf)return;const loop=now=>{this.raf=requestAnimationFrame(loop);const dt=this.last?clamp((now-this.last)/1000,.001,.05):.016;this.last=now;this.tick(dt,now);};this.raf=requestAnimationFrame(loop);},
  stop(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.last=0;},
  tick(dt,now){const S=this.S,P=this.P;if(!S||!this.canvas)return;if(!this.W||!this.H){this.resize();if(!this.W||!this.H)return;}this.ema+=(dt*1000-this.ema)*.08;this.frames++;this.fpsAcc+=dt;if(this.fpsAcc>.5){this.fps=Math.round(this.frames/this.fpsAcc);this.frames=0;this.fpsAcc=0;}if(S.autoQuality){if(this.ema>20.5&&this.q>.42)this.q=Math.max(.42,this.q-.035);else if(this.ema<13.5&&this.q<1)this.q=Math.min(1,this.q+.012);}else this.q=1;Audio.update(dt,S);Palette.build(S.colorMode,S.c1,S.c2,((now*S.cycle*.02)%360)|0);const ctx=this.ctx,W=this.W,H=this.H;const bg=S.canvasBg==='theme'?(document.documentElement.classList.contains('dark')?'#12111a':'#f2efe8'):(this.bgOf[S.canvasBg]||'#0d0c12');this.g.bg=bg;ctx.setTransform(this.DPR,0,0,this.DPR);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=clamp(1-S.trail,.035,1);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;const vis=VMAP[S.preset]||VIS[0],g=this.g;g.dt=dt;g.t+=dt*S.speed;g.q=this.q;g.S=S;g.p=P;g.st=this.state(vis.id);ctx.save();ctx.translate(W/2+(S.posX-50)*W/100,H/2+(S.posY-50)*H/100);ctx.scale(S.zoomW,S.zoomH);ctx.translate(-W/2,-H/2);ctx.lineJoin='round';ctx.lineCap='butt';ctx.lineWidth=1;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='400 12px "Space Mono",ui-monospace,monospace';ctx.imageSmoothingEnabled=true;const safe=(fn,id)=>{try{fn();}catch(error){if(this.onErr)this.onErr(id,error.message||String(error));if(id===vis.id)drawFallback(g);}finally{ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';}};safe(()=>Effects.drawMedia(g,'background'),'background-media');safe(()=>Effects.draw(g,'back'),'background-effects');safe(()=>vis.draw(g),vis.id);safe(()=>Effects.draw(g,'front'),'foreground-effects');safe(()=>Effects.drawMedia(g,'cover'),'cover-media');ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.filter='none';},
};
export { Engine };
