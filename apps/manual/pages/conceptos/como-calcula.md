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
  'busy-open-plan': 'Un ambiente integrado lleno de muebles',
  'dark-room': 'Un ambiente oscuro',
  'white-room': 'Un ambiente blanco',
  'tall-hall': 'Un salón alto',
  'small-bathroom': 'Un baño chico',
  'wall-wash': 'Luz sobre las paredes',
}
</script>

# Cómo calcula Lux Studio

Lux Studio calcula la iluminancia con las mismas ideas de estas páginas, en
este orden:

1. **Cada luminaria es una fuente de luz** con la distribución de su archivo IES.
   Si su abertura mide más de 10 cm, se divide en celdas de 10 cm como máximo
   (5 o 2,5 cm si elegís más detalle en las sombras), a lo ancho, a lo largo y
   en altura ([Distancia y ángulo](./distancia-y-angulo)). Contra el valor
   exacto de un panel que brilla parejo, las celdas quedan dentro del 1 % desde
   dos celdas de distancia.
   Sin archivo IES, se estima repartiendo su flujo en su ángulo de haz, y el
   resultado lo avisa.
2. **En cada punto de la cuadrícula** ([El plano de trabajo](./plano-de-trabajo))
   suma lo que le llega de cada fuente: $E = I \cos\alpha / d^2$.
3. **Los muebles hacen sombra:** si uno se interpone, esa fuente no suma. Las
   mesas tapan solo con la tapa; sillas, plantas y cuadros no tapan.
4. **Suma la luz natural:** cada ventana es una fuente con el brillo del cielo
   que se ve a través de ella (los cielos nublado y despejado de la CIE, a los
   niveles de la IES), dividida en celdas; el sol entra como un haz. Con
   vidrio esmerilado o cortina, la ventana brilla pareja
   ([Ventanas y luz natural](../ventanas)).
5. **Suma la luz que rebota:** el piso, el techo y las paredes se dividen en
   parches de 25 cm, y cada uno devuelve la parte de la luz que recibe que
   indica su reflectancia, rebote tras rebote, hasta que no cambia nada. Es el
   método de radiosidad, clásico en el cálculo de iluminación de interiores
   ([La luz que rebota](./luz-que-rebota)). Los muebles también cuentan: tapan
   la luz que rebota, y cada una de sus caras la refleja según su terminación.
   Y el cuerpo de cada luminaria, la caja de su abertura, también la tapa,
   como una superficie que brilla. La luz natural rebota igual, y la que
   llega a una ventana sale del ambiente.
6. **Multiplica por el factor de mantenimiento** la luz de las luminarias
   ([Factor de mantenimiento](./mantenimiento)).
7. **Resume** cada superficie: $\bar{E}$, $E_\text{min}$, $E_\text{max}$ y $U_0$
   ([Uniformidad](./uniformidad)).

## Lo que todavía no cuenta

- **Los muebles son cajas:** un sillón es un bloque, una mesa es solo su tapa.
- **El cuerpo de una luminaria es una caja:** la de su abertura, sin
  inclinar. Justo encima de una downlight se nota (ver abajo).
- **Todas las superficies reflejan de forma difusa:** no hay brillos ni espejos.
- **Los ambientes son rectangulares**, y las paredes no tienen espesor.
- **El vidrio deja pasar lo mismo desde cualquier ángulo**, y no hay clima:
  un cielo, a una hora.

## Cuán preciso es

Se comprobó contra **Radiance**, el simulador de iluminación de investigación del
Lawrence Berkeley National Laboratory, que lee los archivos IES con su propio
código. Doce ambientes de prueba, con los archivos reales de la demo, y miles
de puntos, con la luz que rebota incluida. La diferencia más grande, por
ambiente:

<LxAccuracy
  :summary="data"
  :room-names="rooms"
  :headings="['Ambiente', 'Promedios', 'Puntos a más de 1 m', 'Puntos a menos de 1 m']"
/>

Los "puntos" cuentan solo los que reciben al menos el 10 % de la luz del punto
más iluminado del ambiente. El aplique da hasta un 3,3 % más en promedio,
probablemente porque en Radiance su cuerpo tapa parte de la luz que rebota en
la pared de atrás; en Lux Studio, las luminarias no la tapan. Muy cerca de una
luminaria grande, como el aplique, los dos programas aproximan de forma
distinta una abertura que brilla, y el archivo IES no dice cómo es la luz tan
de cerca.

Antes de confiar en Radiance, se le pide reproducir valores calculados a mano
desde cada archivo; una versión de Radiance con un error conocido no pasa esas
pruebas. Todos los números, ambiente por ambiente y punto por punto, con
mapas, gráficos y tiempos, están en la sección **[Análisis](../analisis/)**.

Lux Studio no es un programa de cálculo certificado: sirve para diseñar y
comparar con confianza, no para firmar un proyecto.
