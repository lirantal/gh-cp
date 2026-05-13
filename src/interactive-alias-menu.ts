import * as readline from 'node:readline'

export interface AliasMenuItem {
  name: string
  sourceSpec: string
}

interface KeypressKey {
  ctrl?: boolean
  name?: string
}

type KeypressHandler = (str: string, key: KeypressKey) => void

type MenuInput = NodeJS.ReadStream
type MenuOutput = NodeJS.WriteStream

export function moveSelection (
  current: number,
  count: number,
  delta: number
): number {
  if (count <= 0) {
    return 0
  }
  return (current + delta + count) % count
}

export function toAliasMenuItems (
  aliases: Record<string, string>
): AliasMenuItem[] {
  return Object.entries(aliases)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, sourceSpec]) => ({ name, sourceSpec }))
}

export function formatAliasMenu (
  items: readonly AliasMenuItem[],
  selectedIndex: number,
  destination: string
): string {
  const lines = [
    '? Select a saved gh-cp source',
    '  Use Up/Down or j/k to move, Enter to install',
    ''
  ]

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item === undefined) {
      continue
    }
    const marker = i === selectedIndex ? '>' : ' '
    lines.push(`${marker} ${item.name}`)
    lines.push(`  ${item.sourceSpec}`)
    lines.push('')
  }

  lines.push(`Destination: ${destination}`)
  return `${lines.join('\n')}\n`
}

export async function selectAliasInteractively (
  items: readonly AliasMenuItem[],
  destination: string,
  input: MenuInput = process.stdin,
  output: MenuOutput = process.stdout
): Promise<AliasMenuItem | undefined> {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      'Interactive install requires a TTY. Pass an alias name, ' +
      'for example: gh-cp install <alias-name>.'
    )
  }
  if (items.length === 0) {
    return undefined
  }

  let selectedIndex = 0
  let lastLineCount = 0
  const wasRaw = input.isRaw === true

  function render (): void {
    const view = formatAliasMenu(items, selectedIndex, destination)
    if (lastLineCount > 0) {
      readline.moveCursor(output, 0, -lastLineCount)
      readline.clearScreenDown(output)
    }
    output.write(view)
    lastLineCount = view.split('\n').length - 1
  }

  return await new Promise<AliasMenuItem | undefined>((resolve) => {
    let done = false

    const finish = (item: AliasMenuItem | undefined): void => {
      if (done) {
        return
      }
      done = true
      input.off('keypress', onKeypress)
      input.setRawMode(wasRaw)
      input.pause()
      output.write('\n')
      resolve(item)
    }

    const onKeypress: KeypressHandler = (_str, key) => {
      if (key.ctrl === true && key.name === 'c') {
        finish(undefined)
        process.kill(process.pid, 'SIGINT')
        return
      }
      if (key.name === 'escape') {
        finish(undefined)
        return
      }
      if (key.name === 'return' || key.name === 'enter') {
        finish(items[selectedIndex])
        return
      }
      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = moveSelection(selectedIndex, items.length, -1)
        render()
        return
      }
      if (key.name === 'down' || key.name === 'j') {
        selectedIndex = moveSelection(selectedIndex, items.length, 1)
        render()
      }
    }

    readline.emitKeypressEvents(input)
    input.on('keypress', onKeypress)
    input.setRawMode(true)
    input.resume()
    render()
  })
}
