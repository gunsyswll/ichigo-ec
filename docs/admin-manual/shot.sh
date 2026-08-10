#!/bin/bash
# Chromeのウィンドウ領域だけを撮る。最前面がChromeでなければ撮らずに中断する。
osascript -e 'tell application "Google Chrome" to activate' >/dev/null
sleep 2
FRONT=$(osascript -e 'tell application "System Events" to name of first application process whose frontmost is true')
if [ "$FRONT" != "Google Chrome" ]; then echo "ABORT: frontmost=$FRONT"; exit 1; fi
B=$(osascript -e 'tell application "Google Chrome" to get bounds of window 1' | tr -d ' ')
X=$(echo $B|cut -d, -f1); Y=$(echo $B|cut -d, -f2); X2=$(echo $B|cut -d, -f3); Y2=$(echo $B|cut -d, -f4)
W=$((X2-X)); H=$((Y2-Y))
screencapture -x -t png -R${X},${Y},${W},${H} "$1"
echo "OK captured ${W}x${H} -> $1"
