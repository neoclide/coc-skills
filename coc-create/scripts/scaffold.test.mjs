import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { scaffold } from './scaffold.mjs'

const temporaryDirectories = []

async function temporaryDirectory() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'coc-create-test-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true })))
})

describe('scaffold', () => {
  it('creates a complete project and replaces identifiers', async () => {
    const root = await temporaryDirectory()
    const output = path.join(root, 'coc-demo')

    const result = await scaffold({
      output,
      name: 'coc-demo',
      description: 'Demo extension',
    })

    assert.equal(result.commandId, 'demo.hello')
    const packageJson = JSON.parse(await fs.readFile(path.join(output, 'package.json'), 'utf8'))
    assert.equal(packageJson.name, 'coc-demo')
    assert.equal(packageJson['coc-test'].entryFile, 'src/index.ts')
    assert.deepEqual(packageJson.activationEvents, ['onCommand:demo.hello'])
    assert.equal(packageJson.scripts['test:nvim'], 'coc-test --nvim "test/**/*.test.ts"')
    assert.equal(packageJson.scripts['test:vim'], 'coc-test --vim "test/**/*.test.ts"')

    const source = await fs.readFile(path.join(output, 'src/index.ts'), 'utf8')
    assert.match(source, /export const commandId = ["']demo\.hello["']/)
    const workflow = await fs.readFile(path.join(output, '.github/workflows/test.yml'), 'utf8')
    assert.match(workflow, /editor: \[nvim, vim\]/)

    const files = await fs.readdir(output, { recursive: true })
    for (const file of files) {
      const stat = await fs.stat(path.join(output, file))
      if (!stat.isFile()) continue
      assert.doesNotMatch(await fs.readFile(path.join(output, file), 'utf8'), /__[A-Z0-9_]+__/)
    }
  })

  it('supports scoped names and an explicit command identifier', async () => {
    const root = await temporaryDirectory()
    const output = path.join(root, 'extension')
    const result = await scaffold({
      output,
      name: '@scope/coc-demo-tools',
      description: 'Scoped demo extension',
      command_id: 'demo-tools.run',
    })

    assert.equal(result.displayName, 'Demo Tools')
    assert.equal(result.commandId, 'demo-tools.run')
  })

  it('rejects invalid names and non-empty targets', async () => {
    const root = await temporaryDirectory()
    await assert.rejects(
      scaffold({ output: path.join(root, 'bad'), name: 'demo', description: 'Demo' }),
      /begin with coc-/,
    )

    const output = path.join(root, 'existing')
    await fs.mkdir(output)
    await fs.writeFile(path.join(output, 'keep.txt'), 'keep\n')
    await assert.rejects(
      scaffold({ output, name: 'coc-demo', description: 'Demo' }),
      /not empty/,
    )
    assert.equal(await fs.readFile(path.join(output, 'keep.txt'), 'utf8'), 'keep\n')
  })
})
