import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { DetailPanel } from '@/components/DetailPanel'
import type { ConnectionModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Bastion Host',
    hostname: 'bastion.internal.local',
    protocol: SSH,
    ...overrides,
  }
}

function lineCount(frame: string): number {
  return frame.split('\n').length
}

describe('DetailPanel', () => {
  it('renders the same height with no connection selected as with one selected', () => {
    const empty = render(<DetailPanel connection={null} credential={null} />)
    const filled = render(<DetailPanel connection={connection()} credential={null} />)
    expect(lineCount(empty.lastFrame() ?? '')).toBe(lineCount(filled.lastFrame() ?? ''))
  })

  it('renders the same height for ssh and rdp connections', () => {
    const ssh = render(<DetailPanel connection={connection()} credential={null} />)
    const rdp = render(<DetailPanel connection={connection({ protocol: RDP })} credential={null} />)
    expect(lineCount(ssh.lastFrame() ?? '')).toBe(lineCount(rdp.lastFrame() ?? ''))
  })

  it('shows extra ssh args when set, and omits the row otherwise', () => {
    const empty = render(<DetailPanel connection={connection()} credential={null} />)
    expect(empty.lastFrame()).not.toContain('Extra Args')

    const withExtraArgs = render(
      <DetailPanel
        connection={connection({ extraArgs: '-J bastion.example.com' })}
        credential={null}
      />,
    )
    expect(withExtraArgs.lastFrame()).toContain('Extra Args')
    expect(withExtraArgs.lastFrame()).toContain('-J bastion.example.com')
    expect(lineCount(withExtraArgs.lastFrame() ?? '')).toBe(lineCount(empty.lastFrame() ?? ''))
  })

  it('hides the notes column when there are no notes, and shows it when set', () => {
    const empty = render(<DetailPanel connection={connection()} credential={null} />)
    expect(empty.lastFrame()).not.toContain('Notes')

    const withNotes = render(
      <DetailPanel connection={connection({ notes: 'Needs a reboot' })} credential={null} />,
    )
    expect(withNotes.lastFrame()).toContain('Notes')
    expect(withNotes.lastFrame()).toContain('Needs a reboot')
  })

  it('renders the same height with long notes as with none', () => {
    const empty = render(<DetailPanel connection={connection()} credential={null} />)
    const long = render(
      <DetailPanel
        connection={connection({
          notes: 'x'.repeat(500),
        })}
        credential={null}
      />,
    )
    expect(lineCount(long.lastFrame() ?? '')).toBe(lineCount(empty.lastFrame() ?? ''))
  })
})
