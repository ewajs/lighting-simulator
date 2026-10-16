import pytest

from luxstudio_accuracy.checks import run_checks
from luxstudio_accuracy.radiance import BUGGY_RELEASE, install


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
