<script setup>
import { data } from '../../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../../.vitepress/theme/diagrams/plot'

const n = (v, d = 0) => formatNumber(v, 'en', d)
</script>

# Maintenance factor

A new installation gives more light than the same installation a few years
on: LEDs slowly lose flux, luminaires gather dust, and walls and ceilings get
dirtier and reflect less. Standards such as EN 12464-1 ask for the light there
must be **at the end** of the maintenance cycle, before cleaning or
replacing: the **maintained illuminance**, $\bar{E}_m$.

## The formula

$$\bar{E}_m = MF \cdot \bar{E}_\text{new}$$

The **maintenance factor** (MF) is the share of light that remains: with
MF = 0.8, the design allows for losing 20 %. To meet 500 lx maintained with
MF = 0.8, the installation must give $500 / 0.8 = 625$ lx when new.

## What it's made of

The CIE 97:2005 guide splits it into four factors, each the share of
something that remains:

$$MF = LLMF \cdot LSF \cdot LMF \cdot RSMF$$

| Factor | What it measures |
|---|---|
| LLMF | the flux the light source keeps at that age |
| LSF | the share of sources still working; usually taken as 1 for LEDs |
| LMF | how much the luminaire loses to dirt |
| RSMF | how much the room's surfaces lose, reflecting less as they get dirty |

Each depends on the product, the room (a clean office or a workshop) and how
often it's cleaned. When they aren't known, a general value is used: DIALux
reports commonly show **0.80**.

## In Lux Studio

The calculation uses 0.80 by default. In the example room of
[Uniformity](./uniformity), with the downlights spread out, the work plane's
average is {{ n(data.newAverageLx) }} lx new and
{{ n(data.maintainedAverageLx) }} lx maintained. Results are compared with
the standards' values, which are maintained.
