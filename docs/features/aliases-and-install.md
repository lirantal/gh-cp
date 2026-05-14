# Aliases and install

Aliases let you save frequently used GitHub sources and copy from them later without retyping the full source spec.

## Save an alias

```sh
gh-cp alias devcontainer github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/
```

Alias names may contain letters, numbers, dots, underscores, and dashes. They must start with a letter or number and may be up to 64 characters long.

The source uses the same syntax as normal `gh-cp` sources, including `owner/repo/path`, `github.com/owner/repo/tree/ref/path`, `github.com/owner/repo/blob/ref/path`, and `#ref`.

Saving an existing alias name updates it.

## Install from an alias

```sh
gh-cp install devcontainer .
gh-cp install devcontainer --path ./vendor/templates --force
gh-cp install devcontainer --dry-run --json
```

`install <alias-name>` resolves the alias to its saved source and then runs the normal copy flow. The destination rules are the same as direct copy:

1. `--path DIR`
2. second positional destination
3. current working directory

## Interactive install

Run `install` without an alias name to choose from saved aliases:

```text
$ gh-cp install

? Select a saved gh-cp source
  Use Up/Down or j/k to move, Enter to install

> node-lib-devcontainer
  github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/

  npq-workflows
  lirantal/npq/.github/workflows

  eslint-config
  lirantal/create-node-lib/blob/main/template/eslint.config.js

Destination: .
```

The menu uses Node.js built-in `readline` and TTY APIs. It does not add prompt dependencies. It only runs when stdin and stdout are attached to an interactive terminal; in scripts, CI, or pipes, pass an alias name explicitly.

Interactive `gh-cp install` cannot be combined with `--json` because the menu writes human-readable output to stdout. Use `gh-cp install <alias-name> --json` for machine-readable output.

## Config file

Aliases are stored as JSON:

```json
{
  "devcontainer": "github.com/lirantal/create-node-lib/tree/main/template/.devcontainer/"
}
```

The config file is located at:

1. `$GH_CP_CONFIG_DIR/aliases.json`, when `GH_CP_CONFIG_DIR` is set
2. `$XDG_CONFIG_HOME/gh-cp/aliases.json`, when `XDG_CONFIG_HOME` is set
3. `~/.config/gh-cp/aliases.json` on Unix-like systems
4. `%LOCALAPPDATA%\\gh-cp\\aliases.json` on Windows, falling back to `%APPDATA%`

`GH_CP_CONFIG_DIR` is useful for tests, CI, or keeping separate alias sets.
