import { describe, expect, it } from 'vitest'
import { buildKeychainCommand, deletePassword, getPassword, setPassword } from '@/lib/keychain'

describe('buildKeychainCommand', () => {
  it('uses the security CLI on darwin', () => {
    expect(buildKeychainCommand('darwin', 'set', 'cred-1', 'pw')).toEqual({
      command: 'security',
      args: ['add-generic-password', '-U', '-a', 'cred-1', '-s', 'termlink', '-w', 'pw'],
    })
    expect(buildKeychainCommand('darwin', 'get', 'cred-1')).toEqual({
      command: 'security',
      args: ['find-generic-password', '-a', 'cred-1', '-s', 'termlink', '-w'],
    })
    expect(buildKeychainCommand('darwin', 'delete', 'cred-1')).toEqual({
      command: 'security',
      args: ['delete-generic-password', '-a', 'cred-1', '-s', 'termlink'],
    })
  })

  it('uses secret-tool on linux, with the password over stdin', () => {
    expect(buildKeychainCommand('linux', 'set', 'cred-1', 'pw')).toEqual({
      command: 'secret-tool',
      args: ['store', '--label=termlink', 'service', 'termlink', 'account', 'cred-1'],
      stdin: 'pw',
    })
    expect(buildKeychainCommand('linux', 'get', 'cred-1')).toEqual({
      command: 'secret-tool',
      args: ['lookup', 'service', 'termlink', 'account', 'cred-1'],
    })
    expect(buildKeychainCommand('linux', 'delete', 'cred-1')).toEqual({
      command: 'secret-tool',
      args: ['clear', 'service', 'termlink', 'account', 'cred-1'],
    })
  })

  it('uses a powershell DPAPI script on win32, with the password over stdin', () => {
    const set = buildKeychainCommand('win32', 'set', 'cred-1', 'pw')
    expect(set.command).toBe('powershell.exe')
    expect(set.args.slice(0, 3)).toEqual(['-NoProfile', '-NonInteractive', '-Command'])
    expect(set.args[3]).toContain('ConvertTo-SecureString')
    expect(set.args[3]).toContain('cred-1.dat')
    expect(set.stdin).toBe('pw')
    expect(set.args[3]).not.toContain('pw')

    const get = buildKeychainCommand('win32', 'get', 'cred-1')
    expect(get.args[3]).toContain('PtrToStringBSTR')
    expect(get.stdin).toBeUndefined()

    const del = buildKeychainCommand('win32', 'delete', 'cred-1')
    expect(del.args[3]).toContain('Remove-Item')
  })

  it('rejects an id that could break out of the embedded script', () => {
    expect(() => buildKeychainCommand('win32', 'get', "cred'; Remove-Item x")).toThrow(/unsafe/i)
  })
})

describe.skipIf(process.platform !== 'darwin')('keychain round-trip', () => {
  it('sets, reads back, and deletes a password', async () => {
    const id = `termlink-test-${process.pid}-${Date.now()}`
    const password = 'p@ss w0rd!$"\'`'
    try {
      expect(await getPassword(id)).toBeNull()
      await setPassword(id, password)
      expect(await getPassword(id)).toBe(password)
      await setPassword(id, 'second')
      expect(await getPassword(id)).toBe('second')
      await deletePassword(id)
      expect(await getPassword(id)).toBeNull()
    } finally {
      await deletePassword(id).catch(() => {})
    }
  })

  it('tolerates deleting a password that does not exist', async () => {
    await expect(deletePassword(`termlink-test-missing-${process.pid}`)).resolves.toBeUndefined()
  })
})
