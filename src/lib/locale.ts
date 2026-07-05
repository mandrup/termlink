import { execFileSync } from 'node:child_process'

export interface SystemLocale {
  locale?: string
}

function isMeaningfulLocaleEnv(value: string | undefined): boolean {
  if (!value) return false
  const base = value.split('.')[0].split('@')[0]
  return base !== 'C' && base !== 'POSIX'
}

export function detectSystemLocale(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  readAppleLocale: () => string = () =>
    execFileSync('defaults', ['read', '-g', 'AppleLocale'], {
      encoding: 'utf8',
    }),
): SystemLocale {
  if (
    isMeaningfulLocaleEnv(env.LC_ALL) ||
    isMeaningfulLocaleEnv(env.LC_TIME) ||
    isMeaningfulLocaleEnv(env.LANG)
  ) {
    return {}
  }

  if (platform !== 'darwin') {
    return {}
  }

  let raw: string
  try {
    raw = readAppleLocale().trim()
  } catch {
    return {}
  }

  const match = raw.match(/^([a-zA-Z]+)_([a-zA-Z]+)(?:@rg=([a-z]{2})[a-z]*)?$/)
  if (!match) return {}
  const [, language, region, regionOverride] = match
  const locale = `${language}-${(regionOverride ?? region).toUpperCase()}`

  return {
    locale,
  }
}

export const systemLocale = detectSystemLocale()
