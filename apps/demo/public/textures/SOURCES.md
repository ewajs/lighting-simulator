# Sample surface textures

Photos of real materials for the demo's room surfaces (ADR 0050), from
[ambientCG](https://ambientcg.com). All ambientCG assets are released under
[CC0 1.0 Universal](https://ambientcg.com/license): free to use, change and
redistribute, also commercially, with no credit required. We credit them
here anyway.

Only the colour maps are used, at 1024 px, re-encoded as JPEG (quality 82,
metadata stripped). Each `-thumb.jpg` is a 96 px swatch cut from its image.
In a real integration the host's `TextureProvider` returns its own photos,
e.g. a flooring catalogue's.

| File | ambientCG asset | Covers (from ambientCG) | Typical ρ used |
|---|---|---|---|
| `oak-planks.jpg` | [WoodFloor051](https://ambientcg.com/view?id=WoodFloor051) | 1.8 × 1.8 m | 0.30 |
| `stone-tiles.jpg` | [Tiles141](https://ambientcg.com/view?id=Tiles141) | 2 × 2 m | 0.50 |
| `white-tiles.jpg` | [Tiles107](https://ambientcg.com/view?id=Tiles107) | 1 × 1 m | 0.75 |
| `concrete.jpg` | [Concrete034](https://ambientcg.com/view?id=Concrete034) | 1.1 × 0.55 m | 0.40 |
| `plaster.jpg` | [Plaster001](https://ambientcg.com/view?id=Plaster001) | 2 × 2 m (not stated; chosen) | 0.75 |
| `red-brick.jpg` | [Bricks085](https://ambientcg.com/view?id=Bricks085) | 2.4 × 1.2 m | 0.25 |

The renderer scales each photo so its average brightness equals the
surface's reflectance, so how bright the photo was taken doesn't matter.
