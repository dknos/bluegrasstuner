
import React, { useState, useEffect } from 'react';

interface CagedSystemGameProps {
  onClose: () => void;
}

const CAGED_SHAPES_GUITAR = {
  "C": { name: "C Shape", notes: [{s:5, f:3}, {s:4, f:2}, {s:2, f:1}], barre: null },
  "A": { name: "A Shape", notes: [{s:4, f:2}, {s:3, f:2}, {s:2, f:2}], barre: null }, 
  "G": { name: "G Shape", notes: [{s:6, f:3}, {s:5, f:2}, {s:1, f:3}], barre: null },
  "E": { name: "E Shape", notes: [{s:5, f:2}, {s:4, f:2}, {s:3, f:1}], barre: null },
  "D": { name: "D Shape", notes: [{s:3, f:2}, {s:2, f:3}, {s:1, f:2}], barre: null }
};

const FDA_SHAPES_BANJO = {
  "F": { name: "F Shape", notes: [{s:4, f:3}, {s:3, f:2}, {s:2, f:1}, {s:1, f:3}], barre: null },
  "D": { name: "D Shape", notes: [{s:4, f:0}, {s:3, f:2}, {s:2, f:3}, {s:1, f:4}], barre: null },
  "A": { name: "A Shape (Barre)", notes: [{s:4, f:0}, {s:3, f:0}, {s:2, f:0}, {s:1, f:0}], barre: true } // Visualized as open or barre line
};

const SHAPES_MANDO_VIOLIN = {
  "G": { name: "G Shape", notes: [{s:4, f:0}, {s:3, f:0}, {s:2, f:2}, {s:1, f:3}], barre: null },
  "C": { name: "C Shape", notes: [{s:4, f:0}, {s:3, f:2}, {s:2, f:3}, {s:1, f:0}], barre: null },
  "D": { name: "D Shape", notes: [{s:4, f:2}, {s:3, f:0}, {s:2, f:0}, {s:1, f:2}], barre: null },
  "A": { name: "A Shape", notes: [{s:4, f:2}, {s:3, f:2}, {s:2, f:4}, {s:1, f:0}], barre: null }
};

const GUITAR_KEYS = ["C", "A", "G", "E", "D"];
const BANJO_KEYS = ["F", "D", "A"];
const MANDO_KEYS = ["G", "C", "D", "A"];

type InstrumentType = 'Guitar' | 'Banjo' | 'Mandolin' | 'Violin';

const FretboardDiagram: React.FC<{
    shapeKey: string;
    fretOffset?: number;
    instrument: InstrumentType;
}> = ({ shapeKey, fretOffset = 0, instrument }) => {
    let shapes: any;
    if (instrument === 'Guitar') shapes = CAGED_SHAPES_GUITAR;
    else if (instrument === 'Banjo') shapes = FDA_SHAPES_BANJO;
    else shapes = SHAPES_MANDO_VIOLIN;

    const shape = shapes[shapeKey];
    
    // Safety check: during instrument switch, shapeKey might be invalid for new instrument
    if (!shape) return null;

    const notes = shape.notes;
    
    // Strings: Guitar 6, others 4
    const numStrings = instrument === 'Guitar' ? 6 : 4;
    const stringIndices = instrument === 'Guitar' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
    
    // Width calc
    const stringSpacing = 20;
    const boardWidth = (numStrings - 1) * stringSpacing + 52;

    return (
        <div 
            className="bg-gray-800 rounded-xl relative border-2 border-gray-700 shadow-xl mx-auto flex-shrink-0 transition-all"
            style={{ width: `${boardWidth}px`, height: '256px' }}
        >
            {/* Header (Fret Number) */}
            <div className="absolute -left-6 top-8 text-xs font-mono text-gray-500">
                {fretOffset === 0 ? "Nut" : `fr${fretOffset}`}
            </div>
            
            {/* Nut or Barre Line */}
            <div className={`absolute top-4 left-4 right-4 h-2 ${fretOffset === 0 ? 'bg-gray-400' : 'bg-transparent'}`}></div>

            {/* Strings */}
            {stringIndices.map((s, i) => (
                <div key={s} className="absolute bg-gray-600" style={{
                    width: '1px', 
                    top: '24px', 
                    bottom: '24px', 
                    left: `${i * stringSpacing + 26}px`
                }}></div>
            ))}

            {/* Frets */}
            {[1, 2, 3, 4].map(i => (
                 <div key={i} className="absolute bg-gray-500" style={{
                    height: '1px',
                    left: '10px',
                    right: '10px',
                    top: `${i * 50 + 20}px`
                }}></div>
            ))}

            {/* Dots */}
            {notes.map((n: any, i: number) => {
                // Calculate position based on string index
                // Guitar: S6 is left (index 0), S1 is right
                // Banjo/Mando/Violin: S4 is left (index 0), S1 is right
                const visualIndex = numStrings - n.s;
                
                return (
                    <div key={i} className="absolute w-5 h-5 rounded-full bg-neon-blue border border-white shadow-lg flex items-center justify-center z-10" 
                        style={{
                            left: `${visualIndex * stringSpacing + 26 - 10}px`,
                            top: `${n.f * 50 + 20 - 25}px`
                        }}
                    >
                    </div>
                );
            })}
            
            {/* Barre Visual */}
            {(fretOffset > 0 || (instrument === 'Banjo' && shapeKey === 'A')) && (
                 <div className="absolute h-4 rounded-full bg-blue-500/30 border border-blue-400/50"
                     style={{
                         top: '35px', // Fret 0/Nut position approx
                         left: '20px',
                         right: '20px'
                     }}
                 >
                     <div className="w-full text-center text-[8px] text-white font-bold leading-4">ROOT</div>
                 </div>
            )}
        </div>
    );
}

const CagedSystemGame: React.FC<CagedSystemGameProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'chart' | 'game'>('chart');
  const [instrument, setInstrument] = useState<InstrumentType>('Guitar');
  
  // Game State
  const [targetShape, setTargetShape] = useState<string>("C");
  const [fretOffset, setFretOffset] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const getActiveKeys = (inst: InstrumentType) => {
      if (inst === 'Guitar') return GUITAR_KEYS;
      if (inst === 'Banjo') return BANJO_KEYS;
      return MANDO_KEYS;
  };

  const activeKeys = getActiveKeys(instrument);

  const startRound = () => {
      const keys = getActiveKeys(instrument);
      const randomShape = keys[Math.floor(Math.random() * keys.length)];
      const randomFret = Math.floor(Math.random() * 5); // 0 to 4 offset
      setTargetShape(randomShape);
      setFretOffset(randomFret);
      setFeedback(null);
  };

  const handleGuess = (guess: string) => {
      if (guess === targetShape) {
          setFeedback("CORRECT!");
          setScore(s => s + 1);
          setTimeout(startRound, 1000);
      } else {
          setFeedback("TRY AGAIN");
      }
  };
  
  // Initial game start & reset on instrument change
  useEffect(() => {
      setScore(0);
      if (mode === 'game') startRound();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, instrument]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600">
                CHORD SHAPES & SYSTEMS
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {/* Tab Switcher & Instrument Toggle */}
        <div className="flex-none flex flex-col md:flex-row bg-gray-950 border-b border-gray-800">
            <div className="flex flex-1">
                <button 
                    onClick={() => setMode('chart')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'chart' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Chart
                </button>
                <button 
                    onClick={() => setMode('game')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'game' ? 'bg-pink-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Quiz
                </button>
            </div>
            
            {/* Instrument Toggle */}
            <div className="flex items-center justify-center p-2 bg-gray-900 gap-2 overflow-x-auto">
                <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                    {(['Guitar', 'Banjo', 'Mandolin', 'Violin'] as InstrumentType[]).map(inst => (
                        <button 
                            key={inst}
                            onClick={() => setInstrument(inst)}
                            className={`px-2 py-1 text-[10px] md:text-xs font-bold rounded uppercase transition-colors ${instrument === inst ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            {inst}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-900 flex flex-col items-center">
            
            {mode === 'chart' && (
                <div className="w-full flex flex-col items-center">
                     <p className="text-center text-gray-400 mb-6 max-w-lg text-sm">
                        {instrument === 'Guitar' && "The CAGED system allows you to play the same chord in 5 different positions up the neck by connecting these 5 fundamental open shapes."}
                        {instrument === 'Banjo' && "The Banjo uses three primary movable major chord shapes: F-Shape, D-Shape, and A-Shape (Barre)."}
                        {(instrument === 'Mandolin' || instrument === 'Violin') && "Mandolin and Violin use movable G, C, D, and A shapes to navigate the fretboard/fingerboard in GDAE tuning."}
                     </p>
                     
                     <div className="flex flex-wrap justify-center gap-8">
                        {activeKeys.map(key => (
                            <div key={key} className="flex flex-col items-center">
                                <h3 className="text-xl font-black text-white mb-2">{key} <span className="text-gray-500 text-sm">Shape</span></h3>
                                <FretboardDiagram shapeKey={key} instrument={instrument} />
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {mode === 'game' && (
                <div className="flex flex-col items-center justify-center w-full max-w-md my-auto">
                     <div className="flex justify-between w-full mb-6 items-center">
                        <div className="text-gray-500 text-sm font-bold">SCORE: <span className="text-white text-xl">{score}</span></div>
                        {feedback && (
                            <div className={`font-bold px-3 py-1 rounded ${feedback === 'CORRECT!' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'} animate-bounce`}>
                                {feedback}
                            </div>
                        )}
                     </div>
                     
                     <div className="mb-8 transform scale-110 md:scale-125">
                         <FretboardDiagram shapeKey={targetShape} fretOffset={fretOffset} instrument={instrument} />
                     </div>
                     
                     <p className="text-gray-400 text-sm mb-4">Which {instrument} shape is this?</p>
                     
                     <div className="flex flex-wrap justify-center gap-2 w-full">
                         {activeKeys.map(key => (
                             <button
                                key={key}
                                onClick={() => handleGuess(key)}
                                className="w-16 h-16 rounded-xl bg-gray-800 border-2 border-gray-600 hover:border-pink-500 hover:bg-gray-700 text-white font-black text-xl transition-all active:scale-95 shadow-lg"
                             >
                                 {key}
                             </button>
                         ))}
                     </div>
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
};

export default CagedSystemGame;
