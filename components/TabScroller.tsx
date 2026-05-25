
import React, { useState, useRef, useEffect } from 'react';

interface TabScrollerProps {
  onClose: () => void;
  onToggleMetronome: () => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// --- TRANSPOSE ENGINE ---
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const getTransposedNote = (note: string, semitones: number): string => {
    const isFlat = note.includes('b');
    const scale = isFlat ? NOTES_FLAT : NOTES_SHARP;
    
    let idx = scale.indexOf(note);
    if (idx === -1) {
        const altScale = isFlat ? NOTES_SHARP : NOTES_FLAT;
        idx = altScale.indexOf(note);
        if (idx === -1) return note; 
    }

    let newIdx = (idx + semitones) % 12;
    if (newIdx < 0) newIdx += 12;

    return scale[newIdx];
};

const processTransposeText = (text: string, direction: number) => {
    return text.split('\n').map(line => {
        // TAB LINE DETECTION: Looks for standard string starts "e|", "G|" etc OR "---" patterns with digits
        const isTabLine = /^[eBGDAE][|:]/.test(line) || (/-[\d]+-/.test(line) && line.includes('-'));

        if (isTabLine) {
            // Strictly replace only digits in a tab context
            return line.replace(/\d+/g, (match) => {
                const num = parseInt(match, 10);
                if (num > 30) return match; // Avoid shifting non-fret numbers
                let newNum = num + direction;
                if (newNum < 0) newNum = 0;
                return newNum.toString();
            });
        } else {
            // CHORD LINE DETECTION
            // Strictly matches Note Root (A-G) optional Accidental (#/b) and specific suffixes
            // Does NOT match "x1" "x2" or arbitrary words
            return line.replace(/\b([A-G][#b]?)(m|min|maj|dim|aug|sus|add|7|9|11|13|6|5|\/[A-G][#b]?)?(\s|[.,]|$)/g, (match, root, suffix, spacer) => {
                // If it looks like a word (e.g. "A" in "A cat"), ignore? 
                // Hard to tell perfectly without context, but this regex expects a valid suffix or space/end.
                // It excludes things like "Amigo" because "migo" isnt a suffix.
                
                const newRoot = getTransposedNote(root, direction);
                return newRoot + (suffix || "") + (spacer || "");
            });
        }
    }).join('\n');
};

const TabScroller: React.FC<TabScrollerProps> = ({ onClose, onToggleMetronome }) => {
  const [viewMode, setViewMode] = useState<'text' | 'pdf' | 'image'>('text');
  const [tabText, setTabText] = useState("");
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [speed, setSpeed] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [transposeVal, setTransposeVal] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null); 
  const lastScrollTime = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const scrollAccumulator = useRef<number>(0);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Autoscroll Logic
  const animateScroll = (time: number) => {
    if (lastScrollTime.current !== 0 && scrollContainerRef.current) {
        const deltaTime = (time - lastScrollTime.current) / 1000;
        const pixelsToScroll = speed * deltaTime;
        scrollAccumulator.current += pixelsToScroll;
        if (Math.abs(scrollAccumulator.current) >= 1) {
             const currentScroll = scrollContainerRef.current.scrollTop;
             scrollContainerRef.current.scrollTop = currentScroll + scrollAccumulator.current;
             scrollAccumulator.current = 0; 
        }
    }
    lastScrollTime.current = time;
    requestRef.current = requestAnimationFrame(animateScroll);
  };

  useEffect(() => {
      if (isPlaying) {
          lastScrollTime.current = performance.now();
          scrollAccumulator.current = 0;
          requestRef.current = requestAnimationFrame(animateScroll);
      } else {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          lastScrollTime.current = 0;
      }
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [isPlaying, speed]);

  useEffect(() => {
    if (viewMode === 'text' && textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [tabText, viewMode, zoomLevel]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      imageUrls.forEach(url => URL.revokeObjectURL(url));
      setImageUrls([]);
      setPdfDoc(null);

      if (file.type === 'application/pdf') {
          if (window.pdfjsLib) {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setViewMode('pdf');
            setZoomLevel(1.5); 
          } else {
              alert("PDF Renderer not ready. Please try again in a moment.");
          }
      } else if (file.type.startsWith('image/')) {
          const urls = Array.from(files).map((f: File) => URL.createObjectURL(f));
          setImageUrls(urls);
          setViewMode('image');
          setZoomLevel(1.0);
      } else {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const text = evt.target?.result as string;
              if (text) {
                  setTabText(text);
                  setViewMode('text');
                  setZoomLevel(14); 
                  setTransposeVal(0);
              }
          };
          reader.readAsText(file);
      }
      e.target.value = "";
  };

  useEffect(() => {
      if (viewMode === 'pdf' && pdfDoc) {
          const renderPages = async () => {
              for (let i = 1; i <= pdfDoc.numPages; i++) {
                  const page = await pdfDoc.getPage(i);
                  const viewport = page.getViewport({ scale: zoomLevel });
                  const canvas = canvasRefs.current[i - 1];
                  if (canvas) {
                      const context = canvas.getContext('2d');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      if (context) await page.render({ canvasContext: context, viewport: viewport }).promise;
                  }
              }
          };
          renderPages();
      }
  }, [viewMode, pdfDoc, zoomLevel]);

  const handleTranspose = (direction: number) => {
      if (viewMode !== 'text' || !tabText) {
          alert("Can only transpose text tabs. Use 'Transcribe' first if using PDF/Images.");
          return;
      }
      const newText = processTransposeText(tabText, direction);
      setTabText(newText);
      setTransposeVal(v => v + direction);
  };

  const handleSaveMainText = () => {
      if (!tabText) return;
      const blob = new Blob([tabText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Guitar_Tab_${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4 animate-fade-in font-mono">
       <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="flex-none p-3 border-b border-gray-800 bg-gray-950 flex justify-between items-center pr-4">
             <div className="flex items-center gap-2">
                 <h2 className="text-sm md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-purple-500 truncate">TAB SCROLLER</h2>
             </div>
             <button onClick={onClose} className="w-10 h-10 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0" title="Close">✕</button>
          </div>
          
          {/* CONTROL BAR - COMPACT FLEX */}
          <div className="flex-none bg-gray-900 border-b border-gray-800 p-2 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                  
                  {/* PLAYBACK */}
                  <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg flex-shrink-0">
                      <button 
                         onClick={() => setIsPlaying(!isPlaying)}
                         className={`w-10 h-8 flex items-center justify-center rounded font-bold shadow active:scale-95 ${isPlaying ? 'bg-red-600 text-white' : 'bg-green-600 text-black'}`}
                      >
                          {isPlaying ? '||' : '▶'}
                      </button>
                      <div className="flex flex-col w-16">
                          <input type="range" min="1" max="100" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-blue" />
                          <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase mt-1"><span>Spd</span><span>{speed}</span></div>
                      </div>
                  </div>

                  {/* EDITING */}
                  <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg flex-shrink-0">
                      <div className={`flex flex-col w-14 ${viewMode !== 'text' ? 'opacity-30 pointer-events-none' : ''}`}>
                          <div className="flex gap-1 h-5">
                              <button onClick={() => handleTranspose(-1)} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs">-</button>
                              <button onClick={() => handleTranspose(1)} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs">+</button>
                          </div>
                          <div className="text-[8px] text-center text-gray-400 mt-1 uppercase font-bold truncate">
                              Key {transposeVal > 0 ? `+${transposeVal}` : transposeVal}
                          </div>
                      </div>
                      <div className="flex flex-col w-14">
                          <input 
                            type="range" 
                            min={viewMode === 'text' ? "6" : "0.25"} 
                            max={viewMode === 'text' ? "32" : "3.0"} 
                            step={viewMode === 'text' ? "1" : "0.1"}
                            value={zoomLevel} 
                            onChange={(e) => setZoomLevel(Number(e.target.value))} 
                            className="h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-blue" 
                          />
                          <div className="text-[8px] text-center text-gray-400 mt-1 uppercase font-bold">Zoom</div>
                      </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                       <input ref={fileInputRef} type="file" multiple accept=".txt,.tab,.png,.jpg,.jpeg,.webp,.pdf" className="hidden" onChange={handleFileUpload} />
                       
                       <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded flex items-center justify-center text-white shadow" title="Open File">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5z"></path></svg>
                       </button>

                       {viewMode === 'text' && (
                           <button onClick={handleSaveMainText} disabled={!tabText} className={`w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white shadow ${!tabText ? 'opacity-50' : ''}`} title="Save">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                           </button>
                       )}

                       <button onClick={onToggleMetronome} className="w-8 h-8 bg-gray-800 border border-gray-600 rounded flex items-center justify-center text-gray-300" title="Metronome">
                           <span className="text-xs">M</span>
                       </button>
                  </div>
              </div>
          </div>

          {/* MAIN VIEWER AREA */}
          <div className="flex-1 relative bg-[#151515] overflow-hidden flex justify-center">
              <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto scroll-smooth">
                  <div className="min-h-[150%] p-4 md:p-8 pb-[50vh] flex flex-col items-center">
                      
                      {/* TEXT VIEW */}
                      {viewMode === 'text' && (
                          <textarea 
                              ref={textAreaRef}
                              value={tabText}
                              onChange={(e) => setTabText(e.target.value)}
                              className="w-full bg-transparent text-gray-200 font-mono outline-none resize-none whitespace-pre border-none focus:ring-0 max-w-5xl mx-auto overflow-hidden"
                              style={{ fontSize: `${zoomLevel}px`, lineHeight: '1.2' }}
                              placeholder="Paste tab here or open a file..."
                              spellCheck={false}
                          />
                      )}

                      {/* IMAGE VIEW */}
                      {viewMode === 'image' && (
                          <div className="flex flex-col gap-4 w-full items-center">
                              {imageUrls.map((url, i) => (
                                  <img key={i} src={url} alt={`Tab Page ${i+1}`} className="shadow-2xl max-w-full" style={{ width: `${zoomLevel * 100}%` }} />
                              ))}
                          </div>
                      )}

                      {/* PDF VIEW */}
                      {viewMode === 'pdf' && pdfDoc && (
                          <div className="flex flex-col gap-4 w-full items-center">
                              {Array.from({ length: pdfDoc.numPages }, (_, i) => (
                                  <canvas key={i} ref={el => { canvasRefs.current[i] = el; }} className="shadow-2xl max-w-full bg-white" />
                              ))}
                          </div>
                      )}

                  </div>
              </div>
              
              {/* Play Line */}
              <div className="absolute top-[30%] left-0 right-0 h-[1px] bg-red-500/50 pointer-events-none z-10"></div>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
          </div>
       </div>
    </div>
  );
};

export default TabScroller;
