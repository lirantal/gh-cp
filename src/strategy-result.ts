import type { WritePlan } from './safe-write.ts'

export type FailureKind = 'not-found' | 'auth' | 'missing-tool' | 'generic'

export type StrategyName = 'gh-api' | 'git' | 'https'

export interface StrategyFailure {
  strategy: StrategyName
  kind: FailureKind
  message: string
}

export type StrategyResult =
  | { ok: true; plans: WritePlan[] }
  | { ok: false; failure: StrategyFailure }

const KIND_TO_CODE: Record<FailureKind, string> = {
  'not-found': 'E2001',
  auth: 'E2002',
  'missing-tool': 'E2003',
  generic: 'E2004'
}

export function okPlans (plans: WritePlan[]): StrategyResult {
  return { ok: true, plans }
}

export function strategyFail (
  strategy: StrategyName,
  kind: FailureKind,
  message: string
): StrategyResult {
  return { ok: false, failure: { strategy, kind, message } }
}

/** Classify free-text errors from gh, git, or API messages. */
export function failureKindFromMessage (msg: string): FailureKind {
  const m = msg.toLowerCase()
  if (/\bgh\b not found|\bgit\b not found|command not found/.test(m)) {
    return 'missing-tool'
  }
  if (
    /(^|[^\d])404([^\d]|$)/.test(m) ||
    /\bnot found\b/.test(m) ||
    /repository.*not found/.test(m) ||
    /unknown revision/.test(m) ||
    /no such file/.test(m) ||
    /path not found/.test(m) ||
    /did not match any file/.test(m) ||
    /pathspec.*did not match/.test(m) ||
    /could not find remote branch/.test(m) ||
    /invalid refspec/.test(m) ||
    /is not a commit/.test(m)
  ) {
    return 'not-found'
  }
  if (
    /\b401\b/.test(m) ||
    /\b403\b/.test(m) ||
    /unauthorized/.test(m) ||
    /forbidden/.test(m) ||
    /authentication/.test(m) ||
    /bad credentials/.test(m) ||
    /rate limit/.test(m)
  ) {
    return 'auth'
  }
  return 'generic'
}

export function isEnoent (e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

export function selectBestFailure (failures: StrategyFailure[]): StrategyFailure {
  if (failures.length === 0) {
    return {
      strategy: 'https',
      kind: 'generic',
      message: 'No strategy produced a result.'
    }
  }
  const order: FailureKind[] = ['not-found', 'auth', 'missing-tool', 'generic']
  for (const kind of order) {
    const hit = failures.find(f => f.kind === kind)
    if (hit !== undefined) {
      return hit
    }
  }
  return failures[0] as StrategyFailure
}

export interface AggregateFailureContext {
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
}

export function formatAllStrategiesFailed (
  best: StrategyFailure,
  ctx: AggregateFailureContext
): string {
  const tried = 'Tried gh api, git, and HTTPS API.'
  const refBit =
    ctx.ref !== undefined && ctx.ref.length > 0 ? ` (ref: ${ctx.ref})` : ''
  const pathDisp =
    ctx.repoPath.length === 0 ? '.' : ctx.repoPath.replace(/^\/+/, '')

  if (best.kind === 'not-found') {
    return `Path or ref not found on GitHub: ${ctx.owner}/${ctx.repo} — ${pathDisp}${refBit}. ${tried}`
  }
  if (best.kind === 'auth') {
    return `${best.message} ${tried} For private repos or rate limits, use gh auth login, git over SSH/HTTPS, or set GITHUB_TOKEN.`
  }
  if (best.kind === 'missing-tool') {
    return `${best.message} ${tried} Install gh and/or git, or set GITHUB_TOKEN to use the HTTPS API.`
  }
  return `Could not copy from GitHub: ${best.message} ${tried} Install gh or git, or set GITHUB_TOKEN for private repos and rate limits.`
}

export class CopyFromGithubError extends Error {
  readonly code: string
  readonly exitCode: 2

  /** formattedMessage is user-facing body (code prefix added automatically). */
  constructor (best: StrategyFailure, formattedMessage: string) {
    const code = KIND_TO_CODE[best.kind]
    super(`Error (${code}): ${formattedMessage}`)
    this.name = 'CopyFromGithubError'
    this.code = code
    this.exitCode = 2
  }
}
