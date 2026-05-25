#!/usr/bin/env bash
# Build the WASM pitch detector and copy it into public/ for Vite to serve.
# Requires: rustup target add wasm32-unknown-unknown
set -euo pipefail
cd "$(dirname "$0")/pitch"
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/pitch.wasm ../../public/pitch.wasm
echo "→ public/pitch.wasm ($(wc -c < ../../public/pitch.wasm) bytes)"
