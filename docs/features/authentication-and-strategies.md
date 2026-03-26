# Authentication and strategies

ghcp tries up to **three** ways to read from GitHub, in order. The first one that succeeds is used.

## 1. GitHub CLI (`gh`)

If `gh` is on your `PATH`, ghcp uses `gh api` against the GitHub REST API. That reuses **whatever authentication `gh` already has** (including SSO and enterprise setups).

You do **not** have to be logged in for many **public** repositories, but auth improves rate limits and is required for private repos.

## 2. Git (`git`)

If the `gh` path fails, ghcp uses a **temporary sparse clone** over HTTPS (`https://github.com/owner/repo.git`), then copies the requested path and deletes the temp directory.

This uses **credentials your Git install already uses** for HTTPS (for example a credential helper or cached token). The clone URL is always `https://github.com/owner/repo.git`.

## 3. HTTPS (`fetch`)

If both fail, ghcp calls the GitHub REST API with Node’s built-in `fetch`.

- **Public repos**: works with **no token**, subject to strict unauthenticated rate limits.
- **Private repos** or heavier use: set **`GITHUB_TOKEN`** or **`GH_TOKEN`** to a personal access token (or fine-grained token with Contents read access).

If the API returns **401** or **403**, the error message suggests using `gh`, `git`, or a token.

## Environment variables

| Variable                    | Used by                                      |
| --------------------------- | -------------------------------------------- |
| `GITHUB_TOKEN` / `GH_TOKEN` | HTTPS strategy (`Authorization: Bearer …`)   |
| `PATH`                      | Locating `gh` and `git`                      |

## User-Agent

HTTPS requests identify as `ghcp-cli` for easier support and debugging.
