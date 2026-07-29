import { clamp } from './palette.js';

/* ------------------------------------------------------------------
   2. АУДИО-ДВИЖОК
   Лог-полосы, огибающие, AGC, детект бита и BPM, демо-сигнал.
   ------------------------------------------------------------------ */

const BANDS = 160;
const FFT = 4096;

/** Алгоритмы реакции: attack/release + характерная форма. */
const ALGOS = {
  balanced:    { name: 'Balanced Smooth',    a: .38, r: .13, hint: 'Ровная база: быстрый подъём, плавный спад.' },
  bassPunch:   { name: 'Bass Punch',         a: .62, r: .20, tilt: -1.1, hint: 'Низ выведен вперёд и бьёт резче.' },
  beatPulse:   { name: 'Beat Pulse',         a: .70, r: .16, beat: 1.0, hint: 'Всё вспыхивает на детекте бита.' },
  attack:      { name: 'Fast Attack',        a: .96, r: .09, hint: 'Мгновенный отклик, длинный спад.' },
  slowRise:    { name: 'Slow Rise',          a: .08, r: .30, hint: 'Медленный набор, быстрый сброс.' },
  echo:        { name: 'Echo Decay',         a: .45, r: .05, fb: .12, hint: 'Подмешивает прошлый кадр, эхо.' },
  peakHold:    { name: 'Peak Hold',          a: 1, r: .02, hold: .985, hint: 'Держит пики и медленно отпускает.' },
  compressor:  { name: 'Compressor',         a: .45, r: .22, curve: .55, hint: 'Поднимает тихое, жмёт громкое.' },
  expander:    { name: 'Expander',           a: .55, r: .22, curve: 1.9, hint: 'Растягивает динамику, чистит фон.' },
  lowPass:     { name: 'Low Pass',           a: .18, r: .10, tilt: -2.2, hint: 'Только низ и подвал.' },
  highPass:    { name: 'High Pass',           a: .55, r: .22, tilt: 2, hint: 'Только верх и воздух.' },
  midFocus:    { name: 'Mid Focus',          a: .48, r: .18, focus: .42, hint: 'Голос и середина в центре.' },
  trebleSpark: { name: 'Treble Spark',       a: .82, r: .26, tilt: 1.3, hint: 'Хэты и щелчки как искры.' },
  waveFollower:{ name: 'Wave Follower',      a: .32, r: .16, wob: 1, hint: 'Скорость слежения гуляет по спектру.' },
  transient:   { name: 'Transient Detector', a: 1, r: .45, trans: 1, hint: 'Показывает атаки, не тела нот.' },
  cinematic:   { name: 'Cinematic Swell',    a: .07, r: .045, swell: 1, hint: 'Долгие кинематографичные накаты.' },
  quantized:   { name: 'Quantized Steps',    a: .62, r: .30, steps: 7, hint: 'Ступенчатая цифровая реакция.' },
  noiseGate:   { name: 'Noise Gate',         a: .62, r: .30, gate: .13, hint: 'Режет всё тише порога.' },
  rubber:      { name: 'Rubber Motion',      a: .07, r: .07, hint: 'Тягучее резиновое движение.' },
  stereo:      { name: 'Stereo Energy',      a: .42, r: .18, comb: 1, hint: 'Гребёнка по спектру, широкая картинка.' }
};

const Audio = {
  ac: null, an: null, mediaSrc: null, micSrc: null, micStream: null, rate: 48000,
  out: null, sink: null, recordDest: null,
  raw: new Uint8Array(FFT / 2), time: new Uint8Array(2048), bands: new Float32Array(BANDS), prevRaw: new Float32Array(BANDS), peaks: new Float32Array(BANDS), wave: new Float32Array(1024), lo: new Int32Array(BANDS), hi: new Int32Array(BANDS), bandW: new Float32Array(BANDS * 5),
  bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, level: 0, beat: 0, flux: 0, beats: 0, bpm: 0, env: .35, hist: new Float32Array(48), hp: 0, lastBeat: -1, beatTimes: [], t: 0, ready: false, live: false,
  ensure(el) {
    if (this.ac) return this.ac;
    const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC(); this.rate = this.ac.sampleRate; this.an = this.ac.createAnalyser(); this.an.fftSize = FFT; this.an.smoothingTimeConstant = .58; this.raw = new Uint8Array(this.an.frequencyBinCount); this.time = new Uint8Array(this.an.fftSize);
    this.out = this.ac.createGain(); this.out.gain.value = 1; this.out.connect(this.ac.destination); this.recordDest = this.ac.createMediaStreamDestination(); this.out.connect(this.recordDest); this.sink = this.ac.createGain(); this.sink.gain.value = 0; this.an.connect(this.sink); this.sink.connect(this.ac.destination); this.mediaSrc = this.ac.createMediaElementSource(el); this.mediaSrc.connect(this.an); this.mediaSrc.connect(this.out); this.map(); this.ready = true; return this.ac;
  },
  map() { const bins = this.an ? this.an.frequencyBinCount : FFT / 2, nyq = this.rate / 2, fMin = 28, fMax = Math.min(16000, nyq); for (let i = 0; i < BANDS; i++) { const f0 = fMin * Math.pow(fMax / fMin, i / BANDS), f1 = fMin * Math.pow(fMax / fMin, (i + 1) / BANDS); this.lo[i] = clamp(Math.floor(f0 / nyq * bins), 0, bins - 1); this.hi[i] = clamp(Math.max(this.lo[i] + 1, Math.ceil(f1 / nyq * bins)), 1, bins); const fc = (f0 + f1) / 2, w = [Math.exp(-Math.pow(Math.log(fc / 65) / .95, 2)),Math.exp(-Math.pow(Math.log(fc / 260) / .8, 2)),Math.exp(-Math.pow(Math.log(fc / 1100) / .85, 2)),Math.exp(-Math.pow(Math.log(fc / 3600) / .8, 2)),Math.exp(-Math.pow(Math.log(fc / 10000) / .9, 2))], s = w[0] + w[1] + w[2] + w[3] + w[4] || 1; for (let k = 0; k < 5; k++) this.bandW[i * 5 + k] = w[k] / s; } },
  async micOn() { if (!this.ac) throw new Error('AudioContext не инициализирован'); if (!navigator.mediaDevices?.getUserMedia) throw new Error('Доступ к микрофону требует https или localhost'); this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }); this.micSrc = this.ac.createMediaStreamSource(this.micStream); this.micSrc.connect(this.an); if (this.recordDest) this.micSrc.connect(this.recordDest); },
  micOff() { if (this.micSrc) { this.micSrc.disconnect(); this.micSrc = null; } if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; } },
  update(dt, S) { const useLive = this.ready && (S.playing || this.micSrc); this.live = useLive; const g = ALGOS[S.algo] || ALGOS.balanced; if (useLive) { this.an.smoothingTimeConstant = clamp(S.smooth, 0, .95); this.an.getByteFrequencyData(this.raw); this.an.getByteTimeDomainData(this.time); const st = this.time.length / this.wave.length; for (let i = 0; i < this.wave.length; i++) this.wave[i] = (this.time[(i * st) | 0] - 128) / 128; for (let i = 0; i < BANDS; i++) { let m = 0, a = 0, n = 0; for (let j = this.lo[i]; j < this.hi[i]; j++) { const v = this.raw[j]; if (v > m) m = v; a += v; n++; } this.prevRaw[i] = (m * .68 + (n ? a / n : 0) * .32) / 255; } } else if (S.demo) { const t = this.t += dt, bar = (t * 2) % 1, kick = Math.pow(1 - bar, 5), snare = Math.pow(1 - (((t * 2) + .5) % 1), 7) * .7; for (let i = 0; i < BANDS; i++) { const p = i / BANDS; let v = kick * Math.exp(-Math.pow((p - .04) / .09, 2)) * 1.15 + snare * Math.exp(-Math.pow((p - .55) / .30, 2)) + (.34 + .3 * Math.sin(t * 1.7 + p * 9)) * Math.exp(-Math.pow((p - .34) / .18, 2)); this.prevRaw[i] = clamp(v, 0, 1.35); } } else { for (let i = 0; i < BANDS; i++) this.prevRaw[i] *= .9; }
    let mx=0; for(let i=0;i<BANDS;i++) if(this.prevRaw[i]>mx)mx=this.prevRaw[i]; this.env=Math.max(mx,this.env*(1-1.1*dt)); const gain=S.agc?clamp(.88/Math.max(this.env,.06),.75,3.6):1; let lowE=0,flux=0,b1=0,b2=0,b3=0,b4=0,b5=0; const kA=1-Math.pow(1-g.a,dt*60),kR=1-Math.pow(1-g.r,dt*60); for(let i=0;i<BANDS;i++){const p=i/BANDS;let v=this.prevRaw[i]*gain,o=i*5;v*=this.bandW[o]*S.gBass+this.bandW[o+1]*S.gLowMid+this.bandW[o+2]*S.gMid+this.bandW[o+3]*S.gHighMid+this.bandW[o+4]*S.gTreble;if(g.tilt)v*=clamp(1+g.tilt*(p-.45),.05,2.6);if(g.curve)v=Math.pow(clamp(v,0,1.6),g.curve);if(g.focus)v*=.22+1.35*Math.exp(-Math.pow((p-g.focus)/.2,2));if(g.comb)v*=.78+.34*Math.sin(p*26);if(g.gate&&v<g.gate)v=0;if(g.steps)v=Math.round(v*g.steps)/g.steps;if(g.beat)v*=1+this.beat*g.beat*(1-p*.55);if(g.swell)v=v*.55+this.level*.7;const old=this.bands[i];let next;if(g.trans)next=clamp((v-this.peaks[i])*3.2,0,2);else if(g.hold){this.peaks[i]=Math.max(v,this.peaks[i]*Math.pow(g.hold,dt*60));next=this.peaks[i];}else{let k=v>old?kA:kR;if(g.wob)k*=.6+.55*Math.sin(i*.21+this.t*1.7);next=old+(v-old)*clamp(k,.01,1);if(g.fb)next+=old*g.fb*dt*12;}if(!g.hold)this.peaks[i]=Math.max(next,this.peaks[i]-dt*.55);const val=clamp(next,0,1.45);flux+=Math.max(0,val-old);this.bands[i]=val;b1+=val*this.bandW[o];b2+=val*this.bandW[o+1];b3+=val*this.bandW[o+2];b4+=val*this.bandW[o+3];b5+=val*this.bandW[o+4];if(p<.1)lowE+=val;} this.flux=clamp(flux/8,0,1); const nz=BANDS/5; this.bass=clamp(b1/nz*2.6,0,1.4);this.lowMid=clamp(b2/nz*2.6,0,1.4);this.mid=clamp(b3/nz*2.6,0,1.4);this.highMid=clamp(b4/nz*2.6,0,1.4);this.treble=clamp(b5/nz*2.6,0,1.4); this.level=this.level+(clamp(useLive||S.demo?1:0,0,1.4)-this.level)*clamp(dt*9,0,1); lowE/=BANDS*.1; this.hp=(this.hp+1)%this.hist.length;this.hist[this.hp]=lowE;let avg=0;for(let i=0;i<this.hist.length;i++)avg+=this.hist[i];avg/=this.hist.length;this.t+=useLive?dt:0;const now=performance.now()/1000;if(lowE>avg*1.32&&lowE>.12&&now-this.lastBeat>.19){this.lastBeat=now;this.beat=1;this.beats++;this.beatTimes.push(now);if(this.beatTimes.length>12)this.beatTimes.shift();if(this.beatTimes.length>4){const d=(this.beatTimes[this.beatTimes.length-1]-this.beatTimes[0])/(this.beatTimes.length-1);if(d>.2&&d<1.4)this.bpm=Math.round(60/d);}}this.beat=Math.max(0,this.beat-dt*4.2); },
  b(x){const f=clamp(x,0,1)*(BANDS-1),i=f|0,k=f-i,a=this.bands[i],b=this.bands[i+1<BANDS?i+1:i];return a+(b-a)*k;},pk(x){return this.peaks[clamp((x*(BANDS-1))|0,0,BANDS-1)];},w(x){const n=this.wave.length,f=clamp(x,0,1)*(n-1),i=f|0,k=f-i,a=this.wave[i],b=this.wave[i+1<n?i+1:i];return a+(b-a)*k;}
};
export { Audio, ALGOS, BANDS, FFT };
