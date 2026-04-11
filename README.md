# OpenClaw Home

## Architecture

```
OpenClaw (Discord) ──┐
                     ├─→ Hindsight API (:8888) ─→ PostgreSQL (hindsight DB)
OpenCode (TUI) ──────┘         │                     ├─ pgvector (벡터 검색)
                               │                     ├─ vchord (의존성)
                               ├─→ Ollama (:11434)   ├─ vchord_bm25 (BM25)
                               │   ├─ glm-5.1:cloud  └─ pg_tokenizer (한국어 토크나이징)
                               │   └─ nomic-embed-text-v2-moe
                               └─← Control Plane (API 조회)
```

## Setup

### PostgreSQL

```sh
createdb hindsight
brew install pgvector
psql -d hindsight -c "CREATE EXTENSION IF NOT EXISTS vector CASCADE;"
```

### vchord (소스 빌드, Rust nightly 필요)

```sh
cd VectorChord-1.1.1 && make build && make install
psql -d hindsight -c "ALTER SYSTEM SET shared_preload_libraries = 'vchord';"
brew services restart postgresql@18
psql -d hindsight -c "CREATE EXTENSION IF NOT EXISTS vchord CASCADE;"
```

### pg_tokenizer + vchord_bm25 (pgrx 0.16.1 필요)

```sh
cargo install cargo-pgrx --version 0.16.1 --locked

cd pg_tokenizer.rs-0.1.1
cargo pgrx install --release --pg-config /opt/homebrew/bin/pg_config

cd VectorChord-bm25-0.3.0
cargo pgrx install --release --pg-config /opt/homebrew/bin/pg_config

psql -d hindsight -c "ALTER SYSTEM SET shared_preload_libraries = 'vchord,pg_tokenizer';"
brew services restart postgresql@18
psql -d hindsight -c "CREATE EXTENSION IF NOT EXISTS pg_tokenizer CASCADE;"
psql -d hindsight -c "CREATE EXTENSION IF NOT EXISTS vchord_bm25 CASCADE;"
```

### .env

```
HINDSIGHT_API_DATABASE_URL=postgresql://harry@localhost:5432/hindsight
HINDSIGHT_API_LLM_BASE_URL=http://localhost:11434/v1
HINDSIGHT_API_LLM_API_KEY=ollama
HINDSIGHT_API_LLM_MODEL=glm-5.1:cloud
HINDSIGHT_API_EMBEDDINGS_PROVIDER=openai
HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL=http://localhost:11434/v1
HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL=nomic-embed-text-v2-moe
HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY=ollama
HINDSIGHT_API_TEXT_SEARCH_EXTENSION=vchord
```

### 실행

```sh
uv run --env-file .env hindsight-api
```

```sh
pnpm i && uv run --env-file .env pnpm hindsight-control-plane
```
