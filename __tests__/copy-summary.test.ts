import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  countDistinctDirectories,
  formatCopySuccessLine
} from '../src/copy-summary.ts'

describe('countDistinctDirectories', () => {
  test('counts nested path prefixes once each', () => {
    assert.strictEqual(
      countDistinctDirectories(['a/b/c.txt', 'a/d.txt']),
      2
    )
  })

  test('flat files share one directory', () => {
    assert.strictEqual(countDistinctDirectories(['a/x', 'a/y']), 1)
  })

  test('root-level files only', () => {
    assert.strictEqual(countDistinctDirectories(['x.txt', 'y.txt']), 0)
  })
})

describe('formatCopySuccessLine', () => {
  test('singular and plural files/dirs', () => {
    assert.strictEqual(
      formatCopySuccessLine({ written: ['f.txt'], dryRun: false }),
      '✔︎ copied 1 file, 0 directories'
    )
    assert.strictEqual(
      formatCopySuccessLine({
        written: ['a/x', 'b/y'],
        dryRun: false
      }),
      '✔︎ copied 2 files, 2 directories'
    )
  })

  test('dry-run prefix', () => {
    assert.match(
      formatCopySuccessLine({ written: ['z'], dryRun: true }),
      /^✔︎ dry-run: would copy /
    )
  })
})
