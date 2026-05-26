
import React, { useState, useEffect } from 'react';
import { TuningDefinition } from '../types';
import { getNoteAtFret, identifyChord, playTone, INSTRUMENT_DATA } from '../services/audioUtils';
import { SynthShell, Tabs, Engrave, PANEL } from './synthkit';

interface ChordCreatorProps {
  onClose: () => void;
  instrumentName: string;
  tuning: TuningDefinition;
}

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const INSTRUMENTS = ['Guitar', 'Banjo', 'Ukulele', 'Mandolin'];

// Preset Library for Standard Tunings
const CHORD_PRESETS: Record<string, Record<string, number[]>> = {
    "Guitar": {
        "C Major": [-1, 3, 2, 0, 1, 0],
        "G Major": [3, 2, 0, 0, 0, 3],
        "D Major": [-1, -1, 0, 2, 3, 2],
        "A Major": [-1, 0, 2, 2, 2, 0],
        "E Major": [0, 2, 2, 1, 0, 0],
        "A Minor": [-1, 0, 2, 2, 1, 0],
        "E Minor": [0, 2, 2, 0, 0, 0],
        "D Minor": [-1, -1, 0, 2, 3, 1],
        "F Major": [1, 3, 3, 2, 1, 1],
        "C7": [-1, 3, 2, 3, 1, 0],
        "G7": [3, 2, 0, 0, 0, 1],
        "B7": [-1, 2, 1, 2, 0, 2],
        "D7": [-1, -1, 0, 2, 1, 2],
        "A7": [-1, 0, 2, 0, 2, 0],
        "E7": [0, 2, 0, 1, 0, 0]
    },
    "Banjo": { // 5-String Open G: g(5) D(4) G(3) B(2) D(1)
        // Majors
        "G Major (Open)": [0, 0, 0, 0, 0],
        "C Major": [0, 2, 0, 1, 2],
        "D Major": [0, 4, 2, 3, 4],
        "F Major": [0, 3, 2, 1, 3],
        "A Major": [0, 2, 2, 2, 2],
        "E Major": [0, 2, 1, 0, 2],
        "B Major": [0, 4, 4, 4, 4],

        // Minors
        "E Minor": [0, 2, 0, 0, 2],
        "A Minor": [0, 2, 2, 1, 2],
        "D Minor": [0, 0, 2, 3, 3],
        "G Minor": [0, 5, 3, 3, 5],
        "B Minor": [0, 4, 4, 3, 4],
        "F Minor": [0, 3, 1, 1, 3],
        "C Minor": [0, 5, 5, 4, 5],

        // 7ths
        "G7": [0, 0, 0, 0, 3],
        "D7": [0, 0, 2, 1, 0],
        "C7": [0, 2, 3, 1, 2],
        "A7": [0, 2, 0, 2, 2],
        "E7": [0, 2, 1, 3, 0],
        "B7": [0, 1, 2, 0, 1],
        "F7": [0, 3, 2, 4, 3]
    },
    "Ukulele": { // G C E A
        "C Major": [0, 0, 0, 3],
        "G Major": [0, 2, 3, 2],
        "F Major": [2, 0, 1, 0],
        "D Major": [2, 2, 2, 5],
        "A Major": [2, 1, 0, 0],
        "E Major": [1, 4, 0, 2],
        "B Major": [4, 3, 2, 2],
        "Bb Major": [3, 2, 1, 1],

        "A Minor": [2, 0, 0, 0],
        "E Minor": [0, 4, 3, 2],
        "D Minor": [2, 2, 1, 0],
        "G Minor": [0, 2, 3, 1],
        "B Minor": [4, 2, 2, 2],

        "G7": [0, 2, 1, 2],
        "C7": [0, 0, 0, 1],
        "D7": [2, 2, 2, 3],
        "A7": [0, 1, 0, 0],
        "E7": [1, 2, 0, 2]
    },
    "Mandolin": { // G D A E
        "G Major": [0, 0, 2, 3],
        "C Major": [0, 2, 3, 0],
        "D Major": [2, 0, 0, 2],
        "A Major": [2, 2, 4, 5],
        "F Major": [5, 3, 0, 1],
        "E Major": [1, 2, 2, 0],

        "A Minor": [2, 2, 3, 5],
        "E Minor": [0, 2, 2, 0],
        "D Minor": [2, 0, 0, 1],
        "B Minor": [4, 4, 5, 2],

        "G7": [0, 0, 2, 1],
        "D7": [2, 0, 0, 0],
        "A7": [2, 2, 4, 3],
        "E7": [1, 0, 2, 0]
    }
};

const ChordCreator: React.FC<ChordCreatorProps> = ({ onClose, instrumentName, tuning }) => {
  // Local state for instrument switching within the tool
  const [activeInstrument, setActiveInstrument] = useState(instrumentName);
  const [activeTuning, setActiveTuning] = useState(tuning);

  const [stringFrets, setStringFrets] = useState<number[]>([]);
  const [detectedChord, setDetectedChord] = useState<string>("Unknown");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeNotes, setActiveNotes] = useState<{note: string, freq: number}[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Handle Internal Instrument Switch
  const handleInstrumentChange = (newInstrument: string) => {
      setActiveInstrument(newInstrument);
      // Load default tuning for that instrument
      const defData = INSTRUMENT_DATA[newInstrument];
      if (defData) {
          // Pick first tuning key usually Standard or Open G
          const firstKey = Object.keys(defData.tunings)[0];
          setActiveTuning(defData.tunings[firstKey]);
      }
      setSelectedPreset("");
  };

  // Init strings based on tuning
  useEffect(() => {
    if (activeTuning && activeTuning.notes) {
        // Default to open strings
        setStringFrets(new Array(activeTuning.notes.length).fill(0));
    }
  }, [activeTuning]);

  // Recalculate chord when frets change
  useEffect(() => {
      if (!activeTuning || !activeTuning.notes || stringFrets.length === 0) return;

      const currentNotes: {note: string, freq: number}[] = [];
      const noteNames: string[] = [];

      stringFrets.forEach((fret, i) => {
          if (fret === -1) return; // Muted

          // Map index directly to tuning notes
          const openNote = activeTuning.notes[i];
          if (openNote) {
              const info = getNoteAtFret(openNote.freq, fret);
              currentNotes.push(info);
              noteNames.push(info.note);
          }
      });

      setActiveNotes(currentNotes);
      setDetectedChord(identifyChord(noteNames));

  }, [stringFrets, activeTuning]);

  const handleFretClick = (stringIndex: number, fret: number) => {
      const newFrets = [...stringFrets];

      // Toggle / Mute Logic
      if (newFrets[stringIndex] === fret) {
          if (fret === 0) {
              newFrets[stringIndex] = -1; // Mute
          } else {
              newFrets[stringIndex] = 0; // Open
          }
      } else {
          newFrets[stringIndex] = fret;
      }

      setStringFrets(newFrets);
      setSelectedPreset(""); // Clear preset selection on manual change

      // Play note immediately for feedback if not muted
      if (newFrets[stringIndex] >= 0 && activeTuning.notes[stringIndex]) {
          const info = getNoteAtFret(activeTuning.notes[stringIndex].freq, newFrets[stringIndex]);
          playTone(info.freq, 'triangle');
      }
  };

  const applyPreset = (chordName: string) => {
      const presets = CHORD_PRESETS[activeInstrument];
      if (presets && presets[chordName]) {
          if (presets[chordName].length === stringFrets.length) {
              setStringFrets(presets[chordName]);
              setSelectedPreset(chordName);
              setTimeout(() => playChord(presets[chordName]), 100);
          }
      }
  };

  const playChord = async (overrideFrets?: number[]) => {
      const fretsToUse = overrideFrets || stringFrets;
      const notesToPlay: number[] = [];

      fretsToUse.forEach((fret, i) => {
          if (fret >= 0 && activeTuning.notes[i]) {
              notesToPlay.push(getNoteAtFret(activeTuning.notes[i].freq, fret).freq);
          }
      });

      for (const freq of notesToPlay) {
          playTone(freq, 'triangle');
          await new Promise(r => setTimeout(r, 40));
      }
  };

  const availablePresets = CHORD_PRESETS[activeInstrument] ? Object.keys(CHORD_PRESETS[activeInstrument]) : [];

  // Fretboard Rendering Helpers
  // We want to render High strings at top (Tab style) or Low at bottom.
  // Tuning definitions usually low index = low string.
  // We reverse for Tab View.
  const renderOrder = activeTuning ? [...activeTuning.notes].map((_, i) => i).reverse() : [];

  // ── Vertical fretboard geometry (mobile-first: strings = columns, frets = rows) ──
  // renderOrder gives us the left→right column order (high string first/left, bass last/right).
  const numStrings = renderOrder.length;
  const NUT_ROW_H = 46;     // open-string / nut row height
  const FRET_ROW_H = 38;    // each fretted row
  const LABEL_GUTTER = 30;  // left gutter for fret-number engravings
  const FRETS = [...Array(12)].map((_, i) => i + 1); // 1..12
  const phosphorOn = detectedChord !== 'Unknown';

  return (
    <SynthShell name="Chord Creator" tag="Fretboard · Voicings" onClose={onClose} accent={PANEL.brass}>

      {/* ── Instrument selector ── */}
      <Tabs
        options={INSTRUMENTS}
        value={Math.max(0, INSTRUMENTS.indexOf(activeInstrument))}
        onChange={(i) => handleInstrumentChange(INSTRUMENTS[i])}
      />

      {/* ── Phosphor readout: detected chord ── */}
      <div style={{
        position: 'relative', borderRadius: 10, padding: '14px 16px 16px', textAlign: 'center',
        background: 'radial-gradient(120% 140% at 50% 0%, #0e120c, #060806)',
        boxShadow: `inset 0 2px 14px rgba(0,0,0,0.85), inset 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.45)`,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(143,209,122,0.55)' }}>
          Detected Chord
        </span>
        <div style={{
          fontFamily: SERIF, fontSize: 42, lineHeight: 1.05, marginTop: 2,
          color: phosphorOn ? PANEL.phosphor : 'rgba(143,209,122,0.22)',
          textShadow: phosphorOn ? `0 0 18px ${PANEL.phosphor}, 0 0 6px ${PANEL.phosphor}` : 'none',
          transition: 'color .15s, text-shadow .15s',
        }}>
          {detectedChord}
        </div>
      </div>

      {/* ── Preset picker (styled native select; ~15-20 voicings per instrument) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Engrave>Preset Voicing</Engrave>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedPreset}
            onChange={(e) => applyPreset(e.target.value)}
            style={{
              width: '100%', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
              padding: '11px 34px 11px 14px', borderRadius: 9, outline: 'none',
              fontFamily: MONO, fontSize: 12, letterSpacing: 0.5,
              color: selectedPreset ? PANEL.brassLite : PANEL.inkMute,
              background: 'linear-gradient(180deg,#221c15,#181410)',
              border: 'none', boxShadow: `inset 0 0 0 1px ${PANEL.line}, inset 0 1px 3px rgba(0,0,0,0.5)`,
            }}
          >
            <option value="">— Select a voicing —</option>
            {availablePresets.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{
            position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: PANEL.brass, fontSize: 9,
          }}>▼</span>
        </div>
      </div>

      {/* ── Action buttons: PLAY + CLEAR (brass) ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => playChord()}
          style={{
            flex: 2, padding: '14px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
            fontFamily: SERIF, fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', color: '#1a0d04',
            background: `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`,
            boxShadow: `0 0 18px rgba(202,160,82,0.35), inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.4)`,
          }}
        >
          ▶ Play
        </button>
        <button
          onClick={() => setStringFrets(new Array(activeTuning.notes.length).fill(0))}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 10, cursor: 'pointer',
            fontFamily: MONO, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: PANEL.inkMute,
            background: 'linear-gradient(180deg,#211c16,#14100c)',
            border: `1px solid ${PANEL.brassDark}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        >
          Clear
        </button>
      </div>

      {/* ── Vertical walnut fretboard ── */}
      <Engrave>Tap to set · tap again to mute</Engrave>
      {activeTuning && (
        <div style={{ display: 'flex', gap: 8 }}>
          {/* fret-number engraving gutter */}
          <div style={{ flex: `0 0 ${LABEL_GUTTER}px`, display: 'flex', flexDirection: 'column', paddingTop: 26 }}>
            <div style={{ height: NUT_ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: PANEL.inkMute, paddingRight: 6 }}>NUT</span>
            </div>
            {FRETS.map((fretNum) => (
              <div key={fretNum} style={{ height: FRET_ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{
                  fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, paddingRight: 6,
                  color: [3, 5, 7, 9, 12].includes(fretNum) ? PANEL.brass : PANEL.inkMute,
                }}>{fretNum}</span>
              </div>
            ))}
          </div>

          {/* walnut neck */}
          <div style={{
            flex: 1, position: 'relative', borderRadius: 10, overflow: 'hidden',
            background: `linear-gradient(180deg, ${PANEL.wood1}, ${PANEL.wood2})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px ${PANEL.brassDark}`,
          }}>
            {/* string-label header (open-note discs, one per visible string) */}
            <div style={{ display: 'flex', height: 26, alignItems: 'center', padding: '0 4px' }}>
              {renderOrder.map((stringIdx) => {
                const noteDef = activeTuning.notes[stringIdx];
                return (
                  <div key={stringIdx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#1a0d04',
                      background: `radial-gradient(circle at 35% 28%, ${PANEL.brassLite}, ${PANEL.brass} 60%, ${PANEL.brassDark})`,
                      boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.6), 0 1px 2px rgba(0,0,0,0.5)',
                    }}>
                      {noteDef.note.replace(/\d+/, '')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* fretboard rows region */}
            <div style={{ position: 'relative' }}>
              {/* brass nut (top edge of open row) */}
              <div style={{
                position: 'absolute', top: 0, left: 4, right: 4, height: 5, borderRadius: 2, zIndex: 4,
                background: `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }} />

              {/* brass fret wires (below the open row, between fret rows) */}
              {FRETS.map((fretNum) => (
                <div key={fretNum} style={{
                  position: 'absolute', left: 4, right: 4, height: 2, borderRadius: 2, zIndex: 1,
                  top: NUT_ROW_H + fretNum * FRET_ROW_H,
                  background: `linear-gradient(180deg, ${PANEL.brass}, ${PANEL.brassDark})`,
                  boxShadow: '0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.3)',
                }} />
              ))}

              {/* metal strings (vertical lines, thicker toward the bass side) */}
              {renderOrder.map((stringIdx, col) => {
                // Bass side = lowest tuning index; column nearest it is thickest.
                const thickness = 1 + (stringIdx * 0.3);
                return (
                  <div key={stringIdx} style={{
                    position: 'absolute', top: 0, bottom: 0, zIndex: 2, width: thickness,
                    left: `calc(${((col + 0.5) / numStrings) * 100}% - ${thickness / 2}px)`,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(180,170,150,0.55))',
                    boxShadow: '0 0 1px rgba(0,0,0,0.5)',
                  }} />
                );
              })}

              {/* center-line inlay dots (3,5,7,9,12 double) */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 30, zIndex: 1, pointerEvents: 'none' }}>
                {[3, 5, 7, 9, 12].map((fret) => {
                  const cy = NUT_ROW_H + (fret - 0.5) * FRET_ROW_H;
                  if (fret === 12) {
                    return (
                      <React.Fragment key={fret}>
                        <div style={{ position: 'absolute', top: cy, left: '50%', transform: 'translate(-130%,-50%)', width: 9, height: 9, borderRadius: '50%', background: PANEL.ink, opacity: 0.28 }} />
                        <div style={{ position: 'absolute', top: cy, left: '50%', transform: 'translate(30%,-50%)', width: 9, height: 9, borderRadius: '50%', background: PANEL.ink, opacity: 0.28 }} />
                      </React.Fragment>
                    );
                  }
                  return (
                    <div key={fret} style={{ position: 'absolute', top: cy, left: '50%', transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: PANEL.ink, opacity: 0.28 }} />
                  );
                })}
              </div>

              {/* tap grid: one column per string, rows = open + 12 frets */}
              <div style={{ display: 'flex', position: 'relative', zIndex: 5 }}>
                {renderOrder.map((stringIdx) => {
                  const noteDef = activeTuning.notes[stringIdx];
                  const isSelected = stringFrets[stringIdx];

                  // Banjo 5th String Logic: In standard tuning, string 5 starts at 5th fret.
                  const isBanjo5th = activeInstrument === 'Banjo' && noteDef.stringNum === 5;

                  return (
                    <div key={stringIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Open / Nut cell */}
                      <div
                        onClick={() => handleFretClick(stringIdx, 0)}
                        style={{
                          height: NUT_ROW_H, position: 'relative', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isSelected === -1 && (
                          <span style={{ color: '#c45a3a', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>✕</span>
                        )}
                        {isSelected === 0 && (
                          <div style={{
                            width: 15, height: 15, borderRadius: '50%', boxSizing: 'border-box',
                            border: `2px solid ${PANEL.phosphor}`, background: 'transparent',
                            boxShadow: `0 0 10px ${PANEL.phosphor}`,
                          }} />
                        )}
                      </div>

                      {/* Fretted cells 1..12 */}
                      {FRETS.map((fretNum) => {
                        const active = isSelected === fretNum;
                        const isDisabled = isBanjo5th && fretNum < 5; // Banjo 5th string short

                        return (
                          <div
                            key={fretNum}
                            onClick={() => !isDisabled && handleFretClick(stringIdx, fretNum)}
                            style={{
                              height: FRET_ROW_H, position: 'relative',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              background: isDisabled ? 'rgba(0,0,0,0.4)' : 'transparent',
                            }}
                          >
                            {isDisabled ? (
                              <span style={{ color: 'rgba(0,0,0,0.35)', fontFamily: MONO, fontSize: 9, userSelect: 'none' }}>///</span>
                            ) : (
                              active && (
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%', zIndex: 6,
                                  background: `radial-gradient(circle at 35% 28%, ${PANEL.brassLite}, ${PANEL.brass} 55%, ${PANEL.brassDark})`,
                                  boxShadow: `0 0 10px rgba(202,160,82,0.6), inset 0 1px 0 rgba(255,235,180,0.6), 0 1px 3px rgba(0,0,0,0.6)`,
                                }} />
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </SynthShell>
  );
};

export default ChordCreator;
