import { useRef, type ReactNode } from 'react'
import { Box, Text, useStdout } from 'ink'
import { ACCENT_COLOR, CONNECTION_LIST_CHROME_ROWS, CONNECTION_LIST_DEFAULT_NAME_WIDTH, CONNECTION_RESULT_COLOR, PROTOCOL_COLOR, SSH } from '@/constants'
import { fuzzyMatch, truncate } from '@/lib/text'
import { followFocus } from '@/lib/viewport'
import type { ReachabilityStatus } from '@/hooks/useReachability'
import type { ConnectionModel } from '@/models/connection'

export interface FlatRow {
  type: 'group' | 'connection'
  key: string
  label: string
  group?: string
  connection?: ConnectionModel
}

export function flattenRows(
  connections: ConnectionModel[],
  collapsedGroups: Set<string>,
): FlatRow[] {
  const groups = new Map<string, ConnectionModel[]>()

  for (const conn of connections) {
    const key = conn.group ?? 'Ungrouped'

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key)!.push(conn)
  }

  const rows: FlatRow[] = []

  for (const [group, conns] of groups) {
    const isCollapsed = collapsedGroups.has(group)
    rows.push({
      type: 'group',
      key: `group:${group}`,
      label: `${isCollapsed ? '▸' : '▾'} ${group} (${conns.length})`,
      group,
    })
    if (!isCollapsed) {
      for (const conn of conns) {
        rows.push({
          type: 'connection',
          key: `connection:${conn.id}`,
          label: conn.name,
          connection: conn,
        })
      }
    }
  }
  return rows
}

function highlightedName(displayName: string, query: string): ReactNode {
  const { matched, indices } = fuzzyMatch(displayName, query)
  if (!matched || indices.length === 0) return displayName

  const highlighted = new Set(indices)
  const segments: ReactNode[] = []
  let buffer = ''
  let bufferHighlighted = false

  function flush(key: number) {
    if (!buffer) return
    segments.push(
      bufferHighlighted ? (
        <Text key={key} backgroundColor="yellow" color="black">
          {buffer}
        </Text>
      ) : (
        buffer
      ),
    )
    buffer = ''
  }

  for (let i = 0; i < displayName.length; i++) {
    const isHighlighted = highlighted.has(i)
    if (buffer && isHighlighted !== bufferHighlighted) flush(i)
    buffer += displayName[i]
    bufferHighlighted = isHighlighted
  }
  flush(displayName.length)

  return <> {segments}</>
}

export function ConnectionList({
  connections,
  selectedKey,
  hasAnyConnections,
  collapsedGroups,
  searchQuery = '',
  nameWidth = CONNECTION_LIST_DEFAULT_NAME_WIDTH,
  reachability,
}: {
  connections: ConnectionModel[]
  selectedKey: string | null
  hasAnyConnections: boolean
  collapsedGroups: Set<string>
  searchQuery?: string
  nameWidth?: number
  reachability?: Map<string, ReachabilityStatus>
}) {
  const { stdout } = useStdout()
  const offsetRef = useRef(0)

  const rows = connections.length > 0 ? flattenRows(connections, collapsedGroups) : []
  const maxVisible = Math.max(3, (stdout.rows || 24) - CONNECTION_LIST_CHROME_ROWS)
  const focusedIndex = Math.max(
    0,
    rows.findIndex((r) => r.key === selectedKey),
  )
  offsetRef.current = followFocus({
    itemCount: rows.length,
    focusedIndex,
    maxVisible,
    offset: offsetRef.current,
  })
  const offset = offsetRef.current
  const visibleRows = rows.slice(offset, offset + maxVisible)
  const hiddenAbove = offset
  const hiddenBelow = rows.length - (offset + visibleRows.length)

  if (connections.length === 0) {
    if (hasAnyConnections) {
      return (
        <Box paddingLeft={1}>
          <Text dimColor>No connections match.</Text>
        </Box>
      )
    }
    return (
      <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
        <Text bold>No connections yet</Text>
        <Text dimColor>
          Press <Text color={ACCENT_COLOR}>a</Text> to add one.
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {hiddenAbove > 0 && <Text dimColor>▲ {hiddenAbove} more above</Text>}
      {visibleRows.map((row, i) => {
        const isSelected = row.key === selectedKey
        if (row.type === 'group') {
          return (
            <Box key={row.key} marginTop={offset + i === 0 ? 0 : 1}>
              <Text
                bold
                color={isSelected ? 'black' : undefined}
                backgroundColor={isSelected ? ACCENT_COLOR : undefined}
              >
                {isSelected ? '▶ ' : '  '}
                {row.label}
              </Text>
            </Box>
          )
        }
        const conn = row.connection!
        const marker = isSelected ? '▶' : ' '
        const nextRow = rows[offset + i + 1]
        const isLastInGroup = !nextRow || nextRow.type === 'group'
        const branch = isLastInGroup ? '└' : '├'

        const status = conn.protocol === SSH ? reachability?.get(conn.id) : undefined
        const dot = status === 'up' || status === 'down' ? '●' : '○'
        const dotColor =
          status === 'up'
            ? CONNECTION_RESULT_COLOR.ok
            : status === 'down'
              ? CONNECTION_RESULT_COLOR.error
              : PROTOCOL_COLOR[conn.protocol]
        const displayName = truncate(conn.name, nameWidth).padEnd(nameWidth, ' ')
        return (
          <Box key={row.key}>
            <Text
              color={isSelected ? 'black' : undefined}
              backgroundColor={isSelected ? ACCENT_COLOR : undefined}
            >
              <Text dimColor={!isSelected}>{branch}</Text>{' '}
              <Text dimColor={!isSelected}>{marker}</Text> <Text color={dotColor}>{dot}</Text>{' '}
              {isSelected ? displayName : highlightedName(displayName, searchQuery)}
            </Text>
          </Box>
        )
      })}
      {hiddenBelow > 0 && <Text dimColor>▼ {hiddenBelow} more below</Text>}
    </Box>
  )
}
