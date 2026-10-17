<script setup>
import LxFeatureStory from '../../.vitepress/theme/components/analysis/LxFeatureStory.vue'
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline, stepFigures } from '../../.vitepress/theme/analysis/headline'
import { STEPS } from '../../.vitepress/theme/analysis/names'

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
cambio, algún promedio empeora un poco, hasta {{ pct(f.splitAverageRise, 1) }}
puntos: lejos de la luminaria, las celdas y el punto casi coinciden, y la
diferencia es del tamaño del ruido.

**\+ sombras de los muebles.** En los ambientes amueblados, la diferencia
media por punto baja de **{{ pct(f.beforeShadows) }}** a
**{{ pct(f.afterShadows) }}**. Lo que queda es la luz que rebota, que todavía
atraviesa los muebles ([Dónde estamos](./)). Las sombras también suben el peor
punto cercano de un ambiente en {{ pct(f.shadowsNearRise, 1) }} puntos: cada
celda de la abertura queda tapada o no, así que el borde de una sombra sale
escalonado, y en Radiance es suave.

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

Casi todo el tiempo es la luz que rebota. Más adelante se podrá apagar para
calcular más rápido, a cambio de precisión; dividir las aberturas y las
sombras cuestan poco y sin ellas el resultado es peor, así que quedan siempre.
