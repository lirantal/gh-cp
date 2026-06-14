import type { Aliases } from './aliases-store.ts'

export interface AliasListItem {
  name: string
  sourceSpec: string
}

export function toAliasListItems (aliases: Aliases): AliasListItem[] {
  return Object.entries(aliases)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, sourceSpec]) => ({ name, sourceSpec }))
}

export function formatAliasList (aliases: Aliases): string {
  const items = toAliasListItems(aliases)
  if (items.length === 0) {
    return "No aliases saved. Run 'gh-cp alias <name> <source>' first.\n"
  }

  const nameWidth = Math.max(...items.map((item) => item.name.length))
  return `${items
    .map((item) => `${item.name.padEnd(nameWidth)}  ${item.sourceSpec}`)
    .join('\n')}\n`
}
