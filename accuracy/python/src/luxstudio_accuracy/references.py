"""Reference values: Radiance's illuminance at every point of a reference room.

A reference (``accuracy/references/<room>.json``) holds the room file it was
made from, and at each point Radiance's direct light and its total light,
direct plus every bounce off the room's surfaces. For a room with furniture,
it also holds both again without the furniture, so the report can show how
much furniture changes bounced light (ADR 0060). It records how it was made:
the Radiance release, rtrace's options, and how long the runs took on which
machine (ADR 0061). Lux Studio's own calculation is
compared with it by ``accuracy/typescript``.
"""

import datetime
import json
import tempfile
from pathlib import Path
from typing import Any

from luxstudio_accuracy.radiance import RELEASE, Radiance, machine
from luxstudio_accuracy.rooms import IES_DIR, Room
from luxstudio_accuracy.scene import (
    BOUNCE_DIRECT_OPTIONS,
    DAYLIGHT_OPTIONS,
    DIRECT_OPTIONS,
    PROCESSES,
    DirectAndBounced,
    PlacedLuminaire,
    RoomShell,
    RunTime,
    ShadowBox,
    bounce_options,
    build_scene,
    direct_and_bounced,
    measure,
)
from luxstudio_accuracy.sky import gensky_lines, sky_levels, sun_position

REFERENCES_DIR = Path(__file__).resolve().parents[3] / "references"
"""accuracy/references: the committed reference values."""

FORMAT = "lux-studio-accuracy-reference"
VERSION = 2
"""2 added total light and the room's reflectances (ADR 0060). A room by day adds its
daylight and each point's ``daylight`` (ADR 0081), which older readers ignore."""


def compute_reference(radiance: Radiance, room: Room) -> dict[str, Any]:
    """Radiance's direct and total illuminance at each of a room's points.

    Args:
        radiance: The installed Radiance, already checked.
        room: The reference room.

    Returns:
        The reference, ready to be written as JSON.
    """
    luminaires = [
        PlacedLuminaire(IES_DIR / item.ies, item.origin, item.tilt_deg, item.pan_deg)
        for item in room.luminaires
    ]
    boxes = [
        ShadowBox(item.centre, item.half, item.yaw_deg, item.reflectance) for item in room.blockers
    ]
    shell = RoomShell(
        room.width,
        room.depth,
        room.height,
        room.reflectances["floor"],
        room.reflectances["walls"],
        room.reflectances["ceiling"],
        room.windows,
    )
    points = [(point.position, point.normal) for point in room.points]
    options = bounce_options(room.bounces)
    transmittance = room.windows[0].transmittance if room.windows else 1.0
    sky = gensky_lines(room.daylight, transmittance) if room.daylight else None
    measured = _measure_scene(radiance, luminaires, boxes, shell, points, options, sky)
    total = [d + b for d, b in zip(measured.direct, measured.bounced, strict=True)]
    # By day, the direct light is the luminaires' alone: the sun is in the daylight.
    direct = (
        _luminaires_direct(radiance, luminaires, boxes, shell, points) if sky else measured.direct
    )
    reference: dict[str, Any] = {
        "format": FORMAT,
        "version": VERSION,
        "room": room.spec,
        "radiance": {
            "release": RELEASE,
            "direct": list(DIRECT_OPTIONS),
            "bounced": [list(options), list(BOUNCE_DIRECT_OPTIONS)],
            "timing": {
                "machine": machine(),
                "processes": PROCESSES,
                "direct": _seconds(measured.direct_time),
                "bounced": _seconds(measured.bounced_time),
            },
        },
        "generated": datetime.date.today().isoformat(),
        "points": [
            {
                "surface": point.surface,
                "position": _xyz(point.position.x, point.position.y, point.position.z),
                "normal": _xyz(point.normal.x, point.normal.y, point.normal.z),
                "direct": round(d, 4),
                "total": round(t, 4),
            }
            for point, d, t in zip(room.points, direct, total, strict=True)
        ],
    }
    if room.daylight and sky:
        sun = sun_position(room.daylight)
        levels = sky_levels(room.daylight, sun)
        first = _daylight_arrival(radiance, boxes, shell, points, sky)
        for item, lux in zip(reference["points"], first, strict=True):
            item["daylight"] = round(lux, 4)
        reference["radiance"]["daylight"] = list(DAYLIGHT_OPTIONS)
        reference["daylight"] = {
            "sun": {
                "altitudeDeg": round(sun.altitude_deg, 6),
                "azimuthDeg": round(sun.azimuth_deg, 6),
            },
            "horizontalSkyLx": round(levels.horizontal_sky_lx, 3),
            "sunNormalLx": round(levels.sun_normal_lx, 3),
            "transmittance": transmittance,
            "sky": sky[0],
        }
    if boxes:
        bare = _measure_scene(radiance, luminaires, [], shell, points, options, sky)
        reference["withoutFurniture"] = {
            "direct": [round(d, 4) for d in bare.direct],
            "total": [round(d + b, 4) for d, b in zip(bare.direct, bare.bounced, strict=True)],
        }
    return reference


def _measure_scene(
    radiance: Radiance,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    shell: RoomShell,
    points: list[tuple[Any, Any]],
    options: tuple[str, ...],
    sky: list[str] | None = None,
) -> DirectAndBounced:
    """One scene: direct light and bounced light, timed."""
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), luminaires, boxes, shell, sky)
        return direct_and_bounced(radiance, octree, points, options)


def _luminaires_direct(
    radiance: Radiance,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    shell: RoomShell,
    points: list[tuple[Any, Any]],
) -> list[float]:
    """The luminaires' direct light alone, without the sky: 0 everywhere with none."""
    if not luminaires:
        return [0.0] * len(points)
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), luminaires, boxes, shell)
        return measure(radiance, octree, points, DIRECT_OPTIONS)


def _daylight_arrival(
    radiance: Radiance,
    boxes: list[ShadowBox],
    shell: RoomShell,
    points: list[tuple[Any, Any]],
    sky: list[str],
) -> list[float]:
    """Daylight's first arrival: the room and its boxes black, so nothing bounces."""
    black = RoomShell(shell.width, shell.depth, shell.height, 0, 0, 0, shell.windows)
    unlit = [ShadowBox(box.centre, box.half, box.yaw_deg, 0.0) for box in boxes]
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), [], unlit, black, sky)
        return measure(radiance, octree, points, DAYLIGHT_OPTIONS)


def _seconds(run: RunTime) -> dict[str, float]:
    return {"wallSeconds": round(run.wall_s, 2), "cpuSeconds": round(run.cpu_s, 2)}


def write_reference(reference: dict[str, Any], name: str) -> Path:
    """Writes a reference as ``accuracy/references/<name>.json``.

    Args:
        reference: From ``compute_reference``.
        name: The room's name.

    Returns:
        The file written.
    """
    REFERENCES_DIR.mkdir(exist_ok=True)
    path = REFERENCES_DIR / f"{name}.json"
    path.write_text(json.dumps(reference, indent=1) + "\n", encoding="utf-8")
    return path


def _xyz(x: float, y: float, z: float) -> dict[str, float]:
    return {"x": round(x, 6), "y": round(y, 6), "z": round(z, 6)}
