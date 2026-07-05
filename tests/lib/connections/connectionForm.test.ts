import type { Key } from 'ink'
import { describe, expect, it } from 'vitest'
import {
  resolveFormKeyAction,
  toFormValues,
  toggleMcpEnabled,
  toggleProtocol,
  trimFormValues,
  visibleFields,
  type ConnectionFormValues,
} from '@/lib/connections/connectionForm'
import type { ConnectionModel } from '@/models/connection'
import { RDP, SSH } from '@/constants'

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

function formValues(overrides: Partial<ConnectionFormValues> = {}): ConnectionFormValues {
  return {
    name: 'Box',
    hostname: 'box.internal',
    port: '22',
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

describe('visibleFields', () => {
  it('shows identityFile, extraArgs, and MCP fields only for ssh', () => {
    expect(visibleFields(SSH)).toEqual([
      'name',
      'hostname',
      'port',
      'protocol',
      'group',
      'username',
      'identityFile',
      'extraArgs',
      'mcpEnabled',
      'mcpAllowedCommands',
      'notes',
    ])
  })

  it('shows password only for rdp', () => {
    expect(visibleFields(RDP)).toEqual([
      'name',
      'hostname',
      'port',
      'protocol',
      'group',
      'username',
      'password',
      'notes',
    ])
  })
})

describe('toFormValues', () => {
  it('defaults a new connection to ssh with the ssh default port', () => {
    expect(toFormValues(null, '')).toMatchObject({
      protocol: SSH,
      port: '22',
    })
  })

  it("carries over an existing connection's fields and the given username", () => {
    const connection: ConnectionModel = {
      id: 'conn-1',
      name: 'Box',
      hostname: 'box.internal',
      port: 2222,
      protocol: SSH,
      group: 'Infra',
      identityFile: '~/.ssh/id_ed25519',
      notes: 'hi',
    }
    expect(toFormValues(connection, 'alice')).toMatchObject({
      name: 'Box',
      hostname: 'box.internal',
      port: '2222',
      group: 'Infra',
      username: 'alice',
      identityFile: '~/.ssh/id_ed25519',
      notes: 'hi',
      password: '',
      passwordTouched: false,
    })
  })
})

describe('trimFormValues', () => {
  it('trims whitespace from every text field', () => {
    expect(
      trimFormValues(
        formValues({
          name: ' Box ',
          hostname: ' box.internal ',
          port: ' 22 ',
          group: ' Infra ',
          username: ' alice ',
          identityFile: ' ~/.ssh/id ',
          extraArgs: ' -J bastion ',
          mcpAllowedCommands: ' uptime ',
          notes: ' hi ',
        }),
      ),
    ).toMatchObject({
      name: 'Box',
      hostname: 'box.internal',
      port: '22',
      group: 'Infra',
      username: 'alice',
      identityFile: '~/.ssh/id',
      extraArgs: '-J bastion',
      mcpAllowedCommands: 'uptime',
      notes: 'hi',
    })
  })
})

describe('toggleProtocol', () => {
  it('follows the protocol switch while the port is still the old default', () => {
    expect(toggleProtocol(formValues({ protocol: SSH, port: '22' }))).toMatchObject({
      protocol: RDP,
      port: '3389',
    })
  })

  it('leaves a hand-typed port alone', () => {
    expect(toggleProtocol(formValues({ protocol: SSH, port: '2222' }))).toMatchObject({
      protocol: RDP,
      port: '2222',
    })
  })
})

describe('toggleMcpEnabled', () => {
  it('flips the flag', () => {
    expect(toggleMcpEnabled(formValues({ mcpEnabled: false })).mcpEnabled).toBe(true)
    expect(toggleMcpEnabled(formValues({ mcpEnabled: true })).mcpEnabled).toBe(false)
  })
})

const baseCtx = {
  values: formValues(),
  fieldIndex: 2,
  fieldsLength: 5,
}

describe('resolveFormKeyAction', () => {
  it('cancels on escape from any field', () => {
    expect(
      resolveFormKeyAction({
        ...baseCtx,
        field: 'name',
        input: '',
        key: key({ escape: true }),
      }),
    ).toEqual({ type: 'cancel' })
  })

  it('submits on ctrl+s', () => {
    expect(
      resolveFormKeyAction({
        ...baseCtx,
        field: 'name',
        input: 's',
        key: key({ ctrl: true }),
      }),
    ).toEqual({ type: 'submit' })
  })

  it('toggles the protocol on left/right without clearing the error', () => {
    const action = resolveFormKeyAction({
      ...baseCtx,
      field: 'protocol',
      input: '',
      key: key({ rightArrow: true }),
    })
    expect(action.type).toBe('setValues')
    expect(action).toMatchObject({ clearsError: false })
  })

  it('toggles mcpEnabled on left/right without clearing the error', () => {
    const action = resolveFormKeyAction({
      ...baseCtx,
      field: 'mcpEnabled',
      input: '',
      key: key({ leftArrow: true }),
    })
    expect(action.type).toBe('setValues')
    expect(action).toMatchObject({ clearsError: false })
  })

  it('advances to the next field on tab or enter outside notes', () => {
    expect(
      resolveFormKeyAction({
        ...baseCtx,
        field: 'name',
        input: '',
        key: key({ tab: true }),
      }),
    ).toEqual({ type: 'setFieldIndex', index: 3 })
  })

  it('clamps field navigation to the field list bounds', () => {
    expect(
      resolveFormKeyAction({
        ...baseCtx,
        fieldIndex: 4,
        field: 'notes',
        input: '',
        key: key({ tab: true }),
      }),
    ).toEqual({ type: 'setFieldIndex', index: 4 })
    expect(
      resolveFormKeyAction({
        ...baseCtx,
        fieldIndex: 0,
        field: 'name',
        input: '',
        key: key({ upArrow: true }),
      }),
    ).toEqual({ type: 'setFieldIndex', index: 0 })
  })

  describe('inside the notes field', () => {
    it('inserts a newline on enter and clears the error', () => {
      const action = resolveFormKeyAction({
        ...baseCtx,
        values: formValues({ notes: 'line one' }),
        field: 'notes',
        input: '',
        key: key({ return: true }),
      })
      expect(action).toMatchObject({
        type: 'setValues',
        clearsError: true,
        values: { notes: 'line one\n' },
      })
    })

    it('deletes the last character on backspace and clears the error', () => {
      const action = resolveFormKeyAction({
        ...baseCtx,
        values: formValues({ notes: 'line one' }),
        field: 'notes',
        input: '',
        key: key({ backspace: true }),
      })
      expect(action).toMatchObject({
        type: 'setValues',
        clearsError: true,
        values: { notes: 'line on' },
      })
    })

    it('appends typed input and clears the error', () => {
      const action = resolveFormKeyAction({
        ...baseCtx,
        values: formValues({ notes: 'line' }),
        field: 'notes',
        input: ' one',
        key: key(),
      })
      expect(action).toMatchObject({
        type: 'setValues',
        clearsError: true,
        values: { notes: 'line one' },
      })
    })

    it('moves to the next/previous field on tab/down and up, not editing notes', () => {
      expect(
        resolveFormKeyAction({
          ...baseCtx,
          field: 'notes',
          input: '',
          key: key({ downArrow: true }),
        }),
      ).toEqual({ type: 'setFieldIndex', index: 3 })
      expect(
        resolveFormKeyAction({
          ...baseCtx,
          field: 'notes',
          input: '',
          key: key({ upArrow: true }),
        }),
      ).toEqual({ type: 'setFieldIndex', index: 1 })
    })
  })
})
