import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [operation, rootArg, commit, tree] = process.argv.slice(2);
const root = await realpath(rootArg);
const manifestPath = path.join(root, 'manifest.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function inventory(dir = '') {
  const result = {};
  for (const name of (await readdir(path.join(root, dir))).sort()) {
    const relative = path.posix.join(dir, name);
    if (relative === 'manifest.json') continue;
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) {
      const target = await realpath(file);
      if (!target.startsWith(root + path.sep)) throw new Error(`External link: ${relative}`);
      result[relative] = { link: await readlink(file) };
    } else if (stat.isDirectory()) {
      Object.assign(result, await inventory(relative));
    } else if (stat.isFile()) {
      result[relative] = { sha256: hash(await readFile(file)), mode: stat.mode & 0o777 };
    } else throw new Error(`Unsupported file: ${relative}`);
  }
  return result;
}

if (operation === 'create') {
  if (!/^[0-9a-f]{40}$/.test(commit ?? '') || !/^[0-9a-f]{40}$/.test(tree ?? '')) throw new Error('Full commit and tree IDs required');
  const artifacts = ['apps/chat-api/dist/main.js', 'apps/ingest-worker/dist/main.js', 'apps/widget/server.mjs', 'apps/portal/dist/portal/server/server.mjs'];
  for (const artifact of artifacts) if (!(await lstat(path.join(root, artifact))).isFile()) throw new Error(`Missing artifact: ${artifact}`);
  const files = await inventory();
  const migrations = Object.keys(files).filter((name) => /^apps\/chat-api\/migrations\/.*\.sql$/.test(name));
  if (!migrations.length) throw new Error('Missing migrations');
  const manifest = { releaseId: path.basename(root), commit, tree, builtAt: new Date().toISOString(), node: process.version, artifacts, migrations, files };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  console.log(hash(await readFile(manifestPath)));
} else if (operation === 'verify') {
  if (!/^[0-9a-f]{64}$/.test(commit ?? '')) throw new Error('Expected manifest SHA-256 required');
  const bytes = await readFile(manifestPath);
  if (hash(bytes) !== commit) throw new Error('Manifest digest mismatch');
  const manifest = JSON.parse(bytes);
  if (JSON.stringify(await inventory()) !== JSON.stringify(manifest.files)) throw new Error('Release contents differ from manifest');
  console.log(`Verified ${manifest.releaseId} ${manifest.commit}`);
} else throw new Error('Usage: release-manifest.mjs create <release> <commit> <tree> | verify <release> <manifest-sha256>');
