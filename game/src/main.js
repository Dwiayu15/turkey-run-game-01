// Turkey Trot: the game loop and the screens.
// One clear job: own the canvas, the tick, the screens (title, play, pause,
// caught, escaped) and the wiring between input, world, sound and renderer.
// The rules live in world.js; the pictures live in render.js.
import { VIEW, STEP } from './config.js';
import { World, EVENT_HIT, EVENT_PICKUP, EVENT_SPOTTED, EVENT_OVER, EVENT_ESCAPED, EVENT_DASH, EVENT_KNIFE, EVENT_STAGE, EVENT_HIDE } from './world.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_ESCAPED } from './render.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 1;
const shotName = params.get('shot');

const world = new World(seed);
const input = new Input(canvas);
const sound = new SoundEngine();

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem('turkey-trot-best') ?? '0', 10) || 0;
} catch {
  best = 0;
}

function saveBest() {
  if (world.score <= best) return;
  best = world.score;
  try {
    window.localStorage.setItem('turkey-trot-best', String(best));
  } catch {
    // Storage is a nicety, never a requirement.
  }
}

function announce(message) {
  if (statusLine) statusLine.textContent = message;
}

/** Fit the fixed 960x540 view into the window, letterboxed. */
function fitCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  const scale = Math.min(width / VIEW.width, height / VIEW.height);
  const offsetX = (width - VIEW.width * scale) / 2;
  const offsetY = (height - VIEW.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

let fit = fitCanvas();
window.addEventListener('resize', () => {
  fit = fitCanvas();
});

/** Draw one frame: letterbox fill, then the world scaled into the view. */
function drawFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.offsetX, fit.offsetY);
  render(ctx, world, screen, best, sound.muted);
}

/** Steering for this tick: arrows/WASD, else steer toward a held pointer. */
function readControls() {
  const keys = input.steerVector();
  let x = keys.x;
  let y = keys.y;
  if (x === 0 && y === 0 && input.pointer.down && input.pointerActive) {
    const turkeyScreenX = world.turkey.x - world.cameraX;
    const turkeyScreenY = world.turkey.y;
    // The pointer is in canvas pixels; convert it into view coordinates.
    const px = (input.pointer.x - fit.offsetX) / fit.scale;
    const py = (input.pointer.y - fit.offsetY) / fit.scale;
    const dx = px - turkeyScreenX;
    const dy = py - turkeyScreenY;
    const dist = Math.hypot(dx, dy);
    if (dist > 24) {
      x = dx / dist;
      y = dy / dist;
    }
  }
  return {
    x,
    y,
    dash: input.wasPressed(' ', 'Shift'),
    hide: input.held('h'),
  };
}

function playEventSounds(events) {
  if (events & EVENT_SPOTTED) {
    sound.alarm();
    sound.gobble();
  }
  if (events & EVENT_HIT) sound.hit();
  if (events & EVENT_PICKUP) sound.pickup('corn');
  if (events & EVENT_DASH) sound.dash();
  if (events & EVENT_KNIFE) sound.knifeWhistle();
  if (events & EVENT_STAGE) sound.gobble();
  if (events & EVENT_HIDE) sound.gobble();
  if (events & EVENT_ESCAPED) sound.jingle();
  if (events & EVENT_OVER) sound.caughtSting();
}

function startRun() {
  world.reset(seed);
  screen = SCREEN_PLAY;
  announce('The run begins. Escape the farmer and reach the freedom gate.');
  sound.ensure();
  sound.gobble();
}

function backToTitle() {
  world.reset(seed);
  screen = SCREEN_TITLE;
  announce('Turkey Trot: the great Thanksgiving escape. Press Enter to play.');
}

function tick(dt) {
  if (input.wasPressed('m')) {
    sound.setMuted(!sound.muted);
  }
  if (screen === SCREEN_TITLE) {
    if (input.wasPressed('Enter', ' ') || input.pointer.clicked) {
      sound.ensure();
      sound.click();
      startRun();
    }
    // The title scene stays alive behind the menu.
    world.step(dt, { x: 0.2, y: 0, dash: false, hide: false });
    if (world.over || world.escaped) world.reset(seed);
    return;
  }
  if (screen === SCREEN_PLAY) {
    if (input.wasPressed('p', 'Escape')) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    const events = world.step(dt, readControls());
    playEventSounds(events);
    if (events & EVENT_ESCAPED) {
      screen = SCREEN_ESCAPED;
      saveBest();
      announce(`Escaped! Final score ${world.score}.`);
    } else if (events & EVENT_OVER) {
      screen = SCREEN_CAUGHT;
      saveBest();
      announce(`Caught! Final score ${world.score}.`);
    }
    return;
  }
  if (screen === SCREEN_PAUSED) {
    if (input.wasPressed('p', 'Escape', 'Enter')) {
      screen = SCREEN_PLAY;
      announce('Back to the run.');
    }
    return;
  }
  // Caught or escaped: R or a click runs again, T goes back to the title.
  if (input.wasPressed('r') || input.pointer.clicked) {
    sound.ensure();
    sound.click();
    startRun();
  } else if (input.wasPressed('t')) {
    backToTitle();
  }
}

// A screenshot scene (?shot=start|play|end) renders once and stays put.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
  drawFrame();
  announce(`Turkey Trot screenshot: ${shotName}.`);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 5) {
      tick(STEP);
      accumulator -= STEP;
      guard += 1;
    }
    if (guard === 5) accumulator = 0;
    drawFrame();
    input.endTick();
    requestAnimationFrame(frame);
  }
  announce('Turkey Trot: the great Thanksgiving escape. Press Enter to play.');
  requestAnimationFrame(frame);
}
