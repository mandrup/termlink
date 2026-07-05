import { Text, useInput } from 'ink'
import { render } from 'ink-testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionFormValues } from '@/lib/connections/connectionForm'
import { useConnectionsStore } from '@/hooks/useConnectionsStore'
import type { SshConfigHost } from '@/lib/ssh/sshConfig'
import { deletePassword, setPassword } from '@/lib/keychain'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

vi.mock('@/lib/keychain', () => ({
  setPassword: vi.fn().mockResolvedValue(undefined),
  deletePassword: vi.fn().mockResolvedValue(undefined),
}))

function Harness({
  initialConnections,
  initialCredentials,
  formValues,
}: {
  initialConnections: ConnectionModel[]
  initialCredentials: CredentialModel[]
  formValues: ConnectionFormValues
}) {
  const store = useConnectionsStore({
    initialConnections,
    initialCredentials,
    saveState: vi.fn().mockResolvedValue(undefined),
  })
  useInput((input) => {
    if (input === 'e') store.applyFormValues(formValues, true)
  })
  return (
    <Text>
      {store.connections.map((c) => `${c.id}->${c.credentialId ?? 'none'}`).join(' ')}
      {' | '}
      {store.credentials
        .map((c) => `${c.id}:${c.username}${c.hasPassword ? '(pw)' : ''}`)
        .join(' ') || '(no credentials)'}
    </Text>
  )
}

async function press(stdin: { write: (data: string) => void }, input: string) {
  stdin.write(input)
  await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('useConnectionsStore applyFormValues (edit)', () => {
  const formValues: ConnectionFormValues = {
    name: 'Box',
    hostname: 'box.internal',
    port: '',
    protocol: SSH,
    group: '',
    username: 'alice',
    password: '',
    passwordTouched: false,
    identityFile: '',
    extraArgs: '',
    mcpEnabled: false,
    mcpAllowedCommands: '',
    notes: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and attaches a credential when editing a connection without one', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: SSH,
          },
        ]}
        initialCredentials={[]}
        formValues={formValues}
      />,
    )
    expect(lastFrame()).toContain('conn-1->none')
    await press(stdin, 'e')
    expect(lastFrame()).toContain('conn-1->cred-1')
    expect(lastFrame()).toContain('cred-1:alice')
  })

  it('updates the existing credential when the connection has one', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: SSH,
            credentialId: 'cred-7',
          },
        ]}
        initialCredentials={[{ id: 'cred-7', username: 'bob' }]}
        formValues={formValues}
      />,
    )
    await press(stdin, 'e')
    expect(lastFrame()).toContain('conn-1->cred-7')
    expect(lastFrame()).toContain('cred-7:alice')
    expect(lastFrame()).not.toContain('cred-1')
  })

  it('does not create an empty credential when no username is entered', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: SSH,
          },
        ]}
        initialCredentials={[]}
        formValues={{ ...formValues, username: '' }}
      />,
    )
    await press(stdin, 'e')
    expect(lastFrame()).toContain('conn-1->none')
    expect(lastFrame()).toContain('(no credentials)')
  })

  it('stores a touched password in the keychain and flags the credential', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: RDP,
            credentialId: 'cred-7',
          },
        ]}
        initialCredentials={[{ id: 'cred-7', username: 'bob' }]}
        formValues={{
          ...formValues,
          protocol: RDP,
          password: 'hunter2',
          passwordTouched: true,
        }}
      />,
    )
    await press(stdin, 'e')
    expect(setPassword).toHaveBeenCalledWith('cred-7', 'hunter2')
    expect(lastFrame()).toContain('cred-7:alice(pw)')
  })

  it('removes the stored password when the field is cleared', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: RDP,
            credentialId: 'cred-7',
          },
        ]}
        initialCredentials={[{ id: 'cred-7', username: 'bob', hasPassword: true }]}
        formValues={{
          ...formValues,
          protocol: RDP,
          password: '',
          passwordTouched: true,
        }}
      />,
    )
    await press(stdin, 'e')
    expect(deletePassword).toHaveBeenCalledWith('cred-7')
    expect(lastFrame()).toContain('cred-7:alice')
    expect(lastFrame()).not.toContain('(pw)')
  })

  it('leaves the stored password alone when the field was never touched', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: RDP,
            credentialId: 'cred-7',
          },
        ]}
        initialCredentials={[{ id: 'cred-7', username: 'bob', hasPassword: true }]}
        formValues={{ ...formValues, protocol: RDP }}
      />,
    )
    await press(stdin, 'e')
    expect(setPassword).not.toHaveBeenCalled()
    expect(deletePassword).not.toHaveBeenCalled()
    expect(lastFrame()).toContain('cred-7:alice(pw)')
  })

  it('creates a credential when only a password is entered', async () => {
    const { stdin, lastFrame } = render(
      <Harness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Box',
            hostname: 'box.internal',
            protocol: RDP,
          },
        ]}
        initialCredentials={[]}
        formValues={{
          ...formValues,
          protocol: RDP,
          username: '',
          password: 'hunter2',
          passwordTouched: true,
        }}
      />,
    )
    await press(stdin, 'e')
    expect(setPassword).toHaveBeenCalledWith('cred-1', 'hunter2')
    expect(lastFrame()).toContain('conn-1->cred-1')
    expect(lastFrame()).toContain('cred-1:(pw)')
  })
})

function ImportHarness({
  initialConnections,
  initialCredentials,
  hosts,
}: {
  initialConnections: ConnectionModel[]
  initialCredentials: CredentialModel[]
  hosts: SshConfigHost[]
}) {
  const store = useConnectionsStore({
    initialConnections,
    initialCredentials,
    saveState: vi.fn().mockResolvedValue(undefined),
  })
  useInput((input) => {
    if (input === 'i') store.importSshHosts(hosts)
  })
  return (
    <Text>
      {store.connections
        .map((c) => `${c.name}@${c.hostname}:${c.port ?? 'default'}->${c.credentialId ?? 'none'}`)
        .join(' ')}
      {' | '}
      {store.credentials.map((c) => `${c.id}:${c.username}`).join(' ') || '(no credentials)'}
      {' | '}
      {store.statusMessage ?? ''}
    </Text>
  )
}

describe('useConnectionsStore importSshHosts', () => {
  it('imports hosts as SSH connections, using the alias as hostname', async () => {
    const { stdin, lastFrame } = render(
      <ImportHarness
        initialConnections={[]}
        initialCredentials={[]}
        hosts={[{ alias: 'web1', port: 2222, user: 'deploy' }, { alias: 'db1' }]}
      />,
    )
    await press(stdin, 'i')
    expect(lastFrame()).toContain('web1@web1:2222->cred-1')
    expect(lastFrame()).toContain('db1@db1:default->none')
    expect(lastFrame()).toContain('cred-1:deploy')
    expect(lastFrame()).toContain('Imported 2 hosts from ~/.ssh/config')
  })

  it('skips aliases that already exist by name, case-insensitively', async () => {
    const { stdin, lastFrame } = render(
      <ImportHarness
        initialConnections={[
          {
            id: 'conn-1',
            name: 'Web1',
            hostname: 'old.example',
            protocol: SSH,
          },
        ]}
        initialCredentials={[]}
        hosts={[{ alias: 'web1' }, { alias: 'db1' }]}
      />,
    )
    await press(stdin, 'i')
    expect(lastFrame()).toContain('Web1@old.example')
    expect(lastFrame()).not.toContain('web1@web1')
    expect(lastFrame()).toContain('Imported 1 host from')
    expect(lastFrame()).toContain('(1 already present)')
  })

  it('reports when there is nothing new to import and changes nothing', async () => {
    const { stdin, lastFrame } = render(
      <ImportHarness
        initialConnections={[{ id: 'conn-1', name: 'web1', hostname: 'web1', protocol: SSH }]}
        initialCredentials={[]}
        hosts={[{ alias: 'web1' }]}
      />,
    )
    await press(stdin, 'i')
    expect(lastFrame()).toContain('No new hosts to import from ~/.ssh/config')
    expect(lastFrame()).toContain('(no credentials)')
  })
})
