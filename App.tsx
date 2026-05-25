
import React, { useState, useEffect, useRef } from 'react';
import { NoteData, TuningDefinition } from './types';
import { autoCorrelate, getTargetNote, INSTRUMENT_DATA, playTone } from './services/audioUtils';
import FrequencyVisualizer from './components/FrequencyVisualizer';
import TunerGauge, { Cabinet, CABINETS } from './components/TunerGauge';
import InstrumentGraphic from './components/InstrumentGraphic';
import GuessThatChordGame from './components/GuessThatChordGame';
import CircleOfFifthsGame from './components/CircleOfFifthsGame';
import NashvilleNumbersGame from './components/NashvilleNumbersGame';
import CagedSystemGame from './components/CagedSystemGame';
import ChordCreator from './components/ChordCreator';
import Metronome from './components/Metronome';
import TabScroller from './components/TabScroller';
import SecretCalculator from './components/SecretCalculator';
import GuessThatTempoGame from './components/GuessThatTempoGame';
import GuessTimeSignatureGame from './components/GuessTimeSignatureGame';
import DrumMachine from './components/DrumMachine';
import MatriarchSynth from './components/MatriarchSynth';
import DSynth from './components/DSynth';
import Spectravox from './components/Spectravox';
import ReeseSynth from './components/ReeseSynth';
import OPL3Synth from './components/OPL3Synth';
import SerumSynth from './components/SerumSynth';
import VitalSynth from './components/VitalSynth';
import PhasePlantSynth from './components/PhasePlantSynth';
import OpenJamSimulator from './components/OpenJamSimulator';

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
  const [showTabScroller, setShowTabScroller] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTempoGame, setShowTempoGame] = useState(false);
  const [showTimeSigGame, setShowTimeSigGame] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [showDrumMachine, setShowDrumMachine] = useState(false);
  const [showJamSimulator, setShowJamSimulator] = useState(false);
  
  // Synths Hub State
  const [showSynthsHub, setShowSynthsHub] = useState(false);
  const [showMatriarch, setShowMatriarch] = useState(false);
  const [showDSynth, setShowDSynth] = useState(false);
  const [showSpectravox, setShowSpectravox] = useState(false);
  const [showReese, setShowReese] = useState(false);
  const [showOPL3, setShowOPL3] = useState(false);
  const [showSerum, setShowSerum] = useState(false);
  const [showVital, setShowVital] = useState(false);
  const [showPhasePlant, setShowPhasePlant] = useState(false);

  // Check if any full-screen tool is open
  const isToolOpen = showSynthsHub || showDrumMachine || showMatriarch || showDSynth || showSpectravox || showReese || showOPL3 || showSerum || showVital || showPhasePlant || showTabScroller || showChordCreator || showCalculator || showJamSimulator;

  // Skins State
  const [currentSkin, setCurrentSkin] = useState<'original' | 'dark' | 'happy' | 'happy-dark'>('original');

  // Tuner Cabinet (gauge face style) — persisted
  const [currentCabinet, setCurrentCabinet] = useState<Cabinet>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bgt-cabinet') : null;
    return (saved === 'studio' || saved === 'workshop' || saved === 'heirloom') ? saved : 'heirloom';
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
    if (!analyser || !isListening || !audioContext) return;

    const buffer = new Float32Array(analyser.fftSize);
    const dbBuffer = new Uint8Array(analyser.frequencyBinCount);

    const updatePitch = () => {
      // Pitch
      analyser.getFloatTimeDomainData(buffer);
      const fundamentalFreq = autoCorrelate(buffer, audioContext.sampleRate);

      if (fundamentalFreq !== -1) {
        const noteData = getTargetNote(fundamentalFreq, currentTuning, manualStringIndex);
        setCurrentNote(noteData);
      }
      
      // DB Meter Logic (Direct DOM update for perf)
      analyser.getByteFrequencyData(dbBuffer);
      let sum = 0;
      for (let i = 0; i < dbBuffer.length; i++) sum += dbBuffer[i];
      const average = sum / dbBuffer.length;
      // Approximate dB from byte data (0-255) to roughly -60 to 0 dB range
      const db = (average / 255) * 60 - 60; 
      
      if (dbRef.current) {
          const displayDb = db < -59 ? "- Inf" : `${db.toFixed(1)} dB`;
          dbRef.current.innerText = displayDb;
          
          // Color coding
          if (db > -10) dbRef.current.className = "text-red-500 font-mono font-bold text-xl";
          else if (db > -25) dbRef.current.className = "text-green-400 font-mono font-bold text-xl";
          else dbRef.current.className = "text-gray-500 font-mono font-bold text-xl";
      }

      rafRef.current = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isListening, audioContext, currentTuning, manualStringIndex]);

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
      setShowMatriarch(false);
      setShowDSynth(false);
      setShowSpectravox(false);
      setShowReese(false);
      setShowOPL3(false);
      setShowSerum(false);
      setShowVital(false);
      setShowPhasePlant(false);
      setShowTabScroller(false);
      setShowChordCreator(false);
      setShowCalculator(false);
      setShowMetronome(false);
      setShowChordGame(false);
      setShowTempoGame(false);
      setShowTimeSigGame(false);
      setShowCircleGame(false);
      setShowNumbersGame(false);
      setShowCagedGame(false);
      setShowJamSimulator(false);
  };

  // Synth Hub Launcher Card
  const SynthCard = ({ title, desc, icon, onClick }: { title: string, desc: string, icon: string, onClick: () => void }) => (
      <button 
        onClick={onClick}
        className="group relative flex flex-col items-start justify-between p-6 bg-gray-900 border border-gray-700 rounded-2xl hover:border-neon-blue hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all active:scale-95 text-left h-full"
      >
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">{icon}</div>
          <div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-neon-blue">{title}</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">{desc}</p>
          </div>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
      </button>
  );

  return (
    <div className="h-screen max-h-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden transition-colors duration-300" onClick={() => setActiveDropdown(null)}>
      
      {/* GLOBAL CLOSE BUTTON FOR TOOLS */}
      {isToolOpen && (
          <button 
            id="global-close-x"
            onClick={closeAllTools}
            aria-label="Close Tool"
          >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
          </button>
      )}

      {/* SYNTH HUB */}
      {showSynthsHub && (
          <div className="fixed inset-0 z-40 bg-[#0f1115] overflow-y-auto animate-fade-in pt-20 pb-10 px-4 md:px-10">
              <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-10">
                      <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 tracking-tighter">
                          SYNTH WORKSTATION
                      </h1>
                      <p className="text-gray-400 text-sm md:text-base uppercase tracking-[0.2em] font-bold">Professional Audio Engines</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <SynthCard 
                        title="Reese Bass" 
                        desc="Face-melting neuro & dubstep supersaw engine with heavy distortion and wobble." 
                        icon="🔊" 
                        onClick={() => { setShowSynthsHub(false); setShowReese(true); }}
                      />
                      <SynthCard 
                        title="OPL3 AdLib" 
                        desc="1992 Sound Blaster emulator. Authentic DOOM & Duke Nukem FM synthesis." 
                        icon="📟" 
                        onClick={() => { setShowSynthsHub(false); setShowOPL3(true); }}
                      />
                      <SynthCard 
                        title="Spectravox" 
                        desc="10-band analog vocoder & spectral drone processor inspired by Moog." 
                        icon="🗣️" 
                        onClick={() => { setShowSynthsHub(false); setShowSpectravox(true); }}
                      />
                      <SynthCard 
                        title="D Synth" 
                        desc="Pixel-perfect Minimoog Model D replica. 3 Oscillators, Ladder Filter." 
                        icon="🎹" 
                        onClick={() => { setShowSynthsHub(false); setShowDSynth(true); }}
                      />
                      <SynthCard 
                        title="Matriarch" 
                        desc="4-note paraphonic semi-modular synthesizer with stereo delay." 
                        icon="🌈" 
                        onClick={() => { setShowSynthsHub(false); setShowMatriarch(true); }}
                      />
                      <SynthCard 
                        title="Serum Mini" 
                        desc="Advanced Wavetable synthesizer with 3D warping and 16-voice unison." 
                        icon="🧬" 
                        onClick={() => { setShowSynthsHub(false); setShowSerum(true); }}
                      />
                      <SynthCard 
                        title="Vital" 
                        desc="Spectral warping synthesizer with text-to-wavetable and deep modulation." 
                        icon="💠" 
                        onClick={() => { setShowSynthsHub(false); setShowVital(true); }}
                      />
                      <SynthCard 
                        title="Phase Plant" 
                        desc="Snap-in modular playground. Combine Analog, Noise, and Wavetable generators." 
                        icon="🌿" 
                        onClick={() => { setShowSynthsHub(false); setShowPhasePlant(true); }}
                      />
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
      {showTabScroller && <TabScroller onClose={() => setShowTabScroller(false)} onToggleMetronome={() => setShowMetronome(!showMetronome)} />}
      {showCalculator && <SecretCalculator onClose={() => setShowCalculator(false)} />}
      {showDrumMachine && <DrumMachine onClose={() => setShowDrumMachine(false)} />}
      {showJamSimulator && <OpenJamSimulator onClose={() => setShowJamSimulator(false)} />}
      
      {/* Synths (Rendered when active) */}
      {showMatriarch && <MatriarchSynth onClose={() => setShowMatriarch(false)} />}
      {showDSynth && <DSynth onClose={() => setShowDSynth(false)} />}
      {showSpectravox && <Spectravox onClose={() => setShowSpectravox(false)} />}
      {showReese && <ReeseSynth onClose={() => setShowReese(false)} />}
      {showOPL3 && <OPL3Synth onClose={() => setShowOPL3(false)} />}
      {showSerum && <SerumSynth onClose={() => setShowSerum(false)} />}
      {showVital && <VitalSynth onClose={() => setShowVital(false)} />}
      {showPhasePlant && <PhasePlantSynth onClose={() => setShowPhasePlant(false)} />}
      
      {/* Skin Selector Modal */}
      {showSkinSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">Select Skin</h2>
                      <button onClick={() => setShowSkinSelector(false)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-3">
                      <button 
                        onClick={() => { setCurrentSkin('original'); setShowSkinSelector(false); }}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between font-bold transition-all ${currentSkin === 'original' ? 'border-neon-blue bg-gray-800' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700'}`}
                      >
                          <span>Original</span>
                          <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full bg-[#0f172a]"></div>
                              <div className="w-4 h-4 rounded-full bg-[#00f3ff]"></div>
                          </div>
                      </button>
                      <button 
                        onClick={() => { setCurrentSkin('dark'); setShowSkinSelector(false); }}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between font-bold transition-all ${currentSkin === 'dark' ? 'border-neon-blue bg-black' : 'border-gray-700 bg-black/50 hover:bg-gray-900'}`}
                      >
                          <span>Dark Mode</span>
                          <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full bg-[#000000]"></div>
                              <div className="w-4 h-4 rounded-full bg-[#3b82f6]"></div>
                          </div>
                      </button>
                      <button 
                        onClick={() => { setCurrentSkin('happy'); setShowSkinSelector(false); }}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between font-bold transition-all ${currentSkin === 'happy' ? 'border-purple-500 bg-purple-100' : 'border-purple-200 bg-purple-50 hover:bg-purple-100'}`}
                      >
                          <span className="text-purple-900">Happy Girl (Light)</span>
                          <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full bg-[#fae8ff]"></div>
                              <div className="w-4 h-4 rounded-full bg-[#a855f7]"></div>
                          </div>
                      </button>
                      <button 
                        onClick={() => { setCurrentSkin('happy-dark'); setShowSkinSelector(false); }}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between font-bold transition-all ${currentSkin === 'happy-dark' ? 'border-purple-500 bg-[#2e1065]' : 'border-purple-900 bg-[#1a0b2e] hover:bg-[#2e1065]'}`}
                      >
                          <span className="text-purple-100">Happy Girl (Dark)</span>
                          <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full bg-[#1a0b2e]"></div>
                              <div className="w-4 h-4 rounded-full bg-[#d8b4fe]"></div>
                          </div>
                      </button>
                  </div>

                  {/* Tuner Cabinet (gauge face) */}
                  <div className="mt-6 pt-5 border-t border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tuner Cabinet</h3>
                      <div className="space-y-3">
                          {(['heirloom', 'studio', 'workshop'] as Cabinet[]).map(cab => (
                              <button
                                key={cab}
                                onClick={() => { setCurrentCabinet(cab); setShowSkinSelector(false); }}
                                className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${currentCabinet === cab ? 'border-amber-500 bg-amber-950/40' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700'}`}
                              >
                                  <div className="flex flex-col items-start text-left">
                                      <span className="font-bold text-white">{CABINETS[cab].name}</span>
                                      <span className="text-[10px] text-gray-400 tracking-wide">{CABINETS[cab].sub}</span>
                                  </div>
                                  <div className="flex gap-1">
                                      {cab === 'heirloom' && (<><div className="w-4 h-4 rounded-full bg-[#efe2c0]"></div><div className="w-4 h-4 rounded-full bg-[#7a1d10]"></div></>)}
                                      {cab === 'studio' && (<><div className="w-4 h-4 rounded-full bg-[#2a0e08]"></div><div className="w-4 h-4 rounded-full bg-[#caa052]"></div></>)}
                                      {cab === 'workshop' && (<><div className="w-4 h-4 rounded-full bg-[#243a1c]"></div><div className="w-4 h-4 rounded-full bg-[#caa052]"></div></>)}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- TOP BAR --- */}
      <header className="flex-none flex items-center justify-between px-3 py-3 bg-gray-900 border-b border-gray-800 z-50 relative shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-purple-500 tracking-tighter whitespace-nowrap">
                BLUEGRASS TUNER
            </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
             
             {deferredPrompt && (
                 <button
                    onClick={handleInstallClick}
                    className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg animate-pulse transition-colors"
                 >
                    INSTALL APP
                 </button>
             )}

             <button
                onClick={(e) => { e.stopPropagation(); setIsTuneByEar(!isTuneByEar); }}
                className={`h-9 px-3 rounded-lg border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center transition-all ${
                    isTuneByEar 
                    ? 'bg-purple-900/50 border-purple-500 text-purple-200' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
             >
                {isTuneByEar ? 'EAR MODE' : 'TUNER'}
             </button>

             <button
                onClick={(e) => { e.stopPropagation(); isListening ? stopListening() : startListening(); }}
                disabled={isToggling}
                className={`h-9 px-3 md:px-4 rounded-full font-bold text-xs flex items-center justify-center transition-all shadow-lg transform active:scale-95 whitespace-nowrap ${
                    isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-neon-green hover:bg-green-400 text-black animate-pulse-fast'
                } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
             >
                {isToggling ? (
                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                ) : (
                    isListening ? <span className="mr-1">■</span> : <span className="mr-1">▶</span>
                )}
                <span className="hidden sm:inline">{isToggling ? 'WAIT' : (isListening ? 'STOP' : 'START')}</span>
             </button>
        </div>
      </header>

      {/* --- CONTROL BAR --- */}
      <div className="flex-none bg-gray-950 border-b border-gray-800 z-40 shadow-sm relative">
          <div className="grid grid-cols-[1.5fr_1.5fr_0.8fr_0.8fr] gap-2 px-2 py-2 items-center w-full">
            <select 
                value={instrument} 
                onChange={(e) => setInstrument(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-10 w-full bg-gray-800 text-white text-xs font-bold rounded border border-gray-700 focus:border-neon-blue outline-none px-2 cursor-pointer hover:bg-gray-700 transition-colors truncate appearance-none text-center"
            >
                {Object.keys(INSTRUMENT_DATA).map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                ))}
            </select>

            <select 
                value={tuningName} 
                onChange={(e) => setTuningName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-10 w-full bg-gray-800 text-white text-xs font-bold rounded border border-gray-700 focus:border-neon-blue outline-none px-2 cursor-pointer hover:bg-gray-700 transition-colors truncate appearance-none text-center"
            >
                {availableTunings && Object.keys(availableTunings).map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
            
            <ToolbarButton 
                label="Charts" 
                isOpen={activeDropdown?.type === 'charts'}
                onClick={(e) => toggleDropdown(e, 'charts')}
            />

            <ToolbarButton 
                label="Tools" 
                isOpen={activeDropdown?.type === 'tools'}
                onClick={(e) => toggleDropdown(e, 'tools')}
            />
          </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row z-0 relative">
        
        {/* LEFT COLUMN: Tuner + Stats */}
        <div className="flex-none md:flex-1 bg-gray-950 relative border-b md:border-b-0 md:border-r border-gray-800 flex flex-col items-center p-4 transition-colors">
             
             {/* 1. TUNER GAUGE (Scaled down on mobile) */}
             <div className="w-full flex justify-center mb-2 md:mb-6 mt-2">
                 <div className="scale-60 md:scale-100 origin-center transition-transform">
                    <TunerGauge noteData={currentNote} cabinet={currentCabinet} />
                 </div>
             </div>

             {/* 2. dB METER (Always Visible) */}
             <div className="flex flex-col items-center mb-4 md:mb-8">
                 <div ref={dbRef} className="text-xl font-bold font-mono text-gray-500">- Inf</div>
                 <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Volume</div>
             </div>

             {/* Reset Button */}
             {manualStringIndex !== null && !isTuneByEar && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); setManualStringIndex(null); }}
                    className="px-3 py-1 bg-gray-800 rounded text-[10px] text-neon-blue hover:text-white font-bold uppercase tracking-wider border border-gray-700 hover:border-neon-blue transition-all"
                 >
                    Reset String Lock
                 </button>
            )}
             
             {/* Stats (Desktop mostly) */}
             <div className="flex justify-between mt-auto px-4 text-xs font-mono text-gray-500 w-full hidden md:flex">
                <div>DETECTED: <span className="text-white">{currentNote?.frequency ? currentNote.frequency.toFixed(1) : '--'} Hz</span></div>
                <div>TARGET: <span className="text-white">{currentNote?.perfectFrequency ? currentNote.perfectFrequency.toFixed(1) : '--'} Hz</span></div>
            </div>
        </div>

        {/* RIGHT COLUMN: Instrument + Desktop Visualizer */}
        <div className="flex-1 flex flex-col relative min-h-0 md:h-auto">
            {/* Instrument Graphic */}
            <div className="flex-1 relative bg-gray-900 overflow-hidden transition-colors border-t md:border-t-0 border-gray-800">
                <InstrumentGraphic 
                    instrumentName={instrument} 
                    tuning={currentTuning} 
                    currentNote={currentNote?.note} 
                    manualStringIndex={manualStringIndex}
                    onPegClick={handlePegClick}
                    isTuneByEar={isTuneByEar}
                />
            </div>

            {/* DESKTOP ONLY: Visualizer */}
            <div className="hidden md:block h-32 bg-black border-t border-gray-800 relative transition-colors">
                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-bold z-10">SPECTRUM</div>
                <FrequencyVisualizer analyser={analyser} className="w-full h-full opacity-80" />
            </div>
        </div>
      </div>
      
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
                      <DropdownItem onClick={() => openModal(setShowSynthsHub)} label="Synths Hub (8 Engines)" />
                      <div className="h-px bg-gray-800 my-1"></div>
                      <DropdownItem onClick={() => openModal(setShowJamSimulator)} label="Open Jam Simulator 🎻" />
                      <DropdownItem onClick={() => openModal(setShowTabScroller)} label="Guitar Tab Auto-Scroller" />
                      <DropdownItem onClick={() => openModal(setShowDrumMachine)} label="Drum Machine + Keys" />
                      <DropdownItem onClick={() => openModal(setShowChordGame)} label="Chord Quiz" />
                      <DropdownItem onClick={() => openModal(setShowTempoGame)} label="Guess the Tempo" />
                      <DropdownItem onClick={() => openModal(setShowTimeSigGame)} label="Guess Time Signature" />
                      <DropdownItem onClick={() => openModal(setShowChordCreator)} label="Chord Creator" />
                      <DropdownItem onClick={() => openModal(setShowMetronome)} label="Metronome" />
                      <DropdownItem onClick={() => openModal(setShowCalculator)} label="Calculator" />
                      <DropdownItem onClick={() => openModal(setShowSkinSelector)} label="Skins Mode 🎨" />
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