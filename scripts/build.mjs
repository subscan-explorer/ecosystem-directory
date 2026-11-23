import { execFileSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCatalogFeed } from '../src/feed.ts'
export async function build(root, output, revision) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(revision)) throw new Error('Invalid revision')
  const taxonomy = JSON.parse(await readFile(path.join(root, 'taxonomy.json'), 'utf8'))
  const apps=[]
  for (const filename of (await readdir(path.join(root,'apps'))).filter(f=>f.endsWith('.json')).sort()) {
    const record=JSON.parse(await readFile(path.join(root,'apps',filename),'utf8'))
    if (!['approved','candidate','suspended','removed'].includes(record.status)) throw new Error(`Invalid status: ${filename}`)
    if (record.status !== 'approved') continue
    if (!Array.isArray(record.sources) || !record.sources.length || !record.sources.every(s => typeof s === 'string' && s.startsWith('https://')) || !Number.isFinite(Date.parse(record.reviewedAt)) || !record.reviewRevision) throw new Error(`Missing review evidence: ${filename}`)
    const app = { ...record.app }
    if (record.logoFile !== undefined) {
      if (record.logoFile !== `logos/${app.id}.png` || !/^[a-z0-9-]+$/.test(app.id)) throw new Error('Invalid logo path')
      const logo = await readFile(path.join(root, record.logoFile))
      if (logo.length > 100000 || logo.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Logo must be a PNG thumbnail under 100 KB')
      app.logo = `data:image/png;base64,${logo.toString('base64')}`
    }
    apps.push(app)
  }
  const feed=parseCatalogFeed({schemaVersion:1,releaseId:revision,publishedAt:process.env.PUBLICATION_TIME || new Date().toISOString(),directory:{...taxonomy,apps,sample:false}})
  const bytes=JSON.stringify(feed,null,2)+'\n'
  const release=path.join(output,'releases',revision)
  await mkdir(release,{recursive:true})
  // A release ID is immutable: reruns may reuse identical content, never overwrite it.
  try { const old=await readFile(path.join(release,'catalog.json'),'utf8');if(old!==bytes) throw new Error('Release already exists with different content') } catch(e) { if(e.code!=='ENOENT') throw e }
  await writeFile(path.join(release,'catalog.json'),bytes)
  await writeFile(path.join(release,'sha256.txt'),createHash('sha256').update(bytes).digest('hex')+'\n')
  await writeFile(path.join(output,'catalog.json.tmp'),bytes)
  await rename(path.join(output,'catalog.json.tmp'),path.join(output,'catalog.json'))
  return feed
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 if (!process.env.PUBLICATION_TIME) { try { process.env.PUBLICATION_TIME=execFileSync('git',['show','-s','--format=%cI','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim() } catch {} }
 await build(process.cwd(),path.resolve(process.env.CATALOG_OUTPUT || 'dist'),process.env.CATALOG_REVISION || 'local-preview')
}
