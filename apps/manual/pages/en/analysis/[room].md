<script setup>
import { useData, withBase } from 'vitepress'
import LxRoomPlan from '../../../.vitepress/theme/components/analysis/LxRoomPlan.vue'
import LxRoomStats from '../../../.vitepress/theme/components/analysis/LxRoomStats.vue'
import LxRoomSteps from '../../../.vitepress/theme/components/analysis/LxRoomSteps.vue'
import LxScatter from '../../../.vitepress/theme/components/analysis/LxScatter.vue'
import LxSurfaceMaps from '../../../.vitepress/theme/components/analysis/LxSurfaceMaps.vue'
import LxSurfaceTable from '../../../.vitepress/theme/components/analysis/LxSurfaceTable.vue'
import { ROOM_NOTES, ROOMS } from '../../../.vitepress/theme/analysis/names'

const { params } = useData()
const page = params.value.page
const room = ROOMS[page.summary.name].en
const note = ROOM_NOTES[page.summary.name].en
const m = (v) => v.toLocaleString('en')
const size = page.comparison.room.room
const rho = page.summary.reflectances
</script>

# {{ room.name }}

{{ room.about }}

<LxRoomStats :page="page" />

{{ note }}

<figure class="lx-room-picture">
  <img :src="withBase(`/analysis/${page.summary.name}.png`)" :alt="room.name" width="676" height="724" loading="lazy" />
  <figcaption>The room in Lux Studio, with the demo's products and furniture.</figcaption>
</figure>

<LxRoomPlan :page="page">
  Seen from above: {{ m(size.width) }} × {{ m(size.depth) }} m, and {{ m(size.height) }} m high. Furniture as the boxes the calculation uses. Reflectances: floor {{ m(rho.floor) }}, walls {{ m(rho.walls) }} and ceiling {{ m(rho.ceiling) }}, all diffuse.
</LxRoomPlan>

## Surface by surface

Each measured surface, its average in Radiance and in Lux Studio, and the
worst difference at a point. For total light, direct light or, in a room with
furniture, total light without the furniture in both programs.

<LxSurfaceTable :page="page" />

## Point by point

The maps show the light at each point of the grid. The one below shows the
difference: blue where Lux Studio gives less than Radiance, red where it gives
more. **Step** shows what each feature of the calculation changes
([Feature by feature](./feature-by-feature)). Hover over a map to read its
values.

<LxSurfaceMaps :page="page" />

## Every point

Every point, Lux Studio against Radiance: on the diagonal, they agree.

<LxScatter :page="page" />

## Feature by feature

What each feature of the calculation adds in this room, and how long it takes.

<LxRoomSteps :page="page">
  The difference with Radiance's total light. Times on an {{ page.machine }}, on one thread (see Speed).
</LxRoomSteps>
