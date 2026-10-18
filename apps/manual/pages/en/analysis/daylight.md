<script setup>
import { data } from '../../../.vitepress/theme/diagrams/analysis.data'

const NAMES = {
  'daylight-side-window': 'Side window, overcast sky',
  'daylight-skylight': 'Skylight, overcast sky',
  'daylight-sun': 'Side window, clear sky with sun',
  'daylight-and-lamps': 'Window and two downlights, late afternoon',
}
const ORDER = Object.keys(NAMES)
const rooms = ORDER.map((name) => data.summary.daylightRooms.find((r) => r.name === name))
const worst = (surfaces, key) => Math.max(...surfaces.map((s) => Math.abs(s[key])))
const point = (surfaces) => Math.max(...surfaces.map((s) => Math.max(s.worstFar, s.worstNear)))
const pct = (v) => `${(v * 100).toLocaleString('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`
const n = (v) => Math.round(v).toLocaleString('en')
const all = (key) => Math.max(...rooms.flatMap((r) => [worst(r.daylight, key), worst(r.total, key)]))
</script>

# Daylight

The light coming in through windows, calculated by Lux Studio and by Radiance
in {{ rooms.length }} test rooms by day. Every number comes from the code and is
regenerated with it.

## In short

- **It agrees with Radiance.** In the {{ rooms.length }} rooms, each surface's
  average is within **{{ pct(all('averageError')) }}** of Radiance's, both for
  the light coming in through the windows and for the total, with every bounce.
- **Single points** differ more in the total, up to
  {{ pct(Math.max(...rooms.map((r) => point(r.total)))) }}: Radiance samples the
  sky with random rays and, point by point, varies by a few percent. The light
  coming straight in, which Radiance computes with 16 times the rays, agrees
  point by point within {{ pct(Math.max(...rooms.map((r) => point(r.daylight)))) }}.

## Room by room

<table>
  <thead>
    <tr>
      <th>Room</th>
      <th>Through the window: worst Ē</th>
      <th>worst point</th>
      <th>Total: worst Ē</th>
      <th>worst point</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="room in rooms" :key="room.name">
      <td>{{ NAMES[room.name] }}</td>
      <td>{{ pct(worst(room.daylight, 'averageError')) }}</td>
      <td>{{ pct(point(room.daylight)) }}</td>
      <td>{{ pct(worst(room.total, 'averageError')) }}</td>
      <td>{{ pct(point(room.total)) }}</td>
    </tr>
  </tbody>
</table>

All in Buenos Aires on March 21st, with clear glass letting 80 % through. The
overcast sky gives {{ n(rooms[0].horizontalSkyLx) }} lx on open ground at noon;
at 10 in the morning on a clear day, the sun gives {{ n(rooms[2].sunNormalLx) }} lx
on a surface facing it.

The worst point of the total on the sunny day is on the wall, 12 cm above the
sun patch on the floor: the light bouncing off that patch, tens of thousands
of lux, is spread over 25 cm patches, as in the
[wall-wash room](./wall-wash).

## How we compare

- **The same sky.** Lux Studio works out where the sun is and how much light
  the sky and the sun give (the IES daylight availability model). Radiance gets
  those levels and, with its own program, `gensky`, spreads them over the sky
  by CIE's models, overcast or clear, with the ground outside reflecting 20 %.
- **Open windows, a dimmed sky.** Lux Studio's glass lets the same share of the
  light through at any angle; Radiance's, like real glass, less when the light
  grazes it. To compare like with like, in Radiance the windows are holes and
  the sky outside is dimmed by the glass. What angle does is a simplification
  of Lux Studio's that this comparison doesn't measure.
- **Before trusting Radiance's sky,** it's checked to give the levels asked of
  it in the open: within 0.6 %.
