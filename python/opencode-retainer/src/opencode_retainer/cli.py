from importlib.metadata import version

from rich.console import Console


def main() -> None:
    console = Console()
    try:
        console.print(f"opencode-retainer {version('opencode-retainer')}")
    except Exception:
        console.print_exception(show_locals=True)
