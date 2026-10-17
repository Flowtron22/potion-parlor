# Potion flow

The fluid engine is adapted from [Pavel Dobryakov's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation), pinned to commit `a2d292931f19d9b3b9f564e23e6c32729d2121c3`. The original seven GLSL solver passes are retained in `public/play/vendor/pavel-fluid/shaders.mjs`, with the full MIT license beside them. This replaces the previous CPU particle jet; it is not an iframe or a visual imitation of the demo.

`public/play/pavel-fluid.mjs` runs velocity/dye advection, curl, vorticity confinement, divergence, pressure relaxation and pressure-gradient subtraction using floating-point Three.js render targets. Game-controlled inlets and a gentle guiding force deliver each colored pour to its flask. Vessel masks add no-flow walls and a moving fill boundary to the upstream solver. The display shades the actual advected dye field.

`public/play/fluid.js` owns pooled stream fields and a smaller independent mixing field for each active flask. Vessel masks come from the displayed SVG shape, so differently sized bottles retain their silhouettes. Later recipe ingredients enter the existing field and mix with previous pigments. The SVG surface retains damped impact ripples, and its fill progression stays tied to the game animation. Gem collection, recipe order and server score validation are unaffected.

The reference is a 2D incompressible velocity/dye effect. The adaptation is also 2D; it does not simulate 3D free-surface water or measure conserved fluid volume. The amount added to a flask is prescribed by the existing pour event. There are no individual rendered fluid particles.

The shader programs are prewarmed; velocity grids are 96×128 for streams and 48×64 for vessels, with higher-resolution dye. Render targets are reused for subsequent pours. Mixing continues briefly after an impact, then rendering stops when the rest of the game is idle. A GPU without renderable floating-point buffers retains the existing Canvas fallback. No upstream GUI, pointer listeners, promotional UI, analytics or random splats are included.

Verify the SVG wave response with `node verify-liquid.mjs`, compile with `npm run build:vercel`, and inspect the real GPU effect in a browser. `?profile` exposes frame timings and `data-fluid-engine="pavel-dobryakov"` on the document element. Browser QA should include overlapping pours, two-color recipes, switching levels during a pour, and idle render suspension.
