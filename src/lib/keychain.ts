import { spawn } from 'node:child_process'
import {
  KEYCHAIN_NOT_FOUND_DARWIN_WIN32,
  KEYCHAIN_NOT_FOUND_LINUX,
  KEYCHAIN_SERVICE as SERVICE,
} from '@/constants'

export type KeychainOp = 'set' | 'get' | 'delete'

export interface KeychainCommand {
  command: string
  args: string[]
  stdin?: string
}

function assertSafeId(id: string): void {
  if (!/^[\w.-]+$/.test(id)) {
    throw new Error(`Unsafe credential id for keychain use: ${id}`)
  }
}

function powershellScript(op: KeychainOp, id: string): string {
  const file = `(Join-Path $env:APPDATA 'termlink\\secrets\\${id}.dat')`
  if (op === 'set') {
    return [
      `$p = [Console]::In.ReadToEnd()`,
      `$dir = Join-Path $env:APPDATA 'termlink\\secrets'`,
      `New-Item -ItemType Directory -Force -Path $dir | Out-Null`,
      `ConvertTo-SecureString $p -AsPlainText -Force | ConvertFrom-SecureString | Set-Content ${file}`,
    ].join('; ')
  }
  if (op === 'get') {
    return [
      `if (-not (Test-Path ${file})) { exit ${KEYCHAIN_NOT_FOUND_DARWIN_WIN32} }`,
      `$s = Get-Content ${file} | ConvertTo-SecureString`,
      `$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)`,
      `[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b))`,
    ].join('; ')
  }
  return `Remove-Item -Force -ErrorAction SilentlyContinue ${file}`
}

export function buildKeychainCommand(
  platform: NodeJS.Platform,
  op: KeychainOp,
  id: string,
  password?: string,
): KeychainCommand {
  assertSafeId(id)
  if (platform === 'darwin') {
    if (op === 'set') {
      return {
        command: 'security',
        args: ['add-generic-password', '-U', '-a', id, '-s', SERVICE, '-w', password ?? ''],
      }
    }
    if (op === 'get') {
      return {
        command: 'security',
        args: ['find-generic-password', '-a', id, '-s', SERVICE, '-w'],
      }
    }
    return {
      command: 'security',
      args: ['delete-generic-password', '-a', id, '-s', SERVICE],
    }
  }
  if (platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', powershellScript(op, id)],
      ...(op === 'set' ? { stdin: password ?? '' } : {}),
    }
  }
  if (op === 'set') {
    return {
      command: 'secret-tool',
      args: ['store', `--label=${SERVICE}`, 'service', SERVICE, 'account', id],
      stdin: password ?? '',
    }
  }
  return {
    command: 'secret-tool',
    args: [op === 'get' ? 'lookup' : 'clear', 'service', SERVICE, 'account', id],
  }
}

function run(
  cmd: KeychainCommand,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd.command, cmd.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    if (cmd.stdin !== undefined) child.stdin.write(cmd.stdin)
    child.stdin.end()
  })
}

function failure(op: KeychainOp, result: { code: number | null; stderr: string }): Error {
  const detail = result.stderr.trim() || `exit code ${result.code}`
  return new Error(`keychain ${op} failed: ${detail}`)
}

function isNotFound(code: number | null): boolean {
  return process.platform === 'linux'
    ? code === KEYCHAIN_NOT_FOUND_LINUX
    : code === KEYCHAIN_NOT_FOUND_DARWIN_WIN32
}

export async function setPassword(id: string, password: string): Promise<void> {
  const result = await run(buildKeychainCommand(process.platform, 'set', id, password))
  if (result.code !== 0) throw failure('set', result)
}

export async function getPassword(id: string): Promise<string | null> {
  const result = await run(buildKeychainCommand(process.platform, 'get', id))
  if (result.code !== 0) {
    if (isNotFound(result.code)) {
      return null
    }

    throw failure('get', result)
  }
  return result.stdout.replace(/\r?\n$/, '')
}

export async function deletePassword(id: string): Promise<void> {
  const result = await run(buildKeychainCommand(process.platform, 'delete', id))

  if (result.code !== 0 && !isNotFound(result.code)) throw failure('delete', result)
}
