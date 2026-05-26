
import React, { useState, useEffect } from 'react';
import { SynthShell, Tabs, ChoiceButton, StatChip, Engrave, PANEL } from './synthkit';

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

    // Geometry (machined to fit a 390px phone with room to spare)
    const SPACING = 22;       // gap between strings
    const FRET_GAP = 46;      // gap between fret wires
    const PAD_X = 16;         // wood margin left/right of the outermost strings
    const TOP = 26;           // nut sits here
    const NUM_FRETS = 4;
    const boardWidth = (numStrings - 1) * SPACING + PAD_X * 2;
    const boardHeight = TOP + NUM_FRETS * FRET_GAP + 18;
    const isBarre = fretOffset > 0 || (instrument === 'Banjo' && shapeKey === 'A');

    const stringX = (i: number) => PAD_X + i * SPACING;

    return (
        <div
            style={{
                position: 'relative',
                width: `${boardWidth}px`,
                height: `${boardHeight}px`,
                margin: '0 auto',
                flexShrink: 0,
                borderRadius: 10,
                // walnut neck
                background: `linear-gradient(180deg, ${PANEL.wood1}, ${PANEL.wood2})`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.5), 0 0 0 1px ${PANEL.brassDark}`,
            }}
        >
            {/* fret-position engraving */}
            <span style={{
                position: 'absolute', left: -4, top: TOP - 4, transform: 'translateX(-100%)',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 8.5, letterSpacing: 1,
                color: PANEL.inkMute, whiteSpace: 'nowrap',
            }}>
                {fretOffset === 0 ? 'NUT' : `${fretOffset}fr`}
            </span>

            {/* nut (open) or top fret wire */}
            <div style={{
                position: 'absolute', top: TOP, left: PAD_X - 4, right: PAD_X - 4,
                height: fretOffset === 0 ? 4 : 2,
                borderRadius: 2,
                background: fretOffset === 0
                    ? `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`
                    : `linear-gradient(180deg, ${PANEL.brass}, ${PANEL.brassDark})`,
                boxShadow: '0 1px 1px rgba(0,0,0,0.5)',
            }} />

            {/* brass fret wires */}
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                    position: 'absolute',
                    top: TOP + i * FRET_GAP,
                    left: PAD_X - 4, right: PAD_X - 4,
                    height: 2, borderRadius: 2,
                    background: `linear-gradient(180deg, ${PANEL.brass}, ${PANEL.brassDark})`,
                    boxShadow: '0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.3)',
                }} />
            ))}

            {/* strings */}
            {stringIndices.map((s, i) => (
                <div key={s} style={{
                    position: 'absolute',
                    width: 1 + i * 0.25,                 // thicker toward the bass side
                    top: TOP, bottom: 14,
                    left: stringX(i),
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.35), rgba(180,170,150,0.5))',
                    boxShadow: '0 0 1px rgba(0,0,0,0.5)',
                }} />
            ))}

            {/* finger dots */}
            {notes.map((n: any, i: number) => {
                // Guitar: S6 is left (index 0), S1 is right
                // Banjo/Mando/Violin: S4 is left (index 0), S1 is right
                const visualIndex = numStrings - n.s;
                const open = n.f === 0;
                const cx = stringX(visualIndex);
                const cy = TOP + (n.f - 0.5) * FRET_GAP;       // centered in the fret slot
                if (open) {
                    // open string → hollow brass ring above the nut
                    return (
                        <div key={i} style={{
                            position: 'absolute', width: 13, height: 13, borderRadius: '50%',
                            left: cx - 6.5, top: TOP - 17,
                            border: `1.5px solid ${PANEL.brassLite}`, background: 'transparent',
                            boxSizing: 'border-box',
                        }} />
                    );
                }
                return (
                    <div key={i} style={{
                        position: 'absolute', width: 18, height: 18, borderRadius: '50%', zIndex: 3,
                        left: cx - 9, top: cy - 9,
                        background: `radial-gradient(circle at 35% 28%, ${PANEL.brassLite}, ${PANEL.brass} 55%, ${PANEL.brassDark})`,
                        boxShadow: `0 0 8px rgba(202,160,82,0.55), inset 0 1px 0 rgba(255,235,180,0.6), 0 1px 2px rgba(0,0,0,0.6)`,
                    }} />
                );
            })}

            {/* barre / root band */}
            {isBarre && (
                <div style={{
                    position: 'absolute', height: 16, borderRadius: 8,
                    top: TOP + FRET_GAP * 0.5 - 8, left: PAD_X - 6, right: PAD_X - 6, zIndex: 2,
                    background: 'linear-gradient(180deg, rgba(202,160,82,0.4), rgba(138,106,46,0.35))',
                    boxShadow: `inset 0 0 0 1px ${PANEL.brass}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7, letterSpacing: 1.5, color: '#1a0d04', fontWeight: 700 }}>ROOT</span>
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

  const won = feedback === 'CORRECT!';

  return (
    <SynthShell name="CAGED System" tag="Movable Shapes · Chart & Quiz" onClose={onClose} accent={PANEL.brass}>
      <Tabs options={['Chart', 'Quiz']} value={mode === 'chart' ? 0 : 1} onChange={(i) => setMode(i === 0 ? 'chart' : 'game')} />

      {/* ── Instrument selector (brass-button row, matches Nashville key row) ── */}
      <Engrave>Instrument</Engrave>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(['Guitar', 'Banjo', 'Mandolin', 'Violin'] as InstrumentType[]).map(inst => (
          <button key={inst} onClick={() => setInstrument(inst)} style={{
            flex: '1 1 calc(50% - 6px)', minWidth: 72, padding: '9px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
            fontFamily: '"DM Serif Display", serif', fontSize: 15,
            background: instrument === inst ? `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` : '#181410',
            color: instrument === inst ? '#1a0d04' : PANEL.ink,
            boxShadow: instrument === inst ? `0 0 14px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.line}`,
          }}>{inst}</button>
        ))}
      </div>

      {/* ── CHART ── */}
      {mode === 'chart' && (
        <>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, color: PANEL.inkMute, textAlign: 'center', lineHeight: 1.6 }}>
            {instrument === 'Guitar' && <>The <b style={{ color: PANEL.brassLite }}>CAGED</b> system plays one chord in 5 positions up the neck — five open shapes that slide.</>}
            {instrument === 'Banjo' && <>Three movable major shapes: <b style={{ color: PANEL.brassLite }}>F</b>, <b style={{ color: PANEL.brassLite }}>D</b>, and <b style={{ color: PANEL.brassLite }}>A</b> (barre).</>}
            {(instrument === 'Mandolin' || instrument === 'Violin') && <>Movable <b style={{ color: PANEL.brassLite }}>G · C · D · A</b> shapes navigate the neck in GDAE tuning.</>}
          </span>

          <Engrave>Shapes</Engrave>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>
            {activeKeys.map(key => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: PANEL.ink }}>
                  {key} <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: PANEL.inkMute, letterSpacing: 1 }}>SHAPE</span>
                </span>
                <FretboardDiagram shapeKey={key} instrument={instrument} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── QUIZ ── */}
      {mode === 'game' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <StatChip label="Score" value={score} accent={PANEL.brassLite} />
            {feedback && (
              <span style={{
                fontFamily: '"DM Serif Display", serif', fontSize: 22, letterSpacing: 0.5,
                color: won ? PANEL.phosphor : '#e6b0a0',
                textShadow: won ? `0 0 16px ${PANEL.phosphor}` : 'none',
              }}>{won ? 'Correct!' : 'Try again'}</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
            <FretboardDiagram shapeKey={targetShape} fretOffset={fretOffset} instrument={instrument} />
          </div>

          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: 2, color: PANEL.inkMute, textTransform: 'uppercase', textAlign: 'center' }}>
            Which {instrument} shape is this?
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
            {activeKeys.map(key => {
              // Original wiring only records right/wrong globally (no stored guess),
              // so reveal the target as phosphor on a win; a miss shows the rust banner.
              const state = won && key === targetShape ? 'correct' : 'idle';
              return (
                <div key={key} style={{ flex: '1 1 0', minWidth: 56, maxWidth: 96 }}>
                  <ChoiceButton label={key} state={state} onClick={() => handleGuess(key)} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </SynthShell>
  );
};

export default CagedSystemGame;
