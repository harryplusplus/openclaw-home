import subprocess

from dotenv import load_dotenv
from rich.console import Console


def main() -> None:
    console = Console()
    try:
        load_dotenv()
        subprocess.run(["hindsight-api"], check=True)
    except Exception:
        console.print_exception(show_locals=True)
