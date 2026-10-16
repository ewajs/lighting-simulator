"""Radiance scenes: luminaires from IES files, shadow boxes, and illuminance at points.

Only direct light is computed for now (``-ab 0``): no room surfaces are
needed, since nothing inside a closed box is hidden by its walls. Bounce
light (M5.3) will add the surfaces and their reflectances.
"""

import shutil
from dataclasses import dataclass
from pathlib import Path

from luxstudio_accuracy.geometry import Vec3, light_axes, to_radiance, xform_rotation
from luxstudio_accuracy.radiance import LUMINOUS_EFFICACY, Radiance

RTRACE_OPTIONS = (
    "-h",  # No header.
    "-I+",  # Irradiance at each point, facing its normal.
    "-ab",
    "0",  # Direct light only.
    "-dj",
    "0",  # No jitter: the same result every run.
    "-ds",
    "0.01",  # Split area sources finely, so close to large luminaires stays right.
    "-dt",
    "0",  # Test every source, however faint.
    "-dc",
    "1",  # Full certainty.
)
"""rtrace's options, recorded with each reference."""


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


def illuminance(
    radiance: Radiance,
    work_dir: Path,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    points: list[tuple[Vec3, Vec3]],
) -> list[float]:
    """Direct illuminance in lux at each point, as Radiance computes it.

    Args:
        radiance: The installed Radiance.
        work_dir: An empty folder for the scene's files.
        luminaires: The scene's luminaires.
        boxes: Boxes that cast shadows.
        points: Each point and the unit normal its surface faces with,
            in Lux Studio's coordinates.

    Returns:
        The illuminance at each point, in lx.
    """
    lines = ["void plastic black 0 0 5 0 0 0 0 0"]
    for index, luminaire in enumerate(luminaires):
        lines.append(_luminaire(radiance, work_dir, luminaire, f"lum{index}"))
    for index, box in enumerate(boxes):
        lines.append(_box(box, f"box{index}"))
    (work_dir / "scene.rad").write_text("\n".join(lines) + "\n", encoding="utf-8")
    radiance.run("oconv", "scene.rad", cwd=work_dir, output=work_dir / "scene.oct")
    rays = "".join(
        f"{p.x} {p.y} {p.z} {n.x} {n.y} {n.z}\n"
        for p, n in ((to_radiance(point), to_radiance(normal)) for point, normal in points)
    )
    output = radiance.run("rtrace", *RTRACE_OPTIONS, "-ov", "scene.oct", cwd=work_dir, stdin=rays)
    return [_lux(line) for line in output.splitlines() if line.strip()]


def _luminaire(radiance: Radiance, work_dir: Path, luminaire: PlacedLuminaire, name: str) -> str:
    """Converts an IES file with ies2rad and aims it: one scene line."""
    shutil.copy(luminaire.ies_path, work_dir / f"{name}.ies")
    # -dm: dimensions in metres; -t default: white light; -o: output name.
    radiance.run("ies2rad", "-dm", "-t", "default", "-o", name, f"{name}.ies", cwd=work_dir)
    rx, ry, rz = xform_rotation(light_axes(luminaire.tilt_deg, luminaire.pan_deg))
    at = to_radiance(luminaire.origin)
    return f"!xform -rx {rx} -ry {ry} -rz {rz} -t {at.x} {at.y} {at.z} {name}.rad"


def _box(box: ShadowBox, name: str) -> str:
    """A black box: genbox makes it from the origin, then it's centred, turned and moved.

    Lux Studio's box is x across, y up, z front to back, turned about its
    vertical. In Radiance that's X, Z and -Y, turned about Z by the same
    angle (Lux Studio's +z towards +x is Radiance's +X towards +Y).
    """
    sx, sy, sz = 2 * box.half.x, 2 * box.half.z, 2 * box.half.y
    at = to_radiance(box.centre)
    return (
        f"!genbox black {name} {sx} {sy} {sz} | xform -t {-sx / 2} {-sy / 2} {-sz / 2} "
        f"-rz {box.yaw_deg} -t {at.x} {at.y} {at.z}"
    )


def _lux(line: str) -> float:
    """Illuminance in lx from one line of rtrace's irradiance (R G B, in W/m²)."""
    red, green, blue = (float(value) for value in line.split()[:3])
    return LUMINOUS_EFFICACY * (0.265 * red + 0.670 * green + 0.065 * blue)
