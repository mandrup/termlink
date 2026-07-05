import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { ConnectionList, flattenRows } from '@/components/ConnectionList'
import type { ConnectionModel } from '@/models/connection'
import { SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Bastion Host',
    hostname: 'bastion.internal.local',
    protocol: SSH,
    ...overrides,
  }
}

describe('flattenRows', () => {
  it('groups connections under their group header, defaulting to Ungrouped', () => {
    const rows = flattenRows(
      [
        connection({ id: 'conn-1', group: 'Infra' }),
        connection({ id: 'conn-2', group: undefined }),
      ],
      new Set(),
    )
    expect(rows.map((r) => r.key)).toEqual([
      'group:Infra',
      'connection:conn-1',
      'group:Ungrouped',
      'connection:conn-2',
    ])
  })

  it("omits a group's connection rows while it is collapsed", () => {
    const rows = flattenRows([connection({ id: 'conn-1', group: 'Infra' })], new Set(['Infra']))
    expect(rows).toEqual([
      {
        type: 'group',
        key: 'group:Infra',
        label: '▸ Infra (1)',
        group: 'Infra',
      },
    ])
  })

  it('counts every connection in the group header regardless of collapse state', () => {
    const rows = flattenRows(
      [connection({ id: 'conn-1', group: 'Infra' }), connection({ id: 'conn-2', group: 'Infra' })],
      new Set(['Infra']),
    )
    expect(rows[0].label).toBe('▸ Infra (2)')
  })
})

describe('ConnectionList', () => {
  it('shows an empty state distinguishing no connections from no matches', () => {
    const none = render(
      <ConnectionList
        connections={[]}
        selectedKey={null}
        hasAnyConnections={false}
        collapsedGroups={new Set()}
      />,
    )
    expect(none.lastFrame()).toContain('No connections yet')

    const noMatches = render(
      <ConnectionList
        connections={[]}
        selectedKey={null}
        hasAnyConnections={true}
        collapsedGroups={new Set()}
      />,
    )
    expect(noMatches.lastFrame()).toContain('No connections match')
  })

  it('renders a group header and its connections', () => {
    const { lastFrame } = render(
      <ConnectionList
        connections={[connection({ group: 'Infra' })]}
        selectedKey={null}
        hasAnyConnections={true}
        collapsedGroups={new Set()}
      />,
    )
    expect(lastFrame()).toContain('Infra (1)')
    expect(lastFrame()).toContain('Bastion Host')
  })

  it('hides connections under a collapsed group', () => {
    const { lastFrame } = render(
      <ConnectionList
        connections={[connection({ group: 'Infra' })]}
        selectedKey={null}
        hasAnyConnections={true}
        collapsedGroups={new Set(['Infra'])}
      />,
    )
    expect(lastFrame()).toContain('Infra (1)')
    expect(lastFrame()).not.toContain('Bastion Host')
  })

  it('renders reachability as a filled dot once a probe resolves', () => {
    const up = render(
      <ConnectionList
        connections={[connection()]}
        selectedKey={null}
        hasAnyConnections={true}
        collapsedGroups={new Set()}
        reachability={new Map([['conn-1', 'up']])}
      />,
    )
    expect(up.lastFrame()).toContain('●')

    const unknown = render(
      <ConnectionList
        connections={[connection()]}
        selectedKey={null}
        hasAnyConnections={true}
        collapsedGroups={new Set()}
      />,
    )
    expect(unknown.lastFrame()).toContain('○')
  })
})
