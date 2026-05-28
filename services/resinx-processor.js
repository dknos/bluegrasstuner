// resinx-processor.js
// AudioWorklet: RESINX — microtonal resonator + polyphonic Karplus-Strong synth.
//
// ONE worklet, two voice types:
//   • Voice       — the 6-voice tuned-comb resonator bank (MODAL, unchanged behavior).
//   • StringVoice — a polyphonic plucked-string pool (SYMPATHETIC), allocated per note.
// In SYMPATHETIC mode the summed string output also excites the resonator bank every
// sample, so playing a note blooms the microtonal resonators = sympathetic resonance.
//
// Why a worklet at all: a native Web Audio DelayNode inside a feedback cycle is
// spec-clamped to a 128-sample minimum delay (~344Hz floor). A played C5 (~92 samples)
// or any resonator above that pitch would collapse. A sample-accurate fractional-delay
// comb has no floor, so every microtonal degree and every played note tunes true.

const NUM_VOICES = 6;        // resonator bank
const NUM_STRINGS = 16;      // preallocated poly voices (active count = polyphony)
const RES_MAX_DELAY_SEC = 2; // resonator buffer (low fundamentals need long delay)
const STR_MAX_DELAY_SEC = 0.13; // string buffer; ~10Hz floor, far cheaper than 2s

// ---- resonator voice (input-driven comb) — behavior unchanged; added denormal flush.
class Voice {
  constructor(sr) {
    this.size = Math.ceil(sr * RES_MAX_DELAY_SEC);
    this.buf = new Float32Array(this.size);
    this.w = 0;
    this.delay = sr / 220;
    this.fb = 0.9;
    this.damp = 0.5;
    this.gain = 1;
    this.panL = 0.707;
    this.panR = 0.707;
    this.enabled = true;
    this.lp = 0;
    this.dcX = 0;
    this.dcY = 0;
  }

  readFrac(d) {
    let rp = this.w - d;
    while (rp < 0) rp += this.size;
    const i = rp | 0;
    const f = rp - i;
    const a = this.buf[i];
    const b = this.buf[i + 1 >= this.size ? 0 : i + 1];
    return a + f * (b - a);
  }

  step(input) {
    if (!this.enabled) return 0;
    const s = this.readFrac(this.delay);
    this.lp += this.damp * (s - this.lp);
    if (this.lp < 1e-20 && this.lp > -1e-20) this.lp = 0; // denormal flush
    const y = this.lp - this.dcX + 0.995 * this.dcY;
    this.dcX = this.lp;
    this.dcY = y;
    let fbv = y * this.fb;
    if (fbv > 4) fbv = 4; else if (fbv < -4) fbv = -4;
    if (fbv < 1e-20 && fbv > -1e-20) fbv = 0; // denormal flush
    this.buf[this.w] = input + fbv;
    this.w = this.w + 1 >= this.size ? 0 : this.w + 1;
    return s * this.gain;
  }
}

// ---- poly plucked-string voice (init-buffer Karplus-Strong + amp envelope).
class StringVoice {
  constructor(sr) {
    this.sr = sr;
    this.size = Math.ceil(sr * STR_MAX_DELAY_SEC);
    this.buf = new Float32Array(this.size);
    this.w = 0;
    this.delay = sr / 220;
    this.fb = 0.99;
    this.damp = 0.5;
    this.lp = 0;
    this.dcX = 0;
    this.dcY = 0;
    this.envStage = 'idle'; // idle | attack | sustain | release
    this.envLevel = 0;
    this.attackInc = 0;
    this.relCoef = 0;
    this.id = -1;
    this.age = 0;
    this.panL = 0.707;
    this.panR = 0.707;
  }

  readFrac(d) {
    let rp = this.w - d;
    while (rp < 0) rp += this.size;
    const i = rp | 0;
    const f = rp - i;
    const a = this.buf[i];
    const b = this.buf[i + 1 >= this.size ? 0 : i + 1];
    return a + f * (b - a);
  }

  noteOn(id, freq, vel, T60, brightness, attackSec, releaseSec, pan) {
    const period = 1 / freq;
    this.delay = Math.max(2, Math.min(this.size - 2, this.sr / freq));
    this.fb = Math.min(0.9999, Math.pow(10, (-3 * period) / T60));
    this.damp = 0.05 + 0.95 * brightness;
    this.w = 0;
    this.lp = 0;
    this.dcX = 0;
    this.dcY = 0;
    for (let i = 0; i < this.size; i++) this.buf[i] = 0; // clear stolen-voice tail
    let prev = 0;
    const L = Math.min(Math.ceil(this.delay) + 1, this.size);
    for (let i = 0; i < L; i++) {
      const nz = (Math.random() * 2 - 1) * vel;
      prev = prev + brightness * (nz - prev); // pluck-tone pre-lowpass
      this.buf[i] = prev;
    }
    // park the write head just past the noise so the first reads (at w-delay)
    // land inside the excitation, not in the zeroed tail of the long buffer.
    this.w = Math.ceil(this.delay) % this.size;
    this.attackInc = 1 / (Math.max(0.0005, attackSec) * this.sr);
    this.relCoef = Math.exp(-1 / (Math.max(0.005, releaseSec) * this.sr));
    this.envStage = 'attack';
    this.envLevel = 0;
    this.id = id;
    const p = (Math.max(-1, Math.min(1, pan)) + 1) / 2;
    this.panL = Math.cos(p * Math.PI / 2);
    this.panR = Math.sin(p * Math.PI / 2);
  }

  release() {
    if (this.envStage !== 'idle') this.envStage = 'release';
  }

  step() {
    if (this.envStage === 'idle') return 0;
    const s = this.readFrac(this.delay);
    this.lp += this.damp * (s - this.lp);
    if (this.lp < 1e-20 && this.lp > -1e-20) this.lp = 0;
    const y = this.lp - this.dcX + 0.995 * this.dcY;
    this.dcX = this.lp;
    this.dcY = y;
    let fbv = y * this.fb;
    if (fbv > 4) fbv = 4; else if (fbv < -4) fbv = -4;
    if (fbv < 1e-20 && fbv > -1e-20) fbv = 0;
    this.buf[this.w] = fbv; // pure feedback, no external input
    this.w = this.w + 1 >= this.size ? 0 : this.w + 1;
    if (this.envStage === 'attack') {
      this.envLevel += this.attackInc;
      if (this.envLevel >= 1) { this.envLevel = 1; this.envStage = 'sustain'; }
    } else if (this.envStage === 'release') {
      this.envLevel *= this.relCoef;
      if (this.envLevel < 1e-4) { this.envLevel = 0; this.envStage = 'idle'; this.id = -1; }
    }
    return s * this.envLevel;
  }
}

// stage steal-priority: release first, then sustain, then attack (protect blooming notes)
const STAGE_PRIORITY = { release: 3, sustain: 2, attack: 1 };

class ResinxProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voices = [];
    for (let i = 0; i < NUM_VOICES; i++) this.voices.push(new Voice(sampleRate));
    this.strings = [];
    for (let i = 0; i < NUM_STRINGS; i++) this.strings.push(new StringVoice(sampleRate));
    this.resPeak = new Float32Array(NUM_VOICES);

    // smoothed scalar params (current -> target)
    this.dryWet = 0.5; this.dryWetT = 0.5;
    this.masterGain = 0.9; this.masterGainT = 0.9;
    this.sympSend = 0.35; this.sympSendT = 0.35;
    this.dryStrings = 0.8; this.dryStringsT = 0.8;
    this.resMix = 0.5; this.resMixT = 0.5;
    this.modeMix = 0; this.modeMixT = 0; // 0 = MODAL, 1 = SYMPATHETIC

    // string params (control-rate)
    this.T60 = 2.8;
    this.brightness = 0.6;
    this.attackSec = 0.003;
    this.releaseSec = 0.06;
    this.polyphony = 8;
    this.globalAge = 0;
    this.framesSincePost = 0;

    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  // steal the worst-priority voice (dying first), tie-break oldest age
  allocateVoice() {
    let best = -1, bestPri = -1, bestAge = Infinity;
    for (let i = 0; i < this.polyphony; i++) {
      const v = this.strings[i];
      if (v.envStage === 'idle') return i;
      const p = STAGE_PRIORITY[v.envStage] || 0;
      if (p > bestPri || (p === bestPri && v.age < bestAge)) { bestPri = p; bestAge = v.age; best = i; }
    }
    return best < 0 ? 0 : best;
  }

  onMessage(m) {
    if (m.voices) {
      for (let i = 0; i < m.voices.length; i++) {
        const v = m.voices[i];
        const vc = this.voices[i];
        if (!vc) continue;
        if (v.delay !== undefined) vc.delay = Math.max(2, Math.min(vc.size - 2, v.delay));
        if (v.fb !== undefined) vc.fb = Math.max(0, Math.min(0.9999, v.fb));
        if (v.damp !== undefined) vc.damp = Math.max(0.01, Math.min(1, v.damp));
        if (v.gain !== undefined) vc.gain = v.gain;
        if (v.pan !== undefined) {
          const p = (Math.max(-1, Math.min(1, v.pan)) + 1) / 2;
          vc.panL = Math.cos(p * Math.PI / 2);
          vc.panR = Math.sin(p * Math.PI / 2);
        }
        if (v.enabled !== undefined) vc.enabled = v.enabled;
      }
    }
    if (m.dryWet !== undefined) this.dryWetT = m.dryWet;
    if (m.outGain !== undefined) this.masterGainT = m.outGain;

    switch (m.type) {
      case 'setParams':
        if (m.mode !== undefined) this.modeMixT = m.mode === 'SYMPATHETIC' ? 1 : 0;
        if (m.attack !== undefined) this.attackSec = m.attack;
        if (m.decay !== undefined) this.T60 = Math.max(0.05, m.decay);
        if (m.brightness !== undefined) this.brightness = m.brightness;
        if (m.sympSend !== undefined) this.sympSendT = m.sympSend;
        if (m.resMix !== undefined) this.resMixT = m.resMix;
        if (m.dryStrings !== undefined) this.dryStringsT = m.dryStrings;
        if (m.masterGain !== undefined) this.masterGainT = m.masterGain;
        if (m.release !== undefined) this.releaseSec = m.release;
        if (m.polyphony !== undefined) this.polyphony = Math.max(1, Math.min(NUM_STRINGS, m.polyphony | 0));
        break;
      case 'noteOn': {
        const idx = this.allocateVoice();
        this.strings[idx].noteOn(m.id, m.freq, m.vel, this.T60, this.brightness, this.attackSec, this.releaseSec, m.pan ?? 0);
        this.strings[idx].age = this.globalAge++;
        break;
      }
      case 'noteOff':
        for (let i = 0; i < NUM_STRINGS; i++) {
          if (this.strings[i].id === m.id) { this.strings[i].release(); break; }
        }
        break;
      case 'allNotesOff':
        for (let i = 0; i < NUM_STRINGS; i++) this.strings[i].release();
        break;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const outL = output[0];
    const outR = output[1] || output[0];
    const inCh = input && input[0] ? input[0] : null;
    const n = outL.length;
    const voices = this.voices;
    const strings = this.strings;
    const poly = this.polyphony;

    for (let s = 0; s < n; s++) {
      // anti-zipper smoothing
      this.dryWet += (this.dryWetT - this.dryWet) * 0.002;
      this.masterGain += (this.masterGainT - this.masterGain) * 0.002;
      this.sympSend += (this.sympSendT - this.sympSend) * 0.002;
      this.dryStrings += (this.dryStringsT - this.dryStrings) * 0.002;
      this.resMix += (this.resMixT - this.resMix) * 0.002;
      this.modeMix += (this.modeMixT - this.modeMix) * 0.01;
      // snap endpoints so MODAL (modeMix==0) stays bit-identical after a round trip
      if (this.modeMix - this.modeMixT < 1e-4 && this.modeMixT - this.modeMix < 1e-4) this.modeMix = this.modeMixT;

      const ext = inCh ? inCh[s] : 0;

      // poly strings
      let polyL = 0, polyR = 0, polyMono = 0;
      for (let i = 0; i < poly; i++) {
        const v = strings[i];
        if (v.envStage === 'idle') continue;
        const o = v.step();
        polyMono += o;
        polyL += o * v.panL;
        polyR += o * v.panR;
      }

      // resonator bank (sympathetic excitation folded in via modeMix)
      const resExcite = ext + polyMono * this.sympSend * this.modeMix;
      let resL = 0, resR = 0;
      for (let r = 0; r < NUM_VOICES; r++) {
        const o = voices[r].step(resExcite);
        resL += o * voices[r].panL;
        resR += o * voices[r].panR;
        const a = o < 0 ? -o : o;
        if (a > this.resPeak[r]) this.resPeak[r] = a;
      }

      // mode blend: modeMix 0 == MODAL (identical to before) -> 1 == SYMPATHETIC
      const dry = 1 - this.dryWet, wet = this.dryWet;
      const modalL = ext * dry + resL * wet;
      const modalR = ext * dry + resR * wet;
      const sympL = polyL * this.dryStrings + resL * this.resMix;
      const sympR = polyR * this.dryStrings + resR * this.resMix;
      const mm = this.modeMix;
      let oL = modalL * (1 - mm) + sympL * mm;
      let oR = modalR * (1 - mm) + sympR * mm;
      oL *= this.masterGain;
      oR *= this.masterGain;
      outL[s] = Math.tanh(oL);
      outR[s] = Math.tanh(oR);
    }

    // throttled visualizer levels (~32fps) — resonator peaks only
    if (++this.framesSincePost >= 12) {
      const res = new Array(NUM_VOICES);
      for (let r = 0; r < NUM_VOICES; r++) { res[r] = this.resPeak[r]; this.resPeak[r] = 0; }
      this.port.postMessage({ type: 'levels', res });
      this.framesSincePost = 0;
    }
    return true;
  }
}

registerProcessor('resinx', ResinxProcessor);
