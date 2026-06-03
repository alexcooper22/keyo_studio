export async function fetchModelsWithCache(category: string): Promise<any[]> {
  const res = await fetch(`/api/models?category=${category}`)
  const json = await res.json()
  return json.models ?? []
}

export function invalidateModelsCache(_category?: string) {}
