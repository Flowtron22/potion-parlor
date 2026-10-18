# Potionpendium review and fixes

| Finding | Change | Verification |
| --- | --- | --- |
| Casting a spell permanently hid score submission and prevented subsequent verified level checkpoints. | Dispel, Sweep and seeded Shuffle remain eligible. Server replay verifies spell targets, repeat casting within a bounded replay limit, conserved essence, and score calculation. | `verify-spell-rescue.mjs`: defeat → skip saving → spell → defeat → submit; rescued wins can carry verified points onward. |
| Saving at an earlier defeat consumed the ticket, so rescuing an already-saved run broke later submissions and continuation. | Defeat saves update one score row per run, preserve its best total, and leave the ticket resumable. Only advancing consumes the parent ticket. | Both save-before-rescue and skip-save cases pass; repeat saves produce one row; consumed parent tickets reject updates. |
| An old submission response could update a newer board's modal or overwrite its ticket. | Capture the ticket locally and ignore results if the board or event log changed. | `verify-submit-race.mjs`. |
| Gem picking used 2D physics ordering, which can disagree with the foreground of overlapping 3D gems. | Single-gem targeting now raycasts the visible gem meshes. Sweep also offers explicit color/count buttons. | Browser tap on a visible Rose gem removed Rose; Sweep Mint removed all 11 Mint meshes. |
| Sweep provided little visual confirmation, and the footer counted stored essence as if it were still in the jar. | Remove old gem meshes immediately, display a short burst, name/count stored essence, and count only physical jar gems in the footer. | Rendered gem count 32 → 21; Mint essence count 11; Dispel then reduced rendered count to 20. |
| The share image used different typography and text arrangement from the header. | Use Outfit 600 above DM Sans 500, beside the potion icon. Fonts are self-hosted with OFL licenses; the image uses the same font sources. | Rendered share-v3 artwork visually checked; WOFF2 assets load locally. |
| API smoke checks still expected pre-defeat-only scoring behavior. | Update checks for defeat submissions, idempotent saves and current Daily ruleset. | `verify-api.mjs` against isolated local SQLite-backed HTTP preview. |

All 30 canonical winning solutions still pass server validation. The link crawl passed 34 linked local page/style/script/worker/module assets, all 30 board paths, the share image, and both web fonts. Mastery/economy, combo cleanup, and Vercel proxy regressions also pass. Production builds pass.

Undo, jar shake and remixed restarts retain their existing practice eligibility rules. Mastery XP and Mana remain device-local. No user saves or leaderboard records were deleted.

## Repeat spells and shorter opening (2026-10-18)

Fixed the hidden two-spell cap that disabled Shuffle despite sufficient MP, including after Undo. Affordability and settled physics still gate casting; Undo never refunds Mana. The shared replay validator accepts repeated casts with a bounded 256-event abuse guard. Regression reproduces a 234-Mana wallet across four Shuffles, Undo, another Shuffle, and insufficient-funds rejection, plus a multi-spell verified win.

Journey now has two warm-up boards. Level 3 introduces four colors and joined queue locks; mixed recipes start at level 5 and two shelf slots at level 9. All 30 layouts retain verified winning routes under survival-v7. Progression save data is unchanged. Defeat uses a separate dark theme, cracked, tipping flask and spill animation, fading embers and reduced-motion support; Restart receives initial focus.

## Visible Sweep supply (2026-10-18)

Sweep and Dispel preserve exact gem value as essence; deleting this supply would make later recipes impossible. The reservoir now sits between jar and shelf, inside the fluid overlay's bounds. Colored vial chips show saved charges, retaining in-flight charges until delivery. Each stored dose launches a visible wisp from its actual chip center to the flask mouth, independent of GPU dye visibility, and is cleaned up on completion, Undo and Restart. No score or recipe rules change.

Checks: verify-essence.mjs covers an all-gems Sweep, exact dose conservation, per-dose reservoir countdown, source location, visible flight, mouth arrival and cleanup; verify-spell-rescue.mjs and verify-mastery.mjs cover spell continuation, scoring parity and wallet persistence. Browser QA: Sweep Mint 11, first bottle reduces reservoir to 9, second to 7; visible essence flight is present and console has no errors. Native Vercel build passes.

## Round cauldron and shelf essence (2026-10-18)

Replaced the rectangular chamber with a true curved collision bowl, narrower mouth and round belly. Browser physics, deterministic server replay, seed generation and spell/restart placement share the curved world. Regenerated all 30 canonical boards under survival-v8 while preserving the two-board warm-up and later planning curve. Existing Mastery, wins and MP saves are unchanged. A curved-wall stack fixture replaces the old flat-floor test stack.

Saved essence moves into the unused shelf columns, spanning two cells with three active flasks or three with two. Its source coordinates and delivery animation follow the moved reservoir. The reservoir does not add playable flask capacity. Verified 6–8 initial contacts, all 30 solutions and remixes, 840 contained removals without stranded ingredients, score parity, repeat spells and submission recovery. Browser QA confirms Sweep 10 Mint charges and a visible pour from the right-hand shelf.
