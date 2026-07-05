import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { SSH_CONFIG_DISPLAY_PATH } from '@/constants'

export { SSH_CONFIG_DISPLAY_PATH }

export interface SshConfigHost {
  alias: string
  port?: number
  user?: string
  identityFile?: string
}

function unquote(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value
}

export function parseSshConfig(content: string): SshConfigHost[] {
  const hosts: SshConfigHost[] = []
  let current: SshConfigHost[] = []

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const parsed = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*(?:=|\s)\s*(.+)$/)
    if (!parsed) continue
    const keyword = parsed[1].toLowerCase()
    const value = unquote(parsed[2].trim())

    if (keyword === 'host') {
      current = parsed[2]
        .trim()
        .split(/\s+/)
        .map(unquote)
        .filter((pattern) => pattern && !/[*?!]/.test(pattern))
        .map((alias) => ({ alias }))
      hosts.push(...current)
      continue
    }
    if (keyword === 'match') {
      current = []
      continue
    }
    for (const host of current) {
      if (keyword === 'port' && host.port === undefined) {
        const port = Number(value)
        if (Number.isInteger(port) && port >= 1 && port <= 65535) {
          host.port = port
        }
      } else if (keyword === 'user' && host.user === undefined) {
        host.user = value
      } else if (keyword === 'identityfile' && host.identityFile === undefined) {
        host.identityFile = value
      }
    }
  }
  return hosts
}

export async function loadSshConfigHosts(
  path = join(homedir(), '.ssh', 'config'),
): Promise<SshConfigHost[]> {
  let content: string
  try {
    content = await readFile(path, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  return parseSshConfig(content)
}
