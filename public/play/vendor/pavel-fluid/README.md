# WebGL Fluid Simulation shaders

Copyright (c) 2017 Pavel Dobryakov. Used under the MIT license in LICENSE.

Source: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
Pinned revision: a2d292931f19d9b3b9f564e23e6c32729d2121c3

The seven GPU solver shaders are extracted from script.js. Potion Parlor adapts them in ../../pavel-fluid.mjs to Three.js render targets, bounded game-controlled injection, vessel masks and pouring forces. No upstream GUI, analytics, input handlers or automatic random splats are included. This is a 2D velocity/dye solver, not a 3D free-surface water simulation.

The six original bloom, sunray and blur post-processing shader passes are extracted into post.mjs at the same pinned revision. Soul wisps use them through ../../soul-field.mjs. The production travelling effect is now a shared free-moving field; the legacy guided transport remains only for regression coverage.
