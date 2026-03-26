# Source specification

The first positional argument describes **which** GitHub content to copy.

## Format

```text
owner/repo[/path/in/repo][#ref]
```

- **owner** — GitHub user or organization name.
- **repo** — Repository name.
- **path** — Optional path to a file or directory inside the repository. If omitted, the repository root is used.
- **ref** — Optional branch name, tag, or commit SHA, written after `#`. The last `#` in the string starts the ref (use `--ref` if your ref itself contains `#`).

GitHub web-style paths are also accepted:

```text
owner/repo/blob/ref/path/in/repo
owner/repo/tree/ref/path/in/repo
https://github.com/owner/repo/blob/ref/path/in/repo
```

For these forms, `ref` is inferred from the segment after `blob` or `tree`.

## Examples

| Spec                                         | Meaning                                  |
| -------------------------------------------- | ---------------------------------------- |
| `acme/widget`                                | Entire default branch at repository root |
| `acme/widget/.github/workflows`              | That directory tree                      |
| `acme/widget/LICENSE`                        | Single file                              |
| `acme/widget#v2.0.0`                         | Root at tag `v2.0.0`                     |
| `acme/widget/pkg/cli#main`                   | Directory `pkg/cli` on branch `main`     |
| `acme/widget/blob/main/docs`                 | `docs` directory on branch `main`        |
| `https://github.com/acme/widget/tree/main`   | Repository root on branch `main`         |

## `--ref` vs `#ref`

`--ref` overrides any `#ref` in the source string. Prefer `--ref` when `#` is awkward in your shell or when the ref name is unusual.

`#ref` also overrides the ref inferred from `blob/...` or `tree/...`.

```sh
gh-cp acme/widget/.devcontainer --ref my/feature-branch
```
