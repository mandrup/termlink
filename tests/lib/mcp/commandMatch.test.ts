import { describe, expect, it } from 'vitest'
import { hasShellMetacharacters, isCommandAllowed } from '@/lib/mcp/commandMatch'

describe('hasShellMetacharacters', () => {
  it.each([';', '&', '|', '`', '$', '<', '>', '\n', '\r'])(
    'flags commands containing %s',
    (char) => {
      expect(hasShellMetacharacters(`echo hi${char}rm -rf /`)).toBe(true)
    },
  )

  it('allows a plain parameterized command', () => {
    expect(hasShellMetacharacters('systemctl status nginx')).toBe(false)
  })
})

describe('isCommandAllowed', () => {
  it('matches an exact pattern', () => {
    expect(isCommandAllowed('df -h', ['df -h'])).toBe(true)
    expect(isCommandAllowed('df -h ', ['df -h'])).toBe(false)
  })

  it('matches a trailing-* pattern as a prefix', () => {
    expect(isCommandAllowed('systemctl status nginx', ['systemctl status *'])).toBe(true)
    expect(isCommandAllowed('systemctl restart nginx', ['systemctl status *'])).toBe(false)
  })

  it('rejects an otherwise-matching command carrying a smuggled second command', () => {
    expect(isCommandAllowed('systemctl status nginx; rm -rf /', ['systemctl status *'])).toBe(false)
  })

  it('rejects when no pattern matches', () => {
    expect(isCommandAllowed('rm -rf /', ['df -h', 'uptime'])).toBe(false)
  })

  it('rejects everything when there are no allowed patterns', () => {
    expect(isCommandAllowed('uptime', [])).toBe(false)
  })
})
