import React, { useState, useEffect, DragEvent, TouchEvent } from 'react';
import { NASHVILLE_DATA } from '../services/audioUtils';
import { SynthShell, Tabs, ChoiceButton, Engrave, PANEL } from './synthkit';

interface NashvilleNumbersGameProps {
  onClose: () => void;
}

interface DragItem { val: string; source: 'bank' | 'slot'; index: number; }

const NUMBERS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const PRIMARY = [0, 3, 4]; // I / IV / V — the bluegrass workhorses
const KEYS = Object.keys(NASHVILLE_DATA);

const NashvilleNumbersGame: React.FC<NashvilleNumbersGameProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'chart' | 'game'>('chart');
  const [chartKey, setChartKey] = useState<string>('G');

  // Game State
  const [currentKey, setCurrentKey] = useState<string>('G');
  const [slots, setSlots] = useState<(string | null)[]>(Array(7).fill(null));
  const [bank, setBank] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(false);

  // Drag State
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<DragItem | null>(null);
  const [touchDragPos, setTouchDragPos] = useState<{ x: number; y: number } | null>(null);

  const startGame = (key?: string) => {
    const keys = KEYS;
    let next = key ?? keys[Math.floor(Math.random() * keys.length)];
    while (key === undefined && next === currentKey) next = keys[Math.floor(Math.random() * keys.length)];
    setCurrentKey(next);
    setSlots(Array(7).fill(null));
    setIsWon(false);
    setBank([...NASHVILLE_DATA[next]].sort(() => 0.5 - Math.random()));
  };

  useEffect(() => { if (mode === 'game') startGame(); }, [mode]);

  useEffect(() => {
    if (mode === 'game' && slots.every((s) => s !== null)) {
      if (slots.join(',') === NASHVILLE_DATA[currentKey].join(',')) setIsWon(true);
    }
  }, [slots, currentKey, mode]);

  // --- GAME LOGIC (unchanged) ---
  const executeMove = (item: DragItem, targetSlotIndex: number) => {
    const newSlots = [...slots];
    const newBank = [...bank];
    const existingInSlot = slots[targetSlotIndex];
    if (item.source === 'bank') {
      const idx = newBank.indexOf(item.val);
      if (idx > -1) newBank.splice(idx, 1);
    } else newSlots[item.index] = null;
    if (existingInSlot) newBank.push(existingInSlot);
    newSlots[targetSlotIndex] = item.val;
    setSlots(newSlots); setBank(newBank);
  };
  const executeReturnToBank = (item: DragItem) => {
    if (item.source === 'bank') return;
    const newSlots = [...slots];
    newSlots[item.index] = null;
    setBank([...bank, item.val]); setSlots(newSlots);
  };
  const handleDragStart = (e: DragEvent, val: string, source: 'bank' | 'slot', index: number) => {
    const item = { val, source, index };
    setDraggedItem(item); setSelectedItem(item);
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnSlot = (e: DragEvent, slotIndex: number) => {
    e.preventDefault();
    try { const raw = e.dataTransfer.getData('text/plain'); const item = raw ? JSON.parse(raw) : draggedItem; if (item) { executeMove(item, slotIndex); setDraggedItem(null); setSelectedItem(null); } } catch (err) { console.error(err); }
  };
  const handleDropOnBank = (e: DragEvent) => {
    e.preventDefault();
    try { const raw = e.dataTransfer.getData('text/plain'); const item = raw ? JSON.parse(raw) : draggedItem; if (item) { executeReturnToBank(item); setDraggedItem(null); setSelectedItem(null); } } catch (err) { console.error(err); }
  };
  const handleTouchStart = (e: TouchEvent, val: string, source: 'bank' | 'slot', index: number) => {
    const t = e.touches[0]; const item = { val, source, index };
    setDraggedItem(item); setSelectedItem(item); setTouchDragPos({ x: t.clientX, y: t.clientY });
  };
  const handleTouchMove = (e: TouchEvent) => { if (!touchDragPos) return; e.preventDefault(); const t = e.touches[0]; setTouchDragPos({ x: t.clientX, y: t.clientY }); };
  const handleTouchEnd = (e: TouchEvent) => {
    if (!draggedItem || !touchDragPos) return;
    const t = e.changedTouches[0];
    const els = document.elementsFromPoint(t.clientX, t.clientY);
    const slotEl = els.find((el) => el.getAttribute('data-type') === 'nash-slot');
    const bankEl = els.find((el) => el.getAttribute('data-type') === 'nash-bank');
    if (slotEl) { const idx = parseInt(slotEl.getAttribute('data-index') || '-1'); if (idx !== -1) executeMove(draggedItem, idx); }
    else if (bankEl) executeReturnToBank(draggedItem);
    setTouchDragPos(null); setDraggedItem(null); setSelectedItem(null);
  };
  const handlePieceClick = (val: string, source: 'bank' | 'slot', index: number) => {
    if (selectedItem && selectedItem.val === val && selectedItem.index === index && selectedItem.source === source) { setSelectedItem(null); return; }
    setSelectedItem({ val, source, index });
  };
  const handleSlotClick = (index: number) => { if (selectedItem) { executeMove(selectedItem, index); setSelectedItem(null); } };
  const handleBankClick = () => { if (selectedItem && selectedItem.source === 'slot') { executeReturnToBank(selectedItem); setSelectedItem(null); } };

  return (
    <SynthShell name="Nashville Numbers" tag="Number System · Chart & Drill" onClose={onClose} accent={PANEL.brass}>
      <Tabs options={['Chart', 'Play']} value={mode === 'chart' ? 0 : 1} onChange={(i) => setMode(i === 0 ? 'chart' : 'game')} />

      {/* ── CHART (mobile-first: pick a key, read it as a clean stack) ── */}
      {mode === 'chart' && (
        <>
          <Engrave>Key</Engrave>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {KEYS.map((k) => (
              <button key={k} onClick={() => setChartKey(k)} style={{
                flex: '1 1 calc(25% - 6px)', minWidth: 54, padding: '10px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
                fontFamily: '"DM Serif Display", serif', fontSize: 17,
                background: chartKey === k ? `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` : '#181410',
                color: chartKey === k ? '#1a0d04' : PANEL.ink, boxShadow: chartKey === k ? `0 0 14px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.line}`,
              }}>{k}</button>
            ))}
          </div>

          <Engrave>Chords in {chartKey}</Engrave>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NASHVILLE_DATA[chartKey].map((chord, i) => {
              const primary = PRIMARY.includes(i);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9,
                  background: primary ? 'linear-gradient(90deg, rgba(202,160,82,0.16), rgba(0,0,0,0.18))' : 'rgba(0,0,0,0.2)',
                  boxShadow: `inset 0 0 0 1px ${primary ? 'rgba(202,160,82,0.35)' : PANEL.line}`,
                }}>
                  <span style={{ width: 46, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: primary ? PANEL.brassLite : PANEL.inkMute }}>{NUMBERS[i]}</span>
                  <span style={{ flex: 1, fontFamily: '"DM Serif Display", serif', fontSize: 24, color: PANEL.ink }}>{chord}</span>
                  {primary && <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: 1.5, color: PANEL.brass, textTransform: 'uppercase' }}>primary</span>}
                </div>
              );
            })}
          </div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, color: PANEL.inkMute, textAlign: 'center', lineHeight: 1.6 }}>
            In Nashville charts you call the <b style={{ color: PANEL.brassLite }}>numbers</b>, not the chords — so the same song works in any key.
          </span>
        </>
      )}

      {/* ── GAME (drag the chords onto the right numbers) ── */}
      {mode === 'game' && (
        <>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: 2, color: PANEL.inkMute, textTransform: 'uppercase' }}>Place each chord on its number</span>
            <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 30, color: PANEL.ink }}>Key of <span style={{ color: PANEL.brassLite }}>{currentKey}</span></div>
          </div>

          {/* slots */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
            {NUMBERS.map((num, i) => {
              const filled = slots[i];
              const right = filled === NASHVILLE_DATA[currentKey][i];
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: PRIMARY.includes(i) ? PANEL.brassLite : PANEL.inkMute }}>{num}</span>
                  <div data-type="nash-slot" data-index={i}
                    onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnSlot(e, i)}
                    onClick={() => (filled ? handlePieceClick(filled, 'slot', i) : handleSlotClick(i))}
                    style={{
                      width: '100%', height: 56, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: filled ? (right ? 'linear-gradient(180deg,#2f3a1c,#1e2a12)' : 'linear-gradient(180deg,#3a1c1c,#2a1212)') : 'rgba(0,0,0,0.28)',
                      boxShadow: filled ? `inset 0 0 0 1.5px ${right ? PANEL.phosphor : '#a8472a'}` : `inset 0 0 0 1px ${selectedItem ? PANEL.brass : PANEL.line}`,
                    }}>
                    {filled && (
                      <div draggable onDragStart={(e) => handleDragStart(e, filled, 'slot', i)} onTouchStart={(e) => handleTouchStart(e, filled, 'slot', i)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                        style={{ fontFamily: '"DM Serif Display", serif', fontSize: 17, color: right ? PANEL.phosphor : '#e6b0a0', cursor: 'grab' }}>{filled}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* bank */}
          <Engrave>Chord Bank</Engrave>
          <div data-type="nash-bank" onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnBank} onClick={handleBankClick}
            style={{ minHeight: 92, borderRadius: 10, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignContent: 'flex-start',
              background: 'rgba(0,0,0,0.25)', boxShadow: `inset 0 0 0 1px ${selectedItem ? 'rgba(202,160,82,0.3)' : PANEL.line}` }}>
            {isWon ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
                <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: PANEL.phosphor, textShadow: `0 0 18px ${PANEL.phosphor}` }}>Correct!</span>
                <button onClick={() => startGame()} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#1a0d04', background: `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` }}>Next Key</button>
              </div>
            ) : bank.length === 0 ? (
              <span style={{ alignSelf: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: PANEL.inkMute }}>All placed — check the colors.</span>
            ) : bank.map((val, i) => (
              <div key={`${val}-${i}`} draggable onDragStart={(e) => handleDragStart(e, val, 'bank', i)} onTouchStart={(e) => handleTouchStart(e, val, 'bank', i)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                onClick={(e) => { e.stopPropagation(); handlePieceClick(val, 'bank', i); }}
                style={{ padding: '11px 16px', borderRadius: 8, cursor: 'grab', userSelect: 'none', fontFamily: '"DM Serif Display", serif', fontSize: 19, color: PANEL.ink,
                  background: 'linear-gradient(180deg,#3a2c18,#241a0e)',
                  boxShadow: selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'bank' ? `inset 0 0 0 2px ${PANEL.brassLite}, 0 0 12px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.brassDark}, 0 2px 4px rgba(0,0,0,0.4)` }}>{val}</div>
            ))}
          </div>
        </>
      )}

      {/* touch drag ghost */}
      {touchDragPos && draggedItem && (
        <div style={{ position: 'fixed', left: touchDragPos.x, top: touchDragPos.y, transform: 'translate(-50%,-50%) scale(1.1)', pointerEvents: 'none', zIndex: 200,
          padding: '10px 16px', borderRadius: 8, fontFamily: '"DM Serif Display", serif', fontSize: 19, color: '#1a0d04', background: `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})`, boxShadow: '0 8px 20px rgba(0,0,0,0.6)' }}>{draggedItem.val}</div>
      )}
    </SynthShell>
  );
};

export default NashvilleNumbersGame;
