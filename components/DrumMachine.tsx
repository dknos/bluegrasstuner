
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DrumMachineProps {
  onClose: () => void;
}

// --- TYPES ---
type InstrumentType = 'DRUM' | 'KEY';
type DrumKit = '808 Classic' | '909 Classic' | 'Acoustic' | 'Electronic' | 'Lo-Fi';
type KeyPatch = 'Piano' | 'Organ' | 'Synth Lead' | 'Bass' | 'Strings' | 'Pad';

interface Track {
    id: number;
    type: InstrumentType;
    name: string;
    steps: boolean[][]; 
    volume: number;
    muted: boolean;
    solo: boolean;
    kit?: DrumKit;
    patch?: KeyPatch;
}

interface ActiveVoice {
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
}

// --- AUDIO ENGINE ---

const createAudioContext = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Master Bus Creation
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 22000; // Open by default
    masterFilter.Q.value = 1;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;

    masterFilter.connect(masterGain);
    masterGain.connect(ctx.destination);

    return { ctx, masterFilter, masterGain };
};

const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
    return buffer;
};

// --- SYNTHESIS FUNCTIONS ---

const playDrum = (ctx: AudioContext, destination: AudioNode, type: string, time: number, kit: DrumKit, noiseBuffer: AudioBuffer) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.connect(destination); 
    
    const decay = kit === '808 Classic' ? 0.8 : (kit === 'Acoustic' ? 0.3 : 0.5);
    const punch = kit === '909 Classic' ? 1.2 : 1.0;

    switch (type) {
        case 'Kick': case 'Kick 2':
            osc.frequency.setValueAtTime(type === 'Kick 2' ? 100 : 150 * punch, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(1.0, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5 * decay);
            osc.connect(gain); osc.start(time); osc.stop(time + 0.5);
            break;
        case 'Snare': case 'Snare 2':
            osc.frequency.setValueAtTime(type === 'Snare 2' ? 200 : 250, time);
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.connect(gain); osc.start(time); osc.stop(time + 0.2);
            const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer;
            const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.8, time); noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2 * decay);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(destination);
            noise.start(time);
            break;
        case 'Cl Hat': case 'Op Hat':
            const isOpen = type === 'Op Hat';
            const hatNoise = ctx.createBufferSource(); hatNoise.buffer = noiseBuffer;
            const hatFilter = ctx.createBiquadFilter(); hatFilter.type = 'highpass'; hatFilter.frequency.value = 7000;
            const hatGain = ctx.createGain();
            hatGain.gain.setValueAtTime(0.3, time); hatGain.gain.exponentialRampToValueAtTime(0.001, time + (isOpen ? 0.3 : 0.05));
            hatNoise.connect(hatFilter); hatFilter.connect(hatGain); hatGain.connect(destination);
            hatNoise.start(time);
            break;
        case 'Crash':
            const crashNoise = ctx.createBufferSource(); crashNoise.buffer = noiseBuffer;
            const crashFilter = ctx.createBiquadFilter(); crashFilter.type = 'highpass'; crashFilter.frequency.value = 3000;
            const crashGain = ctx.createGain();
            crashGain.gain.setValueAtTime(0.5, time); crashGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
            crashNoise.connect(crashFilter); crashFilter.connect(crashGain); crashGain.connect(destination);
            crashNoise.start(time);
            break;
        case 'Ride':
            const rideOsc = ctx.createOscillator(); rideOsc.type = 'square'; rideOsc.frequency.setValueAtTime(5000, time);
            const rideGain = ctx.createGain(); rideGain.gain.setValueAtTime(0.2, time); rideGain.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
            const rideFilter = ctx.createBiquadFilter(); rideFilter.type = 'bandpass'; rideFilter.frequency.value = 8000;
            rideOsc.connect(rideFilter); rideFilter.connect(rideGain); rideGain.connect(destination);
            rideOsc.start(time); rideOsc.stop(time + 1.0);
            break;
        case 'Lo Tom': case 'Hi Tom':
            osc.frequency.setValueAtTime(type === 'Lo Tom' ? 100 : 250, time); osc.frequency.exponentialRampToValueAtTime(type === 'Lo Tom' ? 50 : 100, time + 0.3);
            gain.gain.setValueAtTime(0.8, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            osc.connect(gain); osc.start(time); osc.stop(time + 0.3);
            break;
        default: 
             osc.type = 'sine'; osc.frequency.setValueAtTime(1200, time); osc.frequency.exponentialRampToValueAtTime(200, time + 0.1);
             gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
             osc.connect(gain); osc.start(time); osc.stop(time + 0.1);
    }
};

// Returns nodes so they can be stopped for sustain
const startKey = (ctx: AudioContext, destination: AudioNode, noteIndex: number, time: number, patch: KeyPatch, detune: number = 0): ActiveVoice => {
    const freq = 130.81 * Math.pow(2, noteIndex / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter); filter.connect(gain); gain.connect(destination);
    
    osc.frequency.value = freq;
    osc.detune.value = detune; 
    
    switch (patch) {
        case 'Piano':
            osc.type = 'triangle'; 
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.05); // Attack
            // Decay handled by stopKey or natural decay
            filter.frequency.setValueAtTime(2000, time);
            break;
        case 'Synth Lead':
            osc.type = 'sawtooth'; 
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.4, time + 0.1);
            filter.type = 'lowpass'; filter.frequency.setValueAtTime(500, time); filter.frequency.linearRampToValueAtTime(3000, time + 0.2);
            break;
        case 'Bass':
            osc.type = 'square'; osc.frequency.value = freq / 2;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
            filter.frequency.setValueAtTime(800, time);
            break;
        default:
            osc.type = 'sine'; 
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.5, time + 0.1);
            filter.frequency.value = 4000;
    }
    osc.start(time);
    return { osc, gain, filter };
};

const stopKey = (voice: ActiveVoice, time: number) => {
    voice.gain.gain.cancelScheduledValues(time);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, time);
    voice.gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2); // Release
    voice.osc.stop(time + 0.2);
};

// "Fire and Forget" version for Sequencer
const playKeyOneShot = (ctx: AudioContext, destination: AudioNode, noteIndex: number, time: number, patch: KeyPatch, detune: number) => {
    const voice = startKey(ctx, destination, noteIndex, time, patch, detune);
    // Auto release after some time (gate length)
    stopKey(voice, time + 0.5); 
};

const PAD_NAMES = ["Kick", "Snare", "Cl Hat", "Op Hat", "Crash", "Ride", "Lo Tom", "Hi Tom", "Rim", "Clap", "Shaker", "Cowbell", "Zap", "Kick 2", "Snare 2", "Perc"];
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const DrumMachine: React.FC<DrumMachineProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState(0);
  const [viewMode, setViewMode] = useState<'DRUMS' | 'KEYS'>('DRUMS');
  const [isRecording, setIsRecording] = useState(false);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [isHold, setIsHold] = useState(false);
  
  // Pad State
  const [padMode, setPadMode] = useState<'FILTER' | 'PITCH'>('FILTER');

  // TRACKS
  const [tracks, setTracks] = useState<Track[]>([
      { id: 0, type: 'DRUM', name: 'Pads', steps: Array(16).fill([]), volume: 0.8, muted: false, solo: false, kit: '808 Classic' },
      { id: 1, type: 'KEY', name: 'Keys', steps: Array(16).fill([]), volume: 0.7, muted: false, solo: false, patch: 'Bass' },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterFilterRef = useRef<BiquadFilterNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const globalDetuneRef = useRef<number>(0);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  
  // Active Voices Registry for Keys (Map<NoteIndex, ActiveVoice[]>) - Array to handle multiple same notes? Usually just one per key.
  const activeVoicesRef = useRef<Map<number, ActiveVoice>>(new Map());

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  useEffect(() => {
      const { ctx, masterFilter, masterGain } = createAudioContext();
      audioCtxRef.current = ctx;
      masterFilterRef.current = masterFilter;
      masterGainRef.current = masterGain;

      noiseBufferRef.current = createNoiseBuffer(ctx);
      return () => { if (audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  const scheduleNote = (stepNumber: number, time: number) => {
      if (!masterFilterRef.current) return;
      const dest = masterFilterRef.current;
      
      tracks.forEach(track => {
          if (track.muted) return;
          const activeNotes = track.steps[stepNumber] as unknown as number[]; 
          if (!activeNotes || !Array.isArray(activeNotes)) return;
          activeNotes.forEach(noteIdx => {
              if (track.type === 'DRUM') {
                  const drumType = PAD_NAMES[noteIdx] || 'Perc';
                  playDrum(audioCtxRef.current!, dest, drumType, time, track.kit || '808 Classic', noiseBufferRef.current!);
              } else {
                  playKeyOneShot(audioCtxRef.current!, dest, noteIdx, time, track.patch || 'Piano', globalDetuneRef.current);
              }
          });
      });
  };

  const nextStep = () => {
      const secondsPerBeat = 60.0 / bpm;
      const stepTime = secondsPerBeat / 4; 
      let swingOffset = 0;
      if (currentStepRef.current % 2 === 1) swingOffset = (swing / 100) * (stepTime / 2);
      nextNoteTimeRef.current += stepTime + swingOffset;
      currentStepRef.current = (currentStepRef.current + 1) % 16;
  };

  const scheduler = useCallback(() => {
      while (nextNoteTimeRef.current < audioCtxRef.current!.currentTime + 0.1) {
          scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
          setCurrentStep(currentStepRef.current);
          nextStep();
      }
      timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [bpm, tracks, swing]);

  useEffect(() => {
      if (isPlaying) {
          if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
          currentStepRef.current = 0;
          nextNoteTimeRef.current = audioCtxRef.current!.currentTime + 0.05;
          scheduler();
      } else {
          if (timerIDRef.current) clearTimeout(timerIDRef.current);
          setCurrentStep(0);
      }
      return () => { if (timerIDRef.current) clearTimeout(timerIDRef.current); };
  }, [isPlaying, scheduler]);

  const toggleStep = (stepIdx: number, noteIdx: number) => {
      const newTracks = [...tracks];
      const track = newTracks[selectedTrackId];
      const currentStepNotes = (track.steps[stepIdx] as unknown as number[]) || [];
      if (currentStepNotes.includes(noteIdx)) {
          track.steps[stepIdx] = (currentStepNotes.filter(n => n !== noteIdx) as any);
      } else {
          track.steps[stepIdx] = ([...currentStepNotes, noteIdx] as any);
      }
      setTracks(newTracks);
  };

  const activeTrack = tracks[selectedTrackId];

  // --- LIVE PLAY HANDLERS ---

  const handleKeyStart = (noteIdx: number, e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!audioCtxRef.current || !masterFilterRef.current) return;
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

      if (activeTrack.type === 'DRUM') {
          playDrum(audioCtxRef.current, masterFilterRef.current, PAD_NAMES[noteIdx], audioCtxRef.current.currentTime, activeTrack.kit || '808 Classic', noiseBufferRef.current!);
          if (isRecording && isPlaying) toggleStep(currentStep, noteIdx);
      } else {
          // Key - Start and Hold
          // If existing voice for this key, stop it first to restart
          if (activeVoicesRef.current.has(noteIdx)) {
              stopKey(activeVoicesRef.current.get(noteIdx)!, audioCtxRef.current.currentTime);
          }
          const voice = startKey(audioCtxRef.current, masterFilterRef.current, noteIdx, audioCtxRef.current.currentTime, activeTrack.patch || 'Piano', globalDetuneRef.current);
          activeVoicesRef.current.set(noteIdx, voice);
          
          if (isRecording && isPlaying) toggleStep(currentStep, noteIdx);
      }
      setActiveNotes(prev => [...prev, noteIdx]);
  };

  const handleKeyStop = (noteIdx: number, e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (activeTrack.type === 'KEY') {
          if (!isHold) {
              const voice = activeVoicesRef.current.get(noteIdx);
              if (voice && audioCtxRef.current) {
                  stopKey(voice, audioCtxRef.current.currentTime);
                  activeVoicesRef.current.delete(noteIdx);
              }
              setActiveNotes(prev => prev.filter(n => n !== noteIdx));
          }
      } else {
          // Drums don't sustain usually, just remove visual active
          setActiveNotes(prev => prev.filter(n => n !== noteIdx));
      }
  };

  // --- XY PAD COMPONENT ---
  const KaossPad = () => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
      const [active, setActive] = useState(false);
      const trailRef = useRef<{x:number, y:number, life:number}[]>([]);
      const rafRef = useRef<number | null>(null);

      const updateAudioParams = (x: number, y: number) => {
          if (!audioCtxRef.current || !masterFilterRef.current || !masterGainRef.current) return;
          const now = audioCtxRef.current.currentTime;
          
          if (padMode === 'FILTER') {
             // X = Cutoff (logarithmic sweep 50Hz to 15kHz)
             const minLog = Math.log(50);
             const maxLog = Math.log(15000);
             const freq = Math.exp(minLog + (maxLog - minLog) * x);
             masterFilterRef.current.frequency.setTargetAtTime(freq, now, 0.1);
             
             // Y = Resonance (0 to 20)
             masterFilterRef.current.Q.setTargetAtTime(y * 20, now, 0.1);
          } else {
             // PITCH MODE
             globalDetuneRef.current = (x - 0.5) * 2400; 
             masterGainRef.current.gain.setTargetAtTime(0.5 + y, now, 0.1);
          }
      };

      const handleMove = (clientX: number, clientY: number) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
          const y = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
          
          setPosition({ x, y });
          updateAudioParams(x, y);
      };

      const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
          setActive(true);
          const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
          handleMove(clientX, clientY);
      };

      const handleEnd = () => {
          setActive(false);
          setPosition({ x: 0.5, y: 0.5 });
          updateAudioParams(0.5, 0.5); 
          globalDetuneRef.current = 0;
          if(masterFilterRef.current && audioCtxRef.current) {
               masterFilterRef.current.frequency.setTargetAtTime(22000, audioCtxRef.current.currentTime, 0.5);
               masterFilterRef.current.Q.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.5);
          }
      };

      const draw = (_time?: number) => {
          if (!canvasRef.current) return;
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;
          const { width, height } = canvasRef.current;
          
          // Clear
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, width, height);

          // Grid
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1;
          const steps = 8;
          for(let i=1; i<steps; i++) {
              ctx.beginPath();
              ctx.moveTo(i * width/steps, 0); ctx.lineTo(i * width/steps, height);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(0, i * height/steps); ctx.lineTo(width, i * height/steps);
              ctx.stroke();
          }

          // Add trail point
          if (active) {
              trailRef.current.push({ x: position.x, y: position.y, life: 1.0 });
          }

          // Draw trails
          trailRef.current.forEach((p, i) => {
              p.life -= 0.05;
              if (p.life <= 0) {
                  trailRef.current.splice(i, 1);
                  return;
              }
              const px = p.x * width;
              const py = (1 - p.y) * height; // Invert Y for drawing
              
              ctx.beginPath();
              ctx.arc(px, py, 10 * p.life, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(0, 243, 255, ${p.life * 0.5})`;
              ctx.fill();
          });

          // Draw Cursor
          const cx = position.x * width;
          const cy = (1 - position.y) * height;

          // Glow
          const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 40);
          gradient.addColorStop(0, 'rgba(0, 243, 255, 1)');
          gradient.addColorStop(0.5, 'rgba(0, 243, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();

          // Axis Labels
          ctx.fillStyle = '#666';
          ctx.font = '10px monospace';
          ctx.fillText(padMode === 'FILTER' ? 'FREQ' : 'PITCH', 10, height - 10);
          ctx.save();
          ctx.translate(10, 10);
          ctx.rotate(-Math.PI/2);
          ctx.fillText(padMode === 'FILTER' ? 'RES' : 'VOL', -40, 0);
          ctx.restore();

          rafRef.current = requestAnimationFrame(draw);
      };

      useEffect(() => {
          const resize = () => {
              if (canvasRef.current && canvasRef.current.parentElement) {
                  canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                  canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
              }
          };
          window.addEventListener('resize', resize);
          resize();
          draw();
          return () => {
              window.removeEventListener('resize', resize);
              if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          };
      }, [padMode, active, position]);

      return (
          <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-700 bg-black touch-none group">
              <canvas 
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onMouseDown={handleStart}
                onMouseMove={(e) => active && handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={(e) => {
                     e.preventDefault(); 
                     handleMove(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchEnd={handleEnd}
              />
              {/* Mode Toggle Overlay */}
              <button 
                onClick={() => setPadMode(m => m === 'FILTER' ? 'PITCH' : 'FILTER')}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-900/80 border border-gray-600 rounded text-[10px] font-bold text-neon-blue hover:bg-gray-800 transition-colors z-20"
              >
                  MODE: {padMode}
              </button>
          </div>
      )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 md:p-6 animate-fade-in font-sans select-none touch-manipulation">
      <div className="bg-[#1a1c23] border border-gray-700 md:rounded-xl w-full h-full md:max-w-6xl md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* HEADER */}
        <div className="flex-none h-16 p-2 bg-[#121418] border-b border-gray-800 flex items-center justify-between gap-3 z-50 pr-4 relative shadow-lg">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-xl">🎹</span>
                </div>
                <div className="hidden sm:block">
                    <h2 className="text-lg font-bold text-white uppercase">Groovebox</h2>
                </div>
                {viewMode === 'KEYS' && (
                    <button 
                        onClick={() => setIsHold(!isHold)}
                        className={`ml-4 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isHold ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_10px_yellow] animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                    >
                        HOLD
                    </button>
                )}
            </div>

            {/* Redesigned Close Button for High Visibility */}
            <button 
                onClick={onClose} 
                className="w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-xl shadow-lg border-2 border-red-400"
            >
                ✕
            </button>
        </div>

        {/* MAIN WORKSPACE (Scrollable, Middle) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-[72px] md:pb-0">
            
            {/* SIDEBAR */}
            <div className="flex-none md:w-48 bg-[#0f1115] border-b md:border-b-0 md:border-r border-gray-800 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto h-12 md:h-auto no-scrollbar">
                {tracks.map(track => (
                    <div 
                        key={track.id}
                        onClick={() => {
                            setSelectedTrackId(track.id);
                            setViewMode(track.type === 'DRUM' ? 'DRUMS' : 'KEYS');
                        }}
                        className={`flex-none w-24 md:w-full p-2 md:p-3 border-r md:border-r-0 md:border-b border-gray-800 cursor-pointer relative flex items-center justify-center md:justify-start ${selectedTrackId === track.id ? 'bg-[#1e222b]' : 'hover:bg-[#161920]'}`}
                    >
                        <span className={`text-xs font-bold uppercase truncate ${selectedTrackId === track.id ? 'text-white' : 'text-gray-400'}`}>{track.name}</span>
                    </div>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col bg-[#16181d] min-h-0 overflow-y-auto">
                {/* SEQUENCER */}
                <div className="flex-none h-20 border-b border-gray-800 bg-[#131519] p-2 overflow-x-auto">
                    <div className="flex gap-1 h-full min-w-max">
                         {[...Array(16)].map((_, stepIdx) => {
                             const isActive = currentStep === stepIdx;
                             const hasNote = ((activeTrack.steps[stepIdx] as unknown as number[]) || []).length > 0;
                             return (
                                 <div key={stepIdx} className="w-6 md:w-8 flex flex-col gap-1">
                                     <div className={`h-1 rounded-full mb-1 ${isActive ? 'bg-green-400' : 'bg-gray-800'}`}></div>
                                     <button 
                                        onClick={() => toggleStep(stepIdx, 0)} 
                                        className={`flex-1 rounded border ${hasNote ? 'bg-indigo-500 border-indigo-400' : 'bg-[#1a1c23] border-gray-800'}`}
                                     ></button>
                                 </div>
                             )
                         })}
                    </div>
                </div>

                {/* INSTRUMENTS (PADS / KEYS) */}
                <div className="p-4 flex flex-col gap-4 bg-[#1a1c23] min-h-[300px]">
                    <div className="flex items-center justify-center w-full">
                        {viewMode === 'DRUMS' && (
                            <div className="w-full max-w-md grid grid-cols-4 gap-2">
                                {PAD_NAMES.map((name, i) => (
                                    <button
                                        key={i}
                                        onMouseDown={(e) => handleKeyStart(i, e)}
                                        onMouseUp={(e) => handleKeyStop(i, e)}
                                        onMouseLeave={(e) => handleKeyStop(i, e)}
                                        onTouchStart={(e) => handleKeyStart(i, e)}
                                        onTouchEnd={(e) => handleKeyStop(i, e)}
                                        className={`aspect-square bg-gray-800 border-b-4 border-gray-900 rounded-lg flex items-center justify-center relative active:border-b-0 active:translate-y-1 ${activeNotes.includes(i) ? 'bg-indigo-500 border-b-0 translate-y-1' : ''}`}
                                    >
                                        <span className="text-[10px] text-gray-400 font-bold">{name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {viewMode === 'KEYS' && (
                            <div className="flex h-40 md:h-64 relative bg-gray-900 p-2 rounded-xl border border-gray-800 shadow-2xl overflow-x-auto select-none w-full">
                                {[...Array(25)].map((_, i) => {
                                    const isSharp = KEYS[i % 12].includes('#');
                                    if (isSharp) return null; 
                                    return (
                                        <div key={i} className="relative h-full flex-shrink-0">
                                            <button 
                                                onMouseDown={(e) => handleKeyStart(i, e)}
                                                onMouseUp={(e) => handleKeyStop(i, e)}
                                                onMouseLeave={(e) => handleKeyStop(i, e)}
                                                onTouchStart={(e) => handleKeyStart(i, e)}
                                                onTouchEnd={(e) => handleKeyStop(i, e)}
                                                className={`w-10 md:w-14 h-full bg-white rounded-b-lg border border-gray-300 origin-top z-10 flex flex-col justify-end pb-2 items-center ${activeNotes.includes(i) ? 'bg-gray-200 scale-y-[0.98]' : ''}`}
                                            >
                                                <span className="text-[8px] text-gray-400 font-bold">{KEYS[i%12]}</span>
                                            </button>
                                            {KEYS[(i+1)%12]?.includes('#') && (
                                                <button 
                                                    onMouseDown={(e) => handleKeyStart(i+1, e)}
                                                    onMouseUp={(e) => handleKeyStop(i+1, e)}
                                                    onMouseLeave={(e) => handleKeyStop(i+1, e)}
                                                    onTouchStart={(e) => handleKeyStart(i+1, e)}
                                                    onTouchEnd={(e) => handleKeyStop(i+1, e)}
                                                    className={`absolute top-0 -right-3 w-6 h-[60%] bg-black rounded-b-md z-20 border border-gray-800 ${activeNotes.includes(i+1) ? 'scale-y-[0.98]' : ''}`}
                                                ></button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* KAOSS PAD SECTION */}
                    <div className="w-full flex justify-center">
                        <div className="w-full max-w-md md:max-w-2xl h-48 rounded-lg shadow-inner bg-black border border-gray-800 relative">
                            <KaossPad />
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* --- FIXED BOTTOM TRANSPORT BAR --- */}
        <div className="flex-none h-[72px] bg-[#0f1115] border-t border-gray-800 flex items-center justify-evenly px-4 z-50 md:rounded-b-xl relative shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            
            {/* BPM Control */}
            <div className="flex items-center gap-2">
                <button onClick={() => setBpm(b => Math.max(40, b - 5))} className="w-10 h-10 bg-gray-800 rounded text-gray-400 font-bold">-</button>
                <div className="text-center w-12">
                    <div className="text-xl font-bold text-white leading-none">{bpm}</div>
                    <div className="text-[9px] text-gray-500 font-bold">BPM</div>
                </div>
                <button onClick={() => setBpm(b => Math.min(220, b + 5))} className="w-10 h-10 bg-gray-800 rounded text-gray-400 font-bold">+</button>
            </div>

            {/* Main Play Button */}
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-[#0f1115] ${isPlaying ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}
            >
                 <span className="text-2xl font-black">{isPlaying ? '■' : '▶'}</span>
            </button>

            {/* Record Toggle */}
            <button 
                onClick={() => setIsRecording(!isRecording)}
                className={`flex flex-col items-center justify-center w-12 gap-1 ${isRecording ? 'text-red-500' : 'text-gray-500'}`}
            >
                <div className={`w-5 h-5 rounded-full border-2 ${isRecording ? 'bg-red-600 border-red-500 animate-pulse' : 'bg-transparent border-gray-600'}`}></div>
                <span className="text-[9px] font-bold">REC</span>
            </button>

        </div>

      </div>
    </div>
  );
};

export default DrumMachine;
