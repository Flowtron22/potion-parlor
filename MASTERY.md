# Titles, Mana and spells

Titles use permanent Mastery XP. Mana Points (MP) are a separate, spendable wallet; spending never reduces XP. Everything is saved locally under the migrated `potion-mastery-v1` storage key (schema 2). Existing XP and completed-board records are preserved. There is no cross-device title or wallet sync.

| Title | XP | Distinct board wins | Unassisted milestone | Base Mana / first clear |
| --- | ---: | ---: | --- | ---: |
| Squire | 0 | 0 | — | 20 |
| Apprentice | 400 | 4 | — | 24 |
| Alchemist | 1,400 | 10 | — | 28 |
| Wizard | 3,600 | 20 | Level 11 | 32 |
| Archwizard | 7,500 | 35 | Level 16 | 36 |
| Grand Archwizard | 12,000 | 55 | Level 25 | 40 |

Every new clear earns at least 100 XP, including assisted clears. Thus four new wins always unlock Apprentice; high-scoring first wins cannot bypass the four-win requirement. Clear reward: `100 + 5 × level`, plus `10 × medal + 5 × best combo` if unassisted; Daily adds 20 XP. First clear Mana: tier base + `2 × floor(level/5)` + 5 for Daily. Promotions grant `25 + 10 × new tier index` Mana and a free Dispel.

New players receive 50 Mana and one free Dispel. Dispel costs 35 Mana (or consumes a free charge first). Chromatic Sweep costs 100 Mana. At most two spells may be cast per run. Canceling or missing a gem costs nothing. Restart and undo never refund the wallet or run's spell count. Mana is capped at 1,500; free charges at 20.

Failed attempts award a per-board high-water mark: 3 XP per newly brewed bottle, capped at 60, and one Mana per two bottles, capped at 10. A later win subtracts prior partial rewards from its payout. Repeating a clear does not add wins or Mana; improved medals/combos grant only the XP improvement. Daily progress is keyed to the run's starting UTC date and board. Legacy first clears retain their XP/win credit but cannot be replayed for new Mana payouts.

Spells dissolve gems into stored essence, preserving all potion supply. Essence automatically pours into matching bottles before ordinary floor gems; ordered recipe requirements still apply. Sweep removes only the selected color remaining in the jar, including buried gems. Physical gems fall normally afterward. Spell runs are clearly marked assisted, earn titles and Mana, and cannot submit to the shared competitive leaderboard. Unassisted scoring and puzzle layouts are unchanged. Brew combo announcements now use Double Bubble, Triple Trouble, Brewstorm, Cauldron Chaos, Arcane Overload, Potion Pandemonium and Magnum Opus.

Verify with `node verify-mastery.mjs` and `node verify-blocked.mjs`. These cover economy replay/partial reward protections, migration, spend persistence, the four-win gate, spell limits and cancellation, no undo refunds, essence conservation, a completed spell-assisted board, ranked rejection, all 30 original solutions and ordinary browser/server score parity.
