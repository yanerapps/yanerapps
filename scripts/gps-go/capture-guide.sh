#!/usr/bin/env bash
# Captures the guide's screens on the Galaxy_S26 AVD, light and dark, by running GPS-Go's GuideScreenshots test
# through store-kit (`uv tool install --editable ~/Developer/yanerapps-studio/shared/store-kit`, once).
# store-kit builds the -PstoreDemo=true app, boots the AVD if needed, sets it up as for the store shots (demo status
# bar, permissions, the store demo backup) and puts every setting back afterwards.
# Run store-kit's galaxy-avd-setup.sh on the AVD once first (and again after Wipe Data), so the status bar clears the camera.
# Raw PNGs land in scripts/gps-go/captures/guide/ (git-ignored); guide-images.sh turns them into src/apps/gps-go/assets/screens/.
set -euo pipefail

app="${GPS_GO:-$HOME/Developer/yanerapps-studio/apps/gps-go}"
assets="${APP_ASSETS:-$HOME/Developer/yanerapps-studio/shared/app-assets}"
captures="$(cd "$(dirname "$0")" && pwd)/captures"
root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT

cat >"$root/store.toml" <<EOF
title = "GPS-Go guide"
app = "$app"
package = "com.yanerapps.gpsgo"
created = [2026, 9, 30]
captures = "$captures"

[capture]
build = ["./gradlew", "-q", ":app:assembleDebug", ":app:assembleDebugAndroidTest", "-PstoreDemo=true"]
apks = ["app/build/outputs/apk/debug/app-debug.apk", "app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"]
test = "com.yanerapps.gpsgo.store.GuideScreenshots"
grant = ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION", "android.permission.POST_NOTIFICATIONS"]
settings = { "system notification_cooldown_enabled" = "0", "global heads_up_notifications_enabled" = "0", "global development_settings_enabled" = "1" }
setup = [
    "shell appops set {package} android:mock_location allow",
    "shell appops set {package} SYSTEM_ALERT_WINDOW allow",
    "shell cmd deviceidle whitelist +{package}",
    "shell appwidget grantbind --package {package} --user 0",
    "emu geo fix 2.2945 48.8584",
]
args = { backup = "@base64:$assets/gps-go/gpsgo-store-demo-v4.json" }

[compose]
dir = "composed"
shots = {}

[sets.guide]
label = "Guide"
avd = "Galaxy_S26"
EOF

rm -rf "$captures/guide"
store-kit capture guide --root "$root"
# store-kit reports a failed test but still exits 0; the test leaves _failure.png behind.
[ ! -f "$captures/guide/_failure.png" ] || { echo "GuideScreenshots failed: see $captures/guide-capture.log and _failure.png" >&2; exit 1; }
