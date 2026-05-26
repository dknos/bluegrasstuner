
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Keys, PANEL } from './synthkit';

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
        case 'Rim': {
            // Rimshot — sharp short click (high triangle blip).
            const ro = ctx.createOscillator(); ro.type = 'triangle'; ro.frequency.setValueAtTime(1700, time);
            const rg = ctx.createGain(); rg.gain.setValueAtTime(0.5, time); rg.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            ro.connect(rg); rg.connect(destination); ro.start(time); ro.stop(time + 0.05);
            break;
        }
        case 'Clap': {
            // Clap — three quick band-passed noise bursts + a longer tail.
            [0, 0.01, 0.02, 0.035].forEach((off, k, arr) => {
                const last = k === arr.length - 1;
                const cn = ctx.createBufferSource(); cn.buffer = noiseBuffer;
                const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1200; cf.Q.value = 1.3;
                const cg = ctx.createGain();
                cg.gain.setValueAtTime(last ? 0.5 : 0.32, time + off);
                cg.gain.exponentialRampToValueAtTime(0.001, time + off + (last ? 0.12 : 0.03));
                cn.connect(cf); cf.connect(cg); cg.connect(destination); cn.start(time + off);
            });
            break;
        }
        case 'Shaker': {
            // Shaker — very short, soft high-passed noise.
            const sn = ctx.createBufferSource(); sn.buffer = noiseBuffer;
            const sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 6500;
            const sg = ctx.createGain();
            sg.gain.setValueAtTime(0.0, time); sg.gain.linearRampToValueAtTime(0.25, time + 0.005); sg.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
            sn.connect(sf); sf.connect(sg); sg.connect(destination); sn.start(time);
            break;
        }
        case 'Cowbell': {
            // 808 cowbell — two detuned squares (~540 + 800Hz) through a bandpass.
            const c1 = ctx.createOscillator(); c1.type = 'square'; c1.frequency.value = 540;
            const c2 = ctx.createOscillator(); c2.type = 'square'; c2.frequency.value = 800;
            const cbp = ctx.createBiquadFilter(); cbp.type = 'bandpass'; cbp.frequency.value = 2640; cbp.Q.value = 1.4;
            const cg = ctx.createGain(); cg.gain.setValueAtTime(0.4, time); cg.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            c1.connect(cbp); c2.connect(cbp); cbp.connect(cg); cg.connect(destination);
            c1.start(time); c2.start(time); c1.stop(time + 0.35); c2.stop(time + 0.35);
            break;
        }
        case 'Perc': {
            // Tuned wood-block-ish perc — triangle with a fast pitch drop.
            osc.type = 'triangle'; osc.frequency.setValueAtTime(420, time); osc.frequency.exponentialRampToValueAtTime(180, time + 0.12);
            gain.gain.setValueAtTime(0.5, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
            osc.connect(gain); osc.start(time); osc.stop(time + 0.15);
            break;
        }
        case 'Zap':
            // The one intentional zap — a downward laser sweep.
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1800, time); osc.frequency.exponentialRampToValueAtTime(120, time + 0.18);
            gain.gain.setValueAtTime(0.4, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.connect(gain); osc.start(time); osc.stop(time + 0.2);
            break;
        default:
             // True unknown — neutral click.
             osc.type = 'sine'; osc.frequency.setValueAtTime(800, time); osc.frequency.exponentialRampToValueAtTime(300, time + 0.08);
             gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
             osc.connect(gain); osc.start(time); osc.stop(time + 0.08);
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
  // Which pad/note the 16-step sequencer row currently edits (was hardcoded to kick).
  const [seqTarget, setSeqTarget] = useState(0);

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
      setSeqTarget(noteIdx); // tapping a pad/key aims the step row at it
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
              ctx.fillStyle = `rgba(143, 209, 122, ${p.life * 0.5})`;
              ctx.fill();
          });

          // Draw Cursor
          const cx = position.x * width;
          const cy = (1 - position.y) * height;

          // Glow
          const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 40);
          gradient.addColorStop(0, 'rgba(143, 209, 122, 1)');
          gradient.addColorStop(0.5, 'rgba(143, 209, 122, 0.2)');
          gradient.addColorStop(1, 'rgba(143, 209, 122, 0)');
          
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
                className="absolute top-2 right-2 px-2 py-1 bg-gray-900/80 border border-gray-600 rounded text-[10px] font-bold hover:bg-gray-800 transition-colors z-20"
                style={{ color: PANEL.brass }}
              >
                  MODE: {padMode}
              </button>
          </div>
      )
  };

  const ink = PANEL.ink, brass = PANEL.brass, line = PANEL.line, mute = PANEL.inkMute;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 animate-fade-in select-none touch-manipulation" style={{ background: 'rgba(8,5,3,0.85)', backdropFilter: 'blur(3px)', fontFamily: '"JetBrains Mono", monospace' }}>
      <div className="w-full h-full md:max-w-3xl md:h-auto md:max-h-[92vh] flex flex-col relative overflow-hidden md:rounded-2xl" style={{ background: 'linear-gradient(180deg,#4a2c12,#2a1808)', padding: '0 9px' }}>
        <div className="flex flex-col flex-1 my-0 md:my-[9px] overflow-hidden md:rounded-[10px]" style={{ background: 'linear-gradient(180deg,#2c2620,#1a1612)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.5)' }}>

        {/* HEADER */}
        <div className="flex-none flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${line}`, background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0))' }}>
            <div className="flex items-center gap-3">
                <div>
                    <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: ink, lineHeight: 1 }}>Groovebox</div>
                    <div style={{ fontSize: 8.5, color: brass, letterSpacing: 2, textTransform: 'uppercase' }}>16-Step · Drums · Keys</div>
                </div>
                {viewMode === 'KEYS' && (
                    <button onClick={() => setIsHold(!isHold)} style={{ marginLeft: 10, padding: '6px 12px', borderRadius: 999, fontSize: 10, letterSpacing: 1, cursor: 'pointer', border: `1px solid ${isHold ? brass : line}`, background: isHold ? brass : 'transparent', color: isHold ? '#1a0d04' : mute }}>HOLD</button>
                )}
            </div>
            <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 9, cursor: 'pointer', background: 'rgba(0,0,0,0.3)', border: `1px solid ${line}`, color: mute, fontSize: 16 }}>✕</button>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col overflow-y-auto pb-[80px]">

            {/* TRACK TABS */}
            <div className="flex-none flex gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${line}` }}>
                {tracks.map(track => (
                    <button key={track.id}
                        onClick={() => { setSelectedTrackId(track.id); setViewMode(track.type === 'DRUM' ? 'DRUMS' : 'KEYS'); setSeqTarget(0); }}
                        style={{ padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                            border: `1px solid ${selectedTrackId === track.id ? brass : line}`, background: selectedTrackId === track.id ? brass : '#181410', color: selectedTrackId === track.id ? '#1a0d04' : mute }}>
                        {track.name}
                    </button>
                ))}
            </div>

            {/* SEQUENCER */}
            <div className="flex-none px-3 py-3" style={{ borderBottom: `1px solid ${line}` }}>
                <div style={{ fontSize: 8.5, color: mute, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    Sequencer · <span style={{ color: brass }}>{activeTrack.type === 'DRUM' ? PAD_NAMES[seqTarget] : KEYS[seqTarget % 12]}</span>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {[...Array(16)].map((_, stepIdx) => {
                        const isActive = currentStep === stepIdx;
                        const hasNote = ((activeTrack.steps[stepIdx] as unknown as number[]) || []).includes(seqTarget);
                        return (
                            <div key={stepIdx} className="flex flex-col gap-1 flex-1" style={{ minWidth: 16 }}>
                                <div style={{ height: 3, borderRadius: 2, background: isActive ? PANEL.phosphor : 'rgba(0,0,0,0.5)' }} />
                                <button onClick={() => toggleStep(stepIdx, seqTarget)} style={{ height: 34, borderRadius: 5, cursor: 'pointer',
                                    border: `1px solid ${hasNote ? brass : line}`, background: hasNote ? `linear-gradient(180deg,${brass},${PANEL.brassDark})` : '#100c08',
                                    boxShadow: isActive ? `0 0 8px ${PANEL.phosphor}55` : 'none', opacity: (stepIdx % 4 === 0 && !hasNote) ? 0.85 : 0.6 }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* INSTRUMENTS */}
            <div className="p-3 flex flex-col gap-4">
                {viewMode === 'DRUMS' && (
                    <div className="grid grid-cols-4 gap-2 w-full" style={{ maxWidth: 460, margin: '0 auto' }}>
                        {PAD_NAMES.map((name, i) => {
                            const on = activeNotes.includes(i);
                            const sel = seqTarget === i && !on; // aimed by the sequencer row
                            return (
                            <button key={i}
                                onPointerDown={(e) => handleKeyStart(i, e as any)} onPointerUp={(e) => handleKeyStop(i, e as any)} onPointerLeave={(e) => activeNotes.includes(i) && handleKeyStop(i, e as any)}
                                style={{ aspectRatio: '1', borderRadius: 10, cursor: 'pointer', fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', touchAction: 'none',
                                    color: on ? '#1a0d04' : (sel ? ink : mute),
                                    background: on ? `linear-gradient(180deg,${brass},${PANEL.brassDark})` : 'linear-gradient(180deg,#2a2620,#15110d)',
                                    border: `1px solid ${on ? brass : (sel ? PANEL.phosphor : line)}`,
                                    boxShadow: on ? `0 0 16px ${brass}55` : (sel ? `0 0 10px ${PANEL.phosphor}44, inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 5px rgba(0,0,0,0.4)'),
                                    transform: on ? 'translateY(2px)' : 'none' }}>
                                {name}
                            </button>
                            );
                        })}
                    </div>
                )}
                {viewMode === 'KEYS' && (
                    <Keys octaves={2} startMidi={0} activeNotes={activeNotes} onNoteOn={(m) => handleKeyStart(m, { preventDefault() {} } as any)} onNoteOff={(m) => handleKeyStop(m, { preventDefault() {} } as any)} height={150} />
                )}

                <div style={{ fontSize: 8.5, color: mute, letterSpacing: 2.5, textTransform: 'uppercase' }}>XY Performance</div>
                <div className="w-full" style={{ maxWidth: 560, margin: '0 auto', height: 180, borderRadius: 10, overflow: 'hidden', background: PANEL.screen, boxShadow: `inset 0 2px 10px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}` }}>
                    <KaossPad />
                </div>
            </div>
        </div>

        {/* TRANSPORT */}
        <div className="flex-none flex items-center justify-evenly px-4" style={{ height: 80, borderTop: `1px solid ${line}`, background: 'rgba(0,0,0,0.25)' }}>
            <div className="flex items-center gap-2">
                <button onClick={() => setBpm(b => Math.max(40, b - 5))} style={{ width: 38, height: 38, borderRadius: 8, cursor: 'pointer', background: '#181410', border: `1px solid ${line}`, color: ink, fontSize: 16 }}>−</button>
                <div className="text-center" style={{ width: 48 }}>
                    <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: ink, lineHeight: 1 }}>{bpm}</div>
                    <div style={{ fontSize: 8, color: mute, letterSpacing: 1 }}>BPM</div>
                </div>
                <button onClick={() => setBpm(b => Math.min(220, b + 5))} style={{ width: 38, height: 38, borderRadius: 8, cursor: 'pointer', background: '#181410', border: `1px solid ${line}`, color: ink, fontSize: 16 }}>+</button>
            </div>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: 56, height: 56, borderRadius: 999, cursor: 'pointer', fontSize: 22,
                border: `2px solid ${isPlaying ? '#7a1d10' : brass}`, background: isPlaying ? '#7a1d10' : `linear-gradient(180deg,${brass},${PANEL.brassDark})`, color: isPlaying ? '#f0d57f' : '#1a0d04',
                boxShadow: isPlaying ? '0 0 20px rgba(122,29,16,0.5)' : `0 0 20px ${brass}44` }}>{isPlaying ? '■' : '▶'}</button>
            <button onClick={() => setIsRecording(!isRecording)} className="flex flex-col items-center gap-1" style={{ width: 48, cursor: 'pointer', color: isRecording ? '#c4422a' : mute }}>
                <div style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${isRecording ? '#c4422a' : mute}`, background: isRecording ? '#c4422a' : 'transparent' }} />
                <span style={{ fontSize: 8.5, letterSpacing: 1 }}>REC</span>
            </button>
        </div>

        </div>
      </div>
    </div>
  );
};

export default DrumMachine;
