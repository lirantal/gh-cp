import { test, describe } from 'node:test'
import assert from 'node:assert'
import { formatAliasList, toAliasListItems } from '../src/alias-list-output.ts'

describe('alias list output', () => {
  test('sorts aliases by name for list output', () => {
    assert.deepStrictEqual(toAliasListItems({
      zed: 'o/z',
      alpha: 'o/a'
    }), [
      { name: 'alpha', sourceSpec: 'o/a' },
      { name: 'zed', sourceSpec: 'o/z' }
    ])
  })

  test('formats aliases in aligned columns', () => {
    assert.strictEqual(formatAliasList({
      zed: 'o/z',
      alpha: 'o/a'
    }), 'alpha  o/a\nzed    o/z\n')
  })

  test('formats empty aliases with next step', () => {
    assert.strictEqual(
      formatAliasList({}),
      "No aliases saved. Run 'gh-cp alias <name> <source>' first.\n"
    )
  })
})
