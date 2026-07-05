import { useState } from 'react'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import { ConnectionList } from '@/components/ConnectionList'
import { DetailPanel } from '@/components/DetailPanel'
import { StatusBar } from '@/components/StatusBar'
import { HelpScreen } from '@/components/HelpScreen'
import { ConnectionForm } from '@/components/ConnectionForm'
import ConfirmDialog from '@/components/ConfirmDialog'
import { computeListLayout } from '@/lib/viewport'
import { loadSshConfigHosts, SSH_CONFIG_DISPLAY_PATH } from '@/lib/ssh/sshConfig'
import { resolveKeyActions, type Mode } from '@/lib/keybindings'
import type { ConnectionFormValues } from '@/lib/connections/connectionForm'
import { ACCENT_COLOR } from '@/constants'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import type { RunResult } from '@/lib/pty'
import type { PersistedState } from '@/lib/storage'
import { useConnectionsStore } from '@/hooks/useConnectionsStore'
import { useConnect } from '@/hooks/useConnect'
import { useReachability } from '@/hooks/useReachability'

export function App({
  initialConnections,
  initialCredentials,
  initialStatusMessage,
  saveState,
  runCommand,
}: {
  initialConnections: ConnectionModel[]
  initialCredentials: CredentialModel[]
  initialStatusMessage?: string
  saveState: (state: PersistedState) => Promise<void>
  runCommand: (command: string, args: string[]) => Promise<RunResult>
}) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [mode, setMode] = useState<Mode>('list')
  const [cloneSource, setCloneSource] = useState<ConnectionModel | null>(null)
  const { listWidth, nameWidth } = computeListLayout(stdout.columns || 80)

  const store = useConnectionsStore({
    initialConnections,
    initialCredentials,
    initialStatusMessage,
    saveState,
  })
  const { isConnectingRef, connect } = useConnect({
    runCommand,
    setStatusMessage: store.setStatusMessage,
    recordConnectionResult: store.recordConnectionResult,
  })
  const reachability = useReachability({
    connections: store.connections,
    credentials: store.credentials,
  })

  function applyFormValues(values: ConnectionFormValues) {
    void store.applyFormValues(values, mode === 'edit')
    setMode('list')
    setCloneSource(null)
  }

  function closeForm() {
    setMode('list')
    setCloneSource(null)
  }

  function deleteSelected() {
    store.deleteSelected()
    setMode('list')
  }

  async function importSshConfig() {
    try {
      const hosts = await loadSshConfigHosts()
      if (hosts.length === 0) {
        store.setStatusMessage(`No importable hosts found in ${SSH_CONFIG_DISPLAY_PATH}`)
        return
      }
      store.importSshHosts(hosts)
    } catch (err) {
      store.setStatusMessage(
        `Failed to read ${SSH_CONFIG_DISPLAY_PATH}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  useInput((input, key) => {
    if (isConnectingRef.current) return

    const actions = resolveKeyActions({
      mode,
      input,
      key,
      rowsLength: store.rows.length,
      clampedIndex: store.clampedIndex,
      selectedRow: store.selectedRow,
      collapsedGroups: store.collapsedGroups,
    })

    for (const action of actions) {
      switch (action.type) {
        case 'exit':
          exit()
          break
        case 'setSelectedIndex':
          store.setSelectedIndex(action.index)
          store.setStatusMessage(undefined)
          break
        case 'connect':
          void connect(store.selected, store.credential)
          break
        case 'openAdd':
          setCloneSource(action.clone ? store.selected : null)
          setMode('add')
          store.setStatusMessage(undefined)
          break
        case 'openEdit':
          setMode('edit')
          store.setStatusMessage(undefined)
          break
        case 'openConfirmDelete':
          setMode('confirmDelete')
          store.setStatusMessage(undefined)
          break
        case 'openSearch':
          setMode('search')
          store.setStatusMessage(undefined)
          break
        case 'importSshConfig':
          store.setStatusMessage(undefined)
          void importSshConfig()
          break
        case 'openHelp':
          setMode('help')
          store.setStatusMessage(undefined)
          break
        case 'closeHelp':
          setMode('list')
          break
        case 'endSearch':
          store.endSearch(action.keepQuery)
          setMode('list')
          break
        case 'refreshReachability':
          void reachability.refresh()
          break
        case 'toggleGroup':
          store.toggleGroupCollapsed(action.group)
          break
      }
    }
  })

  const header = (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text backgroundColor="magenta" color="black" bold>
          {' termlink '}
        </Text>
        <Text dimColor> RDP / SSH connection manager</Text>
      </Box>
      <Text dimColor>
        {store.connections.length} {store.connections.length === 1 ? 'host' : 'hosts'}
      </Text>
    </Box>
  )

  if (mode === 'help') {
    return <HelpScreen header={header} />
  }

  if (mode === 'add' || mode === 'edit') {
    const title =
      mode === 'edit' ? 'Edit Connection' : cloneSource ? 'Clone Connection' : 'Add Connection'
    const initialConnection =
      mode === 'edit'
        ? store.selected
        : cloneSource
          ? { ...cloneSource, name: `${cloneSource.name} copy` }
          : null
    const initialUsername = mode === 'edit' || cloneSource ? (store.credential?.username ?? '') : ''
    const initialHasPassword = mode === 'edit' ? (store.credential?.hasPassword ?? false) : false

    return (
      <Box flexDirection="column">
        {header}
        <Box borderStyle="round" borderColor="gray">
          <ConnectionForm
            title={title}
            initialConnection={initialConnection}
            initialUsername={initialUsername}
            initialHasPassword={initialHasPassword}
            onSubmit={applyFormValues}
            onCancel={closeForm}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {header}
      <Box paddingX={1}>
        <Text
          bold
          color={mode === 'search' ? ACCENT_COLOR : undefined}
          dimColor={mode !== 'search'}
        >
          {'/ '}
        </Text>
        {mode === 'search' ? (
          <TextInput value={store.searchQuery} onChange={store.setSearchQuery} />
        ) : store.searchQuery ? (
          <Text color={ACCENT_COLOR}>{store.searchQuery}</Text>
        ) : (
          <Text dimColor>press / to filter · ? for help</Text>
        )}
        {store.searchQuery && (
          <Text dimColor>
            {' '}
            ({store.filteredConnections.length} match
            {store.filteredConnections.length === 1 ? '' : 'es'})
          </Text>
        )}
      </Box>
      <Box>
        <Box
          flexDirection="column"
          width={listWidth}
          paddingX={1}
          borderStyle="round"
          borderColor={mode === 'list' ? ACCENT_COLOR : 'gray'}
        >
          <ConnectionList
            connections={store.filteredConnections}
            selectedKey={store.selectedRow?.key ?? null}
            hasAnyConnections={store.connections.length > 0}
            collapsedGroups={store.visibleCollapsedGroups}
            searchQuery={store.searchQuery}
            nameWidth={nameWidth}
            reachability={reachability.statuses}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray">
          <DetailPanel connection={store.selected} credential={store.credential} />
        </Box>
      </Box>
      {mode === 'confirmDelete' && store.selected ? (
        <ConfirmDialog
          message={`Delete "${store.selected.name}"?`}
          onConfirm={deleteSelected}
          onCancel={() => setMode('list')}
        />
      ) : (
        <StatusBar message={store.statusMessage} />
      )}
    </Box>
  )
}
