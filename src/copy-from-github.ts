import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createLogger, type Logger } from './logger.ts'
import { parseSourceSpec } from './parse-source-spec.ts'
import { applyWritePlan, type WritePlan } from './safe-write.ts'
import { copyViaGhApi } from './strategies/gh-api.ts'
import { copyViaGitSparse } from './strategies/git-sparse.ts'
import { copyViaHttpsApi } from './strategies/https-api.ts'

export type FetchStrategyName = 'gh-api' | 'git' | 'https'

export interface CopyFromGithubOptions {
  sourceSpec: string
  destination: string
  /** Overrides `#ref` in the source spec when set */
  refOverride: string | undefined
  force: boolean
  dryRun: boolean
  verbose: boolean
}

export interface CopyFromGithubResult {
  strategy: FetchStrategyName
  written: string[]
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
}

async function tryStrategies (
  ctx: {
    owner: string
    repo: string
    repoPath: string
    ref: string | undefined
    log: Logger
  },
  order: readonly FetchStrategyName[]
): Promise<{ strategy: FetchStrategyName; plans: WritePlan[] } | null> {
  for (const name of order) {
    let plans: WritePlan[] | null = null
    if (name === 'gh-api') {
      plans = await copyViaGhApi(ctx)
    } else if (name === 'git') {
      plans = await copyViaGitSparse(ctx)
    } else {
      plans = await copyViaHttpsApi(ctx)
    }
    if (plans !== null) {
      return { strategy: name, plans }
    }
  }
  return null
}

export async function copyFromGithub (
  opts: CopyFromGithubOptions
): Promise<CopyFromGithubResult> {
  const spec = parseSourceSpec(opts.sourceSpec)
  const ref =
    opts.refOverride !== undefined && opts.refOverride.length > 0
      ? opts.refOverride
      : spec.refFromHash

  const log = createLogger(opts.verbose)
  const dest = path.resolve(opts.destination)

  log.verbose(`destination: ${dest}`)
  log.verbose(`resolved: ${spec.owner}/${spec.repo} path=${spec.repoPath || '.'} ref=${ref ?? '(default)'}`)

  const ctx = {
    owner: spec.owner,
    repo: spec.repo,
    repoPath: spec.repoPath,
    ref,
    log
  }

  const tried = await tryStrategies(ctx, ['gh-api', 'git', 'https'])
  if (tried === null) {
    throw new Error(
      'Could not copy from GitHub: gh api, git, and HTTPS API all failed. Install gh or git, or set GITHUB_TOKEN for private repos and rate limits.'
    )
  }

  log.verbose(`using strategy: ${tried.strategy}`)

  if (!opts.dryRun) {
    await mkdir(dest, { recursive: true })
  }

  const written = await applyWritePlan(dest, tried.plans, {
    force: opts.force,
    dryRun: opts.dryRun,
    log
  })

  return {
    strategy: tried.strategy,
    written,
    owner: spec.owner,
    repo: spec.repo,
    repoPath: spec.repoPath,
    ref
  }
}
