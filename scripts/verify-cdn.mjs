import { readFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
const expected = await readFile('dist/catalog.json', 'utf8')
const url = process.env.CATALOG_PUBLIC_URL
if (!url || new URL(url).protocol !== 'https:') throw new Error('Public HTTPS catalog URL required')
for (let attempt = 0; attempt < 9; attempt++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' })
    if (response.ok && await response.text() === expected) {
      console.log(`Public CDN verified: ${JSON.parse(expected).releaseId}`)
      process.exit(0)
    }
  } catch { /* Allow propagation within the 60-second stable cache TTL. */ }
  if (attempt < 8) await setTimeout(15000)
}
throw new Error('Public CDN does not match the published catalog')
