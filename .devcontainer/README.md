# Dev container

Run this project in a **consistent Node.js 24 + TypeScript** environment without installing toolchains on your machine. Dependencies install automatically; your repo is the workspace inside the container.

## Why use it?

- **Same stack for everyone** — Node 24, pnpm, and tooling match CI and collaborators.
- **Fast onboarding** — Open the folder in a container; `pnpm install` and local git tweaks run once after create.
- **Host secrets, container dev** — `ANTHROPIC_API_KEY` and `SNYK_TOKEN` are passed from your Mac/Linux session into the container when set locally (see below).
- **Optional CLI workflow** — Use `start.sh` if you prefer a terminal-driven container instead of only the editor.
- **Portless SSH workflow** — Install a normal SSH host alias that proxies into the devcontainer without publishing an SSH port.

## What’s here

| File | Role |
|------|------|
| `devcontainer.json` | Image, mounts (e.g. your `~/.gitconfig`), lifecycle commands, env forwarding. |
| `post-create.sh` | Runs once after the container is created — e.g. installs [APM](https://github.com/microsoft/apm) (Agent Package Manager) for agent-related tooling. |
| `post-start.sh` | Runs on each container start; refreshes runtime state such as SSH host keys and authorized keys. |
| `start.sh` | Brings the dev container up with the Dev Containers CLI, then opens a shell **inside** the container or acts as an SSH `ProxyCommand`. |
| `ssh-config-install.sh` | Installs/updates a host SSH config alias for Cursor, Claude, or plain `ssh`. |
| `utils/ssh-bootstrap.sh` | Container-side OpenSSH install/runtime helper used by lifecycle scripts. |

## Usage

### Editor (recommended)

1. Install the **Dev Containers** extension (VS Code) or use Cursor’s dev container support.
2. **Command Palette** → *Dev Containers: Reopen in Container* (or *Rebuild Container* after config changes).
3. Wait for create/start; the editor attaches when ready.

### Terminal only

From the **repository root** on your host:

```bash
bash .devcontainer/start.sh
```

Requires Docker running. Uses `npx @devcontainers/cli` to `up` the workspace, then `exec` into `bash`.

### Portless SSH alias

From the **repository root** on your host, install or update the SSH alias:

```bash
bash .devcontainer/ssh-config-install.sh
```

By default, this creates:

- A repo-local SSH identity at `.devcontainer/.ssh/id_ed25519`.
- A marked `Host gh-cp-devcontainer` block in `~/.ssh/config`.
- A `ProxyCommand` that runs `.devcontainer/start.sh --ssh-proxy`.

Validate with plain OpenSSH first:

```bash
ssh gh-cp-devcontainer 'whoami && pwd'
```

Then use the same host alias in Cursor, Claude, or any other SSH client:

- **SSH Host:** `gh-cp-devcontainer`
- **SSH Port:** leave empty
- **Identity File:** leave empty if the client reads `~/.ssh/config`; otherwise use `.devcontainer/.ssh/id_ed25519`
- **Remote Folder:** select `gh-cp` from the default home folder, or enter `/workspaces/gh-cp`

To customize the alias, run:

```bash
bash .devcontainer/ssh-config-install.sh --alias my-project-devcontainer
```

This workflow does not publish an SSH port. OpenSSH talks to `sshd -i` over `docker exec`, while `@devcontainers/cli up` still owns the devcontainer lifecycle.

## Environment variables (host → container)

Set these **on your machine** before opening/rebuilding the container so they appear inside:

```bash
export ANTHROPIC_API_KEY=sk-...
export SNYK_TOKEN=...
```

They are wired in `devcontainer.json` under `containerEnv` via `localEnv`.

## Optional customization

- **Agent config on the host** — Uncomment the `mounts` entries in `devcontainer.json` to bind `~/.claude`, `~/.gemini`, or `~/.codex` into the container so coding agents see your existing settings.
- **1Password / other CLIs** — Follow the commented blocks in `devcontainer.json` and `post-create.sh` if you need them; keep the image lean by default.

---

After scaffolding, edit paths and secrets to match your team’s policies; this folder is yours to extend.
