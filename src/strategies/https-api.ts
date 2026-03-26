import { walkGithubContents } from '../github/contents-walk.ts'
import type { Logger } from '../logger.ts'
import {
  failureKindFromMessage,
  okPlans,
  strategyFail,
  type StrategyResult
} from '../strategy-result.ts'

const API_BASE = 'https://api.github.com/'
const API_VERSION = '2022-11-28'

function authHeaders (): Record<string, string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'gh-cp-cli'
  }
  if (token !== undefined && token.length > 0) {
    h.Authorization = `Bearer ${token}`
  }
  return h
}

export async function copyViaHttpsApi (opts: {
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
  log: Logger
}): Promise<StrategyResult> {
  const getJson = async (apiPath: string): Promise<unknown> => {
    const url = new URL(apiPath, API_BASE)
    const res = await fetch(url, { headers: authHeaders() })
    if (res.status === 403 || res.status === 401) {
      const t = await res.text()
      throw new Error(
        `GitHub API ${String(res.status)}: ${t.slice(0, 200)} — use gh auth login, git, or set GITHUB_TOKEN`
      )
    }
    if (res.status === 404) {
      throw new Error(
        'GitHub API 404: repository, path, or ref not found'
      )
    }
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`GitHub API ${String(res.status)}: ${t.slice(0, 200)}`)
    }
    return await res.json() as unknown
  }

  const getFileBuffer = async (fileApiPath: string): Promise<Buffer> => {
    const url = new URL(fileApiPath, API_BASE)
    const headers = {
      ...authHeaders(),
      Accept: 'application/vnd.github.raw'
    }
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`GitHub raw fetch ${String(res.status)}: ${t.slice(0, 200)}`)
    }
    return Buffer.from(await res.arrayBuffer())
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
    const msg = e instanceof Error ? e.message : String(e)
    opts.log.verbose(`HTTPS API strategy failed: ${msg}`)
    const kind = failureKindFromMessage(msg)
    return strategyFail('https', kind, msg)
  }
}
