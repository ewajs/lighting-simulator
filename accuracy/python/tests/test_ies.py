from pathlib import Path

import pytest

from luxstudio_accuracy.ies import read_ies, write_ies
from luxstudio_accuracy.rooms import IES_DIR

COOPER = IES_DIR / "LX6C15D010-EX6C159030-6LBMH.ies"


def test_reads_a_real_file() -> None:
    ies = read_ies(COOPER)
    # Its table, by hand: 1142.1 cd at 0°, 873.4 at 20° and 828.9 at 22.5°.
    assert ies.intensity(0, 0) == pytest.approx(1142.1)
    assert ies.intensity(20, 123) == pytest.approx(873.4)
    assert ies.intensity(21.25, 0) == pytest.approx((873.4 + 828.9) / 2)
    # Its opening: a disk of −0.5 ft.
    assert ies.opening_m == pytest.approx((0.1524, 0.1524, 0.0))


def test_converts_feet_but_keeps_metres() -> None:
    assert read_ies(IES_DIR / "qg63_b35q.ies").opening_m == pytest.approx((0.095, 0.095, 0.0))


def test_writes_and_reads_back_a_lopsided_file(tmp_path: Path) -> None:
    path = tmp_path / "lopsided.ies"
    write_ies(
        path,
        (0.0, 90.0, 180.0),
        (0.0, 90.0, 180.0, 270.0, 360.0),
        ((10, 20, 30), (10, 40, 30), (10, 60, 30), (10, 80, 30), (10, 20, 30)),
    )
    ies = read_ies(path)
    assert [ies.intensity(90, h) for h in (0, 90, 180, 270)] == [20, 40, 60, 80]
    assert ies.intensity(90, -90) == 80  # -90° is 270°.
    assert ies.intensity(45, 90) == pytest.approx(25)


def test_folds_by_symmetry(tmp_path: Path) -> None:
    path = tmp_path / "bilateral.ies"
    write_ies(path, (0.0, 90.0), (0.0, 90.0, 180.0), ((5, 10), (5, 20), (5, 30)))
    ies = read_ies(path)
    # Symmetric about the 0–180° plane: 270° reads as 90°.
    assert ies.intensity(90, 270) == pytest.approx(20)
