from __future__ import annotations

import argparse
import sys
from importlib.metadata import version
from pathlib import Path

from .server import (
    DEFAULT_BACKUP_COUNT,
    DEFAULT_HOST,
    DEFAULT_MAX_BODY_BYTES,
    DEFAULT_MAX_BYTES,
    DEFAULT_PORT,
    ServerConfig,
    build_server,
    default_log_path,
)

MAX_PORT = 65535


def main() -> None:
    try:
        _run()
    except KeyboardInterrupt:
        sys.stdout.write("\n")
    except Exception as error:
        sys.stderr.write(f"log-server failed: {error}\n")
        raise SystemExit(1) from None


def _run() -> None:
    args = _parse_args()
    if args.show_version:
        sys.stdout.write(f"log-server {version('log-server')}\n")
        return

    config = ServerConfig(
        host=args.host,
        port=args.port,
        log_path=args.log_path,
        max_bytes=args.max_bytes,
        backup_count=args.backup_count,
        max_body_bytes=args.max_body_bytes,
    )
    server = build_server(config)
    address_host = server.server_address[0]
    address_port = server.server_address[1]
    sys.stdout.write(
        f"log-server listening on http://{address_host}:{address_port}/log\n"
    )
    sys.stdout.write(f"writing JSONL to {args.log_path.expanduser()}\n")
    sys.stdout.flush()
    with server:
        server.serve_forever()


def _parse_args() -> Args:
    parser = argparse.ArgumentParser(
        prog="log-server",
        description="Receive local AJTKS logs over HTTP and write rotating JSONL.",
    )
    parser.add_argument("--version", action="store_true", dest="show_version")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=_port, default=DEFAULT_PORT)
    parser.add_argument("--log-path", type=Path, default=default_log_path())
    parser.add_argument("--max-bytes", type=_positive_int, default=DEFAULT_MAX_BYTES)
    parser.add_argument(
        "--backup-count",
        type=_non_negative_int,
        default=DEFAULT_BACKUP_COUNT,
    )
    parser.add_argument(
        "--max-body-bytes",
        type=_positive_int,
        default=DEFAULT_MAX_BODY_BYTES,
    )
    return parser.parse_args(namespace=Args())


class Args(argparse.Namespace):
    backup_count: int
    host: str
    log_path: Path
    max_body_bytes: int
    max_bytes: int
    port: int
    show_version: bool


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        msg = "must be at least 1"
        raise argparse.ArgumentTypeError(msg)
    return parsed


def _non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        msg = "must be at least 0"
        raise argparse.ArgumentTypeError(msg)
    return parsed


def _port(value: str) -> int:
    parsed = int(value)
    if parsed < 0 or parsed > MAX_PORT:
        msg = f"must be between 0 and {MAX_PORT}"
        raise argparse.ArgumentTypeError(msg)
    return parsed
