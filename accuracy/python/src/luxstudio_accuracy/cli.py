"""The ``accuracy`` command: ``accuracy check`` and ``accuracy references``.

Run through npm from the repo's root: ``npm run accuracy:check`` and
``npm run accuracy:references``.
"""

import argparse
import sys

from luxstudio_accuracy.checks import TOLERANCE, Check, run_checks
from luxstudio_accuracy.radiance import RELEASE, install
from luxstudio_accuracy.references import compute_reference, write_reference
from luxstudio_accuracy.rooms import all_rooms, load_room


def main(argv: list[str] | None = None) -> int:
    """Runs the command.

    Args:
        argv: The arguments, without the program name; the command line's by default.

    Returns:
        The exit status: 0 if everything passed.
    """
    parser = argparse.ArgumentParser(prog="accuracy", description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("check", help="check that Radiance reproduces hand-worked values")
    references = commands.add_parser("references", help="check, then regenerate the references")
    references.add_argument("rooms", nargs="*", help="room names; all of them by default")
    args = parser.parse_args(argv)

    radiance = install()
    checks = run_checks(radiance)
    failed = _report(checks)
    if failed or args.command == "check":
        return 1 if failed else 0

    wanted = set(args.rooms)
    for path in all_rooms():
        if wanted and path.stem not in wanted:
            continue
        room = load_room(path)
        written = write_reference(compute_reference(radiance, room), room.name)
        print(f"{room.name}: {len(room.points)} points → {written.name}")
    return 0


def _report(checks: list[Check]) -> int:
    """Prints the checks that failed, and a summary; returns how many failed."""
    failed = [check for check in checks if not check.passed]
    for check in failed:
        print(
            f"✗ {check.name}: Radiance {check.radiance_lux:.4f} lx, "
            f"by hand {check.expected_lux:.4f} lx ({check.error:+.3%})"
        )
    hand = [check for check in checks if check.tolerance == TOLERANCE]
    worst = max(abs(check.error) for check in hand)
    print(
        f"Radiance {RELEASE}: {sum(c.passed for c in hand)} of {len(hand)} hand checks within "
        f"{TOLERANCE:.1%} (worst {worst:.3%})"
    )
    for check in checks:
        if check.tolerance != TOLERANCE:
            mark = "✓" if check.passed else "✗"
            print(
                f"{mark} {check.name}: Radiance {check.radiance_lux:.2f} lx, formula "
                f"{check.expected_lux:.2f} lx ({check.error:+.2%}, allowed ±{check.tolerance:.1%})"
            )
    return len(failed)


if __name__ == "__main__":
    sys.exit(main())
