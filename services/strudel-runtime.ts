// strudel-runtime.ts
// ONE shared Strudel runtime for every tool that drives KNURL through Strudel
// (the REPL + the PHASELOOM groovebox). @strudel/web is a true ES-module
// singleton: calling initStrudel() twice (or building a second KnurlEngine
// bridge) is undefined/wasteful. So the engine, the prebake and the bridge are
// created exactly once here, behind a single promise, and shared by all tools.
//
// The prebake mirrors strudel.cc verbatim so .bank("RolandTR909"), piano, vcsl,
// uzu-drumkit and the gm_* soundfonts all resolve (the Explore community covers
// depend on these). Each load fails soft.

import { createStrudelBridge, StrudelBridge } from './strudel-bridge';

export type StrudelMod = {
  initStrudel: (opts?: any) => void;
  evaluate: (code: string) => Promise<unknown>;
  hush: () => void;
  getAudioContext: () => AudioContext;
  getAnalyzerData: (type?: 'time' | 'frequency', id?: number | string) => Float32Array;
  registerSound: (key: string, onTrigger: any, data?: any) => void;
  samples: (url: any, base?: any, opts?: any) => Promise<void>;
};

export interface StrudelRuntime {
  mod: StrudelMod;
  bridge: StrudelBridge;
}

let runtimePromise: Promise<StrudelRuntime> | null = null;

/** Load + init Strudel and build the KNURL bridge — once, shared by all tools. */
export function getStrudelRuntime(): Promise<StrudelRuntime> {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const mod = (await import('@strudel/web')) as unknown as StrudelMod;
    const CDN = 'https://strudel.b-cdn.net';
    mod.initStrudel({
      prebake: async () => {
        const ld = (a: string, b?: string, o?: any) => mod.samples(a, b, o).catch((e) => console.warn('prebake', a, e));
        await Promise.all([
          ld(`${CDN}/tidal-drum-machines.json`, `${CDN}/tidal-drum-machines/machines/`, { prebake: true, tag: 'drum-machines' }),
          ld(`${CDN}/piano.json`, `${CDN}/piano/`, { prebake: true }),
          ld(`${CDN}/vcsl.json`, `${CDN}/VCSL/`, { prebake: true }),
          ld(`${CDN}/uzu-drumkit.json`, `${CDN}/uzu-drumkit/`, { prebake: true, tag: 'drum-machines' }),
          ld('github:tidalcycles/dirt-samples'),
          (async () => { try { const sf: any = await import('@strudel/soundfonts'); await sf.registerSoundfonts?.(); } catch (e) { console.warn('soundfonts unavailable', e); } })(),
        ]);
      },
    });
    // build the bridge on Strudel's OWN context (shared clock = tight timing)
    const bridge = await createStrudelBridge(mod);
    return { mod, bridge };
  })();
  return runtimePromise;
}
