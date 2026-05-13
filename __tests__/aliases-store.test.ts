import { test, describe } from 'node:test'
import assert from 'node:assert'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  loadAliases,
  resolveAliasConfigDir,
  resolveAliasesFilePath,
  setAlias,
  validateAliasName,
  validateAliasSource
} from '../src/aliases-store.ts'

async function withTempDir (
  fn: (dir: string) => Promise<void>
): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gh-cp-aliases-'))
  try {
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('aliases store', () => {
  test('loads empty aliases when config file is missing', async () => {
    await withTempDir(async (dir) => {
      assert.deepStrictEqual(await loadAliases({ configDir: dir }), {})
    })
  })

  test('saves and loads an alias', async () => {
    await withTempDir(async (dir) => {
      const source =
        'github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/'
      await setAlias('devcontainer', source, { configDir: dir })

      assert.deepStrictEqual(await loadAliases({ configDir: dir }), {
        devcontainer: source
      })

      const raw = await readFile(resolveAliasesFilePath({ configDir: dir }), 'utf8')
      assert.match(raw, /"devcontainer"/)
      assert.match(raw, /create-node-lib/)
    })
  })

  test('uses GH_CP_CONFIG_DIR before XDG fallback', () => {
    const dir = resolveAliasConfigDir({
      env: {
        GH_CP_CONFIG_DIR: '/tmp/gh-cp-test-config',
        XDG_CONFIG_HOME: '/tmp/xdg-config'
      },
      homeDir: '/home/tester',
      platform: 'linux'
    })

    assert.strictEqual(dir, '/tmp/gh-cp-test-config')
  })

  test('uses XDG config home on unix platforms', () => {
    const dir = resolveAliasConfigDir({
      env: { XDG_CONFIG_HOME: '/tmp/xdg-config' },
      homeDir: '/home/tester',
      platform: 'linux'
    })

    assert.strictEqual(dir, '/tmp/xdg-config/gh-cp')
  })

  test('rejects invalid alias names and sources', () => {
    assert.throws(() => validateAliasName('-bad'), /Invalid alias name/)
    assert.throws(() => validateAliasSource('not-a-repo'), /Invalid alias source/)
  })

  test('reports invalid JSON shape', async () => {
    await withTempDir(async (dir) => {
      await writeFile(resolveAliasesFilePath({ configDir: dir }), '[]\n', 'utf8')

      await assert.rejects(
        async () => await loadAliases({ configDir: dir }),
        /must be a JSON object/
      )
    })
  })
})
