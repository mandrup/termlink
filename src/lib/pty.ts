import * as pty from 'node-pty'

export interface RunResult {
  code: number | null
  error?: string
}

export function runInteractive(command: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    let child: pty.IPty
    try {
      child = pty.spawn(command, args, {
        name: process.env.TERM || 'xterm-256color',
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      })
    } catch (err) {
      resolve({
        code: null,
        error: err instanceof Error ? err.message : String(err),
      })
      return
    }

    const wasRaw = process.stdin.isTTY ? process.stdin.isRaw : false
    if (process.stdin.isTTY) process.stdin.setRawMode(true)
    process.stdin.resume()

    const onStdinData = (data: Buffer) => child.write(data)
    process.stdin.on('data', onStdinData)

    const onResize = () => {
      child.resize(process.stdout.columns || 80, process.stdout.rows || 24)
    }
    process.stdout.on('resize', onResize)

    const dataSubscription = child.onData((data) => {
      process.stdout.write(data)
    })

    const cleanup = () => {
      process.stdin.off('data', onStdinData)
      process.stdout.off('resize', onResize)
      dataSubscription.dispose()
      if (process.stdin.isTTY && !wasRaw) process.stdin.setRawMode(false)
    }

    child.onExit(({ exitCode, signal }) => {
      cleanup()
      resolve(signal ? { code: null, error: `terminated by signal ${signal}` } : { code: exitCode })
    })
  })
}
