"""The daylight outside a reference room's windows, for Radiance's gensky (ADR 0081).

A room file's ``daylight`` is Lux Studio's (ADR 0079): the sky (``overcast``
or ``clear``), the solar time, the date, the latitude and which way north is.
This module works out, on its own, where the sun is and how bright the sky
and the sun are, as Lux Studio's ADR 0080 sets them. Radiance's gensky then
spreads that light over the sky with its own CIE distributions. Agreement
between the two programs checks Lux Studio's sky, its windows and its bounces,
not just a shared formula.

- The sun's position: Duffie & Beckman, *Solar Engineering of Thermal
  Processes* (4th ed., 2013), §1.6, with Spencer's declination.
- The levels: the IES daylight availability model (IES Lighting Handbook,
  9th ed., ch. 8): the sky's horizontal illuminance A + B · sin^C αs klx,
  and on a clear day the sun's direct normal illuminance
  127.5 klx · (1 + 0.034 cos(2π (n − 2) / 365)) · e^(−0.21 / sin αs).
"""

import math
from dataclasses import dataclass
from typing import Any

from luxstudio_accuracy.radiance import LUMINOUS_EFFICACY

MONTH_DAYS = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
"""Days in each month of a 365-day year."""

IES_SKY = {"overcast": (0.3, 21.0, 1.0), "clear": (0.8, 15.5, 0.5)}
"""The sky's horizontal illuminance A + B · sin^C αs, in klx: (A, B, C) by sky."""

EXTRATERRESTRIAL_LX = 127_500.0
"""The sun's illuminance outside the atmosphere, at the mean distance, in lx."""

CLEAR_EXTINCTION = 0.21
"""The atmosphere's extinction on a clear day."""


@dataclass(frozen=True)
class Daylight:
    """A room's daylight, as Lux Studio's ``Daylight``."""

    sky: str
    """``overcast`` or ``clear``: the rooms leave out night, which has none."""
    solar_hour: float
    month: int
    day: int
    latitude_deg: float
    north_deg: float
    """Which way north is: clockwise seen from above from the room's −z."""


def read_daylight(spec: dict[str, Any]) -> Daylight:
    """Reads a room file's ``daylight``.

    Args:
        spec: Its fields, named as Lux Studio's: ``sky``, ``solarHour``, ``month``,
            ``day``, ``latitudeDeg`` and ``northDeg``.

    Returns:
        The daylight.

    Raises:
        ValueError: For a sky with no daylight.
    """
    sky = str(spec["sky"])
    if sky not in IES_SKY:
        raise ValueError(f"A reference room's sky must be overcast or clear, not {sky}")
    return Daylight(
        sky=sky,
        solar_hour=float(spec["solarHour"]),
        month=int(spec["month"]),
        day=int(spec["day"]),
        latitude_deg=float(spec["latitudeDeg"]),
        north_deg=float(spec["northDeg"]),
    )


def day_of_year(month: int, day: int) -> int:
    """The day of the year, 1 on January 1st, in a 365-day year."""
    return sum(MONTH_DAYS[: month - 1]) + day


@dataclass(frozen=True)
class Sun:
    """Where the sun is."""

    altitude_deg: float
    azimuth_deg: float
    """Compass bearing, clockwise from north: 90 east, 180 south."""


def sun_position(daylight: Daylight) -> Sun:
    """The sun's position for the daylight's date, solar time and latitude.

    Args:
        daylight: The room's daylight.

    Returns:
        Its altitude and compass bearing (Duffie & Beckman eqs. 1.6.5 and 1.6.6).
    """
    b = 2 * math.pi * (day_of_year(daylight.month, daylight.day) - 1) / 365
    declination = (
        0.006918
        - 0.399912 * math.cos(b)
        + 0.070257 * math.sin(b)
        - 0.006758 * math.cos(2 * b)
        + 0.000907 * math.sin(2 * b)
        - 0.002697 * math.cos(3 * b)
        + 0.00148 * math.sin(3 * b)
    )
    hour_angle = math.radians(15 * (daylight.solar_hour - 12))
    latitude = math.radians(daylight.latitude_deg)
    cos_zenith = math.cos(latitude) * math.cos(declination) * math.cos(hour_angle) + math.sin(
        latitude
    ) * math.sin(declination)
    zenith = math.acos(max(-1.0, min(1.0, cos_zenith)))
    across = math.sin(zenith) * math.cos(latitude)
    if abs(across) < 1e-12:
        return Sun(90 - math.degrees(zenith), 0.0)
    cos_from_south = (math.cos(zenith) * math.sin(latitude) - math.sin(declination)) / across
    from_south = math.degrees(math.acos(max(-1.0, min(1.0, cos_from_south))))
    signed = -from_south if hour_angle < 0 else from_south
    return Sun(90 - math.degrees(zenith), (180 + signed) % 360)


@dataclass(frozen=True)
class SkyLevels:
    """How bright the sky and the sun are, by the IES availability model."""

    horizontal_sky_lx: float
    """The sky's illuminance on an unobstructed horizontal plane, without the sun."""
    sun_normal_lx: float
    """The sun's illuminance on a plane facing it: 0 under an overcast sky."""


def sky_levels(daylight: Daylight, sun: Sun) -> SkyLevels:
    """The sky's and the sun's illuminance for a daylight with the sun above the horizon.

    Args:
        daylight: The room's daylight.
        sun: Where the sun is, from ``sun_position``.

    Returns:
        The levels.

    Raises:
        ValueError: If the sun has set: the rooms are by day.
    """
    if sun.altitude_deg <= 0:
        raise ValueError("The sun is below the horizon: a reference room needs daylight")
    sin_sun = math.sin(math.radians(sun.altitude_deg))
    a, b, c = IES_SKY[daylight.sky]
    horizontal = (a + b * sin_sun**c) * 1000
    if daylight.sky != "clear":
        return SkyLevels(horizontal, 0.0)
    n = day_of_year(daylight.month, daylight.day)
    outside = EXTRATERRESTRIAL_LX * (1 + 0.034 * math.cos(2 * math.pi * (n - 2) / 365))
    return SkyLevels(horizontal, outside * math.exp(-CLEAR_EXTINCTION / sin_sun))


GROUND_REFLECTANCE = 0.2
"""The ground outside reflects this share of the light on it, as Lux Studio's (gensky's default)."""

_GLOWS = [
    "skyfunc glow sky_glow 0 0 4 1 1 1 0",
    "sky_glow source sky 0 0 4 0 0 1 180",
    "skyfunc glow ground_glow 0 0 4 1 1 1 0",
    "ground_glow source ground 0 0 4 0 0 -1 180",
]
"""The sky's and the ground's hemispheres, glowing as gensky's ``skyfunc`` says (its manual)."""


def gensky_lines(daylight: Daylight, transmittance: float, with_sun: bool = True) -> list[str]:
    """The sky as Radiance scene lines: gensky's CIE sky at this module's levels.

    The sun is placed where ``sun_position`` puts it (gensky's ``-ang``),
    and the sky set by its horizontal illuminance (``-B``) and the sun by its
    direct illuminance on the ground (``-R``), all dimmed by the windows'
    ``transmittance``. Gensky's north, Radiance's +Y, is turned to the room's.

    Args:
        daylight: The room's daylight.
        transmittance: The share of the light the windows let in.
        with_sun: False leaves the sun's beam out of a clear sky, for checking the sky alone.

    Returns:
        The lines, for a scene file.
    """
    sun = sun_position(daylight)
    levels = sky_levels(daylight, sun)
    # Radiance's units are W/m² of white light: lux / LUMINOUS_EFFICACY.
    horizontal = transmittance * levels.horizontal_sky_lx / LUMINOUS_EFFICACY
    args = [
        "-ang",
        f"{sun.altitude_deg}",
        # gensky's azimuth runs west of south.
        f"{sun.azimuth_deg - 180}",
        "+s" if daylight.sky == "clear" else "-c",
        "-g",
        f"{GROUND_REFLECTANCE}",
        "-B",
        f"{horizontal}",
    ]
    if daylight.sky == "clear":
        on_ground = (
            levels.sun_normal_lx * math.sin(math.radians(sun.altitude_deg)) if with_sun else 0.0
        )
        args += ["-R", f"{transmittance * on_ground / LUMINOUS_EFFICACY}"]
    # Lux Studio's north is northDeg clockwise from −z, Radiance's +Y; -rz turns anticlockwise.
    return [f"!gensky {' '.join(args)} | xform -rz {-daylight.north_deg}", *_GLOWS]
