// AudioWorkletProcessor that runs the Rust/WASM MPM pitch detector off the main
// thread. The WASM bytes are handed in via processorOptions (you cannot fetch
// inside an AudioWorkletGlobalScope), instantiated synchronously-ish in the
// constructor, then driven from process().
//
// Detection runs on a sliding WINDOW with a HOP step (75% overlap), not every
// 128-sample render quantum — far less CPU, still ~21ms updates at 48kHz.

const WINDOW = 4096; // ≥ 2 periods of the lowest target (B0 ≈ 30.87 Hz → ~3100 samples @48k)
const HOP = 1024; // samples between detections (~21ms @48k)

class PitchProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.ptr = 0;
    this.exports = null;

    // Sliding ring buffer of the most recent WINDOW samples.
    this.ring = new Float32Array(WINDOW);
    this.ringPos = 0;
    this.filled = 0;
    this.sinceHop = 0;

    // Synchronous compile+instantiate is permitted in the worklet scope and the
    // module is tiny (~11KB). Doing it synchronously means `process()` is never
    // called before the detector is ready — no async race, deterministic under
    // both realtime and OfflineAudioContext.
    const bytes = options?.processorOptions?.wasmBytes;
    if (bytes) {
      try {
        const module = new WebAssembly.Module(bytes);
        const instance = new WebAssembly.Instance(module, {});
        this.exports = instance.exports;
        this.ptr = this.exports.alloc(WINDOW);
        this.ready = true;
        this.port.postMessage({ type: 'ready' });
      } catch (err) {
        this.port.postMessage({ type: 'error', message: String(err) });
      }
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const ch = input[0]; // mono — channel 0
      if (ch) {
        for (let i = 0; i < ch.length; i++) {
          this.ring[this.ringPos] = ch[i];
          this.ringPos = (this.ringPos + 1) % WINDOW;
          if (this.filled < WINDOW) this.filled++;
          this.sinceHop++;
        }

        if (this.ready && this.filled >= WINDOW && this.sinceHop >= HOP) {
          this.sinceHop = 0;
          // Recreate the view each hop: detect() may grow WASM memory (and detach
          // the old ArrayBuffer) the first time it allocates its NSDF scratch.
          const buf = new Float32Array(this.exports.memory.buffer, this.ptr, WINDOW);
          // Linearize oldest → newest into WASM memory.
          for (let i = 0; i < WINDOW; i++) {
            buf[i] = this.ring[(this.ringPos + i) % WINDOW];
          }
          const freq = this.exports.detect(this.ptr, WINDOW, sampleRate);
          this.port.postMessage({ type: 'pitch', freq });
        }
      }
    }
    return true; // keep the processor alive
  }
}

registerProcessor('pitch', PitchProcessor);
