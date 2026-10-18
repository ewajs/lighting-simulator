import math

import pytest

from luxstudio_accuracy.sky import Daylight, gensky_lines, sky_levels, sun_position
from luxstudio_accuracy.windows import Window, open_rectangles, read_windows


def at(**changes: float | int | str) -> Daylight:
    fields: dict[str, float | int | str] = {
        "sky": "overcast",
        "solar_hour": 12.0,
        "month": 3,
        "day": 21,
        "latitude_deg": 0.0,
        "north_deg": 0.0,
    }
    fields.update(changes)
    return Daylight(**fields)  # type: ignore[arg-type]


def test_the_sun_matches_duffie_and_beckman_example_1_6_1() -> None:
    # 43° N, 9:30 on February 13th: zenith 66.5°, azimuth −40.0° from south (bearing 140°).
    sun = sun_position(at(latitude_deg=43.0, month=2, day=13, solar_hour=9.5))
    assert sun.altitude_deg == pytest.approx(90 - 66.5, abs=0.5)
    assert sun.azimuth_deg == pytest.approx(140.0, abs=0.5)
    # 18:30 on July 1st: zenith 79.6°, azimuth 112.0° (bearing 292°).
    sun = sun_position(at(latitude_deg=43.0, month=7, day=1, solar_hour=18.5))
    assert sun.altitude_deg == pytest.approx(90 - 79.6, abs=0.5)
    assert sun.azimuth_deg == pytest.approx(292.0, abs=0.5)


def test_the_noon_sun_is_due_north_in_the_south() -> None:
    sun = sun_position(at(latitude_deg=-34.6))
    assert sun.altitude_deg == pytest.approx(90 - 34.6, abs=0.5)
    assert min(sun.azimuth_deg, 360 - sun.azimuth_deg) == pytest.approx(0.0, abs=1e-4)


def test_the_levels_follow_the_ies_availability_model() -> None:
    daylight = at(latitude_deg=40.0, sky="clear")
    sun = sun_position(daylight)
    sin_sun = math.sin(math.radians(sun.altitude_deg))
    levels = sky_levels(daylight, sun)
    assert levels.horizontal_sky_lx == pytest.approx((0.8 + 15.5 * math.sqrt(sin_sun)) * 1000)
    outside = 127_500 * (1 + 0.034 * math.cos(2 * math.pi * 78 / 365))
    assert levels.sun_normal_lx == pytest.approx(outside * math.exp(-0.21 / sin_sun))
    overcast = sky_levels(at(latitude_deg=40.0), sun)
    assert overcast.horizontal_sky_lx == pytest.approx((0.3 + 21 * sin_sun) * 1000)
    assert overcast.sun_normal_lx == 0


def test_gensky_gets_the_sun_west_of_south_dimmed_skies_and_the_room_s_north() -> None:
    daylight = at(latitude_deg=-34.6, sky="clear", solar_hour=10.0, north_deg=30.0)
    command = gensky_lines(daylight, 0.8)[0]
    sun = sun_position(daylight)
    assert f"-ang {sun.altitude_deg} {sun.azimuth_deg - 180}" in command
    assert "+s" in command
    levels = sky_levels(daylight, sun)
    assert f"-B {0.8 * levels.horizontal_sky_lx / 179.0}" in command
    assert command.endswith("| xform -rz -30.0")


def test_a_wall_with_a_window_is_cut_into_the_rectangles_around_it() -> None:
    # A 4 × 3 wall, a window from 1 to 3 along it and 1 to 2 up it: 8 cells around it.
    cells = open_rectangles((4.0, 3.0), [(1.0, 3.0, 1.0, 2.0)])
    assert len(cells) == 8
    assert sum((a1 - a0) * (b1 - b0) for a0, a1, b0, b1 in cells) == pytest.approx(12 - 2)


def test_windows_are_clear_and_of_one_glass() -> None:
    window = {
        "surface": "wall-z-",
        "position": {"x": 0, "y": 1.5, "z": -2},
        "width": 1.2,
        "height": 1.2,
        "glazing": "clear",
        "covering": "none",
    }
    (read,) = read_windows([window])
    assert isinstance(read, Window)
    assert read.transmittance == 0.8
    corner, _, _ = read.rectangle()
    assert (corner.x, corner.y, corner.z) == (-0.6, 0.9, -2.0)
    with pytest.raises(ValueError, match="clear"):
        read_windows([{**window, "glazing": "frosted"}])
    with pytest.raises(ValueError, match="same share"):
        read_windows([window, {**window, "glazing": "tinted"}])
