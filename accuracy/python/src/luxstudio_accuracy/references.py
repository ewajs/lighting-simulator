"""Reference values: Radiance's illuminance at every point of a reference room.

A reference (``accuracy/references/<room>.json``) holds the room file it was
made from, and at each point Radiance's direct light and its total light,
direct plus every bounce off the room's surfaces. For a room with furniture,
it also holds both again without the furniture, so the report can show how
much furniture changes bounced light (ADR 0060). It records how it was made:
the Radiance release and rtrace's options. Lux Studio's own calculation is
compared with it by ``accuracy/typescript``.
"""

import datetime
import json
import tempfile
from pathlib import Path
from typing import Any

from luxstudio_accuracy.radiance import RELEASE, Radiance
from luxstudio_accuracy.rooms import IES_DIR, Room
from luxstudio_accuracy.scene import (
    BOUNCE_DIRECT_OPTIONS,
    BOUNCE_OPTIONS,
    DIRECT_OPTIONS,
    PlacedLuminaire,
    RoomShell,
    ShadowBox,
    build_scene,
    direct_and_bounced,
)

REFERENCES_DIR = Path(__file__).resolve().parents[3] / "references"
"""accuracy/references: the committed reference values."""

FORMAT = "lux-studio-accuracy-reference"
VERSION = 2
"""2 added total light and the room's reflectances (ADR 0060)."""


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
    )
    points = [(point.position, point.normal) for point in room.points]
    direct, total = _direct_and_total(radiance, luminaires, boxes, shell, points)
    reference: dict[str, Any] = {
        "format": FORMAT,
        "version": VERSION,
        "room": room.spec,
        "radiance": {
            "release": RELEASE,
            "direct": list(DIRECT_OPTIONS),
            "bounced": [list(BOUNCE_OPTIONS), list(BOUNCE_DIRECT_OPTIONS)],
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
    if boxes:
        bare_direct, bare_total = _direct_and_total(radiance, luminaires, [], shell, points)
        reference["withoutFurniture"] = {
            "direct": [round(d, 4) for d in bare_direct],
            "total": [round(t, 4) for t in bare_total],
        }
    return reference


def _direct_and_total(
    radiance: Radiance,
    luminaires: list[PlacedLuminaire],
    boxes: list[ShadowBox],
    shell: RoomShell,
    points: list[tuple[Any, Any]],
) -> tuple[list[float], list[float]]:
    """One scene: direct light, and total light (direct plus bounced)."""
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), luminaires, boxes, shell)
        direct, bounced = direct_and_bounced(radiance, octree, points)
        return direct, [d + b for d, b in zip(direct, bounced, strict=True)]


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
