// DSP verification gate: load pitch.wasm, feed synthetic tones, assert ±1 cent.
// Run: node rust/pitch/test.mjs   (from repo root)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.join(here, 'target/wasm32-unknown-unknown/release/pitch.wasm');
const bytes = fs.readFileSync(wasmPath);
const { instance } = await WebAssembly.instantiate(bytes, {});
const { alloc, detect, memory } = instance.exports;

const N = 4096;
const SR = 48000;
const ptr = alloc(N);

function fill(freq, harmonics) {
  // recreate the view each call: detect() may grow wasm memory and detach the old buffer
  const mem = new Float32Array(memory.buffer, ptr, N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let s = Math.sin(2 * Math.PI * freq * t);
    if (harmonics) {
      // simulate a plucked string: strong fundamental + decaying overtones
      s += 0.5 * Math.sin(2 * Math.PI * 2 * freq * t);
      s += 0.33 * Math.sin(2 * Math.PI * 3 * freq * t);
      s += 0.25 * Math.sin(2 * Math.PI * 4 * freq * t);
      s /= 2.08;
    }
    mem[i] = s;
  }
}

function cents(detected, expected) {
  return 1200 * Math.log2(detected / expected);
}

const cases = [
  { name: 'B0 (5-str bass low)', f: 30.87 },
  { name: 'E1 (bass E)', f: 41.20 },
  { name: 'E2 (guitar low E)', f: 82.41 },
  { name: 'A2', f: 110.0 },
  { name: 'D3', f: 146.83 },
  { name: 'G3', f: 196.0 },
  { name: 'A4 (concert)', f: 440.0 },
  { name: 'E5 (mandolin)', f: 659.25 },
  { name: 'G4 (banjo 5th)', f: 392.0 },
];

let failed = 0;
console.log('tone'.padEnd(22), 'expect'.padStart(9), 'pure¢'.padStart(9), 'harm¢'.padStart(9));
for (const c of cases) {
  fill(c.f, false);
  const dp = detect(ptr, N, SR);
  fill(c.f, true);
  const dh = detect(ptr, N, SR);
  const cp = dp > 0 ? cents(dp, c.f) : NaN;
  const ch = dh > 0 ? cents(dh, c.f) : NaN;
  const ok = Math.abs(cp) < 1 && Math.abs(ch) < 1;
  if (!ok) failed++;
  console.log(
    c.name.padEnd(22),
    c.f.toFixed(2).padStart(9),
    (isNaN(cp) ? 'MISS' : cp.toFixed(3)).padStart(9),
    (isNaN(ch) ? 'MISS' : ch.toFixed(3)).padStart(9),
    ok ? '✓' : '✗ FAIL'
  );
}

// Noise should report no pitch (-1).
{
  const mem = new Float32Array(memory.buffer, ptr, N);
  for (let i = 0; i < N; i++) mem[i] = (Math.random() * 2 - 1) * 0.5;
  const d = detect(ptr, N, SR);
  const ok = d < 0;
  if (!ok) failed++;
  console.log('white noise (expect -1)'.padEnd(22), ''.padStart(9), String(d.toFixed ? d.toFixed(1) : d).padStart(9), ''.padStart(9), ok ? '✓' : '✗ FAIL');
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
