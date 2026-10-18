<script setup>
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../.vitepress/theme/analysis/headline'
import { ROOM_ORDER, ROOMS } from '../../.vitepress/theme/analysis/names'

const h = headline(data.summary, data.timings)
const n = (v) => Math.round(v).toLocaleString('es-AR')
const release = data.summary.rooms[0].radianceRelease
const pct = (v) => `${(v * 100).toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`
const cutoff = (room, share) =>
  data.summary.rooms.find((r) => r.name === room).cutoffs.find((c) => c.light === 'total' && c.brightShare === share)
const points = (room) => data.summary.rooms.find((r) => r.name === room).points
</script>

# Cómo comparamos

## La referencia: Radiance

**Radiance** es el simulador de iluminación de investigación del Lawrence
Berkeley National Laboratory, muy usado como referencia en estudios de
validación. Se usa la versión 6.0 parche 2 (`{{ release }}`), siempre la
misma, verificada por su huella digital.

**Qué es independiente y qué no.** El cálculo de Radiance y su lector de
archivos IES son propios: no comparten código con Lux Studio. Lo que sí
comparten es la descripción del ambiente: los dos reciben las mismas medidas,
las mismas luminarias con su posición y su orientación, los muebles como
cajas, y superficies que reflejan de forma difusa. Por eso, que coincidan
dice que Lux Studio calcula bien ese ambiente simplificado, no que un
ambiente real vaya a dar lo mismo. Y un error al describir el ambiente, como
una luminaria girada al revés, saldría igual en los dos: lo cubren las
pruebas hechas a mano, que no dependen de ninguno de los dos programas.

DIALux y Relux se validan con los casos de prueba de la norma CIE 171:2006.
Lux Studio todavía no los corrió.

## Antes de confiar en Radiance

Radiance tiene que pasar sus propias pruebas antes de escribir una sola
referencia:

- **194 valores calculados a mano** desde cada archivo IES, a 20 m de
  distancia, donde la ley de la inversa del cuadrado es exacta. Una versión de
  Radiance con un error conocido en su lector de IES no pasa ninguna, y hay una
  prueba que lo demuestra.
- **La esfera integradora:** en una esfera hueca de 1,5 m de radio que
  refleja el 80 %, con la luz en el centro, la luz que rebota es la misma en
  cada punto y tiene que dar lo que dice la fórmula,
  $E = \rho\,\Phi / (A\,(1-\rho))$, dentro del 0,1 %. Con 64 rebotes, da
  177,778 lx, exactamente el valor de la fórmula. Con los 24 rebotes de las
  referencias daría un 0,5 % menos: por eso la prueba usa más (en los
  ambientes, cuyo piso refleja el 30 %, 24 alcanzan).
- **Orientación, a mano:** en los spots de riel, el centro de cada círculo de
  luz cae sobre el plano vertical de su haz, dentro de 1 cm, y donde lo pone
  la inclinación; el bañador de pared da, junto a su pared, lo que se calcula
  a mano desde su archivo IES, dentro del 0,4 %. Las cuentas salen de las
  medidas del ambiente y de las convenciones escritas, no de ninguno de los
  dos programas, y se comprueban sobre los puntos de los dos: un error al
  describir el ambiente, como una luminaria girada, no pasaría.
- **Convergencia:** más rayos, más rebotes o rayos más débiles no cambian el
  resultado, y la misma corrida dos veces da lo mismo salvo el ruido de
  muestreo, alrededor del 0,3 % por punto.

Estas pruebas encontraron dos ajustes de Radiance que cortaban la luz que
rebota o la hacían irrepetible; los dos están corregidos y cubiertos por una
prueba.

## Los ambientes de prueba

{{ h.rooms }} ambientes, cada uno pensado para probar algo: una luminaria
sola, varias juntas, haces inclinados, una luminaria grande cerca, una caja
que brilla pegada a la pared, un living con cuatro muebles y un ambiente
integrado con diez, que muestra cómo crecen la diferencia y el tiempo con un
ambiente lleno. Miden 5 × 4 × 2,7 m, salvo el último, de 6 × 5 m. Usan los
archivos IES reales de la demo. Se mide en cuadrículas sobre el plano de
trabajo, el piso, el techo y las paredes: {{ n(h.points) }} puntos en total.

## Cómo se mide la diferencia

- **Promedio de cada superficie:** Lux Studio / Radiance − 1. Es lo que
  muestra un informe de iluminación.
- **Puntos iluminados:** solo los que reciben al menos el 10 % de la luz del
  punto más iluminado del ambiente, porque en un rincón oscuro una diferencia
  chica en lux es un porcentaje grande. Ese corte deja cosas afuera, y abajo
  se muestra cuáles.
- **Mínimo y uniformidad:** la iluminancia mínima $E_{min}$ de cada superficie
  y la uniformidad $U_0 = E_{min} / \bar{E}$ se comparan aparte, porque salen
  justo de los rincones oscuros que el corte deja afuera. Solo no se comparan
  donde el mínimo es casi 0, un punto dentro de un mueble.
- **Lejos y cerca:** a menos de 1 m de una luminaria, los dos programas
  aproximan de forma distinta una abertura que brilla, y el archivo IES no dice
  cómo es la luz tan de cerca. Se cuentan aparte.

## Qué deja afuera el corte

Los mismos puntos, luz total, con el corte del 10 % y con uno diez veces más
bajo:

<table>
  <thead><tr><th>Ambiente</th><th>Puntos, 10 %</th><th>Puntos, 1 %</th><th>Peor a más de 1 m, 10 %</th><th>Peor a más de 1 m, 1 %</th></tr></thead>
  <tbody>
    <tr v-for="id in ROOM_ORDER" :key="id">
      <td>{{ ROOMS[id].es.name }}</td>
      <td>{{ cutoff(id, 0.1).counted }} de {{ points(id) }}</td>
      <td>{{ cutoff(id, 0.01).counted }} de {{ points(id) }}</td>
      <td>{{ pct(cutoff(id, 0.1).worstFar) }}</td>
      <td>{{ pct(cutoff(id, 0.01).worstFar) }}</td>
    </tr>
  </tbody>
</table>

En los spots de riel, el 10 % deja casi todo afuera: los círculos de luz son
tan brillantes que el resto del ambiente queda por debajo. Con el 1 %, los
peores puntos aparecen en el borde de un haz o de una sombra, donde la luz
cambia mucho en pocos centímetros, y en la luz que rebota cerca de un círculo
de luz muy brillante, que los parches de 25 cm reparten. Cerca de las
luminarias, también un punto del techo justo encima de una downlight, que en
Radiance el cuerpo de la downlight tapa (ver
[Dónde estamos](./#lo-que-todavia-no-cuenta)). El detalle de cada ambiente
está en el
[informe](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md).

## Siempre al día

Todo lo de esta sección sale del código. Cada vez que se cambia el cálculo, las
pruebas de Lux Studio comparan cada punto con Radiance y fallan si algo se
aleja más de lo medido; otra prueba verifica que estas páginas muestren los
resultados actuales. Los tiempos se miden aparte, en una máquina tranquila, y
dicen en cuál.

El detalle técnico está en el
[informe de precisión](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md)
y en las decisiones de diseño 0058, 0060 y 0061 del repositorio.
