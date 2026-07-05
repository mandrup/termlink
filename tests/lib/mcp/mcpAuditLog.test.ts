import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appendAuditLog, getAuditLogPath } from '@/lib/mcp/mcpAuditLog'

let tmpDir: string
let originalXdgConfigHome: string | undefined

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'termlink-audit-test-'))
  originalXdgConfigHome = process.env.XDG_CONFIG_HOME
  process.env.XDG_CONFIG_HOME = tmpDir
})

afterEach(async () => {
  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome
  }
  await rm(tmpDir, { recursive: true, force: true })
})

describe('getAuditLogPath', () => {
  it('resolves under $XDG_CONFIG_HOME/termlink/mcp-audit.log', () => {
    expect(getAuditLogPath()).toBe(join(tmpDir, 'termlink', 'mcp-audit.log'))
  })
})

describe('appendAuditLog', () => {
  it('appends a JSON line with a timestamp and the given fields', async () => {
    await appendAuditLog({
      connectionId: 'conn-1',
      connectionName: 'Box',
      command: 'uptime',
      outcome: 'ok',
      exitCode: 0,
    })
    const contents = await readFile(getAuditLogPath(), 'utf-8')
    const lines = contents.trim().split('\n')
    expect(lines).toHaveLength(1)
    const entry = JSON.parse(lines[0])
    expect(entry).toMatchObject({
      connectionId: 'conn-1',
      connectionName: 'Box',
      command: 'uptime',
      outcome: 'ok',
      exitCode: 0,
    })
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('never includes stdout/stderr fields, only what was explicitly passed', async () => {
    await appendAuditLog({
      connectionId: 'conn-1',
      connectionName: 'Box',
      command: 'rm -rf /',
      outcome: 'rejected',
      reason: 'not allowed',
    })
    const contents = await readFile(getAuditLogPath(), 'utf-8')
    const entry = JSON.parse(contents.trim())
    expect(entry).not.toHaveProperty('stdout')
    expect(entry).not.toHaveProperty('stderr')
    expect(entry.reason).toBe('not allowed')
  })

  it('appends rather than overwrites across multiple calls', async () => {
    await appendAuditLog({
      connectionId: 'conn-1',
      connectionName: 'Box',
      command: 'uptime',
      outcome: 'ok',
      exitCode: 0,
    })
    await appendAuditLog({
      connectionId: 'conn-1',
      connectionName: 'Box',
      command: 'df -h',
      outcome: 'ok',
      exitCode: 0,
    })
    const contents = await readFile(getAuditLogPath(), 'utf-8')
    expect(contents.trim().split('\n')).toHaveLength(2)
  })
})
