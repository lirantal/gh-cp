#!/usr/bin/env node
import { parseArgv, resolveCliInput } from '../cli/argv.ts'
import { formatCopySuccessLine } from '../copy-summary.ts'
import { copyFromGithub } from '../copy-from-github.ts'
import { CopyFromGithubError } from '../strategy-result.ts'
import { readCliVersion } from '../version.ts'

const HELP = `gh-cp — copy files or directories from a GitHub repository

Usage:
  gh-cp [options] <owner/repo[/path][#ref]> [destination]

The destination defaults to the current directory. Use --path to override the
optional second positional argument.

Examples:
  gh-cp lirantal/npq/.devcontainer .
  gh-cp lirantal/npq/.devcontainer --path ./vendor/gh
  gh-cp lirantal/create-node-lib/blob/main/template/.npmrc
  gh-cp lirantal/npq#main
  gh-cp lirantal/npq --ref v1.0.0

Options:
  -h, --help       Show this message
  -V, --version    Show version
  -v, --verbose    Log strategy and progress to stderr
  -f, --force      Overwrite existing files
      --dry-run    Show what would be written without writing
      --json       Print a JSON summary to stdout on success
      --path DIR   Output directory (overrides destination positional)
      --ref REF    Branch, tag, or SHA (overrides #ref in the source spec)

Exit codes:
  0  Success
  1  Usage or validation error
  2  All fetch strategies failed
`

async function main (): Promise<void> {
  let parsed
  try {
    parsed = parseArgv(process.argv)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    process.stderr.write(`gh-cp: ${msg}\n`)
    process.exitCode = 1
    return
  }

  if (parsed.help) {
    process.stdout.write(HELP)
    process.exitCode = 0
    return
  }

  if (parsed.version) {
    process.stdout.write(`${readCliVersion()}\n`)
    process.exitCode = 0
    return
  }

  let input
  try {
    input = resolveCliInput(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    process.stderr.write(`gh-cp: ${msg}\nTry 'gh-cp --help' for usage.\n`)
    process.exitCode = 1
    return
  }

  try {
    const result = await copyFromGithub({
      sourceSpec: input.sourceSpec,
      destination: input.destination,
      refOverride: input.ref,
      force: input.force,
      dryRun: input.dryRun,
      verbose: input.verbose
    })

    if (input.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            strategy: result.strategy,
            files: result.written,
            owner: result.owner,
            repo: result.repo,
            path: result.repoPath,
            ref: result.ref ?? null
          },
          null,
          input.verbose ? 2 : 0
        )}\n`
      )
    } else {
      process.stdout.write(
        `${formatCopySuccessLine({
          written: result.written,
          dryRun: input.dryRun
        })}\n`
      )
    }
    process.exitCode = 0
  } catch (e) {
    const version = readCliVersion()
    if (e instanceof CopyFromGithubError) {
      process.stderr.write(`gh-cp v${version} — ${e.message}\n`)
      process.exitCode = e.exitCode
      return
    }
    const msg = e instanceof Error ? e.message : String(e)
    process.stderr.write(`gh-cp v${version} — ${msg}\n`)
    process.exitCode = 1
  }
}

main().catch((e: unknown) => {
  const version = readCliVersion()
  const msg = e instanceof Error ? e.message : String(e)
  process.stderr.write(`gh-cp v${version} — ${msg}\n`)
  process.exit(1)
})
