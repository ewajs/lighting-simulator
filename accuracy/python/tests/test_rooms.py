import pytest

from luxstudio_accuracy.rooms import DEFAULT_BOUNCES, IES_DIR, all_rooms, load_room
from luxstudio_accuracy.scene import BOUNCE_OPTIONS, bounce_options


def test_every_room_loads_with_its_points() -> None:
    names = [path.stem for path in all_rooms()]
    assert names == [
        "busy-open-plan",
        "dark-room",
        "downlights-and-wall-washer",
        "furnished-living",
        "linear-pendant-over-table",
        "single-downlight",
        "small-bathroom",
        "tall-hall",
        "track-spots",
        "wall-sconce",
        "wall-wash",
        "white-room",
    ]
    for path in all_rooms():
        room = load_room(path)
        assert room.points
        assert all((IES_DIR / luminaire.ies).exists() for luminaire in room.luminaires)


def test_points_face_into_the_room_at_cell_centres() -> None:
    room = load_room(next(p for p in all_rooms() if p.stem == "single-downlight"))
    floor = [p for p in room.points if p.surface == "floor"]
    # 5 × 4 m in 0.25 m cells: 20 × 16, the first at (−2.375, 0, −1.875).
    assert len(floor) == 320
    assert floor[0].position.x == pytest.approx(-2.375)
    assert floor[0].position.z == pytest.approx(-1.875)
    for point in room.points:
        inside = point.position + point.normal.scaled(0.01)
        assert abs(inside.x) < room.width / 2
        assert abs(inside.z) < room.depth / 2
        assert 0 < inside.y < room.height


def test_a_room_can_ask_for_more_bounces() -> None:
    rooms = {path.stem: load_room(path) for path in all_rooms()}
    # 0.9 everywhere: 24 bounces would leave out 0.9²⁴ ≈ 8 % of the bounced light.
    assert rooms["white-room"].bounces == 72
    assert rooms["single-downlight"].bounces == DEFAULT_BOUNCES == 24


def test_bounce_options_change_only_the_bounces() -> None:
    options = bounce_options(72)
    assert options[options.index("-ab") + 1] == "72"
    assert len(options) == len(BOUNCE_OPTIONS)
    changed = [a for a, b in zip(options, BOUNCE_OPTIONS, strict=True) if a != b]
    assert changed == ["72"]
