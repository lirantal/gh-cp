# gh-cp documentation

**gh-cp** copies a file or directory from a GitHub repository into a local folder. It does not preserve git history; it only downloads the tree you ask for.

## Quick start

```sh
pnpm dlx gh-cp owner/repo/.devcontainer .
npx gh-cp owner/repo/README.md ./docs
```

See the [feature guides](./features/) for source syntax, flags, authentication order, and limitations.

## Compared to `git clone`

| Approach    | What you get                                                |
| ----------- | ----------------------------------------------------------- |
| `git clone` | Full repository, full history (unless shallow)              |
| **gh-cp**   | A snapshot of one path (file or subtree), no `.git`         |

Use gh-cp when you want to vendor a config folder, workflow, or template from another repo without cloning everything.

## Feature index

- [Source specification](./features/source-spec.md) — `owner/repo`, paths, branches, tags, and SHAs
- [Destination and flags](./features/destination-and-flags.md) — `--path`, `--force`, `--dry-run`, `--json`
- [CLI output and errors](./features/cli-output-and-errors.md) — success line, stderr errors, exit codes **E2001**–**E2004**
- [Authentication and strategies](./features/authentication-and-strategies.md) — `gh`, then `git`, then HTTPS
- [Limitations](./features/limitations.md) — LFS, submodules, rate limits

## Project README

The repository [README](../README.md) covers install, requirements, and basic examples.
