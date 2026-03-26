import { walkGithubContents } from '../github/contents-walk.ts'
import type { Logger } from '../logger.ts'
import { runCmd, runCmdRaw } from '../run-cmd.ts'
import type { WritePlan } from '../safe-write.ts'

export async function copyViaGhApi (opts: {
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
  log: Logger
}): Promise<WritePlan[] | null> {
  const getJson = async (apiPath: string): Promise<unknown> => {
    const r = await runCmd('gh', [
      'api',
      '-H',
      'Accept: application/vnd.github+json',
      apiPath
    ])
    if (r.code !== 0) {
      throw new Error(r.stderr.trim() || `gh api failed (${r.code})`)
    }
    if (r.stdout.trim().length === 0) {
      return null
    }
    return JSON.parse(r.stdout) as unknown
  }

  const getFileBuffer = async (fileApiPath: string): Promise<Buffer> => {
    const r = await runCmdRaw('gh', [
      'api',
      '-H',
      'Accept: application/vnd.github.raw',
      fileApiPath
    ])
    if (r.code !== 0) {
      throw new Error(r.stderr.trim() || `gh api raw failed (${r.code})`)
    }
    return r.stdout
  }

  try {
    return await walkGithubContents({
      owner: opts.owner,
      repo: opts.repo,
      ref: opts.ref,
      sourceRootInRepo: opts.repoPath,
      log: opts.log,
      getJson,
      getFileBuffer
    })
  } catch (e) {
    opts.log.verbose(`gh api strategy failed: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}
