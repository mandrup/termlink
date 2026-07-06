import { readFile, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildOpenCommand, buildRdpFileContent, prepareRdpLaunch } from '@/lib/rdp/rdp'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { RDP } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Test',
    hostname: 'example.com',
    protocol: RDP,
    ...overrides,
  }
}

describe('buildRdpFileContent', () => {
  it('defaults to port 3389 with no port or credential', () => {
    expect(buildRdpFileContent(connection(), null)).toBe('full address:s:example.com:3389\r\n')
  })

  it('uses a custom port', () => {
    expect(buildRdpFileContent(connection({ port: 3390 }), null)).toBe(
      'full address:s:example.com:3390\r\n',
    )
  })

  it('adds a username line for a credential username', () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    expect(buildRdpFileContent(connection(), credential)).toBe(
      'full address:s:example.com:3389\r\nusername:s:alice\r\n',
    )
  })

  it('ignores a credential with no username', () => {
    const credential: CredentialModel = { id: 'cred-1', username: '' }
    expect(buildRdpFileContent(connection(), credential)).toBe(
      'full address:s:example.com:3389\r\n',
    )
  })

  it('adds a password line when a password is supplied', () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    expect(buildRdpFileContent(connection(), credential, 'hunter2')).toBe(
      'full address:s:example.com:3389\r\nusername:s:alice\r\npassword:s:hunter2\r\n',
    )
  })

  it('omits the password line when the password is null or empty', () => {
    expect(buildRdpFileContent(connection(), null, null)).toBe(
      'full address:s:example.com:3389\r\n',
    )
    expect(buildRdpFileContent(connection(), null, '')).toBe('full address:s:example.com:3389\r\n')
  })
})

describe('buildOpenCommand', () => {
  it('uses cmd.exe start on win32 so the launch returns without waiting for the session', () => {
    expect(buildOpenCommand('/tmp/x.rdp', 'win32')).toEqual({
      command: 'cmd.exe',
      args: ['/c', 'start', '', '/tmp/x.rdp'],
    })
  })

  it('uses open on darwin', () => {
    expect(buildOpenCommand('/tmp/x.rdp', 'darwin')).toEqual({
      command: 'open',
      args: ['/tmp/x.rdp'],
    })
  })

  it('uses xdg-open elsewhere', () => {
    expect(buildOpenCommand('/tmp/x.rdp', 'linux')).toEqual({
      command: 'xdg-open',
      args: ['/tmp/x.rdp'],
    })
  })
})

describe('prepareRdpLaunch', () => {
  it('writes a .rdp file and returns a platform open command for it', async () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    const launch = await prepareRdpLaunch(connection({ port: 3390 }), credential)

    try {
      const filePath = launch.args[launch.args.length - 1]
      const content = await readFile(filePath, 'utf-8')
      expect(content).toBe('full address:s:example.com:3390\r\nusername:s:alice\r\n')
    } finally {
      const filePath = launch.args[launch.args.length - 1]
      await rm(dirname(filePath), { recursive: true, force: true })
    }
  })

  it('includes the password in the written file when supplied', async () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    const launch = await prepareRdpLaunch(connection(), credential, 'hunter2')

    try {
      const filePath = launch.args[launch.args.length - 1]
      const content = await readFile(filePath, 'utf-8')
      expect(content).toContain('password:s:hunter2\r\n')
    } finally {
      const filePath = launch.args[launch.args.length - 1]
      await rm(dirname(filePath), { recursive: true, force: true })
    }
  })
})
