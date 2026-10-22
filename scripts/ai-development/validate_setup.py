"""Validate local skill links/metadata and native role files; no inference."""
import json
import os
from pathlib import Path
import tomllib

root = Path(__file__).resolve().parents[2]
skills = root / '.agents/skills'
rows = []
for folder in sorted(skills.iterdir()):
    source = folder / 'SKILL.md'
    text = source.read_text()
    assert text.startswith('---') and '\nname:' in text and '\ndescription:' in text, source
    rows.append(folder.name)
    if folder.name.startswith('talkaris-'):
        link = root / '.claude/skills' / folder.name
        if not link.exists() and not link.is_symlink():
            os.symlink(os.path.relpath(folder, link.parent), link, target_is_directory=True)
        assert (link / 'SKILL.md').is_file(), link
roles = list((root / '.codex/agents').glob('*.toml'))
for path in roles + [root / '.codex/config.toml']:
    with path.open('rb') as stream:
        tomllib.load(stream)
claude = list((root / '.claude/agents').glob('talkaris-*.md'))
assert len(roles) == len(claude) == 8
print(json.dumps({'skillDirectories': len(rows), 'talkarisSkills': sum(x.startswith('talkaris-') for x in rows), 'codexRoles': len(roles), 'claudeRoles': len(claude), 'validation': 'metadata and local discoverability only; no model activation'}, indent=2))
