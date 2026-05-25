
// Add subtle variations to timing, velocity, and pitch

export const humanizeVelocity = (base: number, variance: number = 0.05): number => {
    const noise = (Math.random() * 2 - 1) * variance;
    return Math.max(0.1, Math.min(0.95, base + noise));
};

export const humanizeTiming = (time: number, amountMs: number = 10): number => {
    const noise = (Math.random() * 2 - 1) * (amountMs / 1000);
    return time + noise;
};

export const humanizePitch = (freq: number, cents: number = 2): number => {
    // 1 cent = 1/100 semitone. 2^(cents/1200)
    // Reduced detune to prevent phase issues/mud
    const factor = Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
    return freq * factor;
};

// Calculate strum duration (time from low string to high string)
// Faster bpm = tighter strum
export const getStrumDuration = (bpm: number): number => {
    // at 60bpm -> 60ms? at 120bpm -> 30ms?
    // Formula: 40ms base * (120/bpm)
    return 0.04 * (120 / Math.max(40, bpm));
};
