import { SSH } from '@/constants'
import { getPassword } from '@/lib/keychain'
import type { RunResult } from '@/lib/pty'
import { formatResult as formatRdpResult, prepareRdpLaunch } from '@/lib/rdp/rdp'
import { buildSshArgs, formatResult as formatSshResult, sshCommand } from '@/lib/ssh/ssh'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export interface ConnectionLaunch {
  command: string
  args: string[]
  formatResult: (connectionName: string, result: RunResult) => string
  cleanup: () => Promise<void>
}

export async function buildLaunch(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  fetchPassword: typeof getPassword = getPassword,
): Promise<ConnectionLaunch> {
  if (connection.protocol === SSH) {
    return {
      command: sshCommand(),
      args: buildSshArgs(connection, credential),
      formatResult: formatSshResult,
      cleanup: async () => {},
    }
  }

  const password = credential?.hasPassword
    ? await fetchPassword(credential.id).catch(() => null)
    : null
  const rdp = await prepareRdpLaunch(connection, credential, password)
  return { ...rdp, formatResult: formatRdpResult }
}
