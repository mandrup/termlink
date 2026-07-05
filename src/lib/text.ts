export function truncate(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) return value
  if (maxWidth <= 1) return value.slice(0, maxWidth)
  return `${value.slice(0, maxWidth - 1)}…`
}

export interface FuzzyMatch {
  matched: boolean
  indices: number[]
}

export function fuzzyMatch(text: string, query: string): FuzzyMatch {
  const trimmed = query.trim()
  if (!trimmed) return { matched: true, indices: [] }

  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const indices: number[] = []
  let fromIndex = 0

  for (const ch of lowerQuery) {
    const foundAt = lowerText.indexOf(ch, fromIndex)
    if (foundAt === -1) return { matched: false, indices: [] }
    indices.push(foundAt)
    fromIndex = foundAt + 1
  }

  return { matched: true, indices }
}
