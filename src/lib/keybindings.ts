import type { Key } from 'ink'
import type { FlatRow } from '@/components/ConnectionList'

export type Mode = 'list' | 'add' | 'edit' | 'search' | 'confirmDelete' | 'help'

export type KeyAction =
  | { type: 'exit' }
  | { type: 'setSelectedIndex'; index: number }
  | { type: 'connect' }
  | { type: 'openAdd'; clone: boolean }
  | { type: 'openEdit' }
  | { type: 'openConfirmDelete' }
  | { type: 'openSearch' }
  | { type: 'importSshConfig' }
  | { type: 'openHelp' }
  | { type: 'closeHelp' }
  | { type: 'endSearch'; keepQuery: boolean }
  | { type: 'refreshReachability' }
  | { type: 'toggleGroup'; group: string }

export function resolveKeyActions({
  mode,
  input,
  key,
  rowsLength,
  clampedIndex,
  selectedRow,
  collapsedGroups,
}: {
  mode: Mode
  input: string
  key: Key
  rowsLength: number
  clampedIndex: number
  selectedRow: FlatRow | null
  collapsedGroups: Set<string>
}): KeyAction[] {
  if (mode === 'search') {
    if (key.return || key.escape) {
      return [{ type: 'endSearch', keepQuery: !key.escape }]
    }
    return []
  }

  if (mode === 'help') {
    return [{ type: 'closeHelp' }]
  }

  if (mode !== 'list') {
    return []
  }

  const hasSelected = selectedRow?.type === 'connection'
  const actions: KeyAction[] = []

  if (input === 'q' || key.escape) {
    actions.push({ type: 'exit' })
  }
  if (key.downArrow || input === 'j') {
    actions.push({
      type: 'setSelectedIndex',
      index: Math.min(clampedIndex + 1, rowsLength - 1),
    })
  }
  if (key.upArrow || input === 'k') {
    actions.push({
      type: 'setSelectedIndex',
      index: Math.max(clampedIndex - 1, 0),
    })
  }
  if (key.return && hasSelected) {
    actions.push({ type: 'connect' })
  }
  if (input === 'a') {
    actions.push({ type: 'openAdd', clone: false })
  }
  if (input === 'c' && hasSelected) {
    actions.push({ type: 'openAdd', clone: true })
  }
  if (input === 'e' && hasSelected) {
    actions.push({ type: 'openEdit' })
  }
  if (input === 'd' && hasSelected) {
    actions.push({ type: 'openConfirmDelete' })
  }
  if (input === '/') {
    actions.push({ type: 'openSearch' })
  }
  if (input === 'i') {
    actions.push({ type: 'importSshConfig' })
  }
  if (input === '?') {
    actions.push({ type: 'openHelp' })
  }
  if (input === 'r') {
    actions.push({ type: 'refreshReachability' })
  }
  if ((key.leftArrow || key.rightArrow) && selectedRow) {
    const group =
      selectedRow.type === 'group'
        ? (selectedRow.group ?? 'Ungrouped')
        : (selectedRow.connection?.group ?? 'Ungrouped')
    const isCollapsed = collapsedGroups.has(group)
    if ((key.leftArrow && !isCollapsed) || (key.rightArrow && isCollapsed)) {
      actions.push({ type: 'toggleGroup', group })
    }
  }

  return actions
}
