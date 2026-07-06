import type { ConnectionFormValues } from '@/lib/connections/connectionForm'
import { fuzzyMatch } from '@/lib/text'
import { SSH } from '@/constants'
import type { ConnectionModel } from '@/models/connection'

export function nextId(prefix: string, existing: { id: string }[]): string {
  let n = existing.length + 1

  while (existing.some((e) => e.id === `${prefix}-${n}`)) {
    n++
  }

  return `${prefix}-${n}`
}

export function matchesQuery(connection: ConnectionModel, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  return (
    fuzzyMatch(connection.name, query).matched ||
    fuzzyMatch(connection.hostname, query).matched ||
    fuzzyMatch(connection.group ?? '', query).matched
  )
}

export function parsePort(port: string): number | undefined {
  return port.trim() ? Number(port.trim()) : undefined
}

export function moveConnectionWithinGroup(
  connections: ConnectionModel[],
  connectionId: string,
  direction: 'up' | 'down',
): ConnectionModel[] {
  const target = connections.find((c) => c.id === connectionId)
  if (!target) return connections
  const group = target.group ?? 'Ungrouped'
  const groupIndices = connections
    .map((c, index) => index)
    .filter((index) => (connections[index].group ?? 'Ungrouped') === group)
  const from = groupIndices.findIndex((index) => connections[index].id === connectionId)
  const to = direction === 'up' ? from - 1 : from + 1
  if (to < 0 || to >= groupIndices.length) return connections
  const result = [...connections]
  const a = groupIndices[from]
  const b = groupIndices[to]
  ;[result[a], result[b]] = [result[b], result[a]]
  return result
}

export function moveGroup(
  connections: ConnectionModel[],
  group: string,
  direction: 'up' | 'down',
): ConnectionModel[] {
  const order: string[] = []
  for (const c of connections) {
    const key = c.group ?? 'Ungrouped'
    if (!order.includes(key)) order.push(key)
  }
  const from = order.indexOf(group)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from < 0 || to < 0 || to >= order.length) return connections
  const reordered = [...order]
  ;[reordered[from], reordered[to]] = [reordered[to], reordered[from]]
  return reordered.flatMap((key) => connections.filter((c) => (c.group ?? 'Ungrouped') === key))
}

export function buildMcpConfig(values: ConnectionFormValues): ConnectionModel['mcp'] {
  if (values.protocol !== SSH) return undefined
  const allowedCommands = values.mcpAllowedCommands
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  if (!values.mcpEnabled && allowedCommands.length === 0) return undefined
  return { enabled: values.mcpEnabled, allowedCommands }
}

export function buildConnectionFields(
  values: ConnectionFormValues,
): Pick<
  ConnectionModel,
  | 'name'
  | 'hostname'
  | 'port'
  | 'protocol'
  | 'group'
  | 'identityFile'
  | 'extraArgs'
  | 'mcp'
  | 'notes'
> {
  return {
    name: values.name,
    hostname: values.hostname,
    port: parsePort(values.port),
    protocol: values.protocol,
    group: values.group || undefined,
    identityFile: values.protocol === SSH ? values.identityFile || undefined : undefined,
    extraArgs: values.protocol === SSH ? values.extraArgs || undefined : undefined,
    mcp: buildMcpConfig(values),
    notes: values.notes || undefined,
  }
}
