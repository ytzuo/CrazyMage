#!/usr/bin/env bash
set -euo pipefail

# Compress mastered WAV audio into runtime AAC (.m4a) assets for smaller desktop/Android bundles.
# Original WAV masters remain untouched under artifacts/audio-drafts/.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_MUSIC="$ROOT_DIR/artifacts/audio-drafts/music"
SRC_SFX="$ROOT_DIR/artifacts/audio-drafts/sfx"
OUT_MUSIC="$ROOT_DIR/src/game/audio/media/music"
OUT_SFX="$ROOT_DIR/src/game/audio/media/sfx"

mkdir -p "$OUT_MUSIC" "$OUT_SFX"

encode_m4a() {
  local src="$1"
  local dst="$2"
  local bitrate="$3"
  if command -v afconvert >/dev/null 2>&1; then
    afconvert -f m4af -d aac -b "$bitrate" -q 127 "$src" "$dst"
  elif command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -v error -i "$src" -c:a aac -b:a "$bitrate" "$dst"
  else
    echo "Error: neither afconvert (macOS) nor ffmpeg is available." >&2
    exit 1
  fi
}

for track in unstable_mage_theme battle_loop; do
  encode_m4a "$SRC_MUSIC/${track}.wav" "$OUT_MUSIC/${track}.m4a" 160000
done

rm -f "$OUT_SFX"/*.m4a
for wav in "$SRC_SFX"/*.wav; do
  name="$(basename "$wav" .wav)"
  encode_m4a "$wav" "$OUT_SFX/${name}.m4a" 128000
done

echo "Compressed 2 music tracks and $(ls -1 "$OUT_SFX"/*.m4a | wc -l | tr -d ' ') SFX tracks into src/game/audio/media/."
