<script setup>
import LxPlot from '../../.vitepress/theme/components/LxPlot.vue'
import LxDistanceAngle from '../../.vitepress/theme/components/LxDistanceAngle.vue'
import { data } from '../../.vitepress/theme/diagrams/light.data'
import { data as directions } from '../../.vitepress/theme/diagrams/directions.data'
</script>

# Distancia y ángulo

Cuánta luz llega a un punto depende de dos cosas: **qué tan lejos** está de la
luminaria y **con qué ángulo** le llega la luz.

## La ley de la inversa del cuadrado

La luz de una fuente se abre a medida que se aleja: a doble distancia, el mismo
haz cubre una superficie cuatro veces más grande, así que cada metro cuadrado
recibe la cuarta parte.

$$E = \frac{I}{d^2}$$

con $I$ la intensidad hacia ese punto (cd) y $d$ la distancia (m).

**Ejemplo.** Una fuente de 1000 cd a 2 m de una superficie que la mira de
frente: $1000 / 2^2 = 250$ lx. A 4 m: $1000 / 4^2 = 62{,}5$ lx, la cuarta parte.

<LxPlot
  :series="[{ label: 'Downlight de la demo', points: data.falloff }]"
  x-label="Distancia debajo de la luminaria (m)"
  y-label="Iluminancia (lx)"
  caption="Justo debajo de la downlight de la demo: al doble de distancia, la cuarta parte de luz."
/>

## La ley del coseno

Si la luz llega inclinada, se reparte sobre más superficie, como la sombra
alargada del atardecer. La iluminancia se multiplica por el coseno del ángulo
$\alpha$ entre la luz y la perpendicular a la superficie:

$$E = \frac{I \cos\alpha}{d^2}$$

Esa es la fórmula que usa Lux Studio en cada punto, con $I$ leída del archivo
IES en la dirección exacta del punto.

**Ejemplo.** La misma fuente de 1000 cd, a 2 m del piso. Un punto del piso a 1 m
del que está justo debajo queda a $d = \sqrt{1^2 + 2^2} = \sqrt 5$ m, y la luz le
llega con $\cos\alpha = 2/\sqrt 5$:

$$E = \frac{1000 \cdot 2/\sqrt 5}{5} = 178{,}9\ \text{lx}$$

En el piso debajo de una downlight se suman las dos leyes y la forma del haz.
La curva punteada muestra cuánto pesa el coseno:

<LxPlot
  :series="[
    { label: 'Iluminancia real', points: data.floor[0] },
    { label: 'Sin el coseno (I / d²)', points: data.floor[1], dashed: true, muted: true },
  ]"
  :x-min="-3"
  x-label="Posición en el piso (m)"
  y-label="Iluminancia (lx)"
  caption="El piso 2,7 m debajo de la downlight de la demo, calculado por Lux Studio con su archivo IES."
/>

### Probalo

Arrastrá el punto por el piso o la luminaria hacia arriba y abajo, o usá los
controles. La curva alrededor de la luminaria es su curva polar: en cada
dirección, su largo es la intensidad $I$.

- El ángulo **γ**, desde la vertical de la luminaria, dice qué intensidad leer
  del archivo IES.
- El ángulo **α**, desde la perpendicular a la superficie (la flecha azul), da
  el coseno.

Con la superficie en el piso, los dos ángulos son iguales. Inclinala y se
separan: girada hacia la luminaria recibe más luz; de espaldas, nada.

<LxDistanceAngle
  :profile="directions.downlight"
  :labels="{
    height: 'Altura de la luminaria',
    position: 'Posición del punto',
    tilt: 'Inclinación de la superficie',
    away: 'la superficie le da la espalda a la luz.',
  }"
  caption="La downlight de la demo, con su archivo IES: la cuenta de arriba, con la luminaria como un punto."
/>

## Varias luminarias

La luz de varias luminarias se suma: la iluminancia en un punto es la suma de
lo que le llega de cada una. Si un mueble se interpone entre una luminaria y el
punto, esa luminaria no suma nada: hay sombra.

## Cerca de una luminaria grande

La ley de la inversa del cuadrado vale para un punto de luz. Una luminaria real
tiene tamaño, y la ley es exacta, con un 1 % de error, a partir de **cinco veces**
su tamaño. Más cerca, tratarla como un punto exagera.

Por eso Lux Studio divide la abertura de la luminaria en celdas de 10 cm como
máximo, a lo ancho, a lo largo y en altura, y cada celda es un punto con su
parte de la luz. Debajo del medio de una línea de luz de 1,2 m:

<LxPlot
  :series="[
    { label: 'Fórmula exacta', points: data.line[0] },
    { label: 'Lux Studio (celdas)', points: data.line[1], dashed: true },
    { label: 'Un solo punto', points: data.line[2], muted: true },
  ]"
  :y-max="1000"
  x-label="Distancia debajo de la línea de luz (m)"
  y-label="Iluminancia (lx)"
  caption="Una línea de 1,2 m que da 100 cd: con celdas, Lux Studio sigue la fórmula exacta; un solo punto se pasa de largo cerca."
/>

La fórmula exacta de una línea pareja de largo $L$, a una distancia $h$ de su
punto medio, es

$$E = \frac{I}{h\,\sqrt{h^2 + L^2/4}}$$
