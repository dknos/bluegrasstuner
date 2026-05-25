
import React from 'react';
import { TuningDefinition, NoteDefinition } from '../types';

interface InstrumentGraphicProps {
  instrumentName: string;
  tuning: TuningDefinition;
  currentNote: string | null; 
  manualStringIndex: number | null;
  onPegClick: (stringNum: number, freq: number) => void;
  isTuneByEar: boolean;
}

const InstrumentGraphic: React.FC<InstrumentGraphicProps> = ({ 
    instrumentName, 
    tuning, 
    currentNote, 
    manualStringIndex, 
    onPegClick,
    isTuneByEar
}) => {
  const isGuitar = instrumentName === 'Guitar';
  const isBass = instrumentName === 'Bass';
  const isBanjo = instrumentName === 'Banjo';
  const isCompact = ['Ukulele', 'Mandolin', 'Violin'].includes(instrumentName);

  if (!tuning || !tuning.notes) {
      return (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm animate-pulse">
              Loading...
          </div>
      );
  }

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center p-4 select-none bg-gray-900/50">
       
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 opacity-20 transition-opacity duration-1000 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        <h3 className="text-xl md:text-2xl font-black text-white mb-1 uppercase tracking-widest drop-shadow-lg text-center opacity-90">
            {tuning.name}
        </h3>
        <p className="text-[10px] md:text-xs text-neon-blue mb-4 drop-shadow-md bg-black/60 px-4 py-1 rounded-full uppercase font-bold tracking-wider border border-neon-blue/20">
            {isTuneByEar ? "Tap Peg to Hear Note" : "Tap Peg to Select String"}
        </p>

        {/* Interactive Headstock SVG */}
        <div className="relative w-full max-w-[320px] md:max-w-[400px] aspect-[3/4] md:aspect-[4/3] flex items-center justify-center filter drop-shadow-2xl">
            {isGuitar && <GuitarHeadstock notes={tuning.notes} currentNote={currentNote} manualStringIndex={manualStringIndex} onPegClick={onPegClick} />}
            {isBass && <BassHeadstock notes={tuning.notes} currentNote={currentNote} manualStringIndex={manualStringIndex} onPegClick={onPegClick} />}
            {isBanjo && <BanjoHeadstock notes={tuning.notes} currentNote={currentNote} manualStringIndex={manualStringIndex} onPegClick={onPegClick} />}
            {isCompact && <CompactHeadstock notes={tuning.notes} currentNote={currentNote} manualStringIndex={manualStringIndex} onPegClick={onPegClick} />}
        </div>
      </div>
    </div>
  );
};

export default InstrumentGraphic;

// ------------------------------------------------------------------
// ASSETS & DEFS
// ------------------------------------------------------------------

const SvgDefs = () => (
    <defs>
        <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3E2723" /> {/* Dark Mahogany */}
            <stop offset="20%" stopColor="#5D4037" />
            <stop offset="50%" stopColor="#795548" /> {/* Lighter grain */}
            <stop offset="80%" stopColor="#5D4037" />
            <stop offset="100%" stopColor="#3E2723" />
        </linearGradient>

        <linearGradient id="ebonyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#050505" /> 
            <stop offset="30%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#262626" /> 
            <stop offset="70%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDD835" />
            <stop offset="50%" stopColor="#FBC02D" />
            <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>

        <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="50%" stopColor="#BDBDBD" />
            <stop offset="100%" stopColor="#757575" />
        </linearGradient>

        <linearGradient id="pearlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#E0F2F1" /> {/* Slight pearl/cyan tint */}
            <stop offset="80%" stopColor="#CFD8DC" />
            <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        <linearGradient id="stringGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#90CAF9" />
            <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        
        <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        
        <filter id="shadow">
             <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.5"/>
        </filter>

        <filter id="inlayGlow">
            <feGaussianBlur stdDeviation="0.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
    </defs>
);

// ------------------------------------------------------------------
// SUB-COMPONENTS
// ------------------------------------------------------------------

interface HeadstockProps {
  notes: NoteDefinition[];
  currentNote: string | null;
  manualStringIndex: number | null;
  onPegClick: (stringNum: number, freq: number) => void;
}

const Peg: React.FC<{
  x: number;
  y: number;
  note: NoteDefinition;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
  labelSide?: 'left' | 'right' | 'top' | 'bottom';
  type?: 'gold' | 'chrome' | 'pearl';
}> = ({ x, y, note, isActive, isCurrent, onClick, labelSide = 'left', type = 'chrome' }) => {
  let gradientId = "url(#chromeGradient)";
  if (type === 'gold') gradientId = "url(#goldGradient)";
  if (type === 'pearl') gradientId = "url(#pearlGradient)";
  
  return (
    <g onClick={onClick} className="cursor-pointer group">
      {/* Active/Listening Glow Ring */}
      {(isActive || isCurrent) && (
        <circle cx={x} cy={y} r="24" fill="none" stroke={isActive ? "#00f3ff" : "#00ff00"} strokeWidth="2" className="animate-pulse" filter="url(#glow)" />
      )}
      
      {/* Peg Hardware (Washer) */}
      <circle cx={x} cy={y} r="14" fill="#111" stroke="#000" strokeWidth="1" />
      
      {/* Peg Button (The part you turn) */}
      <rect 
        x={x - 11} y={y - 9} width="22" height="18" rx="5" 
        fill={gradientId} stroke="#000" strokeWidth="0.5" 
        className="transition-transform duration-200 group-hover:scale-110 shadow-lg"
      />
      
      {/* Label */}
      <text 
        x={x + (labelSide === 'left' ? -28 : labelSide === 'right' ? 28 : 0)} 
        y={y + (labelSide === 'top' ? -25 : labelSide === 'bottom' ? 35 : 5)} 
        textAnchor={labelSide === 'top' || labelSide === 'bottom' ? 'middle' : (labelSide === 'left' ? 'end' : 'start')}
        fill="white" 
        className={`text-sm font-black pointer-events-none drop-shadow-md ${isActive ? 'fill-neon-blue' : (isCurrent ? 'fill-green-400' : '')}`}
        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
      >
        {note.note}
      </text>
      
      {/* String Number Small Label */}
      <text 
         x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold" pointerEvents="none"
      >
          {note.stringNum}
      </text>
    </g>
  );
};

const StringLine: React.FC<{
    x1: number; y1: number; x2: number; y2: number; 
    gauge: number; 
    isActive: boolean;
}> = ({ x1, y1, x2, y2, gauge, isActive }) => (
    <line 
        x1={x1} y1={y1} x2={x2} y2={y2} 
        stroke={isActive ? "#00f3ff" : "#E2E8F0"} 
        strokeWidth={gauge} 
        opacity={isActive ? 1 : 0.8}
        className="transition-colors duration-300"
        filter={isActive ? "url(#glow)" : ""}
    />
);

// ------------------------------------------------------------------
// GUITAR
// ------------------------------------------------------------------
const GuitarHeadstock: React.FC<HeadstockProps> = ({ notes, currentNote, manualStringIndex, onPegClick }) => {
    // Standard 3x3 Layout
    // Left side (Top->Bottom): D, A, Low E
    // Right side (Top->Bottom): G, B, High E
    
    const s6 = notes.find(n => n.stringNum === 6); // Low E
    const s5 = notes.find(n => n.stringNum === 5);
    const s4 = notes.find(n => n.stringNum === 4);
    const s3 = notes.find(n => n.stringNum === 3);
    const s2 = notes.find(n => n.stringNum === 2);
    const s1 = notes.find(n => n.stringNum === 1); // High E

    const nutY = 280;
    const nutL = 100; const nutR = 200;
    const spacing = (nutR - nutL) / 5;

    return (
        <svg viewBox="0 0 300 320" className="w-full h-full drop-shadow-2xl">
            <SvgDefs />
            
            {/* Headstock Shape (Martin Style) */}
            <path d="M90 320 L90 220 L70 50 L150 20 L230 50 L210 220 L210 320 Z" fill="url(#woodGradient)" stroke="#2d3748" strokeWidth="4" />
            
            {/* Nut Graphic */}
            <rect x="90" y="275" width="120" height="10" fill="#F7FAFC" stroke="#CBD5E0" />

            {/* Strings */}
            {s6 && <StringLine x1={100} y1={nutY} x2={70} y2={170} gauge={4.0} isActive={manualStringIndex === 6} />}
            {s5 && <StringLine x1={100 + spacing} y1={nutY} x2={70} y2={110} gauge={3.2} isActive={manualStringIndex === 5} />}
            {s4 && <StringLine x1={100 + spacing*2} y1={nutY} x2={70} y2={50} gauge={2.5} isActive={manualStringIndex === 4} />}
            
            {s3 && <StringLine x1={100 + spacing*3} y1={nutY} x2={230} y2={50} gauge={2.0} isActive={manualStringIndex === 3} />}
            {s2 && <StringLine x1={100 + spacing*4} y1={nutY} x2={230} y2={110} gauge={1.5} isActive={manualStringIndex === 2} />}
            {s1 && <StringLine x1={200} y1={nutY} x2={230} y2={170} gauge={1.0} isActive={manualStringIndex === 1} />}

            {/* Pegs */}
            {s4 && <Peg x={70} y={50} note={s4} isActive={manualStringIndex === 4} isCurrent={currentNote === s4.note.replace(/\d+/,'')} onClick={() => onPegClick(4, s4.freq)} labelSide="left" />}
            {s5 && <Peg x={70} y={110} note={s5} isActive={manualStringIndex === 5} isCurrent={currentNote === s5.note.replace(/\d+/,'')} onClick={() => onPegClick(5, s5.freq)} labelSide="left" />}
            {s6 && <Peg x={70} y={170} note={s6} isActive={manualStringIndex === 6} isCurrent={currentNote === s6.note.replace(/\d+/,'')} onClick={() => onPegClick(6, s6.freq)} labelSide="left" />}

            {s3 && <Peg x={230} y={50} note={s3} isActive={manualStringIndex === 3} isCurrent={currentNote === s3.note.replace(/\d+/,'')} onClick={() => onPegClick(3, s3.freq)} labelSide="right" />}
            {s2 && <Peg x={230} y={110} note={s2} isActive={manualStringIndex === 2} isCurrent={currentNote === s2.note.replace(/\d+/,'')} onClick={() => onPegClick(2, s2.freq)} labelSide="right" />}
            {s1 && <Peg x={230} y={170} note={s1} isActive={manualStringIndex === 1} isCurrent={currentNote === s1.note.replace(/\d+/,'')} onClick={() => onPegClick(1, s1.freq)} labelSide="right" />}
        </svg>
    );
};

// ------------------------------------------------------------------
// BASS
// ------------------------------------------------------------------
const BassHeadstock: React.FC<HeadstockProps> = ({ notes, currentNote, manualStringIndex, onPegClick }) => {
    const stringCount = notes.length;
    const nutY = 280;
    const nutStart = 110; 
    const nutWidth = 80;
    const spacing = nutWidth / (stringCount - 1);

    return (
        <svg viewBox="0 0 300 320" className="w-full h-full drop-shadow-2xl">
             <SvgDefs />
             <path d="M110 320 L100 200 L70 40 L150 20 L230 40 L200 200 L190 320 Z" fill="url(#woodGradient)" stroke="#2d3748" strokeWidth="4" />
             <rect x="100" y="275" width="100" height="12" fill="#F7FAFC" stroke="#CBD5E0" />

             {notes.map((n, i) => {
                 const isLeft = i < Math.ceil(stringCount / 2);
                 const sideIndex = isLeft ? i : i - Math.ceil(stringCount / 2);
                 const pegX = isLeft ? 70 : 230;
                 const pegY = 180 - (sideIndex * 60); 
                 const stringX = nutStart + (i * spacing);
                 
                 return (
                    <React.Fragment key={n.stringNum}>
                        <StringLine x1={stringX} y1={nutY} x2={pegX} y2={pegY} gauge={4.0 - (i * 0.5)} isActive={manualStringIndex === n.stringNum} />
                        <Peg 
                            x={pegX} y={pegY} 
                            note={n} 
                            isActive={manualStringIndex === n.stringNum}
                            isCurrent={currentNote === n.note.replace(/\d+/,'')}
                            onClick={() => onPegClick(n.stringNum, n.freq)}
                            labelSide={isLeft ? 'left' : 'right'}
                            type="chrome"
                        />
                    </React.Fragment>
                 )
             })}
        </svg>
    );
};

// ------------------------------------------------------------------
// BANJO (NECHVILLE STYLE)
// ------------------------------------------------------------------
const BanjoHeadstock: React.FC<HeadstockProps> = ({ notes, currentNote, manualStringIndex, onPegClick }) => {
    const stringCount = notes.length;
    if (stringCount === 6) return <GuitarHeadstock notes={notes} currentNote={currentNote} manualStringIndex={manualStringIndex} onPegClick={onPegClick} />;

    const s5 = notes.find(n => n.stringNum === 5);
    const s4 = notes.find(n => n.stringNum === 4);
    const s3 = notes.find(n => n.stringNum === 3);
    const s2 = notes.find(n => n.stringNum === 2);
    const s1 = notes.find(n => n.stringNum === 1);

    return (
        <svg viewBox="0 0 300 360" className="w-full h-full drop-shadow-2xl">
            <SvgDefs />
            
            {/* Neck Shaft - Ebony */}
            <rect x="120" y="130" width="60" height="230" fill="url(#ebonyGradient)" stroke="#0a0a0a" strokeWidth="1" />
            
            {/* Nechville-style Headstock Shape (Curvy Silhouette) */}
            <path d="
                M 120 130
                Q 90 115, 80 95 
                Q 75 80, 100 65
                Q 80 40, 95 25
                Q 115 5, 150 5
                Q 185 5, 205 25
                Q 220 40, 200 65
                Q 225 80, 220 95
                Q 210 115, 180 130
                Z
            " fill="url(#ebonyGradient)" stroke="#222" strokeWidth="2" />

            {/* Inlays: Nechville Logo (Script approx) */}
            <text x="150" y="30" textAnchor="middle" fontSize="18" fontFamily="cursive" fill="url(#pearlGradient)" className="italic tracking-wide" style={{filter: 'drop-shadow(0 0 1px black)'}}>
                Nechville
            </text>

            {/* Inlays: Floral/Comet style */}
            <g transform="translate(150, 65)">
                {/* Central Petal Down */}
                <path d="M 0 0 C -5 5, -5 25, 0 30 C 5 25, 5 5, 0 0 Z" fill="url(#pearlGradient)" filter="url(#inlayGlow)" />
                {/* Central Petal Up */}
                <path d="M 0 0 C -4 -4, -4 -15, 0 -20 C 4 -15, 4 -4, 0 0 Z" fill="url(#pearlGradient)" filter="url(#inlayGlow)" />
                {/* Side Wings */}
                <path d="M 0 5 C -10 5, -20 0, -25 -5 C -20 -8, -10 -5, 0 5 Z" fill="url(#pearlGradient)" filter="url(#inlayGlow)" />
                <path d="M 0 5 C 10 5, 20 0, 25 -5 C 20 -8, 10 -5, 0 5 Z" fill="url(#pearlGradient)" filter="url(#inlayGlow)" />
            </g>

            {/* Fretboard Inlay (at 5th string junction) */}
            <path d="M 150 240 L 140 250 L 150 260 L 160 250 Z" fill="url(#pearlGradient)" opacity="0.8" />
            
            {/* Nut */}
            <rect x="120" y="128" width="60" height="6" fill="#F0F0F0" />

            {/* STRINGS */}
            {/* 5th String - Side mount on neck (LEFT SIDE) */}
            {s5 && (
                <>
                    {/* String line running up neck */}
                    <line x1="126" y1="360" x2="126" y2="220" stroke="#CBD5E0" strokeWidth="1.5" opacity="0.8" />
                    {/* Angle to peg */}
                    <line x1="126" y1="220" x2="100" y2="220" stroke="#CBD5E0" strokeWidth="1.5" opacity="0.8" />
                </>
            )}

            {/* Main 4 Strings */}
            {/* Standard: 3/2 at top, 4/1 at bottom */}
            {s4 && <StringLine x1={135} y1={130} x2={100} y2={95} gauge={2.0} isActive={manualStringIndex === 4} />}
            {s3 && <StringLine x1={145} y1={130} x2={100} y2={45} gauge={1.8} isActive={manualStringIndex === 3} />}
            {s2 && <StringLine x1={155} y1={130} x2={200} y2={45} gauge={1.6} isActive={manualStringIndex === 2} />}
            {s1 && <StringLine x1={165} y1={130} x2={200} y2={95} gauge={1.4} isActive={manualStringIndex === 1} />}

            {/* Nut pass-through visuals */}
            <line x1="135" y1="360" x2="135" y2="130" stroke="#CBD5E0" strokeWidth="2.0" opacity="0.5" />
            <line x1="145" y1="360" x2="145" y2="130" stroke="#CBD5E0" strokeWidth="1.8" opacity="0.5" />
            <line x1="155" y1="360" x2="155" y2="130" stroke="#CBD5E0" strokeWidth="1.6" opacity="0.5" />
            <line x1="165" y1="360" x2="165" y2="130" stroke="#CBD5E0" strokeWidth="1.4" opacity="0.5" />

            {/* PEGS - All Pearl Buttons */}
            
            {/* 5th String Tuner - Side Mounted Geared Tuner (LEFT SIDE) */}
            {s5 && (
                <g onClick={() => onPegClick(5, s5.freq)} className="cursor-pointer">
                    {/* Hardware Housing sticking out side */}
                    <rect x="90" y="215" width="12" height="10" fill="silver" stroke="#333" strokeWidth="1" rx="1" />
                    {/* Peg Button - Pearl, sticking out to the left */}
                    <Peg x={75} y={220} note={s5} isActive={manualStringIndex === 5} isCurrent={currentNote === s5.note.replace(/\d+/,'')} onClick={() => {}} labelSide="top" type="pearl" />
                </g>
            )}

            {/* Headstock Pegs */}
            {s3 && <Peg x={100} y={45} note={s3} isActive={manualStringIndex === 3} isCurrent={currentNote === s3.note.replace(/\d+/,'')} onClick={() => onPegClick(3, s3.freq)} labelSide="left" type="pearl" />}
            {s2 && <Peg x={200} y={45} note={s2} isActive={manualStringIndex === 2} isCurrent={currentNote === s2.note.replace(/\d+/,'')} onClick={() => onPegClick(2, s2.freq)} labelSide="right" type="pearl" />}
            {s4 && <Peg x={100} y={95} note={s4} isActive={manualStringIndex === 4} isCurrent={currentNote === s4.note.replace(/\d+/,'')} onClick={() => onPegClick(4, s4.freq)} labelSide="left" type="pearl" />}
            {s1 && <Peg x={200} y={95} note={s1} isActive={manualStringIndex === 1} isCurrent={currentNote === s1.note.replace(/\d+/,'')} onClick={() => onPegClick(1, s1.freq)} labelSide="right" type="pearl" />}
        </svg>
    );
};

// ------------------------------------------------------------------
// COMPACT (Ukulele, Mandolin, Violin)
// ------------------------------------------------------------------
const CompactHeadstock: React.FC<HeadstockProps> = ({ notes, currentNote, manualStringIndex, onPegClick }) => {
    // 2x2 Layout
    const s4 = notes.find(n => n.stringNum === 4);
    const s3 = notes.find(n => n.stringNum === 3);
    const s2 = notes.find(n => n.stringNum === 2);
    const s1 = notes.find(n => n.stringNum === 1);

    return (
        <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl">
            <SvgDefs />
            {/* Elegant Rounded Shape */}
            <path d="M110 300 L110 200 L80 170 L80 50 L150 30 L220 50 L220 170 L190 200 L190 300 Z" fill="url(#woodGradient)" stroke="#2d3748" strokeWidth="4" />
            <rect x="110" y="280" width="80" height="8" fill="#F7FAFC" />

            {/* Strings */}
            {s4 && <StringLine x1={125} y1={280} x2={80} y2={130} gauge={2.0} isActive={manualStringIndex === 4} />}
            {s3 && <StringLine x1={140} y1={280} x2={80} y2={70} gauge={1.8} isActive={manualStringIndex === 3} />}
            {s2 && <StringLine x1={160} y1={280} x2={220} y2={70} gauge={1.6} isActive={manualStringIndex === 2} />}
            {s1 && <StringLine x1={175} y1={280} x2={220} y2={130} gauge={1.4} isActive={manualStringIndex === 1} />}

            {/* Pegs */}
            {s3 && <Peg x={80} y={70} note={s3} isActive={manualStringIndex === 3} isCurrent={currentNote === s3.note.replace(/\d+/,'')} onClick={() => onPegClick(3, s3.freq)} labelSide="left" />}
            {s4 && <Peg x={80} y={130} note={s4} isActive={manualStringIndex === 4} isCurrent={currentNote === s4.note.replace(/\d+/,'')} onClick={() => onPegClick(4, s4.freq)} labelSide="left" />}
            {s2 && <Peg x={220} y={70} note={s2} isActive={manualStringIndex === 2} isCurrent={currentNote === s2.note.replace(/\d+/,'')} onClick={() => onPegClick(2, s2.freq)} labelSide="right" />}
            {s1 && <Peg x={220} y={130} note={s1} isActive={manualStringIndex === 1} isCurrent={currentNote === s1.note.replace(/\d+/,'')} onClick={() => onPegClick(1, s1.freq)} labelSide="right" />}
        </svg>
    );
};
