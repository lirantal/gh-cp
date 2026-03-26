/**
 * Parse `owner/repo[/path][#ref]` (ref from `#` is overridden by CLI `--ref` when set).
 */
export interface ParsedSourceSpec {
  owner: string
  repo: string
  repoPath: string
  refFromHash: string | undefined
}

function isValidGithubName (name: string, maxLen: number): boolean {
  if (name.length === 0 || name.length > maxLen) {
    return false
  }
  if (!/^[a-zA-Z0-9]/.test(name) || !/[a-zA-Z0-9]$/.test(name)) {
    return false
  }
  return /^[a-zA-Z0-9._-]+$/.test(name)
}

export function parseSourceSpec (raw: string): ParsedSourceSpec {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error('Source spec is empty')
  }

  let remainder = trimmed
  let refFromHash: string | undefined
  const hashIdx = remainder.lastIndexOf('#')
  if (hashIdx >= 0) {
    refFromHash = remainder.slice(hashIdx + 1).trim()
    remainder = remainder.slice(0, hashIdx).trim()
    if (refFromHash.length === 0) {
      refFromHash = undefined
    }
  }

  const segments = remainder.split('/').filter((s) => s.length > 0)
  if (segments.length < 2) {
    throw new Error(
      `Invalid source spec "${raw}": expected owner/repo[/path][#ref]`
    )
  }

  const owner = segments[0] ?? ''
  const repo = segments[1] ?? ''
  const rest = segments.slice(2)
  let repoPath = rest.join('/')
  repoPath = repoPath.replace(/^\.\/+/, '').replace(/\/+$/, '')

  if (!isValidGithubName(owner, 39)) {
    throw new Error(`Invalid GitHub owner "${owner}"`)
  }
  if (!isValidGithubName(repo, 100)) {
    throw new Error(`Invalid GitHub repository name "${repo}"`)
  }

  return { owner, repo, repoPath, refFromHash }
}

export function encodeRepoContentPath (repoPath: string): string {
  if (repoPath.length === 0) {
    return ''
  }
  return repoPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}
