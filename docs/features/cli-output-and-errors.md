# CLI output and errors

This page describes what gh-cp prints on **stdout** and **stderr**, how **exit codes** map to outcomes, and how errors are chosen when more than one fetch strategy fails.

## Success

### Default (human) mode

After a successful copy (including **`--dry-run`**), gh-cp prints **one line to stdout**, for example:

```text
✔︎ copied 3 files, 2 directories
```

With **`--dry-run`**, the line starts with `dry-run: would copy` instead of `copied`.

- **Files** — number of file paths written (or that would be written).
- **Directories** — number of distinct folder paths implied by those files (nested prefixes are counted once each).

This gives quick confirmation in the terminal without parsing JSON.

### `--json` mode

With **`--json`**, **only** the JSON summary is written to **stdout** on success. There is no separate human success line, so scripts can pipe or parse stdout cleanly.

Verbose logs still go to **stderr** when **`--verbose`** is set.

## Errors

### Where messages go

| Stream | Typical content |
| ------ | --------------- |
| **stderr** | Usage mistakes, copy failures, and the versioned error line below |
| **stdout** | Human success line (non-`--json`) or JSON (`--json`) |

### Format

Fetch failures that exhaust all strategies are printed like:

```text
gh-cp v1.0.0 — Error (E2001): Path or ref not found on GitHub: owner/repo — path/to/file. Tried gh api, git, and HTTPS API.
```

- The **version** matches **`gh-cp --version`** and helps with bug reports.
- **Error codes** (`E2001`–`E2004`) are stable labels for the kind of failure (see below).

Other failures (for example invalid arguments or “file already exists” without **`--force`**) also go to **stderr** with the same `gh-cp v… —` prefix where applicable.

### Failure kinds and codes

When **gh**, **git**, and **HTTPS** have all been tried without success, gh-cp records why each attempt failed, then surfaces the **most actionable** reason using this priority:

1. **Not found** (`E2001`) — repository path, ref, or repo does not exist (for example API **404** or equivalent).
2. **Auth / rate limit** (`E2002`) — **401**/**403**, or messages that indicate credentials or rate limits.
3. **Missing tool** (`E2003`) — `gh` or `git` not installed or not on `PATH` (spawn **ENOENT**).
4. **Generic** (`E2004`) — other errors, with a message that still suggests installing **`gh`**/**`git`** or setting **`GITHUB_TOKEN`** when relevant.

So a wrong path usually produces a **path/ref not found** message instead of a vague “could not copy” line.

Details of the try order live in [Authentication and strategies](./authentication-and-strategies.md).

## Exit codes

| Code | Meaning |
| ---- | ------- |
| **0** | Success |
| **1** | Invalid usage, validation error, local write conflict (e.g. existing file without **`--force`**), or other non-strategy errors |
| **2** | Every fetch strategy failed; stderr includes the versioned **`Error (E…)`** line above |

## Scripting tips

- Prefer **`--json`** in CI when you need structured fields (`strategy`, `files`, `owner`, `repo`, `path`, `ref`).
- Use **`--verbose`** (stderr) to see which strategy ran and why earlier attempts failed.
- The human success line is plain UTF-8 text (a checkmark character); it does not use ANSI color codes.
