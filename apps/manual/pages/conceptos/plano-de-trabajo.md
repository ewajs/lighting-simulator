<script setup>
import LxGridPlan from '../../.vitepress/theme/components/LxGridPlan.vue'
import LxPlot from '../../.vitepress/theme/components/LxPlot.vue'
import { data } from '../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../.vitepress/theme/diagrams/plot'

const n = (v, d = 2) => formatNumber(v, 'es-AR', d)
</script>

# El plano de trabajo

Nadie lee en el piso. Para saber si un ambiente tiene la luz que necesita, la
iluminancia se calcula sobre un **plano de trabajo**: una superficie horizontal
imaginaria a la altura de la tarea, por ejemplo la de un escritorio.

## Altura y borde

- **Altura:** {{ n(data.workPlaneM) }} m por defecto, la que usa DIALux para las
  áreas de trabajo de la norma EN 12464-1. Una mesa de comedor o un escritorio
  andan por los 0,75 m.
- **Borde:** una franja junto a las paredes, de {{ n(data.borderM, 1) }} m por
  defecto, queda afuera del cálculo, porque nadie trabaja pegado a la pared. La
  norma permite excluirla salvo que haya un puesto de trabajo ahí.

## La cuadrícula

La iluminancia se calcula en una cuadrícula de puntos, cada uno en el centro de
una celda. La norma EN 12464-1 fija la **distancia máxima** $p$ entre puntos
según el lado más largo $d$ de la superficie:

$$p = 0{,}2 \cdot 5^{\log_{10} d}\ \text{m}, \qquad p \le 10\ \text{m}$$

Así, 1 m de lado da puntos cada 0,2 m; 10 m, cada 1 m; 100 m, cada 5 m. La
cantidad de puntos se redondea para arriba, así nunca quedan más separados que
$p$. Con una cuadrícula fija, los mínimos y los promedios se pueden comparar con
los de otros programas.

<LxGridPlan
  :room="data.room"
  :border-m="data.borderM"
  :points="data.gridPoints"
  border-label="borde"
  :caption="`Un ambiente de 5 × 4 m: el plano de trabajo sin el borde de ${n(data.borderM, 1)} m, con un punto cada ${n(data.gridSpacingM)} m.`"
/>

<LxPlot
  :series="[{ label: 'p', points: data.spacingRule }]"
  x-label="Lado más largo de la superficie (m)"
  y-label="Distancia máxima entre puntos (m)"
  caption="La regla de la norma: superficies grandes, puntos más espaciados."
/>

Además del plano de trabajo, Lux Studio calcula el piso, el techo y cada pared,
enteros, con la misma regla.
