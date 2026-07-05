import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getConfigPath, loadState, saveState } from '@/lib/storage'
import type { PersistedState } from '@/lib/storage'
import { SSH } from '@/constants'

let tmpDir: string
let originalXdgConfigHome: string | undefined

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'termlink-storage-test-'))
  originalXdgConfigHome = process.env.XDG_CONFIG_HOME
  process.env.XDG_CONFIG_HOME = tmpDir
})

afterEach(async () => {
  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome
  }
  await rm(tmpDir, { recursive: true, force: true })
})

describe('getConfigPath', () => {
  it('resolves under $XDG_CONFIG_HOME/termlink/connections.json', () => {
    expect(getConfigPath()).toBe(join(tmpDir, 'termlink', 'connections.json'))
  })
})

describe('loadState', () => {
  it('returns empty state with no error when no config file exists', async () => {
    const { state, error } = await loadState()
    expect(state).toEqual({ connections: [], credentials: [] })
    expect(error).toBeUndefined()
  })

  it('returns empty state with an error message when the config file is corrupted', async () => {
    const path = getConfigPath()
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, '{not valid json', 'utf-8')
    const { state, error } = await loadState()
    expect(state).toEqual({ connections: [], credentials: [] })
    expect(error).toMatch(/corrupted/)
  })
})

describe('saveState / loadState round trip', () => {
  const sample: PersistedState = {
    connections: [
      {
        id: 'conn-1',
        name: 'Box',
        hostname: '1.2.3.4',
        protocol: SSH,
        credentialId: 'cred-1',
        lastConnectedAt: '2026-06-30T12:00:00.000Z',
        lastConnectedResult: 'ok',
      },
    ],
    credentials: [{ id: 'cred-1', username: 'alice' }],
  }

  it('persists connections and credentials to disk', async () => {
    await saveState(sample)
    const { state, error } = await loadState()
    expect(error).toBeUndefined()
    expect(state.connections).toEqual(sample.connections)
    expect(state.credentials).toEqual(sample.credentials)
  })

  it('serializes concurrent saves so the last state wins intact', async () => {
    const states = Array.from({ length: 10 }, (_, i) => ({
      connections: [{ ...sample.connections[0], name: `Box ${i}` }],
      credentials: sample.credentials,
    }))
    await Promise.all(states.map((s) => saveState(s)))
    const { state, error } = await loadState()
    expect(error).toBeUndefined()
    expect(state.connections[0].name).toBe('Box 9')
  })
})
