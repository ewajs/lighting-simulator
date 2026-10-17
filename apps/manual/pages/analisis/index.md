<script setup>
import LxStanding from '../../.vitepress/theme/components/analysis/LxStanding.vue'
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../.vitepress/theme/analysis/headline'
import { ROOM_ORDER, ROOMS } from '../../.vitepress/theme/analysis/names'

const h = headline(data.summary, data.timings)
const pct = (v, digits = 1) => `${(v * 100).toLocaleString('es-AR', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
const n = (v) => Math.round(v).toLocaleString('es-AR')
</script>

# Dónde estamos

¿Cuánto se puede confiar en los números de Lux Studio? Esta sección lo muestra
con datos: los mismos {{ n(h.points) }} puntos de {{ h.rooms }} ambientes de
prueba, calculados por Lux Studio y por **Radiance**, el simulador de
iluminación de investigación del Lawrence Berkeley National Laboratory. Todos
los números y gráficos salen del código y se regeneran con él
([Cómo comparamos](./metodo)).

## En pocas palabras

- **Lo que Lux Studio calcula, lo calcula bien.** En los ambientes sin
  muebles, y en los amueblados si se sacan los muebles en los dos programas,
  el promedio de cada superficie queda dentro del
  **{{ pct(h.modelledAverage) }}** del de Radiance, y ningún punto iluminado
  a más de 1 m de una luminaria se aleja más del **{{ pct(h.modelledFar) }}**.
- **Los muebles todavía no cuentan para la luz que rebota.** Hacen sombra a la
  luz directa, pero la luz que rebota los atraviesa y no la reflejan. Con
  muebles, un promedio se aleja hasta un **{{ pct(h.furnishedAverage) }}** y un
  punto junto a un mueble hasta un **{{ pct(h.furnishedFar, 0) }}**. Es lo
  próximo que se resuelve.
- **La luz que rebota es la mitad de la historia.** Solo con luz directa, los
  números se alejan entre un {{ pct(h.directOnlyMin, 0) }} y un
  {{ pct(h.directOnlyMax, 0) }} en promedio por punto
  ([Función por función](./funcion-por-funcion)).
- **Es rápido.** El cálculo completo de un ambiente tarda entre
  {{ n(h.oursMinMs) }} y {{ n(h.oursMaxMs) }} ms en una {{ h.machine }}; Radiance,
  con los ajustes de referencia, entre {{ n(h.radianceMinS) }} y
  {{ n(h.radianceMaxS) }} s ([Velocidad](./velocidad)).

## Ambiente por ambiente

La peor diferencia de cada ambiente con el cálculo completo. En gris, los
ambientes amueblados sin sus muebles: la diferencia entre las dos barras es lo
que cuesta que la luz que rebota atraviese los muebles.

<LxStanding :summary="data.summary" />

Cada ambiente tiene su página, con sus mapas punto por punto:

<ul>
  <li v-for="id in ROOM_ORDER" :key="id">
    <a :href="`./${id}.html`">{{ ROOMS[id].es.name }}</a>
  </li>
</ul>

## Lo que todavía no cuenta

- **Los muebles en la luz que rebota**, medido arriba: es la diferencia más
  grande que queda.
- **Las luminarias tampoco tapan la luz que rebota.** Un aplique grande
  pegado a la pared da unos puntos más que en Radiance.
- **Todas las superficies reflejan de forma difusa:** no hay brillos ni
  espejos.
- **Los ambientes son rectangulares**, y todavía no hay ventanas.

Lux Studio no es un programa de cálculo certificado: sirve para diseñar y
comparar con confianza, no para firmar un proyecto.
