# Potion Parlor

A portrait browser puzzle inspired by the supplied yarn game reference. Uses HTML, CSS, Canvas 2D, and a locally vendored Three.js 0.180.0 renderer. No package installation is required.

## Play

Serve `dist` with any static web server or play the published site. Opening `dist/index.html` directly retains the Canvas game, but browser module restrictions may prevent Three.js from loading. Select a front bottle in a cellar lane. It occupies one of five shelf slots and automatically collects exposed matching gems. Bottles hold two to five gems, shown by the small numeric capacity marker. Finished bottles leave. Clear every bottle to advance. Five waiting bottles with no accessible match ends the round; undo is available.

## Liquid visuals

Three.js renders six gem geometries with varied sizes and a custom fluid surface shader. Levels contain different gem counts and ten to fourteen bottles. Six SVG bottle silhouettes vary in size and capacity. Narrow overlapping stream particles merge into a thin shaded pour with subtle waves and small splashes; particle radii are normalized during the start and end of the pour to avoid swelling. The stream endpoint follows each bottle's actual mouth as the layout resizes. Bottle contents slosh during impact. The game UI uses icons and numeric counters without explanatory text. This is stylized animation rather than a general fluid physics simulation. WebGL initialization failure or context loss falls back to Canvas; pixel ratio and particle counts are capped for mobile devices. Three.js and its MIT license are included under `dist/vendor`.

Each generated level has a verified solution: its reservoir is constructed in batches, then the reversed batch order is interleaved into the four bottle lanes and simulated against the actual collection policy. Invalid arrangements are regenerated. Other choices may block progress. Colors also have distinct symbols. Sound is opt-in. Level progression is stored locally when available.

This is an interpretation of the screenshot, not a claim about the exact rules of the original game.
