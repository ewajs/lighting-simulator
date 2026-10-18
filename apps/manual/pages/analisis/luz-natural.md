<script setup>
import { data } from '../../.vitepress/theme/diagrams/analysis.data'

const NAMES = {
  'daylight-side-window': 'Ventana lateral, cielo nublado',
  'daylight-skylight': 'Tragaluz, cielo nublado',
  'daylight-sun': 'Ventana lateral, cielo despejado con sol',
  'daylight-and-lamps': 'Ventana y dos downlights, a la tarde',
}
const ORDER = Object.keys(NAMES)
const rooms = ORDER.map((name) => data.summary.daylightRooms.find((r) => r.name === name))
const worst = (surfaces, key) => Math.max(...surfaces.map((s) => Math.abs(s[key])))
const point = (surfaces) => Math.max(...surfaces.map((s) => Math.max(s.worstFar, s.worstNear)))
const pct = (v) => `${(v * 100).toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`
const n = (v) => Math.round(v).toLocaleString('es-AR')
const all = (key) => Math.max(...rooms.flatMap((r) => [worst(r.daylight, key), worst(r.total, key)]))
</script>

# Luz natural

La luz que entra por las ventanas, calculada por Lux Studio y por Radiance en
{{ rooms.length }} ambientes de prueba de día. Todos los números salen del
código y se regeneran con él.

## En pocas palabras

- **Coincide con Radiance.** En los {{ rooms.length }} ambientes, el promedio
  de cada superficie queda dentro del **{{ pct(all('averageError')) }}** del de
  Radiance, tanto para la luz que entra por las ventanas como para el total,
  con todos sus rebotes.
- **Los puntos sueltos** se alejan más en el total, hasta un
  {{ pct(Math.max(...rooms.map((r) => point(r.total)))) }}: Radiance muestrea
  el cielo con rayos al azar y, punto por punto, varía unos por ciento. La luz
  que entra directo, que Radiance calcula con 16 veces más rayos, coincide
  punto por punto dentro del
  {{ pct(Math.max(...rooms.map((r) => point(r.daylight)))) }}.

## Ambiente por ambiente

<table>
  <thead>
    <tr>
      <th>Ambiente</th>
      <th>Por la ventana: peor Ē</th>
      <th>peor punto</th>
      <th>Total: peor Ē</th>
      <th>peor punto</th>
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

Todos en Buenos Aires, el 21 de marzo, con vidrio transparente que deja pasar
el 80 %. El cielo nublado da, al mediodía,
{{ n(rooms[0].horizontalSkyLx) }} lx sobre el suelo abierto; a las 10 de la
mañana de un día despejado, el sol da {{ n(rooms[2].sunNormalLx) }} lx sobre
una superficie que lo mira.

El peor punto del total en el día de sol está en la pared, 12 cm arriba de la
mancha de sol del piso: la luz que rebota de esa mancha, de decenas de miles
de lux, se reparte en parches de 25 cm, como en el
[ambiente con bañadores](./wall-wash).

## Cómo comparamos

- **El mismo cielo.** Lux Studio calcula dónde está el sol y cuánta luz dan
  el cielo y el sol (el modelo de disponibilidad de luz natural de la IES).
  Radiance recibe esos niveles, y con su propio programa, `gensky`, los
  reparte por el cielo según los modelos de la CIE, nublado o despejado, con
  el suelo de afuera reflejando el 20 %.
- **Ventanas abiertas, cielo atenuado.** El vidrio de Lux Studio deja pasar la
  misma parte de la luz desde cualquier ángulo; el de Radiance, como el real,
  menos cuando la luz llega rasante. Para comparar lo mismo, en Radiance las
  ventanas son huecos y el cielo de afuera se atenúa por el vidrio. Lo que
  pasa con el ángulo es una simplificación de Lux Studio que esta comparación
  no mide.
- **Antes de confiar en el cielo de Radiance,** se comprueba que dé los
  niveles pedidos al aire libre: dentro del 0,6 %.
