"""Linux-only bounded child tree, including Chromium's separate process groups.
Acquire repository slots outside this wrapper. RSS sum may double-count shared pages.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time

LANE = Path(__file__).resolve().parent


def snapshot():
    found = {}
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            fields = (entry / 'stat').read_text().rsplit(')', 1)[1].split()
            if fields[0] != 'Z':
                found[int(entry.name)] = {'parent': int(fields[1]), 'started': fields[19], 'rss': int(fields[21]) * os.sysconf('SC_PAGE_SIZE')}
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    return found


def members(tracked):
    processes = snapshot()
    live = {pid: info for pid, info in processes.items() if tracked.get(pid) == info['started']}
    changed = True
    while changed:
        changed = False
        for pid, info in processes.items():
            if pid not in live and info['parent'] in live:
                live[pid] = info
                tracked[pid] = info['started']
                changed = True
    return live


def stop_owned(tracked, sig):
    for pid, info in members(tracked).items():
        try:
            # Retained start time prevents signalling a reused PID.
            if snapshot().get(pid, {}).get('started') == info['started']:
                os.kill(pid, sig)
        except ProcessLookupError:
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seconds', type=int, default=60, choices=range(1, 121))
    parser.add_argument('--receipt', required=True)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    path = Path(args.receipt).resolve()
    if LANE not in path.parents:
        raise ValueError('Receipt must stay inside lane')
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command:
        raise ValueError('Missing command')
    path.parent.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    peak = 0
    reason = None
    process = None
    tracked = {}
    env = {**os.environ, 'NODE_OPTIONS': '--max-old-space-size=1536', 'OMP_NUM_THREADS': '2', 'OPENBLAS_NUM_THREADS': '1'}
    try:
        with path.with_suffix('.txt').open('w') as output:
            process = subprocess.Popen(command, env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
            first = snapshot().get(process.pid)
            if first:
                tracked[process.pid] = first['started']
            while process.poll() is None:
                rss = sum(info['rss'] for info in members(tracked).values())
                peak = max(peak, rss)
                if rss > 1536 * 1024 * 1024:
                    reason = 'process-tree RSS exceeds 1536 MiB'
                    break
                if time.monotonic() - start > args.seconds:
                    reason = 'timeout'
                    break
                time.sleep(0.05)
    finally:
        if process is not None and members(tracked):
            stop_owned(tracked, signal.SIGTERM)
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                pass
            if members(tracked):
                stop_owned(tracked, signal.SIGKILL)
                cleanup_deadline = time.monotonic() + 2
                while members(tracked) and time.monotonic() < cleanup_deadline:
                    time.sleep(0.02)
        if process is not None:
            process.wait(timeout=3)
        remaining = list(members(tracked))
        receipt = {'command': command, 'exitCode': process.returncode if process else None,
                   'failure': reason, 'elapsedSeconds': round(time.monotonic() - start, 3),
                   'sampledTreePeakRssBytes': peak, 'rssLimitBytes': 1536 * 1024 * 1024,
                   'timeoutSeconds': args.seconds, 'sampleIntervalSeconds': 0.05,
                   'remainingOwnedProcesses': remaining}
        path.write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt))
    return 1 if reason or remaining else process.returncode


if __name__ == '__main__':
    raise SystemExit(main())
