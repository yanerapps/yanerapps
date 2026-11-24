#!/usr/bin/env bash
# Cuts the site images that come from the store captures in app-assets (`captures/phone/` of each app, taken by
# store-kit on the Galaxy_S26 AVD at 2160 x 4680) into WebP: GPS-Go's hero showcase and PingDeck's screens.
# Usage: scripts/store-crops.sh        (APP_ASSETS overrides the app-assets checkout)
# A crop is x y w h in the capture, scaled to the output size; re-measure both when a capture's layout changes.
set -euo pipefail

assets="${APP_ASSETS:-$HOME/Developer/yanerapps-studio/shared/app-assets}"
site="$(cd "$(dirname "$0")/.." && pwd)/src/apps"

# output (under src/apps)|capture (under app-assets)|crop|output size
images=(
  "gps-go/assets/showcase/places-light|gps-go/captures/phone/feature-places-light|0 388 2160 3553|400x658"
  "gps-go/assets/showcase/places-dark|gps-go/captures/phone/feature-places-dark|0 388 2160 3553|400x658"
  "gps-go/assets/showcase/map-light|gps-go/captures/phone/feature-route-light|0 170 2880 2522|620x543"
  "gps-go/assets/showcase/map-dark|gps-go/captures/phone/feature-route-dark|0 170 2880 2522|620x543"
  "gps-go/assets/showcase/joystick-light|gps-go/captures/phone/feature-joystick-light|144 800 1640 1403|472x404"
  "gps-go/assets/showcase/joystick-dark|gps-go/captures/phone/feature-joystick-dark|144 800 1640 1403|472x404"
  "pingdeck/assets/screens/list|pingdeck/captures/phone/list|0 0 2160 4680|1080x2340"
  "pingdeck/assets/screens/attention|pingdeck/captures/phone/attention|0 0 2160 4680|1080x2340"
  "pingdeck/assets/screens/add-network|pingdeck/captures/phone/add-network|0 0 2160 4680|1080x2340"
  "pingdeck/assets/screens/summary|pingdeck/captures/phone/summary|0 0 2160 4680|1080x2340"
  "pingdeck/assets/screens/alerts|pingdeck/captures/phone/alerts-shade|80 2432 2000 532|1000x266"
  "pingdeck/assets/screens/ongoing|pingdeck/captures/phone/alerts-shade|82 1218 2000 1128|1000x564"
  "pingdeck/assets/screens/chart|pingdeck/captures/phone/detail-chart-dark|80 2404 2000 1942|1000x971"
  "pingdeck/assets/screens/dashboard|pingdeck/captures/phone/dashboard|40 280 2080 2652|1040x1326"
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for image in "${images[@]}"; do
  IFS='|' read -r out capture crop size <<<"$image"
  src="$assets/$capture.png"
  [ -f "$src" ] || { echo "missing $src"; exit 1; }
  read -r x y w h <<<"$crop"
  ffmpeg -loglevel error -y -i "$src" -vf "crop=$w:$h:$x:$y,scale=${size/x/:}:flags=lanczos" "$tmp/c.png"
  cwebp -quiet -q 82 -m 6 "$tmp/c.png" -o "$site/$out.webp"
done
echo "wrote ${#images[@]} images under src/apps/"
