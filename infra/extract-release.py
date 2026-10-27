#!/usr/bin/env python3
import os
import posixpath
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path


def extract_checked(archive, destination):
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        names = set()
        links = set()
        for member in members:
            name = posixpath.normpath(member.name)
            if member.name.startswith('/') or '..' in member.name.split('/') or name in names:
                raise ValueError('Unsafe or duplicate archive path')
            if not (member.isfile() or member.isdir() or member.issym() or member.islnk()):
                raise ValueError('Unsupported archive entry')
            if member.issym() or member.islnk():
                target = member.linkname if member.islnk() else posixpath.join(posixpath.dirname(name), member.linkname)
                target = posixpath.normpath(target)
                if member.linkname.startswith('/') or target == '..' or target.startswith('../'):
                    raise ValueError('Link escapes archive')
            if member.issym():
                links.add(name)
            names.add(name)
        for name in names:
            parent = posixpath.dirname(name)
            while parent and parent != '.':
                if parent in links:
                    raise ValueError('Archive entry is nested under a symlink')
                parent = posixpath.dirname(parent)
        tar.extractall(destination, members=members, filter='data')


def main():
    if len(sys.argv) != 4 or os.geteuid() == 0:
        raise SystemExit('Usage: unprivileged extract-release.py <archive> <new-directory> <expected-full-commit-sha>')
    archive, destination, sha = sys.argv[1:]
    if len(sha) != 40 or any(c not in '0123456789abcdef' for c in sha):
        raise SystemExit('Expected full commit SHA')
    target = Path(destination).absolute()
    parent = target.parent.resolve(strict=True)
    if parent.stat().st_uid != os.geteuid() or parent.stat().st_mode & 0o022:
        raise SystemExit('Destination parent must be owned by the current user and not group/world writable')
    if target.exists() or target.is_symlink():
        raise SystemExit('Destination already exists')
    script_dir = Path(__file__).resolve().parent
    with tempfile.TemporaryDirectory(prefix='.talkaris-extract-', dir=parent) as tmp:
        copy = Path(tmp) / 'release.tar.gz'
        shutil.copyfile(archive, copy)
        subprocess.run(['gh', 'attestation', 'verify', str(copy), '--repo', 'manuelxose/talkaris', '--signer-workflow',
                        'manuelxose/talkaris/.github/workflows/release-artifact.yml', '--source-ref', 'refs/heads/main',
                        '--source-digest', sha, '--signer-digest', sha, '--deny-self-hosted-runners'], check=True)
        content = Path(tmp) / 'content'
        content.mkdir()
        extract_checked(copy, content)
        digest = subprocess.check_output(['bash', str(script_dir / 'verify-release-attestation.sh'), str(content / 'manifest.json'), sha], text=True).strip()
        subprocess.run(['node', str(script_dir / 'release-manifest.mjs'), 'verify', str(content), digest], check=True)
        subprocess.run(['mv', '-Tn', '--', str(content), str(target)], check=True)
        if content.exists():
            raise SystemExit('Destination already exists')
        print(f'Extracted verified release to {target}; activation is not implemented')


if __name__ == '__main__':
    main()
