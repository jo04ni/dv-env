# dv-env

Runtime secret injection CLI for DeadVault.

`dv-env` loads encrypted secrets at runtime and injects them into a single child process, so you can avoid storing plaintext `.env` files in repos, images, and long-lived configs.

## Core value

- No plaintext secret files in source control.
- Runtime-only secret exposure to the process that needs it.
- Agent-friendly mode with short-lived broker tokens (no master password in worker runtime).

## Requirements

- Node.js `>=18`
- Access to a DeadVault owner address and master password
- For v2 vaults: wallet signature (`DV_WALLET_SIGNATURE`)

## Install

```bash
npm install
npm run build
```

Optional onboarding step:

```bash
cp .env.example .env
```

## CLI commands

```bash
dv-env check [options]
dv-env list [options]
dv-env issue-token [options]
dv-env run [options] -- <command>
```

### `check`

Validates chain connectivity and decrypt path.

```bash
echo "$DV_MASTER_PASSWORD" | node dist/index.js check --owner 0x... --password-stdin
```

### `list`

Lists labels + metadata (never plaintext values).

```bash
echo "$DV_MASTER_PASSWORD" | node dist/index.js list --owner 0x... --password-stdin
```

### `run`

Injects mapped vars into a child process.

```bash
echo "$DV_MASTER_PASSWORD" | node dist/index.js run --owner 0x... --password-stdin --map OPENAI_API_KEY:OpenAI -- node app.js
```

### `issue-token` (broker mode)

Creates a short-lived signed token containing only mapped env values.

```bash
printf "%s\n%s\n" "$DV_MASTER_PASSWORD" "$DV_BROKER_SECRET" \
  | node dist/index.js issue-token --owner 0x... --password-stdin --broker-secret-stdin --ttl-seconds 180 --map OPENAI_API_KEY:OpenAI
```

## Mapping options

Inline mappings:

```bash
--map OPENAI_API_KEY:OpenAI --map ANTHROPIC_API_KEY:Anthropic
```

Mapping file (`dv-env.json`):

```json
{
  "OPENAI_API_KEY": "OpenAI",
  "ANTHROPIC_API_KEY": "Anthropic"
}
```

```bash
echo "$DV_MASTER_PASSWORD" | node dist/index.js run --owner 0x... --password-stdin --map-file dv-env.json -- node app.js
```

## v2 vault support

If vault decryption requires signature binding, pass both password + signature via stdin:

```bash
printf "%s\n%s\n" "$DV_MASTER_PASSWORD" "$DV_WALLET_SIGNATURE" \
  | node dist/index.js check --owner 0x... --password-stdin --wallet-signature-stdin
```

## Agent broker workflow (recommended)

Trusted context (issuer):

```bash
printf "%s\n%s\n" "$DV_MASTER_PASSWORD" "$DV_BROKER_SECRET" \
  | node dist/index.js issue-token --owner 0x... --password-stdin --broker-secret-stdin --ttl-seconds 180 --map OPENAI_API_KEY:OpenAI > token.txt
```

Agent worker context (no master password):

```bash
DV_BROKER_SECRET="$DV_BROKER_SECRET" DV_BROKER_TOKEN="$(cat token.txt)" \
  node dist/index.js run --broker-token "$DV_BROKER_TOKEN" -- node app.js
```

## Security model

- `dv-env` never prints plaintext secret values.
- Default mode is fail-closed on missing mappings.
- `--password` and `--broker-secret` are allowed but warn (shell history risk).
- Prefer stdin or ephemeral runtime env for all sensitive values.
- Broker tokens are HMAC-signed and expire (`--ttl-seconds`, default `300`).

## Environment variables

- `DV_OWNER`
- `DV_MASTER_PASSWORD`
- `DV_WALLET_SIGNATURE`
- `DV_BROKER_SECRET`
- `DV_BROKER_TOKEN`

## Local development

```bash
npm run typecheck
npm run build
npm run test
```

## CI

GitHub Actions workflow runs on push and pull requests:

- `npm run typecheck`
- `npm run build`
- `npm run test`

Workflow file: `.github/workflows/ci.yml`

## Environment validation

Validate required env vars before running flows:

```bash
npm run validate:env
npm run validate:env:issue-token
npm run validate:env:worker
```

Optional strict check for signature-based vaults:

```bash
node scripts/validate-env.mjs --mode=run --require-signature
```

## Demo examples

- Broker demo docs: `examples/agent-broker`
- Token issuer script: `examples/agent-broker/issue-token.mjs`
- Worker script: `examples/agent-broker/worker.mjs`
- One-command smoke run: `examples/agent-broker/smoke.mjs`

Run smoke demo:

```bash
npm run smoke:agent-broker
```
