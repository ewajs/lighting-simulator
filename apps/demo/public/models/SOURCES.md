# Sample fixture models

Simple stand-in models for the demo's IES products (ADR 0043). They are
**not** manufacturer models: `apps/demo/scripts/build-models.js` generates
them from basic shapes at each product's approximate size, so they carry no
third-party rights. In a real integration each client uploads their
manufacturers' models to their backend, and the host's `ModelProvider`
returns them.

To change one, edit the script, run `node apps/demo/scripts/build-models.js`
and commit the output.

| File | Product | Approximate size | Notes |
|---|---|---|---|
| `ies-downlight.glb` | Cooper Portfolio 6" downlight | Ø 190 mm trim | White trim, diffuse lens |
| `ies-wall-washer.glb` | Lightolier Calculite 3" wall washer | Ø 114 mm trim | The kicker covers the half away from the wall it washes (+Z) |
| `ies-track-spot.glb` | iGuzzini Palco track spot | Ø 84 × 150 mm head | `head` turns with the aim |
| `ies-linear-pendant.glb` | Finelite HP-2, 4 ft | 1220 × 60 × 50 mm | Along Z (the IES C0 plane); lit below and above; two `cord` anchors |
| `ies-wall-up-down.glb` | Visa Colonnade up/down sconce | 140 × 320 × 70 mm | Half cylinder; lit through both ends |
