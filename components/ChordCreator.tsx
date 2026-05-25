
import React, { useState, useEffect } from 'react';
import { TuningDefinition } from '../types';
import { getNoteAtFret, identifyChord, playTone, INSTRUMENT_DATA } from '../services/audioUtils';

interface ChordCreatorProps {
  onClose: () => void;
  instrumentName: string;
  tuning: TuningDefinition;
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl shadow-2xl relative flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-950">
            <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
                    CHORD CREATOR
                </h2>
                {/* Instrument Switcher */}
                <select 
                    value={activeInstrument}
                    onChange={(e) => handleInstrumentChange(e.target.value)}
                    className="bg-gray-800 text-gray-200 text-xs font-bold px-2 py-1 rounded border border-gray-700 uppercase tracking-widest outline-none focus:border-neon-blue"
                >
                    <option value="Guitar">Guitar</option>
                    <option value="Banjo">Banjo</option>
                    <option value="Ukulele">Ukulele</option>
                    <option value="Mandolin">Mandolin</option>
                </select>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <select 
                    value={selectedPreset} 
                    onChange={(e) => applyPreset(e.target.value)}
                    className="flex-1 md:w-48 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-neon-blue outline-none px-3 py-2"
                >
                    <option value="">-- Select Preset --</option>
                    {availablePresets.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <button 
                    onClick={() => playChord()}
                    className="px-6 py-2 bg-neon-blue hover:bg-cyan-400 text-black font-bold rounded shadow-lg shadow-neon-blue/20 transition-transform active:scale-95"
                >
                    PLAY
                </button>
                
                <button onClick={onClose} className="text-gray-500 hover:text-white p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>

        {/* Info Display */}
        <div className="flex-none p-4 bg-gray-900 flex justify-center items-center border-b border-gray-800">
             <div className="text-center">
                 <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">DETECTED CHORD</div>
                 <div className={`text-4xl md:text-5xl font-black ${detectedChord === 'Unknown' ? 'text-gray-700' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`}>
                     {detectedChord}
                 </div>
             </div>
        </div>

        {/* Fretboard Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#1a1510] relative flex items-center shadow-inner">
            <div className="absolute inset-0 opacity-50 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(90deg, #2a2018 0%, #3e2f24 50%, #2a2018 100%)', backgroundSize: '200px 100%' }}>
            </div>

            <div className="min-w-max px-8 py-10 relative">
                {/* Nut Indicator */}
                <div className="absolute top-0 bottom-0 left-[68px] w-[6px] bg-[#e3dac9] z-10 shadow-lg border-r border-[#c0b090]"></div>

                {/* Grid */}
                <div className="flex flex-col gap-0 select-none">
                    
                    {/* Fret Numbers Row */}
                    <div className="flex h-8 mb-2">
                        <div className="w-[40px] flex-shrink-0"></div>
                        <div className="w-[40px] flex-shrink-0 text-center text-xs font-bold text-gray-500">OPEN</div>
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-[50px] flex-shrink-0 text-center text-xs font-bold text-white opacity-80" style={{ textShadow: '0 1px 2px black' }}>
                                {i + 1}
                            </div>
                        ))}
                    </div>

                    {/* Strings Rows */}
                    {activeTuning && renderOrder.map((stringIdx) => {
                         const noteDef = activeTuning.notes[stringIdx];
                         const isSelected = stringFrets[stringIdx];
                         
                         // Banjo 5th String Logic: In standard tuning, string 5 (index 4 in renderOrder usually) starts at 5th fret.
                         // INSTRUMENT_DATA defines Banjo string 5 as the high drone.
                         // If we are Banjo AND this is stringNum 5.
                         const isBanjo5th = activeInstrument === 'Banjo' && noteDef.stringNum === 5;

                         return (
                            <div key={stringIdx} className="flex h-[36px] relative group">
                                {/* String Label */}
                                <div className="w-[40px] flex-shrink-0 flex items-center justify-end pr-3">
                                    <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-300">
                                        {noteDef.note.replace(/\d+/,'')}
                                    </div>
                                </div>

                                {/* String Line */}
                                <div className="absolute left-[40px] right-0 top-1/2 -translate-y-1/2 bg-gray-400 pointer-events-none z-0 shadow-sm" 
                                     style={{ height: `${1 + (stringIdx * 0.3)}px` }}>
                                </div>

                                {/* Nut Slot */}
                                <div 
                                    onClick={() => handleFretClick(stringIdx, 0)}
                                    className={`w-[40px] flex-shrink-0 border-r border-gray-700/50 relative cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center z-20`}
                                >
                                    {isSelected === -1 && <span className="text-red-500 text-lg font-bold">✕</span>}
                                    {isSelected === 0 && <div className="w-4 h-4 rounded-full border-2 border-neon-blue bg-transparent shadow-[0_0_10px_#00f3ff]"></div>}
                                </div>

                                {/* Frets 1-12 */}
                                {[...Array(12)].map((_, i) => {
                                    const fretNum = i + 1;
                                    const active = isSelected === fretNum;
                                    const isDisabled = isBanjo5th && fretNum < 5; // Banjo 5th string short

                                    return (
                                        <div 
                                            key={fretNum}
                                            onClick={() => !isDisabled && handleFretClick(stringIdx, fretNum)}
                                            className={`w-[50px] flex-shrink-0 border-r border-[#666] relative flex items-center justify-center z-20 
                                                ${isDisabled ? 'bg-black/40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
                                            `}
                                            style={{ 
                                                borderImage: 'linear-gradient(to bottom, #888, #eee, #888) 1'
                                            }}
                                        >
                                            {isDisabled ? (
                                                <span className="text-black/30 text-xs select-none">///</span>
                                            ) : (
                                                active && (
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg transform scale-110 flex items-center justify-center text-[10px] font-bold text-white z-30"></div>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                         );
                    })}

                    {/* Inlay Layer */}
                    <div className="absolute top-[40px] bottom-0 left-[80px] right-0 pointer-events-none z-0">
                         <div className="w-full h-full relative">
                             {[3, 5, 7, 9, 12].map(fret => {
                                 const pixelLeft = 40 + (fret - 1) * 50 + 25;
                                 if (fret === 12) {
                                     return (
                                        <React.Fragment key={fret}>
                                            <div className="absolute top-1/3 -translate-y-1/2 w-4 h-4 rounded-full bg-[#e3dac9] opacity-40 shadow-inner" style={{ left: pixelLeft }}></div>
                                            <div className="absolute top-2/3 -translate-y-1/2 w-4 h-4 rounded-full bg-[#e3dac9] opacity-40 shadow-inner" style={{ left: pixelLeft }}></div>
                                        </React.Fragment>
                                     )
                                 }
                                 return (
                                     <div key={fret} className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#e3dac9] opacity-40 shadow-inner" style={{ left: pixelLeft }}></div>
                                 )
                             })}
                         </div>
                    </div>

                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ChordCreator;
