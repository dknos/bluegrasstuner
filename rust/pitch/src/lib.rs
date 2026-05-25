//! McLeod Pitch Method (MPM) monophonic pitch detector.
//!
//! Compiled to `wasm32-unknown-unknown` as a `cdylib` and called from the
//! AudioWorklet via a hand-written C ABI over WASM linear memory — no
//! wasm-bindgen (its JS glue assumes browser globals the AudioWorkletGlobalScope
//! does not provide).
//!
//! ABI:
//!   alloc(len)            -> *mut f32   // one reusable sample buffer; call once
//!   detect(ptr, len, sr)  -> f32        // fundamental in Hz, or -1.0 if unclear
//!
//! MPM = Normalized Square Difference Function (NSDF) + key-maximum peak
//! picking + parabolic interpolation. Robust on low strings (bass B0 ≈ 30.87 Hz)
//! where plain autocorrelation octave-errors.

/// Clarity floor: the chosen NSDF peak must exceed this or we report "no pitch".
/// A clean tone sits near 1.0; ambient noise stays well below.
const CLARITY_THRESHOLD: f32 = 0.6;
/// Fraction of the strongest peak a candidate must reach to be selected.
/// Picking the *first* peak above this (not the global max) avoids octave errors.
const PEAK_RATIO: f32 = 0.9;

/// Allocate a reusable f32 buffer in WASM memory. Leaked on purpose: the caller
/// holds the pointer for the lifetime of the worklet and writes samples into it.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut f32 {
    let mut v = vec![0f32; len];
    let ptr = v.as_mut_ptr();
    core::mem::forget(v);
    ptr
}

/// Detect the fundamental frequency of `len` samples at `sr` Hz.
/// Returns the frequency in Hz, or -1.0 when no clear pitch is present.
#[no_mangle]
pub extern "C" fn detect(ptr: *const f32, len: usize, sr: f32) -> f32 {
    if ptr.is_null() || len < 64 || sr <= 0.0 {
        return -1.0;
    }
    let x = unsafe { core::slice::from_raw_parts(ptr, len) };
    mpm(x, sr)
}

fn mpm(x: &[f32], sr: f32) -> f32 {
    let n = x.len();
    let max_lag = n / 2;

    // Normalized Square Difference Function (type II).
    //   nsdf(tau) = 2 * Σ x[j]x[j+tau]  /  Σ (x[j]^2 + x[j+tau]^2)
    let mut nsdf = vec![0f32; max_lag];
    for tau in 0..max_lag {
        let mut acf = 0f32; // Σ x[j] x[j+tau]
        let mut m = 0f32; // Σ x[j]^2 + x[j+tau]^2
        let upper = n - tau;
        for j in 0..upper {
            let a = x[j];
            let b = x[j + tau];
            acf += a * b;
            m += a * a + b * b;
        }
        nsdf[tau] = if m > 0.0 { 2.0 * acf / m } else { 0.0 };
    }

    // Collect key maxima: the peak of each positive region after the main lobe.
    let mut pos = 1usize;
    // Skip the main lobe (descends from nsdf[0] = 1.0) until the first zero crossing.
    while pos < max_lag - 1 && nsdf[pos] > 0.0 {
        pos += 1;
    }

    let mut peaks: heapless_peaks::Peaks = heapless_peaks::Peaks::new();
    while pos < max_lag - 1 {
        if nsdf[pos] > 0.0 {
            let mut max_pos = pos;
            while pos < max_lag - 1 && nsdf[pos] > 0.0 {
                if nsdf[pos] > nsdf[max_pos] {
                    max_pos = pos;
                }
                pos += 1;
            }
            peaks.push(max_pos);
        } else {
            pos += 1;
        }
    }

    if peaks.is_empty() {
        return -1.0;
    }

    // Strongest peak across all candidates.
    let mut max_val = 0f32;
    for i in 0..peaks.len() {
        let v = nsdf[peaks.get(i)];
        if v > max_val {
            max_val = v;
        }
    }
    if max_val < CLARITY_THRESHOLD {
        return -1.0;
    }

    // First peak reaching PEAK_RATIO * max_val — this is the fundamental period.
    let threshold = PEAK_RATIO * max_val;
    let mut chosen = usize::MAX;
    for i in 0..peaks.len() {
        let p = peaks.get(i);
        if nsdf[p] >= threshold {
            chosen = p;
            break;
        }
    }
    if chosen == usize::MAX || chosen == 0 || chosen >= max_lag - 1 {
        return -1.0;
    }

    // Parabolic interpolation for sub-sample period accuracy.
    let s0 = nsdf[chosen - 1];
    let s1 = nsdf[chosen];
    let s2 = nsdf[chosen + 1];
    let denom = s0 - 2.0 * s1 + s2;
    let period = if denom != 0.0 {
        chosen as f32 + 0.5 * (s0 - s2) / denom
    } else {
        chosen as f32
    };

    if period <= 0.0 {
        return -1.0;
    }
    sr / period
}

/// Tiny fixed-capacity peak list so we never heap-allocate in the hot path
/// beyond the single NSDF buffer. 512 candidates is far more than any real
/// signal produces within max_lag.
mod heapless_peaks {
    const CAP: usize = 512;
    pub struct Peaks {
        buf: [usize; CAP],
        len: usize,
    }
    impl Peaks {
        pub fn new() -> Self {
            Peaks { buf: [0; CAP], len: 0 }
        }
        #[inline]
        pub fn push(&mut self, v: usize) {
            if self.len < CAP {
                self.buf[self.len] = v;
                self.len += 1;
            }
        }
        #[inline]
        pub fn get(&self, i: usize) -> usize {
            self.buf[i]
        }
        #[inline]
        pub fn len(&self) -> usize {
            self.len
        }
        #[inline]
        pub fn is_empty(&self) -> bool {
            self.len == 0
        }
    }
}
