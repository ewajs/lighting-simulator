# Ventanas y luz natural

Las ventanas dejan entrar la luz del día: Lux Studio la calcula con el cielo
que elijas, nublado o despejado con sol, y la muestra en la vista 3D.

## Agregar ventanas

Arriba del **Catálogo**, elegí **Ventanas**. Hay tres:

- **Ventana:** 1,2 × 1,2 m, con el antepecho (el borde de abajo) a 0,9 m.
- **Ventanal:** 1,8 × 2,1 m, casi hasta el piso.
- **Tragaluz:** 0,9 × 0,9 m, en el techo.

![El catálogo de ventanas](/screenshots/es/windows-catalog.png)

**Hacé clic** en una y aparece en el medio de la pared del fondo (el tragaluz,
en el medio del techo). O **arrastrala** a la vista 3D: va a la pared más
cercana a donde la soltás, o al techo encima.

## Elegir y mover

Hacé clic en una ventana para elegirla, y **arrastrala**: se desliza por su
pared, o por el techo, sin salirse. Con la herramienta **Mover** (W), las
flechas la mueven en una sola dirección. Mientras la movés, unas líneas
muestran la distancia a la esquina más cercana y la altura del antepecho.

**⌘A** (o **Ctrl+A**) con una ventana elegida elige todas. En la lista de
**Escena**, las ventanas tienen su propia sección.

Para ver el techo y sus tragaluces, girá la vista por debajo del horizonte:
arrastrá hacia arriba en un lugar vacío.

## Propiedades

![Las propiedades de una ventana](/screenshots/es/window-inspector.png)

- **Tamaño:** ancho y alto (en el techo, ancho y profundidad). Al cambiar el
  alto, el antepecho queda donde estaba.
- **Posición:** la **superficie** donde está (una de las cuatro paredes o el
  techo), dónde a lo largo de ella, y el **antepecho**.
- **Vidrio:** **transparente** (deja pasar el 80 % de la luz),
  **tonalizado** (50 %) o **esmerilado** (70 %, y la difunde: no se ve el
  sol, sino una ventana que brilla pareja).
- **Cortina:** **ninguna**, **cortina translúcida** (deja pasar el 60 % y la
  difunde) o **persiana** cerrada (10 %).

**⌘D** duplica la ventana al lado, en su misma pared, y **Supr** la borra.

## La luz natural

Con nada elegido, al final del panel **Ambiente**:

![La luz natural: cielo, momento del día, mes, latitud y norte](/screenshots/es/daylight-settings.png)

- **Cielo:** **nublado** (el cielo nublado de la CIE, sin sol) o
  **despejado** (con sol, mientras esté arriba del horizonte).
- **Momento del día:** **mañana** (9), **mediodía** (12), **tarde** (16) o
  **noche** (22: el sol ya se puso, no hay luz natural), o cualquier hora
  con la barra. Es la **hora solar**: a las 12 el sol está en
  lo más alto. Puede diferir del reloj en hasta una hora.
- **Mes:** el día 21, para que caigan los solsticios y equinoccios.
- **Latitud:** dónde está el proyecto; las del sur son negativas (Buenos
  Aires, −34,6).
- **Norte:** hacia dónde queda el norte. Con 0°, detrás de la pared del fondo;
  con 90°, detrás de la pared derecha.

Debajo, una línea dice a qué altura está el sol, o si ya se puso.

La luz natural se guarda con la escena. **Nueva** la conserva: una plantilla
es un ambiente, no un lugar.

## En la vista

![El sol de la mañana entrando por un ventanal](/screenshots/es/sun-through-window.png)

Con sol, su luz entra por las ventanas que lo miran y dibuja su mancha en el
piso y las paredes, con las sombras de los muebles. Cada ventana brilla con el
cielo que se ve a través de ella, y afuera se ve el cielo: gris si está
nublado, celeste si está despejado, oscuro de noche.

De día, un ambiente tiene diez veces más luz que con lámparas solas: la
**exposición** se adapta, como el ojo, para que se vea como un ambiente y no
como un blanco. El control de exposición sigue funcionando encima.

## En el análisis

El [cálculo](./analizar) cuenta la luz natural junto con la de las
luminarias, con todos sus rebotes. La luz que llega a una ventana sale del
ambiente: aunque sea de noche, un ambiente con ventanas grandes se ve un poco
más oscuro.

- La sonda muestra la luz natural aparte: **Directa · natural · rebotada**.
- En **Ajustes del cálculo**, el interruptor **Luz natural** la deja afuera.
- De día, la escala de colores llega a 10.000 lx: la luz natural es mucho
  más que la de las luminarias.
- Los puntos sobre el vidrio de una ventana no cuentan en las cifras, como los
  tapados por muebles.

Los resultados coinciden con los de Radiance dentro del 1 %
([Luz natural, en Análisis](./analisis/luz-natural)).

## Lo que todavía no hace

- El vidrio deja pasar la misma parte de la luz desde cualquier ángulo; el
  real, menos cuando la luz llega rasante.
- Las paredes no tienen espesor: no hay jamba que haga sombra.
- No hay clima ni cifras anuales: un cielo, a una hora.
