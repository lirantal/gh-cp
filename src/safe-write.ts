import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Logger } from './logger.ts'

export function assertSafeUnderDest (destRoot: string, relativePath: string): string {
  const normalized = path.normalize(relativePath)
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Unsafe path in repository content: ${relativePath}`)
  }
  const resolved = path.resolve(destRoot, normalized)
  const rootResolved = path.resolve(destRoot)
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : rootResolved + path.sep
  if (resolved !== rootResolved && !resolved.startsWith(prefix)) {
    throw new Error(`Path escapes destination: ${relativePath}`)
  }
  return resolved
}

export interface WritePlan {
  relativePath: string
  content: Buffer
}

export async function applyWritePlan (
  destRoot: string,
  plans: WritePlan[],
  opts: { force: boolean; dryRun: boolean; log: Logger }
): Promise<string[]> {
  const written: string[] = []

  for (const plan of plans) {
    const abs = assertSafeUnderDest(destRoot, plan.relativePath)
    if (opts.dryRun) {
      opts.log.verbose(`dry-run: would write ${plan.relativePath}`)
      written.push(plan.relativePath)
      continue
    }

    const dir = path.dirname(abs)
    await mkdir(dir, { recursive: true })

    try {
      const st = await stat(abs)
      if (st.isDirectory()) {
        throw new Error(`Refusing to overwrite directory with file: ${plan.relativePath}`)
      }
      if (!opts.force) {
        throw new Error(`File already exists (use --force): ${plan.relativePath}`)
      }
    } catch (e) {
      if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
        // ok
      } else {
        throw e
      }
    }

    await writeFile(abs, plan.content)
    written.push(plan.relativePath)
  }

  return written
}
