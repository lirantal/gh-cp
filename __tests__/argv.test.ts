import { test, describe } from 'node:test'
import assert from 'node:assert'
import { parseArgv, resolveCliInput } from '../src/cli/argv.ts'

describe('parseArgv', () => {
  test('parses flags and positionals', () => {
    const p = parseArgv([
      'node',
      'cli',
      '--verbose',
      '--force',
      'o/r/p',
      'out'
    ])
    assert.strictEqual(p.verbose, true)
    assert.strictEqual(p.force, true)
    assert.deepStrictEqual(p.positionals, ['o/r/p', 'out'])
  })

  test('--path overrides destination positional', () => {
    const p = parseArgv([
      'node',
      'cli',
      'o/r',
      'ignored',
      '--path',
      'real-out'
    ])
    const r = resolveCliInput(p)
    assert.strictEqual(r.destination, 'real-out')
  })

  test('-- after which collects rest as positionals', () => {
    const p = parseArgv(['node', 'cli', '--', 'o/r', '-weird'])
    assert.deepStrictEqual(p.positionals, ['o/r', '-weird'])
  })

  test('unknown option throws', () => {
    assert.throws(() => parseArgv(['node', 'cli', '--nope']), /Unknown option/)
  })
})
