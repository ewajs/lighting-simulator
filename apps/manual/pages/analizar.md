# Analizar la luz

Lux Studio calcula cuánta luz llega al plano de trabajo y a cada superficie
del ambiente, en lux, con la luz que rebota incluida
([Cómo calcula Lux Studio](./conceptos/como-calcula)). Se ve de tres formas:
los números del panel **Análisis**, la vista **Iluminancia** en colores, y la
luz en un punto, con el mouse o el dedo.

## El panel Análisis

![El panel Análisis con el ambiente de inicio](/screenshots/es/analysis-panel.png)

Abrilo con el tercer ícono del panel de la izquierda, el del gráfico de
barras; en el celular, con la pestaña **Análisis**. Mientras está abierto,
recalcula solo cada vez que cambiás la escena.

- **Plano de trabajo:** la iluminancia media $\bar{E}$, la mínima, la máxima
  y la uniformidad $U_0$ ([El plano de trabajo](./conceptos/plano-de-trabajo),
  [Uniformidad](./conceptos/uniformidad)). Comparalas con los
  [niveles recomendados](./conceptos/niveles) para lo que se hace en el
  ambiente.
- **Superficies del ambiente:** lo mismo para el piso, el cielorraso y cada
  pared.
- Arriba dice cuánto tardó el cálculo. Mientras calcula, los números
  anteriores quedan atenuados hasta que llegan los nuevos.
- Si una luminaria no tiene archivo IES, lo avisa: su luz es una estimación.
- Los puntos tapados por un mueble no cuentan en las cifras, y el panel dice
  cuántos son: los que quedan dentro de un mueble, el piso debajo de un
  sillón, o la pared detrás de una biblioteca a menos de 5 cm de ella. Tampoco
  los que caen sobre el vidrio de una ventana. Nadie mide ahí, y con ellos el
  mínimo y la uniformidad darían 0.

Con **Calcular mientras edito** apagado, calcula solo cuando tocás
**Calcular**. Sirve en un ambiente grande con muchos muebles, donde cada
cálculo tarda unos segundos.

## Ajustes del cálculo

![Los ajustes del cálculo, al final del panel](/screenshots/es/analysis-settings.png)

- **Factor de mantenimiento:** la parte de la luz que queda después de años
  de uso ([Factor de mantenimiento](./conceptos/mantenimiento)). Todos los
  números del panel son valores mantenidos.
- **Altura del plano de trabajo** y **borde:** a qué altura se mide, y qué
  franja junto a las paredes queda afuera.
- **Detalle de las sombras:** el tamaño de las celdas en que se divide cada
  luminaria, 10, 5 o 2,5 cm. Más chicas, el borde de las sombras y los puntos
  muy cerca de una luminaria grande dan más exacto, y el cálculo tarda más
  (ver abajo).
- **Luz que rebota:** apagada, cuenta solo la luz directa. Es más rápido,
  pero da un tercio o más por debajo de lo real.
- **Muebles en la luz que rebota:** apagado, los muebles hacen sombra solo a
  la luz directa. Es más rápido en un ambiente amueblado, y menos preciso
  cerca de los muebles. Necesita la luz que rebota encendida.
- **Cuerpo de las luminarias:** encendido, el cuerpo de cada luminaria (la
  caja de su abertura) tapa la luz que rebota, como en la realidad: la pared
  detrás de un aplique no ve el ambiente a través de él. Apagado, da un poco
  más de luz cerca de las luminarias, sobre todo en ambientes chicos y claros,
  y mover una luminaria se recalcula más rápido. Necesita la luz que rebota
  encendida.

Cuánto mejora el resultado y cuánto tarda cada uno, medido contra Radiance:
[Función por función](./analisis/funcion-por-funcion). Por ahora, los
ajustes no se guardan con la escena: al recargar la página vuelven a los de
siempre.

## Cuánto detalle en las sombras

Cada luminaria se calcula como una grilla de pequeñas fuentes de luz. Contra
el valor exacto de un panel que brilla parejo, la grilla queda dentro del 1 %
desde dos celdas de distancia, y cada vez que las celdas se achican a la
mitad, la diferencia baja unas cuatro veces. Lo que más cambia es la
**penumbra**: un punto que ve una luminaria apenas por encima del borde de un
mueble. Medido contra Radiance en los doce ambientes de prueba:

| Detalle | Puntos iluminados a más del 10 % de Radiance | Tiempo al cambiar una luz |
|---|---|---|
| 10 cm (el de siempre) | 37 de 11042 | 1 vez |
| 5 cm | 18 de 11042 | hasta 3 veces |
| 2,5 cm | 9 de 11042 | hasta 8 veces |

Los que cambian son los de penumbra, en el ambiente lleno de muebles: 29, 10
y 2. Los demás, en el baño chico y junto al aplique, casi no cambian: están a
pocos centímetros del cuerpo de una luminaria.

El tiempo crece con el tamaño de las luminarias: con downlights chicas casi
no cambia, con luminarias lineales largas es lo que dice la tabla. Un buen
uso: diseñar con 10 cm y revisar el resultado final con 5 cm. El detalle
completo está en
[SOURCE-CELL.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/SOURCE-CELL.md).

## La vista Iluminancia

![La vista Iluminancia, leyendo la luz en un punto del plano de trabajo](/screenshots/es/illuminance.png)

Elegí **Iluminancia** arriba de la vista, o apretá **3**. Cada superficie
calculada se pinta según la luz que recibe, de azul oscuro (0 lx) a blanco
(2000 lx o más), con la escala abajo a la derecha. De día, con luz natural,
la escala llega a 10.000 lx ([Ventanas y luz natural](./ventanas)). El plano
de trabajo se ve a su altura, encima del piso. Los puntos tapados por un
mueble o sobre una ventana se ven grises.
La vista se recalcula igual que el panel, y mientras tanto la escala lo dice.

## La luz en un punto

En la vista Iluminancia, pasá el mouse sobre una superficie: un cartel
muestra la luz en ese punto, en lux, y cuánto es **directa** y cuánto
**rebotada**. En pantallas táctiles, tocá la superficie. El número se
calcula en ese punto exacto, no sale del color, y se actualiza cuando cambia
la escena.

## Antes de confiar en los números

- Son una buena guía para diseñar y comparar, no un cálculo certificado.
  Qué tan cerca están de Radiance, ambiente por ambiente:
  [Dónde estamos](./analisis/).
- Los muebles cuentan como cajas: un sillón es un bloque, una mesa es solo
  su tapa.
- En un ambiente con muchos muebles, mover un mueble o una luminaria tarda
  unos segundos en recalcularse; atenuar o encender una luminaria, mucho
  menos ([Velocidad](./analisis/velocidad)).
