import pytest

from luxstudio_accuracy.rooms import IES_DIR, all_rooms, load_room


def test_every_room_loads_with_its_points() -> None:
    names = [path.stem for path in all_rooms()]
    assert names == [
        "downlights-and-wall-washer",
        "furnished-living",
        "linear-pendant-over-table",
        "single-downlight",
        "track-spots",
        "wall-sconce",
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
