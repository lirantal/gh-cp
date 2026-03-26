# Destination and flags

## Destination

Files are written under a **destination directory**:

1. If `--path DIR` is set, `DIR` is used.
2. Otherwise, if a **second positional** argument is given, it is the destination.
3. Otherwise, the **current working directory** is used.

This matches common `cp`-style usage:

```sh
gh-cp owner/repo/.devcontainer .
gh-cp owner/repo/.devcontainer ./vendor/templates
gh-cp owner/repo/.devcontainer --path ./vendor/templates
```

## Flags

| Flag          | Short | Description                                                    |
| ------------- | ----- | -------------------------------------------------------------- |
| `--help`      | `-h`  | Show usage and exit successfully                               |
| `--version`   | `-V`  | Print package version                                          |
| `--verbose`   | `-v`  | Log chosen strategy and progress to stderr                     |
| `--path`      | —     | Output directory (overrides second positional)                 |
| `--ref`       | —     | Branch, tag, or SHA (overrides `#ref` in the source spec)      |
| `--force`     | `-f`  | Overwrite existing files                                       |
| `--dry-run`   | —     | Plan without writing; still prints the human success line      |
| `--json`      | —     | On success, JSON only on stdout (no human success line)        |

## Human-readable success line

Unless **`--json`** is set, a successful run prints **one line to stdout** summarizing how many files and directories were involved (including under **`--dry-run`**). See [CLI output and errors](./cli-output-and-errors.md) for examples and how directory counts work.

## Exit codes

| Code | Meaning                                                                    |
| ---- | -------------------------------------------------------------------------- |
| 0    | Success                                                                    |
| 1    | Invalid usage, bad arguments, or file conflicts (without `--force`)        |
| 2    | All fetch strategies failed (versioned error on stderr; see doc below)     |

For stderr format, error codes (**E2001**–**E2004**), and how the “best” error is chosen, see [CLI output and errors](./cli-output-and-errors.md).

## JSON output

With `--json`, stdout receives one JSON object, for example:

```json
{
  "strategy": "git",
  "files": [".devcontainer/devcontainer.json"],
  "owner": "acme",
  "repo": "widget",
  "path": ".devcontainer",
  "ref": null
}
```

Structured output is useful in scripts and CI.
