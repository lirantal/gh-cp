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

  test('parses github web blob path and infers ref', () => {
    const s = parseSourceSpec('lirantal/create-node-lib/blob/main/template/.npmrc')
    assert.strictEqual(s.repoPath, 'template/.npmrc')
    assert.strictEqual(s.refFromHash, 'main')
  })

  test('parses github web tree path and infers ref', () => {
    const s = parseSourceSpec('acme/widget/tree/release/docs')
    assert.strictEqual(s.repoPath, 'docs')
    assert.strictEqual(s.refFromHash, 'release')
  })

  test('parses github web tree path at repo root', () => {
    const s = parseSourceSpec('acme/widget/tree/main')
    assert.strictEqual(s.repoPath, '')
    assert.strictEqual(s.refFromHash, 'main')
  })

  test('uses hash ref over inferred blob ref', () => {
    const s = parseSourceSpec('acme/widget/blob/main/docs#stable')
    assert.strictEqual(s.repoPath, 'docs')
    assert.strictEqual(s.refFromHash, 'stable')
  })

  test('accepts full github.com URL source spec', () => {
    const s = parseSourceSpec('https://github.com/acme/widget/blob/main/docs/readme.md')
    assert.strictEqual(s.owner, 'acme')
    assert.strictEqual(s.repo, 'widget')
    assert.strictEqual(s.repoPath, 'docs/readme.md')
    assert.strictEqual(s.refFromHash, 'main')
  })

  test('rejects blob/tree syntax without ref segment', () => {
    assert.throws(
      () => parseSourceSpec('acme/widget/blob'),
      /expected owner\/repo\/blob\/<ref>\[\/path\]/
    )
    assert.throws(
      () => parseSourceSpec('acme/widget/tree'),
      /expected owner\/repo\/tree\/<ref>\[\/path\]/
    )
  })

  test('rejects too few segments', () => {
    assert.throws(() => parseSourceSpec('solo'), /Invalid source spec/)
  })

  test('encodeRepoContentPath encodes segments', () => {
    assert.strictEqual(encodeRepoContentPath('a b/c'), 'a%20b/c')
  })
})
