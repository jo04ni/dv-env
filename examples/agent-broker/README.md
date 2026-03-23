# Agent Broker Demo

Minimaler Demo-Flow für kurzlebige Broker-Tokens mit `dv-env`.

## Voraussetzungen

- Projekt gebaut (`npm run build`)
- Vault enthält mindestens ein Label (z. B. `OpenAI`)

## 1) Token aus trusted Kontext erzeugen

```bash
export DV_OWNER="0x..."
export DV_MASTER_PASSWORD="..."
export DV_BROKER_SECRET="super-strong-shared-secret"
export DV_MAP="OPENAI_API_KEY:OpenAI"

node examples/agent-broker/issue-token.mjs > token.txt
```

## 2) Worker ohne Master-Passwort starten

```bash
export DV_BROKER_TOKEN="$(cat token.txt)"
node examples/agent-broker/worker.mjs
```

## 3) Ein-Kommando Smoke-Test

```bash
node examples/agent-broker/smoke.mjs
```

Oder über npm:

```bash
npm run smoke:agent-broker
```

Optional mit eigenem Zielkommando:

```bash
node examples/agent-broker/smoke.mjs node app.js
```

Optional mit eigenem Zielkommando:

```bash
node examples/agent-broker/worker.mjs node app.js
```

## Sicherheitsidee

- `DV_MASTER_PASSWORD` bleibt im Issuer-Kontext.
- Worker erhält nur einen kurzlebigen Token + Broker-Secret zur Verifikation.
- Token enthält nur die gemappten Runtime-Secrets für den Prozess.
