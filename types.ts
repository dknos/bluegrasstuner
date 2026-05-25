
export interface NoteDefinition {
  stringNum: number;
  note: string;
  freq: number;
}

export interface TuningDefinition {
  name: string;
  notes: NoteDefinition[];
}

export interface InstrumentDefinition {
  name: string;
  tunings: Record<string, TuningDefinition>;
}

export interface NoteData {
  note: string;
  octave: number;
  frequency: number;
  centsOff: number;
  perfectFrequency: number;
}

export type TuningMode = string;

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}
