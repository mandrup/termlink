import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadSshConfigHosts, parseSshConfig } from '@/lib/ssh/sshConfig'

describe('parseSshConfig', () => {
  it('parses a simple Host block', () => {
    expect(
      parseSshConfig(
        [
          'Host web1',
          '  HostName web1.example.com',
          '  Port 2222',
          '  User deploy',
          '  IdentityFile ~/.ssh/id_deploy',
        ].join('\n'),
      ),
    ).toEqual([
      {
        alias: 'web1',
        port: 2222,
        user: 'deploy',
        identityFile: '~/.ssh/id_deploy',
      },
    ])
  })

  it('creates one entry per alias when a Host line lists several', () => {
    const hosts = parseSshConfig('Host web1 web2\n  User deploy\n')
    expect(hosts.map((h) => h.alias)).toEqual(['web1', 'web2'])
    expect(hosts.every((h) => h.user === 'deploy')).toBe(true)
  })

  it('skips wildcard and negated patterns but keeps concrete aliases', () => {
    const hosts = parseSshConfig(
      'Host * !bastion db-?\n  User nobody\nHost web1 *.internal\n  User deploy\n',
    )
    expect(hosts.map((h) => h.alias)).toEqual(['web1'])
  })

  it('ignores Match blocks entirely', () => {
    const hosts = parseSshConfig('Match host web1\n  User root\nHost web1\n  User deploy\n')
    expect(hosts).toEqual([{ alias: 'web1', user: 'deploy' }])
  })

  it('handles comments, blank lines, = separators, quotes, and keyword case', () => {
    const hosts = parseSshConfig(
      ['# fleet', '', 'hOsT web1', '  port=2222', '  USER "deploy user"'].join('\n'),
    )
    expect(hosts).toEqual([{ alias: 'web1', port: 2222, user: 'deploy user' }])
  })

  it('keeps the first value when a keyword repeats within a block', () => {
    const hosts = parseSshConfig(
      'Host web1\n  IdentityFile ~/.ssh/first\n  IdentityFile ~/.ssh/second\n',
    )
    expect(hosts[0].identityFile).toBe('~/.ssh/first')
  })

  it('ignores invalid ports and directives before any Host block', () => {
    const hosts = parseSshConfig('User toplevel\nHost web1\n  Port banana\n  Port 70000\n')
    expect(hosts).toEqual([{ alias: 'web1' }])
  })
})

describe('loadSshConfigHosts', () => {
  it('returns an empty list when the file does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'termlink-sshconfig-'))
    await expect(loadSshConfigHosts(join(dir, 'config'))).resolves.toEqual([])
  })

  it('reads and parses the file when it exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'termlink-sshconfig-'))
    const path = join(dir, 'config')
    await writeFile(path, 'Host web1\n  User deploy\n')
    await expect(loadSshConfigHosts(path)).resolves.toEqual([{ alias: 'web1', user: 'deploy' }])
  })
})
