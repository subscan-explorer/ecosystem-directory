import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--dry-run') || args.length > 1) throw new Error('Usage: ./scripts/publish-local.sh [--dry-run]')
const [major, minor, patch] = process.versions.node.split('.').map(Number)
if (major < 24 || (major === 24 && (minor < 22 || (minor === 22 && patch < 1)))) throw new Error('Node 24.22.1 or newer is required')
const dryRun = args.includes('--dry-run')
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` }
function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, env, stdio: 'inherit', ...options })
}
const git = (...args) => run('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
if (git('branch', '--show-current') !== 'main') throw new Error('Switch to main before publishing')
if (git('status', '--porcelain')) throw new Error('Commit or stash local changes before publishing')
run('git', ['fetch', 'origin', 'main'])
run('git', ['merge', '--ff-only', 'origin/main'])
const revision = git('rev-parse', 'HEAD')
if (revision !== git('rev-parse', 'origin/main')) throw new Error('Only the current origin/main revision may be published')
run('gcloud', ['auth', 'print-access-token'], { stdio: 'ignore' })
const staging = await mkdtemp(path.join(tmpdir(), 'ecosystem-release-'))
try {
  run(process.execPath, ['--test', ...['catalog.test.mjs', 'publish.test.mjs'].map(f => path.join(root, 'scripts', f))])
  const publicationEnv = {
    ...env,
    CATALOG_REVISION: revision,
    PUBLICATION_TIME: git('show', '-s', '--format=%cI', revision),
    CATALOG_OUTPUT: path.join(staging, 'dist'),
    CATALOG_GCS_PATH: 'gs://gcs.subscan.io/ecosystem',
    CATALOG_PUBLIC_URL: 'https://gcs.subscan.io/ecosystem/catalog.json',
    INITIAL_CATALOG_PUBLISH: '',
    ALLOW_EMPTY_CATALOG: ''
  }
  run(process.execPath, [path.join(root, 'scripts/build.mjs')], { env: publicationEnv })
  run('git', ['fetch', 'origin', 'main'])
  if (revision !== git('rev-parse', 'origin/main') || git('status', '--porcelain')) throw new Error('Source changed during validation; run again')
  if (dryRun) {
    console.log(`Dry run passed: ${revision}. No CDN objects uploaded.`)
  } else {
    run(process.execPath, [path.join(root, 'scripts/publish.mjs')], { cwd: staging, env: publicationEnv })
    run(process.execPath, [path.join(root, 'scripts/verify-cdn.mjs')], { cwd: staging, env: publicationEnv })
    console.log(`Published and verified: ${publicationEnv.CATALOG_PUBLIC_URL}`)
  }
} finally {
  await rm(staging, { recursive: true, force: true })
}
