<script setup>
import LxAccuracy from '../../.vitepress/theme/components/LxAccuracy.vue'
import { data } from '../../.vitepress/theme/diagrams/accuracy.data'

const rooms = {
  'single-downlight': 'Una downlight',
  'downlights-and-wall-washer': 'Cuatro downlights y un bañador de pared',
  'track-spots': 'Dos spots de riel inclinados',
  'linear-pendant-over-table': 'Un colgante lineal sobre una mesa',
  'wall-sconce': 'Un aplique de pared',
  'furnished-living': 'Un living amueblado',
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
4. **Suma la luz que rebota:** el piso, el techo y las paredes se dividen en
   parches de 25 cm, y cada uno devuelve la parte de la luz que recibe que
   indica su reflectancia, rebote tras rebote, hasta que no cambia nada. Es el
   método de radiosidad, clásico en el cálculo de iluminación de interiores.
5. **Multiplica por el factor de mantenimiento**
   ([Factor de mantenimiento](./mantenimiento)).
6. **Resume** cada superficie: $\bar{E}$, $E_\text{min}$, $E_\text{max}$ y $U_0$
   ([Uniformidad](./uniformidad)).

## Lo que todavía no cuenta

Los muebles hacen sombra a la luz directa, pero la luz que rebota no los ve: no
la tapan ni la reflejan. Medido con Radiance, eso pesa:
- en un living amueblado, los promedios se alejan hasta un 5,4 %, y algunos
  puntos junto a los muebles (debajo de una mesa, junto a la biblioteca) hasta
  un 43 %;
- sobre una mesa con un colgante, el techo recibe un 7 % menos de lo que
  debería, porque falta la luz que refleja la mesa.

Sin los muebles, los promedios de Lux Studio y Radiance coinciden dentro del 1 %
en esos mismos ambientes. Todas las superficies reflejan de forma difusa: no hay
brillos ni espejos.

## Cuán preciso es

Se comprobó contra **Radiance**, el simulador de iluminación de investigación del
Lawrence Berkeley National Laboratory, que lee los archivos IES con su propio
código. Seis ambientes de prueba, con los archivos reales de la demo, y miles
de puntos, con la luz que rebota incluida. La diferencia más grande, por
ambiente:

<LxAccuracy
  :summary="data"
  :room-names="rooms"
  :headings="['Ambiente', 'Promedios', 'Puntos a más de 1 m', 'Puntos a menos de 1 m']"
/>

Los "puntos" cuentan solo los que reciben al menos el 10 % de la luz del punto
más iluminado del ambiente. Las diferencias del living y del colgante son las de
los muebles, que se explican más arriba. El aplique da hasta un 3,3 % más en
promedio, probablemente porque en Radiance su cuerpo tapa parte de la luz que
rebota en la pared de atrás; en Lux Studio, las luminarias no la tapan. Muy cerca de una luminaria grande, como el aplique,
los dos programas aproximan de forma distinta una abertura que brilla, y el
archivo IES no dice cómo es la luz tan de cerca.

Antes de confiar en Radiance, se le pide reproducir valores calculados a mano
desde cada archivo; una versión de Radiance con un error conocido no pasa esas
pruebas. Todos los números, ambiente por ambiente y punto por punto, con
mapas, gráficos y tiempos, están en la sección **[Análisis](../analisis/)**.

Lux Studio no es un programa de cálculo certificado: sirve para diseñar y
comparar con confianza, no para firmar un proyecto.
