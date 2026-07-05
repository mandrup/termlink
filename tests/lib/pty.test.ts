import { describe, expect, it } from 'vitest'
import { runInteractive } from '@/lib/pty'

describe('runInteractive', () => {
  it('resolves with exit code 0 for a successful command', async () => {
    const result = await runInteractive('true', [])
    expect(result).toEqual({ code: 0 })
  })

  it('resolves with a non-zero exit code for a failing command', async () => {
    const result = await runInteractive('false', [])
    expect(result.code).not.toBe(0)
  })

  it('resolves with a non-zero exit code when the command does not exist', async () => {
    const result = await runInteractive('termlink-nonexistent-command-xyz', [])
    expect(result.code).not.toBe(0)
  })
})
