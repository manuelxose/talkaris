"""Regenerate the installed per-skill inventory from pinned local sources."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / 'docs/ai-development/skill-manifest.json').read_text())
lines = ['# Per-skill installation report', '', 'Metadata and source links verified locally. Activation by model inference is unverified; no new paid model calls were made. Generic upstream helpers are installed on demand; external CodeQL/Semgrep executables are not implied by skill installation.', '', '| Skill | Source | Version / content | Location | Status / validation | Milestones |', '| --- | --- | --- | --- | --- | --- |']
for path in sorted((root / '.agents/skills').iterdir()):
    resolved = path.resolve()
    source = path / 'SKILL.md'
    text = source.read_bytes()
    matches = [e for e in manifest['entries'] if resolved.is_relative_to((root / e['location']).resolve())]
    entry = max(matches, key=lambda e: len(e['location'])) if matches else None
    name = path.name
    if entry:
        origin = f"[{entry['repository'].split('github.com/')[-1]}]({entry['repository']})"
        version = entry['commit']
    else:
        origin = 'Talkaris workspace'
        version = 'local sha256:' + hashlib.sha256(text).hexdigest()[:16]
    if name.startswith('promptfoo-') or name == 'talkaris-rag-quality':
        milestones = 'M0, M4, M7'
    elif name in ('audit-context-building', 'differential-review', 'codeql', 'semgrep', 'sarif-parsing', 'talkaris-tenant-security'):
        milestones = 'M1, M7'
    elif name in ('angular-developer', 'web-design-guidelines', 'talkaris-ui-quality'):
        milestones = 'M2, M3'
    elif name == 'talkaris-ingestion':
        milestones = 'M3, M6'
    elif name == 'talkaris-operations':
        milestones = 'M6, M7'
    else:
        milestones = 'M0–M8'
    status = 'Installed; metadata/readable source verified'
    lines.append(f'| {name} | {origin} | `{version}` | `.agents/skills/{name}` | {status} | {milestones} |')
entry = next(e for e in manifest['entries'] if e['name'] == 'insecure-defaults')
lines += [f"| insecure-defaults (native command/workflow) | [{entry['repository']}]({entry['repository']}) | `{entry['commit']}` | `{entry['location']}` | Installed native Claude plugin; no portable SKILL.md published | M1, M7 |", '', 'Six native Claude plugins and their installed versions are recorded separately in [skill-manifest.json](skill-manifest.json). The native static-analysis plugin contains the individual CodeQL, Semgrep and SARIF skills listed above. Source snapshot and symlink hashes are installation evidence, not proof of security effectiveness.', '']
(root / 'docs/ai-development/installation-report.md').write_text('\n'.join(lines))
print('Generated per-skill report for', len(list((root / '.agents/skills').iterdir())), 'skill directories plus native insecure-defaults')
