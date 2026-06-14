import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
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

  test('preserves executable file mode', async () => {
    const log = createLogger(false)
    await applyWritePlan(
      tmp,
      [{ relativePath: 'script.sh', content: Buffer.from('#!/bin/sh\n'), mode: 0o755 }],
      { force: false, dryRun: false, log }
    )
    const st = await stat(path.join(tmp, 'script.sh'))
    assert.strictEqual(st.mode & 0o777, 0o755)
  })

  test('updates mode when force overwrites existing file', async () => {
    const log = createLogger(false)
    const file = path.join(tmp, 'script.sh')
    await writeFile(file, 'old')
    await chmod(file, 0o755)

    await applyWritePlan(
      tmp,
      [{ relativePath: 'script.sh', content: Buffer.from('new'), mode: 0o644 }],
      { force: true, dryRun: false, log }
    )

    const st = await stat(file)
    assert.strictEqual(st.mode & 0o777, 0o644)
  })

  test('does not update mode during dry-run', async () => {
    const log = createLogger(false)
    const file = path.join(tmp, 'script.sh')
    await writeFile(file, 'old')
    await chmod(file, 0o644)

    await applyWritePlan(
      tmp,
      [{ relativePath: 'script.sh', content: Buffer.from('new'), mode: 0o755 }],
      { force: true, dryRun: true, log }
    )

    const st = await stat(file)
    assert.strictEqual(st.mode & 0o777, 0o644)
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
