#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const templateDirectory = path.resolve(scriptDirectory, '../assets/template')

function usage() {
  return `Usage:
  node scripts/scaffold.mjs --output <directory> --name <coc-name> --description <text> [--command-id <id>]

Options:
  --output       New or empty extension directory
  --name         Lowercase npm package name beginning with coc-
  --description  One-line package description
  --command-id   Optional command identifier (default: <name-without-coc->.hello)
  -h, --help     Show this help
`
}

function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '-h' || argument === '--help') return { help: true }
    if (!['--output', '--name', '--description', '--command-id'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = argv[index + 1]
    if (value == null || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
    options[argument.slice(2).replace('-', '_')] = value
    index += 1
  }
  return options
}

function requireSingleLine(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`)
  if (/[\r\n\0]/.test(value)) throw new Error(`${label} must be one line`)
  return value.trim()
}

function validatePackageName(value) {
  const name = requireSingleLine(value, 'Package name')
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?coc-[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error('Package name must be lowercase, npm-compatible, and begin with coc-')
  }
  return name
}

function packageBaseName(name) {
  return name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name
}

function deriveDisplayName(name) {
  return packageBaseName(name)
    .slice('coc-'.length)
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function deriveCommandId(name) {
  return `${packageBaseName(name).slice('coc-'.length)}.hello`
}

function validateCommandId(value) {
  const commandId = requireSingleLine(value, 'Command identifier')
  if (!/^[a-z][a-z0-9_-]*(?:\.[a-z0-9][a-z0-9_-]*)+$/.test(commandId)) {
    throw new Error('Command identifier must contain lowercase dot-separated segments')
  }
  return commandId
}

async function ensureEmptyDirectory(directory) {
  try {
    const stat = await fs.stat(directory)
    if (!stat.isDirectory()) throw new Error(`Target exists and is not a directory: ${directory}`)
    const entries = await fs.readdir(directory)
    if (entries.length > 0) throw new Error(`Target directory is not empty: ${directory}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await fs.mkdir(directory, { recursive: true })
  }
}

function renderTemplate(content, values) {
  let rendered = content
  for (const [token, value] of Object.entries(values)) rendered = rendered.replaceAll(token, value)
  const unresolved = rendered.match(/__[A-Z0-9_]+__/)
  if (unresolved) throw new Error(`Unresolved template token: ${unresolved[0]}`)
  return rendered
}

async function copyTemplates(source, destination, values) {
  const entries = await fs.readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetName = entry.name.endsWith('.tmpl') ? entry.name.slice(0, -'.tmpl'.length) : entry.name
    const targetPath = path.join(destination, targetName)
    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true })
      await copyTemplates(sourcePath, targetPath, values)
      continue
    }
    if (!entry.isFile()) continue
    const content = await fs.readFile(sourcePath, 'utf8')
    await fs.writeFile(targetPath, renderTemplate(content, values), 'utf8')
  }
}

export async function scaffold(rawOptions) {
  const name = validatePackageName(rawOptions.name)
  const description = requireSingleLine(rawOptions.description, 'Description')
  const commandId = validateCommandId(rawOptions.command_id ?? deriveCommandId(name))
  const displayName = deriveDisplayName(name)
  const output = path.resolve(requireSingleLine(rawOptions.output, 'Output directory'))

  await ensureEmptyDirectory(output)
  await copyTemplates(templateDirectory, output, {
    __PACKAGE_NAME_JSON__: JSON.stringify(name),
    __PACKAGE_NAME_TEXT__: name,
    __DESCRIPTION_JSON__: JSON.stringify(description),
    __DESCRIPTION_TEXT__: description,
    __COMMAND_ID_JSON__: JSON.stringify(commandId),
    __COMMAND_ID_TEXT__: commandId,
    __DISPLAY_NAME_JSON__: JSON.stringify(displayName),
    __DISPLAY_NAME_TEXT__: displayName,
  })

  return { output, name, description, commandId, displayName }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(usage())
    return
  }
  const result = await scaffold(options)
  process.stdout.write(`Created ${result.name} in ${result.output}\n`)
  process.stdout.write(`Command: ${result.commandId}\n\n`)
  process.stdout.write('Next steps:\n')
  process.stdout.write(`  cd ${JSON.stringify(result.output)}\n`)
  process.stdout.write("  npm install --save-dev coc.nvim@next coc-test 'typescript@^6' 'esbuild@^0.28' '@types/node@^22'\n")
  process.stdout.write('  npm run typecheck\n  npm run build\n  npm run test:nvim\n  npm run test:vim\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
