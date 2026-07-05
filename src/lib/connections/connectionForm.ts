import type { Key } from 'ink'
import { DEFAULT_PORT, RDP, SSH } from '@/constants'
import type { ConnectionModel, ConnectionProtocol } from '@/models/connection'

export interface ConnectionFormValues {
  name: string
  hostname: string
  port: string
  protocol: ConnectionProtocol
  group: string
  username: string
  password: string
  passwordTouched: boolean
  identityFile: string
  extraArgs: string
  mcpEnabled: boolean
  mcpAllowedCommands: string
  notes: string
}

export const ALL_FIELDS = [
  'name',
  'hostname',
  'port',
  'protocol',
  'group',
  'username',
  'password',
  'identityFile',
  'extraArgs',
  'mcpEnabled',
  'mcpAllowedCommands',
  'notes',
] as const

export type FieldKey = (typeof ALL_FIELDS)[number]

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'Name',
  hostname: 'Hostname',
  port: 'Port',
  protocol: 'Protocol',
  group: 'Group',
  username: 'Username',
  password: 'Password',
  identityFile: 'Identity File',
  extraArgs: 'Extra SSH Args',
  mcpEnabled: 'MCP Access',
  mcpAllowedCommands: 'Allowed Commands',
  notes: 'Notes',
}

export function visibleFields(protocol: ConnectionProtocol): FieldKey[] {
  return ALL_FIELDS.filter(
    (key) =>
      (key !== 'identityFile' || protocol === SSH) &&
      (key !== 'extraArgs' || protocol === SSH) &&
      (key !== 'password' || protocol === RDP) &&
      ((key !== 'mcpEnabled' && key !== 'mcpAllowedCommands') || protocol === SSH),
  )
}

export function visibleNotesLines(notes: string, height: number): string[] {
  const lines = notes.split('\n')
  const visible = lines.length > height ? lines.slice(lines.length - height) : lines
  return [...visible, ...Array(height - visible.length).fill('')]
}

export function notesCursorRow(notes: string, height: number): number {
  return Math.min(notes.split('\n').length, height) - 1
}

export function toFormValues(
  connection: ConnectionModel | null,
  username: string,
): ConnectionFormValues {
  if (!connection) {
    return {
      name: '',
      hostname: '',
      port: String(DEFAULT_PORT.ssh),
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
    }
  }
  return {
    name: connection.name,
    hostname: connection.hostname,
    port: String(connection.port ?? DEFAULT_PORT[connection.protocol]),
    protocol: connection.protocol,
    group: connection.group ?? '',
    username,
    password: '',
    passwordTouched: false,
    identityFile: connection.identityFile ?? '',
    extraArgs: connection.extraArgs ?? '',
    mcpEnabled: connection.mcp?.enabled ?? false,
    mcpAllowedCommands: (connection.mcp?.allowedCommands ?? []).join(', '),
    notes: connection.notes ?? '',
  }
}

export function validate(values: ConnectionFormValues): string | null {
  if (!values.name.trim()) return 'Name is required'
  if (!values.hostname.trim()) return 'Hostname is required'
  const port = values.port.trim()
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535))
    return 'Port must be a whole number between 1 and 65535'
  return null
}

export function trimFormValues(values: ConnectionFormValues): ConnectionFormValues {
  return {
    ...values,
    name: values.name.trim(),
    hostname: values.hostname.trim(),
    port: values.port.trim(),
    group: values.group.trim(),
    username: values.username.trim(),
    identityFile: values.identityFile.trim(),
    extraArgs: values.extraArgs.trim(),
    mcpAllowedCommands: values.mcpAllowedCommands.trim(),
    notes: values.notes.trim(),
  }
}

export function toggleProtocol(values: ConnectionFormValues): ConnectionFormValues {
  const protocol: ConnectionProtocol = values.protocol === RDP ? SSH : RDP
  const port =
    values.port === String(DEFAULT_PORT[values.protocol])
      ? String(DEFAULT_PORT[protocol])
      : values.port
  return { ...values, protocol, port }
}

export function toggleMcpEnabled(values: ConnectionFormValues): ConnectionFormValues {
  return { ...values, mcpEnabled: !values.mcpEnabled }
}

function appendNotesNewline(values: ConnectionFormValues): ConnectionFormValues {
  return { ...values, notes: `${values.notes}\n` }
}

function backspaceNotes(values: ConnectionFormValues): ConnectionFormValues {
  return { ...values, notes: values.notes.slice(0, -1) }
}

function typeIntoNotes(values: ConnectionFormValues, input: string): ConnectionFormValues {
  return { ...values, notes: values.notes + input }
}

export type FormKeyAction =
  | { type: 'cancel' }
  | { type: 'submit' }
  | { type: 'setFieldIndex'; index: number }
  | { type: 'setValues'; values: ConnectionFormValues; clearsError: boolean }
  | { type: 'none' }

export function resolveFormKeyAction({
  values,
  field,
  fieldIndex,
  fieldsLength,
  input,
  key,
}: {
  values: ConnectionFormValues
  field: FieldKey
  fieldIndex: number
  fieldsLength: number
  input: string
  key: Key
}): FormKeyAction {
  if (key.escape) return { type: 'cancel' }
  if (key.ctrl && input === 's') return { type: 'submit' }

  if (field === 'protocol' && (key.leftArrow || key.rightArrow)) {
    return {
      type: 'setValues',
      values: toggleProtocol(values),
      clearsError: false,
    }
  }
  if (field === 'mcpEnabled' && (key.leftArrow || key.rightArrow)) {
    return {
      type: 'setValues',
      values: toggleMcpEnabled(values),
      clearsError: false,
    }
  }

  if (field === 'notes') {
    if (key.tab || key.downArrow) {
      return {
        type: 'setFieldIndex',
        index: Math.min(fieldIndex + 1, fieldsLength - 1),
      }
    }
    if (key.upArrow) {
      return { type: 'setFieldIndex', index: Math.max(fieldIndex - 1, 0) }
    }
    if (key.return) {
      return {
        type: 'setValues',
        values: appendNotesNewline(values),
        clearsError: true,
      }
    }
    if (key.backspace || key.delete) {
      return {
        type: 'setValues',
        values: backspaceNotes(values),
        clearsError: true,
      }
    }
    if (input) {
      return {
        type: 'setValues',
        values: typeIntoNotes(values, input),
        clearsError: true,
      }
    }
    return { type: 'none' }
  }

  if (key.tab || key.return) {
    return {
      type: 'setFieldIndex',
      index: Math.min(fieldIndex + 1, fieldsLength - 1),
    }
  }
  if (key.upArrow) {
    return { type: 'setFieldIndex', index: Math.max(fieldIndex - 1, 0) }
  }
  if (key.downArrow) {
    return {
      type: 'setFieldIndex',
      index: Math.min(fieldIndex + 1, fieldsLength - 1),
    }
  }
  return { type: 'none' }
}
