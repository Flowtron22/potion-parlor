# Potion Parlor

A portrait browser puzzle inspired by the supplied yarn game reference. Uses HTML, CSS, Canvas 2D, and a locally vendored Three.js 0.180.0 renderer. No package installation is required.

## Play

Serve `dist` with any static web server or play the published site. Opening `dist/index.html` directly retains the Canvas game, but browser module restrictions may prevent Three.js from loading. Select a front bottle in a cellar lane. It occupies one of five shelf slots and collects matching gems only when they physically touch the jar floor and the pile has settled. Gems resting on other gems must wait to fall. Bottles hold one to five gems, shown by the numeric capacity marker. Finished bottles leave. Clear every bottle to advance. Five waiting bottles with no available floor match ends the round; undo is available. Falling gems are allowed to settle before a loss is declared.

## Liquid visuals

Three.js renders six enlarged gem geometries with varied sizes and a custom fluid surface shader. Levels contain 28–32 gems, initially with six to eight floor-contact gems. The bottom gems appear brighter than the buried gems. Six SVG bottle silhouettes vary in size and capacity. Narrow overlapping stream particles merge into a thin shaded pour with subtle waves and small splashes; particle radii are normalized during the start and end of the pour to avoid swelling. The stream endpoint follows each bottle's actual mouth as the layout resizes. Bottle contents slosh during impact. The game UI uses icons and numeric counters without explanatory text. This is stylized animation rather than a general fluid physics simulation. WebGL initialization failure or context loss falls back to Canvas; pixel ratio and particle counts are capped for mobile devices. Three.js and its MIT license are included under `dist/vendor`.

Each generated level has a verified physical solution. Generation settles a real physics world, derives bottle demands from a floor-contact removal sequence, and replays the sequence in a freshly rebuilt world before accepting it. The resulting bottle order is interleaved into four lanes; only three bottle previews per lane are displayed. Invalid arrangements are regenerated, and recent levels are cached for quick restarts. Other choices may block progress. Colors also have distinct symbols. Sound is opt-in. Level progression is stored locally when available.

## Performance

Browser builds generate and validate levels in `level-worker.js`, keeping the main thread responsive during loading. Recent levels are cached, including restarts. A synchronous fallback supports direct-file and non-Worker environments.

Settled worlds skip engine updates. Gem drawing interpolates between fixed physics steps to avoid uneven motion on displays with different refresh rates. The Three.js liquid surface is hidden while idle and restricted to the active pour's bounding rectangle while flowing. Idle scenes stop redrawing; bottle and queue DOM nodes are retained and only changed when needed. Bottle motion uses cached layout measurements rather than reading layout after every style update, and the WebGL drawing buffer is resized only when its dimensions change.

For nonvisual QA timings, append `?profile` and inspect the document element's data attributes. Normal sessions do not collect frame samples. Run `node verify-performance.cjs` for idle-work and Worker-entrypoint checks; run `POTION_CHECK_LEVELS=5 node verify.cjs` (set the environment variable using your shell's syntax) for a shorter gameplay regression run. Larger runs default to 50 physical winning routes.

## Gem physics and tactile controls

Matter.js 0.20.0 drives positions, rotation, and collection eligibility in a bounded 2D rigid-body world; Three.js renders the gems at those coordinates. Collider polygons follow each gem's silhouette, mass comes from area and density, and round gems have lower friction and more bounce. A fixed 120 Hz simulation, capped catch-up, damping, and sleeping keep the pile calm and consistent across frame rates. Removing a gem wakes the remaining bodies, so unsupported gems drop and collide rather than slide to predefined positions. The diamond counter gently shakes the jar. Free dragging is disabled in this challenge so it cannot bypass the floor-only rule. Neither color matching nor the former logical columns can make a buried gem collectible.

Bottles use damped spring wobble on placement and filling, with counter-moving liquid. Contact shadows and fading collision glints add impact feedback. Undo restores positions, angles, velocities, and pending pours as well as puzzle state. Matter.js and its MIT license are included under `dist/vendor`. Run `node verify.cjs` for puzzle checks and `node verify-physics.cjs` for physics checks.

This is an interpretation of the screenshot, not a claim about the exact rules of the original game.
