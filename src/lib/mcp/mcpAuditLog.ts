import { appendFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { AuditLogEntry } from '@/models/auditLog'

export type { AuditLogEntry }

export function getAuditLogPath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(configDir, 'termlink', 'mcp-audit.log')
}

export async function appendAuditLog(entry: AuditLogEntry): Promise<void> {
  const path = getAuditLogPath()
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  })
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${line}\n`, 'utf-8')
}
