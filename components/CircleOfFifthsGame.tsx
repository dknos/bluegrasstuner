
import React, { useState, useEffect, DragEvent, TouchEvent } from 'react';
import { CIRCLE_OF_FIFTHS_ORDER } from '../services/audioUtils';
import { SynthShell, Tabs, Engrave, PANEL } from './synthkit';

interface CircleOfFifthsGameProps {
  onClose: () => void;
}

interface DragItem {
    val: string;
    source: 'bank' | 'slot';
    index: number;
}

const CircleOfFifthsGame: React.FC<CircleOfFifthsGameProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'chart' | 'game'>('chart');

  // Slots represent positions 0 (top/12 o'clock) to 11.
  const [slots, setSlots] = useState<(string | null)[]>(Array(12).fill(null));
  const [bank, setBank] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(false);

  // Drag State
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<DragItem | null>(null); // For click-to-move

  // Mobile Touch Drag Visuals
  const [touchDragPos, setTouchDragPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    // Game Init
    const initialSlots = Array(12).fill(null);
    initialSlots[0] = "C"; // Lock C at top
    setSlots(initialSlots);

    const pieces = [...CIRCLE_OF_FIFTHS_ORDER].filter(n => n !== "C");
    // Shuffle
    const shuffled = pieces.sort(() => 0.5 - Math.random());
    setBank(shuffled);
  }, []);

  useEffect(() => {
      // Check win condition
      if (mode === 'game') {
        const currentString = slots.join(",");
        const targetString = CIRCLE_OF_FIFTHS_ORDER.join(",");
        if (currentString === targetString) {
            setIsWon(true);
        }
      }
  }, [slots, mode]);

  // --- LOGIC: Move Piece ---
  const executeMove = (item: DragItem, targetSlotIndex: number) => {
      if (targetSlotIndex === 0 && mode === 'game') return; // Locked in game mode

      const newSlots = [...slots];
      const newBank = [...bank];
      const existingInSlot = slots[targetSlotIndex];

      // Remove from source
      if (item.source === 'bank') {
          const idxInBank = newBank.indexOf(item.val);
          if (idxInBank > -1) newBank.splice(idxInBank, 1);
      } else {
          newSlots[item.index] = null;
      }

      // If target slot had a piece, move it back to bank
      if (existingInSlot) {
          newBank.push(existingInSlot);
      }

      // Place item
      newSlots[targetSlotIndex] = item.val;

      setSlots(newSlots);
      setBank(newBank);
  };

  const executeReturnToBank = (item: DragItem) => {
      if (item.source === 'bank') return; // Already there

      const newSlots = [...slots];
      newSlots[item.index] = null;

      const newBank = [...bank, item.val];

      setSlots(newSlots);
      setBank(newBank);
  };

  // --- DESKTOP: HTML5 Drag & Drop ---
  const handleDragStart = (e: DragEvent, val: string, source: 'bank' | 'slot', index: number) => {
      if (mode !== 'game') return;
      const item = { val, source, index };
      setDraggedItem(item);
      setSelectedItem(item);
      e.dataTransfer.setData("text/plain", JSON.stringify(item));
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnSlot = (e: DragEvent, slotIndex: number) => {
      e.preventDefault();
      if (mode !== 'game') return;
      try {
          const raw = e.dataTransfer.getData("text/plain");
          const item = raw ? JSON.parse(raw) : draggedItem;
          if (item) {
            executeMove(item, slotIndex);
            setDraggedItem(null);
            setSelectedItem(null);
          }
      } catch (err) { console.error(err); }
  };

  const handleDropOnBank = (e: DragEvent) => {
      e.preventDefault();
      if (mode !== 'game') return;
      try {
        const raw = e.dataTransfer.getData("text/plain");
        const item = raw ? JSON.parse(raw) : draggedItem;
        if (item) {
            executeReturnToBank(item);
            setDraggedItem(null);
            setSelectedItem(null);
        }
      } catch (err) { console.error(err); }
  };

  // --- MOBILE: Touch Events ---
  const handleTouchStart = (e: TouchEvent, val: string, source: 'bank' | 'slot', index: number) => {
      if (mode !== 'game') return;
      const touch = e.touches[0];
      const item = { val, source, index };
      setDraggedItem(item);
      setSelectedItem(item);
      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragPos || mode !== 'game') return;
      e.preventDefault();
      const touch = e.touches[0];
      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: TouchEvent) => {
      if (!draggedItem || !touchDragPos || mode !== 'game') return;

      const touch = e.changedTouches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);

      const slotEl = elements.find(el => el.getAttribute('data-type') === 'slot');
      const bankEl = elements.find(el => el.getAttribute('data-type') === 'bank');

      if (slotEl) {
          const idx = parseInt(slotEl.getAttribute('data-index') || '-1');
          if (idx !== -1) executeMove(draggedItem, idx);
      } else if (bankEl) {
          executeReturnToBank(draggedItem);
      }

      setTouchDragPos(null);
      setDraggedItem(null);
      setSelectedItem(null);
  };

  // --- CLICK Interaction ---
  const handlePieceClick = (val: string, source: 'bank' | 'slot', index: number) => {
      if (mode !== 'game') return;
      if (selectedItem && selectedItem.val === val && selectedItem.index === index && selectedItem.source === source) {
          setSelectedItem(null);
          return;
      }
      setSelectedItem({ val, source, index });
  };

  const handleSlotClick = (index: number) => {
      if (mode !== 'game') return;
      if (selectedItem) {
          executeMove(selectedItem, index);
          setSelectedItem(null);
      }
  };

  const handleBankClick = () => {
      if (mode !== 'game') return;
      if (selectedItem && selectedItem.source === 'slot') {
          executeReturnToBank(selectedItem);
          setSelectedItem(null);
      }
  }

  // --- RENDER HELPERS ---
  const renderCircle = (isChart: boolean) => {
      const data = isChart ? CIRCLE_OF_FIFTHS_ORDER : slots;

      return data.map((val, i) => {
        // Calculate position (math preserved — node centers sit on the brass ring)
        const angle = (i * 30) - 90; // -90 to start at top
        const radius = 40; // percent
        const rad = angle * (Math.PI / 180);
        const x = 50 + radius * Math.cos(rad);
        const y = 50 + radius * Math.sin(rad);

        const isLocked = !isChart && i === 0;

        // Feedback Logic
        const expected = CIRCLE_OF_FIFTHS_ORDER[i];
        const isCorrect = val === expected;
        const isWrong = val && !isCorrect;

        // Roman-numeral engraving for the chart (I / V / IV around the wheel)
        const roman = i === 0 ? 'I' : (i === 1 ? 'V' : (i === 11 ? 'IV' : ''));

        // --- Vintage token styling ---
        let tokenBg: string;
        let ringColor: string;
        let tokenInk: string;
        let glow = 'none';

        if (val) {
            if (isLocked || isChart) {
                // machined brass/wood token
                tokenBg = 'linear-gradient(180deg,#3a2c18,#241a0e)';
                ringColor = PANEL.brass;
                tokenInk = PANEL.brassLite;
                glow = '0 2px 5px rgba(0,0,0,0.5)';
            } else if (isCorrect) {
                // seated correctly — phosphor glow
                tokenBg = 'linear-gradient(180deg,#2f3a1c,#1e2a12)';
                ringColor = PANEL.phosphor;
                tokenInk = PANEL.phosphor;
                glow = `0 0 12px rgba(143,209,122,0.55)`;
            } else {
                // wrong seat — rust
                tokenBg = 'linear-gradient(180deg,#3a1c1c,#2a1212)';
                ringColor = '#a8472a';
                tokenInk = '#e6b0a0';
                glow = '0 2px 5px rgba(0,0,0,0.5)';
            }
        } else {
            // empty engraved socket (inset)
            tokenBg = 'rgba(0,0,0,0.34)';
            ringColor = selectedItem ? PANEL.brass : PANEL.line;
            tokenInk = PANEL.inkMute;
        }

        const isSelected = !!selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'slot';

        return (
            <div
                key={i}
                data-type="slot"
                data-index={i}
                style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    width: '17%',
                    aspectRatio: '1 / 1',
                    marginLeft: '-8.5%',
                    marginTop: '-8.5%',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    cursor: val && !isLocked && !isChart ? 'grab' : (val ? 'default' : 'pointer'),
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: 'clamp(13px, 4.6vw, 19px)',
                    color: tokenInk,
                    background: tokenBg,
                    boxShadow: val
                        ? `inset 0 0 0 1.5px ${ringColor}, inset 0 1px 0 rgba(255,255,255,0.08), ${glow}`
                        : `inset 0 0 0 1px ${ringColor}, inset 0 2px 5px rgba(0,0,0,0.65)`,
                    outline: isSelected ? `2px solid ${PANEL.brassLite}` : 'none',
                    outlineOffset: 2,
                    transition: 'box-shadow .15s, outline .12s',
                }}

                // DnD Handlers (Only active in game mode via check)
                draggable={!!val && !isLocked && !isChart}
                onDragStart={(e) => val && !isLocked && handleDragStart(e, val, 'slot', i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnSlot(e, i)}

                onTouchStart={(e) => val && !isLocked && handleTouchStart(e, val, 'slot', i)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}

                onClick={() => val && !isLocked ? handlePieceClick(val, 'slot', i) : handleSlotClick(i)}
            >
                {val}
                {isChart && roman && (
                   <span style={{
                       position: 'absolute',
                       bottom: '-42%',
                       fontFamily: '"JetBrains Mono", monospace',
                       fontSize: 8,
                       letterSpacing: 1,
                       color: PANEL.brass,
                       textTransform: 'uppercase',
                       pointerEvents: 'none',
                   }}>
                       {roman}
                   </span>
                )}
            </div>
        )
      });
  };

  // 12 engraved tick marks on the brass ring (same angles as the nodes)
  const ticks = Array.from({ length: 12 }, (_, i) => {
      const rad = ((i * 30) - 90) * (Math.PI / 180);
      const inner = 45.5, outer = 50;
      return {
          x1: 50 + inner * Math.cos(rad), y1: 50 + inner * Math.sin(rad),
          x2: 50 + outer * Math.cos(rad), y2: 50 + outer * Math.sin(rad),
      };
  });

  return (
    <SynthShell name="Circle of Fifths" tag="Key Relationships · Chart & Drill" onClose={onClose} accent={PANEL.brass}>
      <Tabs options={['Chart', 'Game']} value={mode === 'chart' ? 0 : 1} onChange={(i) => setMode(i === 0 ? 'chart' : 'game')} />

      {/* intro line */}
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, color: PANEL.inkMute, textAlign: 'center', lineHeight: 1.6 }}>
        {mode === 'game'
          ? <>Drag each key to its seat on the ring. <b style={{ color: PANEL.brassLite }}>C</b> is fixed at 12 o'clock — go clockwise in fifths.</>
          : <>Adjacent keys are a <b style={{ color: PANEL.brassLite }}>perfect fifth</b> apart. Neighbors share the most notes — the backbone of key relationships.</>}
      </span>

      {/* ── The Wheel — brass ring on a phosphor screen ── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 300,
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 38%, #11160f 0%, #0a0d08 62%, #070907 100%)',
          boxShadow: `inset 0 2px 16px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 4px rgba(0,0,0,0.5)`,
        }}>
          {/* SVG backdrop: concentric brass rings + 12 engraved ticks. viewBox matches the % node math. */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="cof-brass-ring" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PANEL.brassLite} />
                <stop offset="50%" stopColor={PANEL.brass} />
                <stop offset="100%" stopColor={PANEL.brassDark} />
              </linearGradient>
            </defs>
            {/* faint phosphor grid arcs */}
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="url(#cof-brass-ring)" strokeWidth="0.9" opacity="0.95" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={PANEL.brass} strokeWidth="0.55" opacity="0.45" />
            <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(143,209,122,0.16)" strokeWidth="0.5" />
            {/* spokes to each seat — subtle phosphor lines */}
            {ticks.map((t, i) => (
              <line key={`sp-${i}`} x1="50" y1="50" x2={t.x1} y2={t.y1} stroke="rgba(143,209,122,0.07)" strokeWidth="0.4" />
            ))}
            {/* 12 engraved tick marks on the brass ring */}
            {ticks.map((t, i) => (
              <line key={`tk-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={PANEL.brass} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
            ))}
          </svg>

          {/* Center brass hub */}
          <div style={{
            position: 'absolute', inset: 0, margin: 'auto',
            width: '34%', aspectRatio: '1 / 1', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6, zIndex: 5,
            background: (isWon && mode === 'game')
              ? `radial-gradient(circle at 40% 32%, #b8e6a6, ${PANEL.phosphor} 70%)`
              : 'radial-gradient(circle at 40% 32%, #4a443c, #1a1510 72%)',
            boxShadow: (isWon && mode === 'game')
              ? `0 0 22px rgba(143,209,122,0.7), inset 0 1px 0 rgba(255,255,255,0.3)`
              : `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px ${PANEL.brassDark}, 0 2px 6px rgba(0,0,0,0.6)`,
          }}>
            {mode === 'chart' ? (
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8.5, letterSpacing: 2, lineHeight: 1.4, color: PANEL.brass, textTransform: 'uppercase' }}>Major<br/>Keys</span>
            ) : isWon ? (
              <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, color: '#0c1408' }}>Solved</span>
            ) : (
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: 1.5, lineHeight: 1.4, color: PANEL.inkMute, textTransform: 'uppercase' }}>Arrange<br/>Clockwise</span>
            )}
          </div>

          {renderCircle(mode === 'chart')}
        </div>
      </div>

      {/* ── The Bank (Game Mode Only) ── */}
      {mode === 'game' && (
        <>
          <Engrave>Key Bank</Engrave>
          <div
              data-type="bank"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnBank}
              onClick={handleBankClick}
              style={{
                minHeight: 92, borderRadius: 10, padding: 12,
                display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'flex-start',
                background: 'rgba(0,0,0,0.25)',
                boxShadow: `inset 0 0 0 1px ${selectedItem ? 'rgba(202,160,82,0.3)' : PANEL.line}`,
              }}
          >
              {isWon ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, alignSelf: 'center' }}>
                  <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 24, color: PANEL.phosphor, textShadow: `0 0 18px ${PANEL.phosphor}` }}>Great Job!</span>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, letterSpacing: 1.5, color: PANEL.inkMute, textTransform: 'uppercase' }}>Circle complete</span>
                </div>
              ) : bank.length === 0 ? (
                <span style={{ alignSelf: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: PANEL.inkMute }}>All pieces placed — check the ring.</span>
              ) : bank.map((val, i) => {
                const sel = selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'bank';
                return (
                  <div
                      key={`${val}-${i}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, val, 'bank', i)}
                      onTouchStart={(e) => handleTouchStart(e, val, 'bank', i)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={(e) => { e.stopPropagation(); handlePieceClick(val, 'bank', i); }}
                      style={{
                        minWidth: 46, padding: '11px 14px', borderRadius: 999, cursor: 'grab', userSelect: 'none',
                        textAlign: 'center', fontFamily: '"DM Serif Display", serif', fontSize: 19, color: PANEL.ink,
                        background: 'linear-gradient(180deg,#3a2c18,#241a0e)',
                        boxShadow: sel
                          ? `inset 0 0 0 2px ${PANEL.brassLite}, 0 0 12px rgba(202,160,82,0.4)`
                          : `inset 0 0 0 1px ${PANEL.brassDark}, 0 2px 4px rgba(0,0,0,0.4)`,
                      }}
                  >
                      {val}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Mobile Drag Ghost */}
      {touchDragPos && draggedItem && (
        <div
            style={{
              position: 'fixed', left: touchDragPos.x, top: touchDragPos.y,
              transform: 'translate(-50%, -50%) scale(1.1)', pointerEvents: 'none', zIndex: 200,
              minWidth: 46, padding: '10px 14px', borderRadius: 999, textAlign: 'center',
              fontFamily: '"DM Serif Display", serif', fontSize: 19, color: '#1a0d04',
              background: `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})`,
              boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
            }}
        >
            {draggedItem.val}
        </div>
      )}
    </SynthShell>
  );
};

export default CircleOfFifthsGame;
