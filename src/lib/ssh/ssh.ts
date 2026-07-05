import { DEFAULT_PORT } from '@/constants'
import type { RunResult } from '@/lib/pty'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export function splitArgs(input: string): string[] {
  const trimmed = input.trim()
  return trimmed ? trimmed.split(/\s+/) : []
}

export function buildSshArgs(
  connection: ConnectionModel,
  credential: CredentialModel | null,
): string[] {
  const args: string[] = ['-p', String(connection.port ?? DEFAULT_PORT.ssh)]
  if (connection.identityFile) {
    args.push('-i', connection.identityFile)
  }
  if (connection.extraArgs) {
    args.push(...splitArgs(connection.extraArgs))
  }
  const target = credential?.username
    ? `${credential.username}@${connection.hostname}`
    : connection.hostname
  args.push(target)
  return args
}

export function formatResult(connectionName: string, result: RunResult): string {
  if (result.error) return `Failed to start ssh: ${result.error}`
  if (result.code === 0) return `Closed connection to ${connectionName}`
  return `ssh exited with code ${result.code} (${connectionName})`
}
