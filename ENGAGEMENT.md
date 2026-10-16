# Potion Parlor: engagement and scoring

Historical notes from the first scoring pass. The current blocked queues, simultaneous pours, tighter shelves and separate leaderboard rules are documented in [BLOCKED-QUEUE.md](BLOCKED-QUEUE.md).

The previous queues used round-robin assignment from the winning route. That exposed the next four solution choices and made the five-slot shelf forgiving. The revised generator preserves a physical winning route but distributes it across unpredictable queues.

## Implemented progression

| Levels | Colors | Shelf slots | Decision pressure |
| --- | --- | --- | --- |
| 1–3 | 4 | 5 | Learn floor access and capacity |
| 4–8 | 5 | 4 | Plan around hidden queue contents |
| 9–12 | 6 | 4 | More competing colors |
| 13–30 | 6 | 3 | Commit carefully; reserve a useful slot |

Gem silhouettes, masses, sizes, arrangement and bottle capacities continue varying. Each initial pile exposes 6–8 floor gems. Only real floor contact unlocks conversion. Thirty prepared boards allow comparable per-level rankings and repeated score improvement. Browsers fetch the canonical board rather than regenerate it: physics generation can diverge between JavaScript runtimes. Build preparation copies the same reference data into the public board files and wraps the shared physics/scoring sources for server use.

## Combos and points

- Each gem: 100 × current multiplier.
- Bottle completion: (200 + capacity × 75) × multiplier × level scaling.
- Consecutive different-color completions build the chain; repeating a color restarts its streak.
- A second prepared bottle finishing without another placement adds a cascade multiplier step. This is the “wombo” opportunity: preloading helps scoring but occupies scarce shelf space.
- Multiplier caps at ×8. Switching color also gives a 25% bottle bonus.
- Clean completion adds 1,000 + level × 100 + best multiplier × 200.
- Undo or shake marks the run Practice. Practice remains playable but cannot submit a ranked score.
- No time limit or speed bonus: physics settling and liquid animation never reduce score.

The distinction between baseline actions, difficult consecutive actions and clean-clear bonuses draws on [PLAYSTUDIOS’ official Tetris scoring description](https://playstudios.helpshift.com/hc/en/16-tetris-mobile/faq/2437-scoring-in-tetris/). The formulas here are specific to Potion Parlor.

Gradually changing a few constraints follows the puzzle-design principles of introducing concepts in order and increasing applications and decision steps, described in [Jolie Menzel’s GDC puzzle-design workshop](https://media.gdcvault.com/gdc2016/Presentations/Menzel_Jolie_Level%20Design%20Workshop.pdf). The precise tier boundaries are hypotheses to tune with playtesting.

## Shared leaderboard

D1 stores real submitted runs. Rankings are per level, showing one personal best per browser identity. Names are public nicknames. An HttpOnly cookie identifies that browser; clearing cookies creates a new identity. This is anonymous play, not account synchronization.

The server issues single-use 24-hour run tickets, replays every bottle and gem removal through the same rigid-body engine, checks floor eligibility and capacities, then calculates points independently. An arbitrary client score is never accepted. Schema migrations run during deployment, never from request handlers. Same-origin write checks, input limits and a per-identity run-start limit constrain abuse. Automated solvers and identity resets remain possible; this is not a competitive anti-bot service.

## Next tuning experiments

Collect voluntary playtest results before adding mechanics: completion rate by tier, blocked shelves, practice usage, best combo and repeat attempts. No analytics collection is currently added.

Hypotheses: early boards should teach without a timer; middle boards should require reading the floor; late boards should reward keeping one escape slot. If a tier frustrates rather than invites another attempt, adjust queue distribution or shelf capacity before adding more colors. Compare cascade scores against safe sequential play to check that risk has a meaningful reward.
