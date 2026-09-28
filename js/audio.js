/* =========================================================
   Sound for Tahu Tak? — everything is synthesised with Web Audio,
   so there are no files to download and nothing to license.

   Music: a calm, generative Malay gamelan — saron / bonang metallophones
   on a slendro-like pentatonic scale (with the gentle "ombak" beating of
   paired, slightly detuned keys), kenong, a big gong at the end of each
   cycle, a bamboo suling that wanders over the top, and kendang hand drums
   when you're driving.
   ========================================================= */
const KEY = 'tahu-tak-sound';
let muted = false;
try { muted = localStorage.getItem(KEY) === 'off'; } catch { /* storage blocked */ }

let ctx = null, master, musicBus, sfxBus, noiseBuf, analyser;
const listeners = new Set();

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  // iOS: treat this as media playback so the ring/silent switch doesn't mute the game (Safari 17+)
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024; comp.connect(analyser); // level meter for checks

  // a little hall for the gamelan to ring in
  const verb = ctx.createConvolver();
  verb.buffer = impulse(2.6);
  verb.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(master);
  const mSend = ctx.createGain(); mSend.gain.value = 0.45; musicBus.connect(mSend).connect(verb);
  const sSend = ctx.createGain(); sSend.gain.value = 0.12; sfxBus.connect(sSend).connect(verb);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  return ctx;
}

function impulse(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

/* ---------- unlocking (browsers only allow audio after a tap/click/key) ---------- */
let wantMusic = null;
function unlock() {
  if (!init()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (wantMusic && !musicTimer) startMusic(wantMusic);
}
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });

/* ---------- building blocks ---------- */
const now = () => ctx.currentTime;
function tone({ freq, type = 'sine', t = now(), a = 0.005, d = 0.3, peak = 0.3, bus = sfxBus, glide = null, detune = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + a + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + a + d + 0.05);
}
function noise({ t = now(), a = 0.003, d = 0.2, peak = 0.3, type = 'bandpass', f = 1000, fEnd = null, q = 1, bus = sfxBus }) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t + a + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  s.connect(fl).connect(g).connect(bus);
  s.start(t, Math.random() * 1.5);
  s.stop(t + a + d + 0.05);
}

/* ---------- gamelan instruments ---------- */
const BASE = 293.66; // D4
const SLENDRO = [1, 1.1487, 1.3195, 1.5157, 1.7411]; // five near-equal steps per octave
const note = (deg, oct = 0) => {
  const i = (((deg - 1) % 5) + 5) % 5, o = Math.floor((deg - 1) / 5) + oct;
  return BASE * SLENDRO[i] * 2 ** o;
};
function metallo(freq, t, vel = 1, bus = musicBus) {
  // two keys tuned a few Hz apart beat against each other — the gamelan shimmer (ombak)
  tone({ freq, t, a: 0.003, d: 1.8, peak: 0.16 * vel, bus });
  tone({ freq: freq + 3.5, t, a: 0.003, d: 1.5, peak: 0.11 * vel, bus });
  tone({ freq: freq * 2.76, t, a: 0.002, d: 0.3, peak: 0.04 * vel, bus }); // inharmonic strike
}
function gong(t, freq = 55) {
  tone({ freq, t, a: 0.03, d: 6, peak: 0.42, bus: musicBus });
  tone({ freq: freq + 1.2, t, a: 0.03, d: 5.5, peak: 0.3, bus: musicBus });
  tone({ freq: freq * 2.01, t, a: 0.02, d: 2.5, peak: 0.07, bus: musicBus });
  tone({ freq: freq * 3.1, t, a: 0.01, d: 0.8, peak: 0.03, bus: musicBus });
}
function kenong(freq, t) {
  tone({ freq, t, a: 0.006, d: 2.2, peak: 0.12, bus: musicBus });
  tone({ freq: freq + 2, t, a: 0.006, d: 2, peak: 0.08, bus: musicBus });
}
function kendang(t, hi, vel = 1) {
  tone({ freq: hi ? 280 : 100, t, a: 0.002, d: hi ? 0.1 : 0.22, peak: (hi ? 0.14 : 0.3) * vel, glide: hi ? 210 : 62, bus: musicBus });
  noise({ t, d: hi ? 0.04 : 0.06, peak: 0.06 * vel, f: hi ? 3000 : 500, bus: musicBus });
}
function suling(freq, t, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 0.985, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.12); // a small scoop up into the note
  lfo.frequency.value = 5.2; lg.gain.value = freq * 0.006;    // breathy vibrato
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.18);
  g.gain.setValueAtTime(0.07, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicBus);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  noise({ t, a: 0.08, d: dur * 0.8, peak: 0.012, f: freq * 2, q: 2, bus: musicBus }); // air
}

/* ---------- the generative piece ---------- */
const STYLES = {
  calm: { bpm: 64, drums: 0, suling: 0.6, bonang: 0.3 },
  drive: { bpm: 92, drums: 1, suling: 0.35, bonang: 0.35 },
  race: { bpm: 122, drums: 2, suling: 0.15, bonang: 0.45 },
};
// balungan (core melody) cycles of 8 beats, as scale degrees; the last beat is the gong tone
const CYCLES = [
  [2, 1, 2, 4, 5, 4, 2, 1], [4, 5, 4, 2, 1, 2, 4, 5], [1, 2, 4, 2, 5, 4, 2, 1],
  [5, 4, 5, 2, 4, 2, 1, 2], [2, 4, 5, 6, 5, 4, 2, 1], [1, 5, 4, 2, 4, 2, 1, 1],
];
let musicTimer = null, style = STYLES.calm, beat = 0, nextBeat = 0, cycle = CYCLES[0], sulingUntil = 0;
function startMusic(name) {
  style = STYLES[name] || STYLES.calm;
  if (musicTimer) return;
  beat = 0;
  nextBeat = now() + 0.15;
  musicTimer = setInterval(scheduleMusic, 90);
}
function scheduleMusic() {
  if (!ctx || ctx.state !== 'running') return;
  if (nextBeat < now() - 0.1) nextBeat = now() + 0.05; // coming back from a paused tab: don't fire the backlog
  while (nextBeat < now() + 0.3) {
    playBeat(beat, nextBeat, 60 / style.bpm);
    nextBeat += 60 / style.bpm;
    beat++;
  }
}
function playBeat(b, t, dur) {
  const step = b % 8;
  if (step === 0 && b % 16 === 0) cycle = CYCLES[Math.floor(Math.random() * CYCLES.length)];
  const deg = cycle[step], next = cycle[(step + 1) % 8];
  metallo(note(deg), t, 0.9);                                        // saron: the core melody
  metallo(note(deg, 1), t + dur / 2, style.bonang);                  // bonang: interlocking, an octave up
  metallo(note(next, 1), t + dur * 0.75, style.bonang * 0.7);
  if (step === 3 || step === 7) kenong(note(deg, -1), t);
  if (step === 7 && b % 16 === 15) gong(t + dur * 0.02);             // big gong closes every other cycle
  if (style.drums) {
    if (step % 4 === 0) kendang(t, false);
    kendang(t + dur / 2, true, 0.8);
    if (style.drums > 1) { kendang(t + dur / 4, true, 0.4); kendang(t + dur * 0.75, true, 0.5); if (step % 2) kendang(t, false, 0.6); }
  }
  if (t > sulingUntil && step % 4 === 0 && Math.random() < style.suling) { // the flute drifts in now and then
    const len = dur * (2 + Math.floor(Math.random() * 3));
    suling(note(cycle[(step + 2) % 8], 1), t, len);
    sulingUntil = t + len;
  }
}

/* ---------- continuous car sounds ---------- */
function loopNoise(filterType, f, q) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  fl.type = filterType; fl.frequency.value = f; fl.Q.value = q;
  g.gain.value = 0;
  s.connect(fl).connect(g).connect(sfxBus);
  s.start();
  return { s, fl, g };
}
function makeEngine(level) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = 'sawtooth'; o2.type = 'square';
  fl.type = 'lowpass'; fl.frequency.value = 400; fl.Q.value = 2;
  g.gain.value = 0;
  o1.connect(fl); o2.connect(fl); fl.connect(g).connect(sfxBus);
  o1.start(); o2.start();
  return { o1, o2, fl, g, level };
}
let eng = null, rivalEng = null, skidN = null;
function setEngine(e, speed, throttle, gainScale = 1) {
  const t = now(), sp = Math.abs(speed);
  const f = 42 + sp * 3.4 + throttle * 6;
  e.o1.frequency.setTargetAtTime(f, t, 0.06);
  e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
  e.fl.frequency.setTargetAtTime(260 + sp * 45 + throttle * 350, t, 0.08);
  e.g.gain.setTargetAtTime((0.035 + sp * 0.0016 + throttle * 0.02) * e.level * gainScale, t, 0.1);
}

/* ---------- public API ---------- */
const ready = () => ctx && ctx.state === 'running';
export const sound = {
  get muted() { return muted; },
  get state() { return ctx ? ctx.state : 'not started'; },
  /** Current output loudness (RMS, 0..1) — handy for checking that something is actually playing. */
  level() { if (!analyser) return 0; const d = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length); },
  setMuted(m) {
    muted = m;
    try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* ignore */ }
    if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
    listeners.forEach((fn) => fn(m));
  },
  toggle() { this.setMuted(!muted); unlock(); },
  onChange(fn) { listeners.add(fn); fn(muted); },

  /** 'calm' on the site, 'drive' in the city, 'race' during races. Starts on the first tap. */
  music(name) {
    wantMusic = name;
    if (ctx && ctx.state !== 'closed') { style = STYLES[name] || style; if (!musicTimer && ctx.state === 'running') startMusic(name); }
  },

  /* ---- UI and quiz ---- */
  click() { if (ready()) tone({ freq: 1400, type: 'triangle', a: 0.002, d: 0.04, peak: 0.08 }); },
  correct() { if (!ready()) return; metallo(note(4, 1), now(), 1.4, sfxBus); metallo(note(1, 2), now() + 0.11, 1.4, sfxBus); },
  wrong() { if (ready()) { tone({ freq: 220, type: 'sawtooth', d: 0.32, peak: 0.12, glide: 130 }); tone({ freq: 110, type: 'sine', d: 0.3, peak: 0.12 }); } },
  coin() { if (!ready()) return; tone({ freq: 988, type: 'square', d: 0.07, peak: 0.07 }); tone({ freq: 1319, type: 'square', t: now() + 0.07, d: 0.16, peak: 0.07 }); },
  reward() { if (!ready()) return; [1, 2, 4, 5, 6].forEach((d, i) => metallo(note(d, 1), now() + i * 0.09, 1.3, sfxBus)); gong(now() + 0.45, 73); },
  fanfare() { if (!ready()) return; [1, 2, 4, 5, 6, 7, 9].forEach((d, i) => metallo(note(d, 1), now() + i * 0.08, 1.4, sfxBus)); gong(now() + 0.6, 55); },
  tick() { if (ready()) tone({ freq: 1760, type: 'sine', a: 0.001, d: 0.05, peak: 0.1 }); },
  hint() { if (ready()) { noise({ d: 0.35, peak: 0.12, f: 600, fEnd: 3200, q: 3 }); metallo(note(5, 1), now() + 0.12, 0.8, sfxBus); } },
  sell() { if (!ready()) return; this.coin(); noise({ t: now() + 0.02, d: 0.12, peak: 0.08, f: 5000, q: 1 }); },
  buy() { if (!ready()) return; tone({ freq: 660, type: 'triangle', d: 0.08, peak: 0.1 }); tone({ freq: 880, type: 'triangle', t: now() + 0.08, d: 0.12, peak: 0.1 }); },

  /* ---- driving ---- */
  beep() { if (ready()) tone({ freq: 660, type: 'square', d: 0.16, peak: 0.1 }); },
  go() { if (ready()) { tone({ freq: 990, type: 'square', d: 0.5, peak: 0.12 }); tone({ freq: 1485, type: 'square', d: 0.5, peak: 0.05 }); } },
  gate() { if (ready()) { metallo(note(5, 1), now(), 1.2, sfxBus); metallo(note(2, 2), now() + 0.07, 1, sfxBus); } },
  chime() { if (ready()) [4, 5, 1].forEach((d, i) => metallo(note(d, i === 2 ? 2 : 1), now() + i * 0.12, 1, sfxBus)); },
  taste() { if (!ready()) return; tone({ freq: 330, type: 'sine', d: 0.25, peak: 0.14, glide: 440 }); this.coin(); },
  bump() { if (ready()) { tone({ freq: 90, d: 0.18, peak: 0.35, glide: 45 }); noise({ d: 0.1, peak: 0.15, type: 'lowpass', f: 900 }); } },
  dent() { if (!ready()) return; noise({ d: 0.35, peak: 0.35, f: 1800, fEnd: 400, q: 0.8 }); tone({ freq: 140, type: 'square', d: 0.2, peak: 0.12, glide: 70 }); tone({ freq: 1200, type: 'triangle', d: 0.25, peak: 0.05, glide: 800 }); },
  explode() { if (!ready()) return; noise({ a: 0.01, d: 1.6, peak: 0.6, type: 'lowpass', f: 2600, fEnd: 120 }); tone({ freq: 70, d: 1.2, peak: 0.5, glide: 30 }); noise({ t: now() + 0.05, d: 0.5, peak: 0.2, f: 4000, fEnd: 800 }); },
  turbo() { if (ready()) { noise({ a: 0.05, d: 0.7, peak: 0.25, f: 400, fEnd: 3500, q: 2 }); tone({ freq: 220, type: 'sawtooth', a: 0.05, d: 0.6, peak: 0.06, glide: 660 }); } },
  respawn() { if (ready()) [1, 4, 5].forEach((d, i) => tone({ freq: note(d, 1), type: 'triangle', t: now() + i * 0.07, d: 0.15, peak: 0.1 })); },
  horn() { if (ready()) { tone({ freq: 415, type: 'square', a: 0.01, d: 0.38, peak: 0.1 }); tone({ freq: 523, type: 'square', a: 0.01, d: 0.38, peak: 0.08 }); } },
  win() { this.fanfare(); },
  lose() { if (ready()) [5, 4, 2, 1].forEach((d, i) => metallo(note(d, 0), now() + i * 0.16, 1.1, sfxBus)); },

  /** Call every frame while driving. `slip` 0..1 drives tyre screech. */
  car(speed, throttle, slip = 0) {
    if (!ready()) return;
    if (!eng) { eng = makeEngine(1); skidN = loopNoise('bandpass', 1700, 4); }
    setEngine(eng, speed, throttle);
    skidN.g.gain.setTargetAtTime(Math.min(1, slip) * 0.22, now(), 0.05);
    skidN.fl.frequency.setTargetAtTime(1500 + Math.abs(speed) * 20, now(), 0.1);
  },
  /** The rival's engine, fading with distance. Pass null to silence it. */
  rival(speed, dist) {
    if (!ready()) return;
    if (!rivalEng) rivalEng = makeEngine(0.8);
    const near = dist == null ? 0 : Math.max(0, 1 - dist / 45);
    setEngine(rivalEng, speed || 0, 0.5, near);
  },
  carStop() {
    if (!ctx) return;
    for (const e of [eng, rivalEng]) if (e) e.g.gain.setTargetAtTime(0, now(), 0.1);
    if (skidN) skidN.g.gain.setTargetAtTime(0, now(), 0.05);
  },
};

/** Wire up any number of mute buttons: they show the state and toggle it. */
export function bindMuteButton(btn) {
  const on = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const off = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>';
  btn.addEventListener('click', () => sound.toggle());
  sound.onChange((m) => {
    btn.innerHTML = m ? off : on;
    btn.setAttribute('aria-pressed', String(!m));
    btn.setAttribute('aria-label', m ? 'Sound off — turn on' : 'Sound on — turn off');
    btn.title = m ? 'Sound off (M)' : 'Sound on (M)';
  });
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat && !(e.target instanceof HTMLInputElement)) sound.toggle(); });
}
