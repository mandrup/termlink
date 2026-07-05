import { describe, expect, it } from 'vitest'
import { detectSystemLocale } from '@/lib/locale'

describe('detectSystemLocale', () => {
  it('defers to Intl when a locale env var is set', () => {
    expect(
      detectSystemLocale({ LANG: 'da_DK.UTF-8' }, 'darwin', () => {
        throw new Error('should not read AppleLocale')
      }),
    ).toEqual({})
  })

  it('treats the C.UTF-8 placeholder LANG (macOS default) as unset', () => {
    expect(detectSystemLocale({ LANG: 'C.UTF-8' }, 'darwin', () => 'en_US@rg=dkzzzz')).toEqual({
      locale: 'en-DK',
    })
  })

  it('treats a bare C or POSIX LANG as unset', () => {
    expect(detectSystemLocale({ LANG: 'POSIX' }, 'darwin', () => 'en_US')).toEqual({
      locale: 'en-US',
    })
  })

  it('defers to Intl on non-darwin platforms', () => {
    expect(
      detectSystemLocale({}, 'linux', () => {
        throw new Error('should not read AppleLocale')
      }),
    ).toEqual({})
  })

  it('uses the language region as-is when there is no region override', () => {
    expect(detectSystemLocale({}, 'darwin', () => 'en_US')).toEqual({
      locale: 'en-US',
    })
  })

  it('substitutes a region override straight into the region subtag', () => {
    expect(detectSystemLocale({}, 'darwin', () => 'en_US@rg=dkzzzz')).toEqual({
      locale: 'en-DK',
    })
  })

  it('returns nothing when reading AppleLocale fails', () => {
    expect(
      detectSystemLocale({}, 'darwin', () => {
        throw new Error('defaults: not found')
      }),
    ).toEqual({})
  })

  it('returns nothing for unparseable AppleLocale output', () => {
    expect(detectSystemLocale({}, 'darwin', () => 'garbage')).toEqual({})
  })
})
