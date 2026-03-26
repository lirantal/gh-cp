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
| `--dry-run`   | —     | Print what would be written without writing                    |
| `--json`      | —     | After success, print a JSON summary on stdout                  |

## Exit codes

| Code | Meaning                                                                    |
| ---- | -------------------------------------------------------------------------- |
| 0    | Success                                                                    |
| 1    | Invalid usage, bad arguments, or file conflicts (without `--force`)        |
| 2    | All fetch strategies failed                                                |

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
