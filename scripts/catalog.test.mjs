import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir,writeFile,readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { build } from './build.mjs'
test('publish excludes candidates and rejects invalid approved websites without replacing good data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ecosystem-build-'));await mkdir(path.join(dir,'apps'))
 await writeFile(path.join(dir,'taxonomy.json'),JSON.stringify({networks:[],ecosystems:[]}))
 await writeFile(path.join(dir,'apps/a.json'),JSON.stringify({status:'candidate',app:{id:'draft'}}))
 await build(dir,path.join(dir,'dist'),'a');const before=await readFile(path.join(dir,'dist/catalog.json'),'utf8');assert.equal(JSON.parse(before).directory.apps.length,0)
 await writeFile(path.join(dir,'apps/a.json'),JSON.stringify({status:'approved',sources:['https://example.com'],reviewedAt:'2026-11-23',reviewRevision:'a',app:{id:'bad',website:'javascript:alert(1)'}}))
 await assert.rejects(build(dir,path.join(dir,'dist'),'b'));assert.equal(await readFile(path.join(dir,'dist/catalog.json'),'utf8'),before)
})

test('build embeds reviewed PNG logos and rejects unsafe logo paths without replacing active data', async () => {
 const dir=await mkdtemp(path.join(os.tmpdir(),'ecosystem-logo-'))
 await mkdir(path.join(dir,'apps'));await mkdir(path.join(dir,'logos'))
 await writeFile(path.join(dir,'taxonomy.json'),JSON.stringify({networks:[],ecosystems:[]}))
 const app={id:'test',name:'Test',description:'Test application',website:'https://example.com',category:'developer',tasks:['build'],networks:[],ecosystems:[]}
 const record={status:'approved',sources:['https://example.com'],reviewedAt:'2026-11-23',reviewRevision:'test',app,logoFile:'logos/test.png'}
 const png=await readFile(new URL('../logos/talisman.png',import.meta.url))
 await writeFile(path.join(dir,'logos/test.png'),png)
 await writeFile(path.join(dir,'apps/test.json'),JSON.stringify(record))
 const feed=await build(dir,path.join(dir,'dist'),'logo')
 assert.equal(feed.directory.apps[0].logo,`data:image/png;base64,${png.toString('base64')}`)
 assert.equal('logoFile' in feed.directory.apps[0],false)
 const before=await readFile(path.join(dir,'dist/catalog.json'),'utf8')
 record.logoFile='../outside.png'
 await writeFile(path.join(dir,'apps/test.json'),JSON.stringify(record))
 await assert.rejects(build(dir,path.join(dir,'dist'),'unsafe'),/Invalid logo path/)
 assert.equal(await readFile(path.join(dir,'dist/catalog.json'),'utf8'),before)
 record.logoFile='logos/test.png'
 await writeFile(path.join(dir,'apps/test.json'),JSON.stringify(record))
 await writeFile(path.join(dir,'logos/test.png'),'<svg onload="alert(1)"/>')
 await assert.rejects(build(dir,path.join(dir,'dist'),'svg'),/PNG thumbnail/)
})
