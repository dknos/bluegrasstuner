
import React, { useState, useEffect, DragEvent, TouchEvent } from 'react';
import { CIRCLE_OF_FIFTHS_ORDER } from '../services/audioUtils';

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
        // Calculate position
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

        let bgColor = 'bg-blue-600';
        let borderColor = 'border-blue-400';

        if (isLocked || isChart) {
            bgColor = 'bg-gray-800';
            borderColor = 'border-gray-600';
        } else if (mode === 'game') {
            if (isCorrect) {
                bgColor = 'bg-green-600';
                borderColor = 'border-green-400';
            } else if (isWrong) {
                bgColor = 'bg-red-600';
                borderColor = 'border-red-400';
            }
        }

        return (
            <div 
                key={i}
                data-type="slot"
                data-index={i}
                className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-lg transition-all z-10
                    ${val 
                        ? `${bgColor} ${borderColor} text-white cursor-grab active:cursor-grabbing` 
                        : `bg-gray-900/80 border-dashed ${selectedItem ? 'border-yellow-400 bg-yellow-900/20' : 'border-gray-700'} hover:border-gray-500`
                    }
                    ${selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'slot' ? 'ring-4 ring-yellow-400 scale-110' : ''}
                `}
                style={{ left: `${x}%`, top: `${y}%` }}
                
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
                {isChart && (
                   <div className="absolute -bottom-5 text-[8px] text-gray-500 uppercase font-normal pointer-events-none">
                       {i === 0 ? 'I' : (i === 1 ? 'V' : (i === 11 ? 'IV' : ''))}
                   </div>
                )}
            </div>
        )
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans touch-none">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col h-[90vh] md:h-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                CIRCLE OF FIFTHS
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {/* Tabs */}
        <div className="flex-none flex bg-gray-950 p-1">
            <button 
                onClick={() => setMode('chart')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'chart' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Reference Chart
            </button>
            <button 
                onClick={() => setMode('game')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'game' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Puzzle Game
            </button>
        </div>

        <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
            {mode === 'game' && (
                <p className="text-gray-400 text-xs mb-6 text-center max-w-xs">
                    Drag notes to positions. C is fixed at the top.
                </p>
            )}
            
            {mode === 'chart' && (
                <p className="text-gray-400 text-xs mb-6 text-center max-w-xs">
                    The Circle of Fifths shows the relationship among the 12 tones of the chromatic scale.
                </p>
            )}

            {/* The Circle */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0 mb-8 rounded-full border-4 border-gray-800 bg-gray-950/50 shadow-inner">
                {/* Center Hub */}
                <div className={`absolute inset-0 m-auto w-24 h-24 rounded-full flex items-center justify-center text-center p-2 z-0 transition-colors duration-500 ${isWon && mode === 'game' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                    {mode === 'chart' ? 
                        <span className="font-bold text-gray-500 text-xs">MAJOR<br/>KEYS</span> :
                        (isWon ? <span className="font-bold text-xl">SOLVED!</span> : <span className="text-[10px]">Arrange Clockwise</span>)
                    }
                </div>

                {renderCircle(mode === 'chart')}
            </div>

            {/* The Bank (Game Mode Only) */}
            {mode === 'game' && (
                <div 
                    data-type="bank"
                    className={`w-full flex-1 bg-gray-800/50 rounded-xl p-4 border transition-colors overflow-y-auto flex flex-col ${selectedItem ? 'border-yellow-500/30' : 'border-gray-700'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropOnBank}
                    onClick={handleBankClick}
                >
                    <div className="flex flex-wrap gap-3 justify-center">
                        {bank.length === 0 && !isWon && <div className="text-gray-500 text-sm mt-4">All pieces placed!</div>}
                        {isWon && <div className="text-green-400 font-bold text-lg animate-bounce mt-4">Great Job!</div>}
                        
                        {bank.map((val, i) => (
                            <div 
                                key={`${val}-${i}`}
                                className={`w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-400 text-white flex items-center justify-center font-bold shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform select-none
                                    ${selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'bank' ? 'ring-4 ring-yellow-400 scale-110' : ''}
                                `}
                                draggable
                                onDragStart={(e) => handleDragStart(e, val, 'bank', i)}
                                onTouchStart={(e) => handleTouchStart(e, val, 'bank', i)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={(e) => { e.stopPropagation(); handlePieceClick(val, 'bank', i); }}
                            >
                                {val}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Mobile Drag Ghost */}
            {touchDragPos && draggedItem && (
                <div 
                    className="fixed w-12 h-12 rounded-full bg-blue-600 border-2 border-blue-400 text-white flex items-center justify-center font-bold shadow-2xl pointer-events-none z-[100] opacity-90"
                    style={{ 
                        left: touchDragPos.x, 
                        top: touchDragPos.y,
                        transform: 'translate(-50%, -50%) scale(1.2)'
                    }}
                >
                    {draggedItem.val}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default CircleOfFifthsGame;
