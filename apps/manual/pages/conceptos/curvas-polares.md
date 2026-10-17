<script setup>
import LxPolar from '../../.vitepress/theme/components/LxPolar.vue'
import { data } from '../../.vitepress/theme/diagrams/light.data'

const chart = (key) => data.polar.find((c) => c.key === key)
const planes = ['Plano C0–C180', 'Plano C90–C270', 'Haz', 'Anillos cada']
</script>

# Archivos IES y curvas polares

Un **archivo IES** guarda cómo reparte la luz una luminaria: su intensidad, en
candelas, en cientos de direcciones. Lo mide un laboratorio con un
goniofotómetro, que gira la luminaria y la mide desde todos los ángulos. El
formato es el estándar norteamericano IES LM-63; Lux Studio lo lee en todas sus
ediciones.

## Cómo describe las direcciones

Las mediciones de interiores usan la **fotometría tipo C**: imaginá la
luminaria colgando, apuntando al piso.

- El **ángulo vertical** (γ) va de 0°, justo abajo, a 180°, justo arriba. 90°
  es el horizonte.
- El **ángulo horizontal** (C) gira alrededor del eje vertical, de 0° a 360°.
  El plano C0 corre a lo largo de la luminaria; C90, a lo ancho.

Muchas luminarias son simétricas, y el archivo guarda solo una parte: una
downlight redonda es igual en todas las direcciones horizontales, así que basta
un plano. Lux Studio completa el resto según la simetría que declara el archivo,
e interpola en línea recta entre los ángulos medidos.

## Cómo leer una curva polar

La curva polar es el dibujo clásico de un informe fotométrico. La luminaria
está en el centro; cada punto de la curva está a una **distancia del centro
proporcional a la intensidad** en esa dirección. Abajo es 0° (hacia el piso),
arriba 180° (hacia el techo).

Se dibujan dos planos: C0–C180 (línea llena) y C90–C270 (punteada). Si
coinciden, la luminaria reparte igual en todas las direcciones horizontales.

El **ángulo de haz** es el ancho del cono donde la intensidad sigue por encima
de la **mitad** de su máximo. Las líneas de puntos lo marcan. En una luminaria
que manda luz casi hacia todos lados no dice nada, y no se dibuja.

Estas son las cinco luminarias reales de la demo, dibujadas con los mismos
números que usa Lux Studio:

<div class="lx-pair">
<LxPolar :chart="chart('downlight')" :labels="planes" caption="Downlight de 6 pulgadas (Cooper): un cono ancho y parejo hacia abajo." />
<LxPolar :chart="chart('trackSpot')" :labels="planes" caption="Spot de riel (iGuzzini Palco): un haz angosto y muy intenso." />
</div>

<div class="lx-pair">
<LxPolar :chart="chart('linearPendant')" :labels="planes" caption="Colgante lineal (Finelite HP-2): luz hacia abajo y hacia el techo." />
<LxPolar :chart="chart('wallWasher')" :labels="planes" caption="Bañador de pared (Lightolier): se inclina hacia un lado, el de la pared." />
</div>

<LxPolar :chart="chart('wallUpDown')" :labels="planes" caption="Aplique de pared con luz arriba y abajo (Visa Colonnade): poca luz hacia la pared que tiene detrás." />

## Lo que el archivo no dice

Un archivo IES describe la luz **vista desde lejos**: como si toda saliera de un
punto. Cerca de una luminaria grande eso deja de ser cierto. El archivo también
anota el tamaño de la abertura que emite la luz, y Lux Studio lo usa para
dividirla en celdas, como ves en [Distancia y ángulo](./distancia-y-angulo).

Para cargar tus propios archivos, mirá [Tus archivos IES](../archivos-ies).
