/** Count distinct directory prefixes implied by written relative paths (POSIX-style). */
export function countDistinctDirectories (written: string[]): number {
  const dirs = new Set<string>()
  for (const rel of written) {
    const norm = rel.replace(/\\/g, '/')
    const parts = norm.split('/')
    parts.pop()
    let acc = ''
    for (const p of parts) {
      acc = acc.length === 0 ? p : `${acc}/${p}`
      dirs.add(acc)
    }
  }
  return dirs.size
}

export function formatCopySuccessLine (opts: {
  written: string[]
  dryRun: boolean
}): string {
  const n = opts.written.length
  const d = countDistinctDirectories(opts.written)
  const files =
    n === 1 ? '1 file' : `${String(n)} files`
  const dirs =
    d === 1 ? '1 directory' : `${String(d)} directories`
  if (opts.dryRun) {
    return `✔︎ dry-run: would copy ${files}, ${dirs}`
  }
  return `✔︎ copied ${files}, ${dirs}`
}
