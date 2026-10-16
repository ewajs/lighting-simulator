"""Vectors, turns and the change from Lux Studio's coordinates to Radiance's.

Lux Studio is Y-up, in metres, with three.js' turning conventions. Radiance is
Z-up. A point (x, y, z) in Lux Studio is (x, -z, y) in Radiance: still
right-handed, with Lux Studio's +z (towards the viewer) becoming Radiance's -y.

A luminaire's light is described by its Type C axes (IES LM-63): vertical 0
along ``down``, horizontal 0 along ``forward``, horizontal 90 along ``side``.
This module computes those axes from an aim on its own, without Lux Studio's
TypeScript, so agreeing results are evidence that both are right.
"""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Vec3:
    """A point or direction, in metres when it's a point."""

    x: float
    y: float
    z: float

    def __add__(self, other: Vec3) -> Vec3:
        """The sum of two vectors."""
        return Vec3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other: Vec3) -> Vec3:
        """The difference of two vectors."""
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)

    def scaled(self, k: float) -> Vec3:
        """This vector times ``k``."""
        return Vec3(self.x * k, self.y * k, self.z * k)

    def dot(self, other: Vec3) -> float:
        """The dot product."""
        return self.x * other.x + self.y * other.y + self.z * other.z

    def length(self) -> float:
        """The vector's length."""
        return math.sqrt(self.dot(self))


DOWN = Vec3(0, -1, 0)
"""Straight down in Lux Studio's coordinates: where an unaimed light points."""


def rotate_x(v: Vec3, angle_rad: float) -> Vec3:
    """Turns ``v`` about the x axis as three.js does: a positive angle takes +y towards +z."""
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    return Vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c)


def rotate_y(v: Vec3, angle_rad: float) -> Vec3:
    """Turns ``v`` about the vertical as three.js does: a positive angle takes +z towards +x."""
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    return Vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)


@dataclass(frozen=True)
class LightAxes:
    """A light's Type C axes in Lux Studio's coordinates, as unit vectors."""

    down: Vec3
    """Vertical 0: where the light points."""
    forward: Vec3
    """Horizontal 0."""
    side: Vec3
    """Horizontal 90, anticlockwise from forward seen from above."""

    @property
    def up(self) -> Vec3:
        """Vertical 180."""
        return self.down.scaled(-1)


def light_axes(tilt_deg: float, pan_deg: float) -> LightAxes:
    """The axes of a light aimed by ``tilt_deg`` and ``pan_deg``.

    The aim tilts the light from straight down towards its local +z, then pans
    it about the vertical: rotation ``Ry(pan) . Rx(-tilt)``, three.js' Euler
    order YXZ, as Lux Studio's ``aim.ts`` defines it.

    Args:
        tilt_deg: The tilt from straight down, in degrees.
        pan_deg: The turn about the vertical, in degrees.

    Returns:
        The aimed light's axes.
    """
    tilt, pan = math.radians(tilt_deg), math.radians(pan_deg)

    def aimed(v: Vec3) -> Vec3:
        return rotate_y(rotate_x(v, -tilt), pan)

    return LightAxes(down=aimed(DOWN), forward=aimed(Vec3(0, 0, 1)), side=aimed(Vec3(1, 0, 0)))


def type_c_angles(axes: LightAxes, direction: Vec3) -> tuple[float, float]:
    """The Type C angles, in degrees, of a direction leaving a light.

    Args:
        axes: The light's axes.
        direction: The direction, any length.

    Returns:
        ``(vertical, horizontal)``: vertical from 0 (down) to 180 (up),
        horizontal from 0 (forward) round to 360, anticlockwise from above.
    """
    unit = direction.scaled(1 / direction.length())
    vertical = math.degrees(math.acos(max(-1.0, min(1.0, unit.dot(axes.down)))))
    horizontal = math.degrees(math.atan2(unit.dot(axes.side), unit.dot(axes.forward)))
    return vertical, horizontal % 360


def to_radiance(v: Vec3) -> Vec3:
    """A point or direction in Radiance's Z-up coordinates."""
    return Vec3(v.x, -v.z, v.y)


def xform_rotation(axes: LightAxes) -> tuple[float, float, float]:
    """The turns Radiance's ``xform -rx a -ry b -rz c`` needs to aim a luminaire.

    ``ies2rad`` writes a luminaire pointing down Radiance's -Z, with
    horizontal 0 along +X and 90 along +Y. This finds the rotation taking
    those axes to the light's, in Radiance's world, as angles ``(a, b, c)`` in
    degrees about x, then y, then z: the matrix ``Rz(c) . Ry(b) . Rx(a)``.

    Args:
        axes: The light's axes, in Lux Studio's coordinates.

    Returns:
        The angles for ``-rx``, ``-ry`` and ``-rz``, in degrees.
    """
    # The rotation's columns: where Radiance's luminaire X, Y and Z end up.
    x_axis = to_radiance(axes.forward)
    y_axis = to_radiance(axes.side)
    z_axis = to_radiance(axes.up)
    # R = Rz(c) Ry(b) Rx(a); R[2][0] = -sin b, R[2][1] = cos b sin a,
    # R[2][2] = cos b cos a, R[1][0] = sin c cos b, R[0][0] = cos c cos b.
    r00, r10, r20 = x_axis.x, x_axis.y, x_axis.z
    r21, r22 = y_axis.z, z_axis.z
    b = math.asin(max(-1.0, min(1.0, -r20)))
    if abs(math.cos(b)) > 1e-9:
        a = math.atan2(r21, r22)
        c = math.atan2(r10, r00)
    else:
        # Gimbal lock (b = ±90°): only a ∓ c is fixed, so take c = 0. Then
        # R = Ry(±90°) Rx(a), whose column 1 is (±sin a, cos a, 0).
        sign = 1.0 if b > 0 else -1.0
        a = math.atan2(sign * y_axis.x, y_axis.y)
        c = 0.0
    return math.degrees(a), math.degrees(b), math.degrees(c)
