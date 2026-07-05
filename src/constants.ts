import type { ConnectionProtocol, ConnectionResult } from '@/models/connection'

export const RDP = 'rdp'
export const SSH = 'ssh'

export const DEFAULT_PORT: Record<ConnectionProtocol, number> = {
  rdp: 3389,
  ssh: 22,
}

export const PROTOCOL_COLOR: Record<ConnectionProtocol, string> = {
  rdp: 'yellow',
  ssh: 'blue',
}

export const CONNECTION_RESULT_COLOR: Record<ConnectionResult, string> = {
  ok: 'green',
  error: 'red',
}

export const CONFIG_VERSION = 3

export const KEYCHAIN_SERVICE = 'termlink'
export const KEYCHAIN_NOT_FOUND_DARWIN_WIN32 = 44
export const KEYCHAIN_NOT_FOUND_LINUX = 1

export const SSH_EXEC_DEFAULT_TIMEOUT_MS = 15_000
export const SSH_EXEC_MAX_BUFFER_BYTES = 4 * 1024 * 1024
export const SSH_EXEC_MAX_OUTPUT_CHARS = 100_000
export const SSH_PROBE_CONNECT_TIMEOUT_SECONDS = 5
export const SSH_PROBE_TIMEOUT_MS = 10_000
export const SSH_PROBE_CONCURRENCY = 4

export const SSH_CONFIG_DISPLAY_PATH = '~/.ssh/config'

export const SHELL_METACHARACTERS = /[;&|`$<>\n\r]/

export const RDP_CLEANUP_DELAY_MS = 5_000

export const MCP_LIST_CONNECTIONS = 'list_connections'
export const MCP_RUN_COMMAND = 'run_command'
export const MCP_GET_CONNECTION_STATUS = 'get_connection_status'

export const ACCENT_COLOR = '#39c5cf'

export const LIST_MIN_WIDTH = 22
export const LIST_MAX_WIDTH = 44
export const LIST_WIDTH_RATIO = 0.3
export const NAME_WIDTH_OVERHEAD = 10
export const NAME_MIN_WIDTH = 6

export const CONNECTION_LIST_DEFAULT_NAME_WIDTH = 18
export const CONNECTION_LIST_CHROME_ROWS = 9

export const CONNECTION_FORM_NOTES_HEIGHT = 7
export const CONNECTION_FORM_NOTES_WIDTH = 32

export const DETAIL_PANEL_LABEL_WIDTH = 15
export const DETAIL_PANEL_FIELDS_HEIGHT = 10
export const DETAIL_PANEL_NOTES_WIDTH = 30
export const DETAIL_PANEL_HEIGHT = 3 + DETAIL_PANEL_FIELDS_HEIGHT
