export interface AuditLogEntry {
  connectionId: string
  connectionName: string
  command: string
  outcome: 'ok' | 'rejected' | 'error'
  exitCode?: number | null
  reason?: string
}
