import { LIST_MAX_WIDTH, LIST_MIN_WIDTH, LIST_WIDTH_RATIO, NAME_MIN_WIDTH, NAME_WIDTH_OVERHEAD } from '@/constants'

export function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

export function computeListLayout(columns: number): {
  listWidth: number
  nameWidth: number
} {
  const listWidth = clampToRange(
    Math.round(columns * LIST_WIDTH_RATIO),
    LIST_MIN_WIDTH,
    LIST_MAX_WIDTH,
  )
  const nameWidth = Math.max(NAME_MIN_WIDTH, listWidth - NAME_WIDTH_OVERHEAD)
  return { listWidth, nameWidth }
}

export function followFocus({
  itemCount,
  focusedIndex,
  maxVisible,
  offset,
}: {
  itemCount: number
  focusedIndex: number
  maxVisible: number
  offset: number
}): number {
  if (maxVisible <= 0 || itemCount <= maxVisible) {
    return 0
  }

  const maxOffset = itemCount - maxVisible
  let next = offset
  if (focusedIndex < next) next = focusedIndex
  if (focusedIndex >= next + maxVisible) next = focusedIndex - maxVisible + 1
  return clampToRange(next, 0, maxOffset)
}
