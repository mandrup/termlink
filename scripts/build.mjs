import { chmodSync } from 'node:fs'
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.tsx'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  jsx: 'automatic',
  external: ['node-pty', 'react-devtools-core', '*/devtools.js'],
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
})

chmodSync('dist/index.js', 0o755)

await build({
  entryPoints: ['src/mcp.ts'],
  outfile: 'dist/mcp.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node',
  },
})

chmodSync('dist/mcp.js', 0o755)
