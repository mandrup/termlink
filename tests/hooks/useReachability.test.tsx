import { Text, useInput } from 'ink'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { useReachability } from '@/hooks/useReachability'
import type { SshExecResult } from '@/lib/ssh/sshExec'
import type { ConnectionModel, CredentialModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Test',
    hostname: 'example.com',
    protocol: SSH,
    ...overrides,
  }
}

function Harness({
  connections,
  credentials = [],
  probe,
}: {
  connections: ConnectionModel[]
  credentials?: CredentialModel[]
  probe: (connection: ConnectionModel, credential: CredentialModel | null) => Promise<SshExecResult>
}) {
  const { statuses, refresh } = useReachability({
    connections,
    credentials,
    probe,
  })
  useInput((input) => {
    if (input === 'r') void refresh()
  })
  return (
    <Text>{connections.map((c) => `${c.id}:${statuses.get(c.id) ?? 'unknown'}`).join(' ')}</Text>
  )
}

async function tick(ms = 10) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const ok: SshExecResult = { stdout: '', stderr: '', code: 0 }
const fail: SshExecResult = { stdout: '', stderr: '', code: 1 }

describe('useReachability', () => {
  it('probes ssh connections on mount and reports up/down', async () => {
    const probe = vi.fn(async (connection: ConnectionModel) =>
      connection.id === 'conn-1' ? ok : fail,
    )
    const { lastFrame } = render(
      <Harness
        connections={[connection({ id: 'conn-1' }), connection({ id: 'conn-2' })]}
        probe={probe}
      />,
    )
    await tick()
    expect(lastFrame()).toBe('conn-1:up conn-2:down')
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('never probes rdp connections', async () => {
    const probe = vi.fn(async () => ok)
    const { lastFrame } = render(
      <Harness connections={[connection({ protocol: RDP })]} probe={probe} />,
    )
    await tick()
    expect(probe).not.toHaveBeenCalled()
    expect(lastFrame()).toBe('conn-1:unknown')
  })

  it('passes the connection credential to the probe', async () => {
    const probe = vi.fn(async () => ok)
    const credential: CredentialModel = { id: 'cred-1', username: 'alice' }
    render(
      <Harness
        connections={[connection({ credentialId: 'cred-1' })]}
        credentials={[credential]}
        probe={probe}
      />,
    )
    await tick()
    expect(probe).toHaveBeenCalledWith(expect.anything(), credential)
  })

  it('re-probes on manual refresh, showing checking in between', async () => {
    let resolveSecond: (() => void) | undefined
    const probe = vi
      .fn()
      .mockResolvedValueOnce(ok)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = () => resolve(fail)
          }),
      )
    const { stdin, lastFrame } = render(<Harness connections={[connection()]} probe={probe} />)
    await tick()
    expect(lastFrame()).toBe('conn-1:up')
    stdin.write('r')
    await tick()
    expect(lastFrame()).toBe('conn-1:checking')
    resolveSecond?.()
    await tick()
    expect(lastFrame()).toBe('conn-1:down')
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('probes a newly added connection without re-probing existing ones', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender, lastFrame } = render(
      <Harness connections={[connection({ id: 'conn-1' })]} probe={probe} />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(
      <Harness
        connections={[connection({ id: 'conn-1' }), connection({ id: 'conn-2' })]}
        probe={probe}
      />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(2)
    expect(lastFrame()).toBe('conn-1:up conn-2:up')
  })

  it('re-probes an existing connection when its hostname changes', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender } = render(
      <Harness connections={[connection({ hostname: 'old.example' })]} probe={probe} />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(<Harness connections={[connection({ hostname: 'new.example' })]} probe={probe} />)
    await tick()
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('re-probes when port, identity file, or extra args change', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender } = render(<Harness connections={[connection({ port: 22 })]} probe={probe} />)
    await tick()
    rerender(<Harness connections={[connection({ port: 2222 })]} probe={probe} />)
    await tick()
    rerender(
      <Harness
        connections={[connection({ port: 2222, identityFile: '~/.ssh/id_ed25519' })]}
        probe={probe}
      />,
    )
    await tick()
    rerender(
      <Harness
        connections={[
          connection({
            port: 2222,
            identityFile: '~/.ssh/id_ed25519',
            extraArgs: '-J bastion.example.com',
          }),
        ]}
        probe={probe}
      />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(4)
  })

  it('re-probes when the linked credential username changes', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender } = render(
      <Harness
        connections={[connection({ credentialId: 'cred-1' })]}
        credentials={[{ id: 'cred-1', username: 'alice' }]}
        probe={probe}
      />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(
      <Harness
        connections={[connection({ credentialId: 'cred-1' })]}
        credentials={[{ id: 'cred-1', username: 'bob' }]}
        probe={probe}
      />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('does not re-probe when an unrelated field like name changes', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender } = render(
      <Harness connections={[connection({ name: 'Old Name' })]} probe={probe} />,
    )
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(<Harness connections={[connection({ name: 'New Name' })]} probe={probe} />)
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('treats a connection edited back to its previous SSH config as unseen after a protocol detour', async () => {
    const probe = vi.fn(async () => ok)
    const { rerender } = render(<Harness connections={[connection()]} probe={probe} />)
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(<Harness connections={[connection({ protocol: RDP })]} probe={probe} />)
    await tick()
    expect(probe).toHaveBeenCalledTimes(1)
    rerender(<Harness connections={[connection()]} probe={probe} />)
    await tick()
    expect(probe).toHaveBeenCalledTimes(2)
  })
})
