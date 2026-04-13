from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import ClassVar, cast, override

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_MAX_BYTES = 10 * 1024 * 1024
DEFAULT_BACKUP_COUNT = 10
DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024

type JsonObject = dict[str, object]


@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    log_path: Path
    max_bytes: int
    backup_count: int
    max_body_bytes: int


def ajtks_home() -> Path:
    value = os.environ.get("AJTKS_HOME")
    if value:
        return Path(value).expanduser()
    return Path.home() / ".ajtks"


def default_log_path() -> Path:
    return ajtks_home() / "log-server" / "log.jsonl"


def build_server(config: ServerConfig) -> ThreadingHTTPServer:
    record_logger = _record_logger(
        config.log_path,
        max_bytes=config.max_bytes,
        backup_count=config.backup_count,
    )
    handler = _handler(record_logger, max_body_bytes=config.max_body_bytes)
    server = ThreadingHTTPServer((config.host, config.port), handler)
    server.daemon_threads = True
    return server


def serve(config: ServerConfig) -> None:
    server = build_server(config)
    with server:
        server.serve_forever()


def _record_logger(
    log_path: Path,
    *,
    max_bytes: int,
    backup_count: int,
) -> logging.Logger:
    expanded = log_path.expanduser()
    expanded.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("log_server.records")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    logger.handlers.clear()

    handler = RotatingFileHandler(
        expanded,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


def _handler(
    record_logger: logging.Logger,
    *,
    max_body_bytes: int,
) -> type[BaseHTTPRequestHandler]:
    class ConfiguredLogRequestHandler(LogRequestHandler):
        logger = record_logger
        body_limit = max_body_bytes

    return ConfiguredLogRequestHandler


class LogRequestHandler(BaseHTTPRequestHandler):
    server_version = "LogServer/0.0"
    logger: ClassVar[logging.Logger]
    body_limit: ClassVar[int]

    def do_POST(self) -> None:
        if self.path != "/log":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        raw = self._read_body()
        if raw is None:
            return

        try:
            payload = _load_payload(raw)
        except (TypeError, ValueError) as error:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "invalid_json", "message": str(error)},
            )
            return

        record = dict(payload)
        record["ts"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        self.logger.info(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _read_body(self) -> bytes | None:
        value = self.headers.get("Content-Length")
        if value is None:
            self._send_json(
                HTTPStatus.LENGTH_REQUIRED,
                {"error": "content_length_required"},
            )
            return None

        try:
            length = int(value)
        except ValueError:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "invalid_content_length"},
            )
            return None

        if length < 0:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "invalid_content_length"},
            )
            return None
        if length > self.body_limit:
            self._send_json(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                {"error": "body_too_large"},
            )
            return None
        return self.rfile.read(length)

    def _send_json(self, status: HTTPStatus, body: JsonObject) -> None:
        raw = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    @override
    def log_message(self, format: str, *args: object) -> None:
        return


def _load_payload(raw: bytes) -> JsonObject:
    try:
        loaded = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError(error.msg) from error
    if not isinstance(loaded, dict):
        msg = "payload must be a JSON object"
        raise TypeError(msg)
    return cast("JsonObject", loaded)
