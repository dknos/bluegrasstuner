
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
        // Classic: Root(1) Strum(2) Alt(3) Strum(4)
        // If 4/4
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.85 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 1, velocity: 0.5 }); // weaker strum
        events.push({ type: 'BASS_ALT', beatOffset: 2, velocity: 0.8 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 3, velocity: 0.55 });
        
        // Add subtle upstrokes or ghost notes for "Bluegrass" feel
        if (style === 'Bluegrass') {
            events.push({ type: 'STRUM_UP', beatOffset: 1.5, velocity: 0.35 });
            events.push({ type: 'STRUM_UP', beatOffset: 3.5, velocity: 0.4 });
        }
    } else if (style === 'Waltz') {
        // 3/4: Bass Strum Strum
        events.push({ type: 'BASS_ROOT', beatOffset: 0, velocity: 0.9 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 1, velocity: 0.5 });
        events.push({ type: 'STRUM_DOWN', beatOffset: 2, velocity: 0.45 });
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
