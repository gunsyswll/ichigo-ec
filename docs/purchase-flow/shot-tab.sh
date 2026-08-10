#!/bin/bash
# shot-tab.sh <url-substring> <out.png>
# Chromeの「URLが一致するタブ」を選んでから、そのウィンドウ領域だけを撮る。
# 一致するタブが無ければ撮らずに中断する（別のアプリ／別ページを撮らないため）。
set -u
MATCH="$1"; OUT="$2"

osascript -e 'tell application "Google Chrome" to activate' >/dev/null
sleep 1

# 一致するタブを探して選択（window index と tab index を返す）
SEL=$(osascript <<OSA
tell application "Google Chrome"
  repeat with w from 1 to (count of windows)
    set tabs_ to tabs of window w
    repeat with t from 1 to (count of tabs_)
      if URL of item t of tabs_ contains "$MATCH" then
        set index of window w to 1
        set active tab index of window w to t
        return (w as string) & "," & (t as string)
      end if
    end repeat
  end repeat
  return "NONE"
end tell
OSA
)
if [ "$SEL" = "NONE" ]; then echo "ABORT: no tab matching '$MATCH'"; exit 1; fi

sleep 2
FRONT=$(osascript -e 'tell application "System Events" to name of first application process whose frontmost is true')
if [ "$FRONT" != "Google Chrome" ]; then echo "ABORT: frontmost=$FRONT"; exit 1; fi

# 撮る直前に、選択タブのURLが本当に一致しているか再確認
CUR=$(osascript -e 'tell application "Google Chrome" to get URL of active tab of window 1')
case "$CUR" in
  *"$MATCH"*) ;;
  *) echo "ABORT: active tab is $CUR"; exit 1;;
esac

B=$(osascript -e 'tell application "Google Chrome" to get bounds of window 1' | tr -d ' ')
X=$(echo $B|cut -d, -f1); Y=$(echo $B|cut -d, -f2); X2=$(echo $B|cut -d, -f3); Y2=$(echo $B|cut -d, -f4)
W=$((X2-X)); H=$((Y2-Y))
screencapture -x -t png -R${X},${Y},${W},${H} "$OUT"
echo "OK tab=$SEL url=$CUR ${W}x${H} -> $OUT"
