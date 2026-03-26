import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  CopyFromGithubError,
  failureKindFromMessage,
  formatAllStrategiesFailed,
  selectBestFailure,
  type StrategyFailure
} from '../src/strategy-result.ts'

describe('failureKindFromMessage', () => {
  test('404 and not-found patterns', () => {
    assert.strictEqual(
      failureKindFromMessage('GitHub API 404: missing'),
      'not-found'
    )
    assert.strictEqual(
      failureKindFromMessage('HTTP 404: Not Found'),
      'not-found'
    )
  })

  test('auth patterns', () => {
    assert.strictEqual(
      failureKindFromMessage('GitHub API 403: rate limit'),
      'auth'
    )
  })

  test('missing gh/git before generic not found', () => {
    assert.strictEqual(
      failureKindFromMessage('git not found on PATH'),
      'missing-tool'
    )
  })
})

describe('selectBestFailure', () => {
  test('prefers not-found over generic', () => {
    const failures: StrategyFailure[] = [
      { strategy: 'gh-api', kind: 'generic', message: 'x' },
      { strategy: 'https', kind: 'not-found', message: '404' }
    ]
    assert.strictEqual(selectBestFailure(failures).kind, 'not-found')
  })

  test('prefers auth over missing-tool', () => {
    const failures: StrategyFailure[] = [
      { strategy: 'git', kind: 'missing-tool', message: 'no git' },
      { strategy: 'https', kind: 'auth', message: '403' }
    ]
    assert.strictEqual(selectBestFailure(failures).kind, 'auth')
  })
})

describe('formatAllStrategiesFailed', () => {
  const ctx = {
    owner: 'o',
    repo: 'r',
    repoPath: 'nope/path',
    ref: 'main' as string | undefined
  }

  test('not-found mentions owner/repo/path/ref', () => {
    const text = formatAllStrategiesFailed(
      { strategy: 'https', kind: 'not-found', message: '404' },
      ctx
    )
    assert.match(text, /o\/r/)
    assert.match(text, /nope\/path/)
    assert.match(text, /ref: main/)
    assert.match(text, /Tried gh api/)
  })

  test('generic includes install hint', () => {
    const text = formatAllStrategiesFailed(
      { strategy: 'gh-api', kind: 'generic', message: 'something broke' },
      ctx
    )
    assert.match(text, /GITHUB_TOKEN/)
  })
})

describe('CopyFromGithubError', () => {
  test('includes trackable code in message', () => {
    const err = new CopyFromGithubError(
      { strategy: 'https', kind: 'not-found', message: '404' },
      'Path missing.'
    )
    assert.strictEqual(err.exitCode, 2)
    assert.match(err.message, /E2001/)
    assert.match(err.message, /Path missing/)
  })
})
