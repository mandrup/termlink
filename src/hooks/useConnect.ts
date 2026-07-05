import { useApp } from 'ink'
import { useRef } from 'react'
import { buildLaunch } from '@/lib/connections/connect'
import type { RunResult } from '@/lib/pty'
import type { ConnectionModel, ConnectionResult, CredentialModel } from '@/models/connection'

export function useConnect({
  runCommand,
  setStatusMessage,
  recordConnectionResult,
}: {
  runCommand: (command: string, args: string[]) => Promise<RunResult>
  setStatusMessage: (message: string | undefined) => void
  recordConnectionResult: (connection: ConnectionModel, result: ConnectionResult) => void
}) {
  const { suspendTerminal } = useApp()

  const isConnectingRef = useRef(false)

  async function connect(selected: ConnectionModel | null, credential: CredentialModel | null) {
    if (!selected) {
      return
    }

    const name = selected.name
    isConnectingRef.current = true

    try {
      const launch = await buildLaunch(selected, credential)

      try {
        await suspendTerminal(async () => {
          const result = await runCommand(launch.command, launch.args)
          setStatusMessage(launch.formatResult(name, result))
          recordConnectionResult(selected, result.error || result.code !== 0 ? 'error' : 'ok')
        })
      } finally {
        void launch.cleanup()
      }
    } finally {
      isConnectingRef.current = false
    }
  }

  return { isConnectingRef, connect }
}
