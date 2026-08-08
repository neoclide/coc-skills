#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, relative, extname } from 'node:path'

const ignoredDirectories = new Set([
  '.git', 'node_modules', 'build', 'dist', 'lib', 'out', 'coverage', '.nyc_output'
])
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function parseArgs(argv) {
  const result = { root: process.cwd(), output: undefined, compare: undefined }
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index]
    if (!['--root', '--output', '--compare'].includes(name)) {
      throw new Error(`Unknown argument: ${name}`)
    }
    const value = argv[++index]
    if (!value) throw new Error(`Missing value for ${name}`)
    result[name.slice(2)] = value
  }
  return result
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort()
}

function strings(value) {
  return Array.isArray(value) ? unique(value.filter(item => typeof item === 'string')) : []
}

function configurationKeys(configuration) {
  const entries = Array.isArray(configuration) ? configuration : [configuration]
  return unique(entries.flatMap(entry => Object.keys(entry?.properties ?? {})))
}

function configurationContracts(configuration) {
  const entries = Array.isArray(configuration) ? configuration : [configuration]
  const contracts = {}
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry?.properties ?? {})) {
      contracts[key] = {
        type: value?.type ?? null,
        default: Object.hasOwn(value ?? {}, 'default') ? value.default : null,
        scope: value?.scope ?? null,
        enum: value?.enum ?? null,
        deprecationMessage: value?.deprecationMessage ?? value?.markdownDeprecationMessage ?? null
      }
    }
  }
  return Object.fromEntries(Object.entries(contracts).sort(([left], [right]) => left.localeCompare(right)))
}

function commandIds(commands) {
  return unique((Array.isArray(commands) ? commands : []).map(command => command?.command))
}

function commandContracts(commands) {
  const contracts = {}
  for (const command of Array.isArray(commands) ? commands : []) {
    if (typeof command?.command !== 'string') continue
    contracts[command.command] = {
      title: command.title ?? null,
      category: command.category ?? null,
      enablement: command.enablement ?? null
    }
  }
  return Object.fromEntries(Object.entries(contracts).sort(([left], [right]) => left.localeCompare(right)))
}

function languageIds(languages) {
  return unique((Array.isArray(languages) ? languages : []).map(language => language?.id))
}

function languageContracts(languages) {
  const contracts = {}
  for (const language of Array.isArray(languages) ? languages : []) {
    if (typeof language?.id !== 'string') continue
    contracts[language.id] = {
      aliases: strings(language.aliases),
      extensions: strings(language.extensions),
      filenames: strings(language.filenames),
      filenamePatterns: strings(language.filenamePatterns),
      mimetypes: strings(language.mimetypes),
      firstLine: language.firstLine ?? null
    }
  }
  return Object.fromEntries(Object.entries(contracts).sort(([left], [right]) => left.localeCompare(right)))
}

async function walk(directory, root, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) await walk(path, root, files)
    else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(path)
  }
  return files
}

function collectMatches(source, expression) {
  const values = []
  for (const match of source.matchAll(expression)) values.push(match[1])
  return values
}

function scanSource(source) {
  return {
    commandRegistrations: collectMatches(
      source,
      /\bcommands\.registerCommand\s*\(\s*['"`]([^'"`]+)['"`]/g
    ),
    configurationNamespaces: collectMatches(
      source,
      /\bworkspace\.getConfiguration\s*\(\s*['"`]([^'"`]+)['"`]/g
    ),
    cocImports: collectMatches(
      source,
      /(?:from\s*|require\s*\(\s*)['"](coc\.nvim(?:\/[^'"]*)?)['"]/g
    ),
    vscodeImports: collectMatches(
      source,
      /(?:from\s*|require\s*\(\s*)['"](vscode(?:\/[^'"]*)?)['"]/g
    ),
    hasActivateExport: /\bexport\s+(?:async\s+)?function\s+activate\b|\bexport\s+(?:const|let|var)\s+activate\b/.test(source),
    hasDeactivateExport: /\bexport\s+(?:async\s+)?function\s+deactivate\b|\bexport\s+(?:const|let|var)\s+deactivate\b/.test(source)
  }
}

async function createInventory(root) {
  const packagePath = resolve(root, 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
  const contributes = packageJson.contributes ?? {}
  const files = await walk(root, root)
  const sourceSummary = {
    adapterFiles: [],
    vscodeRuntimeFiles: [],
    activateExports: [],
    deactivateExports: [],
    commandRegistrations: [],
    configurationNamespaces: [],
    cocImports: []
  }

  for (const file of files) {
    const fileName = relative(root, file).replaceAll('\\', '/')
    const scan = scanSource(await readFile(file, 'utf8'))
    if (scan.cocImports.length) sourceSummary.adapterFiles.push(fileName)
    if (scan.vscodeImports.length) sourceSummary.vscodeRuntimeFiles.push(fileName)
    if (scan.hasActivateExport) sourceSummary.activateExports.push(fileName)
    if (scan.hasDeactivateExport) sourceSummary.deactivateExports.push(fileName)
    sourceSummary.commandRegistrations.push(...scan.commandRegistrations)
    sourceSummary.configurationNamespaces.push(...scan.configurationNamespaces)
    sourceSummary.cocImports.push(...scan.cocImports)
  }

  for (const [key, values] of Object.entries(sourceSummary)) sourceSummary[key] = unique(values)

  return {
    schemaVersion: 2,
    package: {
      name: packageJson.name ?? null,
      main: packageJson.main ?? null,
      activationEvents: strings(packageJson.activationEvents),
      commandIds: commandIds(contributes.commands),
      commandContracts: commandContracts(contributes.commands),
      configurationKeys: configurationKeys(contributes.configuration),
      configurationContracts: configurationContracts(contributes.configuration),
      contributionKeys: Object.keys(contributes).sort(),
      languageIds: languageIds(contributes.languages),
      languageContracts: languageContracts(contributes.languages),
      cocEngine: packageJson.engines?.coc ?? null,
      vscodeRuntimeDependency: packageJson.dependencies?.vscode ?? null
    },
    source: sourceSummary
  }
}

function compareArrays(before, after) {
  const current = new Set(after)
  return before.filter(value => !current.has(value))
}

function compareObjectContracts(before, after) {
  const changed = []
  for (const [key, oldValue] of Object.entries(before ?? {})) {
    if (!Object.hasOwn(after ?? {}, key)) continue
    const newValue = after[key]
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changed.push({ key, before: oldValue, after: newValue })
    }
  }
  return changed
}

function compareInventories(before, after) {
  const removed = {}
  const fields = [
    ['package.activationEvents', before.package.activationEvents, after.package.activationEvents],
    ['package.commandIds', before.package.commandIds, after.package.commandIds],
    ['package.configurationKeys', before.package.configurationKeys, after.package.configurationKeys],
    ['package.contributionKeys', before.package.contributionKeys, after.package.contributionKeys],
    ['package.languageIds', before.package.languageIds, after.package.languageIds],
    ['source.adapterFiles', before.source.adapterFiles, after.source.adapterFiles],
    ['source.activateExports', before.source.activateExports, after.source.activateExports],
    ['source.deactivateExports', before.source.deactivateExports, after.source.deactivateExports],
    ['source.commandRegistrations', before.source.commandRegistrations, after.source.commandRegistrations],
    ['source.configurationNamespaces', before.source.configurationNamespaces, after.source.configurationNamespaces],
    ['source.cocImports', before.source.cocImports, after.source.cocImports]
  ]

  for (const [name, oldValues, newValues] of fields) {
    const values = compareArrays(oldValues ?? [], newValues ?? [])
    if (values.length) removed[name] = values
  }
  if (before.package.main !== after.package.main) {
    removed['package.mainChanged'] = [before.package.main, after.package.main]
  }
  if (before.package.cocEngine !== after.package.cocEngine) {
    removed['package.cocEngineChanged'] = [before.package.cocEngine, after.package.cocEngine]
  }
  const changedConfigurations = compareObjectContracts(
    before.package.configurationContracts,
    after.package.configurationContracts
  )
  if (changedConfigurations.length) {
    removed['package.configurationContractsChanged'] = changedConfigurations
  }
  const changedCommands = compareObjectContracts(
    before.package.commandContracts,
    after.package.commandContracts
  )
  if (changedCommands.length) removed['package.commandContractsChanged'] = changedCommands
  const changedLanguages = compareObjectContracts(
    before.package.languageContracts,
    after.package.languageContracts
  )
  if (changedLanguages.length) removed['package.languageContractsChanged'] = changedLanguages

  const addedVscodeRuntimeFiles = compareArrays(
    after.source.vscodeRuntimeFiles ?? [],
    before.source.vscodeRuntimeFiles ?? []
  )
  if (addedVscodeRuntimeFiles.length) {
    removed['source.vscodeRuntimeFilesAdded'] = addedVscodeRuntimeFiles
  }
  if (!before.package.vscodeRuntimeDependency && after.package.vscodeRuntimeDependency) {
    removed['package.vscodeRuntimeDependencyAdded'] = [after.package.vscodeRuntimeDependency]
  }
  return { riskCount: Object.keys(removed).length, removed, current: after }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const root = resolve(options.root)
  const inventory = await createInventory(root)

  if (options.output) {
    await writeFile(resolve(options.output), `${JSON.stringify(inventory, null, 2)}\n`)
  }

  if (options.compare) {
    const before = JSON.parse(await readFile(resolve(options.compare), 'utf8'))
    if (before.schemaVersion !== inventory.schemaVersion) {
      throw new Error(
        `Inventory schema mismatch: expected ${inventory.schemaVersion}, received ${before.schemaVersion}`
      )
    }
    const comparison = compareInventories(before, inventory)
    process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`)
    if (comparison.riskCount) process.exitCode = 2
  } else if (!options.output) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`)
  process.exitCode = 1
})
