"""Exercise the failure boundary with an owned child that starts a separate session."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

LANE = Path(__file__).resolve().parent


class Boundary(unittest.TestCase):
    def test_timeout_reaps_detached_child_and_records_tree_memory(self):
        (LANE / 'runs').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=LANE / 'runs') as directory:
            receipt = Path(directory) / 'timeout.json'
            child = 'import time; allocation=bytearray(32*1024*1024); time.sleep(20)'
            parent = f'import subprocess,sys,time; p=subprocess.Popen([sys.executable,"-c",{child!r}],start_new_session=True); print(p.pid,flush=True); time.sleep(20)'
            result = subprocess.run([sys.executable, str(LANE / 'bounded_run.py'), '--seconds', '1', '--receipt', str(receipt), '--', sys.executable, '-c', parent], capture_output=True, text=True, timeout=8)
            self.assertEqual(result.returncode, 1)
            data = json.loads(receipt.read_text())
            self.assertEqual(data['failure'], 'timeout')
            self.assertGreater(data['sampledTreePeakRssBytes'], 32 * 1024 * 1024)
            self.assertEqual(data['remainingOwnedProcesses'], [])
            pid = int(receipt.with_suffix('.txt').read_text().strip())
            proc = Path(f'/proc/{pid}/stat')
            self.assertTrue(not proc.exists() or proc.read_text().rsplit(')', 1)[1].split()[0] == 'Z')

    def test_child_failure_is_not_reported_as_success(self):
        with tempfile.TemporaryDirectory(dir=LANE / 'runs') as directory:
            receipt = Path(directory) / 'exit.json'
            result = subprocess.run([sys.executable, str(LANE / 'bounded_run.py'), '--receipt', str(receipt), '--', sys.executable, '-c', 'raise SystemExit(7)'], capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, 7)
            self.assertEqual(json.loads(receipt.read_text())['exitCode'], 7)


if __name__ == '__main__':
    unittest.main()
