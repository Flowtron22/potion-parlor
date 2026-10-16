# Potion Parlor

A portrait browser puzzle inspired by the supplied yarn game reference. Built with dependency-free HTML, CSS, and Canvas 2D; no installation or GPU library required.

## Play

Open `dist/index.html` in a browser, or serve `dist` with any static web server. Select the front bottle in a cellar lane. It occupies one of five shelf slots and automatically collects three matching drops exposed at the bottom of any reservoir column. Finished bottles leave. Clear all twelve bottles to advance. Five waiting bottles with no accessible match ends the round; undo is available.

Each generated level has a verified solution: its reservoir is constructed in batches, then the reversed batch order is interleaved into the four bottle lanes and simulated against the actual collection policy. Invalid arrangements are regenerated. Other choices may block progress. Colors also have distinct symbols. Sound is opt-in. Level progression is stored locally when available.

This is an interpretation of the screenshot, not a claim about the exact rules of the original game.
