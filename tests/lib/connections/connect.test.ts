import { rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildLaunch } from '@/lib/connections/connect'
import { sshCommand } from '@/lib/ssh/ssh'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Test',
    hostname: 'example.com',
    protocol: SSH,
    ...overrides,
  }
}

describe('buildLaunch: ssh', () => {
  it('builds ssh args and never fetches a password', async () => {
    const fetchPassword = vi.fn()
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    const launch = await buildLaunch(connection({ port: 2222 }), credential, fetchPassword)

    expect(launch.command).toBe(sshCommand())
    expect(launch.args).toEqual(['-p', '2222', 'alice@example.com'])
    expect(fetchPassword).not.toHaveBeenCalled()
    await expect(launch.cleanup()).resolves.toBeUndefined()
  })
})

describe('buildLaunch: rdp', () => {
  it('fetches the stored password when the credential has one', async () => {
    const fetchPassword = vi.fn().mockResolvedValue('hunter2')
    const credential: CredentialModel = {
      id: 'cred-1',
      username: 'alice',
      hasPassword: true,
    }
    const launch = await buildLaunch(connection({ protocol: RDP }), credential, fetchPassword)

    expect(fetchPassword).toHaveBeenCalledWith('cred-1')
    const filePath = launch.args[launch.args.length - 1]
    await rm(dirname(filePath), { recursive: true, force: true })
  })

  it('does not fetch a password when the credential has none stored', async () => {
    const fetchPassword = vi.fn()
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    const launch = await buildLaunch(connection({ protocol: RDP }), credential, fetchPassword)

    expect(fetchPassword).not.toHaveBeenCalled()
    const filePath = launch.args[launch.args.length - 1]
    await rm(dirname(filePath), { recursive: true, force: true })
  })

  it('falls back to no password when the keychain lookup fails', async () => {
    const fetchPassword = vi.fn().mockRejectedValue(new Error('locked'))
    const credential: CredentialModel = {
      id: 'cred-1',
      username: 'alice',
      hasPassword: true,
    }
    const launch = await buildLaunch(connection({ protocol: RDP }), credential, fetchPassword)

    const filePath = launch.args[launch.args.length - 1]
    await rm(dirname(filePath), { recursive: true, force: true })
  })
})
