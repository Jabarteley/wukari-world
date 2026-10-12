#!/usr/bin/env python3
"""Capture redacted Linux runner resource snapshots for boundary diagnostics."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time


def read_text(path):
    try:
        return Path(path).read_text().strip()
    except (OSError, UnicodeError):
        return None


def meminfo():
    values = {}
    for line in (read_text('/proc/meminfo') or '').splitlines():
        key, _, raw = line.partition(':')
        parts = raw.split()
        if parts:
            try:
                value = int(parts[0])
                values[key] = value * (1024 if len(parts) > 1 and parts[1] == 'kB' else 1)
            except ValueError:
                continue
    wanted = ('MemTotal', 'MemAvailable', 'MemFree', 'Buffers', 'Cached', 'SwapTotal', 'SwapFree')
    return {key: values[key] for key in wanted if key in values}


def cgroup_memory():
    """Return current cgroup memory counters without assuming v1 or v2."""
    memberships = read_text('/proc/self/cgroup') or ''
    mountinfo = read_text('/proc/self/mountinfo') or ''
    v2_path = next((line.split(':', 2)[2] for line in memberships.splitlines()
                    if line.startswith('0::')), None)
    if v2_path is not None:
        for line in mountinfo.splitlines():
            before, separator, after = line.partition(' - ')
            if separator and after.startswith('cgroup2 '):
                fields = before.split()
                root, mount = fields[3], fields[4]
                relative = v2_path.removeprefix(root).lstrip('/') if v2_path.startswith(root) else v2_path.lstrip('/')
                base = Path(mount) / relative
                result = {'version': 2}
                for name in ('memory.current', 'memory.max', 'memory.peak'):
                    result[name] = read_text(base / name)
                events = read_text(base / 'memory.events')
                result['memory.events'] = parse_counters(events)
                return result
    v1_path = next((line.split(':', 2)[2] for line in memberships.splitlines()
                    if 'memory' in line.split(':', 2)[1].split(',')), None)
    if v1_path is not None:
        for line in mountinfo.splitlines():
            before, separator, after = line.partition(' - ')
            if separator and after.startswith('cgroup '):
                super_options = after.split()[2:]
                if not any('memory' in item.split(',') for item in super_options):
                    continue
                fields = before.split()
                root, mount = fields[3], fields[4]
                relative = v1_path.removeprefix(root).lstrip('/') if v1_path.startswith(root) else v1_path.lstrip('/')
                base = Path(mount) / relative
                return {
                    'version': 1,
                    'memory.usage_in_bytes': read_text(base / 'memory.usage_in_bytes'),
                    'memory.limit_in_bytes': read_text(base / 'memory.limit_in_bytes'),
                    'memory.failcnt': read_text(base / 'memory.failcnt'),
                }
    return {'version': None, 'unavailable': True}


def parse_counters(raw):
    if raw is None:
        return None
    result = {}
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) == 2:
            try:
                result[parts[0]] = int(parts[1])
            except ValueError:
                continue
    return result


def proc_entries():
    entries = {}
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        raw = read_text(proc / 'stat')
        if raw is None:
            continue
        # comm is parenthesized and may itself contain spaces or parentheses.
        opening, closing = raw.find('('), raw.rfind(')')
        if opening < 0 or closing <= opening:
            continue
        fields = raw[closing + 1:].split()
        if len(fields) < 22:
            continue
        try:
            pid = int(raw[:opening].strip())
            ppid = int(fields[1])
            state = fields[0]
            start_ticks = int(fields[19])
            rss_pages = int(fields[21])
            status = read_text(proc / 'status') or ''
            sizes = {}
            for line in status.splitlines():
                key, _, value = line.partition(':')
                if key in ('VmRSS', 'VmSize'):
                    parts = value.split()
                    if parts:
                        sizes[key] = int(parts[0]) * 1024
            entries[pid] = {
                'pid': pid, 'ppid': ppid, 'rssBytes': sizes.get('VmRSS', rss_pages * os.sysconf('SC_PAGE_SIZE')),
                'vszBytes': sizes.get('VmSize'), 'state': state,
                'elapsedSeconds': max(0, int(time.monotonic() - start_ticks / os.sysconf('SC_CLK_TCK'))),
                'name': read_text(proc / 'comm'),
            }
        except (OSError, ValueError, IndexError):
            continue
    return entries


def ps_entries():
    """Fallback process metadata for development hosts without /proc."""
    try:
        result = subprocess.run(
            ['ps', '-axo', 'pid=,ppid=,rss=,vsz=,state=,etime=,comm='],
            check=True, capture_output=True, text=True,
        )
    except (OSError, subprocess.SubprocessError):
        return {}
    entries = {}
    for line in result.stdout.splitlines():
        parts = line.strip().split(None, 6)
        if len(parts) < 7:
            continue
        try:
            pid, ppid, rss_kb, vsz_kb = map(int, parts[:4])
            elapsed = parts[5]
            seconds = 0
            for component in elapsed.split(':'):
                seconds = seconds * 60 + int(component)
            entries[pid] = {
                'pid': pid, 'ppid': ppid, 'rssBytes': rss_kb * 1024,
                'vszBytes': vsz_kb * 1024, 'state': parts[4],
                'elapsedSeconds': seconds, 'name': Path(parts[6]).name,
            }
        except ValueError:
            continue
    return entries


def process_tree(pid):
    entries = proc_entries() if Path('/proc').is_dir() else ps_entries()
    if pid not in entries:
        return []
    selected = {pid}
    changed = True
    while changed:
        changed = False
        for child, entry in entries.items():
            if child not in selected and entry['ppid'] in selected:
                selected.add(child)
                changed = True
    return [entries[key] for key in sorted(selected)]


def snapshot(root, pid=None, signal_name=None):
    usage = shutil.disk_usage(root)
    stats = os.statvfs(root)
    return {
        'timestampUtc': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'runner': {
            'os': os.environ.get('RUNNER_OS'), 'arch': os.environ.get('RUNNER_ARCH'),
            'imageOS': os.environ.get('ImageOS'), 'imageVersion': os.environ.get('ImageVersion'),
            'platform': sys.platform,
        },
        'memoryBytes': meminfo(),
        'cgroupMemory': cgroup_memory(),
        'disk': {
            'root': str(root), 'totalBytes': usage.total, 'usedBytes': usage.used,
            'freeBytes': usage.free, 'inodeTotal': stats.f_files,
            'inodeFree': stats.f_favail,
        },
        'processTree': process_tree(pid) if pid is not None else [],
        **({'signal': signal_name} if signal_name else {}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True, help='Filesystem root to measure')
    parser.add_argument('--pid', type=int, help='Sample this process and descendants until it exits')
    parser.add_argument('--interval', type=float, default=5.0, help='Sampling interval in seconds (default: 5)')
    parser.add_argument('--output', type=Path, help='JSONL destination; stdout when omitted')
    parser.add_argument('--mirror-stdout', action='store_true', help='Also stream each sample to stdout when --output is set')
    args = parser.parse_args()
    if not args.root.is_dir():
        parser.error('--root must be an existing directory')
    if args.pid is not None and args.pid <= 0:
        parser.error('--pid must be a positive process ID')
    if args.interval <= 0:
        parser.error('--interval must be positive')
    output = args.output.open('a', encoding='utf-8') if args.output else sys.stdout
    stopped = {'signal': None}

    def stop(signum, _frame):
        stopped['signal'] = signal.Signals(signum).name

    if args.pid is not None:
        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
    try:
        while True:
            record = snapshot(args.root, args.pid, stopped['signal'])
            line = json.dumps(record, separators=(',', ':'), allow_nan=False) + '\n'
            output.write(line)
            output.flush()
            if args.mirror_stdout and output is not sys.stdout:
                sys.stdout.write(line)
                sys.stdout.flush()
            if args.pid is None or stopped['signal'] or not record['processTree']:
                break
            time.sleep(args.interval)
    finally:
        if output is not sys.stdout:
            output.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
