# Personal titles

Journey and Daily wins now contribute to one local mastery profile (`potion-mastery-v1`). This cosmetic progression never changes competitive scores, puzzle rules, or leaderboard eligibility. Titles are saved on the current browser/device; there is no account or cross-device title sync.

| Title | Mastery | Highest level cleared without undo |
| --- | ---: | ---: |
| Squire | 0 | — |
| Apprentice | 200 | 1 |
| Alchemist | 1,200 | 5 |
| Wizard | 3,000 | 11 |
| Archwizard | 6,000 | 16 |
| Grand Archwizard | 10,000 | 25 |

A win earns `100 + 12 × level + 25 × medal + 15 × best cascade`, with 60 extra mastery for a Daily clear. Undo-assisted wins earn half, rounded, and do not satisfy the level milestones. Offline clears still count; mastery is personal, not a verified leaderboard claim.

Each Journey board stores only its best mastery reward. Replays award the difference when improved. Daily rewards are keyed to the run's starting UTC date and board; each new day provides another reward. A loss gives no mastery and never removes titles. Existing Journey position, medals and scores are preserved; legacy medals do not retroactively grant mastery.

The title button opens all milestones and remaining requirements. Results address the player by title, show earned mastery, and celebrate promotions. The ladder meter reflects both mastery and the next level milestone. Failed browser storage falls back to session memory with an explicit notice.

Verify with `node verify-mastery.mjs`; this covers progression gates, replay farming, daily rewards, improved cascades, undo limits, persistence, unavailable storage, and the real game's result path.
