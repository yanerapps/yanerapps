#!/usr/bin/env bash
# Turns scripts/gps-go/captures/ (from capture-guide.sh) into the GPS-Go guide's light and dark WebP assets.
# A crop is x y w h in the 1080 x 2424 capture; no crop keeps the whole screen.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
in="$here/captures"
out="$here/../../src/apps/gps-go/assets/screens"
mkdir -p "$out"

# asset|capture|crop
assets=(
  "setup-about|setup-about|0 960 1080 388"
  "setup-developer|setup-developer|0 1400 1080 288"
  "setup-mock-app|setup-mock-app|"
  "setup-all-set|setup-all-set|"
  "pick|pick|"
  "running|running|"
  "teleport|teleport|"
  "search|search-tips|"
  "joystick|joystick|"
  "anatomy-overlay|joystick|54 606 820 654"
  "frag-presets|presets|54 606 820 1079"
  "frag-quick-teleport|quick-teleport|54 606 693 998"
  "frag-destination|quick-teleport-target|54 606 693 495"
  "frag-travel-time|travel-time|465 715 400 215"
  "frag-bubble|bubble|0 540 300 260"
  "frag-overlay-style|overlay-style|54 606 693 918"
  "frag-dpad|dpad|54 606 820 655"
  "fab-menu|fab-menu|"
  "draw|draw|"
  "route-sheet|route-sheet|"
  "route-running|route-running|"
  "detour|detour|"
  "list-places|list-places|0 100 1080 1240"
  "list-routes|list-routes|0 100 1080 1240"
  "list-history|list-history|0 100 1080 1240"
  "summary|summary|0 140 1080 1480"
  "widgets|widgets|0 420 1080 900"
  "realism|realism|0 140 1080 1580"
  "movement|movement|0 140 1080 1420"
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for asset in "${assets[@]}"; do
  IFS='|' read -r name capture crop <<<"$asset"
  for theme in light dark; do
    src="$in/$capture-$theme.png"
    [ -f "$src" ] || { echo "missing $src"; exit 1; }
    if [ -n "$crop" ]; then
      read -r x y w h <<<"$crop"
      ffmpeg -loglevel error -y -i "$src" -vf "crop=$w:$h:$x:$y" "$tmp/c.png"
      src="$tmp/c.png"
    fi
    cwebp -quiet -q 82 -m 6 "$src" -o "$out/$name-$theme.webp"
  done
done
echo "wrote ${#assets[@]} light and dark pairs to src/apps/gps-go/assets/screens/"
