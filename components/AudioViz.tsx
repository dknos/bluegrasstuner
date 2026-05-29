import React, { useEffect, useRef, useState } from 'react';

// ──────────────────────────────────────────────────────────────────────────
// AudioViz — audio-reactive visualizer for the Strudel tool.
//   • canvas2D mode (default, works everywhere): mirrored spectrum bars + a
//     reactive central bloom + waveform overlay, in the green/brass palette.
//   • WebGPU mode (experimental enhancement): a fullscreen fragment-shader
//     radial bloom driven by audio bands. Guarded end-to-end — ANY failure
//     (no adapter, device-lost, shader/compile error, exception) falls back
//     to canvas2D. Default is 2D; the GPU toggle only appears when supported.
//
// Reads two sources each frame and takes the louder: Strudel-native sounds
// (getAnalyzerData frequency, dB) and our KNURL drums (bridge analyser, byte).
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  getAnalyser: () => AnalyserNode | null;           // our KNURL drums
  getNativeFreq: () => Float32Array | null;          // Strudel native (dB)
  height?: number;
}

const NBANDS = 28;

// build a 0..1 band array from the louder of the two sources
function readBands(analyser: AnalyserNode | null, native: Float32Array | null, out: Float32Array) {
  let bridge: Uint8Array | null = null;
  if (analyser) { bridge = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(bridge); }
  const nLen = native ? native.length : 0;
  const bLen = bridge ? bridge.length : 0;
  for (let i = 0; i < NBANDS; i++) {
    const f = i / NBANDS;
    let v = 0;
    if (nLen) { const db = native![Math.floor(f * nLen)] || -100; v = Math.max(v, (db + 100) / 100); }
    if (bLen) { v = Math.max(v, (bridge![Math.floor(f * bLen)] || 0) / 255); }
    out[i] = Math.max(0, Math.min(1, v));
  }
}

const Strudel2D = (c: CanvasRenderingContext2D, w: number, h: number, bands: Float32Array, t: number) => {
  c.fillStyle = '#070b07'; c.fillRect(0, 0, w, h);
  const mid = h / 2;
  let level = 0; for (let i = 0; i < NBANDS; i++) level += bands[i]; level /= NBANDS;
  // central bloom
  const br = 10 + level * Math.min(w, h) * 0.5;
  const g = c.createRadialGradient(w / 2, mid, 0, w / 2, mid, br);
  g.addColorStop(0, `rgba(143,209,122,${0.15 + level * 0.5})`);
  g.addColorStop(1, 'rgba(143,209,122,0)');
  c.fillStyle = g; c.beginPath(); c.arc(w / 2, mid, br, 0, Math.PI * 2); c.fill();
  // mirrored spectrum bars
  const bw = w / NBANDS;
  for (let i = 0; i < NBANDS; i++) {
    const v = bands[i];
    const bh = v * mid * 0.92;
    const hue = 90 + v * 50;                    // green -> toward brass on hits
    c.fillStyle = `hsla(${hue},${50 + v * 30}%,${45 + v * 25}%,${0.5 + v * 0.5})`;
    c.shadowColor = `hsla(${hue},80%,60%,0.7)`; c.shadowBlur = v * 14;
    c.fillRect(i * bw + 1, mid - bh, bw - 2, bh);
    c.fillRect(i * bw + 1, mid, bw - 2, bh);
  }
  c.shadowBlur = 0;
};

const WGSL = `
struct U { res: vec2f, time: f32, level: f32, b0: vec4f, b1: vec4f };
@group(0) @binding(0) var<uniform> u: U;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f,3>(vec2f(-1.,-1.), vec2f(3.,-1.), vec2f(-1.,3.));
  return vec4f(p[i], 0., 1.);
}
fn band(idx: f32) -> f32 {
  let i = i32(clamp(idx, 0., 7.));
  if (i == 0) { return u.b0.x; } if (i == 1) { return u.b0.y; }
  if (i == 2) { return u.b0.z; } if (i == 3) { return u.b0.w; }
  if (i == 4) { return u.b1.x; } if (i == 5) { return u.b1.y; }
  if (i == 6) { return u.b1.z; } return u.b1.w;
}
@fragment fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  var p = (frag.xy / u.res) * 2.0 - 1.0;
  p.x *= u.res.x / u.res.y;
  let r = length(p);
  let a = atan2(p.y, p.x);
  let bi = (a / 6.2831853 + 0.5) * 8.0;
  let e = band(bi);
  let ring = exp(-pow((r - 0.25 - u.level * 0.5 - e * 0.25) * 5.0, 2.0));
  let spokes = 0.5 + 0.5 * sin(a * 8.0 + u.time * 1.5);
  let glow = ring * (0.5 + spokes * 0.5) + e * 0.25 * exp(-r * 2.0);
  let base = vec3f(0.03, 0.06, 0.03);
  let green = vec3f(0.56, 0.82, 0.48);
  let brass = vec3f(0.79, 0.63, 0.32);
  let col = base + mix(green, brass, clamp(u.level * 1.5, 0., 1.)) * glow;
  return vec4f(col, 1.0);
}`;

const AudioViz: React.FC<Props> = ({ getAnalyser, getNativeFreq, height = 140 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const dprRef = useRef(1);
  const bandsRef = useRef(new Float32Array(NBANDS));
  const modeRef = useRef<'2d' | 'gpu'>('2d');
  const [gpuOk, setGpuOk] = useState(false);
  const [mode, setMode] = useState<'2d' | 'gpu'>('2d');
  const gpu = useRef<any>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // detect WebGPU support (adapter must actually resolve, per the spec)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter?.();
        if (!cancelled && adapter) setGpuOk(true);
      } catch { /* unsupported */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // (re)build the WebGPU pipeline when switching to gpu mode; fall back on any error
  const initGpu = async (cv: HTMLCanvasElement): Promise<boolean> => {
    try {
      const g = (navigator as any).gpu;
      const adapter = await g.requestAdapter();
      if (!adapter) return false;
      const device = await adapter.requestDevice();
      device.lost.then(() => { gpu.current = null; if (modeRef.current === 'gpu') setMode('2d'); });
      const ctx = (cv as any).getContext('webgpu');
      if (!ctx) return false;
      const format = g.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: 'opaque' });
      const module = device.createShaderModule({ code: WGSL });
      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      const USAGE = (globalThis as any).GPUBufferUsage;
      const ubuf = device.createBuffer({ size: 48, usage: USAGE.UNIFORM | USAGE.COPY_DST });
      const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubuf } }] });
      gpu.current = { device, ctx, pipeline, ubuf, bind, u: new Float32Array(12) };
      return true;
    } catch (e) {
      console.warn('WebGPU init failed, using 2D', e);
      gpu.current = null;
      return false;
    }
  };

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    let alive = true;
    let setup = false;       // gpu pipeline created for current canvas
    const t0 = performance.now();

    const frame = async () => {
      if (!alive) return;
      rafRef.current = requestAnimationFrame(frame);
      const bands = bandsRef.current;
      readBands(getAnalyser(), getNativeFreq(), bands);
      const t = (performance.now() - t0) / 1000;

      if (modeRef.current === 'gpu') {
        if (!gpu.current && !setup) { setup = true; const ok = await initGpu(cv); if (!ok) { setMode('2d'); return; } }
        const G = gpu.current;
        if (G) {
          try {
            let level = 0; for (let i = 0; i < NBANDS; i++) level += bands[i]; level /= NBANDS;
            const u = G.u;
            u[0] = cv.width; u[1] = cv.height; u[2] = t; u[3] = level;
            for (let i = 0; i < 8; i++) { // 8 coarse bands -> b0,b1
              let s = 0, n = 0; const lo = Math.floor(i / 8 * NBANDS), hi = Math.floor((i + 1) / 8 * NBANDS);
              for (let k = lo; k < hi; k++) { s += bands[k]; n++; }
              u[4 + i] = n ? s / n : 0;
            }
            G.device.queue.writeBuffer(G.ubuf, 0, u);
            const enc = G.device.createCommandEncoder();
            const pass = enc.beginRenderPass({ colorAttachments: [{ view: G.ctx.getCurrentTexture().createView(), clearValue: { r: 0.01, g: 0.02, b: 0.01, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
            pass.setPipeline(G.pipeline); pass.setBindGroup(0, G.bind); pass.draw(3); pass.end();
            G.device.queue.submit([enc.finish()]);
          } catch (e) { console.warn('WebGPU draw failed, 2D', e); gpu.current = null; setMode('2d'); }
        }
        return;
      }

      // canvas2D
      const c = cv.getContext('2d'); if (!c) return;
      const dpr = dprRef.current;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      Strudel2D(c, cv.width / dpr, cv.height / dpr, bands, t);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
    // re-run when switching modes so the 2d/webgpu context binding is correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block', borderRadius: 6 }} />
      {gpuOk && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, fontFamily: '"JetBrains Mono",monospace', fontSize: 9 }}>
          {(['2d', 'gpu'] as const).map((m) => (
            <button key={m} onClick={() => { gpu.current = null; setMode(m); }} aria-pressed={mode === m}
              style={{ padding: '2px 7px', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(143,209,122,0.3)',
                background: mode === m ? 'rgba(143,209,122,0.25)' : 'rgba(0,0,0,0.4)', color: mode === m ? '#cdeac0' : 'rgba(143,209,122,0.6)' }}>
              {m === '2d' ? '2D' : 'WebGPU'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioViz;
