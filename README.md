# pi-bash-timeout

Bash timeout policy extension for the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). It ports the senpi-mono builtin `bash-timeout` extension into a standalone pi extension.

## Behavior

The extension does not register a new tool. It intercepts the existing `bash` tool through pi's `tool_call` event and injects a default `timeout` parameter before the command runs.

| Case | Result |
|------|--------|
| `timeout` omitted | injects default timeout (`120`) |
| `timeout <= 0` | treats as missing and injects default |
| `timeout` above max | preserved as supplied |
| `timeout` in range | preserves user value |

It also appends a system-prompt section explaining the timeout policy so the model knows to set explicit timeouts for long-running commands.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PI_BASH_DEFAULT_TIMEOUT_SECONDS` | `120` | Timeout injected when the model omits `timeout`. Must be a positive integer. |
| `PI_BASH_MAX_TIMEOUT_SECONDS` | `600` | Recommended maximum shown in prompt guidance. Must be a positive integer. If lower than default, it is raised to the default. Explicit timeout values are preserved. |

## Installation

```bash
# From git
pi install git:github.com/code-yeongyu/pi-bash-timeout

# Manual placement
git clone https://github.com/code-yeongyu/pi-bash-timeout ~/.pi/agent/extensions/pi-bash-timeout
cd ~/.pi/agent/extensions/pi-bash-timeout && npm install

# Dev / one-shot test
pi -e /path/to/pi-bash-timeout/src/index.ts
```

After installation, restart pi or run `/reload` inside an interactive session.

## Development

```bash
npm install
npm test
npm run typecheck
npm run check
```

The test suite uses vitest. TypeScript is strict, Node-only, and uses ESM imports with `.js` suffixes.

## Origin

Ported from `packages/coding-agent/src/core/extensions/builtin/bash-timeout.ts` in `code-yeongyu/senpi-mono`.

## License

[MIT](LICENSE).

## Related

- [senpi](https://github.com/code-yeongyu/senpi) — the fork/runtime these extensions are extracted from.
- [Ultraworkers Discord](https://discord.gg/PUwSMR9XNk) — community link from the senpi README.
- [Dori](https://sisyphuslabs.ai) — the product powered by senpi under the hood.
