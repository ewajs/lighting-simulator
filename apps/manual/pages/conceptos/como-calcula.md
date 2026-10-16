<script setup>
import LxAccuracy from '../../.vitepress/theme/components/LxAccuracy.vue'
import { data } from '../../.vitepress/theme/diagrams/accuracy.data'

const rooms = {
  'single-downlight': 'Una downlight',
  'downlights-and-wall-washer': 'Cuatro downlights y un bañador de pared',
  'track-spots': 'Dos spots de riel inclinados',
  'linear-pendant-over-table': 'Un colgante lineal sobre una mesa',
  'wall-sconce': 'Un aplique de pared',
}
</script>

# Cómo calcula Lux Studio

Lux Studio calcula la iluminancia con las mismas ideas de estas páginas, en
este orden:

1. **Cada luminaria es una fuente de luz** con la distribución de su archivo IES.
   Si su abertura mide más de 10 cm, se divide en celdas de 10 cm como máximo,
   a lo ancho, a lo largo y en altura ([Distancia y ángulo](./distancia-y-angulo)).
   Sin archivo IES, se estima repartiendo su flujo en su ángulo de haz, y el
   resultado lo avisa.
2. **En cada punto de la cuadrícula** ([El plano de trabajo](./plano-de-trabajo))
   suma lo que le llega de cada fuente: $E = I \cos\alpha / d^2$.
3. **Los muebles hacen sombra:** si uno se interpone, esa fuente no suma. Las
   mesas tapan solo con la tapa; sillas, plantas y cuadros no tapan.
4. **Multiplica por el factor de mantenimiento**
   ([Factor de mantenimiento](./mantenimiento)).
5. **Resume** cada superficie: $\bar{E}$, $E_\text{min}$, $E_\text{max}$ y $U_0$
   ([Uniformidad](./uniformidad)).

## Lo que todavía no cuenta

::: warning Solo luz directa, por ahora
La luz que rebota en paredes, techo y piso todavía no se suma. Es una parte
importante del total, más cuanto más claras son las superficies, así que por
ahora los valores quedan **por debajo** de los de DIALux o Relux. Llega en una
próxima versión.
:::

Tampoco cuenta la luz que reflejan los muebles, ni superficies brillantes o
espejadas: todo refleja de forma difusa.

## Cuán preciso es

Se comprobó contra **Radiance**, el simulador de iluminación de investigación del
Lawrence Berkeley National Laboratory, que lee los archivos IES con su propio
código. Cinco ambientes de prueba, con los archivos reales de la demo, y miles
de puntos. La diferencia más grande, por ambiente:

<LxAccuracy
  :summary="data"
  :room-names="rooms"
  :headings="['Ambiente', 'Promedios', 'Puntos a más de 1 m', 'Puntos a menos de 1 m']"
/>

Los "puntos" cuentan solo los que reciben al menos el 10 % de la luz del punto
más iluminado del ambiente. Muy cerca de una luminaria grande, como el aplique,
los dos programas aproximan de forma distinta una abertura que brilla, y el
archivo IES no dice cómo es la luz tan de cerca.

Antes de confiar en Radiance, se le pide reproducir valores calculados a mano
desde cada archivo; una versión de Radiance con un error conocido no pasa esas
pruebas. El detalle está en el
[informe de precisión](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md).

Lux Studio no es un programa de cálculo certificado: sirve para diseñar y
comparar con confianza, no para firmar un proyecto.
