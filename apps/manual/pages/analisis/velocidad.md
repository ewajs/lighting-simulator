<script setup>
import LxSpeed from '../../.vitepress/theme/components/analysis/LxSpeed.vue'
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../.vitepress/theme/analysis/headline'

const h = headline(data.summary, data.timings)
const n = (v) => Math.round(v).toLocaleString('es-AR')
const t = data.timings
</script>

# Velocidad

Cuánto tarda Lux Studio en calcular cada ambiente de prueba, y cuánto tarda
Radiance en calcular los mismos puntos.

<LxSpeed :timings="data.timings">
  Medido en una {{ t.machine.cpu }} ({{ t.machine.cores }} núcleos), Node {{ t.machine.node }}, el {{ t.generated }}. Lux Studio: la mediana de {{ t.runs }} corridas, en un solo hilo. Radiance: el tiempo real, con varios procesos en paralelo.
</LxSpeed>

## Qué se mide

- **Lux Studio** lee los archivos IES, prepara la luz de las luminarias,
  resuelve los rebotes y calcula cada punto del ambiente: todo lo que hace para
  mostrar un resultado. Corre en un solo hilo, armado igual que la aplicación.
- **Radiance** calcula la luz directa en una corrida, y la que rebota en dos
  más (la total, y la directa para restar), con los ajustes de referencia:
  4096 rayos por muestra, hasta 24 rebotes y nada interpolado. Usa todos los
  núcleos de la máquina.

## Cómo leerlo

El cálculo completo de Lux Studio tarda entre {{ n(h.oursMinMs) }} y
{{ n(h.oursMaxMs) }} ms por ambiente. Casi todo es la luz que rebota: solo con
luz directa, un ambiente tarda alrededor de un milisegundo.

Radiance tarda entre {{ n(h.radianceMinS) }} y {{ n(h.radianceMaxS) }} s, pero
**no es una carrera**: sus ajustes se eligieron para que sea una referencia
exacta, sin importar cuánto tarde. Con sus ajustes normales sería mucho más
rápido, y también menos preciso. La comparación muestra cuánto cuesta el
modelo de Lux Studio, no que sea más rápido que Radiance.

Todavía no se midió en otras máquinas: en un teléfono o una computadora más
vieja, el cálculo va a tardar más. Cuando el análisis llegue a la aplicación,
va a correr aparte de la vista 3D, sin trabarla, y va a guardar lo que solo
depende del ambiente para no recalcularlo cada vez que se mueve una luminaria.
