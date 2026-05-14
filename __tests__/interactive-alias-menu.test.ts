import { test, describe } from 'node:test'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import {
  formatAliasMenu,
  moveSelection,
  selectAliasInteractively,
  toAliasMenuItems
} from '../src/interactive-alias-menu.ts'

class FakeInput extends EventEmitter {
  isRaw = false
  isTTY = true
  paused = true

  isPaused (): boolean {
    return this.paused
  }

  pause (): this {
    this.paused = true
    return this
  }

  resume (): this {
    this.paused = false
    return this
  }

  setRawMode (mode: boolean): this {
    this.isRaw = mode
    return this
  }
}

class FakeOutput {
  isTTY = true
  text = ''

  write (chunk: string): boolean {
    this.text += chunk
    return true
  }
}

describe('interactive alias menu', () => {
  test('moves selection with wraparound', () => {
    assert.strictEqual(moveSelection(0, 3, 1), 1)
    assert.strictEqual(moveSelection(0, 3, -1), 2)
    assert.strictEqual(moveSelection(2, 3, 1), 0)
    assert.strictEqual(moveSelection(0, 0, 1), 0)
  })

  test('sorts aliases by name', () => {
    assert.deepStrictEqual(toAliasMenuItems({
      zed: 'o/z',
      alpha: 'o/a'
    }), [
      { name: 'alpha', sourceSpec: 'o/a' },
      { name: 'zed', sourceSpec: 'o/z' }
    ])
  })

  test('formats menu with selected item and destination', () => {
    const output = formatAliasMenu([
      { name: 'alpha', sourceSpec: 'o/a' },
      { name: 'zed', sourceSpec: 'o/z' }
    ], 1, '.')

    assert.match(output, /\? Select a saved gh-cp source/)
    assert.match(output, /  alpha\n  o\/a/)
    assert.match(output, /> zed\n  o\/z/)
    assert.match(output, /Destination: \./)
  })

  test('releases stdin after selecting an alias', async () => {
    const input = new FakeInput()
    const output = new FakeOutput()
    const selected = selectAliasInteractively([
      { name: 'alpha', sourceSpec: 'o/a' }
    ], '.', input as unknown as NodeJS.ReadStream, output as NodeJS.WriteStream)

    input.emit('keypress', '', { name: 'return' })

    assert.deepStrictEqual(await selected, { name: 'alpha', sourceSpec: 'o/a' })
    assert.strictEqual(input.isRaw, false)
    assert.strictEqual(input.paused, true)
  })

  test('always pauses stdin after selection', async () => {
    const input = new FakeInput()
    input.paused = false
    const output = new FakeOutput()
    const selected = selectAliasInteractively([
      { name: 'alpha', sourceSpec: 'o/a' }
    ], '.', input as unknown as NodeJS.ReadStream, output as NodeJS.WriteStream)

    input.emit('keypress', '', { name: 'return' })

    assert.deepStrictEqual(await selected, { name: 'alpha', sourceSpec: 'o/a' })
    assert.strictEqual(input.paused, true)
  })
})
