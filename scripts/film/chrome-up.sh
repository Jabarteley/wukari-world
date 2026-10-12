#!/bin/zsh
# Start one headless Chrome (Metal GPU) on the given debug port with a fresh profile; prints its PID. Stop with: kill <pid>
PORT=${1:-4632}; PROFILE=$(mktemp -d /tmp/x1-chrome-XXXXXX)
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --mute-audio --remote-debugging-port=$PORT --user-data-dir=$PROFILE --no-first-run --no-default-browser-check --enable-gpu --ignore-gpu-blocklist --use-angle=metal --hide-scrollbars --disable-background-networking --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-features=CalculateNativeWinOcclusion about:blank >/dev/null 2>&1 &
echo $! > /tmp/x1-chrome-$PORT.pid; echo $PROFILE > /tmp/x1-chrome-$PORT.profile; echo "pid $! profile $PROFILE"
