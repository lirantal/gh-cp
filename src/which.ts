import { access, constants } from 'node:fs/promises'
import path from 'node:path'

/**
 * Return absolute path to `command` on PATH, or undefined if not found / not executable.
 */
export async function which (command: string): Promise<string | undefined> {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']
  const pathEnv = process.env.PATH ?? process.env.Path ?? ''
  const dirs = pathEnv.split(path.delimiter).filter(Boolean)

  for (const dir of dirs) {
    for (const ext of exts) {
      const full = path.join(dir, command + ext)
      try {
        await access(full, constants.X_OK)
        return full
      } catch {
        // continue
      }
    }
  }
  return undefined
}
