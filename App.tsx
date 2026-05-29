
import React, { useState, useEffect, useRef } from 'react';
import { NoteData, TuningDefinition } from './types';
import { getTargetNote, INSTRUMENT_DATA, playTone } from './services/audioUtils';
import FrequencyVisualizer from './components/FrequencyVisualizer';
import TunerGauge, { Cabinet, CABINETS } from './components/TunerGauge';
import CabinetTuner from './components/CabinetTuner';
import InstrumentGraphic from './components/InstrumentGraphic';
import GuessThatChordGame from './components/GuessThatChordGame';
import CircleOfFifthsGame from './components/CircleOfFifthsGame';
import NashvilleNumbersGame from './components/NashvilleNumbersGame';
import CagedSystemGame from './components/CagedSystemGame';
import ChordCreator from './components/ChordCreator';
import Metronome from './components/Metronome';
import SecretCalculator from './components/SecretCalculator';
import GuessThatTempoGame from './components/GuessThatTempoGame';
import GuessTimeSignatureGame from './components/GuessTimeSignatureGame';
import DrumMachine from './components/DrumMachine';
import DSynth from './components/DSynth';
import Spectravox from './components/Spectravox';
import ReeseSynth from './components/ReeseSynth';
import OPL3Synth from './components/OPL3Synth';
import WavetableSynth from './components/WavetableSynth';
import Resinx from './components/Resinx';
import Knurl from './components/Knurl';

const App: React.FC = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Selection State
  const [instrument, setInstrument] = useState<string>('Guitar');
  const [tuningName, setTuningName] = useState<string>('Standard');
  const [manualStringIndex, setManualStringIndex] = useState<number | null>(null);
  const [isTuneByEar, setIsTuneByEar] = useState(false);
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Modals
  const [showChordGame, setShowChordGame] = useState(false);
  const [showCircleGame, setShowCircleGame] = useState(false);
  const [showNumbersGame, setShowNumbersGame] = useState(false);
  const [showCagedGame, setShowCagedGame] = useState(false);
  const [showChordCreator, setShowChordCreator] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTempoGame, setShowTempoGame] = useState(false);
  const [showTimeSigGame, setShowTimeSigGame] = useState(false);
  const [showDrumMachine, setShowDrumMachine] = useState(false);

  // Synths Hub State
  const [showSynthsHub, setShowSynthsHub] = useState(false);
  const [showDSynth, setShowDSynth] = useState(false);
  const [showSpectravox, setShowSpectravox] = useState(false);
  const [showReese, setShowReese] = useState(false);
  const [showOPL3, setShowOPL3] = useState(false);
  const [showWavetable, setShowWavetable] = useState(false);
  const [showResinx, setShowResinx] = useState(false);
  const [showKnurl, setShowKnurl] = useState(false);

  // Check if any full-screen tool is open
  const isToolOpen = showSynthsHub || showDrumMachine || showDSynth || showSpectravox || showReese || showOPL3 || showWavetable || showResinx || showKnurl || showChordCreator || showCalculator;

  // Skins State
  const [currentSkin, setCurrentSkin] = useState<'original' | 'dark' | 'happy' | 'happy-dark'>('original');

  // Tuner Cabinet (gauge face style) — persisted
  const [currentCabinet, setCurrentCabinet] = useState<Cabinet>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bgt-cabinet') : null;
    const valid: Cabinet[] = ['heirloom', 'studio', 'workshop', 'happygirl'];
    return valid.includes(saved as Cabinet) ? (saved as Cabinet) : 'heirloom';
  });
  useEffect(() => {
    try { localStorage.setItem('bgt-cabinet', currentCabinet); } catch {}
  }, [currentCabinet]);

  // Dropdown State - Stores the TYPE and the POSITION of the trigger button
  const [activeDropdown, setActiveDropdown] = useState<{ type: string; rect: DOMRect } | null>(null);

  const [currentNote, setCurrentNote] = useState<NoteData | null>(null);
  const dbRef = useRef<HTMLDivElement>(null);
  
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // WASM AudioWorklet pitch detector: node + latest detected frequency (-1 = none)
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const workletFreqRef = useRef<number>(-1);

  // Safe Derivation of Current Tuning
  const instrumentData = INSTRUMENT_DATA[instrument];
  const availableTunings = instrumentData?.tunings || {};
  
  let currentTuning: TuningDefinition = availableTunings[tuningName];
  
  // Fallback if the selected tuning doesn't exist for this instrument
  if (!currentTuning) {
      const firstTuningKey = Object.keys(availableTunings)[0];
      if (firstTuningKey) {
          currentTuning = availableTunings[firstTuningKey];
      } else {
           currentTuning = { name: "Unknown", notes: [] };
      }
  }

  // PWA Install Handler
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Effect to apply Theme Class to Body
  useEffect(() => {
      document.body.className = `theme-${currentSkin}`;
  }, [currentSkin]);

  // Effect to sync the state tuningName with the fallback if needed
  useEffect(() => {
    if (!availableTunings[tuningName]) {
        const firstTuningKey = Object.keys(availableTunings)[0];
        if (firstTuningKey) {
            setTuningName(firstTuningKey);
            setManualStringIndex(null);
        }
    }
    // Also clear manual string selection on instrument change
    setManualStringIndex(null);
  }, [instrument, tuningName, availableTunings]);

  // Initialize Audio
  const startListening = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
            latency: 0
        } as any
      });
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ana = ctx.createAnalyser();
      
      ana.fftSize = 4096;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(ana);

      // Pitch detection runs in a Rust/WASM AudioWorklet, off the main thread.
      // The analyser above is kept only for the spectrum visualizer + dB meter.
      workletFreqRef.current = -1;
      try {
        const base = import.meta.env.BASE_URL || '/';
        await ctx.audioWorklet.addModule(`${base}pitch-processor.js`);
        const wasmBytes = await fetch(`${base}pitch.wasm`).then(r => r.arrayBuffer());
        const node = new AudioWorkletNode(ctx, 'pitch', { processorOptions: { wasmBytes } });
        node.port.onmessage = (e) => {
          if (e.data?.type === 'pitch') workletFreqRef.current = e.data.freq;
        };
        source.connect(node);
        node.connect(ctx.destination); // worklet writes no output (silent); needed so process() runs
        workletRef.current = node;
      } catch (err) {
        console.error('Pitch worklet failed to start:', err);
      }

      sourceRef.current = source;
      setAudioContext(ctx);
      setAnalyser(ana);
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    } finally {
        setIsToggling(false);
    }
  };

  const stopListening = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
        if (workletRef.current) {
            workletRef.current.port.onmessage = null;
            workletRef.current.disconnect();
            workletRef.current = null;
        }
        workletFreqRef.current = -1;
        if (sourceRef.current) {
            sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            sourceRef.current.disconnect();
        }
        if (audioContext) {
            await audioContext.close();
        }
        setIsListening(false);
        setAudioContext(null);
        setAnalyser(null);
        setCurrentNote(null);
    } catch (e) {
        console.error("Error stopping audio:", e);
    } finally {
        setIsToggling(false);
    }
  };

  // Pitch Detection Loop
  useEffect(() => {
    if (!isListening) return;

    const updatePitch = () => {
      // Pitch comes from the WASM worklet (off-thread); read its latest result.
      const fundamentalFreq = workletFreqRef.current;

      if (fundamentalFreq !== -1) {
        const noteData = getTargetNote(fundamentalFreq, currentTuning, manualStringIndex);
        setCurrentNote(noteData);
      } else {
        // No pitch: go to listening state, but don't churn renders while silent.
        setCurrentNote(prev => (prev === null ? prev : null));
      }

      rafRef.current = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isListening, currentTuning, manualStringIndex]);

  const handlePegClick = (stringNum: number, freq: number) => {
      if (isTuneByEar) {
          playTone(freq);
      } else {
          if (manualStringIndex === stringNum) {
              setManualStringIndex(null);
          } else {
              setManualStringIndex(stringNum);
          }
      }
  };

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>, type: string) => {
      e.stopPropagation();
      if (activeDropdown && activeDropdown.type === type) {
          setActiveDropdown(null);
      } else {
          const rect = e.currentTarget.getBoundingClientRect();
          setActiveDropdown({ type, rect });
      }
  };

  const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      setter(true);
      setActiveDropdown(null);
  };

  // Helper to close all tools
  const closeAllTools = () => {
      setShowSynthsHub(false);
      setShowDrumMachine(false);
      setShowDSynth(false);
      setShowSpectravox(false);
      setShowReese(false);
      setShowOPL3(false);
      setShowWavetable(false);
      setShowResinx(false);
      setShowKnurl(false);
      setShowChordCreator(false);
      setShowCalculator(false);
      setShowMetronome(false);
      setShowChordGame(false);
      setShowTempoGame(false);
      setShowTimeSigGame(false);
      setShowCircleGame(false);
      setShowNumbersGame(false);
      setShowCagedGame(false);
  };

  // Synth Hub Launcher Card — vintage rack plate
  const SynthCard = ({ title, desc, mono, onClick }: { title: string, desc: string, mono: string, onClick: () => void }) => (
      <button
        onClick={onClick}
        style={{
          position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', cursor: 'pointer',
          padding: '16px 16px', borderRadius: 12, width: '100%',
          background: 'linear-gradient(180deg, #2c2620, #1a1612)',
          border: '1px solid rgba(202,160,82,0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 14px rgba(0,0,0,0.4)',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
          <span style={{
            flex: '0 0 auto', width: 44, height: 44, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 35% 28%, #f6e2a0, #caa052 40%, #6b4f1c)',
            color: '#1a0d04', fontFamily: '"DM Serif Display", serif', fontSize: 24,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.5)',
          }}>{mono}</span>
          <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 18, color: '#e8dcc4', margin: 0, letterSpacing: 0.3 }}>{title}</h3>
              <p style={{ fontSize: 11, color: 'rgba(232,220,196,0.55)', margin: '3px 0 0', lineHeight: 1.45 }}>{desc}</p>
          </div>
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col overflow-x-hidden transition-colors duration-300" onClick={() => setActiveDropdown(null)}>
      

      {/* SYNTH HUB — vintage rack catalog */}
      {showSynthsHub && (
          <div className="fixed inset-0 z-40 overflow-y-auto animate-fade-in" style={{ background: 'linear-gradient(180deg, #1a1612 0%, #0f0c0a 100%)' }}>
              <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 40px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 30, color: '#e8dcc4', margin: 0, letterSpacing: 0.5 }}>Synth Cabinet</h1>
                          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, color: '#caa052', letterSpacing: 3, textTransform: 'uppercase', margin: '4px 0 0' }}>Eight Analog Engines</p>
                      </div>
                      <button onClick={() => setShowSynthsHub(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 9, cursor: 'pointer', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(202,160,82,0.3)', color: 'rgba(232,220,196,0.6)', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 18 }}>
                      <SynthCard title="D Synth" mono="D" desc="Minimoog Model D — 3 oscillators, ladder filter, drive. Polyphonic analog lead." onClick={() => { setShowSynthsHub(false); setShowDSynth(true); }} />
                      <SynthCard title="Wavetable" mono="W" desc="Morphing wavetable with unison supersaw, filter sweeps and LFO. The modern flagship." onClick={() => { setShowSynthsHub(false); setShowWavetable(true); }} />
                      <SynthCard title="OPL3 AdLib" mono="O" desc="1990s AdLib & Sound Blaster 2-operator FM. Six retro game presets." onClick={() => { setShowSynthsHub(false); setShowOPL3(true); }} />
                      <SynthCard title="Spectravox" mono="S" desc="Formant vocoder & spectral drone — 10-band vowel morphing inspired by Moog." onClick={() => { setShowSynthsHub(false); setShowSpectravox(true); }} />
                      <SynthCard title="Reese Bass" mono="R" desc="Neuro supersaw bass with the XY wobble pad and hold latch." onClick={() => { setShowSynthsHub(false); setShowReese(true); }} />
                      <SynthCard title="Resinx" mono="X" desc="Microtonal Karplus-Strong resonator. 6 tuned voices on pure ratios — play it or ring out a kick, pluck, or mic." onClick={() => { setShowSynthsHub(false); setShowResinx(true); }} />
                      <SynthCard title="Knurl" mono="K" desc="Physical-modeling groovebox. Synthesized drums, sample-accurate sequencer with parameter locks, swing & probability, mix-ready master bus." onClick={() => { setShowSynthsHub(false); setShowKnurl(true); }} />
                  </div>
              </div>
          </div>
      )}

      {/* Game Modals */}
      {showChordGame && <GuessThatChordGame onClose={() => setShowChordGame(false)} />}
      {showTempoGame && <GuessThatTempoGame onClose={() => setShowTempoGame(false)} />}
      {showTimeSigGame && <GuessTimeSignatureGame onClose={() => setShowTimeSigGame(false)} />}
      {showCircleGame && <CircleOfFifthsGame onClose={() => setShowCircleGame(false)} />}
      {showNumbersGame && <NashvilleNumbersGame onClose={() => setShowNumbersGame(false)} />}
      {showCagedGame && <CagedSystemGame onClose={() => setShowCagedGame(false)} />}
      {showChordCreator && <ChordCreator onClose={() => setShowChordCreator(false)} instrumentName={instrument} tuning={currentTuning} />}
      {showMetronome && <Metronome onClose={() => setShowMetronome(false)} />}
      {showCalculator && <SecretCalculator onClose={() => setShowCalculator(false)} />}
      {showDrumMachine && <DrumMachine onClose={() => setShowDrumMachine(false)} />}

      {/* Synths (Rendered when active) */}
      {showDSynth && <DSynth onClose={() => setShowDSynth(false)} />}
      {showSpectravox && <Spectravox onClose={() => setShowSpectravox(false)} />}
      {showReese && <ReeseSynth onClose={() => setShowReese(false)} />}
      {showOPL3 && <OPL3Synth onClose={() => setShowOPL3(false)} />}
      {showWavetable && <WavetableSynth onClose={() => setShowWavetable(false)} />}
      {showResinx && <Resinx onClose={() => setShowResinx(false)} />}
      {showKnurl && <Knurl onClose={() => setShowKnurl(false)} />}

      {/* --- VINTAGE CABINET TUNER (mobile-first) --- */}
      <CabinetTuner
        cabinet={currentCabinet}
        instruments={['Guitar', 'Banjo', 'Violin', 'Mandolin', 'Bass', 'Ukulele'].filter(k => INSTRUMENT_DATA[k])}
        instrument={instrument}
        tuningKeys={Object.keys(availableTunings)}
        tuningName={tuningName}
        tuning={currentTuning}
        noteData={currentNote}
        manualStringIndex={manualStringIndex}
        isListening={isListening}
        isToggling={isToggling}
        isTuneByEar={isTuneByEar}
        deferredPrompt={deferredPrompt}
        onInstrument={setInstrument}
        onSelectTuning={setTuningName}
        onPickString={handlePegClick}
        onToggleListen={() => (isListening ? stopListening() : startListening())}
        onToggleEar={() => setIsTuneByEar(!isTuneByEar)}
        onInstall={handleInstallClick}
        onOpenMenu={(type, e) => toggleDropdown(e, type)}
        onSelectCabinet={setCurrentCabinet}
      />

      {/* Hidden dB meter sink — the audio loop writes here; kept off the cabinet UI */}
      <div ref={dbRef} className="hidden" />
      
      {/* DROPDOWNS */}
      {activeDropdown && (
          <FloatingDropdown 
            rect={activeDropdown.rect} 
            onClose={() => setActiveDropdown(null)}
          >
              {activeDropdown.type === 'charts' && (
                  <>
                      <DropdownItem onClick={() => openModal(setShowNumbersGame)} label="Nashville Numbers" />
                      <DropdownItem onClick={() => openModal(setShowCagedGame)} label="CAGED System" />
                      <DropdownItem onClick={() => openModal(setShowCircleGame)} label="Circle of 5ths" />
                  </>
              )}
              {activeDropdown.type === 'tools' && (
                  <>
                      <DropdownItem onClick={() => openModal(setShowSynthsHub)} label="Synths Hub (7 Engines)" />
                      <div className="h-px bg-gray-800 my-1"></div>
                      <DropdownItem onClick={() => openModal(setShowDrumMachine)} label="Drum Machine + Keys" />
                      <DropdownItem onClick={() => openModal(setShowChordGame)} label="Chord Quiz" />
                      <DropdownItem onClick={() => openModal(setShowTempoGame)} label="Guess the Tempo" />
                      <DropdownItem onClick={() => openModal(setShowTimeSigGame)} label="Guess Time Signature" />
                      <DropdownItem onClick={() => openModal(setShowChordCreator)} label="Chord Creator" />
                      <DropdownItem onClick={() => openModal(setShowMetronome)} label="Metronome" />
                      <DropdownItem onClick={() => openModal(setShowCalculator)} label="Calculator" />
                  </>
              )}
          </FloatingDropdown>
      )}
    </div>
  );
};

const ToolbarButton: React.FC<{ label: string; isOpen: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }> = ({ label, isOpen, onClick }) => (
    <button 
        onClick={onClick}
        className={`h-10 w-full bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm whitespace-nowrap px-2 rounded text-xs font-bold uppercase ${isOpen ? 'border-neon-blue text-white' : ''}`}
    >
        <span>{label}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    </button>
);

const FloatingDropdown: React.FC<{ rect: DOMRect; onClose: () => void; children: React.ReactNode }> = ({ rect, onClose, children }) => {
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 192 > window.innerWidth) left = window.innerWidth - 200; 
    return (
        <div 
            className="fixed z-[9999] w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()} 
        >
            {children}
        </div>
    );
}

const DropdownItem: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="w-full text-left px-4 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
    >
        {label}
    </button>
);

export default App;