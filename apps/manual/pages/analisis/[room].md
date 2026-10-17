<script setup>
import { useData, withBase } from 'vitepress'
import LxRoomPlan from '../../.vitepress/theme/components/analysis/LxRoomPlan.vue'
import LxRoomStats from '../../.vitepress/theme/components/analysis/LxRoomStats.vue'
import LxRoomSteps from '../../.vitepress/theme/components/analysis/LxRoomSteps.vue'
import LxScatter from '../../.vitepress/theme/components/analysis/LxScatter.vue'
import LxSurfaceMaps from '../../.vitepress/theme/components/analysis/LxSurfaceMaps.vue'
import LxSurfaceTable from '../../.vitepress/theme/components/analysis/LxSurfaceTable.vue'
import { ROOM_NOTES, ROOMS } from '../../.vitepress/theme/analysis/names'

const { params } = useData()
const page = params.value.page
const room = ROOMS[page.summary.name].es
const note = ROOM_NOTES[page.summary.name].es
const m = (v) => v.toLocaleString('es-AR')
const size = page.comparison.room.room
</script>

# {{ room.name }}

{{ room.about }}

<LxRoomStats :page="page" />

{{ note }}

<figure class="lx-room-picture">
  <img :src="withBase(`/analysis/${page.summary.name}.png`)" :alt="room.name" width="676" height="724" loading="lazy" />
  <figcaption>El ambiente en Lux Studio, con los productos y muebles de la demo.</figcaption>
</figure>

<LxRoomPlan :page="page">
  Visto desde arriba: {{ m(size.width) }} × {{ m(size.depth) }} m, y {{ m(size.height) }} m de alto. Los muebles, como las cajas con las que se calcula.
</LxRoomPlan>

## Superficie por superficie

Cada superficie medida, su promedio en Radiance y en Lux Studio, y la peor
diferencia en un punto. Con luz total, directa o, si el ambiente tiene
muebles, total sin muebles en los dos programas.

<LxSurfaceTable :page="page" />

## Punto por punto

Los mapas muestran la luz en cada punto de la cuadrícula. El de abajo, la
diferencia: azul donde Lux Studio da menos que Radiance, rojo donde da más.
Con **Paso** se ve qué cambia cada función del cálculo
([Función por función](./funcion-por-funcion)). Pasá el cursor por un mapa
para leer los valores.

<LxSurfaceMaps :page="page" />

## Todos los puntos

Cada punto, Lux Studio contra Radiance: sobre la diagonal, coinciden.

<LxScatter :page="page" />

## Función por función

Qué aporta cada función del cálculo en este ambiente, y cuánto tarda.

<LxRoomSteps :page="page">
  Diferencia contra la luz total de Radiance. Tiempos en una {{ page.machine }}, en un solo hilo (ver Velocidad).
</LxRoomSteps>
