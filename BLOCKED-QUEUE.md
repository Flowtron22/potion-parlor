# Blocked flask rules

The reservoir still exposes only 6–8 gems on the actual floor. Every level now has six gem colors. Levels 1–5 have three active shelf spaces; levels 6–30 have two.

Flasks form a staggered dependency board. Each flask has zero, one or two blockers above it. Taking it from the board unlocks its children immediately. A flask with two blockers stays locked until both are taken. Neighboring blocked colors are visible for planning; deeper flasks stay concealed. Decorative masonry occupies the gaps.

The scheduler reserves one floor gem for every matching, unoccupied bottle in the same frame. It removes all reserved gems before advancing physics. Another settled floor may feed an idle bottle while other streams remain active. Each bottle has at most one incoming stream, preventing overfill and double claims. A 280 ms placement window groups quick choices; liquid remains visible for 1.1 seconds. Each stream has an independent bounded Three.js material and particle buffer.

Two simultaneous incoming streams immediately trigger COMBO; three trigger WOMBO. Multipliers rise up to ×8 and remain prominent beside the score. A large central banner lasts 2.6 seconds. Overlapping streams count too, including when their starts are slightly offset.

The new blocked-v2 leaderboard is separate from classic-v1 scores. Old records remain stored. The server verifies flask blockers, distinct gem inventory, pending bottle ownership, finishes and points. Physics can produce slightly different contact order across JavaScript runtimes, so replay accepts equivalent same-color bodies and the causal floor cascade within one submitted batch. A color must reach the simulated floor as that batch resolves. Unfinished reservations, blocked colors, blocked choices, overfills and forged finishes cannot rank. This is a casual leaderboard, not a competitive anti-bot system.

Validation includes all 30 canonical winning routes, a three-stream browser-code simulation, server score parity, duplicate-gem rejection, conservation, and random-play probes. A separate 144-run probe across six levels won 22 times (15%). This is a stress test of an indiscriminate bot, not a prediction of human win rates.

Build with the existing build script. To regenerate the level catalog, run `node scripts/block-catalog.mjs` before building; it uses the retained physical seed fixtures, checks routes, and rejects queue variants with excessively forgiving random-play probes. Public JSON boards are copied from that exact catalog during build.
