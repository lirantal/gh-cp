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
    plans.push({ relativePath: rel, content: buf })
  }

  await visit(rootPath)
  return plans
}
