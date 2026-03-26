import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { assertSafeUnderDest, applyWritePlan } from '../src/safe-write.ts'
import { createLogger } from '../src/logger.ts'

describe('assertSafeUnderDest', () => {
  test('allows normal relative paths', () => {
    const d = path.join(os.tmpdir(), 'gh-cp-safe')
    const r = assertSafeUnderDest(d, 'a/b.txt')
    assert.ok(r.startsWith(path.resolve(d)))
  })

  test('rejects parent escape', () => {
    assert.throws(
      () => assertSafeUnderDest('/tmp/out', '../etc/passwd'),
      /Unsafe path/
    )
  })
})

describe('applyWritePlan', () => {
  let tmp: string
  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'gh-cp-wr-'))
  })
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  test('writes files', async () => {
    const log = createLogger(false)
    const written = await applyWritePlan(
      tmp,
      [{ relativePath: 'x/y.txt', content: Buffer.from('hi') }],
      { force: false, dryRun: false, log }
    )
    assert.deepStrictEqual(written, ['x/y.txt'])
  })

  test('refuses overwrite without force', async () => {
    const log = createLogger(false)
    await writeFile(path.join(tmp, 'a.txt'), 'old')
    await assert.rejects(
      applyWritePlan(
        tmp,
        [{ relativePath: 'a.txt', content: Buffer.from('new') }],
        { force: false, dryRun: false, log }
      ),
      /already exists/
    )
  })
})
