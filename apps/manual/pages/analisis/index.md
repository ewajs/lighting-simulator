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

Los dos programas calculan el mismo ambiente simplificado: los muebles son
cajas y todas las superficies reflejan de forma difusa. Que coincidan dice que
el cálculo de Lux Studio es correcto para ese ambiente, no que un ambiente
real vaya a dar exactamente lo mismo.

## En pocas palabras

- **Coincide con Radiance.** En los {{ h.rooms }} ambientes, muebles
  incluidos, el promedio de cada superficie queda dentro del
  **{{ pct(h.worstAverage) }}** del de Radiance, y ningún punto iluminado
  ([al menos el 10 % del más iluminado](./metodo#que-deja-afuera-el-corte)) a
  más de 1 m de una luminaria se aleja más del **{{ pct(h.worstFar) }}**. La
  excepción son unos pocos puntos del [ambiente con diez
  muebles](./busy-open-plan), en la penumbra del borde de un mueble: hasta un
  {{ pct(h.busyWorstFar, 0) }}.
- **El mínimo y la uniformidad,** lo que decide si un proyecto cumple
  ([Uniformidad](../conceptos/uniformidad)), quedan dentro del
  **{{ pct(h.worstMin) }}**. La excepción es un punto del techo del ambiente
  con diez muebles, justo encima de una downlight, que en Radiance tapa el
  cuerpo de la luminaria: {{ pct(h.busyWorstMin, 0) }}.
- **Los muebles cuentan también para la luz que rebota:** la tapan y la
  reflejan, como su terminación. En los ambientes amueblados, eso llevó la
  diferencia media por punto de un {{ pct(h.furnishedBefore) }} a un
  **{{ pct(h.furnishedAfter) }}**.
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
ambientes amueblados con los muebles sacados en los dos programas: que las dos
barras se parezcan dice que los muebles están bien contados.

<LxStanding :summary="data.summary" />

Cada ambiente tiene su página, con sus mapas punto por punto:

<ul>
  <li v-for="id in ROOM_ORDER" :key="id">
    <a :href="`./${id}.html`">{{ ROOMS[id].es.name }}</a>
  </li>
</ul>

## Lo que todavía no cuenta

- **Los muebles son cajas:** un sillón es un bloque, una mesa es solo su tapa.
- **Las sombras tienen el borde escalonado.** La abertura de una luminaria se
  divide en celdas de 10 cm, y cada una queda tapada o no. En la penumbra del
  borde de un mueble, un punto puede dar 0 o el doble que en Radiance, que ve
  una parte de la abertura. Con más detalle en las sombras (5 o 2,5 cm), esos
  puntos se acercan, a cambio de tiempo ([Analizar la luz](../analizar)).
- **Las luminarias no tapan la luz que rebota.** En Radiance, el cuerpo que
  brilla sí la tapa. Por eso la luz que rebota da en promedio un 1 % más que
  en Radiance, y hasta un 4,5 % alrededor del aplique. En una prueba en la que
  el cuerpo de cada luminaria tapa la luz que rebota, la diferencia media baja
  a 0,0 %, y lo que queda se achica con el tamaño de los parches
  ([BOUNCE.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/BOUNCE.md)).
- **Todas las superficies reflejan de forma difusa:** no hay brillos ni
  espejos.
- **Los ambientes son rectangulares**, y todavía no hay ventanas.

Lux Studio no es un programa de cálculo certificado: sirve para diseñar y
comparar con confianza, no para firmar un proyecto.
