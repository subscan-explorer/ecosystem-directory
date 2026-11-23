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
