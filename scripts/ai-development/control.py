"""Local advisory accounting and atomic file ownership. Never invokes models."""
import argparse
from contextlib import contextmanager
import datetime as dt
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def default_database():
    common = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()
    return Path(common) / 'talkaris-ai' / 'usage.sqlite3'


@contextmanager
def database(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.execute('CREATE TABLE IF NOT EXISTS usage (stamp TEXT, provider TEXT, model TEXT, agent TEXT, task TEXT, milestone TEXT, input_tokens INTEGER, output_tokens INTEGER, cached_tokens INTEGER, estimated_usd REAL, billed_usd REAL, retries INTEGER, failures INTEGER)')
    db.execute('CREATE TABLE IF NOT EXISTS ownership (task TEXT, agent TEXT, path TEXT, PRIMARY KEY(task,path))')
    try:
        with db:
            yield db
    finally:
        db.close()


def clean_path(value):
    p = Path(value)
    if p.is_absolute() or '..' in p.parts or not p.parts:
        raise ValueError('Ownership paths must be repository-relative, without traversal')
    return p.as_posix().rstrip('/')


def overlaps(a, b):
    return a == b or a.startswith(b + '/') or b.startswith(a + '/')


def dispatch(args):
    policy = json.loads((ROOT / 'scripts/ai-development/routing.json').read_text())
    with database(args.db) as db:
        if args.action == 'record':
            data = json.loads(Path(args.file).read_text())
            fields = ['provider', 'model', 'agent', 'task', 'milestone', 'input_tokens', 'output_tokens', 'cached_tokens', 'estimated_usd', 'billed_usd', 'retries', 'failures']
            if set(data) != set(fields):
                raise ValueError('Usage must supply exactly: ' + ', '.join(fields))
            for key in fields[:5]:
                if not isinstance(data[key], str) or not data[key].strip():
                    raise ValueError('Missing usage identity: ' + key)
            for key in fields[5:]:
                val = data[key]
                if val is None and key == 'billed_usd':
                    continue
                if isinstance(val, bool) or not isinstance(val, (int, float)) or val < 0 or val != val or val == float('inf'):
                    raise ValueError('Invalid nonnegative usage field: ' + key)
                if 'tokens' in key or key in ('retries', 'failures'):
                    if not isinstance(val, int):
                        raise ValueError('Count must be integer: ' + key)
            stamp = dt.datetime.now(dt.timezone.utc).isoformat()
            db.execute('INSERT INTO usage VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [stamp] + [data[k] for k in fields])
            return {'recorded': True, 'stamp': stamp, 'enforcement': 'advisory; no model requests intercepted'}
        if args.action == 'status':
            month = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m') + '%'
            total = db.execute('SELECT COALESCE(SUM(COALESCE(billed_usd, estimated_usd)),0) FROM usage WHERE stamp LIKE ?', (month,)).fetchone()[0]
            return {'monthlyUsd': total, 'budgetUsd': policy['monthlyBudgetUsd'], 'warning': total >= policy['monthlyBudgetUsd'] * policy['warningFraction'], 'pauseNewTasks': policy['paused'] or total >= policy['monthlyBudgetUsd'], 'enforcement': 'advisory; unknown/unrecorded consumption is not measured'}
        if args.action == 'claim':
            paths = [clean_path(p) for p in args.paths]
            db.execute('BEGIN IMMEDIATE')
            rows = db.execute('SELECT task,agent,path FROM ownership').fetchall()
            if any(t == args.task and a != args.agent for t, a, _ in rows):
                raise ValueError('Task already belongs to another agent')
            if args.task not in {r[0] for r in rows} and len({r[0] for r in rows}) >= 3:
                raise ValueError('Three implementation tasks already active; serialize reviewer')
            for task, agent, held in rows:
                if task != args.task and any(overlaps(p, held) for p in paths):
                    raise ValueError(f'Path conflict with {task}/{agent}: {held}')
            db.executemany('INSERT OR IGNORE INTO ownership VALUES (?,?,?)', [(args.task, args.agent, p) for p in paths])
            return {'claimed': paths, 'task': args.task}
        if args.action == 'release':
            db.execute('DELETE FROM ownership WHERE task=?', (args.task,))
            return {'released': args.task}
        if args.action == 'route':
            if args.provider not in policy['providers']:
                raise ValueError('Unknown provider; no fallback executed')
            month = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m') + '%'
            for column, value, limit in [('stamp LIKE', month, policy['monthlyBudgetUsd']), ('task =', args.task, policy['taskBudgetUsd']), ('agent =', args.agent, policy['agentBudgetUsd'])]:
                # Column expressions are fixed above, never supplied by a caller.
                used = db.execute(f'SELECT COALESCE(SUM(COALESCE(billed_usd,estimated_usd)),0) FROM usage WHERE {column} ?', (value,)).fetchone()[0]
                if used >= limit:
                    raise ValueError('Advisory budget exceeded: ' + column)
            if policy['paused']:
                raise ValueError('New tasks paused by policy')
            return {'provider': args.provider, 'class': args.complexity, 'model': 'inherit current verified account setting', 'execution': False, 'command': [args.provider], 'preflight': 'Verify entitlement, billing, quota and task cost; unknown model fails closed. No automatic cross-provider routing.'}
        if args.action == 'worktree':
            if not args.name.replace('-', '').replace('_', '').isalnum():
                raise ValueError('Use an alphanumeric task name with hyphens/underscores')
            target = ROOT.parent / ('talkaris-task-' + args.name)
            branch = 'codex/' + args.name
            # New worktree uses committed HEAD. Never copies dirty changes or secrets.
            subprocess.run(['git', '-C', str(ROOT), 'worktree', 'add', '-b', branch, str(target), 'HEAD'], check=True)
            return {'worktree': str(target), 'branch': branch, 'warning': 'Uncommitted setup/application changes are NOT included. Commit reviewed setup first or explicitly transfer a reviewed patch.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', type=Path, help='Override the shared Git common-directory ledger')
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('status')
    record = sub.add_parser('record'); record.add_argument('file')
    claim = sub.add_parser('claim'); claim.add_argument('task'); claim.add_argument('agent'); claim.add_argument('paths', nargs='+')
    release = sub.add_parser('release'); release.add_argument('task')
    route = sub.add_parser('route'); route.add_argument('provider'); route.add_argument('--task', required=True); route.add_argument('--agent', required=True); route.add_argument('--complexity', choices=['mechanical', 'implementation', 'high-risk'], default='implementation')
    worktree = sub.add_parser('worktree'); worktree.add_argument('name')
    args = parser.parse_args()
    try:
        if args.db is None:
            args.db = default_database()
        print(json.dumps(dispatch(args), indent=2))
    except (ValueError, sqlite3.Error, subprocess.CalledProcessError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
