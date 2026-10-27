import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync } from 'node:fs';

const root = fileURLToPath(new URL('../..', import.meta.url));
process.chdir(root);
const id = `talkaris-m0-${randomUUID().slice(0, 12)}`;
const output = resolve('evidence', id);
const temp = await mkdtemp(join(tmpdir(), 'talkaris-m0-'));
let runner = false, db = false, mail = false, image = false, flowStarted = false;
let interrupted, cleaning = false, activeChild, activeCommand;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = signal;
  process.exitCode = 1;
  if (!cleaning && activeChild && ['build', 'exec'].includes(activeCommand)) activeChild.kill();
});
await mkdir(output, { recursive: true });
function docker(args, capture = false) {
  return new Promise((resolveCommand, reject) => {
    if (interrupted && !cleaning) return reject(new Error(`Interrupted by ${interrupted}`));
    appendFileSync(join(output, 'launcher.log'), `$ docker ${args.join(' ')}\n`);
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    activeChild = child; activeCommand = args[0];
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { appendFileSync(join(output, 'launcher.log'), chunk); if (capture) stdout += chunk; else process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { appendFileSync(join(output, 'launcher.log'), chunk); if (capture) stderr += chunk; else process.stderr.write(chunk); });
    child.on('error', reject);
    child.on('close', (code, signal) => { activeChild = undefined; code === 0 ? resolveCommand(stdout) : reject(new Error(`docker ${args[0]} failed (${code}/${signal}): ${stderr || stdout}; full output in ${join(output, 'launcher.log')}`)); });
  });
}
try {
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const manifest = [];
  for (const name of [...new Set(names)].sort()) {
    if (name.startsWith('evidence/') || name.split('/').some(part => /^\.env(?:\.|$)/i.test(part))) continue;
    if (/(^|\/)(\.npmrc|.*\.(pem|key|p12|pfx)|.*(?:secret|credential)[^/]*)$/i.test(name)) throw new Error(`Refusing potentially sensitive snapshot file: ${name}`);
    let stat;
    try { stat = await lstat(name); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!stat.isFile()) throw new Error(`Refusing non-regular snapshot file: ${name}`);
    const bytes = await readFile(name);
    manifest.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
    const destination = join(temp, 'tree', name);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    if (name === 'package.json' || name === 'package-lock.json' || /^(apps|packages)\/[^/]+\/package\.json$/.test(name) || /^scripts\/m0\/tools\/package(-lock)?\.json$/.test(name)) {
      const dependencyFile = join(temp, 'deps', name);
      await mkdir(dirname(dependencyFile), { recursive: true });
      await writeFile(dependencyFile, bytes);
    }
  }
  const listing = manifest.join('\n') + '\n';
  await writeFile(join(output, 'tree.sha256'), listing);
  const digest = createHash('sha256').update(listing).digest('hex');
  await writeFile(join(output, 'tree-id.txt'), `${digest}\n`);
  console.log(`Snapshot SHA-256: ${digest}; evidence: ${output}`);
  console.log('Preparing dependencies and pinned Chromium in disposable image');
  await docker(['build', '-f', join(temp, 'tree/scripts/m0/Dockerfile'), '-t', id, temp]); image = true;
  await docker(['create', '--name', id, '--network', 'none', id]); runner = true;
  if ((await docker(['inspect', '--format', '{{.HostConfig.NetworkMode}}', id], true)).trim() !== 'none') throw new Error('Runner network mode is not none');
  await docker(['start', id]);
  await docker(['create', '--name', `${id}-db`, '--network', `container:${id}`, '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_DB=talkaris_m0', '-e', 'POSTGRES_USER=m0', '-e', 'POSTGRES_PASSWORD=m0-synthetic-only', 'pgvector/pgvector@sha256:7b822b0aac60967beb1ea5e576b8602c94c300a157d187f385ae3e0da199b90a', '-p', '45432']); db = true;
  await docker(['start', `${id}-db`]);
  await docker(['create', '--name', `${id}-mail`, '--network', `container:${id}`, 'axllent/mailpit@sha256:e22dce5b36f93c77082e204a3942fb6b283b7896e057458400a4c88344c3df68', '--smtp', '127.0.0.1:45125', '--listen', '127.0.0.1:45126']); mail = true;
  await docker(['start', `${id}-mail`]);
  for (const service of [`${id}-db`, `${id}-mail`]) {
    const mode = (await docker(['inspect', '--format', '{{.HostConfig.NetworkMode}}', service], true)).trim();
    if (mode !== `container:${id}` && mode !== `container:${(await docker(['inspect', '--format', '{{.Id}}', id], true)).trim()}`) throw new Error(`Unexpected network mode for ${service}: ${mode}`);
  }
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { await docker(['exec', `${id}-db`, 'pg_isready', '-h', '127.0.0.1', '-p', '45432', '-U', 'm0'], true); ready = true; break; } catch (error) { if (interrupted) throw error; await new Promise(r => setTimeout(r, 1000)); }
  }
  if (!ready) throw new Error('Synthetic database did not become ready');
  await docker(['exec', id, 'node', 'scripts/m0/preflight.mjs']);
  console.log('Boundary verified; starting protected M0 flow');
  flowStarted = true;
  await docker(['exec', '-e', 'M0_NAMESPACE_SERVICES=1', id, 'node', 'scripts/m0/run.mjs', ...process.argv.slice(2)]);
} catch (error) {
  appendFileSync(join(output, 'launcher.log'), `${error.stack || error}\n`);
  console.error('M0 launcher failed:', error.stack || error);
  process.exitCode = 1;
} finally {
  cleaning = true;
  for (const [created, name] of [[db, `${id}-db`], [mail, `${id}-mail`]]) {
    if (created) {
      try { await docker(['logs', name]); } catch (error) { console.error('Could not collect service log:', error.message); process.exitCode = 1; }
    }
  }
  if (runner) {
    try { await docker(['cp', `${id}:/work/evidence/m0`, output]); } catch (error) { console.error('No runner evidence collected:', error.message); if (flowStarted) process.exitCode = 1; }
  }
  for (const [created, name] of [[mail, `${id}-mail`], [db, `${id}-db`], [runner, id]]) {
    if (created) try { await docker(['rm', '-f', name]); } catch (error) { console.error('Cleanup failed:', error.message); process.exitCode = 1; }
  }
  if (image) try { await docker(['image', 'rm', id]); } catch (error) { console.error('Image cleanup failed:', error.message); process.exitCode = 1; }
  await rm(temp, { recursive: true, force: true });
}
