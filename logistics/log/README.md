# Runtime Logs

The development toolchain writes runtime diagnostics here for easy inspection and AI-friendly debugging.

## Log Files

- `dev.log` — Populated by the Vite dev server when `DEV_LOCAL_LOG_ENABLED` is not `false` and running in development mode
- Each line is JSONL (JSON Lines) format with ISO timestamp plus payload from the client
- Additional files may be added by other scripts

## Configuration

To change the output location, set `DEV_LOG_DIR` in `logistics/plugin-deploy/.env`:

```env
DEV_LOG_DIR=logistics/log
```

Otherwise the tools write directly into this directory.

## Log Format

Each log entry is a single line of JSON:

```json
{"ts":"2025-01-01T00:00:00.000Z","level":"INFO","message":"your log message","...":"additional fields"}
```

This format is:
- **Human readable** - Can be read line by line
- **Machine parseable** - Each line is valid JSON
- **AI friendly** - Easy for AI assistants to parse and analyze
- **Appendable** - New entries don't corrupt existing ones

## Gitignore

All `*.log` and `*.jsonl` files in this directory are ignored by git to avoid committing sensitive data or bloating the repository.

