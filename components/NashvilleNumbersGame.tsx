
import React, { useState, useEffect, DragEvent, TouchEvent } from 'react';
import { NASHVILLE_DATA } from '../services/audioUtils';

interface NashvilleNumbersGameProps {
  onClose: () => void;
}

interface DragItem {
    val: string;
    source: 'bank' | 'slot';
    index: number;
}

const NashvilleNumbersGame: React.FC<NashvilleNumbersGameProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'chart' | 'game'>('chart');
  
  // Game State
  const [currentKey, setCurrentKey] = useState<string>("G");
  const [slots, setSlots] = useState<(string | null)[]>(Array(7).fill(null));
  const [bank, setBank] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(false);
  
  // Drag State
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<DragItem | null>(null);
  const [touchDragPos, setTouchDragPos] = useState<{x: number, y: number} | null>(null);

  // Initialize Game
  useEffect(() => {
    if (mode === 'game') {
        const keys = Object.keys(NASHVILLE_DATA);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        setCurrentKey(randomKey);
        
        setSlots(Array(7).fill(null));
        setIsWon(false);

        // Prepare Bank: Shuffle the chords for this key
        const chords = [...NASHVILLE_DATA[randomKey]];
        setBank(chords.sort(() => 0.5 - Math.random()));
    }
  }, [mode]);

  useEffect(() => {
      // Check Win
      if (mode === 'game') {
          const target = NASHVILLE_DATA[currentKey];
          const isFull = slots.every(s => s !== null);
          if (isFull) {
              const current = slots.join(",");
              if (current === target.join(",")) {
                  setIsWon(true);
              }
          }
      }
  }, [slots, currentKey, mode]);


  // --- GAME LOGIC (Copied & Adapted from Circle Game) ---
  const executeMove = (item: DragItem, targetSlotIndex: number) => {
      const newSlots = [...slots];
      const newBank = [...bank];
      const existingInSlot = slots[targetSlotIndex];

      if (item.source === 'bank') {
          const idxInBank = newBank.indexOf(item.val);
          if (idxInBank > -1) newBank.splice(idxInBank, 1);
      } else {
          newSlots[item.index] = null;
      }

      if (existingInSlot) newBank.push(existingInSlot);
      newSlots[targetSlotIndex] = item.val;

      setSlots(newSlots);
      setBank(newBank);
  };

  const executeReturnToBank = (item: DragItem) => {
      if (item.source === 'bank') return;
      const newSlots = [...slots];
      newSlots[item.index] = null;
      setBank([...bank, item.val]);
      setSlots(newSlots);
  };

  // --- HANDLERS (DnD & Touch) ---
  const handleDragStart = (e: DragEvent, val: string, source: 'bank' | 'slot', index: number) => {
      const item = { val, source, index };
      setDraggedItem(item);
      setSelectedItem(item);
      e.dataTransfer.setData("text/plain", JSON.stringify(item));
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnSlot = (e: DragEvent, slotIndex: number) => {
      e.preventDefault();
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

  const handleTouchStart = (e: TouchEvent, val: string, source: 'bank' | 'slot', index: number) => {
      const touch = e.touches[0];
      const item = { val, source, index };
      setDraggedItem(item);
      setSelectedItem(item);
      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragPos) return;
      e.preventDefault(); 
      const touch = e.touches[0];
      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: TouchEvent) => {
      if (!draggedItem || !touchDragPos) return;
      const touch = e.changedTouches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const slotEl = elements.find(el => el.getAttribute('data-type') === 'nash-slot');
      const bankEl = elements.find(el => el.getAttribute('data-type') === 'nash-bank');

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

  const handlePieceClick = (val: string, source: 'bank' | 'slot', index: number) => {
      if (selectedItem && selectedItem.val === val && selectedItem.index === index && selectedItem.source === source) {
          setSelectedItem(null);
          return;
      }
      setSelectedItem({ val, source, index });
  };

  const handleSlotClick = (index: number) => {
      if (selectedItem) {
          executeMove(selectedItem, index);
          setSelectedItem(null);
      }
  };

  const handleBankClick = () => {
      if (selectedItem && selectedItem.source === 'slot') {
          executeReturnToBank(selectedItem);
          setSelectedItem(null);
      }
  }

  const NUMBERS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans touch-none">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                NASHVILLE NUMBERS
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex-none flex bg-gray-950 p-1">
            <button 
                onClick={() => setMode('chart')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'chart' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Reference Chart
            </button>
            <button 
                onClick={() => setMode('game')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${mode === 'game' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Play Game
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-900">
            
            {mode === 'chart' && (
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-3 border-b border-gray-700 text-gray-400 font-bold text-xs uppercase">Key</th>
                                {NUMBERS.map(n => <th key={n} className="p-3 border-b border-gray-700 text-orange-400 font-black text-lg text-center">{n}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(NASHVILLE_DATA).map(([key, chords]) => (
                                <tr key={key} className="hover:bg-gray-800 transition-colors border-b border-gray-800">
                                    <td className="p-4 font-bold text-white text-lg">{key}</td>
                                    {chords.map((chord, i) => (
                                        <td key={i} className="p-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded font-bold ${i === 0 || i === 3 || i === 4 ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400'}`}>
                                                {chord}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {mode === 'game' && (
                <div className="flex flex-col items-center h-full">
                    <div className="mb-8 text-center">
                        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Drag chords to the correct number</p>
                        <h3 className="text-4xl font-black text-white">KEY OF <span className="text-orange-500">{currentKey}</span></h3>
                    </div>
                    
                    {/* Slots Grid */}
                    <div className="w-full grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-4 mb-8">
                        {NUMBERS.map((num, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="text-gray-500 font-bold text-xs mb-2">{num}</div>
                                <div 
                                    data-type="nash-slot"
                                    data-index={i}
                                    className={`w-full aspect-square md:aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative transition-all
                                        ${slots[i] 
                                            ? 'bg-gray-800 border-solid border-gray-600' 
                                            : `bg-gray-900/50 ${selectedItem && !slots[i] ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-700'}`
                                        }
                                        ${selectedItem && selectedItem.val === slots[i] && selectedItem.index === i && selectedItem.source === 'slot' ? 'ring-2 ring-yellow-400' : ''}
                                    `}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDropOnSlot(e, i)}
                                    onClick={() => slots[i] ? handlePieceClick(slots[i]!, 'slot', i) : handleSlotClick(i)}
                                >
                                    {slots[i] && (
                                        <div 
                                            className={`w-full h-full text-white font-black text-xl flex items-center justify-center rounded-lg shadow-lg cursor-grab active:cursor-grabbing
                                                ${
                                                    slots[i] === NASHVILLE_DATA[currentKey][i] 
                                                    ? 'bg-green-600' 
                                                    : 'bg-red-600'
                                                }
                                            `}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, slots[i]!, 'slot', i)}
                                            onTouchStart={(e) => handleTouchStart(e, slots[i]!, 'slot', i)}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        >
                                            {slots[i]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bank */}
                    <div 
                        data-type="nash-bank"
                        className={`w-full flex-1 bg-gray-800/50 rounded-xl p-4 border transition-colors overflow-y-auto flex flex-wrap content-start gap-3 justify-center ${selectedItem ? 'border-yellow-500/30' : 'border-gray-700'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropOnBank}
                        onClick={handleBankClick}
                    >
                        {bank.length === 0 && !isWon && <div className="text-gray-500 text-sm self-center">All chords placed. Correct?</div>}
                        {isWon && (
                            <div className="flex flex-col items-center justify-center w-full animate-fade-in">
                                <div className="text-green-400 font-black text-3xl mb-2">CORRECT!</div>
                                <button 
                                    onClick={() => setMode('chart')} // Quick toggle reset trick or could make new function
                                    onClickCapture={() => {
                                         // Reset Game
                                         const keys = Object.keys(NASHVILLE_DATA);
                                         let nextKey = keys[Math.floor(Math.random() * keys.length)];
                                         while(nextKey === currentKey) nextKey = keys[Math.floor(Math.random() * keys.length)];
                                         setCurrentKey(nextKey);
                                         setSlots(Array(7).fill(null));
                                         setIsWon(false);
                                         const chords = [...NASHVILLE_DATA[nextKey]];
                                         setBank(chords.sort(() => 0.5 - Math.random()));
                                    }}
                                    className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-500"
                                >
                                    NEXT KEY
                                </button>
                            </div>
                        )}
                        
                        {bank.map((val, i) => (
                             <div 
                                key={`${val}-${i}`}
                                className={`px-4 py-3 min-w-[60px] rounded-lg bg-gray-700 border-2 border-gray-600 text-white flex items-center justify-center font-bold shadow-md cursor-grab active:cursor-grabbing hover:bg-gray-600 transition-transform select-none
                                    ${selectedItem && selectedItem.val === val && selectedItem.index === i && selectedItem.source === 'bank' ? 'ring-2 ring-yellow-400 scale-110' : ''}
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

                    {/* Touch Ghost */}
                    {touchDragPos && draggedItem && (
                        <div 
                            className="fixed px-4 py-3 rounded-lg bg-orange-600 text-white font-bold shadow-2xl pointer-events-none z-[100] opacity-90 text-xl"
                            style={{ 
                                left: touchDragPos.x, 
                                top: touchDragPos.y,
                                transform: 'translate(-50%, -50%) scale(1.1)'
                            }}
                        >
                            {draggedItem.val}
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default NashvilleNumbersGame;
