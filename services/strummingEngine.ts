
import { getChordData } from './voicingEngine';

export type StrumStyle = 'Bluegrass' | 'Boom-Chuck' | 'Waltz' | 'Swing' | 'Slo-Rock';

export interface AudioEvent {
    type: 'BASS_ROOT' | 'BASS_ALT' | 'STRUM_DOWN' | 'STRUM_UP' | 'STRUM_MUTE';
    beatOffset: number; // 0.0 to 1.0 (portion of measure? no, beats)
    velocity: number;
}

// Generate events for 1 Measure
export const generatePattern = (style: StrumStyle, beatsPerBar: number): AudioEvent[] => {
    const events: AudioEvent[] = [];

    // Velocities reduced by ~20% to prevent master bus clipping
    if (style === 'Bluegrass' || style === 'Boom-Chuck') {
        // Authentic boom-CHUCK: alternating bass on 1 & 3 (the "boom"), a muted
        // chord choke on 2 & 4 (the "chuck"). The chuck is the defining sound —
        // a short, percussive, damped strum, NOT a ringing one.
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.9 });
        events.push({ type: 'STRUM_MUTE', beatOffset: 1, velocity: 0.6 });
        events.push({ type: 'BASS_ALT', beatOffset: 2, velocity: 0.85 });
        events.push({ type: 'STRUM_MUTE', beatOffset: 3, velocity: 0.6 });

        // Bluegrass drives harder: ringing offbeat upstrokes between the chucks.
        if (style === 'Bluegrass') {
            events.push({ type: 'STRUM_UP', beatOffset: 1.5, velocity: 0.32 });
            events.push({ type: 'STRUM_UP', beatOffset: 3.5, velocity: 0.38 });
        }
    } else if (style === 'Waltz') {
        // 3/4 oom-pah-pah: bass on 1, two muted chucks on 2 & 3.
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.9 });
        events.push({ type: 'STRUM_MUTE', beatOffset: 1, velocity: 0.55 });
        events.push({ type: 'STRUM_MUTE', beatOffset: 2, velocity: 0.5 });
    } else if (style === 'Swing') {
        // Shuffle feel
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.85 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 1, velocity: 0.5 });
        events.push({ type: 'STRUM_UP', beatOffset: 1.66, velocity: 0.35 }); // Swing beat
        events.push({ type: 'BASS_ALT', beatOffset: 2, velocity: 0.8 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 3, velocity: 0.5 });
        events.push({ type: 'STRUM_UP', beatOffset: 3.66, velocity: 0.35 });
    } else {
        // Basic Rock/Slo
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.9 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 0.5, velocity: 0.4 });
        events.push({ type: 'STRUM_UP', beatOffset: 1.0, velocity: 0.5 });
        events.push({ type: 'STRUM_UP', beatOffset: 1.5, velocity: 0.4 });
        events.push({ type: 'BASS_ALT', beatOffset: 2, velocity: 0.8 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 3, velocity: 0.6 });
    }

    return events;
};
