// The world of Turkey Trot: the turkey, the farmer's AI, knives, vents,
// pickups, haystacks and the three stages of the escape.
// One clear job: hold the whole simulation and advance it one fixed tick at
// a time. It knows nothing about the canvas or the keyboard; main.js feeds
// it steering and reads back events.
import { FIELD, TURKEY, FARMER, KNIFE, PICKUP, STAGES, STEP, stageForMetres } from './config.js';
import { mulberry32, range, rangeInt, chance } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1 << 0;
export const EVENT_PICKUP = 1 << 1;
export const EVENT_SPOTTED = 1 << 2;
export const EVENT_OVER = 1 << 3;
export const EVENT_ESCAPED = 1 << 4;
export const EVENT_STAGE = 1 << 5;
export const EVENT_DASH = 1 << 6;
export const EVENT_HIDE = 1 << 7;
export const EVENT_KNIFE = 1 << 8;

const FENCE_X = [4000, 9000];
const FENCE_GAP_HEIGHT = 150;

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset(seed);
  }

  reset(seed = this.seed) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.time = 0;
    this.pickupScore = 0;
    this.distance = 0;
    this.lives = 3;
    this.stageIndex = 0;
    this.banner = 0;
    this.bannerText = STAGES[0].name;
    this.over = false;
    this.escaped = false;
    this.cameraX = 0;
    this.knives = [];
    this.pickups = [];
    this.hides = [];
    this.vents = [];
    this.pumpkins = [];
    this.particles = [];
    this.floaters = [];
    this.leaves = [];
    this.knifeTimer = 1.2;
    this.cornTimer = 0.6;
    this.hideTimer = 2.0;
    this.ventTimer = 3.0;
    this.pumpkinTimer = 4.0;
    this.fenceFlash = 0;
    for (let i = 0; i < 26; i += 1) {
      this.leaves.push({ x: this.rng() * 1100, y: this.rng() * 300, s: 0.4 + this.rng() * 0.8, o: this.rng() * 6.28 });
    }
    this.turkey = {
      x: 220, y: 380, facing: 1, moving: false, stepPhase: 0,
      dashTime: 0, dashCooldown: 0, invuln: 0, hidden: false, hideTime: 0,
      speedBoost: 0, gobbleTimer: 2.5,
    };
    this.farmer = {
      x: -40, y: 400, facing: 1, state: 'patrol', stateTime: 0,
      lastSeen: { x: 220, y: 380 }, loseTimer: 0, searchTimer: 0,
      patrolTarget: { x: 120, y: 400 }, stepPhase: 0, spottedFlash: 0,
    };
    this.fences = FENCE_X.map((x) => ({ x, gapY: FIELD.top + 90 + this.rng() * 180 }));
  }

  get score() {
    return Math.floor(this.distance) + this.pickupScore;
  }

  get stage() {
    return STAGES[this.stageIndex];
  }

  /** World x of the screen's left edge. */
  get viewLeft() {
    return this.cameraX;
  }

  /** Spawn a pickup just past the right edge of the view. */
  spawnPickup() {
    const stage = this.stage;
    const roll = this.rng();
    const kind = roll < stage.featherChance ? 'feather' : roll < stage.featherChance + stage.seedChance ? 'seed' : 'corn';
    this.pickups.push({
      kind,
      x: this.cameraX + 1000 + range(this.rng, 0, 260),
      y: range(this.rng, FIELD.top + 30, FIELD.ground - 30),
      bob: this.rng() * 6.28,
    });
  }

  spawnHide() {
    const kind = this.stageIndex === 2 ? 'bush' : 'hay';
    this.hides.push({
      kind,
      x: this.cameraX + 1020 + range(this.rng, 0, 220),
      y: range(this.rng, FIELD.top + 60, FIELD.ground - 70),
      w: range(this.rng, 64, 92),
    });
  }

  spawnKnife() {
    const near = chance(this.rng, 0.55);
    const x = near
      ? this.turkey.x + range(this.rng, -70, 130)
      : this.cameraX + range(this.rng, 500, 980);
    this.knives.push({ x, y: -KNIFE.length, state: 'telegraph', t: 0, vy: 0 });
    return EVENT_KNIFE;
  }

  spawnVent() {
    this.vents.push({
      x: this.cameraX + 1000 + range(this.rng, 0, 240),
      y: FIELD.ground,
      state: 'idle',
      t: range(this.rng, 0.6, 1.6),
    });
  }

  spawnPumpkin() {
    this.pumpkins.push({
      x: this.cameraX + 1020,
      y: FIELD.ground - 16,
      r: range(this.rng, 15, 21),
      vx: -range(this.rng, 130, 190),
      spin: 0,
    });
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1 });
  }

  burstFeathers(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const speed = range(this.rng, 40, 170);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: range(this.rng, 0.5, 1.1),
        maxLife: 1.1,
        color,
        size: range(this.rng, 3, 6),
      });
    }
  }

  /** Advance the simulation one fixed tick. `controls` is { x, y, dash, hide }
   * from the keyboard, the pointer, or the shot autopilot. Returns an event
   * bitmask the game loop turns into sounds and screen changes. */
  step(dt, controls) {
    if (this.over || this.escaped) return EVENT_NONE;
    let events = EVENT_NONE;
    this.time += dt;
    const turkey = this.turkey;
    const farmer = this.farmer;

    // --- stage progress -------------------------------------------------
    const { stage, index } = stageForMetres(this.distance);
    if (index !== this.stageIndex) {
      this.stageIndex = index;
      this.banner = 2.4;
      this.bannerText = stage.name;
      events |= EVENT_STAGE;
    }
    if (this.banner > 0) this.banner -= dt;
    if (this.fenceFlash > 0) this.fenceFlash -= dt;
    if (farmer.spottedFlash > 0) farmer.spottedFlash -= dt;

    // --- turkey movement ------------------------------------------------
    if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;
    if (turkey.invuln > 0) turkey.invuln -= dt;
    if (turkey.speedBoost > 0) turkey.speedBoost -= dt;
    const wantDash = controls.dash && turkey.dashCooldown <= 0 && turkey.dashTime <= 0;
    if (wantDash) {
      turkey.dashTime = TURKEY.dashTime;
      turkey.dashCooldown = TURKEY.dashCooldown;
      turkey.hidden = false;
      events |= EVENT_DASH;
      this.burstFeathers(turkey.x, turkey.y, 6, '#e9c46a');
      if (this.farmerHears(turkey.x, turkey.y, FARMER.dashHearingRange)) {
        this.alertFarmer(turkey.x, turkey.y);
      }
    }
    let speed = TURKEY.runSpeed * (turkey.speedBoost > 0 ? 1.35 : 1);
    if (turkey.dashTime > 0) {
      turkey.dashTime -= dt;
      speed = TURKEY.dashSpeed;
    }
    let mx = controls.x;
    let my = controls.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    turkey.moving = mag > 0.05;
    if (mx !== 0) turkey.facing = mx > 0 ? 1 : -1;
    const prevX = turkey.x;
    const prevY = turkey.y;
    turkey.x += mx * speed * dt;
    turkey.y += my * speed * dt;
    turkey.x = Math.max(FIELD.left, Math.min(FIELD.right + this.cameraX, turkey.x));
    turkey.y = Math.max(FIELD.top, Math.min(FIELD.ground, turkey.y));
    // A fence stops the turkey unless it slips through the gap.
    for (const fence of this.fences) {
      if (prevX < fence.x && turkey.x >= fence.x) {
        if (turkey.y < fence.gapY - FENCE_GAP_HEIGHT / 2 || turkey.y > fence.gapY + FENCE_GAP_HEIGHT / 2) {
          turkey.x = fence.x - TURKEY.radius;
          this.fenceFlash = 0.25;
        }
      }
    }
    if (turkey.moving) turkey.stepPhase += dt * (turkey.dashTime > 0 ? 22 : 11);
    turkey.gobbleTimer -= dt;
    if (turkey.gobbleTimer <= 0) {
      turkey.gobbleTimer = range(this.rng, 4, 8);
      events |= EVENT_NONE; // gobbles are ambient; the loop plays them rarely
    }

    // --- hiding in haystacks and bushes ---------------------------------
    const hide = this.hideAt(turkey.x, turkey.y);
    if (hide && (controls.hide || !turkey.moving)) {
      turkey.hideTime += dt;
      if (turkey.hideTime >= TURKEY.hideSettleTime && !turkey.hidden) {
        turkey.hidden = true;
        events |= EVENT_HIDE;
        if (farmer.state === 'chase') {
          farmer.state = 'search';
          farmer.searchTimer = FARMER.searchTime;
          farmer.lastSeen = { x: turkey.x, y: turkey.y };
        }
      }
    } else {
      turkey.hideTime = 0;
      if (turkey.moving || controls.dash) turkey.hidden = false;
    }

    // --- the camera and the distance ------------------------------------
    const targetCam = Math.max(0, turkey.x - 320);
    this.cameraX += (targetCam - this.cameraX) * Math.min(1, dt * 6);
    this.distance = Math.max(this.distance, turkey.x / FIELD.pxPerMetre);
    if (turkey.x >= FIELD.escapeMetres * FIELD.pxPerMetre) {
      this.escaped = true;
      return events | EVENT_ESCAPED;
    }

    // --- farmer AI ------------------------------------------------------
    events |= this.stepFarmer(dt);

    // --- hazards and pickups --------------------------------------------
    events |= this.stepKnives(dt);
    events |= this.stepVents(dt);
    events |= this.stepPumpkins(dt);
    events |= this.stepPickups(dt);
    this.stepSpawns(dt);
    this.stepParticles(dt);

    // --- caught? ---------------------------------------------------------
    if (this.overlaps(turkey, farmer, TURKEY.radius + FARMER.radius - 6) && turkey.invuln <= 0 && !turkey.hidden) {
      events |= this.hurtTurkey('The farmer grabbed you!');
    }
    return events;
  }

  /** Distance check between two round bodies. */
  overlaps(a, b, reach) {
    const dx = a.x - b.x;
    const dy = (a.y - b.y) * 0.8;
    return dx * dx + dy * dy < reach * reach;
  }

  /** The haystack or bush the turkey is standing in, if any. */
  hideAt(x, y) {
    for (const hide of this.hides) {
      if (Math.abs(x - hide.x) < hide.w / 2 && Math.abs(y - hide.y) < 46) return hide;
    }
    return null;
  }

  farmerHears(x, y, rangeValue) {
    const dx = x - this.farmer.x;
    const dy = y - this.farmer.y;
    return dx * dx + dy * dy < rangeValue * rangeValue;
  }

  alertFarmer(x, y) {
    const farmer = this.farmer;
    if (farmer.state === 'chase') return;
    farmer.state = 'search';
    farmer.searchTimer = FARMER.searchTime * 0.7;
    farmer.lastSeen = { x, y };
  }

  /** Lose a life, knock the turkey back, and end the run at zero lives. */
  hurtTurkey(message) {
    const turkey = this.turkey;
    this.lives -= 1;
    turkey.invuln = TURKEY.invulnerableTime;
    turkey.hidden = false;
    turkey.x = Math.max(FIELD.left, turkey.x - 90);
    this.burstFeathers(turkey.x, turkey.y, 14, '#b07a3e');
    this.addFloater(turkey.x, turkey.y - 40, message, '#ff6b5e');
    if (this.lives <= 0) {
      this.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  /** The farmer: patrols the yard, chases when he sees the turkey, searches
   * the last place he saw it, and gives up back to patrol. He cannot cross a
   * fence except through its gap, so a quick turkey can lose him there. */
  stepFarmer(dt) {
    const farmer = this.farmer;
    const turkey = this.turkey;
    let events = EVENT_NONE;
    farmer.stateTime += dt;
    farmer.stepPhase += dt * 7;
    const chaseSpeed = FARMER.chaseSpeed[this.stageIndex];
    const dx = turkey.x - farmer.x;
    const dy = turkey.y - farmer.y;
    const dist = Math.hypot(dx, dy);
    const canSee = !turkey.hidden && dist < FARMER.sightRange
      && Math.abs(Math.atan2(dy, dx) - (farmer.facing > 0 ? 0 : Math.PI)) < FARMER.sightHalfAngle + 0.9
      && (farmer.facing > 0 ? dx > -30 : dx < 30);

    if (farmer.state === 'patrol') {
      const tx = farmer.patrolTarget.x;
      const ty = farmer.patrolTarget.y;
      const pdx = tx - farmer.x;
      const pdy = ty - farmer.y;
      const pd = Math.hypot(pdx, pdy);
      if (pd < 24) {
        farmer.patrolTarget = {
          x: Math.max(this.cameraX + 60, Math.min(this.cameraX + 900, turkey.x + range(this.rng, -320, 320))),
          y: range(this.rng, FIELD.top + 40, FIELD.ground - 20),
        };
      } else {
        this.moveFarmer(pdx / pd, pdy / pd, FARMER.patrolSpeed, dt);
      }
      if (canSee) {
        farmer.state = 'chase';
        farmer.stateTime = 0;
        farmer.loseTimer = 0;
        farmer.spottedFlash = 0.6;
        events |= EVENT_SPOTTED;
      }
    } else if (farmer.state === 'chase') {
      farmer.lastSeen = { x: turkey.x, y: turkey.y };
      if (canSee) {
        farmer.loseTimer = 0;
      } else {
        farmer.loseTimer += dt;
        if (farmer.loseTimer >= FARMER.loseSightTime) {
          farmer.state = 'search';
          farmer.searchTimer = FARMER.searchTime;
          farmer.stateTime = 0;
        }
      }
      if (dist > 1) this.moveFarmer(dx / dist, dy / dist, chaseSpeed, dt);
    } else {
      // search: hurry to the last seen spot, look around, then give up.
      farmer.searchTimer -= dt;
      const lx = farmer.lastSeen.x - farmer.x;
      const ly = farmer.lastSeen.y - farmer.y;
      const ld = Math.hypot(lx, ly);
      if (ld > 20) {
        this.moveFarmer(lx / ld, ly / ld, FARMER.searchSpeed, dt);
      } else {
        farmer.facing = farmer.stateTime % 2 < 1 ? 1 : -1;
      }
      if (canSee && dist < FARMER.sightRange * 0.8) {
        farmer.state = 'chase';
        farmer.stateTime = 0;
        farmer.loseTimer = 0;
        farmer.spottedFlash = 0.6;
        events |= EVENT_SPOTTED;
      } else if (farmer.searchTimer <= 0) {
        farmer.state = 'patrol';
        farmer.stateTime = 0;
        farmer.patrolTarget = { x: turkey.x + range(this.rng, -260, 260), y: range(this.rng, FIELD.top + 40, FIELD.ground - 20) };
      }
    }
    // Keep the farmer in the yard and behind the same fences as the turkey.
    farmer.x = Math.max(this.cameraX - 60, Math.min(this.cameraX + 960, farmer.x));
    farmer.y = Math.max(FIELD.top, Math.min(FIELD.ground, farmer.y));
    return events;
  }

  moveFarmer(nx, ny, speed, dt) {
    const farmer = this.farmer;
    const prevX = farmer.x;
    farmer.x += nx * speed * dt;
    farmer.y += ny * speed * dt;
    if (nx !== 0) farmer.facing = nx > 0 ? 1 : -1;
    for (const fence of this.fences) {
      if (prevX < fence.x && farmer.x >= fence.x) {
        if (farmer.y < fence.gapY - FENCE_GAP_HEIGHT / 2 || farmer.y > fence.gapY + FENCE_GAP_HEIGHT / 2) {
          farmer.x = fence.x - FARMER.radius;
        }
      } else if (prevX > fence.x && farmer.x <= fence.x) {
        if (farmer.y < fence.gapY - FENCE_GAP_HEIGHT / 2 || farmer.y > fence.gapY + FENCE_GAP_HEIGHT / 2) {
          farmer.x = fence.x + FARMER.radius;
        }
      }
    }
  }

  stepKnives(dt) {
    let events = EVENT_NONE;
    const turkey = this.turkey;
    for (let i = this.knives.length - 1; i >= 0; i -= 1) {
      const knife = this.knives[i];
      knife.t += dt;
      if (knife.state === 'telegraph') {
        if (knife.t >= KNIFE.telegraphTime) {
          knife.state = 'falling';
          knife.y = -KNIFE.length;
          knife.vy = 0;
          events |= EVENT_KNIFE;
        }
      } else if (knife.state === 'falling') {
        knife.vy += 2600 * dt;
        knife.y += knife.vy * dt;
        if (knife.y >= FIELD.ground - KNIFE.length) {
          knife.y = FIELD.ground - KNIFE.length;
          knife.state = 'stuck';
          knife.t = 0;
        }
        if (turkey.invuln <= 0 && Math.abs(knife.x - turkey.x) < TURKEY.radius + 8
          && knife.y + KNIFE.length > turkey.y - 14 && knife.y < turkey.y + 18) {
          events |= this.hurtTurkey('Ouch! A carving knife!');
          this.knives.splice(i, 1);
          continue;
        }
      } else if (knife.t >= KNIFE.stickTime) {
        this.knives.splice(i, 1);
        continue;
      }
      if (knife.x < this.cameraX - 120) this.knives.splice(i, 1);
    }
    return events;
  }

  stepVents(dt) {
    let events = EVENT_NONE;
    const turkey = this.turkey;
    for (let i = this.vents.length - 1; i >= 0; i -= 1) {
      const vent = this.vents[i];
      vent.t -= dt;
      if (vent.state === 'idle' && vent.t <= 0) { vent.state = 'warning'; vent.t = 0.7; }
      else if (vent.state === 'warning' && vent.t <= 0) { vent.state = 'blast'; vent.t = 0.8; }
      else if (vent.state === 'blast' && vent.t <= 0) { vent.state = 'idle'; vent.t = range(this.rng, 1.2, 2.4); }
      if (vent.state === 'blast' && turkey.invuln <= 0
        && Math.abs(vent.x - turkey.x) < 34 && turkey.y > FIELD.ground - 170) {
        events |= this.hurtTurkey('The oven blasted you!');
      }
      if (vent.x < this.cameraX - 120) this.vents.splice(i, 1);
    }
    return events;
  }

  stepPumpkins(dt) {
    let events = EVENT_NONE;
    const turkey = this.turkey;
    for (let i = this.pumpkins.length - 1; i >= 0; i -= 1) {
      const pumpkin = this.pumpkins[i];
      pumpkin.x += pumpkin.vx * dt;
      pumpkin.spin += dt * 3;
      if (pumpkin.x < this.cameraX - 80) { this.pumpkins.splice(i, 1); continue; }
      if (turkey.invuln <= 0 && Math.abs(pumpkin.x - turkey.x) < TURKEY.radius + pumpkin.r - 6
        && Math.abs(pumpkin.y - turkey.y) < TURKEY.radius + pumpkin.r - 8) {
        events |= this.hurtTurkey('A pumpkin bowled you over!');
      }
    }
    return events;
  }

  stepPickups(dt) {
    let events = EVENT_NONE;
    const turkey = this.turkey;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i];
      pickup.bob += dt * 3;
      const dx = turkey.x - pickup.x;
      const dy = turkey.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90) {
        pickup.x += (dx / Math.max(dist, 1)) * 60 * dt;
        pickup.y += (dy / Math.max(dist, 1)) * 60 * dt;
      }
      if (dist < TURKEY.radius + 16) {
        const value = pickup.kind === 'corn' ? PICKUP.cornScore : pickup.kind === 'seed' ? PICKUP.seedScore : PICKUP.featherScore;
        this.pickupScore += value;
        if (pickup.kind === 'feather') turkey.speedBoost = PICKUP.featherSpeedTime;
        this.addFloater(pickup.x, pickup.y - 24, `+${value}`, pickup.kind === 'feather' ? '#f2c14e' : '#fff3d6');
        this.burstFeathers(pickup.x, pickup.y, 5, pickup.kind === 'corn' ? '#f2c14e' : '#e07a5f');
        this.pickups.splice(i, 1);
        events |= EVENT_PICKUP;
        continue;
      }
      if (pickup.x < this.cameraX - 80) this.pickups.splice(i, 1);
    }
    return events;
  }

  stepSpawns(dt) {
    const stage = this.stage;
    this.knifeTimer -= dt;
    if (this.knifeTimer <= 0) {
      this.spawnKnife();
      this.knifeTimer = range(this.rng, stage.knifeEvery[0], stage.knifeEvery[1]);
    }
    this.cornTimer -= dt;
    if (this.cornTimer <= 0) {
      this.spawnPickup();
      this.cornTimer = range(this.rng, stage.cornEvery[0], stage.cornEvery[1]);
    }
    this.hideTimer -= dt;
    if (this.hideTimer <= 0) {
      this.spawnHide();
      this.hideTimer = range(this.rng, stage.hideEvery[0], stage.hideEvery[1]);
    }
    if (this.stageIndex === 2) {
      this.ventTimer -= dt;
      if (this.ventTimer <= 0) {
        this.spawnVent();
        this.ventTimer = range(this.rng, 2.2, 3.6);
      }
    }
    if (this.stageIndex === 1) {
      this.pumpkinTimer -= dt;
      if (this.pumpkinTimer <= 0) {
        this.spawnPumpkin();
        this.pumpkinTimer = range(this.rng, 3.5, 5.5);
      }
    }
    for (let i = this.hides.length - 1; i >= 0; i -= 1) {
      if (this.hides[i].x < this.cameraX - 120) this.hides.splice(i, 1);
    }
  }

  stepParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (const leaf of this.leaves) {
      leaf.x -= (18 + leaf.s * 22) * dt;
      leaf.y += Math.sin(this.time + leaf.o) * 12 * dt;
      if (leaf.x < this.cameraX - 30) {
        leaf.x = this.cameraX + 980;
        leaf.y = this.rng() * 300;
      }
    }
  }
}
