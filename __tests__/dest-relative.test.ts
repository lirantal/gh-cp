import { test, describe } from 'node:test'
import assert from 'node:assert'
import { destRelativeFromRepoPath } from '../src/dest-relative.ts'

describe('destRelativeFromRepoPath', () => {
  test('root repo file stays relative to dest root', () => {
    assert.strictEqual(destRelativeFromRepoPath('README.md', ''), 'README.md')
  })

  test('subfolder mirrors cp -r repo/.devcontainer .', () => {
    assert.strictEqual(
      destRelativeFromRepoPath('.devcontainer/Dockerfile', '.devcontainer'),
      '.devcontainer/Dockerfile'
    )
  })

  test('single file at source root uses basename', () => {
    assert.strictEqual(
      destRelativeFromRepoPath('path/to/LICENSE', 'path/to/LICENSE'),
      'LICENSE'
    )
  })
})
