
import React, { useState, useRef, useEffect } from 'react';
import { SynthShell, Knob, Engrave, PANEL } from './synthkit';

interface TabScrollerProps {
  onClose: () => void;
  onToggleMetronome: () => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

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

// ── small brass-faced transport / utility button ───────────────────────────
const PanelButton: React.FC<{
  onClick?: () => void; title?: string; disabled?: boolean; active?: boolean;
  accent?: string; size?: number; children: React.ReactNode;
}> = ({ onClick, title, disabled, active, accent = PANEL.brass, size = 40, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    style={{
      width: size, height: size, flex: '0 0 auto', borderRadius: 9, cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
      border: `1px solid ${active ? accent : 'rgba(0,0,0,0.55)'}`,
      background: active
        ? `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`
        : 'linear-gradient(180deg, #2a241c, #15110d)',
      color: active ? '#1a0d04' : PANEL.ink,
      opacity: disabled ? 0.4 : 1,
      boxShadow: active
        ? `0 0 14px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.3)`
        : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.5)',
      transition: 'all .1s',
    }}
  >{children}</button>
);

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

  const isText = viewMode === 'text';

  return (
    <SynthShell name="Tab Scroller" tag="Auto-Scroll · Tablature" onClose={onClose} accent={PANEL.brass}>

      {/* ── TRANSPORT DECK ── brass bar: run/stop + speed dial + utilities ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '12px 12px 10px', borderRadius: 10,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.12))',
        boxShadow: `inset 0 0 0 1px ${PANEL.line}`,
      }}>
        {/* RUN / STOP */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Stop scrolling' : 'Start scrolling'}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            width: 76, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
            border: `2px solid ${isPlaying ? '#a8472a' : PANEL.brass}`,
            background: isPlaying
              ? 'linear-gradient(180deg, #3a1c1c, #2a1212)'
              : `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`,
            color: isPlaying ? '#e6b0a0' : '#1a0d04',
            boxShadow: isPlaying
              ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.5)'
              : `0 0 18px ${PANEL.brass}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
            transition: 'all .1s',
          }}
        >
          <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1 }}>{isPlaying ? '❚❚' : '▶'}</span>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' }}>{isPlaying ? 'Stop' : 'Run'}</span>
        </button>

        {/* SCROLL SPEED DIAL */}
        <Knob
          label="Speed"
          value={speed}
          min={1}
          max={100}
          step={1}
          onChange={(v) => setSpeed(v)}
          size={56}
        />

        {/* UTILITIES — push to the right on wide screens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <input ref={fileInputRef} type="file" multiple accept=".txt,.tab,.png,.jpg,.jpeg,.webp,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />

          <PanelButton onClick={() => fileInputRef.current?.click()} title="Open file (tab / image / PDF)">
            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5z" /></svg>
          </PanelButton>

          {isText && (
            <PanelButton onClick={handleSaveMainText} disabled={!tabText} title="Save tab to file">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </PanelButton>
          )}

          <PanelButton onClick={onToggleMetronome} title="Open metronome" active>M</PanelButton>
        </div>
      </div>

      {/* ── KEY (transpose) + ZOOM controls ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        {/* TRANSPOSE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, opacity: isText ? 1 : 0.35, pointerEvents: isText ? 'auto' : 'none' }}>
          <Engrave>Key</Engrave>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <PanelButton onClick={() => handleTranspose(-1)} title="Transpose down" size={36}>–</PanelButton>
            <div style={{
              minWidth: 58, textAlign: 'center', padding: '6px 8px', borderRadius: 7,
              background: PANEL.screen, boxShadow: `inset 0 1px 5px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: PANEL.phosphor, textShadow: `0 0 6px ${PANEL.phosphor}88` }}>
                {transposeVal > 0 ? `+${transposeVal}` : transposeVal}
              </span>
            </div>
            <PanelButton onClick={() => handleTranspose(1)} title="Transpose up" size={36}>+</PanelButton>
          </div>
        </div>

        {/* ZOOM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 130 }}>
          <Engrave>Zoom · {isText ? `${zoomLevel}px` : `${Math.round(zoomLevel * 100)}%`}</Engrave>
          <input
            type="range"
            min={isText ? "6" : "0.25"}
            max={isText ? "32" : "3.0"}
            step={isText ? "1" : "0.1"}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            style={{
              width: '100%', height: 6, borderRadius: 6, appearance: 'none', WebkitAppearance: 'none',
              cursor: 'pointer', accentColor: PANEL.brass,
              background: `linear-gradient(90deg, ${PANEL.brassDark}, ${PANEL.brass})`,
              boxShadow: `inset 0 1px 3px rgba(0,0,0,0.8)`,
            }}
          />
        </div>
      </div>

      {/* ── PHOSPHOR READOUT ── recessed screen the tab scrolls through ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Engrave>{isText ? 'Tablature' : viewMode === 'pdf' ? 'Sheet · PDF' : 'Sheet · Image'}</Engrave>
        <div style={{
          position: 'relative', height: '46dvh', minHeight: 220, borderRadius: 10, overflow: 'hidden', padding: 4,
          background: '#060806',
          boxShadow: `inset 0 2px 12px rgba(0,0,0,0.95), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
        }}>
          {/* inner screen surface (preserves the scrollTop autoscroll mechanic) */}
          <div ref={scrollContainerRef} style={{
            position: 'absolute', inset: 4, overflowY: 'auto', borderRadius: 6,
            background: isText
              ? `radial-gradient(120% 90% at 50% 0%, #0f140d, ${PANEL.screen})`
              : '#1a1a1a',
            scrollBehavior: 'smooth',
          }}>
            <div style={{ minHeight: '150%', padding: isText ? '14px 14px 50vh' : '12px 12px 50vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              {/* TEXT VIEW */}
              {viewMode === 'text' && (
                <textarea
                  ref={textAreaRef}
                  value={tabText}
                  onChange={(e) => setTabText(e.target.value)}
                  style={{
                    width: '100%', maxWidth: 880, margin: '0 auto', background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', overflow: 'hidden', whiteSpace: 'pre',
                    fontFamily: MONO, fontSize: `${zoomLevel}px`, lineHeight: 1.4,
                    color: PANEL.phosphor, textShadow: `0 0 5px ${PANEL.phosphor}66, 0 0 9px ${PANEL.phosphor}33`, caretColor: PANEL.brassLite,
                  }}
                  placeholder="Paste a guitar tab here, or open a file…"
                  spellCheck={false}
                />
              )}

              {/* IMAGE VIEW */}
              {viewMode === 'image' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
                  {imageUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Tab Page ${i + 1}`} style={{ width: `${zoomLevel * 100}%`, maxWidth: '100%', boxShadow: '0 8px 22px rgba(0,0,0,0.6)' }} />
                  ))}
                </div>
              )}

              {/* PDF VIEW */}
              {viewMode === 'pdf' && pdfDoc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
                  {Array.from({ length: pdfDoc.numPages }, (_, i) => (
                    <canvas key={i} ref={el => { canvasRefs.current[i] = el; }} style={{ maxWidth: '100%', background: '#fff', boxShadow: '0 8px 22px rgba(0,0,0,0.6)' }} />
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* play line — where the eye should sit while scrolling */}
          <div style={{ position: 'absolute', top: '30%', left: 4, right: 4, height: 1, background: `${PANEL.brass}66`, pointerEvents: 'none', zIndex: 10, boxShadow: `0 0 8px ${PANEL.brass}55` }} />
          {/* phosphor scanlines + bottom fade */}
          <div className="crt-scanline" style={{ position: 'absolute', inset: 4, borderRadius: 6, pointerEvents: 'none', opacity: 0.5, zIndex: 11 }} />
          <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, height: 48, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))', pointerEvents: 'none', zIndex: 11 }} />
        </div>
      </div>

    </SynthShell>
  );
};

export default TabScroller;
