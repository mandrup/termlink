import { describe, expect, it } from 'vitest'
import { buildSshArgs, splitArgs } from '@/lib/ssh/ssh'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Test',
    hostname: 'example.com',
    protocol: SSH,
    ...overrides,
  }
}

describe('buildSshArgs', () => {
  it('defaults to port 22 with no identity file or credential', () => {
    expect(buildSshArgs(connection(), null)).toEqual(['-p', '22', 'example.com'])
  })

  it('uses a custom port', () => {
    expect(buildSshArgs(connection({ port: 2222 }), null)).toEqual(['-p', '2222', 'example.com'])
  })

  it('adds -i for an identity file', () => {
    expect(buildSshArgs(connection({ identityFile: '~/.ssh/id_ed25519' }), null)).toEqual([
      '-p',
      '22',
      '-i',
      '~/.ssh/id_ed25519',
      'example.com',
    ])
  })

  it('prefixes the target with username@ when a credential is supplied', () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    expect(buildSshArgs(connection(), credential)).toEqual(['-p', '22', 'alice@example.com'])
  })

  it('combines port, identity file, and credential in order', () => {
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    expect(
      buildSshArgs(connection({ port: 2222, identityFile: '~/.ssh/id_ed25519' }), credential),
    ).toEqual(['-p', '2222', '-i', '~/.ssh/id_ed25519', 'alice@example.com'])
  })

  it('ignores a credential with no username', () => {
    const credential: CredentialModel = { id: 'cred-1', username: '' }
    expect(buildSshArgs(connection(), credential)).toEqual(['-p', '22', 'example.com'])
  })

  it('splits extra args on whitespace, placed after identity file and before the target', () => {
    expect(
      buildSshArgs(
        connection({
          identityFile: '~/.ssh/id_ed25519',
          extraArgs: '-J bastion.example.com',
        }),
        null,
      ),
    ).toEqual(['-p', '22', '-i', '~/.ssh/id_ed25519', '-J', 'bastion.example.com', 'example.com'])
  })

  it('ignores empty extra args', () => {
    expect(buildSshArgs(connection({ extraArgs: '  ' }), null)).toEqual(['-p', '22', 'example.com'])
  })
})

describe('splitArgs', () => {
  it('splits on whitespace and collapses repeats', () => {
    expect(splitArgs('-J  bastion.example.com   -o Foo=bar')).toEqual([
      '-J',
      'bastion.example.com',
      '-o',
      'Foo=bar',
    ])
  })

  it('trims leading and trailing whitespace', () => {
    expect(splitArgs('  -v  ')).toEqual(['-v'])
  })

  it('returns an empty array for blank input', () => {
    expect(splitArgs('')).toEqual([])
    expect(splitArgs('   ')).toEqual([])
  })
})
