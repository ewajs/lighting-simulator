import platform

import pytest

from luxstudio_accuracy.radiance import RELEASE, supported


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Skips the Radiance tests, saying why, where no pinned Radiance runs (e.g. Linux CI)."""
    if supported(RELEASE):
        return
    reason = f"no pinned Radiance for {platform.system()} on {platform.machine()}"
    for item in items:
        if "radiance" in item.keywords:
            item.add_marker(pytest.mark.skip(reason=reason))
