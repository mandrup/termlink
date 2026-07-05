import { RDP, SSH } from '@/constants'

export type ConnectionProtocol = typeof RDP | typeof SSH

export type ConnectionResult = 'ok' | 'error'

export interface ConnectionModel {
  id: string
  name: string
  hostname: string
  port?: number
  protocol: ConnectionProtocol
  group?: string
  credentialId?: string
  identityFile?: string
  extraArgs?: string
  mcp?: {
    enabled: boolean
    allowedCommands: string[]
  }
  notes?: string
  createdAt?: string
  modifiedAt?: string
  lastConnectedAt?: string
  lastConnectedResult?: ConnectionResult
}

export interface CredentialModel {
  id: string
  username: string
  hasPassword?: boolean
  createdAt?: string
  modifiedAt?: string
}
