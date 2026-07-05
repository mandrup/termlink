import { render } from 'ink'
import { App } from '@/App'
import { runInteractive } from '@/lib/pty'
import { loadState, saveState } from '@/lib/storage'

async function main() {
  const { state, error } = await loadState()

  render(
    <App
      initialConnections={state.connections}
      initialCredentials={state.credentials}
      initialStatusMessage={error}
      saveState={saveState}
      runCommand={runInteractive}
    />,
  )
}

void main()
