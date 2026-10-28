#!/usr/bin/env bash
# Captures the guide's screens on the Pixel_10 AVD, each in the light and the dark system theme.
# Usage: scripts/gps-go/capture-guide.sh [scene ...]   (no scene: all of them, in order)
# Raw PNGs land in scripts/gps-go/captures/ (git-ignored); guide-images.sh turns them into src/apps/gps-go/assets/screens/.
set -euo pipefail

sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
adb="$sdk/platform-tools/adb"
out="$(cd "$(dirname "$0")" && pwd)/captures"
mkdir -p "$out"

serial=""
for candidate in $("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" {print $1}'); do
  if [ "$("$adb" -s "$candidate" emu avd name | tr -d '\r' | head -n 1)" = "Pixel_10" ]; then serial="$candidate"; fi
done
[ -n "$serial" ] || { echo "Pixel_10 is not running. Boot it: \$ANDROID_HOME/emulator/emulator -avd Pixel_10 -no-audio -no-boot-anim -no-snapshot-save"; exit 1; }
device() { "$adb" -s "$serial" "$@"; }

demo() { device shell am broadcast -a com.android.systemui.demo "$@" >/dev/null; }
device shell settings put global sysui_demo_allowed 1
demo -e command enter
demo -e command clock -e hhmm 0941
demo -e command battery -e level 100 -e plugged false
demo -e command network -e wifi show -e mobile show -e datatype lte -e level 4 -e fully true
demo -e command notifications -e visible false
device shell cmd uimode night no >/dev/null
restore() {
  device shell cmd uimode night no >/dev/null
  demo -e command exit
}
trap restore EXIT

# name|what to set up before pressing Enter (set it up in the light theme; the dark shot follows by itself)
scenes=(
  "setup-about|系统设置 › 关于手机，滚动到「版本号」位于屏幕中部（脚本已打开该页）。|am start -a android.settings.DEVICE_INFO_SETTINGS"
  "setup-developer|系统设置 › 开发者选项 › 选择模拟位置信息应用，弹窗里 GPS-Go 已选中（脚本已打开开发者选项）。|am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS"
  "setup-mock-app|GPS-Go 的 Permission Setup Wizard（Profile › 设置 › About 里）翻到「Mock location app」一步，显示 Granted。|"
  "setup-all-set|同一向导翻到最后的「All set」总览，全部满足。|"
  "pick|未模拟时在地图上选中 Eiffel Tower，地点面板展开，可见 Start mock here。|"
  "running|点 Start mock here 后：面板收起，控制条上方显示运行状态胶囊和 Stop。隐藏摇杆。|"
  "teleport|运行中点地图上另一个地点（如 Arc de Triomphe），面板显示 Teleport here 和 Travel here。摇杆收成气泡。|"
  "search-tips|点搜索框，未输入任何内容，显示坐标和链接示例。|"
  "joystick|运行中显示摇杆，推一下后松手让它持续移动（Walk），面板显示速度、步频和 Stop moving。|"
  "presets|摇杆面板里点开速度预设，列表原地展开。|"
  "quick-teleport|摇杆面板点历史按钮，显示 Saved 列表。|"
  "quick-teleport-target|在 Saved 列表点 Big Ben，显示 Teleport here 和 Travel here。|"
  "travel-time|在上一步点 Teleport here 回到摇杆面板，读数显示跳转距离和剩余用时。|"
  "bubble|把摇杆收成气泡，气泡位于地图左侧空白处。|"
  "overlay-style|摇杆面板点设置按钮，悬浮窗里显示 Joystick style、Opacity、Joystick size。|"
  "dpad|在上一步选 D-pad 并返回，显示 D-pad 面板（拍完切回 Joystick）。|"
  "fab-menu|停止模拟，地图移到 Champ de Mars。点 +，菜单展开（Add place / Draw route / Import GPX）。|"
  "draw|在 Champ de Mars 画一圈环线到快闭合，底部显示 Curve / Straight 和工具条。拍完 Next › Close loop，存为 Champ de Mars loop，标签 Paris。|"
  "route-sheet|Routes 选 Champ de Mars loop，路线面板显示估算、Walk / Run / Bike / Custom 和 Start route。|"
  "route-running|选 Run 开始该路线，跑两三分钟：已走实线、未走虚线，状态胶囊可见。隐藏摇杆，关闭跟随，整条环线入镜。|"
  "detour|显示摇杆并拖到路线上方，推离路线约一分钟后点摇杆停下，面板显示 On a detour 和 Back on route。|"
  "list-places|Places 列表。|"
  "list-routes|Routes 列表。|"
  "list-history|History 列表，按天分组。|"
  "summary|停止一次超过 60 秒的模拟，显示会话总结页。|"
  "widgets|桌面上的 Place shortcuts 小组件。|"
  "realism|App 设置 › Realism，临时打开 Speed Variation 和 GPS Jitter（拍完关掉）。|"
  "movement|App 设置 › Movement：Walk / Run / Bike 速度。|"
)

want=" $* "
for scene in "${scenes[@]}"; do
  IFS='|' read -r name hint cmd <<<"$scene"
  [ $# -eq 0 ] || [[ "$want" == *" $name "* ]] || continue
  [ -z "$cmd" ] || device shell "$cmd" >/dev/null
  printf '\n[%s] %s\n回车拍摄，s 跳过：' "$name" "$hint"
  IFS= read -r answer </dev/tty
  [ "$answer" != "s" ] || continue
  device exec-out screencap -p >"$out/$name-light.png"
  device shell cmd uimode night yes >/dev/null
  sleep 6
  device exec-out screencap -p >"$out/$name-dark.png"
  device shell cmd uimode night no >/dev/null
  sleep 4
  echo "已保存 $name-light.png / $name-dark.png"
done
