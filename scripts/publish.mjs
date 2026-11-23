import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { parseCatalogFeed } from '../src/feed.ts'
const destination=process.env.CATALOG_GCS_PATH
if(!destination || !/^gs:\/\/[a-z0-9._-]+\/ecosystem(?:\/[a-zA-Z0-9_-]+)*$/.test(destination)) throw new Error('CATALOG_GCS_PATH must be an explicit gs://bucket/ecosystem prefix')
const feed=parseCatalogFeed(JSON.parse(await readFile('dist/catalog.json','utf8')))
if(!feed.directory.apps.length && process.env.ALLOW_EMPTY_CATALOG!=='true') throw new Error('Refusing to publish an empty catalog without explicit authorization')
function run(args){const result=spawnSync('gcloud',args,{stdio:'inherit'});if(result.status!==0) throw new Error('Publication failed')}
// Release objects first; the stable object changes only after immutable upload succeeds.
try {
  run(['storage','cp','--predefined-acl=publicRead','--if-generation-match=0','--cache-control=public,max-age=31536000,immutable',`dist/releases/${feed.releaseId}/catalog.json`,`${destination}/releases/${feed.releaseId}/catalog.json`])
} catch {
  const existing=spawnSync('gcloud',['storage','cat',`${destination}/releases/${feed.releaseId}/catalog.json`],{encoding:'utf8'})
  if(existing.status!==0 || existing.stdout !== await readFile('dist/catalog.json','utf8')) throw new Error('Immutable release upload failed or content mismatch')
}
const metadata=spawnSync('gcloud',['storage','objects','describe',`${destination}/catalog.json`,'--format=value(generation)'],{encoding:'utf8'})
// Initial creation is explicit; do not mistake an auth failure for a missing object.
if(metadata.status!==0 && process.env.INITIAL_CATALOG_PUBLISH!=='true') throw new Error('Cannot read active generation; old catalog retained')
const generation=metadata.status===0 ? metadata.stdout.trim() : '0'
if(!/^\d+$/.test(generation)) throw new Error('Invalid active generation')
run(['storage','cp','--predefined-acl=publicRead',`--if-generation-match=${generation}`,'--cache-control=public,max-age=60,must-revalidate','dist/catalog.json',`${destination}/catalog.json`])
console.log(`Activated catalog ${feed.releaseId}`)
