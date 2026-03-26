# Limitations

## Large files and Git LFS

The GitHub **Contents** API and typical `git` sparse checkouts deal with **git blobs**. **Git LFS** pointer files may appear as small text files instead of real binary content. Full LFS support is not implemented.

## Submodules and symlinks

Directory listings may include **submodules** or **symlinks**. gh-cp **skips** submodule and symlink entries and logs a short verbose message when `--verbose` is set.

## Rate limits

Unauthenticated **HTTPS** access to `api.github.com` is limited (roughly **60 requests per hour** per IP). Recursive copies of directories use **one request per file** (plus listing requests). Prefer **`gh`** or a **token** for large trees or CI.

## Repository and path errors

If the path or ref does not exist, the API returns **404**. That can surface as a failed strategy or, after all strategies fail, exit code **2** with a generic message. Use `--verbose` to see which step failed.

## Git version

Sparse checkout behavior depends on a **recent Git** (roughly **2.25+**). Very old Git versions may not work for subdirectory copies.

## Windows paths

Paths inside the repository use POSIX-style segments from GitHub; gh-cp maps them with Node’s `path` for the local filesystem. Report issues if mixed path separators cause problems in unusual layouts.
