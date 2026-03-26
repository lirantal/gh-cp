import { walkGithubContents } from '../github/contents-walk.ts'
import type { Logger } from '../logger.ts'
import { runCmd, runCmdRaw } from '../run-cmd.ts'
import {
  failureKindFromMessage,
  isEnoent,
  okPlans,
  strategyFail,
  type StrategyResult
} from '../strategy-result.ts'

export async function copyViaGhApi (opts: {
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
  log: Logger
}): Promise<StrategyResult> {
  const getJson = async (apiPath: string): Promise<unknown> => {
    let r
    try {
      r = await runCmd('gh', [
        'api',
        '-H',
        'Accept: application/vnd.github+json',
        apiPath
      ])
    } catch (e) {
      if (isEnoent(e)) {
        throw Object.assign(new Error('gh not found'), { code: 'ENOENT' })
      }
      throw e
    }
    if (r.code !== 0) {
      const msg = r.stderr.trim() || `gh api failed (${String(r.code)})`
      throw new Error(msg)
    }
    if (r.stdout.trim().length === 0) {
      return null
    }
    return JSON.parse(r.stdout) as unknown
  }

  const getFileBuffer = async (fileApiPath: string): Promise<Buffer> => {
    let r
    try {
      r = await runCmdRaw('gh', [
        'api',
        '-H',
        'Accept: application/vnd.github.raw',
        fileApiPath
      ])
    } catch (e) {
      if (isEnoent(e)) {
        throw Object.assign(new Error('gh not found'), { code: 'ENOENT' })
      }
      throw e
    }
    if (r.code !== 0) {
      const msg = r.stderr.trim() || `gh api raw failed (${String(r.code)})`
      throw new Error(msg)
    }
    return r.stdout
  }

  try {
    const plans = await walkGithubContents({
      owner: opts.owner,
      repo: opts.repo,
      ref: opts.ref,
      sourceRootInRepo: opts.repoPath,
      log: opts.log,
      getJson,
      getFileBuffer
    })
    return okPlans(plans)
  } catch (e) {
    if (isEnoent(e)) {
      return strategyFail(
        'gh-api',
        'missing-tool',
        'gh is not installed or not on PATH.'
      )
    }
    const msg = e instanceof Error ? e.message : String(e)
    opts.log.verbose(`gh api strategy failed: ${msg}`)
    const kind = failureKindFromMessage(msg)
    return strategyFail('gh-api', kind, msg)
  }
}
