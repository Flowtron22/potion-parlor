# Potionpendium review and fixes

| Finding | Change | Verification |
| --- | --- | --- |
| Casting a spell permanently hid score submission and prevented subsequent verified level checkpoints. | Dispel, Sweep and seeded Shuffle remain eligible. Server replay verifies spell targets, a maximum of two spells per board, conserved essence, and score calculation. | `verify-spell-rescue.mjs`: defeat → skip saving → spell → defeat → submit; rescued wins can carry verified points onward. |
| Saving at an earlier defeat consumed the ticket, so rescuing an already-saved run broke later submissions and continuation. | Defeat saves update one score row per run, preserve its best total, and leave the ticket resumable. Only advancing consumes the parent ticket. | Both save-before-rescue and skip-save cases pass; repeat saves produce one row; consumed parent tickets reject updates. |
| An old submission response could update a newer board's modal or overwrite its ticket. | Capture the ticket locally and ignore results if the board or event log changed. | `verify-submit-race.mjs`. |
| Gem picking used 2D physics ordering, which can disagree with the foreground of overlapping 3D gems. | Single-gem targeting now raycasts the visible gem meshes. Sweep also offers explicit color/count buttons. | Browser tap on a visible Rose gem removed Rose; Sweep Mint removed all 11 Mint meshes. |
| Sweep provided little visual confirmation, and the footer counted stored essence as if it were still in the jar. | Remove old gem meshes immediately, display a short burst, name/count stored essence, and count only physical jar gems in the footer. | Rendered gem count 32 → 21; Mint essence count 11; Dispel then reduced rendered count to 20. |
| The share image used different typography and text arrangement from the header. | Use Outfit 600 above DM Sans 500, beside the potion icon. Fonts are self-hosted with OFL licenses; the image uses the same font sources. | Rendered share-v3 artwork visually checked; WOFF2 assets load locally. |
| API smoke checks still expected pre-defeat-only scoring behavior. | Update checks for defeat submissions, idempotent saves and current Daily ruleset. | `verify-api.mjs` against isolated local SQLite-backed HTTP preview. |

All 30 canonical winning solutions still pass server validation. The link crawl passed 34 linked local page/style/script/worker/module assets, all 30 board paths, the share image, and both web fonts. Mastery/economy, combo cleanup, and Vercel proxy regressions also pass. Production builds pass.

Undo, jar shake and remixed restarts retain their existing practice eligibility rules. Mastery XP and Mana remain device-local. No user saves or leaderboard records were deleted.
