<script setup>
import { data } from '../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../.vitepress/theme/diagrams/plot'

const n = (v, d = 0) => formatNumber(v, 'es-AR', d)
</script>

# Factor de mantenimiento

Una instalación nueva da más luz que la misma instalación unos años después:
los LED pierden flujo de a poco, las luminarias juntan polvo y las paredes y el
techo se ensucian y reflejan menos. Las normas, como la EN 12464-1, piden la luz
que tiene que haber **al final** del ciclo de mantenimiento, antes de limpiar o
reemplazar: la **iluminancia mantenida**, $\bar{E}_m$.

## La fórmula

$$\bar{E}_m = MF \cdot \bar{E}_\text{nueva}$$

El **factor de mantenimiento** (MF) es la parte de la luz que queda: con
MF = 0,8, el diseño cuenta con perder un 20 %. Para cumplir 500 lx mantenidos con
MF = 0,8, la instalación tiene que dar $500 / 0{,}8 = 625$ lx de nueva.

## De qué está hecho

La guía CIE 97:2005 lo descompone en cuatro factores, cada uno la parte que
queda de algo:

$$MF = LLMF \cdot LSF \cdot LMF \cdot RSMF$$

| Factor | Qué mide |
|---|---|
| LLMF | el flujo que conserva la fuente de luz a esa edad |
| LSF | la parte de las fuentes que siguen funcionando; con LED suele tomarse 1 |
| LMF | cuánto pierde la luminaria por suciedad |
| RSMF | cuánto pierden las superficies del ambiente, que reflejan menos al ensuciarse |

Cada uno depende del producto, del ambiente (una oficina limpia o un taller) y
de cada cuánto se limpia. Cuando no se conocen, se usa un valor general: los
informes de DIALux suelen mostrar **0,80**.

## En Lux Studio

El cálculo usa 0,80 por defecto. En el ambiente de ejemplo de
[Uniformidad](./uniformidad), con las downlights repartidas, el promedio sobre
el plano de trabajo es {{ n(data.newAverageLx) }} lx nuevo y
{{ n(data.maintainedAverageLx) }} lx mantenido. Los resultados se comparan con
los valores de las normas, que son mantenidos.
