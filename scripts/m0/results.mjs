import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export function classify(healthy, knownDefect) {
  if (healthy) return 'unexpected-pass';
  return knownDefect ? 'known-defect' : 'unexpected-failure';
}
export async function saveResults(name, rows) {
  await writeFile(`evidence/m0/${name}.json`, JSON.stringify(rows, null, 2));
  await writeFile(`evidence/m0/${name}.md`, `# M0 ${name}\n\n| Case | Result | Evidence |\n|---|---|---|\n` + rows.map(r => `| ${r.id} | ${r.status} | ${String(r.detail ?? '').replaceAll('|','/').replaceAll('\n',' ')} |`).join('\n') + '\n');
  assert.ok(!rows.some(r => r.status.startsWith('unexpected')), `${name}: unexpected behavior; inspect evidence/m0/${name}.json`);
}
