"""Reference rooms: what's in them and where illuminance is measured.

A room file (``accuracy/rooms/*.json``) describes a room in Lux Studio's
coordinates (metres, Y-up, the floor's centre at the origin):

- ``room``: its ``width`` (x), ``depth`` (z) and ``height`` (y).
- ``luminaires``: each an ``ies`` file from ``apps/demo/public/ies``, the
  ``origin`` its light leaves from, and its ``tiltDeg`` and ``panDeg``
  (Lux Studio's aim). Wall lights are given by their pan alone.
- ``blockers``: boxes that cast shadows, each a ``centre``, ``half`` sizes
  (x across, y up, z front to back) and a ``yawDeg`` about the vertical, as
  Lux Studio's ``furnitureBlockers`` makes them.
- ``grids``: where to measure: a ``surface`` (``floor``, ``ceiling``,
  ``work-plane`` at ``heightM``, or a wall: ``wall-x-``, ``wall-x+``,
  ``wall-z-``, ``wall-z+``) and a ``spacingM``.

Both Radiance and Lux Studio read the same file, so they compute the same
points.
"""

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from luxstudio_accuracy.geometry import Vec3

ROOMS_DIR = Path(__file__).resolve().parents[3] / "rooms"
"""accuracy/rooms: the reference rooms."""

IES_DIR = Path(__file__).resolve().parents[4] / "apps" / "demo" / "public" / "ies"
"""The demo's real manufacturer IES files, which the rooms use."""


@dataclass(frozen=True)
class Luminaire:
    """A luminaire in a reference room."""

    ies: str
    """The IES file's name, in IES_DIR."""
    origin: Vec3
    """Where its light leaves from: its photometric centre."""
    tilt_deg: float
    pan_deg: float


@dataclass(frozen=True)
class Blocker:
    """A box that casts shadows, as Lux Studio's ``Blocker``."""

    centre: Vec3
    half: Vec3
    yaw_deg: float


@dataclass(frozen=True)
class Point:
    """Where illuminance is measured: a point and the way its surface faces."""

    surface: str
    position: Vec3
    normal: Vec3


@dataclass(frozen=True)
class Room:
    """A reference room."""

    name: str
    description: str
    width: float
    depth: float
    height: float
    luminaires: tuple[Luminaire, ...]
    blockers: tuple[Blocker, ...]
    points: tuple[Point, ...]
    spec: dict[str, Any]
    """The room file as read, copied into its reference."""


def load_room(path: Path) -> Room:
    """Reads a room file and lays out its measuring points.

    Args:
        path: The room's JSON file.

    Returns:
        The room, with its points.
    """
    spec: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    size = spec["room"]
    width, depth, height = float(size["width"]), float(size["depth"]), float(size["height"])
    luminaires = tuple(
        Luminaire(
            ies=item["ies"],
            origin=_vec(item["origin"]),
            tilt_deg=float(item.get("tiltDeg", 0)),
            pan_deg=float(item.get("panDeg", 0)),
        )
        for item in spec["luminaires"]
    )
    blockers = tuple(
        Blocker(_vec(item["centre"]), _vec(item["half"]), float(item.get("yawDeg", 0)))
        for item in spec.get("blockers", [])
    )
    points = tuple(
        point for grid in spec["grids"] for point in _grid_points(grid, width, depth, height)
    )
    return Room(
        name=path.stem,
        description=spec["description"],
        width=width,
        depth=depth,
        height=height,
        luminaires=luminaires,
        blockers=blockers,
        points=points,
        spec=spec,
    )


def _vec(value: dict[str, float]) -> Vec3:
    return Vec3(float(value["x"]), float(value["y"]), float(value["z"]))


def _grid_points(grid: dict[str, Any], width: float, depth: float, height: float) -> list[Point]:
    """Points at the centres of square-ish cells about ``spacingM`` across, on one surface."""
    surface: str = grid["surface"]
    spacing = float(grid["spacingM"])
    x0, z0 = -width / 2, -depth / 2
    # Each surface: a corner, two directions along it with their lengths, and its inward normal.
    layouts: dict[str, tuple[Vec3, Vec3, float, Vec3, float, Vec3]] = {
        "floor": (Vec3(x0, 0, z0), Vec3(1, 0, 0), width, Vec3(0, 0, 1), depth, Vec3(0, 1, 0)),
        "ceiling": (
            Vec3(x0, height, z0),
            Vec3(1, 0, 0),
            width,
            Vec3(0, 0, 1),
            depth,
            Vec3(0, -1, 0),
        ),
        "wall-x-": (Vec3(x0, 0, z0), Vec3(0, 0, 1), depth, Vec3(0, 1, 0), height, Vec3(1, 0, 0)),
        "wall-x+": (Vec3(-x0, 0, z0), Vec3(0, 0, 1), depth, Vec3(0, 1, 0), height, Vec3(-1, 0, 0)),
        "wall-z-": (Vec3(x0, 0, z0), Vec3(1, 0, 0), width, Vec3(0, 1, 0), height, Vec3(0, 0, 1)),
        "wall-z+": (Vec3(x0, 0, -z0), Vec3(1, 0, 0), width, Vec3(0, 1, 0), height, Vec3(0, 0, -1)),
    }
    if surface == "work-plane":
        level = float(grid["heightM"])
        corner, u, lu, v, lv, normal = layouts["floor"]
        corner = Vec3(corner.x, level, corner.z)
    else:
        corner, u, lu, v, lv, normal = layouts[surface]
    columns, rows = max(1, math.ceil(lu / spacing)), max(1, math.ceil(lv / spacing))
    return [
        Point(
            surface,
            corner + u.scaled((i + 0.5) / columns * lu) + v.scaled((j + 0.5) / rows * lv),
            normal,
        )
        for j in range(rows)
        for i in range(columns)
    ]


def all_rooms() -> list[Path]:
    """The reference room files, by name."""
    return sorted(ROOMS_DIR.glob("*.json"))
