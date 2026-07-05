import { SHELL_METACHARACTERS } from '@/constants'

export function hasShellMetacharacters(command: string): boolean {
  return SHELL_METACHARACTERS.test(command)
}

export function isCommandAllowed(command: string, patterns: string[]): boolean {
  if (hasShellMetacharacters(command)) return false
  return patterns.some((pattern) =>
    pattern.endsWith('*') ? command.startsWith(pattern.slice(0, -1)) : command === pattern,
  )
}
