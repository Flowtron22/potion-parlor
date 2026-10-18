# Potion flow

The GPU solver and bloom/sunray passes are adapted from [Pavel Dobryakov's MIT-licensed WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation), pinned to `a2d292931f19d9b3b9f564e23e6c32729d2121c3`. Extracted source and the license live in `public/play/vendor/pavel-fluid/`. No upstream GUI, analytics, pointer handlers or random splats are included.

## Floor pop → soul → flask

A selected floor gem now compresses, expands a small impact ring, and dissolves over the first 16% of its existing 1.1-second collection animation. Its 3D shape briefly remains visible during that pop. Stored spell essence emits light without inventing a physical gem.

The travelling effect uses one shared free velocity/dye field (`soul-field.mjs`), replacing the previous narrow guided jet. A moving emitter follows a rising, curled path to the actual flask neck. A continuous GPU segment splat integrates motion between frames, avoiding both rendered circle particles and repeated full-resolution splats. The dye itself advects and deforms through Pavel's incompressible pressure solver; there is no hard path-width mask. Multiple simultaneous wisps share and interact in that field.

The supplied screenshot's visible settings are declared in `soul-motion.mjs`:

| Setting | Value |
| --- | ---: |
| Simulation resolution | 128 |
| Dye quality | High / 1024 |
| Density dissipation (GUI: diffusion) | 4 |
| Velocity dissipation | 0 |
| Pressure persistence | 0 |
| Vorticity | 0 |
| Splat radius | 0.04 |
| Shading | On |
| Bloom intensity / threshold | 2 / 1 |
| Sunrays weight | 1 |

Pressure 0 clears the previous pressure estimate; it does not disable the incompressibility solve. The wisp has no artificial gravity. Color remains tied to the gem, while high-dynamic-range emission, bloom and sunrays provide the luminous appearance. A display exposure curve keeps the game legible over its green background. The shared high-resolution field avoids allocating a 1024 dye field for each wisp.

At 78% of the animation the head reaches the neck. Only then does delivery progress from 0 to 1. A local sink absorbs dye around the mouth, and residual light fades and clears within 400 ms after the final transfer. The game still completes the gem at the same 1.1-second event boundary, preserving scoring, parallel pouring, recipe rules and server validation.

Flasks keep their original independent masked mixing fields and damped SVG surface waves. Visible bottle silhouettes, colors and small symbols remain unchanged. The overlay's placement follows the real flask geometry, including sway and changes in the spell prompt. Unsupported floating-point GPUs retain a simpler glowing Canvas trail and floor pop.

`data-fluid-build="soul5"` identifies the new effect; versioned module URLs prevent a previous jet renderer from surviving a reload.

## Verification

- `node verify-soul.mjs`: screenshot settings, pop/flight/merge phases, exact neck arrival and no premature delivery.
- `node verify-liquid.mjs`: finite, settling bottle surface waves at 30/60/120 fps.
- `node verify-mastery.mjs`: spell-assisted gameplay and actual game collection integration.
- `npm run build:vercel`: native Next/Vercel build.
- `node scripts/serve-flow-check.mjs`: open `/tests/fixtures/soul-gpu.html` for real GPU pixel readbacks at 15/30/60 fps and a mid-flight preview. It verifies visible light at the travelling head and neck, zero early fill and drained residual light. The original `/tests/fixtures/flow-gpu.html` remains a regression for the legacy guided-transport implementation.

This remains a 2D velocity/dye effect rather than 3D free-surface water. Fill volume is prescribed by the collection event, not measured from fluid mass.
