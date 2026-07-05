import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const helperPath = join(
  import.meta.dirname,
  '..',
  'node_modules',
  'node-pty',
  'prebuilds',
  `${process.platform}-${process.arch}`,
  'spawn-helper',
)

if (existsSync(helperPath)) {
  chmodSync(helperPath, 0o755)
}
