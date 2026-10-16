"""Reference values: Radiance's illuminance at every point of a reference room.

A reference (``accuracy/references/<room>.json``) holds the room file it was
made from, the points and Radiance's lux at each, and how it was made: the
Radiance release and rtrace's options. Lux Studio's own calculation is
compared with it by ``accuracy/typescript``.
"""

import datetime
import json
import tempfile
from pathlib import Path
from typing import Any

from luxstudio_accuracy.radiance import RELEASE, Radiance
from luxstudio_accuracy.rooms import IES_DIR, Room
from luxstudio_accuracy.scene import RTRACE_OPTIONS, PlacedLuminaire, ShadowBox, illuminance

REFERENCES_DIR = Path(__file__).resolve().parents[3] / "references"
"""accuracy/references: the committed reference values."""

FORMAT = "lux-studio-accuracy-reference"
VERSION = 1


def compute_reference(radiance: Radiance, room: Room) -> dict[str, Any]:
    """Radiance's direct illuminance at each of a room's points.

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
    boxes = [ShadowBox(item.centre, item.half, item.yaw_deg) for item in room.blockers]
    points = [(point.position, point.normal) for point in room.points]
    with tempfile.TemporaryDirectory() as tmp:
        lux = illuminance(radiance, Path(tmp), luminaires, boxes, points)
    return {
        "format": FORMAT,
        "version": VERSION,
        "room": room.spec,
        "radiance": {"release": RELEASE, "rtrace": list(RTRACE_OPTIONS)},
        "generated": datetime.date.today().isoformat(),
        "points": [
            {
                "surface": point.surface,
                "position": _xyz(point.position.x, point.position.y, point.position.z),
                "normal": _xyz(point.normal.x, point.normal.y, point.normal.z),
                "lux": round(value, 4),
            }
            for point, value in zip(room.points, lux, strict=True)
        ],
    }


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
