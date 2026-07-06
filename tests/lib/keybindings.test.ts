import type { Key } from 'ink'
import { describe, expect, it } from 'vitest'
import type { FlatRow } from '@/components/ConnectionList'
import { resolveKeyActions } from '@/lib/keybindings'

function key(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
    ...overrides,
  }
}

const connectionRow: FlatRow = {
  type: 'connection',
  key: 'connection:conn-1',
  label: 'Box',
  connection: {
    id: 'conn-1',
    name: 'Box',
    hostname: 'box.internal',
    protocol: 'ssh',
    group: 'Servers',
  },
}

const groupRow: FlatRow = {
  type: 'group',
  key: 'group:Servers',
  label: '▾ Servers (1)',
  group: 'Servers',
}

const baseCtx = {
  rowsLength: 3,
  clampedIndex: 1,
  selectedRow: connectionRow as FlatRow | null,
  collapsedGroups: new Set<string>(),
}

describe('resolveKeyActions: search mode', () => {
  it('ends the search keeping the query on enter', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        mode: 'search',
        input: '',
        key: key({ return: true }),
      }),
    ).toEqual([{ type: 'endSearch', keepQuery: true }])
  })

  it('ends the search discarding the query on escape', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        mode: 'search',
        input: '',
        key: key({ escape: true }),
      }),
    ).toEqual([{ type: 'endSearch', keepQuery: false }])
  })

  it('produces no action for regular typing', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'search', input: 'a', key: key() })).toEqual([])
  })
})

describe('resolveKeyActions: help mode', () => {
  it('closes on any key', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'help', input: 'x', key: key() })).toEqual([
      { type: 'closeHelp' },
    ])
  })
})

describe('resolveKeyActions: non-list modes', () => {
  it('produces no action while adding or editing', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'add', input: 'a', key: key() })).toEqual([])
  })
})

describe('resolveKeyActions: list mode', () => {
  it('exits on q or escape', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'q', key: key() })).toEqual([
      { type: 'exit' },
    ])
    expect(
      resolveKeyActions({
        ...baseCtx,
        mode: 'list',
        input: '',
        key: key({ escape: true }),
      }),
    ).toEqual([{ type: 'exit' }])
  })

  it('moves selection down and clamps to the last row', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'j', key: key() })).toEqual([
      { type: 'setSelectedIndex', index: 2 },
    ])
    expect(
      resolveKeyActions({
        ...baseCtx,
        clampedIndex: 2,
        mode: 'list',
        input: '',
        key: key({ downArrow: true }),
      }),
    ).toEqual([{ type: 'setSelectedIndex', index: 2 }])
  })

  it('moves selection up and clamps to the first row', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        clampedIndex: 0,
        mode: 'list',
        input: 'k',
        key: key(),
      }),
    ).toEqual([{ type: 'setSelectedIndex', index: 0 }])
  })

  it('connects only when a connection row is selected', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        mode: 'list',
        input: '',
        key: key({ return: true }),
      }),
    ).toEqual([{ type: 'connect' }])
    expect(
      resolveKeyActions({
        ...baseCtx,
        selectedRow: groupRow,
        mode: 'list',
        input: '',
        key: key({ return: true }),
      }),
    ).toEqual([])
  })

  it('opens the add form without cloning on "a"', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'a', key: key() })).toEqual([
      { type: 'openAdd', clone: false },
    ])
  })

  it('opens the add form cloning only when a connection is selected', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'c', key: key() })).toEqual([
      { type: 'openAdd', clone: true },
    ])
    expect(
      resolveKeyActions({
        ...baseCtx,
        selectedRow: groupRow,
        mode: 'list',
        input: 'c',
        key: key(),
      }),
    ).toEqual([])
  })

  it('opens edit and delete confirmation only when a connection is selected', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'e', key: key() })).toEqual([
      { type: 'openEdit' },
    ])
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'd', key: key() })).toEqual([
      { type: 'openConfirmDelete' },
    ])
    expect(
      resolveKeyActions({
        ...baseCtx,
        selectedRow: groupRow,
        mode: 'list',
        input: 'e',
        key: key(),
      }),
    ).toEqual([])
  })

  it('opens search, import, and help', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: '/', key: key() })).toEqual([
      { type: 'openSearch' },
    ])
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'i', key: key() })).toEqual([
      { type: 'importSshConfig' },
    ])
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: '?', key: key() })).toEqual([
      { type: 'openHelp' },
    ])
  })

  it('refreshes reachability on "r"', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'r', key: key() })).toEqual([
      { type: 'refreshReachability' },
    ])
  })

  it('moves the selection up or down on shift+K / shift+J', () => {
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'K', key: key() })).toEqual([
      { type: 'moveSelection', direction: 'up' },
    ])
    expect(resolveKeyActions({ ...baseCtx, mode: 'list', input: 'J', key: key() })).toEqual([
      { type: 'moveSelection', direction: 'down' },
    ])
  })

  it('does not move the selection when nothing is selected', () => {
    expect(
      resolveKeyActions({ ...baseCtx, selectedRow: null, mode: 'list', input: 'K', key: key() }),
    ).toEqual([])
  })

  it('moves a selected group row too, not just connections', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        selectedRow: groupRow,
        mode: 'list',
        input: 'J',
        key: key(),
      }),
    ).toEqual([{ type: 'moveSelection', direction: 'down' }])
  })

  it('collapses an expanded group with the left arrow', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        mode: 'list',
        input: '',
        key: key({ leftArrow: true }),
      }),
    ).toEqual([{ type: 'toggleGroup', group: 'Servers' }])
  })

  it('does not collapse an already-collapsed group with the left arrow', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        collapsedGroups: new Set(['Servers']),
        mode: 'list',
        input: '',
        key: key({ leftArrow: true }),
      }),
    ).toEqual([])
  })

  it('expands a collapsed group with the right arrow', () => {
    expect(
      resolveKeyActions({
        ...baseCtx,
        collapsedGroups: new Set(['Servers']),
        mode: 'list',
        input: '',
        key: key({ rightArrow: true }),
      }),
    ).toEqual([{ type: 'toggleGroup', group: 'Servers' }])
  })

  it('falls back to "Ungrouped" for connections without a group', () => {
    const ungroupedRow: FlatRow = {
      ...connectionRow,
      connection: { ...connectionRow.connection!, group: undefined },
    }
    expect(
      resolveKeyActions({
        ...baseCtx,
        selectedRow: ungroupedRow,
        mode: 'list',
        input: '',
        key: key({ leftArrow: true }),
      }),
    ).toEqual([{ type: 'toggleGroup', group: 'Ungrouped' }])
  })
})
