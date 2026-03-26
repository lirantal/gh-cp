import path from 'node:path'

/**
 * Map a repository file path to a path relative to the user's destination directory,
 * mirroring `cp -r owner/repo/.devcontainer .` → `./.devcontainer/...`.
 */
export function destRelativeFromRepoPath (
  repoFilePath: string,
  sourceRootInRepo: string
): string {
  const norm = (s: string): string =>
    s.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const rf = norm(repoFilePath)
  const root = norm(sourceRootInRepo)
  if (root.length === 0) {
    return rf
  }
  if (rf === root) {
    return path.posix.basename(rf)
  }
  const prefix = root + '/'
  if (rf.startsWith(prefix)) {
    return path.posix.join(path.posix.basename(root), rf.slice(prefix.length))
  }
  throw new Error(`Path "${repoFilePath}" is not under source root "${sourceRootInRepo}"`)
}
