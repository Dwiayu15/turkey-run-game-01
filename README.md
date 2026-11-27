# turkey-run-game-01
[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Dwiayu15/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Dwiayu15/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Turkey Trot: The Great Thanksgiving Escape** — an original 2D turkey
escape game, written from scratch in plain browser JavaScript for
make.fun's *turkey escape game* bounty. No engine, no libraries, no image
or audio files: everything on screen is drawn with Canvas 2D each frame,
and every sound is synthesised live with WebAudio. It makes no network
requests and loads nothing from outside `game/`.

## The game

Thanksgiving is tomorrow, and the farmer is coming with his carving
knife. Run the turkey 1400 m from the coop to the freedom gate — across
the farmyard, through the barn, and past the kitchen oven — before
dinner is served.

- The farmer patrols the yard, and when he spots you he chases; lose
  him in the haystacks, slip through a fence gap he cannot follow, or
  outrun him with a dash. If he catches you, you lose a life — three
  lives, then dinner is served.
- Carving knives fall from the sky with a red warning mark; in the barn,
  pumpkins bowl across the ground; in the kitchen, the oven vents blast
  hot air on a timer. Every hazard is telegraphed, so a narrow escape is
  always fair.
- Corn (+10), pumpkin seeds (+25) and golden feathers (+50, and a burst
  of speed) line the way, and every metre run adds to the score.
- A HUD shows score, distance, the stage name, three lives, the
  farmer's state (patrolling / chasing / searching) and the dash
  cooldown, plus a progress bar from coop to freedom.

## Controls

| Input | Effect |
| --- | --- |
| ↑ / ↓ / ← / → or WASD | run |
| mouse (hold) | steer toward the pointer |
| Space / Shift | dash (short burst, brief cooldown) |
| H | hide in a haystack or bush |
| P | pause |
| M | mute |
| R | restart after being caught or escaping |
| Enter / click | start from the title screen |

Deterministic staging, handy for screenshots: `?seed=N` selects the
run, `?shot=start` shows the title screen, `?shot=play` jumps into a
mid-run chase, and `?shot=end` shows the caught screen after a hurried
run.

## How the entry is handed in

`main.ts` (Node 22, standard library only) is the hand-in program: it
copies `game/` and `screenshots/` into the output directory
(`/output`, or `$MAKEFUN_OUTPUT_DIR` when set) and writes
`dossier.json` there with `buildDossier` from
`vendor/makefun-game.ts` — the kit's library, vendored unchanged —
using the scorer's caps. `screenshots/` holds the maker's own renders
of the game (the first by name is the cover).

## Layout

- `game/index.html` — the page shell and styles
- `game/src/main.js` — the game loop and the screens
- `game/src/world.js` — the simulation: turkey, farmer AI, hazards, stages
- `game/src/render.js` — every drawing: turkey, farmer, farm, HUD, menus
- `game/src/config.js` — tuning, palette and the stage table
- `game/src/random.js` — the seeded generator behind `?seed=`
- `game/src/audio.js` — the WebAudio sound engine (gobble, alarm, jingle)
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — the `?shot=` scenes and their autopilot
- `serve.ts` — a small development server for `game/`
- `vendor/makefun-game.ts` — the make.fun game library, unchanged

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser — the game itself lives under `game/` and needs no build step or network.

---
<sub>Entered on [make.fun](https://make.fun/?ref=kj5vx9mv&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
