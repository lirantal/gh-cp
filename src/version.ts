import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function readCliVersion (): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++) {
    try {
      const pkgPath = join(dir, 'package.json')
      const raw = readFileSync(pkgPath, 'utf8')
      const pkg = JSON.parse(raw) as { name?: string; version?: string }
      if (pkg.name === 'gh-cp' && typeof pkg.version === 'string') {
        return pkg.version
      }
    } catch {
      // walk up
    }
    const parent = dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  return '0.0.0'
}
