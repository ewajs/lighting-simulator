"""A small IES LM-63 reader and writer, independent of Lux Studio's TypeScript one.

Reading the same file two ways and getting the same numbers is part of the
evidence (ADR 0058). This reader does only what the checks need: Type C
photometry, candela values scaled by the file's multiplier and ballast
factor, the luminous opening, and the intensity in any direction by linear
interpolation, folded by the file's symmetry.

The format is ANSI/IES LM-63, in its 1986 to 2019 editions.
"""

import bisect
from dataclasses import dataclass
from pathlib import Path

FEET_TO_METRES = 0.3048
"""LM-63 units type 1 is feet; type 2 is metres."""


@dataclass(frozen=True)
class IesFile:
    """The parts of an IES file the checks use."""

    vertical_deg: tuple[float, ...]
    """Vertical angles: 0 straight down to 180 straight up."""
    horizontal_deg: tuple[float, ...]
    """Horizontal angles, as measured; their range sets the symmetry."""
    candela: tuple[tuple[float, ...], ...]
    """Intensity in cd, one row per horizontal angle, already scaled."""
    opening_m: tuple[float, float, float]
    """The luminous opening's width, length and height in metres, unsigned."""

    def intensity(self, vertical_deg: float, horizontal_deg: float) -> float:
        """The intensity in cd towards Type C angles, interpolated linearly.

        Args:
            vertical_deg: 0 (down) to 180 (up).
            horizontal_deg: Any angle; folded into the file's measured range.

        Returns:
            The intensity in cd; 0 outside the measured vertical range.
        """
        if not self.vertical_deg[0] <= vertical_deg <= self.vertical_deg[-1]:
            return 0.0
        if len(self.horizontal_deg) == 1:
            return _interpolate(self.vertical_deg, self.candela[0], vertical_deg)
        phi = self._fold(horizontal_deg % 360)
        rows = [_interpolate(self.vertical_deg, row, vertical_deg) for row in self.candela]
        return _interpolate(self.horizontal_deg, tuple(rows), phi)

    def _fold(self, phi: float) -> float:
        """Folds a horizontal angle into the measured range by the file's symmetry."""
        last = self.horizontal_deg[-1]
        if last == 90:  # Quadrant symmetry.
            phi = phi % 180
            return 180 - phi if phi > 90 else phi
        if last == 180:  # Symmetric about the 0–180° plane.
            return 360 - phi if phi > 180 else phi
        if last == 360:  # Measured all the way round.
            return phi
        raise ValueError(f"Unsupported horizontal range 0–{last}°")


def _interpolate(xs: tuple[float, ...], ys: tuple[float, ...], x: float) -> float:
    """Linear interpolation of ``ys`` over ascending ``xs`` at ``x``, within their range."""
    i = bisect.bisect_right(xs, x)
    if i >= len(xs):
        return ys[-1]
    if i == 0:
        return ys[0]
    t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
    return ys[i - 1] + t * (ys[i] - ys[i - 1])


def read_ies(path: Path) -> IesFile:
    """Reads an IES LM-63 file with Type C photometry.

    Args:
        path: The file; decoded as Latin-1, which every edition allows.

    Returns:
        The file's photometry.

    Raises:
        ValueError: If the file has tilt data, isn't Type C or is cut short.
    """
    text = path.read_text(encoding="latin-1")
    header, _, data = text.partition("TILT=")
    tilt, _, numbers = data.partition("\n")
    if tilt.strip().upper() != "NONE":
        raise ValueError(f"{path.name}: only TILT=NONE is supported")
    values = [float(token) for token in numbers.replace(",", " ").split()]
    (
        _lamps,
        _lumens,
        multiplier,
        vertical_count,
        horizontal_count,
        photometric_type,
        units,
        width,
        length,
        height,
        ballast_factor,
        second_factor,
        _watts,
    ) = values[:13]
    if photometric_type != 1:
        raise ValueError(f"{path.name}: only Type C photometry is supported")
    nv, nh = int(vertical_count), int(horizontal_count)
    rest = values[13:]
    if len(rest) < nv + nh + nv * nh:
        raise ValueError(f"{path.name}: the candela table is cut short")
    vertical = tuple(rest[:nv])
    horizontal = tuple(rest[nv : nv + nh])
    table = rest[nv + nh : nv + nh + nv * nh]
    # LM-63-2002 and 2019 mark the second factor as future use or file type;
    # older editions use it as the ballast-lamp factor, which scales the values.
    newer = any(edition in header.splitlines()[0] for edition in ("LM-63-2002", "LM-63-2019"))
    scale = multiplier * ballast_factor * (1.0 if newer else second_factor)
    candela = tuple(
        tuple(value * scale for value in table[i * nv : (i + 1) * nv]) for i in range(nh)
    )
    unit = FEET_TO_METRES if units == 1 else 1.0
    opening = (abs(width) * unit, abs(length) * unit, abs(height) * unit)
    return IesFile(vertical, horizontal, candela, opening)


def write_ies(
    path: Path,
    vertical_deg: tuple[float, ...],
    horizontal_deg: tuple[float, ...],
    candela: tuple[tuple[float, ...], ...],
) -> None:
    """Writes a point-source IES LM-63-2002 file, for checks with known values.

    Args:
        path: Where to write it.
        vertical_deg: Vertical angles, ascending.
        horizontal_deg: Horizontal angles, ascending, from 0.
        candela: One row of intensities in cd per horizontal angle.
    """
    lines = [
        "IESNA:LM-63-2002",
        "[TEST] Lux Studio accuracy check",
        "[LUMINAIRE] Synthetic distribution",
        "TILT=NONE",
        f"1 -1 1 {len(vertical_deg)} {len(horizontal_deg)} 1 2 0 0 0",
        "1 1 10",
        " ".join(f"{a:g}" for a in vertical_deg),
        " ".join(f"{a:g}" for a in horizontal_deg),
        *(" ".join(f"{v:g}" for v in row) for row in candela),
    ]
    path.write_text("\n".join(lines) + "\n", encoding="latin-1")
