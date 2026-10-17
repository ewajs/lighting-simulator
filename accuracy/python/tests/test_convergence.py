import statistics
import tempfile
from pathlib import Path

import pytest

from luxstudio_accuracy.radiance import install
from luxstudio_accuracy.rooms import IES_DIR, all_rooms, load_room
from luxstudio_accuracy.scene import (
    BOUNCE_DIRECT_OPTIONS,
    BOUNCE_OPTIONS,
    PlacedLuminaire,
    RoomShell,
    ShadowBox,
    build_scene,
    direct_and_bounced,
    measure,
)

POINTS = 60
"""A sample of the room's points: enough for the average, quick enough to run."""

VARIANTS = (("-ad", "8192"), ("-ab", "48"), ("-lw", "1e-7"))
"""Twice the rays per sample, twice the bounces, rays followed 100 times fainter."""
MEAN_CHANGE = 0.003
"""The room's average bounced light may change by this much: Radiance's noise is about 0.05 %."""
POINT_CHANGE = 0.02
"""Single points carry more noise: about 0.3 % on average."""


@pytest.mark.radiance
def test_radiance_bounced_light_is_converged() -> None:
    # More rays, more bounces or fainter rays followed must barely change the
    # bounced light: otherwise the references would carry Radiance's noise or
    # stop short. Each setting is checked, since any one can cap the others
    # (ADR 0060).
    room = load_room(next(p for p in all_rooms() if p.stem == "downlights-and-wall-washer"))
    radiance = install()
    luminaires = [
        PlacedLuminaire(IES_DIR / item.ies, item.origin, item.tilt_deg, item.pan_deg)
        for item in room.luminaires
    ]
    shell = RoomShell(room.width, room.depth, room.height, **_reflectances(room.reflectances))
    step = len(room.points) // POINTS
    points = [(p.position, p.normal) for p in room.points[::step]]
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), luminaires, [], shell)
        direct = measure(radiance, octree, points, BOUNCE_DIRECT_OPTIONS)

        def bounced(options: tuple[str, ...]) -> list[float]:
            total = measure(radiance, octree, points, options)
            return [t - d for t, d in zip(total, direct, strict=True)]

        once = bounced(BOUNCE_OPTIONS)
        for flag, value in VARIANTS:
            changed = list(BOUNCE_OPTIONS)
            changed[changed.index(flag) + 1] = value
            again = bounced(tuple(changed))
            mean_change = abs(statistics.mean(again) / statistics.mean(once) - 1)
            per_point = [abs(b / a - 1) for a, b in zip(once, again, strict=True) if a > 0]
            print(
                f"\nbounced light, {flag} {value}: mean {mean_change:.3%}, per point mean "
                f"{statistics.mean(per_point):.2%}, worst {max(per_point):.2%}"
            )
            assert mean_change < MEAN_CHANGE, flag
            assert statistics.mean(per_point) < POINT_CHANGE, flag


def _reflectances(values: dict[str, float]) -> dict[str, float]:
    return {"floor": values["floor"], "walls": values["walls"], "ceiling": values["ceiling"]}


REPEAT_POINT_CHANGE = 0.03
"""Two identical runs may differ by this much at a point: sampling noise only."""


@pytest.mark.radiance
def test_radiance_bounced_light_repeats() -> None:
    # The same run twice must give the same bounced light but for sampling
    # noise, even at bright points next to furniture, where bounced light is
    # a small difference of two large runs (ADR 0061).
    room = load_room(next(p for p in all_rooms() if p.stem == "furnished-living"))
    radiance = install()
    luminaires = [
        PlacedLuminaire(IES_DIR / item.ies, item.origin, item.tilt_deg, item.pan_deg)
        for item in room.luminaires
    ]
    boxes = [ShadowBox(b.centre, b.half, b.yaw_deg, b.reflectance) for b in room.blockers]
    shell = RoomShell(room.width, room.depth, room.height, **_reflectances(room.reflectances))
    floor = [p for p in room.points if p.surface == "floor"]
    points = [(p.position, p.normal) for p in floor[:: len(floor) // POINTS]]
    with tempfile.TemporaryDirectory() as tmp:
        octree = build_scene(radiance, Path(tmp), luminaires, boxes, shell)
        first = direct_and_bounced(radiance, octree, points).bounced
        second = direct_and_bounced(radiance, octree, points).bounced
    changes = [abs(b / a - 1) for a, b in zip(first, second, strict=True) if a > 1]
    print(
        f"\nbounced light, the same run twice: per point mean {statistics.mean(changes):.2%}, "
        f"worst {max(changes):.2%}"
    )
    assert max(changes) < REPEAT_POINT_CHANGE
