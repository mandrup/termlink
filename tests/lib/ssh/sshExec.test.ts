import { describe, expect, it } from 'vitest'
import {
  buildProbeArgs,
  buildSshExecArgs,
  execSshCommand,
  probeSshConnection,
  truncateOutput,
} from '@/lib/ssh/sshExec'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { SSH, SSH_EXEC_MAX_OUTPUT_CHARS } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Test',
    hostname: 'example.com',
    protocol: SSH,
    ...overrides,
  }
}

describe('buildSshExecArgs', () => {
  it('appends the command after the usual ssh args, in batch mode', () => {
    expect(buildSshExecArgs(connection(), null, 'uptime')).toEqual([
      '-o',
      'BatchMode=yes',
      '-p',
      '22',
      'example.com',
      'uptime',
    ])
  })

  it('still applies identity file and credential handling', () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    expect(
      buildSshExecArgs(connection({ identityFile: '~/.ssh/id_ed25519' }), credential, 'df -h'),
    ).toEqual([
      '-o',
      'BatchMode=yes',
      '-p',
      '22',
      '-i',
      '~/.ssh/id_ed25519',
      'alice@example.com',
      'df -h',
    ])
  })
})

describe('execSshCommand', () => {
  it('resolves with exit code 0 for a successful command', async () => {
    const result = await execSshCommand(connection(), null, 'ignored', {
      sshCommand: 'true',
    })
    expect(result).toEqual({ stdout: '', stderr: '', code: 0 })
  })

  it('resolves with a non-zero exit code for a failing command', async () => {
    const result = await execSshCommand(connection(), null, 'ignored', {
      sshCommand: 'false',
    })
    expect(result.code).not.toBe(0)
    expect(result.error).toBeUndefined()
  })

  it('captures stdout from the underlying process', async () => {
    const result = await execSshCommand(connection(), null, 'uptime', {
      sshCommand: 'echo',
    })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('example.com')
    expect(result.stdout).toContain('uptime')
  })

  it('resolves with an error when the binary does not exist', async () => {
    const result = await execSshCommand(connection(), null, 'ignored', {
      sshCommand: 'termlink-nonexistent-command-xyz',
    })
    expect(result.code).toBeNull()
    expect(result.error).toBeTruthy()
  })
})

describe('truncateOutput', () => {
  it('leaves output at or under the cap untouched', () => {
    const text = 'x'.repeat(SSH_EXEC_MAX_OUTPUT_CHARS)
    expect(truncateOutput(text)).toBe(text)
  })

  it('truncates oversized output and marks it as truncated', () => {
    const result = truncateOutput('x'.repeat(SSH_EXEC_MAX_OUTPUT_CHARS + 1))
    expect(result).toContain('[termlink: output truncated')
    expect(result.length).toBeLessThan(SSH_EXEC_MAX_OUTPUT_CHARS + 100)
  })
})

describe('buildProbeArgs', () => {
  it('runs a fixed "true" command with a short connect timeout and no interactive prompts', () => {
    expect(buildProbeArgs(connection(), null)).toEqual([
      '-o',
      'ConnectTimeout=5',
      '-o',
      'BatchMode=yes',
      '-p',
      '22',
      'example.com',
      'true',
    ])
  })
})

describe('probeSshConnection', () => {
  it('reports reachable when the probe succeeds', async () => {
    const result = await probeSshConnection(connection(), null, {
      sshCommand: 'true',
    })
    expect(result.code).toBe(0)
  })

  it('reports unreachable when the probe fails', async () => {
    const result = await probeSshConnection(connection(), null, {
      sshCommand: 'false',
    })
    expect(result.code).not.toBe(0)
  })
})
