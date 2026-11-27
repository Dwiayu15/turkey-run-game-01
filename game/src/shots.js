// The screenshot scenes behind ?shot=start|play|end.
// One clear job: play the real rules forward from a fresh world for a fixed
// number of steps, steered by an autopilot, so each frame is what a short
// game really looks like — and the same seed always gives the same frame.
import { FIELD, KNIFE, STEP } from './config.js';
import { EVENT_OVER, EVENT_ESCAPED } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The fence gap the turkey must thread, if one is close ahead. */
function gapAhead(world) {
  for (const fence of world.fences) {
    const ahead = fence.x - world.turkey.x;
    if (ahead > 0 && ahead < 220) return fence;
  }
  return null;
}

/** A knife that will land near the turkey's x within the next moment. */
function knifeThreat(world) {
  for (const knife of world.knives) {
    if (knife.state === 'telegraph' || knife.state === 'falling') {
      if (Math.abs(knife.x - world.turkey.x) < 70) return knife;
    }
  }
  return null;
}

/** The nearest pickup ahead of the turkey, if any. */
function nearestPickup(world) {
  let best = null;
  let bestDist = Infinity;
  for (const pickup of world.pickups) {
    const dx = pickup.x - world.turkey.x;
    if (dx < -20 || dx > 420) continue;
    const dist = Math.abs(dx) + Math.abs(pickup.y - world.turkey.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = pickup;
    }
  }
  return best;
}

/** A haystack or bush the turkey can reach quickly. */
function nearbyHide(world) {
  for (const hide of world.hides) {
    if (Math.abs(hide.x - world.turkey.x) < 140 && Math.abs(hide.y - world.turkey.y) < 120) return hide;
  }
  return null;
}

/** Steer the turkey: dodge knives, outrun the farmer, thread fence gaps,
 * chase corn, and hide when cornered. Returns { x, y, dash, hide }. */
function autopilot(world) {
  const turkey = world.turkey;
  const farmer = world.farmer;
  let x = 1;
  let y = 0;
  let dash = false;
  let hide = false;

  const threat = knifeThreat(world);
  if (threat) {
    x = threat.x > turkey.x ? -1 : 1;
    y = turkey.y > FIELD.ground - 60 ? -1 : 0;
  }
  const fence = gapAhead(world);
  if (fence) {
    const gapCentre = fence.gapY;
    if (turkey.y < gapCentre - 24) y = 1;
    else if (turkey.y > gapCentre + 24) y = -1;
    x = 1;
  }
  if (farmer.state === 'chase') {
    const dx = turkey.x - farmer.x;
    const dy = turkey.y - farmer.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 200) {
      x = dx >= 0 ? 1 : -1;
      y = dy >= 0 ? 1 : -1;
      if (dist < 120 && turkey.dashCooldown <= 0) dash = true;
      const hideSpot = nearbyHide(world);
      if (hideSpot && dist < 150) {
        x = hideSpot.x > turkey.x ? 1 : -1;
        y = hideSpot.y > turkey.y ? 1 : -1;
        if (Math.abs(hideSpot.x - turkey.x) < 30) hide = true;
      }
    }
  }
  if (!threat && !fence && farmer.state !== 'chase') {
    const pickup = nearestPickup(world);
    if (pickup) {
      x = pickup.x > turkey.x + 8 ? 1 : pickup.x < turkey.x - 8 ? -1 : 0.4;
      y = pickup.y > turkey.y + 8 ? 1 : pickup.y < turkey.y - 8 ? -1 : 0;
    }
  }
  // Stay inside the yard band.
  if (turkey.y <= FIELD.top + 10) y = Math.max(0, y);
  if (turkey.y >= FIELD.ground - 10) y = Math.min(0, y);
  return { x, y, dash, hide };
}

/** A hurried, clumsy pilot for the end scene: it wanders, never dashes, and
 * walks straight into trouble, as a rushed player does. */
function clumsyPilot(world) {
  const wobble = Math.sin(world.time * 0.7) > 0 ? 1 : -1;
  return { x: wobble * 0.4, y: Math.sin(world.time * 1.3) > 0 ? 0.5 : -0.5, dash: false, hide: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world));
      if (world.over || world.escaped) break;
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? clumsyPilot : autopilot;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, pilot(world));
    if (events & EVENT_OVER || events & EVENT_ESCAPED) break;
  }
  if (name === 'play' && !world.over && !world.escaped) {
    // The cover of the play scene is a chase: put the farmer on the
    // turkey's heels with a knife already falling, then let the autopilot
    // run half a second so the frame catches the pursuit mid-stride.
    const turkey = world.turkey;
    const farmer = world.farmer;
    farmer.x = turkey.x - 190;
    farmer.y = Math.max(FIELD.top, Math.min(FIELD.ground, turkey.y + 30));
    farmer.facing = 1;
    farmer.state = 'chase';
    farmer.stateTime = 0;
    farmer.loseTimer = 0;
    farmer.spottedFlash = 0.6;
    farmer.lastSeen = { x: turkey.x, y: turkey.y };
    world.knives.push({ x: turkey.x + 70, y: -KNIFE.length, state: 'telegraph', t: 0, vy: 0 });
    for (let index = 0; index < 0.5 / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world));
      if (events & EVENT_OVER || events & EVENT_ESCAPED) break;
    }
  }
  if (world.escaped) return { screen: SCREEN_ESCAPED, best: world.score };
  if (world.over) return { screen: SCREEN_CAUGHT, best: world.score };
  return { screen: SCREEN_PLAY, best: world.score };
}


/** The shot names the page understands in ?shot=. */
export const SHOT_NAMES = ['start', 'play', 'end'];
