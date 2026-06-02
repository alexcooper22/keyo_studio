const TTL = 30 * 60 * 1000

type ModelEntry = { data: any[]; cachedAt: number }

const memCache = new Map<string, ModelEntry>()

export async function fetchModelsWithCache(category: string): Promise<any[]> {
  const key = `models_${category}`

  // 1. Memory cache (fastest, survives within the same page session)
  const mem = memCache.get(key)
  if (mem && Date.now() - mem.cachedAt < TTL) return mem.data

  // 2. localStorage cache (survives across navigations / reloads)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const entry: ModelEntry = JSON.parse(raw)
      if (Date.now() - entry.cachedAt < TTL) {
        memCache.set(key, entry)
        return entry.data
      }
    }
  } catch {}

  // 3. Network fetch
  const res = await fetch(`/api/models?category=${category}`)
  const json = await res.json()
  const data: any[] = json.models ?? []

  const entry: ModelEntry = { data, cachedAt: Date.now() }
  memCache.set(key, entry)
  try { localStorage.setItem(key, JSON.stringify(entry)) } catch {}

  return data
}

export function invalidateModelsCache(category?: string) {
  if (category) {
    memCache.delete(`models_${category}`)
    try { localStorage.removeItem(`models_${category}`) } catch {}
  } else {
    memCache.clear()
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('models_')) localStorage.removeItem(k)
      }
    } catch {}
  }
}
