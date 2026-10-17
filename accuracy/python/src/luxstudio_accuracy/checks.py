"""Checks that Radiance reproduces values worked out by hand, before it is trusted.

No reference is written unless every check passes (ADR 0058). A Radiance
release with the ``ies2rad`` multiplier bug, a wrong orientation or a wrong
unit fails here, not in a reference.

Each check places one luminaire alone and measures far from it
(CHECK_DISTANCE_M), where the illuminance on a surface facing it is I / d²,
with I read from the IES file's table by this package's own reader.

The demo's files are checked as point sources: copies with the same table and
no luminous opening. That isolates what the checks are for (reading the file,
its units, its orientation) from how Radiance models a large opening's area,
which it samples with errors of up to 2 % at grazing angles even far away (a
box-shaped opening, straight up). Openings' effects close to a luminaire are
real, and the reference rooms show them.
"""

import math
import tempfile
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path

from luxstudio_accuracy.geometry import LightAxes, Vec3, light_axes
from luxstudio_accuracy.ies import IesFile, read_ies, write_ies
from luxstudio_accuracy.radiance import Radiance
from luxstudio_accuracy.rooms import IES_DIR
from luxstudio_accuracy.scene import (
    BOUNCE_OPTIONS,
    PlacedLuminaire,
    RoomShell,
    build_scene,
    direct_and_bounced,
    illuminance,
)

CHECK_DISTANCE_M = 20.0
"""How far from the luminaire to measure: 40x the largest demo opening."""

TOLERANCE = 0.002
"""The largest relative difference a check allows: 0.2 %."""

MIN_SHARE_OF_PEAK = 0.05
"""Directions dimmer than this share of the peak are skipped: tiny values make noisy ratios."""

LOPSIDED_VERTICAL = (0.0, 30.0, 60.0, 90.0, 120.0, 150.0, 180.0)
LOPSIDED_HORIZONTAL = (0.0, 90.0, 180.0, 270.0, 360.0)
LOPSIDED_CANDELA = (
    (900.0, 1200.0, 700.0, 300.0, 150.0, 80.0, 40.0),
    (900.0, 600.0, 400.0, 250.0, 120.0, 60.0, 40.0),
    (900.0, 300.0, 200.0, 100.0, 90.0, 70.0, 40.0),
    (900.0, 500.0, 450.0, 350.0, 200.0, 100.0, 40.0),
    (900.0, 1200.0, 700.0, 300.0, 150.0, 80.0, 40.0),
)
"""A made-up distribution, different in every direction, so any wrong turn shows."""

AIMS = ((0.0, 0.0), (30.0, 45.0), (60.0, -120.0), (90.0, 200.0), (15.0, 90.0))
"""(tilt, pan) pairs in degrees, for the orientation checks."""


@dataclass(frozen=True)
class Check:
    """One check: what the hand calculation expects and what Radiance gives."""

    name: str
    expected_lux: float
    radiance_lux: float
    tolerance: float = TOLERANCE
    """The largest relative difference allowed."""

    @property
    def error(self) -> float:
        """The relative difference, Radiance against the hand value."""
        return self.radiance_lux / self.expected_lux - 1

    @property
    def passed(self) -> bool:
        """Whether the difference is within the check's tolerance."""
        return abs(self.error) <= self.tolerance


def direction(axes: LightAxes, vertical_deg: float, horizontal_deg: float) -> Vec3:
    """The world direction of Type C angles leaving a light with these axes.

    Args:
        axes: The light's axes.
        vertical_deg: From down (0) to up (180).
        horizontal_deg: From forward (0), anticlockwise from above.

    Returns:
        A unit vector, in Lux Studio's coordinates.
    """
    theta, phi = math.radians(vertical_deg), math.radians(horizontal_deg)
    return (
        axes.down.scaled(math.cos(theta))
        + axes.forward.scaled(math.sin(theta) * math.cos(phi))
        + axes.side.scaled(math.sin(theta) * math.sin(phi))
    )


def run_checks(radiance: Radiance) -> list[Check]:
    """Runs every check: each demo IES file aimed down, then the orientation checks.

    Args:
        radiance: The installed Radiance.

    Returns:
        Every check, passed or not.
    """
    checks: list[Check] = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        for path in sorted(IES_DIR.glob("*.ies")):
            ies = read_ies(path)
            point = work / path.name
            write_ies(point, ies.vertical_deg, ies.horizontal_deg, ies.candela)
            checks += _measure(radiance, work, point, ies, 0.0, 0.0, _demo_angles)
        lopsided = work / "lopsided.ies"
        write_ies(lopsided, LOPSIDED_VERTICAL, LOPSIDED_HORIZONTAL, LOPSIDED_CANDELA)
        for tilt, pan in AIMS:
            checks += _measure(
                radiance, work, lopsided, read_ies(lopsided), tilt, pan, _lopsided_angles
            )
        checks.append(sphere_check(radiance, work))
    return checks


SPHERE_ROOM_M = 3.0
"""The integrating-sphere check's cube room: 3 m on each side."""
SPHERE_REFLECTANCE = 0.8
"""High, as a room's walls and ceiling are, so that missing bounces show: with
ρ = 0.8, stopping after n bounces leaves out 0.8ⁿ of the bounced light."""
SPHERE_CANDELA = 100.0
SPHERE_POINTS_PER_SIDE = 4
SPHERE_TOLERANCE = 0.02
"""Radiance samples bounced light at random, so its average carries a little noise."""


def sphere_check(
    radiance: Radiance, work: Path, bounce_options: tuple[str, ...] = BOUNCE_OPTIONS
) -> Check:
    """Radiance's bounced light against the integrating sphere.

    In a closed room whose surfaces all reflect ρ, every lumen is reflected
    again and again until absorbed, so the bounced light reaching the
    surfaces, averaged over their area, is E = ρ Φ / (A (1 − ρ)) (the
    integrating-sphere formula; e.g. the IES Lighting Handbook, on
    inter-reflections). Here a uniform 100 cd point source sits in the middle
    of a 3 m cube: Φ = 4π · 100 lm, A = 54 m².

    Args:
        radiance: The installed Radiance.
        work: A folder for the scene's files.
        bounce_options: rtrace's options for total light: the references' own,
            or others to prove the check catches a mistake.

    Returns:
        The check: Radiance's average bounced light (total less direct) on the
        cube's surfaces against the formula.
    """
    folder = work / "sphere"
    folder.mkdir()
    point_file = folder / "point.ies"
    write_ies(point_file, (0.0, 180.0), (0.0,), ((SPHERE_CANDELA, SPHERE_CANDELA),))
    s, rho = SPHERE_ROOM_M, SPHERE_REFLECTANCE
    room = RoomShell(s, s, s, rho, rho, rho)
    luminaire = PlacedLuminaire(point_file, Vec3(0, s / 2, 0), 0, 0)
    octree = build_scene(radiance, folder, [luminaire], [], room)
    points = _cube_points(s)
    bounced_at = direct_and_bounced(radiance, octree, points, bounce_options).bounced
    bounced = sum(bounced_at) / len(points)
    flux = 4 * math.pi * SPHERE_CANDELA
    area = 6 * s * s
    return Check(
        name=f"integrating sphere: {s:g} m cube, ρ {rho:g}, {SPHERE_CANDELA:g} cd point",
        expected_lux=rho * flux / (area * (1 - rho)),
        radiance_lux=bounced,
        tolerance=SPHERE_TOLERANCE,
    )


def _cube_points(side: float) -> list[tuple[Vec3, Vec3]]:
    """Points at cell centres on each face of a cube of `side` standing on the floor, facing in."""
    n = SPHERE_POINTS_PER_SIDE
    h = side / 2
    cells = [(-h + (i + 0.5) * side / n) for i in range(n)]
    points: list[tuple[Vec3, Vec3]] = []
    for a in cells:
        for b in cells:
            points.append((Vec3(a, 0, b), Vec3(0, 1, 0)))
            points.append((Vec3(a, side, b), Vec3(0, -1, 0)))
            points.append((Vec3(-h, b + h, a), Vec3(1, 0, 0)))
            points.append((Vec3(h, b + h, a), Vec3(-1, 0, 0)))
            points.append((Vec3(a, b + h, -h), Vec3(0, 0, 1)))
            points.append((Vec3(a, b + h, h), Vec3(0, 0, -1)))
    return points


def _demo_angles(ies: IesFile) -> Iterator[tuple[float, float]]:
    """Directions to check a real file in: every 20° down and round, where it's bright."""
    peak = max(max(row) for row in ies.candela)
    for vertical in range(0, 181, 20):
        for horizontal in (0, 90, 180, 270):
            if ies.intensity(vertical, horizontal) >= MIN_SHARE_OF_PEAK * peak:
                yield float(vertical), float(horizontal)


def _lopsided_angles(_ies: IesFile) -> Iterator[tuple[float, float]]:
    """The made-up file's own table angles, where no interpolation is involved."""
    for vertical in (30.0, 60.0, 120.0, 150.0):
        for horizontal in (0.0, 90.0, 180.0, 270.0):
            yield vertical, horizontal


def _measure(
    radiance: Radiance,
    work: Path,
    path: Path,
    ies: IesFile,
    tilt: float,
    pan: float,
    angles: Callable[[IesFile], Iterator[tuple[float, float]]],
) -> list[Check]:
    """One luminaire at the origin, measured CHECK_DISTANCE_M away in each direction."""
    axes = light_axes(tilt, pan)
    directions = list(angles(ies))
    points = [
        (direction(axes, v, h).scaled(CHECK_DISTANCE_M), direction(axes, v, h).scaled(-1))
        for v, h in directions
    ]
    folder = work / f"{path.stem}-{tilt:g}-{pan:g}"
    folder.mkdir()
    luminaire = PlacedLuminaire(path, Vec3(0, 0, 0), tilt, pan)
    measured = illuminance(radiance, folder, [luminaire], [], points)
    return [
        Check(
            name=f"{path.name} tilt {tilt:g}° pan {pan:g}° at ({v:g}°, {h:g}°)",
            expected_lux=ies.intensity(v, h) / CHECK_DISTANCE_M**2,
            radiance_lux=lux,
        )
        for (v, h), lux in zip(directions, measured, strict=True)
    ]
