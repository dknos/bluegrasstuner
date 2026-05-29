// knurl-processor.js
// AudioWorklet: KNURL — physical-modeling groovebox.
//
// ONE worklet hosts EVERYTHING: 8 drum voices, a sample-accurate step transport,
// a per-step parameter-lock queue, and a master finishing bus (saturation +
// soft-knee limiter + plate reverb send). Nothing about timing touches the main
// thread, so the groove never jitters under React re-renders / GC / tab throttle.
//
// Sound design (the bet — validated offline before any UI existed):
//   • KickVoice  — sine + exponential pitch-envelope + click transient + tanh drive.
//                  The 808/909 recipe. A banded resonator goes thin in the sub, so
//                  the kick is NOT modal.
//   • ModalVoice — noise/click exciter -> bank of 6 fixed-frequency 2-pole resonators
//                  (struck body) + optional direct noise (snare buzz / clap). Mode
//                  freqs are computed once per hit and never modulated per-sample, so
//                  the cheap stable resonator (y=2r·cosω·y1 − r²·y2 + (1−r²)x) can't
//                  blow up. A MATERIAL axis morphs between a warm (skin/wood) and a
//                  bright (metal/bell) mode table at trigger time.
//
// Both share a one-pole tone LP (unconditionally stable under live modulation),
// per-voice tanh drive, pan and level. Denormal flush on every recursive state.

const NUM_TRACKS = 8;
const NUM_STEPS = 16;
const NMODES = 6;
const SILENCE = 1e-7;

// ── material mode tables (ratio, gain, decay-scale) ──────────────────────────
// Higher modes are quieter and die faster (natural percussive rolloff). MATERIAL
// 0 = MAT_A (warm, membrane/wood), 1 = MAT_B (bright, metal/bell). Lerped per hit.
const MAT_A = {
  ratio: [1.0, 1.59, 2.30, 2.92, 3.50, 4.20],
  gain:  [1.0, 0.55, 0.38, 0.26, 0.16, 0.10],
  dec:   [1.0, 0.62, 0.44, 0.32, 0.22, 0.15],
};
const MAT_B = {
  ratio: [1.0, 1.83, 2.67, 3.55, 4.61, 5.91],
  gain:  [1.0, 0.78, 0.66, 0.55, 0.44, 0.34],
  dec:   [1.0, 0.90, 0.82, 0.74, 0.64, 0.52],
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// master headroom: voices peak ≈1.0 each; up to ~3 stack on a dense step, so scale
// the dry bus so it lands near unity at Drive=1 (clean) and Drive pushes glue above.
const MASTER_HEADROOM = 0.42;
// soft-clip: linear below 0.75, smooth ceiling toward ±1 — transparent on body,
// catches transient overshoot the limiter's attack misses, guarantees no overflow.
function softclip(x) {
  const t = 0.75, a = x < 0 ? -x : x;
  if (a <= t) return x;
  return (x < 0 ? -1 : 1) * (t + (1 - t) * Math.tanh((a - t) / (1 - t)));
}

// ── kick voice: sine + pitch env + click + drive ─────────────────────────────
class KickVoice {
  constructor(sr) {
    this.sr = sr;
    this.active = false;
    this.phase = 0;
    this.f0 = 50;
    this.fSweep = 0;       // current extra Hz above f0 (decays to 0)
    this.pitchCoef = 0;
    this.amp = 0;
    this.ampCoef = 0;
    this.drive = 1;
    this.clickLeft = 0;
    this.clickAmt = 0;
    this.panL = 0.707;
    this.panR = 0.707;
  }

  // freq Hz, T60 decay s, click 0..1, drive >=1, vel 0..1
  trigger(freq, T60, click, drive, vel, pan) {
    this.active = true;
    this.phase = 0;
    this.f0 = clamp(freq, 20, 400);
    this.fSweep = 140 + click * 220;                 // punch: start this many Hz higher
    this.pitchCoef = Math.exp(-1 / (this.sr * (0.012 + click * 0.02)));
    this.amp = vel;
    this.ampCoef = Math.exp(-6.9078 / (Math.max(0.04, T60) * this.sr));
    this.drive = drive;
    this.clickAmt = click * vel;
    this.clickLeft = Math.floor(this.sr * 0.004);
    const p = (clamp(pan, -1, 1) + 1) / 2;
    this.panL = Math.cos(p * Math.PI / 2);
    this.panR = Math.sin(p * Math.PI / 2);
  }

  step() {
    if (!this.active) return 0;
    const f = this.f0 + this.fSweep;
    this.fSweep *= this.pitchCoef;
    this.phase += (2 * Math.PI * f) / this.sr;
    if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
    let s = Math.sin(this.phase) * this.amp;
    if (this.clickLeft > 0) {
      const c = this.clickLeft / (this.sr * 0.004);
      s += (Math.random() * 2 - 1) * this.clickAmt * c * c;
      this.clickLeft--;
    }
    this.amp *= this.ampCoef;
    if (this.amp < SILENCE && this.clickLeft <= 0) this.active = false;
    return Math.tanh(this.drive * s);
  }
}

// ── modal voice: exciter -> 6 fixed-freq resonators + direct noise ───────────
class ModalVoice {
  constructor(sr) {
    this.sr = sr;
    this.active = false;
    this.y1 = new Float32Array(NMODES);
    this.y2 = new Float32Array(NMODES);
    this.a1 = new Float32Array(NMODES);
    this.a2 = new Float32Array(NMODES);
    this.mg = new Float32Array(NMODES);   // per-mode gain
    this.excLeft = 0;
    this.excLen = 1;
    this.excLp = 0;
    this.excCut = 0.5;
    this.noiseLeft = 0;
    this.noiseLen = 1;
    this.noiseAmt = 0;
    this.drive = 1;
    this.toneLp = 0;
    this.toneCut = 1;     // one-pole LP coefficient 0..1 (1 = open)
    this.out = 0;
    this.vel = 0;
    this.panL = 0.707;
    this.panR = 0.707;
  }

  // freq, T60, material 0..1, snap 0..1 (mallet hardness), noise 0..1,
  // tone 0..1 (LP), drive, vel, pan
  trigger(freq, T60, material, snap, noise, tone, drive, vel, pan) {
    this.active = true;
    const dec = Math.max(0.03, T60);
    for (let i = 0; i < NMODES; i++) {
      const ratio = lerp(MAT_A.ratio[i], MAT_B.ratio[i], material);
      const g = lerp(MAT_A.gain[i], MAT_B.gain[i], material);
      const ds = lerp(MAT_A.dec[i], MAT_B.dec[i], material);
      let f = freq * ratio;
      if (f > this.sr * 0.49) f = this.sr * 0.49;      // anti-explosion above Nyquist
      const w = (2 * Math.PI * f) / this.sr;
      // r from per-mode T60 (higher modes decay faster via ds)
      const r = Math.exp(-6.9078 / (dec * ds * this.sr));
      this.a1[i] = 2 * r * Math.cos(w);
      this.a2[i] = r * r;
      // input gain = g·sin(ω): flattens the resonator's 1/sin(ω) peak across
      // frequency so low modes don't boom and long-decay bodies aren't quiet.
      this.mg[i] = g * Math.sin(w);
      this.y1[i] = 0;
      this.y2[i] = 0;
    }
    // exciter: shorter + brighter when snap is high (hard mallet -> click)
    this.excLen = Math.max(1, Math.floor(this.sr * (0.0006 + (1 - snap) * 0.006)));
    this.excLeft = this.excLen;
    this.excCut = 0.08 + snap * 0.9;                   // one-pole LP coeff for the burst
    this.excLp = 0;
    // direct noise burst (snare wires / clap body)
    this.noiseLen = Math.max(1, Math.floor(this.sr * (0.01 + noise * 0.06)));
    this.noiseLeft = noise > 0.001 ? this.noiseLen : 0;
    this.noiseAmt = noise;
    this.toneCut = 0.02 + tone * 0.98;
    this.toneLp = 0;
    this.drive = drive;
    this.vel = vel;
    const p = (clamp(pan, -1, 1) + 1) / 2;
    this.panL = Math.cos(p * Math.PI / 2);
    this.panR = Math.sin(p * Math.PI / 2);
  }

  step() {
    if (!this.active) return 0;
    // exciter sample (noise burst, linearly faded, one-pole lowpassed by snap)
    let x = 0;
    if (this.excLeft > 0) {
      const env = this.excLeft / this.excLen;
      const nz = (Math.random() * 2 - 1) * env * this.vel;
      this.excLp += this.excCut * (nz - this.excLp);
      x = this.excLp;
      this.excLeft--;
    }
    // resonator bank
    let y = 0;
    for (let i = 0; i < NMODES; i++) {
      let v = this.a1[i] * this.y1[i] - this.a2[i] * this.y2[i] + this.mg[i] * x;
      if (v < 1e-20 && v > -1e-20) v = 0;             // denormal flush
      this.y2[i] = this.y1[i];
      this.y1[i] = v;
      y += v;
    }
    // direct noise (added pre-drive so saturation shapes it too)
    if (this.noiseLeft > 0) {
      const ne = this.noiseLeft / this.noiseLen;
      y += (Math.random() * 2 - 1) * ne * ne * this.noiseAmt * this.vel * 1.2;
      this.noiseLeft--;
    }
    y = Math.tanh(this.drive * y);
    // one-pole tone LP (stable under any live cutoff change)
    this.toneLp += this.toneCut * (y - this.toneLp);
    const o = this.toneLp;
    // idle when exciter is done and the body has rung out
    if (this.excLeft <= 0 && this.noiseLeft <= 0) {
      let e = 0;
      for (let i = 0; i < NMODES; i++) { const a = this.y1[i]; e += a < 0 ? -a : a; }
      if (e < SILENCE && (o < SILENCE && o > -SILENCE)) this.active = false;
    }
    return o;
  }
}

// ── compact plate reverb (Schroeder: 4 combs + 2 allpass), shared send ───────
class Plate {
  constructor(sr) {
    const scale = sr / 44100;
    this.combs = [1116, 1188, 1277, 1356].map((d) => ({
      buf: new Float32Array(Math.max(1, Math.round(d * scale))), i: 0, lp: 0,
    }));
    this.aps = [556, 441].map((d) => ({
      buf: new Float32Array(Math.max(1, Math.round(d * scale))), i: 0,
    }));
    this.fb = 0.78;
    this.damp = 0.28;
  }
  step(x) {
    let out = 0;
    for (let c = 0; c < this.combs.length; c++) {
      const cm = this.combs[c];
      const y = cm.buf[cm.i];
      cm.lp = y * (1 - this.damp) + cm.lp * this.damp;
      if (cm.lp < 1e-20 && cm.lp > -1e-20) cm.lp = 0;
      cm.buf[cm.i] = x + cm.lp * this.fb;
      cm.i = cm.i + 1 >= cm.buf.length ? 0 : cm.i + 1;
      out += y;
    }
    out *= 0.25;
    for (let a = 0; a < this.aps.length; a++) {
      const ap = this.aps[a];
      const bufed = ap.buf[ap.i];
      const y = -out + bufed;
      ap.buf[ap.i] = out + bufed * 0.5;
      ap.i = ap.i + 1 >= ap.buf.length ? 0 : ap.i + 1;
      out = y;
    }
    return out;
  }
}

class KnurlProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    const sr = sampleRate;
    this.sr = sr;
    this.kick = new KickVoice(sr);
    this.modal = [];
    for (let i = 0; i < NUM_TRACKS - 1; i++) this.modal.push(new ModalVoice(sr));
    this.plate = new Plate(sr);

    // per-track sound-design params (control rate). track 0 = kick.
    this.tracks = [];
    for (let t = 0; t < NUM_TRACKS; t++) {
      this.tracks.push({
        freq: 60, decay: 0.5, material: 0.3, snap: 0.6, noise: 0,
        tone: 0.8, drive: 1.2, level: 0.9, pan: 0, send: 0,
      });
    }
    // pattern: per track on/vel/prob + parameter locks
    this.pattern = [];
    for (let t = 0; t < NUM_TRACKS; t++) {
      this.pattern.push({
        on: new Uint8Array(NUM_STEPS),
        vel: new Float32Array(NUM_STEPS).fill(1),
        prob: new Float32Array(NUM_STEPS).fill(1),
        locks: null, // {paramName: Float32Array, ...} or null
      });
    }

    // transport
    this.playing = false;
    this.bpm = 96;
    this.swing = 0;
    this.numSteps = NUM_STEPS;
    this.step = 0;
    this.toNext = 0;        // fractional samples to next step boundary
    this.lastPostedStep = -1;
    // externally-scheduled triggers (Strudel bridge): {time, index, vel, freq}
    // fired at the exact sample offset when the worklet clock reaches `time`.
    this.sched = [];

    // master
    this.masterGain = 0.9; this.masterGainT = 0.9;
    this.masterDrive = 1.0; this.masterDriveT = 1.0;
    this.reverb = 0.18; this.reverbT = 0.18;
    this.limGain = 1;
    this.energy = new Float32Array(NUM_TRACKS);   // for the strike-field visualizer
    this.framesSincePost = 0;

    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  stepLenSamples(i) {
    const base = (this.sr * 60) / this.bpm / 4;   // one 16th note (fractional)
    const sw = this.swing * 0.34;                  // up to ~triplet feel
    return (i & 1) === 0 ? base * (1 + sw) : base * (1 - sw);
  }

  fireStep(i) {
    for (let t = 0; t < NUM_TRACKS; t++) {
      const p = this.pattern[t];
      if (!p.on[i]) continue;
      if (p.prob[i] < 1 && Math.random() > p.prob[i]) continue;
      const tr = this.tracks[t];
      const L = p.locks;
      // parameter locks override the track value for this step only
      const gp = (name, base) => (L && L[name] && !Number.isNaN(L[name][i]) && L[name][i] >= 0 ? L[name][i] : base);
      const vel = p.vel[i] * tr.level;
      const freq = gp('freq', tr.freq);
      const decay = gp('decay', tr.decay);
      const material = gp('material', tr.material);
      const drive = gp('drive', tr.drive);
      if (t === 0) {
        this.kick.trigger(freq, decay, gp('snap', tr.snap), drive, vel, tr.pan);
      } else {
        this.modal[t - 1].trigger(freq, decay, material, gp('snap', tr.snap),
          tr.noise, gp('tone', tr.tone), drive, vel, tr.pan);
      }
      this.energy[t] = Math.min(1, this.energy[t] + vel);
    }
  }

  onMessage(m) {
    switch (m.type) {
      case 'transport':
        if (m.playing !== undefined) {
          if (m.playing && !this.playing) { this.step = 0; this.toNext = 0; this.lastPostedStep = -1; }
          this.playing = m.playing;
          if (!m.playing) this.port.postMessage({ type: 'step', step: -1 });
        }
        if (m.bpm !== undefined) this.bpm = clamp(m.bpm, 20, 300);
        if (m.swing !== undefined) this.swing = clamp(m.swing, 0, 1);
        break;
      case 'tracks':
        // full track-param array
        for (let t = 0; t < m.tracks.length && t < NUM_TRACKS; t++) {
          Object.assign(this.tracks[t], m.tracks[t]);
        }
        break;
      case 'track':
        // single track param update {index, params}
        if (this.tracks[m.index]) Object.assign(this.tracks[m.index], m.params);
        break;
      case 'pattern':
        for (let t = 0; t < NUM_TRACKS; t++) {
          const src = m.pattern[t];
          if (!src) continue;
          const dst = this.pattern[t];
          dst.on.set(src.on);
          dst.vel.set(src.vel);
          dst.prob.set(src.prob);
          dst.locks = src.locks || null;
        }
        break;
      case 'master':
        if (m.gain !== undefined) this.masterGainT = m.gain;
        if (m.drive !== undefined) this.masterDriveT = m.drive;
        if (m.reverb !== undefined) this.reverbT = m.reverb;
        break;
      case 'trigger':
        // audition a single track now (UI tap), respects current params
        this.auditionStep(m.index, m.vel ?? 1);
        break;
      case 'triggerAt':
        // schedule a trigger at absolute ctx time `m.time` (Strudel bridge).
        if (this.tracks[m.index]) {
          this.sched.push({ time: m.time, index: m.index, vel: m.vel ?? 1, freq: m.freq || 0 });
          if (this.sched.length > 256) this.sched.shift(); // runaway guard
        }
        break;
    }
  }

  // fire one track now, optional freq override (Hz; 0 = use track tuning)
  triggerVoice(t, vel, freq) {
    const tr = this.tracks[t];
    if (!tr) return;
    const f = freq && freq > 0 ? freq : tr.freq;
    if (t === 0) this.kick.trigger(f, tr.decay, tr.snap, tr.drive, vel * tr.level, tr.pan);
    else this.modal[t - 1].trigger(f, tr.decay, tr.material, tr.snap, tr.noise, tr.tone, tr.drive, vel * tr.level, tr.pan);
    this.energy[t] = Math.min(1, this.energy[t] + vel);
  }

  auditionStep(t, vel) { this.triggerVoice(t, vel, 0); }

  process(_inputs, outputs) {
    const out = outputs[0];
    const outL = out[0];
    const outR = out[1] || out[0];
    const n = outL.length;

    // collect externally-scheduled (Strudel) triggers due this quantum, by sample offset
    let due = null, di = 0;
    if (this.sched.length) {
      const t0 = currentTime, tEnd = t0 + n / this.sr;
      due = [];
      for (let i = this.sched.length - 1; i >= 0; i--) {
        const ev = this.sched[i];
        if (ev.time < tEnd) {
          let off = Math.round((ev.time - t0) * this.sr);
          if (off < 0) off = 0; else if (off >= n) off = n - 1;
          due.push({ off, index: ev.index, vel: ev.vel, freq: ev.freq });
          this.sched.splice(i, 1);
        }
      }
      if (due.length) due.sort((a, b) => a.off - b.off); else due = null;
    }

    for (let s = 0; s < n; s++) {
      if (due) { while (di < due.length && due[di].off === s) { this.triggerVoice(due[di].index, due[di].vel, due[di].freq); di++; } }
      // smooth master params
      this.masterGain += (this.masterGainT - this.masterGain) * 0.002;
      this.masterDrive += (this.masterDriveT - this.masterDrive) * 0.002;
      this.reverb += (this.reverbT - this.reverb) * 0.002;

      // transport: fire steps at exact sample offset, carry fractional remainder
      if (this.playing) {
        this.toNext -= 1;
        if (this.toNext <= 0) {
          this.fireStep(this.step);
          this.toNext += this.stepLenSamples(this.step);
          this.lastPostedStep = this.step;
          this.step = (this.step + 1) % this.numSteps;
        }
      }

      // sum voices + reverb send
      let dryL = 0, dryR = 0, sendSum = 0;
      const ks = this.kick.step();
      dryL += ks * this.kick.panL; dryR += ks * this.kick.panR;
      sendSum += ks * this.tracks[0].send;
      for (let t = 1; t < NUM_TRACKS; t++) {
        const v = this.modal[t - 1];
        const o = v.step();
        dryL += o * v.panL; dryR += o * v.panR;
        sendSum += o * this.tracks[t].send;
      }

      const rev = this.plate.step(sendSum);
      // headroom -> Drive (clean at 1, crossfade tanh glue above) -> makeup
      let l = (dryL + rev * this.reverb) * MASTER_HEADROOM;
      let r = (dryR + rev * this.reverb * 0.92) * MASTER_HEADROOM;
      const sat = this.masterDrive - 1;
      if (sat > 0.001) {
        const mix = sat < 1 ? sat : 1;
        l = l * (1 - mix) + Math.tanh(this.masterDrive * l) * mix;
        r = r * (1 - mix) + Math.tanh(this.masterDrive * r) * mix;
      }
      l *= this.masterGain;
      r *= this.masterGain;

      // soft-knee peak limiter (smooths sustained peaks) then soft-clip ceiling
      const peak = Math.max(l < 0 ? -l : l, r < 0 ? -r : r);
      const thr = 0.96;
      if (peak > thr) this.limGain += (thr / peak - this.limGain) * 0.4;  // fast attack
      else this.limGain += (1 - this.limGain) * 0.0008;                    // slow release
      outL[s] = softclip(l * this.limGain);
      outR[s] = softclip(r * this.limGain);
    }

    // throttled posts (~21fps): playhead step + per-track strike energy for the visualizer
    if (++this.framesSincePost >= 8) {
      const e = new Array(NUM_TRACKS);
      for (let t = 0; t < NUM_TRACKS; t++) { e[t] = this.energy[t]; this.energy[t] *= 0.45; }
      this.port.postMessage({ type: 'meter', energy: e, step: this.playing ? this.lastPostedStep : -1 });
      this.framesSincePost = 0;
    }
    return true;
  }
}

registerProcessor('knurl', KnurlProcessor);
