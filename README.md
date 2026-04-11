# Harry's OpenClaw Home

## Dependencies

- uv
- pnpm
- postgres

### Hindsight Setup

#### Initialize Database

```sh
CREATE DATABASE hindsight;
CREATE EXTENSION vector;
```

#### Configure LLM

[Configuration](https://hindsight.vectorize.io/developer/configuration)

#### Run API Server

```sh
uv run --env-file .env hindsight-api
```

#### Run Dashboard

```sh
pnpm i
uv run --env-file .env pnpm hindsight-control-plane
```