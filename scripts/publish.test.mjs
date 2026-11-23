import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { build } from './build.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
async function publish(mode) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'catalog-publish-'))
  await mkdir(path.join(tmp, 'bin'))
  await build(root, path.join(tmp, 'dist'), 'test-release')
  const log = path.join(tmp, 'calls.jsonl')
  await writeFile(path.join(tmp, 'bin/gcloud'), `#!${process.execPath}
const fs = require('node:fs'); const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args)+'\\n');
if(args[1]==='objects') { if(process.env.MODE==='metadata-failure') process.exit(1); console.log('123'); }
if(args[1]==='cp' && args.at(-1).includes('/releases/') && process.env.MODE==='release-failure') process.exit(1);
if(args[1]==='cat') process.exit(1);
if(args[1]==='cp' && args.at(-1).endsWith('/ecosystem/catalog.json') && process.env.MODE==='conflict') process.exit(1);
`, { mode: 0o700 })
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/publish.mjs')], {
    cwd: tmp, encoding: 'utf8', env: { ...process.env, PATH: `${tmp}/bin:${process.env.PATH}`, CALL_LOG: log, MODE: mode, CATALOG_GCS_PATH: 'gs://gcs.subscan.io/ecosystem', INITIAL_CATALOG_PUBLISH: '' }
  })
  const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse)
  return { result, calls }
}
test('publishes immutable then stable with public ACL, cache settings and generation guard', async () => {
  const {result, calls} = await publish('success')
  assert.equal(result.status, 0, result.stderr)
  const uploads = calls.filter(c => c[1] === 'cp')
  assert.equal(uploads.length, 2)
  assert.ok(uploads.every(c => c.includes('--predefined-acl=publicRead')))
  assert.ok(uploads[0].includes('--if-generation-match=0'))
  assert.ok(uploads[0].includes('--cache-control=public,max-age=31536000,immutable'))
  assert.ok(uploads[1].includes('--if-generation-match=123'))
  assert.ok(uploads[1].includes('--cache-control=public,max-age=60,must-revalidate'))
})
for (const mode of ['release-failure', 'metadata-failure']) {
  test(`${mode} leaves stable catalog untouched`, async () => {
    const {result, calls} = await publish(mode)
    assert.notEqual(result.status, 0)
    assert.ok(!calls.some(c => c[1] === 'cp' && c.at(-1).endsWith('/ecosystem/catalog.json')))
  })
}
test('concurrent generation conflict fails without an unguarded retry', async () => {
  const {result, calls} = await publish('conflict')
  assert.notEqual(result.status, 0)
  assert.equal(calls.filter(c => c[1] === 'cp' && c.at(-1).endsWith('/ecosystem/catalog.json')).length, 1)
})
