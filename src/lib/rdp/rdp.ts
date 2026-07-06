import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { DEFAULT_PORT, RDP_CLEANUP_DELAY_MS } from '@/constants'
import type { RunResult } from '@/lib/pty'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export function buildRdpFileContent(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  password: string | null = null,
): string {
  const address = `${connection.hostname}:${connection.port ?? DEFAULT_PORT.rdp}`
  const lines = [`full address:s:${address}`]
  if (credential?.username) {
    lines.push(`username:s:${credential.username}`)
  }
  if (password) {
    lines.push(`password:s:${password}`)
  }
  return lines.map((line) => `${line}\r\n`).join('')
}

export function buildOpenCommand(
  filePath: string,
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  if (platform === 'win32') return { command: 'cmd.exe', args: ['/c', 'start', '', filePath] }
  if (platform === 'darwin') return { command: 'open', args: [filePath] }
  return { command: 'xdg-open', args: [filePath] }
}

export async function prepareRdpLaunch(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  password: string | null = null,
): Promise<{
  command: string
  args: string[]
  cleanup: () => Promise<void>
}> {
  const dir = await mkdtemp(join(tmpdir(), 'termlink-rdp-'))
  const filePath = join(dir, 'connection.rdp')
  await writeFile(filePath, buildRdpFileContent(connection, credential, password), {
    encoding: 'utf-8',
    mode: 0o600,
  })
  const { command, args } = buildOpenCommand(filePath)

  return {
    command,
    args,
    cleanup: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          rm(dirname(filePath), { recursive: true, force: true })
            .catch(() => {})
            .finally(resolve)
        }, RDP_CLEANUP_DELAY_MS)
      }),
  }
}

export function formatResult(connectionName: string, result: RunResult): string {
  if (result.error) return `Failed to open RDP session: ${result.error}`
  if (result.code === 0) return `Opened RDP session for ${connectionName}`
  return `RDP launch exited with code ${result.code} (${connectionName})`
}
