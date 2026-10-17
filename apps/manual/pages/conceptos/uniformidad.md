<script setup>
import LxHeatmap from '../../.vitepress/theme/components/LxHeatmap.vue'
import { data } from '../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../.vitepress/theme/diagrams/plot'

const n = (v, d = 0) => formatNumber(v, 'es-AR', d)
const top = Math.max(data.spread.maxLx, data.bunched.maxLx)
</script>

# Uniformidad

Dos ambientes pueden tener la misma luz en promedio y sentirse muy distintos:
uno parejo y otro con manchas de luz y rincones oscuros. Por eso, además del
promedio, se miran los extremos.

## Las cifras

Sobre los puntos de la cuadrícula del [plano de trabajo](./plano-de-trabajo):

| Cifra | Qué es |
|---|---|
| $\bar{E}$ | la iluminancia **promedio** |
| $E_\text{min}$ | la del punto más oscuro |
| $E_\text{max}$ | la del punto más iluminado |
| $U_0 = E_\text{min} / \bar{E}$ | la **uniformidad**: 1 sería perfectamente parejo |

La norma EN 12464-1 pide, junto con el promedio, una uniformidad mínima: 0,60
para tareas de escritorio, 0,40 para pasillos (ver
[Niveles recomendados](./niveles)). El ojo se adapta a la luz que tiene
delante; pasar seguido de zonas claras a oscuras cansa.

## Más promedio no es mejor luz

Las mismas cuatro downlights de la demo en un ambiente de 5 × 4 m, primero
repartidas y después juntas en el medio. Los colores van del azul (poca luz)
al blanco (mucha), en la misma escala para los dos; la línea punteada marca el
borde que queda afuera:

<div class="lx-pair">
<LxHeatmap :map="data.spread" :room="data.room" :border-m="data.borderM" :scale-max-lx="top" caption="Repartidas" />
<LxHeatmap :map="data.bunched" :room="data.room" :border-m="data.borderM" :scale-max-lx="top" caption="Juntas" />
</div>

Juntas, el **promedio sube**: de {{ n(data.spread.averageLx) }} a
{{ n(data.bunched.averageLx) }} lx, porque casi toda la luz cae adentro del
plano medido. Pero el punto más oscuro baja de {{ n(data.spread.minLx) }} a
{{ n(data.bunched.minLx) }} lx, y la uniformidad, de
{{ n(data.spread.uniformity, 2) }} a {{ n(data.bunched.uniformity, 2) }}: un
centro muy iluminado y rincones en penumbra. Mirando solo el promedio, la peor
distribución parecería la mejor.

Son valores con luz directa solamente y sin factor de mantenimiento.
