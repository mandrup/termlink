import { describe, expect, it } from 'vitest'
import type { ConnectionFormValues } from '@/lib/connections/connectionForm'
import {
  buildConnectionFields,
  buildMcpConfig,
  matchesQuery,
  moveConnectionWithinGroup,
  moveGroup,
  nextId,
  parsePort,
} from '@/lib/connections/connections'
import type { ConnectionModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

function connection(overrides: Partial<ConnectionModel> = {}): ConnectionModel {
  return {
    id: 'conn-1',
    name: 'Bastion Host',
    hostname: 'bastion.internal.local',
    protocol: SSH,
    group: 'Infra',
    ...overrides,
  }
}

describe('matchesQuery', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesQuery(connection(), '')).toBe(true)
    expect(matchesQuery(connection(), '   ')).toBe(true)
  })

  it('matches case-insensitively on name, hostname, or group', () => {
    expect(matchesQuery(connection(), 'bastion')).toBe(true)
    expect(matchesQuery(connection(), 'INTERNAL')).toBe(true)
    expect(matchesQuery(connection(), 'infra')).toBe(true)
  })

  it('does not match an unrelated query', () => {
    expect(matchesQuery(connection(), 'nas')).toBe(false)
  })

  it('fuzzy-matches non-contiguous characters, not just substrings', () => {
    expect(matchesQuery(connection(), 'binl')).toBe(true)
  })

  it('treats a missing group as non-matching rather than throwing', () => {
    expect(matchesQuery(connection({ group: undefined }), 'infra')).toBe(false)
  })
})

describe('nextId', () => {
  it('starts at prefix-1 for an empty list', () => {
    expect(nextId('conn', [])).toBe('conn-1')
  })

  it('continues past the highest existing count, not just the highest id', () => {
    expect(nextId('conn', [{ id: 'conn-1' }, { id: 'conn-2' }])).toBe('conn-3')
  })

  it('skips ids that are already taken even if out of order', () => {
    expect(nextId('conn', [{ id: 'conn-2' }, { id: 'conn-1' }, { id: 'conn-3' }])).toBe('conn-4')
  })
})

function formValues(overrides: Partial<ConnectionFormValues> = {}): ConnectionFormValues {
  return {
    name: 'Box',
    hostname: 'box.internal',
    port: '2222',
    protocol: SSH,
    group: 'Servers',
    username: 'alice',
    password: '',
    passwordTouched: false,
    identityFile: '~/.ssh/id_ed25519',
    extraArgs: '-J bastion.example.com',
    mcpEnabled: false,
    mcpAllowedCommands: '',
    notes: 'some notes',
    ...overrides,
  }
}

describe('parsePort', () => {
  it('parses a whole-number string', () => {
    expect(parsePort('2222')).toBe(2222)
  })

  it('treats blank input as unset', () => {
    expect(parsePort('')).toBeUndefined()
    expect(parsePort('   ')).toBeUndefined()
  })
})

describe('buildMcpConfig', () => {
  it('is unset for RDP connections regardless of the form values', () => {
    expect(buildMcpConfig(formValues({ protocol: RDP, mcpEnabled: true }))).toBeUndefined()
  })

  it('is unset for SSH when disabled with no allow-list', () => {
    expect(
      buildMcpConfig(formValues({ mcpEnabled: false, mcpAllowedCommands: '' })),
    ).toBeUndefined()
  })

  it('splits and trims a comma-separated allow-list', () => {
    expect(
      buildMcpConfig(
        formValues({
          mcpEnabled: true,
          mcpAllowedCommands: 'uptime, systemctl status *,  ',
        }),
      ),
    ).toEqual({
      enabled: true,
      allowedCommands: ['uptime', 'systemctl status *'],
    })
  })
})

describe('moveConnectionWithinGroup', () => {
  const connections = [
    connection({ id: 'a', group: 'Infra' }),
    connection({ id: 'b', group: 'Web' }),
    connection({ id: 'c', group: 'Infra' }),
    connection({ id: 'd', group: 'Infra' }),
  ]

  it('swaps with the previous member of the same group, ignoring other groups in between', () => {
    const result = moveConnectionWithinGroup(connections, 'c', 'up')
    expect(result.map((c) => c.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('swaps with the next member of the same group', () => {
    const result = moveConnectionWithinGroup(connections, 'c', 'down')
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'd', 'c'])
  })

  it('is a no-op at the top of the group', () => {
    expect(moveConnectionWithinGroup(connections, 'a', 'up')).toBe(connections)
  })

  it('is a no-op at the bottom of the group', () => {
    expect(moveConnectionWithinGroup(connections, 'd', 'down')).toBe(connections)
  })

  it('is a no-op for an unknown id', () => {
    expect(moveConnectionWithinGroup(connections, 'missing', 'up')).toBe(connections)
  })

  it('treats a missing group as its own "Ungrouped" group', () => {
    const withUngrouped = [
      connection({ id: 'a', group: undefined }),
      connection({ id: 'b', group: undefined }),
    ]
    expect(moveConnectionWithinGroup(withUngrouped, 'b', 'up').map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('moveGroup', () => {
  const connections = [
    connection({ id: 'a', group: 'Infra' }),
    connection({ id: 'b', group: 'Web' }),
    connection({ id: 'c', group: 'Infra' }),
    connection({ id: 'd', group: 'Db' }),
  ]

  it('moves every member of the group as a block, preserving relative order within each group', () => {
    const result = moveGroup(connections, 'Web', 'up')
    expect(result.map((c) => c.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('moves a group down past the next group', () => {
    const result = moveGroup(connections, 'Infra', 'down')
    expect(result.map((c) => c.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('is a no-op at the top', () => {
    expect(moveGroup(connections, 'Infra', 'up')).toBe(connections)
  })

  it('is a no-op at the bottom', () => {
    expect(moveGroup(connections, 'Db', 'down')).toBe(connections)
  })

  it('is a no-op for an unknown group', () => {
    expect(moveGroup(connections, 'Missing', 'up')).toBe(connections)
  })
})

describe('buildConnectionFields', () => {
  it('carries over identityFile and extraArgs for SSH', () => {
    const fields = buildConnectionFields(formValues())
    expect(fields.identityFile).toBe('~/.ssh/id_ed25519')
    expect(fields.extraArgs).toBe('-J bastion.example.com')
    expect(fields.port).toBe(2222)
  })

  it('drops identityFile and extraArgs for RDP', () => {
    const fields = buildConnectionFields(
      formValues({
        protocol: RDP,
        identityFile: '~/.ssh/id_ed25519',
        extraArgs: '-J bastion.example.com',
      }),
    )
    expect(fields.identityFile).toBeUndefined()
    expect(fields.extraArgs).toBeUndefined()
  })

  it('turns blank group and notes into undefined', () => {
    const fields = buildConnectionFields(formValues({ group: '', notes: '' }))
    expect(fields.group).toBeUndefined()
    expect(fields.notes).toBeUndefined()
  })
})
