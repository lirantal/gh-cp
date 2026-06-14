import type { WritePlan } from '../safe-write.ts'
import { destRelativeFromRepoPath } from '../dest-relative.ts'
import { encodeRepoContentPath } from '../parse-source-spec.ts'
import type { Logger } from '../logger.ts'

export interface ContentDirEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  path: string
  name: string
  size?: number
  download_url: string | null
  url: string
  content?: string
  encoding?: string
}

export function gitFileModeToFsMode (mode: string): number | undefined {
  if (mode === '100755') {
    return 0o755
  }
  if (mode === '100644') {
    return 0o644
  }
  return undefined
}

export function treeFileModesFromResponse (data: unknown): Map<string, number> {
  const modes = new Map<string, number>()
  if (!isRecord(data) || data.truncated === true || !Array.isArray(data.tree)) {
    return modes
  }
  for (const entry of data.tree) {
    if (!isRecord(entry)) {
      continue
    }
    if (entry.type !== 'blob') {
      continue
    }
    if (typeof entry.path !== 'string' || typeof entry.mode !== 'string') {
      continue
    }
    const mode = gitFileModeToFsMode(entry.mode)
    if (mode !== undefined) {
      modes.set(entry.path, mode)
    }
  }
  return modes
}

function isRecord (v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function asDirEntries (data: unknown): ContentDirEntry[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data.filter((x): x is ContentDirEntry => {
    if (!isRecord(x)) {
      return false
    }
    const t = x.type
    return t === 'file' || t === 'dir' || t === 'symlink' || t === 'submodule'
  }) as ContentDirEntry[]
}

function buildContentsApiPath (
  owner: string,
  repo: string,
  pathInRepo: string,
  ref: string | undefined
): string {
  const base = `repos/${owner}/${repo}/contents`
  const suffix =
    pathInRepo.length === 0 ? '' : `/${encodeRepoContentPath(pathInRepo)}`
  const q = ref !== undefined && ref.length > 0 ? `?ref=${encodeURIComponent(ref)}` : ''
  return `${base}${suffix}${q}`
}

function buildGitTreeApiPath (
  owner: string,
  repo: string,
  ref: string
): string {
  return `repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
}

function defaultBranchFromRepoResponse (data: unknown): string | undefined {
  if (!isRecord(data)) {
    return undefined
  }
  return typeof data.default_branch === 'string' ? data.default_branch : undefined
}

export interface ContentsWalkDeps {
  owner: string
  repo: string
  ref: string | undefined
  sourceRootInRepo: string
  log: Logger
  getJson: (apiPath: string) => Promise<unknown>
  getFileBuffer: (apiPathForFile: string) => Promise<Buffer>
}

export async function walkGithubContents (deps: ContentsWalkDeps): Promise<WritePlan[]> {
  const plans: WritePlan[] = []
  const rootPath = deps.sourceRootInRepo
  let fileModesPromise: Promise<Map<string, number>> | undefined

  async function fileModes (): Promise<Map<string, number>> {
    fileModesPromise ??= (async () => {
      let treeRef = deps.ref
      if (treeRef === undefined || treeRef.length === 0) {
        const repoData = await deps.getJson(`repos/${deps.owner}/${deps.repo}`)
        treeRef = defaultBranchFromRepoResponse(repoData)
      }
      if (treeRef === undefined || treeRef.length === 0) {
        return new Map()
      }
      const data = await deps.getJson(buildGitTreeApiPath(deps.owner, deps.repo, treeRef))
      return treeFileModesFromResponse(data)
    })()
    return await fileModesPromise
  }

  async function visit (pathInRepo: string): Promise<void> {
    const apiPath = buildContentsApiPath(deps.owner, deps.repo, pathInRepo, deps.ref)
    const data = await deps.getJson(apiPath)
    if (data === null || data === undefined) {
      throw new Error(`Empty GitHub API response for ${pathInRepo || '(root)'}`)
    }

    if (Array.isArray(data)) {
      const entries = asDirEntries(data)
      for (const e of entries) {
        if (e.type === 'submodule' || e.type === 'symlink') {
          deps.log.verbose(`skip ${e.type}: ${e.path}`)
          continue
        }
        if (e.type === 'dir') {
          await visit(e.path)
        } else {
          await addFile(e.path)
        }
      }
      return
    }

    if (!isRecord(data)) {
      throw new Error('Unexpected GitHub API response')
    }
    const t = data.type
    if (t === 'file') {
      const p = typeof data.path === 'string' ? data.path : pathInRepo
      await addFile(p, data)
      return
    }
    deps.log.verbose(`skip unexpected content type ${String(t)} at ${pathInRepo}`)
  }

  async function addFile (filePathInRepo: string, fileObj?: Record<string, unknown>): Promise<void> {
    const rel = destRelativeFromRepoPath(filePathInRepo, rootPath)
    let buf: Buffer
    if (
      fileObj !== undefined &&
      typeof fileObj.content === 'string' &&
      fileObj.encoding === 'base64'
    ) {
      buf = Buffer.from(fileObj.content, 'base64')
    } else {
      const fileApi = buildContentsApiPath(deps.owner, deps.repo, filePathInRepo, deps.ref)
      buf = await deps.getFileBuffer(fileApi)
    }
    const modes = await fileModes()
    plans.push({ relativePath: rel, content: buf, mode: modes.get(filePathInRepo) })
  }

  await visit(rootPath)
  return plans
}
