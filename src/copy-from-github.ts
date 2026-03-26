import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createLogger, type Logger } from './logger.ts'
import { parseSourceSpec } from './parse-source-spec.ts'
import { applyWritePlan, type WritePlan } from './safe-write.ts'
import { copyViaGhApi } from './strategies/gh-api.ts'
import { copyViaGitSparse } from './strategies/git-sparse.ts'
import { copyViaHttpsApi } from './strategies/https-api.ts'
import {
  CopyFromGithubError,
  formatAllStrategiesFailed,
  selectBestFailure,
  type StrategyFailure
} from './strategy-result.ts'

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
): Promise<{ strategy: FetchStrategyName; plans: WritePlan[] }> {
  const failures: StrategyFailure[] = []
  for (const name of order) {
    const res =
      name === 'gh-api'
        ? await copyViaGhApi(ctx)
        : name === 'git'
          ? await copyViaGitSparse(ctx)
          : await copyViaHttpsApi(ctx)
    if (res.ok) {
      return { strategy: name, plans: res.plans }
    }
    failures.push(res.failure)
  }
  const best = selectBestFailure(failures)
  throw new CopyFromGithubError(
    best,
    formatAllStrategiesFailed(best, {
      owner: ctx.owner,
      repo: ctx.repo,
      repoPath: ctx.repoPath,
      ref: ctx.ref
    })
  )
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
