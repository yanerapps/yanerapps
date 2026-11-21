#!/usr/bin/env bash
# Turns scripts/gps-go/captures/guide/ (from capture-guide.sh) into the GPS-Go guide's light and dark WebP assets.
# GuideScreenshots in the GPS-Go repository already cuts each one to the part the guide shows.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
in="$here/captures/guide"
out="$here/../../src/apps/gps-go/assets/screens"
mkdir -p "$out"

assets=(
  setup-about setup-developer setup-mock-app setup-all-set
  search pick running teleport joystick anatomy-overlay
  frag-presets frag-quick-teleport frag-destination frag-travel-time frag-bubble frag-overlay-style frag-dpad
  fab-menu draw route-sheet route-running detour
  list-places list-routes list-history summary widgets realism movement
)

for name in "${assets[@]}"; do
  for theme in light dark; do
    src="$in/$name-$theme.png"
    [ -f "$src" ] || { echo "missing $src"; exit 1; }
    cwebp -quiet -q 82 -m 6 "$src" -o "$out/$name-$theme.webp"
  done
done
echo "wrote ${#assets[@]} light and dark pairs to src/apps/gps-go/assets/screens/"
