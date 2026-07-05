import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMcpConnectionStatus, listMcpConnections, runMcpCommand } from '@/lib/mcp/mcpTools'
import type { PersistedState } from '@/lib/storage'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

let tmpDir: string
let originalXdgConfigHome: string | undefined

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'termlink-mcptools-test-'))
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

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Box',
    hostname: 'box.internal',
    protocol: SSH,
    ...overrides,
  }
}

describe('listMcpConnections', () => {
  it('excludes connections that are not opted in', () => {
    const state: PersistedState = {
      connections: [connection({ mcp: undefined })],
      credentials: [],
    }
    expect(listMcpConnections(state)).toEqual([])
  })

  it('excludes rdp connections even if mcp-flagged', () => {
    const state: PersistedState = {
      connections: [
        connection({
          protocol: RDP,
          mcp: { enabled: true, allowedCommands: ['df -h'] },
        }),
      ],
      credentials: [],
    }
    expect(listMcpConnections(state)).toEqual([])
  })

  it('includes an opted-in ssh connection without leaking credential ids', () => {
    const state: PersistedState = {
      connections: [
        connection({
          group: 'prod',
          notes: 'staging box',
          credentialId: 'cred-1',
          mcp: { enabled: true, allowedCommands: ['df -h', 'uptime'] },
        }),
      ],
      credentials: [{ id: 'cred-1', username: 'alice' }],
    }
    const result = listMcpConnections(state)
    expect(result).toEqual([
      {
        id: 'conn-1',
        name: 'Box',
        hostname: 'box.internal',
        group: 'prod',
        notes: 'staging box',
        allowedCommands: ['df -h', 'uptime'],
      },
    ])
    expect(JSON.stringify(result)).not.toContain('cred-1')
  })
})

describe('runMcpCommand', () => {
  const state: PersistedState = {
    connections: [
      connection({
        credentialId: 'cred-1',
        mcp: {
          enabled: true,
          allowedCommands: ['df -h', 'systemctl status *'],
        },
      }),
      connection({
        id: 'conn-2',
        mcp: { enabled: false, allowedCommands: [] },
      }),
    ],
    credentials: [{ id: 'cred-1', username: 'alice' } as CredentialModel],
  }

  it('rejects an unknown connection id', async () => {
    const exec = vi.fn()
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await runMcpCommand(state, 'nope', 'df -h', exec, log)
    expect(outcome).toEqual({
      ok: false,
      reason: expect.stringContaining('Unknown or non-MCP-enabled'),
    })
    expect(exec).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 'nope', outcome: 'rejected' }),
    )
  })

  it('rejects a connection that is not mcp-enabled', async () => {
    const exec = vi.fn()
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await runMcpCommand(state, 'conn-2', 'df -h', exec, log)
    expect(outcome.ok).toBe(false)
    expect(exec).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 'conn-2', outcome: 'rejected' }),
    )
  })

  it('rejects a command outside the allow-list without ever calling exec', async () => {
    const exec = vi.fn()
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await runMcpCommand(state, 'conn-1', 'rm -rf /', exec, log)
    expect(outcome).toEqual({
      ok: false,
      reason: expect.stringContaining('Command not allowed'),
    })
    expect(exec).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        command: 'rm -rf /',
        outcome: 'rejected',
      }),
    )
  })

  it('runs an allowed command against the connection and its credential, then logs it', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: 'ok', stderr: '', code: 0 })
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await runMcpCommand(state, 'conn-1', 'systemctl status nginx', exec, log)
    expect(outcome).toEqual({
      ok: true,
      result: { stdout: 'ok', stderr: '', code: 0 },
    })
    expect(exec).toHaveBeenCalledWith(
      state.connections[0],
      state.credentials[0],
      'systemctl status nginx',
    )
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        connectionName: 'Box',
        command: 'systemctl status nginx',
        outcome: 'ok',
        exitCode: 0,
      }),
    )
    expect(log.mock.calls[0][0]).not.toHaveProperty('stdout')
  })

  it('does not let a logging failure affect the returned outcome', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 })
    const log = vi.fn().mockRejectedValue(new Error('disk full'))
    const outcome = await runMcpCommand(state, 'conn-1', 'df -h', exec, log)
    expect(outcome.ok).toBe(true)
  })
})

describe('getMcpConnectionStatus', () => {
  const state: PersistedState = {
    connections: [
      connection({
        credentialId: 'cred-1',
        lastConnectedAt: '2026-07-01T00:00:00.000Z',
        lastConnectedResult: 'ok',
        mcp: { enabled: true, allowedCommands: [] },
      }),
      connection({
        id: 'conn-2',
        mcp: { enabled: false, allowedCommands: [] },
      }),
    ],
    credentials: [{ id: 'cred-1', username: 'alice' } as CredentialModel],
  }

  it('rejects an unknown or non-mcp-enabled connection without probing', async () => {
    const probe = vi.fn()
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await getMcpConnectionStatus(state, 'conn-2', probe, log)
    expect(outcome.ok).toBe(false)
    expect(probe).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 'conn-2', outcome: 'rejected' }),
    )
  })

  it('works even with no allowedCommands configured, since the probe is fixed', async () => {
    const probe = vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 })
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await getMcpConnectionStatus(state, 'conn-1', probe, log)
    expect(outcome).toEqual({
      ok: true,
      status: {
        reachable: true,
        error: undefined,
        lastKnown: { at: '2026-07-01T00:00:00.000Z', result: 'ok' },
      },
    })
  })

  it('reports unreachable and logs it when the probe fails', async () => {
    const probe = vi.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
      code: 255,
    })
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await getMcpConnectionStatus(state, 'conn-1', probe, log)
    expect(outcome).toEqual({
      ok: true,
      status: expect.objectContaining({ reachable: false }),
    })
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        outcome: 'error',
        exitCode: 255,
      }),
    )
  })

  it('omits lastKnown when the connection has never been connected to', async () => {
    const noHistory: PersistedState = {
      connections: [
        connection({
          id: 'conn-3',
          mcp: { enabled: true, allowedCommands: [] },
        }),
      ],
      credentials: [],
    }
    const probe = vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 })
    const log = vi.fn().mockResolvedValue(undefined)
    const outcome = await getMcpConnectionStatus(noHistory, 'conn-3', probe, log)
    expect(outcome).toEqual({
      ok: true,
      status: { reachable: true, error: undefined, lastKnown: undefined },
    })
  })
})
