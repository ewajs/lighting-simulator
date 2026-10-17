<script setup>
import { data } from '../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../.vitepress/theme/analysis/headline'

const h = headline(data.summary, data.timings)
const n = (v) => Math.round(v).toLocaleString('es-AR')
const release = data.summary.rooms[0].radianceRelease
</script>

# Cómo comparamos

## La referencia: Radiance

**Radiance** es el simulador de iluminación de investigación del Lawrence
Berkeley National Laboratory. Programas como DIALux y Relux se validan contra
los mismos casos de prueba. Lee los archivos IES con su propio código, así que
no comparte ni el código ni las suposiciones de Lux Studio. Se usa la versión
6.0 parche 2 (`{{ release }}`), siempre la misma, verificada por su huella
digital.

## Antes de confiar en Radiance

Radiance tiene que pasar sus propias pruebas antes de escribir una sola
referencia:

- **194 valores calculados a mano** desde cada archivo IES, a 20 m de
  distancia, donde la ley de la inversa del cuadrado es exacta. Una versión de
  Radiance con un error conocido en su lector de IES no pasa ninguna, y hay una
  prueba que lo demuestra.
- **La esfera integradora:** en un cubo cerrado que refleja el 80 %, la luz
  que rebota tiene que dar lo que dice la fórmula,
  $E = \rho\,\Phi / (A\,(1-\rho))$, dentro del 2 %.
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
  punto más iluminado del ambiente. En un rincón oscuro, 1 lx contra 2 lx es un
  100 % que no le importa a nadie.
- **Lejos y cerca:** a menos de 1 m de una luminaria, los dos programas
  aproximan de forma distinta una abertura que brilla, y el archivo IES no dice
  cómo es la luz tan de cerca. Se cuentan aparte.

## Siempre al día

Todo lo de esta sección sale del código. Cada vez que se cambia el cálculo, las
pruebas de Lux Studio comparan cada punto con Radiance y fallan si algo se
aleja más de lo medido; otra prueba verifica que estas páginas muestren los
resultados actuales. Los tiempos se miden aparte, en una máquina tranquila, y
dicen en cuál.

El detalle técnico está en el
[informe de precisión](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md)
y en las decisiones de diseño 0058, 0060 y 0061 del repositorio.
