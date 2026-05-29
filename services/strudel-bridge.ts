// strudel-bridge.ts
// Slice 3: lets Strudel patterns play KNURL's physical-model drums.
//
// How it works:
//  • Strudel + KNURL share ONE AudioContext (getAudioContext()), so the worklet's
//    clock and Strudel's scheduled `t` are the same timeline → sample-accurate.
//  • We registerSound() each KNURL voice under a k-prefixed name (kk, ks, kh…),
//    distinct from Strudel's dirt-sample names (bd/sd/hh…) so nothing is clobbered.
//  • On each hap, Strudel calls our callback EARLY with a future `t`; we forward it
//    to KNURL via triggerAt (the worklet fires at that exact sample). The real audio
//    comes from KNURL; we return a silent node only to satisfy superdough's per-hit
//    lifecycle (so it frees the voice — no leaks on dense patterns like kh*16).
//  • KNURL's own sequencer stays OFF here — Strudel is the clock.

import { KnurlEngine } from './knurl';

export interface StrudelBridge {
  knurl: KnurlEngine;
  analyser: AnalyserNode;   // taps our drums for the visualizer
  ctx: AudioContext;
  sounds: { name: string; label: string }[];
  dispose: () => void;
}

interface StrudelModLike {
  getAudioContext: () => AudioContext;
  registerSound: (key: string, onTrigger: (t: number, value: any, onended: () => void) => any, data?: any) => void;
}

// Strudel sound name -> KNURL track index (k* = KNURL, avoids dirt-sample collisions)
const SOUNDS: { name: string; label: string; idx: number }[] = [
  { name: 'kk', label: 'Kick', idx: 0 },
  { name: 'ks', label: 'Snare', idx: 1 },
  { name: 'kh', label: 'Hat', idx: 2 },
  { name: 'ko', label: 'OpenHat', idx: 3 },
  { name: 'kc', label: 'Clap', idx: 4 },
  { name: 'kt', label: 'Tom', idx: 5 },
  { name: 'kr', label: 'Rim', idx: 6 },
  { name: 'kp', label: 'Perc', idx: 7 },
];

// note (MIDI number) or freq control -> Hz; 0 means "use the track's own tuning"
const freqFromValue = (value: any): number => {
  if (typeof value?.freq === 'number' && value.freq > 0) return value.freq;
  const n = value?.note;
  if (typeof n === 'number') return 440 * Math.pow(2, (n - 69) / 12);
  return 0;
};

export async function createStrudelBridge(mod: StrudelModLike): Promise<StrudelBridge> {
  const ctx = mod.getAudioContext();          // SAME context Strudel plays through
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  const knurl = new KnurlEngine(ctx);
  await knurl.whenReady();
  // route KNURL through our analyser to the speakers (transport left OFF)
  knurl.output.connect(analyser);
  analyser.connect(ctx.destination);

  for (const s of SOUNDS) {
    mod.registerSound(s.name, (t: number, value: any, onended: () => void) => {
      knurl.triggerAt(s.idx, value?.gain ?? 1, t, freqFromValue(value));
      // silent placeholder so superdough manages a real lifecycle + frees the voice
      const dur = Math.min(2, Math.max(0.05, value?.duration ?? 0.25));
      const g = ctx.createGain();
      g.gain.value = 0;
      const o = ctx.createOscillator();
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
      o.onended = () => { try { g.disconnect(); } catch {} onended && onended(); };
      return { node: g, stop: (endTime: number) => { try { o.stop(endTime); } catch {} } };
    }, { type: 'synth' });
  }

  return {
    knurl,
    analyser,
    ctx,
    sounds: SOUNDS.map(({ name, label }) => ({ name, label })),
    dispose: () => {
      try { knurl.dispose(); } catch {}
      try { analyser.disconnect(); } catch {}
    },
  };
}
