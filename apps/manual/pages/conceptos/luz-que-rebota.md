<script setup>
import LxFormFactor from '../../.vitepress/theme/components/LxFormFactor.vue'
import LxBounces from '../../.vitepress/theme/components/LxBounces.vue'
</script>

# La luz que rebota

La luz de una luminaria no termina donde cae. El piso, las paredes y el techo
devuelven parte de lo que reciben, y esa luz vuelve a rebotar. En un ambiente
claro, la luz que rebota puede sumar tanto como la directa, o más.

## Reflectancia

La **reflectancia** ρ de una superficie es la parte de la luz que recibe que
devuelve: de 0, un negro que absorbe todo, a 1, un blanco que no absorbe nada.
Una pared blanca anda por 0,8; un piso de madera, por 0,3. Lux Studio arranca
con 0,3 para el piso, 0,8 para las paredes y 0,85 para el techo, y vos las
cambiás en [El ambiente](../ambiente).

Todas las superficies son mates: devuelven la luz pareja hacia todos lados,
sin brillos ni reflejos.

## Parches

Para calcularla, Lux Studio divide el piso, el techo y cada pared en
**parches** de 25 cm como máximo. Cada parche recibe luz directa de las
luminarias y luz de todos los otros parches, y devuelve la parte que dice su
reflectancia. Lo que devuelve por metro cuadrado es su **exitancia** $M$, en
lm/m²:

$$M_i = \rho_i \left( E_{\text{directa},\,i} + \sum_j F_{ij}\, M_j \right)$$

- $E_{\text{directa},\,i}$ es la luz directa que le llega al parche $i$.
- $F_{ij}$ es el **factor de forma**: la parte de la luz que sale del parche
  $i$ que llega al parche $j$.

## El factor de forma

Depende solo de la geometría: de qué tan lejos están los dos parches y de cómo
se miran. Un parche ve toda la semiesfera que tiene encima, pero no todo pesa
igual: lo que tiene enfrente cuenta más que lo que ve de costado, por la misma
ley del coseno de [Distancia y ángulo](./distancia-y-angulo).

Hay una forma de verlo, la **analogía de Nusselt**: proyectá la otra
superficie sobre una semiesfera centrada en el parche, y esa sombra, hacia
abajo, sobre la base. La parte del círculo de la base que queda tapada es el
factor de forma.

Mové el panel arrastrando el punto del medio, giralo desde la punta, o usá
los controles:

<LxFormFactor
  :labels="{
    x: 'Posición del panel',
    height: 'Altura del panel',
    angle: 'Ángulo del panel',
    patch: 'parche',
    panel: 'panel',
    share: 'de la luz que sale del parche llega al panel.',
  }"
  caption="Un parche chico en el piso y un panel de 1 m de ancho, largo hacia el fondo, visto de punta. El tramo ámbar de la base es su factor de forma; el número lo calcula la misma función que usa Lux Studio."
/>

Cerca y de frente, el panel se lleva una buena parte de la luz; lejos, de
canto o muy de costado, casi nada. Entre todas las superficies de un ambiente
cerrado, un parche lo ve todo: sus factores de forma suman 1.

Lux Studio calcula cada factor de forma con la fórmula exacta para un
polígono, sin aproximar.

## Rebote tras rebote

La ecuación de arriba tiene $M$ de los dos lados: la luz de cada parche
depende de la de todos los demás. Lux Studio la resuelve por vueltas: arranca
con la luz directa, reparte un rebote, después otro, y para cuando ningún
parche cambia más de una diezmilésima de lo que da el más brillante.

Después, en cada punto de la [cuadrícula](./plano-de-trabajo) suma la luz que
le llega de cada parche, con el mismo factor de forma, y se la agrega a la
directa.

## Cuánto suman los rebotes

Imaginá un ambiente con la misma reflectancia ρ en todas sus superficies. De
la luz directa vuelve una parte ρ; de esa, otra vez ρ, y así:

$$\rho + \rho^2 + \rho^3 + \dots = \frac{\rho}{1 - \rho}$$

Probá con distintas reflectancias:

<LxBounces
  :labels="{
    reflectance: 'Reflectancia',
    direct: 'Directa',
    bounce: 'Rebote',
    share: 'Cuánto da cada rebote, sobre la luz directa',
    total: 'La directa más todos los rebotes',
  }"
  caption="Cada rebote da ρ veces el anterior. Con ρ = 0,5 los rebotes suman tanto como la luz directa; con 0,8, cuatro veces más."
/>

Por eso un ambiente de paredes claras se ve mucho más iluminado con las mismas
luminarias, y uno oscuro, mucho menos.

### La esfera integradora

Es el caso ideal: una esfera hueca, toda con la misma reflectancia. Si una
fuente emite un flujo $\Phi$ adentro y la superficie interior mide $A$, la luz
que rebota le llega pareja a cada punto:

$$E = \frac{\rho\,\Phi}{A\,(1 - \rho)}$$

En cualquier recinto cerrado con una sola reflectancia, la misma cuenta da el
promedio.

**Ejemplo.** Una fuente de 100 cd en todas las direcciones emite
$\Phi = 4\pi \cdot 100 = 1257$ lm. En un cubo de 3 m de lado, $A = 54$ m², con
$\rho = 0{,}8$:

$$E = \frac{0{,}8 \cdot 1257}{54 \cdot 0{,}2} = 93{,}1\ \text{lx}$$

Las pruebas de Lux Studio usan esta cuenta para comprobar los rebotes. Y
antes de usar Radiance para comparar, se le pide lo mismo en una esfera de
verdad, de 1,5 m de radio, donde la cuenta vale en cada punto: tiene que dar
dentro del 0,1 %, y da exactamente lo de la fórmula
([Cómo comparamos](../analisis/metodo)).

## Los muebles también

Los muebles son parte del ambiente: tapan la luz que rebota (el piso debajo de
una mesa no ve el techo) y cada una de sus caras es un parche más, que refleja
según su terminación. Y el cuerpo de las luminarias también la tapa: la
pared detrás de un aplique no ve el ambiente a través de él.
Cuánto cambia cada cosa lo ves en [Función por función](../analisis/funcion-por-funcion).
