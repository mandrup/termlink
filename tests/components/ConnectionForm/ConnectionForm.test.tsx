import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { ConnectionForm } from '@/components/ConnectionForm'
import { validate, type ConnectionFormValues } from '@/lib/connections/connectionForm'
import type { ConnectionModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

function values(overrides: Partial<ConnectionFormValues> = {}): ConnectionFormValues {
  return {
    name: 'Web Server',
    hostname: 'web.internal',
    port: '',
    protocol: SSH,
    group: '',
    username: '',
    password: '',
    passwordTouched: false,
    identityFile: '',
    extraArgs: '',
    mcpEnabled: false,
    mcpAllowedCommands: '',
    notes: '',
    ...overrides,
  }
}

describe('validate', () => {
  it('accepts a filled-in form with an empty port', () => {
    expect(validate(values())).toBeNull()
  })

  it('accepts a numeric port in range', () => {
    expect(validate(values({ port: '2222' }))).toBeNull()
  })

  it('requires a name', () => {
    expect(validate(values({ name: '  ' }))).toMatch(/name/i)
  })

  it('requires a hostname', () => {
    expect(validate(values({ hostname: '' }))).toMatch(/hostname/i)
  })

  it('rejects a non-numeric port', () => {
    expect(validate(values({ port: 'abc' }))).toMatch(/port/i)
  })

  it('rejects an out-of-range port', () => {
    expect(validate(values({ port: '99999' }))).toMatch(/port/i)
    expect(validate(values({ port: '0' }))).toMatch(/port/i)
  })
})

describe('ConnectionForm', () => {
  const connection: ConnectionModel = {
    id: 'conn-1',
    name: 'Web Server',
    hostname: 'web.internal',
    port: 22,
    protocol: SSH,
    credentialId: 'cred-1',
  }

  const RIGHT_ARROW = '\u001B[C'
  const CTRL_S = '\u0013'

  async function press(stdin: { write: (data: string) => void }, input: string, times = 1) {
    for (let i = 0; i < times; i++) {
      stdin.write(input)
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  it('blocks submitting an empty form and shows the error', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, CTRL_S)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(lastFrame()).toContain('Name is required')
  })

  it('submits a valid pre-filled form with trimmed values', async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <ConnectionForm
        title="Edit Connection"
        initialConnection={connection}
        initialUsername="root"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Web Server',
        hostname: 'web.internal',
        port: '22',
        username: 'root',
      }),
    )
  })

  it('clears the error once the user edits a field again', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, CTRL_S)
    expect(lastFrame()).toContain('Name is required')
    await press(stdin, 'x')
    expect(lastFrame()).not.toContain('Name is required')
  })

  it('pre-fills a new connection with the ssh default port', () => {
    const { lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(lastFrame()).toContain('22')
  })

  it('switches the port to the rdp default when toggling protocol', async () => {
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    await press(stdin, '\t', 3)
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).toContain('3389')
  })

  it('leaves a manually-typed port alone when toggling protocol', async () => {
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    await press(stdin, '\t', 2)
    await press(stdin, '2222')
    await press(stdin, '\t')
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).toContain('2222')
  })

  it('inserts a newline in notes on enter instead of submitting', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, '\t', 10)
    await press(stdin, 'line one')
    await press(stdin, '\r')
    await press(stdin, 'line two')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(lastFrame()).toContain('line one')
    expect(lastFrame()).toContain('line two')
  })

  it('shows the password field only for rdp', async () => {
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(lastFrame()).not.toContain('Password')
    await press(stdin, '\t', 3)
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).toContain('Password')
  })

  it('shows the extra ssh args field only for ssh', async () => {
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(lastFrame()).toContain('Extra SSH Args')
    await press(stdin, '\t', 3)
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).not.toContain('Extra SSH Args')
  })

  it('submits extra ssh args, trimmed', async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, 'Box')
    await press(stdin, '\t')
    await press(stdin, 'box.internal')
    await press(stdin, '\t', 6)
    await press(stdin, '  -J bastion.example.com  ')
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ extraArgs: '-J bastion.example.com' }),
    )
  })

  it('shows the MCP fields only for ssh', async () => {
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(lastFrame()).toContain('MCP Access')
    expect(lastFrame()).toContain('Allowed Commands')
    await press(stdin, '\t', 3)
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).not.toContain('MCP Access')
    expect(lastFrame()).not.toContain('Allowed Commands')
  })

  it('toggles MCP access and submits the allowed commands untouched', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, 'Box')
    await press(stdin, '\t')
    await press(stdin, 'box.internal')
    await press(stdin, '\t', 7)
    expect(lastFrame()).toContain('Disabled')
    await press(stdin, RIGHT_ARROW)
    expect(lastFrame()).toContain('Enabled')
    await press(stdin, '\t')
    await press(stdin, 'df -h, systemctl status *')
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpEnabled: true,
        mcpAllowedCommands: 'df -h, systemctl status *',
      }),
    )
  })

  it('masks the typed password and submits it with passwordTouched', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, 'Box')
    await press(stdin, '\t')
    await press(stdin, 'box.internal')
    await press(stdin, '\t', 2)
    await press(stdin, RIGHT_ARROW)
    await press(stdin, '\t', 3)
    await press(stdin, 'hunter2')
    expect(lastFrame()).not.toContain('hunter2')
    expect(lastFrame()).toContain('•'.repeat('hunter2'.length))
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hunter2', passwordTouched: true }),
    )
  })

  it('leaves a stored password untouched when the field is never edited', async () => {
    const onSubmit = vi.fn()
    const { stdin, lastFrame } = render(
      <ConnectionForm
        title="Edit Connection"
        initialConnection={{ ...connection, protocol: RDP, port: 3389 }}
        initialUsername="root"
        initialHasPassword
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    expect(lastFrame()).toContain('(set)')
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ password: '', passwordTouched: false }),
    )
  })

  it('saves multi-line notes, trimmed, via ctrl+s', async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <ConnectionForm
        title="Add Connection"
        initialConnection={null}
        initialUsername=""
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    await press(stdin, '\t', 10)
    await press(stdin, 'line one')
    await press(stdin, '\r')
    await press(stdin, 'line two')
    await press(stdin, '\u001B[A', 10)
    await press(stdin, 'Box')
    await press(stdin, '\t')
    await press(stdin, 'box.internal')
    await press(stdin, CTRL_S)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ notes: 'line one\nline two' }))
  })
})
