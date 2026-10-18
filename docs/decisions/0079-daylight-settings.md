# 0079. Daylight settings: the sky, solar time, date and site, saved with the scene

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Windows (ADR 0078) let daylight in. Before the calculation (W5) and the picture (W7) can use it, a scene needs to say which daylight: what the sky is like, when, and where the room is and which way it faces. The owner asked for:

- morning, noon, afternoon and night;
- the sun, if it costs little more than an overcast sky;
- a configurable location, with Buenos Aires as the default.

The library knows no client or location (ADR 0002).

## Decision

**`Scene.daylight`**, plain data saved and undone with the rest of the scene:

- **`sky`**: one of three kinds.
  - `overcast`: the CIE overcast sky, no sun.
  - `clear`: a clear sky with the sun.
  - `night`: no daylight. Only the luminaires light the room.
- **`solarHour`**: local *solar* time, 0–24, where 12 is when the sun is highest. Clock time would also need the longitude, the time zone and the equation of time. That's up to ±16 minutes plus the zone's offset, which matters to a clock but not to how a room looks. The UI offers *Mañana* 9, *Mediodía* 12 and *Tarde* 16 as presets, plus a slider.
- **`month` and `day`**: the date, in a 365-day year. The UI picks a month and keeps the day, so the 21st, the default, lands on the solstices and equinoxes.
- **`latitudeDeg`**: the site's latitude, with north positive.
- **`northDeg`**: which way north is, clockwise seen from above from the room's −z. At 0, north is behind the back wall.

**The sun's position** (`sunPosition`, `sunDirection`) follows Duffie & Beckman, *Solar Engineering of Thermal Processes*, §1.6:

- the declination comes from Spencer's series;
- the hour angle turns 15° an hour;
- the zenith and azimuth come from eqs. 1.6.5 and 1.6.6.

The tests check Example 1.6.1 (43° N, 13 February at 9:30, and 1 July at 18:30) to within half a degree. Spencer's declination differs from the book's Cooper by up to about 0.4°. They also check the equinox noon (90° minus the latitude, due north in the south) and the symmetry about noon.

**The location comes from the host.** Core's `DEFAULT_DAYLIGHT` is neutral: an overcast equinox noon on the equator, north behind the back wall. The demo builds its templates at Buenos Aires (34.6° S), so a first visit starts there. Choosing a template in New keeps the current scene's daylight: a template is a room, not a place, so a visitor's location, north and time carry over.

**Scene files stay version 2.** That version, from ADR 0078, hasn't been released. Its upgrade from version 1 now adds both `windows: []` and `DEFAULT_DAYLIGHT`. A version 1 file or autosave therefore opens on the equator until the visitor sets a latitude.

## Consequences

- W5 and W7 read one description of the daylight, in the scene, so saving, sharing, undo and autosave all carry it.
- Solar time can't line up with a clock. A host that needs clock time can convert before calling `setDaylight`.
- Visitors returning with a version 1 autosave get latitude 0 until they set theirs. That's acceptable while in development.
- No weather, cloud cover between overcast and clear, or annual metrics: SPEC §1 keeps those out of scope.

## Alternatives considered

- **Clock time with longitude and time zone.** More to enter and explain, for a quarter of an hour of difference in where the sun is.
- **Location as a host option rather than scene data.** Then a saved scene wouldn't say where it is, and the same file would compute differently on another host.
- **A default location in core.** That's a client's location in the library (ADR 0002).
