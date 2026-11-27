// Turkey Trot's hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/ — a canvas game that plays
// offline in a desktop browser — and three screenshots of it under
// screenshots/. This program hands the entry in: it copies both folders
// into the output directory (/output, or $MAKEFUN_OUTPUT_DIR outside the
// grader) and writes /output/dossier.json, the summary the judge reads,
// with buildDossier from the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier is written with the scorer's own caps, so a dossier that
// passes here is one the gate accepts: at most 160 KiB of source text,
// at most 4 screenshots of 256 KiB each, and game/ inside its file, byte
// and path limits (the whole of /output shares the platform's 1000-entry
// and 64 MiB caps, so game/ leaves room for the screenshots and dossier).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
