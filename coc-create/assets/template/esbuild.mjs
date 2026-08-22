import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  external: ['coc.nvim'],
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  outfile: 'lib/index.js',
})
