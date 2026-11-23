import { categories, type Directory, tasks } from './model.ts'

export type CatalogFeed = { schemaVersion: 1; releaseId: string; publishedAt: string; directory: Directory }
const text = (v: unknown, max = 500) => typeof v === 'string' && v.length > 0 && v.length <= max
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 200 && v.every((x) => text(x, 100)) && new Set(v).size === v.length
const https = (value: unknown) => {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
export function parseCatalogFeed(value: unknown): CatalogFeed {
  const feed = value as CatalogFeed
  if (
    !feed ||
    feed.schemaVersion !== 1 ||
    !text(feed.releaseId, 100) ||
    !/^[a-zA-Z0-9_-]+$/.test(feed.releaseId) ||
    !text(feed.publishedAt) ||
    !Number.isFinite(Date.parse(feed.publishedAt))
  )
    throw new Error('Invalid catalog version')
  const d = feed.directory
  if (!d || d.sample !== false || !Array.isArray(d.apps) || d.apps.length > 10000 || !Array.isArray(d.networks) || !strings(d.ecosystems))
    throw new Error('Invalid catalog')
  const ids = new Set<string>()
  for (const n of d.networks) {
    if (!n || !text(n.id, 100) || !/^[a-z0-9-]+$/.test(n.id) || !text(n.name, 100) || ids.has(n.id)) throw new Error('Invalid network')
    ids.add(n.id)
  }
  const apps = new Set<string>()
  for (const a of d.apps) {
    if (
      !a ||
      !text(a.id, 100) ||
      !/^[a-z0-9-]+$/.test(a.id) ||
      apps.has(a.id) ||
      !text(a.name, 100) ||
      !text(a.description, 2000) ||
      !https(a.website) ||
      (a.logo !== undefined && (typeof a.logo !== 'string' || a.logo.length > 140000 || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(a.logo))) ||
      !categories.includes(a.category) ||
      !strings(a.tasks) ||
      !a.tasks.every((t) => tasks.includes(t)) ||
      !strings(a.networks) ||
      !a.networks.every((n) => ids.has(n)) ||
      !strings(a.ecosystems) ||
      !a.ecosystems.every((e) => d.ecosystems.includes(e))
    )
      throw new Error('Invalid application')
    apps.add(a.id)
  }
  // Reconstruct the public payload: never leak review notes or submitter fields.
  return {
    schemaVersion: 1,
    releaseId: feed.releaseId,
    publishedAt: feed.publishedAt,
    directory: {
      sample: false,
      networks: d.networks.map(({ id, name }) => ({ id, name })),
      ecosystems: d.ecosystems,
      apps: d.apps.map(({ id, name, description, website, logo, category, tasks, networks, ecosystems }) => ({
        id,
        name,
        description,
        website,
        ...(logo ? { logo } : {}),
        category,
        tasks,
        networks,
        ecosystems,
      })),
    },
  }
}
