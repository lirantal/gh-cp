import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseSourceSpec } from './parse-source-spec.ts'

export type Aliases = Record<string, string>

export interface AliasStoreOptions {
  configDir?: string
  env?: Record<string, string | undefined>
  homeDir?: string
  platform?: NodeJS.Platform
}

const ALIAS_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/

function isNodeError (value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}

function assertPlainAliases (value: unknown, filePath: string): Aliases {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Alias config at ${filePath} must be a JSON object`)
  }

  const aliases: Aliases = {}
  for (const [name, sourceSpec] of Object.entries(value)) {
    validateAliasName(name)
    if (typeof sourceSpec !== 'string') {
      throw new Error(`Alias "${name}" in ${filePath} must have a string source`)
    }
    validateAliasSource(sourceSpec)
    aliases[name] = sourceSpec
  }

  return aliases
}

export function validateAliasName (name: string): void {
  if (!ALIAS_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid alias name "${name}": use 1-64 letters, numbers, dots, ` +
      'underscores, or dashes, starting with a letter or number'
    )
  }
}

export function validateAliasSource (sourceSpec: string): void {
  try {
    parseSourceSpec(sourceSpec)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Invalid alias source "${sourceSpec}": ${msg}`)
  }
}

export function resolveAliasConfigDir (opts: AliasStoreOptions = {}): string {
  if (opts.configDir !== undefined && opts.configDir.length > 0) {
    return path.resolve(opts.configDir)
  }

  const env = opts.env ?? process.env
  const override = env.GH_CP_CONFIG_DIR
  if (override !== undefined && override.length > 0) {
    return path.resolve(override)
  }

  const platform = opts.platform ?? process.platform
  const homeDir = opts.homeDir ?? os.homedir()
  if (platform === 'win32') {
    const appData =
      env.LOCALAPPDATA ??
      env.APPDATA ??
      path.join(homeDir, 'AppData', 'Local')
    return path.join(appData, 'gh-cp')
  }

  const xdgConfigHome = env.XDG_CONFIG_HOME
  if (xdgConfigHome !== undefined && xdgConfigHome.length > 0) {
    return path.join(xdgConfigHome, 'gh-cp')
  }

  return path.join(homeDir, '.config', 'gh-cp')
}

export function resolveAliasesFilePath (opts: AliasStoreOptions = {}): string {
  return path.join(resolveAliasConfigDir(opts), 'aliases.json')
}

export async function loadAliases (opts: AliasStoreOptions = {}): Promise<Aliases> {
  const filePath = resolveAliasesFilePath(opts)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (e) {
    if (isNodeError(e) && e.code === 'ENOENT') {
      return {}
    }
    throw e
  }

  if (raw.trim().length === 0) {
    return {}
  }

  try {
    return assertPlainAliases(JSON.parse(raw), filePath)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to read aliases: ${msg}`)
  }
}

export async function saveAliases (
  aliases: Aliases,
  opts: AliasStoreOptions = {}
): Promise<void> {
  const filePath = resolveAliasesFilePath(opts)
  const dir = path.dirname(filePath)
  const sorted = Object.fromEntries(Object.entries(aliases).sort())
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`

  await mkdir(dir, { recursive: true })
  await writeFile(tmpPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  await rename(tmpPath, filePath)
}

export async function setAlias (
  name: string,
  sourceSpec: string,
  opts: AliasStoreOptions = {}
): Promise<void> {
  validateAliasName(name)
  validateAliasSource(sourceSpec)

  const aliases = await loadAliases(opts)
  aliases[name] = sourceSpec
  await saveAliases(aliases, opts)
}
