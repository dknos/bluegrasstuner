// Offline validation harness for KNURL voices.
// Loads the REAL KickVoice/ModalVoice source from the worklet (no copy drift),
// renders each drum, and prints peak / RMS / decay + a Goertzel spectral profile.
// We can't listen in this env, so this is how we prove the kit isn't a toy.
import { readFileSync } from 'node:fs';

const SR = 44100;
const src = readFileSync(new URL('../services/knurl-processor.js', import.meta.url), 'utf8');
// everything before the Plate class = consts + KickVoice + ModalVoice, no worklet globals
const prelude = src.slice(0, src.indexOf('// ── compact plate'));
const { KickVoice, ModalVoice } = new Function(prelude + '\n;return {KickVoice, ModalVoice};')();

function render(voice, seconds) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = voice.step();
  return out;
}

// Goertzel single-bin magnitude (normalized by length)
function goertzel(buf, freq) {
  const w = (2 * Math.PI * freq) / SR;
  const c = 2 * Math.cos(w);
  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < buf.length; i++) { s0 = buf[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  const mag = Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2);
  return mag / buf.length;
}

function stats(name, buf) {
  let peak = 0, sumSq = 0, bad = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    if (!Number.isFinite(v)) bad++;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / buf.length);
  // HF proxy: rms of first-difference (≈ +6dB/oct) / rms. High = bright/noisy.
  let dSq = 0; for (let i = 1; i < buf.length; i++) { const d = buf[i] - buf[i - 1]; dSq += d * d; }
  const hf = Math.sqrt(dSq / (buf.length - 1)) / (rms || 1);
  // tail RMS over the last 10% — should be near zero (clean decay, no stuck ring)
  const tail = buf.subarray(Math.floor(buf.length * 0.9));
  let tSq = 0; for (let i = 0; i < tail.length; i++) tSq += tail[i] * tail[i];
  const tailRms = Math.sqrt(tSq / tail.length);
  const bands = [50, 100, 200, 400, 800, 2000, 6000, 12000];
  const spec = bands.map((f) => goertzel(buf, f));
  const specMax = Math.max(...spec) || 1;
  const bars = spec.map((m) => '█'.repeat(Math.max(0, Math.round((m / specMax) * 12))).padEnd(12));
  console.log(`\n${name}`);
  console.log(`  peak=${peak.toFixed(3)}  rms=${rms.toFixed(4)}  tailRms=${tailRms.toExponential(2)}  HF=${hf.toFixed(2)}  nonfinite=${bad}`);
  for (let i = 0; i < bands.length; i++) {
    console.log(`  ${String(bands[i]).padStart(5)}Hz |${bars[i]}| ${(spec[i] / specMax).toFixed(2)}`);
  }
}

// KICK — expect energy dominated by <120Hz, clean tail
const kick = new KickVoice(SR);
kick.trigger(55, 0.45, 0.7, 1.6, 1.0, 0);
stats('KICK  f=55 T60=.45 click=.7 drive=1.6', render(kick, 0.6));

// SNARE — short modal body + strong broadband noise crack
const snare = new ModalVoice(SR);
snare.trigger(200, 0.16, 0.42, 0.8, 0.95, 0.92, 1.5, 1.0, 0);
stats('SNARE f=200 T60=.16 mat=.42 noise=.95', render(snare, 0.4));

// CLOSED HAT — bright metal modes high up, minimal noise lows
const hat = new ModalVoice(SR);
hat.trigger(900, 0.04, 1.0, 0.95, 0.25, 1.0, 1.1, 0.85, 0);
stats('HAT   f=900 T60=.04 mat=1 noise=.25', render(hat, 0.2));

// TOM — pitched modal body, mid-low, longer
const tom = new ModalVoice(SR);
tom.trigger(120, 0.5, 0.25, 0.55, 0.1, 0.7, 1.3, 1.0, 0);
stats('TOM   f=120 T60=.5 mat=.25', render(tom, 0.6));

// ── MASTER BUS: dense downbeat (kick+snare+hat on the same sample) summed and
// pushed through tanh(drive·H·sum)·gain. The per-voice harness can't see this.
const H = 0.42;   // master headroom: a dense step lands near unity at Drive=1
function softclip(x) {            // linear below 0.75, smooth ceiling -> ±1, never exceeds
  const t = 0.75, a = Math.abs(x);
  if (a <= t) return x;
  return (x < 0 ? -1 : 1) * (t + (1 - t) * Math.tanh((a - t) / (1 - t)));
}
function masterChain(sum, drive, gain) {
  let l = sum * H;
  const sat = drive - 1;                 // 0 at Drive=1 -> clean; crossfade glue above
  if (sat > 0.001) {
    const mix = sat < 1 ? sat : 1;
    l = l * (1 - mix) + Math.tanh(drive * l) * mix;
  }
  return softclip(l * gain);
}
function masterTest(drive, gain) {
  const k = new KickVoice(SR); k.trigger(55, 0.45, 0.7, 1.6, 1.0, 0);
  const s = new ModalVoice(SR); s.trigger(200, 0.16, 0.42, 0.8, 0.95, 0.92, 1.5, 0.82, 0);
  const h = new ModalVoice(SR); h.trigger(1100, 0.04, 1.0, 0.95, 0.55, 1.0, 1.1, 0.52, 0);
  const N = Math.floor(SR * 0.3);
  let prePeak = 0, postPeak = 0, postSq = 0, lim = 1, limPeak = 0;
  for (let i = 0; i < N; i++) {
    const sum = k.step() + s.step() + h.step();
    if (Math.abs(sum) > prePeak) prePeak = Math.abs(sum);
    const post = masterChain(sum, drive, gain);
    if (Math.abs(post) > postPeak) postPeak = Math.abs(post);
    postSq += post * post;
    // model the soft-knee limiter that follows
    const a = Math.abs(post), thr = 0.96;
    if (a > thr) lim += (thr / a - lim) * 0.4; else lim += (1 - lim) * 0.0008;
    if (Math.abs(post * lim) > limPeak) limPeak = Math.abs(post * lim);
  }
  console.log(`\nMASTER H=${H} drive=${drive} gain=${gain}`);
  console.log(`  pre-bus peak=${prePeak.toFixed(3)}  post-chain peak=${postPeak.toFixed(3)}  post-limiter peak=${limPeak.toFixed(3)}  rms=${Math.sqrt(postSq / N).toFixed(4)}`);
}
masterTest(1.0, 0.9);   // clean (minimum Drive) — should be near-linear, peak < ~1
masterTest(1.8, 0.9);   // some glue
masterTest(3.0, 0.9);   // pushed — saturated
