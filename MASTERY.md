# Titles, Mana and spells

Titles use permanent Mastery XP. Mana Points (MP) are a separate, spendable wallet; spending never reduces XP. Everything is saved locally under the migrated `potion-mastery-v1` storage key (schema 2). Existing XP and completed-board records are preserved. There is no cross-device title or wallet sync.

| Title | XP | Distinct board wins | Unassisted milestone | Base Mana / first clear |
| --- | ---: | ---: | --- | ---: |
| Squire | 0 | 0 | — | 20 |
| Apprentice | 400 | 4 | — | 24 |
| Herbalist | 900 | 8 | — | 28 |
| Potion Brewer | 1,500 | 12 | — | 32 |
| Alchemist | 2,600 | 16 | Level 13 | 36 |
| Rune Caster | 4,000 | 22 | Level 16 | 40 |
| Mage | 6,000 | 30 | Level 20 | 44 |
| Archmage | 9,000 | 40 | Level 25 | 48 |
| Oracle | 13,000 | 55 | Level 30 | 52 |
| Arcane Sage | 18,000 | 75 | Level 30 | 56 |
| Immortal Alchemist | 26,000 | 100 | Level 30 | 60 |

Every new clear earns at least 100 XP, including assisted clears. Thus four new wins always unlock Apprentice; high-scoring first wins cannot bypass the four-win requirement. Clear reward: `100 + 5 × level`, plus `10 × medal + 5 × best combo` if unassisted; Daily adds 20 XP. First clear Mana: tier base + `2 × floor(level/5)` + 5 for Daily. Promotions grant `25 + 10 × new tier index` Mana and a free Dispel.

New players receive 50 Mana and one free Dispel. Dispel costs 35 Mana (or consumes a free charge first). Chromatic Sweep costs 100 Mana. At most two spells may be cast per run. Canceling or missing a gem costs nothing. Undo never refunds Mana or the used spell allowance. Restart starts a new run with a fresh two-spell allowance, but never refunds spent Mana. Mana is capped at 1,500; free charges at 20.

Failed attempts award a per-board high-water mark: 3 XP per newly brewed bottle, capped at 60, and one Mana per two bottles, capped at 10. A later win subtracts prior partial rewards from its payout. Repeating a clear does not add wins or Mana; improved medals/combos grant only the XP improvement. Daily progress is keyed to the run's starting UTC date and board. Legacy first clears retain their XP/win credit but cannot be replayed for new Mana payouts.

Spells dissolve gems into stored essence, preserving all potion supply. Essence automatically pours into matching bottles before ordinary floor gems; ordered recipe requirements still apply. Sweep removes only the selected color remaining in the jar, including buried gems. Physical gems fall normally afterward. Spell runs are labeled Ranked · spells, earn titles and Mana, and can submit server-verified scores on defeat. The server enforces two spells per board, verifies dissolution/essence supply, and replays seeded Shuffle placement. Undo, shake, and remixed restarts remain practice. Puzzle difficulty now ramps through the first twelve Journey levels; scoring formulas are unchanged. Brew combo announcements now use Double Bubble, Triple Trouble, Brewstorm, Cauldron Chaos, Arcane Overload, Potion Pandemonium and Magnum Opus.

Verify with `node verify-mastery.mjs` and `node verify-blocked.mjs`. These cover economy replay/partial reward protections, migration, spend persistence, the four-win gate, spell limits and cancellation, no undo refunds, essence conservation, a completed spell-assisted board, verified spell scores, all 30 original solutions and ordinary browser/server score parity.

Shuffle costs 15 Mana and shares the two-spell allowance. It tumbles the current gems without changing their identities, colors, bottles, fills or stored essence. Defeat results offer affordable spells, Restart and Undo, without explanatory paragraphs. Promotions display a brief rune, ring and star animation with reduced-motion support.

Every in-game restart (footer, defeat popup and Daily replay) generates a fresh, physically verified gem layout in a Web Worker. The bottle queue and ingredient counts stay the same. New layouts retain title/XP/Mana progression but are marked Shuffled and excluded from the canonical shared leaderboard. The first load of a level still uses the canonical ranked board. `node verify-remix.mjs` verifies a fresh solvable restart for each of the 30 levels. `node scripts/serve-rank-check.mjs` offers an isolated local fourth-win animation preview on port 4182.


The title list changes without resetting existing XP, win records, Mana, or free spells. Apprentice, Herbalist, and Potion Brewer remain reachable with four, eight, and twelve first-time assisted Journey clears respectively. Sound defaults on, starts on a player gesture, and remembers an explicit mute. Combo announcements use a bounded three-message queue with 550 ms spacing, compositor animations and eight sparks per puff; reduced-motion mode hides vapor and sparks.


Defeat submissions update one score row per run and never lower an existing saved total. Saving no longer consumes a ticket: a saved run can be rescued and saved again, then advance through the normal verified-win checkpoint. Advancing consumes the parent ticket. Late network replies are ignored after the board or event log changes.
