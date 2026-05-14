import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  parseArgv,
  resolveCliCommand,
  resolveCliInput
} from '../src/cli/argv.ts'

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

  test('resolves alias command', () => {
    const command = resolveCliCommand(parseArgv([
      'node',
      'cli',
      'alias',
      'devcontainer',
      'github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/'
    ]))

    assert.strictEqual(command.command, 'alias')
    assert.strictEqual(command.aliasName, 'devcontainer')
    assert.strictEqual(
      command.sourceSpec,
      'github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/'
    )
  })

  test('resolves install command with destination', () => {
    const command = resolveCliCommand(parseArgv([
      'node',
      'cli',
      'install',
      'devcontainer',
      'out',
      '--force',
      '--ref',
      'main'
    ]))

    assert.strictEqual(command.command, 'install')
    assert.strictEqual(command.aliasName, 'devcontainer')
    assert.strictEqual(command.destination, 'out')
    assert.strictEqual(command.force, true)
    assert.strictEqual(command.ref, 'main')
  })

  test('resolves interactive install command', () => {
    const command = resolveCliCommand(parseArgv([
      'node',
      'cli',
      'install',
      '--path',
      'out'
    ]))

    assert.strictEqual(command.command, 'install')
    assert.strictEqual(command.aliasName, undefined)
    assert.strictEqual(command.destination, 'out')
  })

  test('keeps direct copy as default command', () => {
    const command = resolveCliCommand(parseArgv([
      'node',
      'cli',
      'o/r/p',
      'out'
    ]))

    assert.strictEqual(command.command, 'copy')
    assert.strictEqual(command.sourceSpec, 'o/r/p')
    assert.strictEqual(command.destination, 'out')
  })

  test('rejects copy flags on alias command', () => {
    assert.throws(
      () => resolveCliCommand(parseArgv([
        'node',
        'cli',
        'alias',
        'dev',
        'o/r',
        '--json'
      ])),
      /Copy flags are not supported/
    )
  })
})
