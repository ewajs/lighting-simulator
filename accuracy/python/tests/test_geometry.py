import math

import pytest

from luxstudio_accuracy.geometry import (
    Vec3,
    light_axes,
    rotate_x,
    rotate_y,
    to_radiance,
    type_c_angles,
    xform_rotation,
)


def close(a: Vec3, b: Vec3, tolerance: float = 1e-9) -> bool:
    return (a - b).length() < tolerance


def test_turns_follow_three_js() -> None:
    # About x, +y goes towards +z; about y, +z goes towards +x.
    assert close(rotate_x(Vec3(0, 1, 0), math.pi / 2), Vec3(0, 0, 1))
    assert close(rotate_y(Vec3(0, 0, 1), math.pi / 2), Vec3(1, 0, 0))


def test_light_axes_match_lux_studios_aim() -> None:
    # aim.ts: aimDirection(tilt, pan) = (sin t sin p, -cos t, sin t cos p).
    for tilt in (0, 20, 45, 90):
        for pan in (-150, 0, 35, 180):
            t, p = math.radians(tilt), math.radians(pan)
            expected = Vec3(math.sin(t) * math.sin(p), -math.cos(t), math.sin(t) * math.cos(p))
            assert close(light_axes(tilt, pan).down, expected)


def test_type_c_angles_of_the_axes() -> None:
    axes = light_axes(30, 60)
    assert type_c_angles(axes, axes.down)[0] == pytest.approx(0, abs=1e-6)
    assert type_c_angles(axes, axes.forward) == pytest.approx((90, 0), abs=1e-6)
    assert type_c_angles(axes, axes.side) == pytest.approx((90, 90), abs=1e-6)
    assert type_c_angles(axes, axes.side.scaled(-1)) == pytest.approx((90, 270), abs=1e-6)
    assert type_c_angles(axes, axes.up)[0] == pytest.approx(180, abs=1e-6)


def test_radiance_is_z_up_and_right_handed() -> None:
    assert to_radiance(Vec3(1, 2, 3)) == Vec3(1, -3, 2)
    # x × y = z must hold after the change, or the scene would be mirrored.
    x, y = to_radiance(Vec3(1, 0, 0)), to_radiance(Vec3(0, 0, -1))
    cross = Vec3(x.y * y.z - x.z * y.y, x.z * y.x - x.x * y.z, x.x * y.y - x.y * y.x)
    assert close(cross, Vec3(0, 0, 1))


def rz_ry_rx(a: float, b: float, c: float, v: Vec3) -> Vec3:
    """Radiance's xform -rx a -ry b -rz c applied to v (angles in degrees, about X, Y, Z)."""
    a, b, c = (math.radians(angle) for angle in (a, b, c))
    v = Vec3(v.x, v.y * math.cos(a) - v.z * math.sin(a), v.y * math.sin(a) + v.z * math.cos(a))
    v = Vec3(v.x * math.cos(b) + v.z * math.sin(b), v.y, -v.x * math.sin(b) + v.z * math.cos(b))
    return Vec3(v.x * math.cos(c) - v.y * math.sin(c), v.x * math.sin(c) + v.y * math.cos(c), v.z)


@pytest.mark.parametrize(
    ("tilt", "pan"),
    [(0, 0), (30, 45), (60, -120), (90, 0), (90, 200), (15, 90), (89.99, 10)],
)
def test_xform_rotation_takes_the_luminaire_to_its_aim(tilt: float, pan: float) -> None:
    # ies2rad's luminaire: horizontal 0 along X, 90 along Y, up along Z. Tilt
    # 90 with pan 0 is the gimbal-lock case.
    axes = light_axes(tilt, pan)
    a, b, c = xform_rotation(axes)
    assert close(rz_ry_rx(a, b, c, Vec3(1, 0, 0)), to_radiance(axes.forward), 1e-7)
    assert close(rz_ry_rx(a, b, c, Vec3(0, 1, 0)), to_radiance(axes.side), 1e-7)
    assert close(rz_ry_rx(a, b, c, Vec3(0, 0, 1)), to_radiance(axes.up), 1e-7)
