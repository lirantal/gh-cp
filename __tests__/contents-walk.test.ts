import { test, describe } from 'node:test'
import assert from 'node:assert'
import { walkGithubContents } from '../src/github/contents-walk.ts'
import { createLogger } from '../src/logger.ts'

describe('walkGithubContents', () => {
  test('attaches file modes from Git tree metadata', async () => {
    const jsonCalls: string[] = []
    const plans = await walkGithubContents({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      sourceRootInRepo: 'scripts',
      log: createLogger(false),
      async getJson (apiPath) {
        jsonCalls.push(apiPath)
        if (apiPath === 'repos/owner/repo/contents/scripts?ref=main') {
          return [
            {
              type: 'file',
              path: 'scripts/run.sh',
              name: 'run.sh',
              download_url: null,
              url: 'https://api.github.test/run.sh'
            },
            {
              type: 'file',
              path: 'scripts/readme.txt',
              name: 'readme.txt',
              download_url: null,
              url: 'https://api.github.test/readme.txt'
            }
          ]
        }
        if (apiPath === 'repos/owner/repo/git/trees/main?recursive=1') {
          return {
            tree: [
              { type: 'blob', path: 'scripts/run.sh', mode: '100755' },
              { type: 'blob', path: 'scripts/readme.txt', mode: '100644' }
            ]
          }
        }
        throw new Error(`unexpected JSON request: ${apiPath}`)
      },
      async getFileBuffer (apiPathForFile) {
        return Buffer.from(apiPathForFile)
      }
    })

    assert.deepStrictEqual(
      plans.map((plan) => ({
        relativePath: plan.relativePath,
        mode: plan.mode
      })),
      [
        { relativePath: 'scripts/run.sh', mode: 0o755 },
        { relativePath: 'scripts/readme.txt', mode: 0o644 }
      ]
    )
    assert.strictEqual(
      jsonCalls.filter((call) => call.includes('/git/trees/')).length,
      1
    )
  })
})
