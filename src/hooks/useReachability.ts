import { useEffect, useRef, useState } from 'react'
import { SSH, SSH_PROBE_CONCURRENCY } from '@/constants'
import { probeSshConnection } from '@/lib/ssh/sshExec'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export type ReachabilityStatus = 'checking' | 'up' | 'down'

function fingerprint(connection: ConnectionModel, credentials: CredentialModel[]): string {
  const username = connection.credentialId
    ? (credentials.find((c) => c.id === connection.credentialId)?.username ?? '')
    : ''
  return JSON.stringify([
    connection.hostname,
    connection.port,
    connection.identityFile,
    connection.extraArgs,
    username,
  ])
}

export function useReachability({
  connections,
  credentials,
  probe = probeSshConnection,
}: {
  connections: ConnectionModel[]
  credentials: CredentialModel[]
  probe?: typeof probeSshConnection
}) {
  const [statuses, setStatuses] = useState<Map<string, ReachabilityStatus>>(new Map())
  const credentialsRef = useRef(credentials)
  credentialsRef.current = credentials
  const fingerprintsRef = useRef(new Map<string, string>())

  async function probeOne(connection: ConnectionModel) {
    setStatuses((prev) => new Map(prev).set(connection.id, 'checking'))
    const credential = connection.credentialId
      ? (credentialsRef.current.find((c) => c.id === connection.credentialId) ?? null)
      : null
    const result = await probe(connection, credential)
    setStatuses((prev) => new Map(prev).set(connection.id, result.code === 0 ? 'up' : 'down'))
  }

  async function refresh(targets: ConnectionModel[]) {
    const queue = targets.filter((c) => c.protocol === SSH)
    let next = 0
    async function worker() {
      while (next < queue.length) {
        await probeOne(queue[next++])
      }
    }
    await Promise.all(Array.from({ length: Math.min(SSH_PROBE_CONCURRENCY, queue.length) }, worker))
  }

  useEffect(() => {
    const nextFingerprints = new Map<string, string>()
    const changed: ConnectionModel[] = []
    for (const connection of connections) {
      if (connection.protocol !== SSH) continue
      const fp = fingerprint(connection, credentials)
      nextFingerprints.set(connection.id, fp)
      if (fingerprintsRef.current.get(connection.id) !== fp) {
        changed.push(connection)
      }
    }
    fingerprintsRef.current = nextFingerprints
    if (changed.length > 0) void refresh(changed)
  }, [connections, credentials])

  return { statuses, refresh: () => refresh(connections) }
}
