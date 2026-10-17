<script setup>
import LxUnits from '../../.vitepress/theme/components/LxUnits.vue'
</script>

# Luz y unidades

Para hablar de iluminación hacen falta tres preguntas, y cada una tiene su
unidad:

1. ¿Cuánta luz sale de la luminaria? **Flujo luminoso**, en lúmenes (lm).
2. ¿Cuánta sale hacia un lado? **Intensidad luminosa**, en candelas (cd).
3. ¿Cuánta llega a una superficie? **Iluminancia**, en lux (lx).

<LxUnits
  :labels="['Flujo: los lúmenes que salen', 'Intensidad: candelas en una dirección', 'Iluminancia: lux sobre la superficie']"
  caption="Una luminaria de techo: el cono es todo su flujo; la flecha, una dirección; la mancha, una superficie donde llega la luz."
/>

## Flujo luminoso: lúmenes

Es toda la luz que emite una fuente, en todas las direcciones. La downlight de
6" de la demo emite **1153 lm**. Una lámpara incandescente de 60 W daba unos
800 lm.

Dividido por la potencia eléctrica da la **eficacia**: cuánta luz da cada watt.
Esa downlight consume 15,8 W:

$$\frac{1153\ \text{lm}}{15{,}8\ \text{W}} = 73\ \text{lm/W}$$

## Intensidad luminosa: candelas

Una luminaria no reparte su luz por igual: una downlight manda mucha hacia
abajo y casi nada hacia los costados. La intensidad dice **cuánta luz sale en
una dirección**: el flujo por unidad de **ángulo sólido**, la porción del
espacio que abarca un cono, medida en estereorradianes (sr).

$$I = \frac{\Phi}{\Omega} \qquad \text{(cd = lm/sr)}$$

Una esfera entera abarca $4\pi \approx 12{,}57$ sr. Un cono de semiángulo
$\alpha$ abarca $\Omega = 2\pi(1 - \cos\alpha)$.

**Ejemplo.** 1000 lm repartidos por igual en todas las direcciones dan
$1000 / 4\pi = 79{,}6$ cd. Los mismos 1000 lm concentrados en un haz de 60°
($\alpha = 30°$): $\Omega = 2\pi(1 - \cos 30°) = 0{,}842$ sr, y
$1000 / 0{,}842 = 1188$ cd. Misma luz, quince veces más intensa hacia donde
apunta.

La intensidad en cada dirección es lo que mide un archivo IES: lo ves en
[Archivos IES y curvas polares](./curvas-polares).

## Iluminancia: lux

Es la luz que **llega** a una superficie, por metro cuadrado. Es lo que mide un
luxómetro y lo que piden las normas: 500 lx sobre un escritorio, por ejemplo.

$$E = \frac{\Phi}{A} \qquad \text{(lx = lm/m²)}$$

**Ejemplo.** 1000 lm repartidos parejos sobre una mesa de 2 m² dan
$1000 / 2 = 500$ lx.

En la práctica la luz nunca llega pareja: depende de la distancia y del ángulo,
como ves en [Distancia y ángulo](./distancia-y-angulo).

## Luminancia

Lo que el ojo percibe como brillo de una superficie es su **luminancia**, en
candelas por metro cuadrado (cd/m²). Depende de cuánta luz recibe y de cuánta
devuelve (su reflectancia). Lux Studio la muestra en la imagen, pero sus
números son de iluminancia.

## En resumen

| Magnitud | Pregunta | Unidad | Símbolo |
|---|---|---|---|
| Flujo luminoso | ¿Cuánta luz sale? | lumen (lm) | $\Phi$ |
| Intensidad luminosa | ¿Cuánta hacia esa dirección? | candela (cd = lm/sr) | $I$ |
| Iluminancia | ¿Cuánta llega a la superficie? | lux (lx = lm/m²) | $E$ |
| Luminancia | ¿Qué tan brillante se ve? | cd/m² | $L$ |
