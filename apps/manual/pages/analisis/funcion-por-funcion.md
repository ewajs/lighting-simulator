<script setup>
import LxFeatureStory from '../../.vitepress/theme/components/analysis/LxFeatureStory.vue'
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline, stepFigures } from '../../.vitepress/theme/analysis/headline'
import { ROOMS, STEPS } from '../../.vitepress/theme/analysis/names'

const h = headline(data.summary, data.timings)
const f = stepFigures(data.summary, data.timings)
const pct = (v, digits = 1) => `${(v * 100).toLocaleString('es-AR', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
const ms = (v) => v.toLocaleString('es-AR', { maximumFractionDigits: v < 10 ? 1 : 0 })
</script>

# Función por función

El cálculo de Lux Studio se puede armar de a una función por vez, y medir qué
aporta cada una. Acá se arranca por lo más simple, cada luminaria como un punto
de luz directa, y se agrega una función por paso, empezando por la que más
pesa. Cada paso se compara con la luz **total** de Radiance, con el ambiente
tal como es, muebles incluidos: lo que mediría un luxómetro. Si una función
empeora algo, se dice.

<LxFeatureStory :summary="data.summary" />

## Paso a paso

**Luminarias como puntos, solo luz directa.** Cada luminaria es un punto que
reparte la luz como dice su archivo IES; no rebota nada. Así, la diferencia
media por punto va de un {{ pct(h.directOnlyMin, 0) }} a un
{{ pct(h.directOnlyMax, 0) }}: falta toda la luz que devuelven el techo, las
paredes y el piso.

**\+ la luz que rebota.** El paso más grande. Con los rebotes
([Cómo calcula Lux Studio](../conceptos/como-calcula)), en los ambientes sin
muebles la diferencia media por punto baja a menos del
**{{ pct(f.bouncedEmptyMax) }}**.

**\+ aberturas divididas en celdas.** Una luminaria grande no es un punto:
dividir su abertura en celdas de 10 cm corrige los puntos cercanos. El peor
punto a menos de 1 m de una luminaria pasa de
**{{ pct(f.nearBeforeSplit, 0) }}** a **{{ pct(f.nearAfterSplit, 0) }}**. A
cambio, algún promedio empeora, hasta {{ pct(f.splitAverageRise, 1) }}
puntos, en el aplique de pared. Lo explica el último paso: dividir la caja
del aplique acerca celdas a la pared de atrás, y hasta ese paso el cuerpo del
aplique no le tapa a esa pared la luz que rebota. Con el cuerpo, dividirlo ya
no empeora el promedio ([BOUNCE.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/BOUNCE.md)).

**\+ sombras de los muebles.** En los ambientes amueblados, la diferencia
media por punto baja de **{{ pct(f.beforeShadows) }}** a
**{{ pct(f.afterShadows) }}**. Lo que queda es la luz que rebota, que en este
paso todavía atraviesa los muebles. Las sombras también suben el peor
punto cercano de un ambiente en {{ pct(f.shadowsNearRise, 1) }} puntos: cada
celda de la abertura queda tapada o no, así que el borde de una sombra sale
escalonado, y en Radiance es suave.

**\+ los muebles tapan la luz que rebota (negros).** Medio paso, que se muestra
porque empeora: si los muebles tapan la luz que rebota pero no reflejan nada,
son cajas negras que se la tragan. La diferencia media por punto de los
ambientes amueblados sube a **{{ pct(f.hidesOnly) }}**: todo da menos que en
Radiance.

**\+ los muebles también la reflejan.** Cada cara de un mueble pasa a ser un
parche más, que refleja según su terminación (el roble, un 45 %; el lino, un
55 %). Con las dos mitades juntas, la diferencia media por punto de los
ambientes amueblados baja a **{{ pct(f.hidesAndReflects) }}**: lo mismo que en
los ambientes sin muebles. Por eso las dos mitades van juntas, con un solo
interruptor.

**\+ el cuerpo de las luminarias tapa la luz que rebota.** En Radiance, una
superficie que brilla tapa la luz que rebota como un cuerpo negro; acá, el
cuerpo de cada luminaria es la caja de su abertura. La luz que rebota daba en
promedio un **{{ pct(f.bouncedBeforeBodies) }}** de más en todas las
superficies, y con los cuerpos da un **{{ pct(f.bouncedAfterBodies) }}**. Donde
más se nota es en el {{ ROOMS[f.bodiesWorstRoom].es.name.replace(/^Una? /, '').toLowerCase() }}, donde
todo está cerca de una luminaria: la diferencia media por punto pasa de
{{ pct(f.bodiesWorstBefore) }} a **{{ pct(f.bodiesWorstAfter) }}**. Tiene su
interruptor, porque hace que mover una luminaria recalcule el ambiente.

## Lo que cuesta cada paso

El tiempo de cada paso, promedio de los {{ h.rooms }} ambientes, en una
{{ h.machine }} ([Velocidad](./velocidad)):

<table>
  <thead><tr><th>Paso</th><th>Tiempo</th></tr></thead>
  <tbody>
    <tr v-for="s in f.stepMs" :key="s.step">
      <td>{{ STEPS[s.step].es.name }}</td>
      <td>{{ ms(s.ms) }} ms</td>
    </tr>
  </tbody>
</table>

Casi todo el tiempo es la luz que rebota, y en un ambiente amueblado, los
muebles dentro de ella: cada rayo entre dos parches se prueba contra cada
mueble. Por eso son las dos que se pueden apagar en los ajustes del panel
Análisis, para calcular más rápido a cambio de precisión
([Analizar la luz](../analizar)); dividir las aberturas y las sombras
cuestan poco y sin ellas el resultado es peor, así que quedan siempre.
