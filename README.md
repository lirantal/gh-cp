<!-- markdownlint-disable -->

<p align="center">
  <h1 align="center">
    ghcp
  </h1>
</p>

<p align="center">
  Copy files or directories from a GitHub repository path into a local folder — no full clone, no git history.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ghcp"><img src="https://badgen.net/npm/v/ghcp" alt="npm version"/></a>
  <a href="https://www.npmjs.com/package/ghcp"><img src="https://badgen.net/npm/license/ghcp" alt="license"/></a>
  <a href="https://www.npmjs.com/package/ghcp"><img src="https://badgen.net/npm/dt/ghcp" alt="downloads"/></a>
  <a href="https://github.com/lirantal/ghcp/actions?workflow=CI"><img src="https://github.com/lirantal/ghcp/workflows/CI/badge.svg" alt="build"/></a>
  <a href="https://app.codecov.io/gh/lirantal/ghcp"><img src="https://badgen.net/codecov/c/github/lirantal/ghcp" alt="codecov"/></a>
  <a href="https://snyk.io/test/github/lirantal/ghcp"><img src="https://snyk.io/test/github/lirantal/ghcp/badge.svg" alt="Known Vulnerabilities"/></a>
  <a href="./SECURITY.md"><img src="https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg" alt="Responsible Disclosure Policy" /></a>
</p>

## Example Usage

Execute with `npx` Node.js package manager quick package executable and copy over from a source user or organization
repository to the local directory

```sh
npx ghcp user/repo/.github/workflows .
```

Note: you can also execute with `pnpm` via: `pnpm dlx ghcp `

## Install

Install globally with `pnpm` or with `npm`:

```sh
# install with pnpm globally
pnpm add -g ghcp

# or install with npm globally
npm install -g ghcp
```

**Requirements:** Node.js **24+**. Optional but recommended: [GitHub CLI](https://cli.github.com/) (`gh`) and/or `git` on your `PATH` for auth and fewer HTTPS rate limits.

## Usage

```sh
# Copy a repo subtree into the current directory (like cp -r repo/.devcontainer .)
npx ghcp lirantal/npq/.devcontainer .

# Explicit destination and branch
npx ghcp cli/cli --path ./upstream --ref trunk

# Preview and machine-readable summary
npx ghcp cli/cli/README.md --dry-run --verbose
npx ghcp cli/cli/README.md --json .
```

### Flags

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Usage |
| `-V`, `--version` | Version |
| `-v`, `--verbose` | Log strategy and progress to stderr |
| `--path DIR` | Output directory (overrides optional second positional) |
| `--ref REF` | Branch, tag, or SHA (overrides `#ref` in the source spec) |
| `-f`, `--force` | Overwrite existing files |
| `--dry-run` | Show planned writes without writing |
| `--json` | Print JSON summary on success |

Source syntax: `owner/repo[/path][#ref]`. Details: [docs/features/source-spec.md](./docs/features/source-spec.md).

## Documentation

- [docs/README.md](./docs/README.md) — overview and feature index
- [Authentication & strategies](./docs/features/authentication-and-strategies.md) — `gh` → `git` → HTTPS order

## Contributing

Please consult [CONTRIBUTING](./.github/CONTRIBUTING.md) for guidelines on contributing to this project.

## Author

**ghcp** © [Liran Tal](https://github.com/lirantal), Released under the [Apache-2.0](./LICENSE) License.
