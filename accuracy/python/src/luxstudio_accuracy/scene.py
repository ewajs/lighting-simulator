"""Radiance scenes: luminaires, a room's reflecting surfaces, boxes, and illuminance at points.

Direct light (``DIRECT_OPTIONS``) needs nothing but the luminaires and the
boxes: inside a closed box nothing is hidden by its walls. Bounced light comes
from two runs with Radiance's ordinary source subdivision: total light with every
bounce (``BOUNCE_OPTIONS``) less direct light alone (``BOUNCE_DIRECT_OPTIONS``).
The fine source sampling direct light needs close to a luminaire would apply at
every bounce and take hours; bounced light is smooth, and the direct part's
sampling error cancels in the difference. The room's surfaces reflect
diffusely (Radiance's ``plastic`` with no specularity), as Lux Studio models
them (ADR 0060).
"""

import os
import resource
import shutil
import time
from dataclasses import dataclass
from pathlib import Path

from luxstudio_accuracy.geometry import Vec3, light_axes, to_radiance, xform_rotation
from luxstudio_accuracy.radiance import LUMINOUS_EFFICACY, Radiance

_COMMON = (
    "-h",  # No header.
    "-I+",  # Irradiance at each point, facing its normal.
    "-dj",
    "0",  # No jitter: the same direct light every run.
    "-ds",
    "0.01",  # Split area sources finely, so close to large luminaires stays right.
    "-dt",
    "0",  # Test every source, however faint.
    "-dc",
    "1",  # Full certainty.
)

DIRECT_OPTIONS = (*_COMMON, "-ab", "0")
"""rtrace's options for direct light only, recorded with each reference."""

_ORDINARY_SOURCES = (
    "-h",
    "-I+",
    "-dj",
    "0",
    "-ds",
    "0.2",  # Radiance's default source subdivision.
    "-dt",
    "0",  # Test every source. The default (0.05) skips faint ones by statistics
    "-dc",
    "1",  # that depend on the order rays arrive in, which -n changes: runs didn't repeat.
)

BOUNCE_DIRECT_OPTIONS = (*_ORDINARY_SOURCES, "-ab", "0")
"""Direct light with ordinary source sampling: subtracted from BOUNCE_OPTIONS' total."""

BOUNCE_OPTIONS = (
    *_ORDINARY_SOURCES,
    "-ab",
    "24",  # Up to 24 bounces: doubling it changes a room's bounced light by under 0.1 %.
    "-lr",
    "0",  # No depth limit besides -ab: the default (-lr -10) cut bounced light by 1.3 %.
    "-ad",
    "4096",  # Rays per sample: doubling it changes a room's bounced light by under 0.1 %.
    "-as",
    "0",  # No extra super-sampling.
    "-aa",
    "0",  # No irradiance caching: every point sampled on its own, no interpolation error.
    "-lw",
    "1e-5",  # Follow rays until they carry less than this share of their light.
)
"""rtrace's options for total light; less BOUNCE_DIRECT_OPTIONS' direct light, the bounced light."""

PROCESSES = os.cpu_count() or 1
"""rtrace's processes (``-n``): every core. With no irradiance cache each point is
computed on its own, so this changes how fast, not what."""

OFFSET_M = 1e-3
"""Points are lifted this far off their surface along its normal, so Radiance's
rays start in the room, not inside the surface they measure."""


@dataclass(frozen=True)
class PlacedLuminaire:
    """A luminaire as a Radiance scene needs it."""

    ies_path: Path
    origin: Vec3
    tilt_deg: float
    pan_deg: float


@dataclass(frozen=True)
class ShadowBox:
    """A box that blocks light, in Lux Studio's coordinates."""

    centre: Vec3
    half: Vec3
    yaw_deg: float
    reflectance: float = 0.0
    """The share of light it reflects, diffusely: 0 for black."""


@dataclass(frozen=True)
class RoomShell:
    """A rectangular room's size and its surfaces' reflectances, as Lux Studio's ``Room``."""

    width: float
    depth: float
    height: float
    floor: float
    walls: float
    ceiling: float


@dataclass(frozen=True)
class SphereShell:
    """The inside of a hollow sphere that reflects diffusely: an integrating sphere."""

    centre: Vec3
    radius: float
    reflectance: float


def build_scene(
    radiance: Radiance,
    work_dir: Path,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    room: RoomShell | SphereShell | None,
) -> Path:
    """Writes a scene and compiles it to an octree.

    Args:
        radiance: The installed Radiance.
        work_dir: An empty folder for the scene's files.
        luminaires: The scene's luminaires.
        boxes: Boxes that block light.
        room: The reflecting surfaces around the luminaires: a room, a sphere,
            or None for luminaires alone.

    Returns:
        The octree, ready for ``measure``.
    """
    lines: list[str] = []
    if isinstance(room, SphereShell):
        lines += _sphere(room)
    elif room:
        lines += _room(room)
    for index, luminaire in enumerate(luminaires):
        lines.append(_luminaire(radiance, work_dir, luminaire, f"lum{index}"))
    for index, box in enumerate(boxes):
        lines += _box(box, f"box{index}")
    (work_dir / "scene.rad").write_text("\n".join(lines) + "\n", encoding="utf-8")
    octree = work_dir / "scene.oct"
    radiance.run("oconv", "scene.rad", cwd=work_dir, output=octree)
    return octree


def measure(
    radiance: Radiance,
    octree: Path,
    points: list[tuple[Vec3, Vec3]],
    options: tuple[str, ...],
) -> list[float]:
    """Illuminance in lux at each point, as Radiance computes it.

    Args:
        radiance: The installed Radiance.
        octree: From ``build_scene``.
        points: Each point and the unit normal its surface faces with, in Lux
            Studio's coordinates. They're lifted OFFSET_M along the normal.
        options: DIRECT_OPTIONS, BOUNCE_OPTIONS or BOUNCE_DIRECT_OPTIONS.

    Returns:
        The illuminance at each point, in lx.
    """
    rays = ""
    for point, normal in points:
        p = to_radiance(point + normal.scaled(OFFSET_M))
        n = to_radiance(normal)
        rays += f"{p.x} {p.y} {p.z} {n.x} {n.y} {n.z}\n"
    output = radiance.run(
        "rtrace", "-n", str(PROCESSES), *options, "-ov", octree.name, cwd=octree.parent, stdin=rays
    )
    return [_lux(line) for line in output.splitlines() if line.strip()]


@dataclass(frozen=True)
class RunTime:
    """How long rtrace took."""

    wall_s: float
    """Wall-clock seconds."""
    cpu_s: float
    """CPU seconds, summed over all of rtrace's processes."""


@dataclass(frozen=True)
class DirectAndBounced:
    """Direct and bounced light at each point, in lx, and how long Radiance took."""

    direct: list[float]
    bounced: list[float]
    direct_time: RunTime
    """The direct-light run."""
    bounced_time: RunTime
    """The two runs bounced light takes: total light, and direct light to subtract."""


def timed_measure(
    radiance: Radiance,
    octree: Path,
    points: list[tuple[Vec3, Vec3]],
    options: tuple[str, ...],
) -> tuple[list[float], RunTime]:
    """``measure``, timed: wall-clock and CPU seconds.

    Args:
        radiance: The installed Radiance.
        octree: From ``build_scene``.
        points: As for ``measure``.
        options: As for ``measure``.

    Returns:
        The illuminance at each point, in lx, and the time it took.
    """
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    start = time.perf_counter()
    values = measure(radiance, octree, points, options)
    wall = time.perf_counter() - start
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    cpu = (after.ru_utime + after.ru_stime) - (before.ru_utime + before.ru_stime)
    return values, RunTime(wall_s=wall, cpu_s=cpu)


def direct_and_bounced(
    radiance: Radiance,
    octree: Path,
    points: list[tuple[Vec3, Vec3]],
    bounce_options: tuple[str, ...] = BOUNCE_OPTIONS,
) -> DirectAndBounced:
    """Direct light with fine source sampling, and bounced light, at each point.

    Args:
        radiance: The installed Radiance.
        octree: From ``build_scene``, with the room's surfaces.
        points: As for ``measure``.
        bounce_options: rtrace's options for total light: BOUNCE_OPTIONS,
            or others to test the checks with.

    Returns:
        Direct and bounced illuminance at each point, in lx, and the runs' times.
    """
    direct, direct_time = timed_measure(radiance, octree, points, DIRECT_OPTIONS)
    total, total_time = timed_measure(radiance, octree, points, bounce_options)
    plain, plain_time = timed_measure(radiance, octree, points, BOUNCE_DIRECT_OPTIONS)
    return DirectAndBounced(
        direct=direct,
        bounced=[t - p for t, p in zip(total, plain, strict=True)],
        direct_time=direct_time,
        bounced_time=RunTime(
            wall_s=total_time.wall_s + plain_time.wall_s,
            cpu_s=total_time.cpu_s + plain_time.cpu_s,
        ),
    )


def illuminance(
    radiance: Radiance,
    work_dir: Path,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    points: list[tuple[Vec3, Vec3]],
) -> list[float]:
    """Direct illuminance in lux at each point, with no room: ``build_scene`` then ``measure``."""
    octree = build_scene(radiance, work_dir, luminaires, boxes, None)
    return measure(radiance, octree, points, DIRECT_OPTIONS)


def _room(room: RoomShell) -> list[str]:
    """The room's six surfaces, as grey diffuse materials and polygons.

    Radiance's plastic reflects from either side, so the polygons' winding
    doesn't matter. Lux Studio's (x, y, z) is Radiance's (x, -z, y).
    """
    w, d, h = room.width / 2, room.depth / 2, room.height
    corners: dict[str, list[tuple[float, float, float]]] = {
        "floor": [(-w, -d, 0), (w, -d, 0), (w, d, 0), (-w, d, 0)],
        "ceiling": [(-w, -d, h), (-w, d, h), (w, d, h), (w, -d, h)],
        "wall_x0": [(-w, -d, 0), (-w, d, 0), (-w, d, h), (-w, -d, h)],
        "wall_x1": [(w, -d, 0), (w, -d, h), (w, d, h), (w, d, 0)],
        "wall_y0": [(-w, -d, 0), (-w, -d, h), (w, -d, h), (w, -d, 0)],
        "wall_y1": [(-w, d, 0), (w, d, 0), (w, d, h), (-w, d, h)],
    }
    reflectance = {
        "floor": room.floor,
        "ceiling": room.ceiling,
        "wall_x0": room.walls,
        "wall_x1": room.walls,
        "wall_y0": room.walls,
        "wall_y1": room.walls,
    }
    lines = []
    for name, vertices in corners.items():
        rho = reflectance[name]
        coordinates = "  ".join(f"{x} {y} {z}" for x, y, z in vertices)
        lines.append(f"void plastic {name}_m 0 0 5 {rho} {rho} {rho} 0 0")
        lines.append(f"{name}_m polygon {name} 0 0 12 {coordinates}")
    return lines


def _sphere(shell: SphereShell) -> list[str]:
    """A grey diffuse sphere; plastic reflects from either side, so from inside too."""
    rho = shell.reflectance
    c = to_radiance(shell.centre)
    return [
        f"void plastic shell_m 0 0 5 {rho} {rho} {rho} 0 0",
        f"shell_m sphere shell 0 0 4 {c.x} {c.y} {c.z} {shell.radius}",
    ]


def _luminaire(radiance: Radiance, work_dir: Path, luminaire: PlacedLuminaire, name: str) -> str:
    """Converts an IES file with ies2rad and aims it: one scene line."""
    shutil.copy(luminaire.ies_path, work_dir / f"{name}.ies")
    # -dm: dimensions in metres; -t default: white light; -o: output name.
    radiance.run("ies2rad", "-dm", "-t", "default", "-o", name, f"{name}.ies", cwd=work_dir)
    rx, ry, rz = xform_rotation(light_axes(luminaire.tilt_deg, luminaire.pan_deg))
    at = to_radiance(luminaire.origin)
    return f"!xform -rx {rx} -ry {ry} -rz {rz} -t {at.x} {at.y} {at.z} {name}.rad"


def _box(box: ShadowBox, name: str) -> list[str]:
    """A diffuse box: genbox makes it from the origin, then it's centred, turned and moved.

    Lux Studio's box is x across, y up, z front to back, turned about its
    vertical. In Radiance that's X, Z and -Y, turned about Z by the same
    angle (Lux Studio's +z towards +x is Radiance's +X towards +Y).
    """
    sx, sy, sz = 2 * box.half.x, 2 * box.half.z, 2 * box.half.y
    at = to_radiance(box.centre)
    rho = box.reflectance
    return [
        f"void plastic {name}_m 0 0 5 {rho} {rho} {rho} 0 0",
        f"!genbox {name}_m {name} {sx} {sy} {sz} | xform -t {-sx / 2} {-sy / 2} {-sz / 2} "
        f"-rz {box.yaw_deg} -t {at.x} {at.y} {at.z}",
    ]


def _lux(line: str) -> float:
    """Illuminance in lx from one line of rtrace's irradiance (R G B, in W/m²)."""
    red, green, blue = (float(value) for value in line.split()[:3])
    return LUMINOUS_EFFICACY * (0.265 * red + 0.670 * green + 0.065 * blue)
