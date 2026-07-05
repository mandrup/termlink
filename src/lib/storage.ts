import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { CONFIG_VERSION } from '@/constants'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export interface PersistedState {
  connections: ConnectionModel[]
  credentials: CredentialModel[]
}

interface ConfigFile {
  version: number
  connections: ConnectionModel[]
  credentials: CredentialModel[]
}

export function getConfigPath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(configDir, 'termlink', 'connections.json')
}

export async function loadState(): Promise<{
  state: PersistedState
  error?: string
}> {
  const path = getConfigPath()
  const empty: PersistedState = {
    connections: [],
    credentials: [],
  }
  let raw: string
  try {
    raw = await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { state: empty }
    }
    return {
      state: empty,
      error: `Failed to read config: ${(err as Error).message}`,
    }
  }

  try {
    const parsed = JSON.parse(raw) as ConfigFile
    return {
      state: {
        connections: parsed.connections ?? [],
        credentials: parsed.credentials ?? [],
      },
    }
  } catch (err) {
    return {
      state: empty,
      error: `Config file is corrupted, starting empty: ${(err as Error).message}`,
    }
  }
}

let saveChain: Promise<void> = Promise.resolve()

export function saveState(state: PersistedState): Promise<void> {
  const write = async () => {
    const path = getConfigPath()
    const tmpPath = `${path}.${process.pid}.tmp`
    const payload: ConfigFile = {
      version: CONFIG_VERSION,
      connections: state.connections,
      credentials: state.credentials,
    }

    await mkdir(dirname(path), { recursive: true })
    await writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf-8')
    await rename(tmpPath, path)
  }

  const result = saveChain.then(write, write)
  saveChain = result.catch(() => {})
  return result
}
