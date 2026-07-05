import { useEffect, useRef, useState } from 'react'
import { flattenRows } from '@/components/ConnectionList'
import type { ConnectionFormValues } from '@/lib/connections/connectionForm'
import { buildConnectionFields, matchesQuery, nextId } from '@/lib/connections/connections'
import { deletePassword, setPassword } from '@/lib/keychain'
import { SSH_CONFIG_DISPLAY_PATH, type SshConfigHost } from '@/lib/ssh/sshConfig'
import type { PersistedState } from '@/lib/storage'
import type { ConnectionModel, ConnectionResult, CredentialModel } from '@/models/connection'
import { SSH } from '@/constants'

export function useConnectionsStore({
  initialConnections,
  initialCredentials,
  initialStatusMessage,
  saveState,
}: {
  initialConnections: ConnectionModel[]
  initialCredentials: CredentialModel[]
  initialStatusMessage?: string
  saveState: (state: PersistedState) => Promise<void>
}) {
  const [connections, setConnections] = useState<ConnectionModel[]>(initialConnections)
  const [credentials, setCredentials] = useState<CredentialModel[]>(initialCredentials)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const initialRows = flattenRows(initialConnections, new Set())
    const firstConnectionIndex = initialRows.findIndex((r) => r.type === 'connection')
    return firstConnectionIndex >= 0 ? firstConnectionIndex : 0
  })
  const [statusMessage, setStatusMessage] = useState<string | undefined>(initialStatusMessage)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  const hasMutatedRef = useRef(false)
  useEffect(() => {
    if (!hasMutatedRef.current) {
      hasMutatedRef.current = true
      return
    }
    void saveState({ connections, credentials }).catch((err) => {
      setStatusMessage(`Failed to save config: ${err instanceof Error ? err.message : String(err)}`)
    })
  }, [connections, credentials, saveState])

  function recordConnectionResult(connection: ConnectionModel, result: ConnectionResult) {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connection.id
          ? {
              ...c,
              lastConnectedAt: new Date().toISOString(),
              lastConnectedResult: result,
            }
          : c,
      ),
    )
  }

  const filteredConnections = connections.filter((c) => matchesQuery(c, searchQuery))
  const isSearching = searchQuery.trim().length > 0
  const visibleCollapsedGroups = isSearching ? new Set<string>() : collapsedGroups
  const rows = flattenRows(filteredConnections, visibleCollapsedGroups)
  const clampedIndex = Math.max(0, Math.min(selectedIndex, rows.length - 1))
  const selectedRow = rows[clampedIndex] ?? null
  const selected = selectedRow?.type === 'connection' ? (selectedRow.connection ?? null) : null
  const credential = selected
    ? (credentials.find((c) => c.id === selected.credentialId) ?? null)
    : null

  function endSearch(keepQuery: boolean) {
    const nextQuery = keepQuery ? searchQuery : ''
    if (!keepQuery) setSearchQuery('')
    const nextRows = flattenRows(
      connections.filter((c) => matchesQuery(c, nextQuery)),
      nextQuery.trim() ? new Set<string>() : collapsedGroups,
    )
    const firstConnectionIndex = nextRows.findIndex((r) => r.type === 'connection')
    setSelectedIndex(Math.max(0, firstConnectionIndex))
  }

  function toggleGroupCollapsed(group: string) {
    const collapsing = !collapsedGroups.has(group)
    const nextCollapsedGroups = new Set(collapsedGroups)
    if (collapsing) {
      nextCollapsedGroups.add(group)
    } else {
      nextCollapsedGroups.delete(group)
    }

    if (collapsing && !isSearching && selectedRow?.type === 'connection') {
      const nextRows = flattenRows(filteredConnections, nextCollapsedGroups)
      const headerIndex = nextRows.findIndex((r) => r.key === `group:${group}`)
      setSelectedIndex(Math.max(0, headerIndex))
    }

    setCollapsedGroups(nextCollapsedGroups)
  }

  async function applyPassword(
    credentialId: string,
    values: ConnectionFormValues,
    previousHasPassword: boolean,
  ): Promise<{ hasPassword: boolean; statusSuffix: string }> {
    if (!values.passwordTouched) {
      return { hasPassword: previousHasPassword, statusSuffix: '' }
    }
    try {
      if (values.password) {
        await setPassword(credentialId, values.password)
        return { hasPassword: true, statusSuffix: '' }
      }
      await deletePassword(credentialId)
      return { hasPassword: false, statusSuffix: '' }
    } catch (err) {
      return {
        hasPassword: previousHasPassword,
        statusSuffix: `, but failed to ${
          values.password ? 'store' : 'remove'
        } password: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  async function applyFormValues(values: ConnectionFormValues, isEditing: boolean) {
    if (isEditing && selected) {
      const isNewCredential = !selected.credentialId
      const credentialId =
        selected.credentialId ||
        (values.username || (values.passwordTouched && values.password)
          ? nextId('cred', credentials)
          : undefined)
      const previousHasPassword =
        (credentialId && credentials.find((c) => c.id === credentialId)?.hasPassword) || false
      const { hasPassword, statusSuffix } = credentialId
        ? await applyPassword(credentialId, values, previousHasPassword)
        : { hasPassword: false, statusSuffix: '' }
      if (credentialId && isNewCredential) {
        setCredentials((prev) => [
          ...prev,
          {
            id: credentialId,
            username: values.username,
            hasPassword: hasPassword || undefined,
            createdAt: new Date().toISOString(),
          },
        ])
      } else if (credentialId) {
        setCredentials((prev) =>
          prev.map((c) =>
            c.id === credentialId
              ? {
                  ...c,
                  username: values.username,
                  hasPassword: hasPassword || undefined,
                  modifiedAt: new Date().toISOString(),
                }
              : c,
          ),
        )
      }
      setConnections((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                ...buildConnectionFields(values),
                credentialId,
                modifiedAt: new Date().toISOString(),
              }
            : c,
        ),
      )
      setStatusMessage(`Updated ${values.name}${statusSuffix}`)
    } else {
      const credentialId = nextId('cred', credentials)
      const connectionId = nextId('conn', connections)
      const { hasPassword, statusSuffix } =
        values.passwordTouched && values.password
          ? await applyPassword(credentialId, values, false)
          : { hasPassword: false, statusSuffix: '' }
      setCredentials((prev) => [
        ...prev,
        {
          id: credentialId,
          username: values.username,
          hasPassword: hasPassword || undefined,
          createdAt: new Date().toISOString(),
        },
      ])
      setConnections((prev) => [
        ...prev,
        {
          id: connectionId,
          ...buildConnectionFields(values),
          credentialId,
          createdAt: new Date().toISOString(),
        },
      ])
      setStatusMessage(`Added ${values.name}${statusSuffix}`)
    }
  }

  function importSshHosts(hosts: SshConfigHost[]) {
    const existingNames = new Set(connections.map((c) => c.name.toLowerCase()))
    const newConnections: ConnectionModel[] = []
    const newCredentials: CredentialModel[] = []
    const now = new Date().toISOString()
    for (const host of hosts) {
      if (existingNames.has(host.alias.toLowerCase())) continue
      existingNames.add(host.alias.toLowerCase())
      let credentialId: string | undefined
      if (host.user) {
        credentialId = nextId('cred', [...credentials, ...newCredentials])
        newCredentials.push({
          id: credentialId,
          username: host.user,
          createdAt: now,
        })
      }
      newConnections.push({
        id: nextId('conn', [...connections, ...newConnections]),
        name: host.alias,
        hostname: host.alias,
        port: host.port,
        protocol: SSH,
        identityFile: host.identityFile,
        credentialId,
        createdAt: now,
      })
    }
    if (newConnections.length === 0) {
      setStatusMessage(`No new hosts to import from ${SSH_CONFIG_DISPLAY_PATH}`)
      return
    }
    setConnections((prev) => [...prev, ...newConnections])
    if (newCredentials.length > 0) {
      setCredentials((prev) => [...prev, ...newCredentials])
    }
    const skipped = hosts.length - newConnections.length
    setStatusMessage(
      `Imported ${newConnections.length} host${
        newConnections.length === 1 ? '' : 's'
      } from ${SSH_CONFIG_DISPLAY_PATH}${skipped > 0 ? ` (${skipped} already present)` : ''}`,
    )
  }

  function deleteSelected() {
    if (!selected) return
    const name = selected.name
    const credentialId = selected.credentialId
    setConnections((prev) => prev.filter((c) => c.id !== selected.id))
    if (credentialId) {
      const stillUsed = connections.some(
        (c) => c.id !== selected.id && c.credentialId === credentialId,
      )
      if (!stillUsed) {
        setCredentials((prev) => prev.filter((c) => c.id !== credentialId))
        void deletePassword(credentialId).catch(() => {})
      }
    }
    setStatusMessage(`Deleted ${name}`)
  }

  return {
    connections,
    credentials,
    recordConnectionResult,
    searchQuery,
    setSearchQuery,
    endSearch,
    selectedIndex,
    setSelectedIndex,
    clampedIndex,
    filteredConnections,
    rows,
    selectedRow,
    selected,
    credential,
    collapsedGroups,
    visibleCollapsedGroups,
    toggleGroupCollapsed,
    statusMessage,
    setStatusMessage,
    applyFormValues,
    importSshHosts,
    deleteSelected,
  }
}
