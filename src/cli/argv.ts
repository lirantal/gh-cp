export interface ParsedArgv {
  help: boolean
  version: boolean
  verbose: boolean
  force: boolean
  dryRun: boolean
  json: boolean
  pathFlag: string | undefined
  refFlag: string | undefined
  positionals: string[]
}

export function parseArgv (argv: string[]): ParsedArgv {
  const out: ParsedArgv = {
    help: false,
    version: false,
    verbose: false,
    force: false,
    dryRun: false,
    json: false,
    pathFlag: undefined,
    refFlag: undefined,
    positionals: []
  }

  let i = 2
  while (i < argv.length) {
    const a = argv[i]
    if (a === undefined) {
      break
    }
    if (a === '--') {
      out.positionals.push(...argv.slice(i + 1))
      break
    }
    if (a === '-h' || a === '--help') {
      out.help = true
      i += 1
      continue
    }
    if (a === '-V' || a === '--version') {
      out.version = true
      i += 1
      continue
    }
    if (a === '-v' || a === '--verbose') {
      out.verbose = true
      i += 1
      continue
    }
    if (a === '-f' || a === '--force') {
      out.force = true
      i += 1
      continue
    }
    if (a === '--dry-run') {
      out.dryRun = true
      i += 1
      continue
    }
    if (a === '--json') {
      out.json = true
      i += 1
      continue
    }
    if (a === '--path') {
      const v = argv[i + 1]
      if (v === undefined || v.startsWith('-')) {
        throw new Error('--path requires a directory argument')
      }
      out.pathFlag = v
      i += 2
      continue
    }
    if (a === '--ref') {
      const v = argv[i + 1]
      if (v === undefined || v.startsWith('-')) {
        throw new Error('--ref requires a ref (branch, tag, or commit SHA)')
      }
      out.refFlag = v
      i += 2
      continue
    }
    if (a.startsWith('-')) {
      throw new Error(`Unknown option: ${a}`)
    }
    out.positionals.push(a)
    i += 1
  }

  return out
}

export interface ResolvedCliInput {
  sourceSpec: string
  destination: string
  ref: string | undefined
  help: boolean
  version: boolean
  verbose: boolean
  force: boolean
  dryRun: boolean
  json: boolean
}

export function resolveCliInput (parsed: ParsedArgv): ResolvedCliInput {
  if (parsed.help || parsed.version) {
    return {
      sourceSpec: '',
      destination: '.',
      ref: undefined,
      help: parsed.help,
      version: parsed.version,
      verbose: parsed.verbose,
      force: parsed.force,
      dryRun: parsed.dryRun,
      json: parsed.json
    }
  }

  const [sourceSpec, destPositional] = parsed.positionals
  if (sourceSpec === undefined || sourceSpec.length === 0) {
    throw new Error('Missing source: expected owner/repo[/path][#ref]')
  }

  const destination =
    parsed.pathFlag ?? destPositional ?? process.cwd()

  return {
    sourceSpec,
    destination,
    ref: parsed.refFlag,
    help: false,
    version: false,
    verbose: parsed.verbose,
    force: parsed.force,
    dryRun: parsed.dryRun,
    json: parsed.json
  }
}
