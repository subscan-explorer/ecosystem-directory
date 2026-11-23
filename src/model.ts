export const categories = ['wallets', 'defi', 'staking', 'bridges', 'governance', 'developer'] as const
export const tasks = ['wallet', 'swap', 'bridge', 'stake', 'vote', 'build'] as const
export type Category = (typeof categories)[number]
export type Task = (typeof tasks)[number]
export type DirectoryApp = {
  id: string
  name: string
  description: string
  website: string
  category: Category
  tasks: Task[]
  networks: string[]
  ecosystems: string[]
}
export type DirectoryNetwork = { id: string; name: string }
export type Directory = { apps: DirectoryApp[]; networks: DirectoryNetwork[]; ecosystems: string[]; sample: boolean }
export type EcosystemViewProps = {
  directory: Directory
  catalogState?: 'sample' | 'live' | 'stale' | 'unavailable'
  publishedAt?: string
  submissionRepository?: string
}
export type Filters = { view: 'current' | 'all'; network: string; ecosystem: string; category: string; task: string; q: string; sort: 'az' | 'za' }
export const isEcosystemPreview = (mode = process.env.NEXT_PUBLIC_MODE) => mode === 'preview'
export const defaultFilters = (): Filters => ({ view: 'current', network: '', ecosystem: '', category: '', task: '', q: '', sort: 'az' })
export function readFilters(
  query: Record<string, string | string[] | undefined>,
  directory: Directory,
  surface: 'explorer' | 'www' = 'explorer'
): Filters {
  const one = (key: string) => (typeof query[key] === 'string' ? (query[key] as string) : '')
  const view = surface === 'www' || one('view') === 'all' ? 'all' : 'current'
  return {
    view,
    network: view === 'all' && directory.networks.some((n) => n.id === one('network')) ? one('network') : '',
    ecosystem: directory.ecosystems.includes(one('ecosystem')) ? one('ecosystem') : '',
    category: categories.includes(one('category') as Category) ? one('category') : '',
    task: tasks.includes(one('task') as Task) ? one('task') : '',
    q: one('q').slice(0, 200),
    sort: one('sort') === 'za' ? 'za' : 'az',
  }
}
export function filterApps(directory: Directory, currentNetwork: string, filters: Filters): DirectoryApp[] {
  const network = filters.view === 'current' ? currentNetwork : filters.network
  const query = filters.q.trim().toLocaleLowerCase()
  return directory.apps
    .filter(
      (a) =>
        (!network || a.networks.includes(network)) &&
        (!filters.ecosystem || a.ecosystems.includes(filters.ecosystem)) &&
        (!filters.category || a.category === filters.category) &&
        (!filters.task || a.tasks.includes(filters.task as Task)) &&
        (!query || `${a.name} ${a.description} ${a.category}`.toLocaleLowerCase().includes(query))
    )
    .sort((a, b) => (filters.sort === 'za' ? -1 : 1) * a.name.localeCompare(b.name, 'en'))
}
export function directoryHref(filters: Filters, pathname = '/ecosystem'): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  return `${pathname}?${params.toString()}`
}
