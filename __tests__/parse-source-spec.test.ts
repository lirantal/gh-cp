import { test, describe } from 'node:test'
import assert from 'node:assert'
import { encodeRepoContentPath, parseSourceSpec } from '../src/parse-source-spec.ts'

describe('parseSourceSpec', () => {
  test('parses owner/repo only', () => {
    const s = parseSourceSpec('acme/widget')
    assert.strictEqual(s.owner, 'acme')
    assert.strictEqual(s.repo, 'widget')
    assert.strictEqual(s.repoPath, '')
    assert.strictEqual(s.refFromHash, undefined)
  })

  test('parses nested path and ref from last #', () => {
    const s = parseSourceSpec('acme/widget/.github/workflows#main')
    assert.strictEqual(s.owner, 'acme')
    assert.strictEqual(s.repo, 'widget')
    assert.strictEqual(s.repoPath, '.github/workflows')
    assert.strictEqual(s.refFromHash, 'main')
  })

  test('trims and strips ./ from path', () => {
    const s = parseSourceSpec('  acme/widget/./docs/ ')
    assert.strictEqual(s.repoPath, 'docs')
  })

  test('rejects too few segments', () => {
    assert.throws(() => parseSourceSpec('solo'), /Invalid source spec/)
  })

  test('encodeRepoContentPath encodes segments', () => {
    assert.strictEqual(encodeRepoContentPath('a b/c'), 'a%20b/c')
  })
})
