"""Safety invariants; uses temporary accounting data and never calls a model."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest

spec = importlib.util.spec_from_file_location('control', Path(__file__).with_name('control.py'))
control = importlib.util.module_from_spec(spec)
spec.loader.exec_module(control)


class Controls(unittest.TestCase):
    def test_simultaneous_claims_have_one_owner(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / 'usage.db'
            with control.database(db):
                pass
            start = threading.Barrier(2)
            def claim(task):
                start.wait(timeout=5)
                try:
                    control.dispatch(argparse.Namespace(db=db, action='claim', task=task, agent=task, paths=['apps/chat-api']))
                    return True
                except ValueError:
                    return False
            with ThreadPoolExecutor(max_workers=2) as pool:
                self.assertEqual(sorted(pool.map(claim, ['A', 'B'])), [False, True])

    def test_accounting_and_ownership(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / 'usage.db'
            def run(action, **kw):
                return control.dispatch(argparse.Namespace(db=db, action=action, **kw))
            run('claim', task='A', agent='backend', paths=['apps/chat-api'])
            with self.assertRaises(ValueError):
                run('claim', task='B', agent='qa', paths=['apps/chat-api/src/main.ts'])
            with self.assertRaises(ValueError):
                run('claim', task='B', agent='qa', paths=['../secret'])
            run('claim', task='B', agent='frontend', paths=['apps/portal'])
            run('claim', task='C', agent='rag', paths=['apps/ingest-worker'])
            with self.assertRaises(ValueError):
                run('claim', task='D', agent='qa', paths=['packages/core'])
            run('release', task='A')
            run('claim', task='D', agent='qa', paths=['apps/chat-api'])
            data = dict(provider='test', model='offline', agent='qa', task='M0.1', milestone='M0', input_tokens=10, output_tokens=2, cached_tokens=0, estimated_usd=2, billed_usd=None, retries=0, failures=0)
            path = Path(directory) / 'event.json'; path.write_text(json.dumps(data))
            run('record', file=str(path))
            self.assertEqual(run('status')['monthlyUsd'], 2)
            with self.assertRaises(ValueError):
                run('route', provider='codex', task='M0.1', agent='qa', complexity='implementation')
            with self.assertRaises(ValueError):
                run('route', provider='missing', task='new', agent='qa', complexity='implementation')
            data['input_tokens'] = -1; path.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                run('record', file=str(path))


if __name__ == '__main__':
    unittest.main()
