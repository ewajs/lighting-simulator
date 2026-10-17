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
- **Luz que rebota:** apagada, cuenta solo la luz directa. Es más rápido,
  pero da un tercio o más por debajo de lo real.
- **Muebles en la luz que rebota:** apagado, los muebles hacen sombra solo a
  la luz directa. Es más rápido en un ambiente amueblado, y menos preciso
  cerca de los muebles. Necesita la luz que rebota encendida.

Cuánto mejora el resultado y cuánto tarda cada uno, medido contra Radiance:
[Función por función](./analisis/funcion-por-funcion). Por ahora, los
ajustes no se guardan con la escena: al recargar la página vuelven a los de
siempre.

## La vista Iluminancia

![La vista Iluminancia, leyendo la luz en un punto del plano de trabajo](/screenshots/es/illuminance.png)

Elegí **Iluminancia** arriba de la vista, o apretá **3**. Cada superficie
calculada se pinta según la luz que recibe, de azul oscuro (0 lx) a blanco
(2000 lx o más), con la escala abajo a la derecha. El plano de trabajo se ve
a su altura, encima del piso. La vista se recalcula igual que el panel, y
mientras tanto la escala lo dice.

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
- En un ambiente con muchos muebles, mover un mueble tarda unos segundos en
  recalcularse; mover o atenuar una luminaria, mucho menos
  ([Velocidad](./analisis/velocidad)).
