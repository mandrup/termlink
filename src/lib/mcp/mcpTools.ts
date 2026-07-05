import { SSH } from '@/constants'
import { isCommandAllowed } from '@/lib/mcp/commandMatch'
import { appendAuditLog, type AuditLogEntry } from '@/lib/mcp/mcpAuditLog'
import { execSshCommand, probeSshConnection, type SshExecResult } from '@/lib/ssh/sshExec'
import type { PersistedState } from '@/lib/storage'
import type { ConnectionModel, ConnectionResult, CredentialModel } from '@/models/connection'

export interface McpConnectionSummary {
  id: string
  name: string
  hostname: string
  group?: string
  notes?: string
  allowedCommands: string[]
}

export function listMcpConnections(state: PersistedState): McpConnectionSummary[] {
  return state.connections
    .filter((c) => c.protocol === SSH && c.mcp?.enabled)
    .map((c) => ({
      id: c.id,
      name: c.name,
      hostname: c.hostname,
      group: c.group,
      notes: c.notes,
      allowedCommands: c.mcp?.allowedCommands ?? [],
    }))
}

export type RunMcpCommandResult =
  { ok: true; result: SshExecResult } | { ok: false; reason: string }

async function safeLog(log: typeof appendAuditLog, entry: AuditLogEntry): Promise<void> {
  try {
    await log(entry)
  } catch {}
}

function findMcpConnection(
  state: PersistedState,
  connectionId: string,
): { connection: ConnectionModel; credential: CredentialModel | null } | null {
  const connection = state.connections.find((c) => c.id === connectionId)
  if (!connection || connection.protocol !== SSH || !connection.mcp?.enabled) {
    return null
  }
  const credential = connection.credentialId
    ? (state.credentials.find((cr) => cr.id === connection.credentialId) ?? null)
    : null
  return { connection, credential }
}

export async function runMcpCommand(
  state: PersistedState,
  connectionId: string,
  command: string,
  exec: typeof execSshCommand = execSshCommand,
  log: typeof appendAuditLog = appendAuditLog,
): Promise<RunMcpCommandResult> {
  const found = findMcpConnection(state, connectionId)
  if (!found) {
    const reason = `Unknown or non-MCP-enabled connection: ${connectionId}`
    await safeLog(log, {
      connectionId,
      connectionName: connectionId,
      command,
      outcome: 'rejected',
      reason,
    })
    return { ok: false, reason }
  }
  const { connection, credential } = found
  const allowedCommands = connection.mcp?.allowedCommands ?? []
  if (!isCommandAllowed(command, allowedCommands)) {
    const reason = `Command not allowed for this connection. Allowed: ${allowedCommands.join(', ') || '(none configured)'}`
    await safeLog(log, {
      connectionId,
      connectionName: connection.name,
      command,
      outcome: 'rejected',
      reason,
    })
    return { ok: false, reason }
  }
  const result = await exec(connection, credential, command)
  await safeLog(log, {
    connectionId,
    connectionName: connection.name,
    command,
    outcome: result.code === 0 ? 'ok' : 'error',
    exitCode: result.code,
  })
  return { ok: true, result }
}

export interface ConnectionStatus {
  reachable: boolean
  error?: string
  lastKnown?: { at: string; result: ConnectionResult }
}

export type GetMcpConnectionStatusResult =
  { ok: true; status: ConnectionStatus } | { ok: false; reason: string }

export async function getMcpConnectionStatus(
  state: PersistedState,
  connectionId: string,
  probe: typeof probeSshConnection = probeSshConnection,
  log: typeof appendAuditLog = appendAuditLog,
): Promise<GetMcpConnectionStatusResult> {
  const found = findMcpConnection(state, connectionId)
  if (!found) {
    const reason = `Unknown or non-MCP-enabled connection: ${connectionId}`
    await safeLog(log, {
      connectionId,
      connectionName: connectionId,
      command: '(status probe)',
      outcome: 'rejected',
      reason,
    })
    return { ok: false, reason }
  }
  const { connection, credential } = found
  const result = await probe(connection, credential)
  const status: ConnectionStatus = {
    reachable: result.code === 0,
    error: result.error,
    lastKnown: connection.lastConnectedAt
      ? {
          at: connection.lastConnectedAt,
          result: connection.lastConnectedResult ?? 'ok',
        }
      : undefined,
  }
  await safeLog(log, {
    connectionId,
    connectionName: connection.name,
    command: '(status probe)',
    outcome: status.reachable ? 'ok' : 'error',
    exitCode: result.code,
  })
  return { ok: true, status }
}
