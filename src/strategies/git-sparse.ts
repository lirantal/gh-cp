import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { destRelativeFromRepoPath } from '../dest-relative.ts'
import type { Logger } from '../logger.ts'
import { runCmd } from '../run-cmd.ts'
import type { WritePlan } from '../safe-write.ts'
import {
  failureKindFromMessage,
  isEnoent,
  okPlans,
  strategyFail,
  type StrategyResult
} from '../strategy-result.ts'

function looksLikeSha (ref: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(ref)
}

async function collectFilesRecursive (
  absDir: string,
  baseRel: string,
  out: { abs: string; relPosix: string }[]
): Promise<void> {
  const entries = await readdir(absDir, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === '.git') {
      continue
    }
    const abs = path.join(absDir, ent.name)
    const rel = baseRel.length === 0 ? ent.name : `${baseRel}/${ent.name}`
    if (ent.isDirectory()) {
      await collectFilesRecursive(abs, rel, out)
    } else if (ent.isFile()) {
      out.push({ abs, relPosix: rel.split(path.sep).join('/') })
    }
  }
}

async function runGit (
  args: string[]
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  try {
    return await runCmd('git', args)
  } catch (e) {
    if (isEnoent(e)) {
      throw Object.assign(new Error('git not found on PATH'), {
        code: 'ENOENT'
      })
    }
    throw e
  }
}

export async function copyViaGitSparse (opts: {
  owner: string
  repo: string
  repoPath: string
  ref: string | undefined
  log: Logger
}): Promise<StrategyResult> {
  const url = `https://github.com/${opts.owner}/${opts.repo}.git`
  const tmpBase = await mkdtemp(path.join(os.tmpdir(), 'gh-cp-'))
  const repoDir = path.join(tmpBase, 'repo')

  try {
    if (opts.repoPath.length === 0) {
      const cloneArgs = ['clone', '--depth', '1']
      if (opts.ref !== undefined && opts.ref.length > 0) {
        if (looksLikeSha(opts.ref)) {
          const r = await runGit([
            'clone',
            '--filter=blob:none',
            url,
            repoDir
          ])
          if (r.code !== 0) {
            throw new Error(r.stderr.trim() || 'git clone failed')
          }
          const f = await runGit([
            '-C',
            repoDir,
            'fetch',
            '--depth',
            '1',
            'origin',
            opts.ref
          ])
          if (f.code !== 0) {
            throw new Error(f.stderr.trim() || 'git fetch failed')
          }
          const co = await runGit(['-C', repoDir, 'checkout', opts.ref])
          if (co.code !== 0) {
            throw new Error(co.stderr.trim() || 'git checkout failed')
          }
        } else {
          cloneArgs.push('-b', opts.ref)
          cloneArgs.push(url, repoDir)
          const r = await runGit(cloneArgs)
          if (r.code !== 0) {
            throw new Error(r.stderr.trim() || 'git clone failed')
          }
        }
      } else {
        cloneArgs.push(url, repoDir)
        const r = await runGit(cloneArgs)
        if (r.code !== 0) {
          throw new Error(r.stderr.trim() || 'git clone failed')
        }
      }
    } else {
      const r = await runGit([
        'clone',
        '--filter=blob:none',
        '--sparse',
        '--depth',
        '1',
        ...(opts.ref !== undefined && opts.ref.length > 0 && !looksLikeSha(opts.ref)
          ? ['-b', opts.ref]
          : []),
        url,
        repoDir
      ])
      if (r.code !== 0) {
        throw new Error(r.stderr.trim() || 'git sparse clone failed')
      }
      if (opts.ref !== undefined && opts.ref.length > 0 && looksLikeSha(opts.ref)) {
        const f = await runGit([
          '-C',
          repoDir,
          'fetch',
          '--depth',
          '1',
          'origin',
          opts.ref
        ])
        if (f.code !== 0) {
          throw new Error(f.stderr.trim() || 'git fetch failed')
        }
        const co = await runGit(['-C', repoDir, 'checkout', opts.ref])
        if (co.code !== 0) {
          throw new Error(co.stderr.trim() || 'git checkout failed')
        }
      }
      const sparsePath = opts.repoPath.startsWith('/')
        ? opts.repoPath
        : `/${opts.repoPath.replace(/\/+$/, '')}`
      const sp = await runGit([
        '-C',
        repoDir,
        'sparse-checkout',
        'set',
        '--no-cone',
        sparsePath
      ])
      if (sp.code !== 0) {
        throw new Error(sp.stderr.trim() || 'git sparse-checkout set failed')
      }
    }

    const sourceFsRoot =
      opts.repoPath.length === 0 ? repoDir : path.join(repoDir, opts.repoPath)
    let st
    try {
      st = await stat(sourceFsRoot)
    } catch {
      throw new Error(`Path not found in clone: ${opts.repoPath || '(root)'}`)
    }

    const plans: WritePlan[] = []

    if (st.isFile()) {
      const buf = await readFile(sourceFsRoot)
      const rel = destRelativeFromRepoPath(opts.repoPath, opts.repoPath)
      plans.push({ relativePath: rel, content: buf })
      return okPlans(plans)
    }

    if (!st.isDirectory()) {
      throw new Error(`Unsupported filesystem node at ${opts.repoPath}`)
    }

    const files: { abs: string; relPosix: string }[] = []
    await collectFilesRecursive(sourceFsRoot, '', files)

    for (const f of files) {
      const fullRepoPath =
        opts.repoPath.length === 0
          ? f.relPosix
          : `${opts.repoPath.replace(/\/+$/, '')}/${f.relPosix}`
      const rel = destRelativeFromRepoPath(fullRepoPath, opts.repoPath)
      const buf = await readFile(f.abs)
      plans.push({ relativePath: rel, content: buf })
    }

    return okPlans(plans)
  } catch (e) {
    if (isEnoent(e)) {
      return strategyFail(
        'git',
        'missing-tool',
        'git is not installed or not on PATH.'
      )
    }
    const msg = e instanceof Error ? e.message : String(e)
    opts.log.verbose(`git sparse strategy failed: ${msg}`)
    if (msg.startsWith('Path not found in clone:')) {
      return strategyFail('git', 'not-found', msg)
    }
    const kind = failureKindFromMessage(msg)
    return strategyFail('git', kind, msg)
  } finally {
    try {
      await rm(tmpBase, { recursive: true, force: true })
    } catch {
      opts.log.verbose(`could not remove temp dir ${tmpBase}`)
    }
  }
}
