"""Windows in a reference room's walls and ceiling: openings, and their glass (ADR 0081).

A room file's ``windows`` are Lux Studio's (ADR 0078): each a ``surface``
(a wall, ``wall-x-``, ``wall-x+``, ``wall-z-`` or ``wall-z+``, or the
``ceiling``), the ``position`` of its centre on it, a ``width`` and
``height`` (on a wall, along it and up it; in the ceiling, along x and z),
a ``glazing`` and a ``covering``.

Radiance gets each window as a hole in its surface, the surface split into
rectangles around it. The glass isn't modelled: Lux Studio's has the same
transmittance at every angle, which no Radiance material has. Instead, what's
outside is dimmed by it (``sky.py``): the same light comes through.
"""

from dataclasses import dataclass
from typing import Any

from luxstudio_accuracy.geometry import Vec3

GLAZINGS = {"clear": (0.8, False), "tinted": (0.5, False), "frosted": (0.7, True)}
"""Each glass's transmittance and whether it scatters light, as Lux Studio's ``GLAZINGS``."""

COVERINGS = {"none": (1.0, False), "sheer": (0.6, True), "blind": (0.1, True)}
"""Each covering's, as Lux Studio's ``COVERINGS``."""

_X, _Y, _Z = Vec3(1, 0, 0), Vec3(0, 1, 0), Vec3(0, 0, 1)

_SURFACE_AXES = {
    "wall-x-": (_Z, _Y),
    "wall-x+": (_Z, _Y),
    "wall-z-": (_X, _Y),
    "wall-z+": (_X, _Y),
    "ceiling": (_X, _Z),
}
"""Where a window's width and height run on each surface, as Lux Studio's ``windowRect``."""


@dataclass(frozen=True)
class Window:
    """A window in a reference room."""

    surface: str
    centre: Vec3
    width: float
    height: float
    glazing: str
    covering: str

    @property
    def transmittance(self) -> float:
        """The share of the light outside it lets in: its glass's times its covering's."""
        return GLAZINGS[self.glazing][0] * COVERINGS[self.covering][0]

    @property
    def scatters(self) -> bool:
        """Whether its glass or covering scatters what it lets through."""
        return GLAZINGS[self.glazing][1] or COVERINGS[self.covering][1]

    def rectangle(self) -> tuple[Vec3, Vec3, Vec3]:
        """Its corner and the directions its width and height run along.

        Returns:
            ``(corner, u, v)``: the corner at the low ends of both sides.
        """
        u, v = _SURFACE_AXES[self.surface]
        corner = self.centre - u.scaled(self.width / 2) - v.scaled(self.height / 2)
        return corner, u, v


def read_windows(items: list[dict[str, Any]]) -> tuple[Window, ...]:
    """Reads a room file's ``windows``.

    Args:
        items: The windows, as Lux Studio's ``RoomWindow`` without ids.

    Returns:
        The windows.

    Raises:
        ValueError: For glass or a covering that scatters, which the rooms
            don't model, or windows letting in different shares of the light.
    """
    windows = tuple(
        Window(
            surface=str(item["surface"]),
            centre=Vec3(
                float(item["position"]["x"]),
                float(item["position"]["y"]),
                float(item["position"]["z"]),
            ),
            width=float(item["width"]),
            height=float(item["height"]),
            glazing=str(item["glazing"]),
            covering=str(item["covering"]),
        )
        for item in items
    )
    if any(window.scatters for window in windows):
        raise ValueError(
            "A reference room's windows must be clear: scattering ones aren't modelled"
        )
    if len({window.transmittance for window in windows}) > 1:
        raise ValueError("A reference room's windows must all let in the same share of the light")
    return windows


def open_rectangles(
    lengths: tuple[float, float], holes: list[tuple[float, float, float, float]]
) -> list[tuple[float, float, float, float]]:
    """A rectangle with holes in it, as the rectangles left between them.

    The rectangle runs from 0 to ``lengths`` along its two sides. The holes'
    edges cut it into a grid, and every cell outside the holes is kept.

    Args:
        lengths: The rectangle's sides.
        holes: Each ``(a0, a1, b0, b1)``: from a0 to a1 along the first side
            and b0 to b1 along the second.

    Returns:
        The cells, each ``(a0, a1, b0, b1)``.
    """
    cuts_a = sorted({0.0, lengths[0], *(h[0] for h in holes), *(h[1] for h in holes)})
    cuts_b = sorted({0.0, lengths[1], *(h[2] for h in holes), *(h[3] for h in holes)})
    cells = []
    for a0, a1 in zip(cuts_a, cuts_a[1:], strict=False):
        for b0, b1 in zip(cuts_b, cuts_b[1:], strict=False):
            middle = ((a0 + a1) / 2, (b0 + b1) / 2)
            inside = any(h[0] < middle[0] < h[1] and h[2] < middle[1] < h[3] for h in holes)
            if not inside:
                cells.append((a0, a1, b0, b1))
    return cells
