from pathlib import Path

import pytest

from luxstudio_accuracy.checks import run_checks, sphere_check
from luxstudio_accuracy.radiance import BUGGY_RELEASE, install
from luxstudio_accuracy.scene import BOUNCE_OPTIONS


@pytest.mark.radiance
def test_the_pinned_radiance_reproduces_every_hand_value() -> None:
    checks = run_checks(install())
    assert checks
    assert [check.name for check in checks if not check.passed] == []


@pytest.mark.radiance
def test_the_checks_catch_the_ies2rad_multiplier_bug() -> None:
    # Releases from 2026-02-20 until the 2026-10-15 fix drop ies2rad's
    # multiplier. Every check must fail with one of them.
    checks = run_checks(install(BUGGY_RELEASE))
    assert all(not check.passed for check in checks)


@pytest.mark.radiance
def test_the_sphere_check_catches_missing_bounces(tmp_path: Path) -> None:
    # Radiance's default depth limit (-lr -10) cuts rays short, however many
    # bounces -ab allows. With -ab 12 it cut the references' bounced light by
    # about 2.4 % until the options set -lr 0 and -ab 24 (ADR 0060).
    capped = list(BOUNCE_OPTIONS)
    del capped[capped.index("-lr") : capped.index("-lr") + 2]
    capped[capped.index("-ab") + 1] = "12"
    assert not sphere_check(install(), tmp_path, tuple(capped)).passed
