import { execFile, type ExecException } from 'node:child_process'
import {
  SSH_EXEC_DEFAULT_TIMEOUT_MS,
  SSH_EXEC_MAX_BUFFER_BYTES,
  SSH_EXEC_MAX_OUTPUT_CHARS,
  SSH_PROBE_CONNECT_TIMEOUT_SECONDS,
  SSH_PROBE_TIMEOUT_MS,
} from '@/constants'
import { buildSshArgs } from '@/lib/ssh/ssh'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

export interface SshExecResult {
  stdout: string
  stderr: string
  code: number | null
  error?: string
}

export function buildSshExecArgs(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  command: string,
): string[] {
  return ['-o', 'BatchMode=yes', ...buildSshArgs(connection, credential), command]
}

export function truncateOutput(text: string): string {
  if (text.length <= SSH_EXEC_MAX_OUTPUT_CHARS) return text
  return `${text.slice(0, SSH_EXEC_MAX_OUTPUT_CHARS)}\n[termlink: output truncated at ${SSH_EXEC_MAX_OUTPUT_CHARS} characters]`
}

function runSsh(
  args: string[],
  { timeoutMs, sshCommand }: { timeoutMs: number; sshCommand: string },
): Promise<SshExecResult> {
  return new Promise((resolve) => {
    execFile(
      sshCommand,
      args,
      { timeout: timeoutMs, maxBuffer: SSH_EXEC_MAX_BUFFER_BYTES },
      (err: ExecException | null, stdout, stderr) => {
        const out = truncateOutput(stdout)
        const errOut = truncateOutput(stderr)
        if (err && typeof err.code !== 'number') {
          resolve({
            stdout: out,
            stderr: errOut,
            code: null,
            error: err.message,
          })
          return
        }
        resolve({
          stdout: out,
          stderr: errOut,
          code: err ? (err.code as number) : 0,
        })
      },
    )
  })
}

export function execSshCommand(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  command: string,
  { timeoutMs = SSH_EXEC_DEFAULT_TIMEOUT_MS, sshCommand = 'ssh' } = {},
): Promise<SshExecResult> {
  return runSsh(buildSshExecArgs(connection, credential, command), {
    timeoutMs,
    sshCommand,
  })
}

export function buildProbeArgs(
  connection: ConnectionModel,
  credential: CredentialModel | null,
): string[] {
  return [
    '-o',
    `ConnectTimeout=${SSH_PROBE_CONNECT_TIMEOUT_SECONDS}`,
    ...buildSshExecArgs(connection, credential, 'true'),
  ]
}

export function probeSshConnection(
  connection: ConnectionModel,
  credential: CredentialModel | null,
  { timeoutMs = SSH_PROBE_TIMEOUT_MS, sshCommand = 'ssh' } = {},
): Promise<SshExecResult> {
  return runSsh(buildProbeArgs(connection, credential), {
    timeoutMs,
    sshCommand,
  })
}
