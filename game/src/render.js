// The renderer of Turkey Trot: every pixel on screen is drawn here with
// Canvas 2D — the turkey, the farmer, the farm, the barn, the kitchen, the
// HUD and every menu. One clear job: turn a World into a picture. It never
// changes the world.
import { VIEW, FIELD, PALETTE, TURKEY, FARMER, KNIFE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold', font = 'Trebuchet MS, Verdana, sans-serif') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function shadowText(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(58,36,23,0.55)';
  ctx.fillText(str, x + 3, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Draw the whole frame for one screen over the given world. */
export function render(ctx, world, screen, best, muted) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawSky(ctx, world);
  ctx.save();
  ctx.translate(-Math.round(world.cameraX), 0);
  drawDistantFarm(ctx, world);
  drawGround(ctx, world);
  drawFences(ctx, world);
  drawHides(ctx, world);
  drawPickups(ctx, world);
  drawVents(ctx, world);
  drawPumpkins(ctx, world);
  drawKnives(ctx, world);
  drawFarmer(ctx, world);
  drawTurkey(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();
  drawLeaves(ctx, world);
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, world, muted);
  if (world.banner > 0 && screen === SCREEN_PLAY) drawBanner(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  if (screen === SCREEN_PAUSED) drawPaused(ctx);
  if (screen === SCREEN_CAUGHT) drawCaught(ctx, world, best);
  if (screen === SCREEN_ESCAPED) drawEscaped(ctx, world, best);
}

function drawSky(ctx, world) {
  const stage = world.stage;
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, stage.skyTop);
  gradient.addColorStop(0.62, stage.skyBottom);
  gradient.addColorStop(0.63, stage.ground);
  gradient.addColorStop(1, stage.groundDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A low autumn sun and slow clouds.
  ctx.fillStyle = 'rgba(255,236,180,0.95)';
  ellipse(ctx, 800, 84, 44, 44);
  ctx.fillStyle = 'rgba(255,244,214,0.75)';
  ellipse(ctx, 800, 84, 58, 58);
  ctx.fillStyle = 'rgba(255,250,235,0.55)';
  const cloudX = (world.time * 6) % 1100;
  ellipse(ctx, 200 - cloudX + 1100 * (cloudX > 200 ? 0 : 1), 70, 70, 16);
  ellipse(ctx, 620 - cloudX + 1100 * (cloudX > 620 ? 0 : 1), 110, 90, 18);
}

function drawDistantFarm(ctx, world) {
  // Rolling hills, a red barn, a silo and a row of trees on the horizon.
  // This runs inside the camera translation, so every x is a world x: the
  // hills span the visible window, while the barn, silo and trees sit at a
  // screen position that drifts at a fraction of the camera speed.
  const horizon = FIELD.top + 6;
  const cam = world.cameraX;
  const left = cam - 40;
  const right = cam + VIEW.width + 40;
  // Two overlapping hill ridges.
  ctx.fillStyle = '#b07a3e';
  ctx.beginPath();
  ctx.moveTo(left, horizon);
  for (let x = left; x <= right; x += 90) {
    ctx.quadraticCurveTo(x + 45, horizon - 34 - ((Math.abs(x) * 13) % 17), x + 90, horizon);
  }
  ctx.lineTo(right, horizon + 60);
  ctx.lineTo(left, horizon + 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9c6b34';
  ctx.beginPath();
  ctx.moveTo(left, horizon + 26);
  for (let x = left; x <= right; x += 110) {
    ctx.quadraticCurveTo(x + 55, horizon + 2 - ((Math.abs(x) * 7) % 13), x + 110, horizon + 26);
  }
  ctx.lineTo(right, horizon + 90);
  ctx.lineTo(left, horizon + 90);
  ctx.closePath();
  ctx.fill();
  // The barn and the silo drift at a third of the camera speed.
  const barnScreenX = (((640 - cam * 0.35) % 1500) + 1500) % 1500 - 120;
  drawBarn(ctx, cam + barnScreenX, horizon - 58);
  const siloScreenX = (((980 - cam * 0.35) % 1500) + 1500) % 1500 - 120;
  ctx.fillStyle = '#8a6a45';
  ctx.fillRect(cam + siloScreenX, horizon - 96, 26, 96);
  ctx.fillStyle = '#c9c9c9';
  ellipse(ctx, cam + siloScreenX + 13, horizon - 100, 16, 10);
  // Trees along the horizon, half the camera speed, varied in size.
  for (let i = 0; i < 12; i += 1) {
    const baseX = i * 97 + 30;
    const treeScreenX = (((baseX - cam * 0.5) % 1164) + 1164) % 1164 - 102;
    const treeX = cam + treeScreenX;
    const size = 20 + ((i * 37) % 16);
    ctx.fillStyle = '#6b4420';
    ctx.fillRect(treeX - 3, horizon - size * 0.5, 6, size * 0.5);
    ctx.fillStyle = i % 3 === 0 ? '#6b8a45' : i % 3 === 1 ? '#5c7a3d' : '#7a9a4d';
    ellipse(ctx, treeX, horizon - size * 0.75, size * 0.7, size * 0.75);
  }
}

function drawBarn(ctx, x, y) {
  ctx.fillStyle = '#a63a2e';
  ctx.fillRect(x, y, 92, 58);
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 46, y - 30);
  ctx.lineTo(x + 98, y);
  ctx.closePath();
  ctx.fillStyle = '#7e2a20';
  ctx.fill();
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 36, y + 58);
  ctx.lineTo(x + 36, y + 24);
  ctx.lineTo(x + 56, y + 24);
  ctx.lineTo(x + 56, y + 58);
  ctx.stroke();
  ctx.fillStyle = '#fff3d6';
  ctx.fillRect(x + 40, y + 8, 12, 12);
}

function drawGround(ctx, world) {
  const stage = world.stage;
  ctx.fillStyle = stage.ground;
  ctx.fillRect(world.cameraX - 40, FIELD.ground, 1080, VIEW.height - FIELD.ground);
  ctx.fillStyle = stage.groundDark;
  ctx.fillRect(world.cameraX - 40, FIELD.ground, 1080, 6);
  // Depth bands across the yard, so the ground reads as a field, not a void.
  ctx.fillStyle = 'rgba(255,243,214,0.05)';
  ctx.fillRect(world.cameraX - 40, FIELD.top + 120, 1080, 90);
  ctx.fillStyle = 'rgba(58,36,23,0.08)';
  ctx.fillRect(world.cameraX - 40, FIELD.top + 220, 1080, 80);
  // Grass tufts scattered across the yard, placed deterministically.
  ctx.strokeStyle = 'rgba(92,122,61,0.7)';
  ctx.lineWidth = 2;
  for (let x = Math.floor((world.cameraX - 40) / 73) * 73; x < world.cameraX + 1000; x += 73) {
    const pick = Math.abs(Math.sin(x * 7.13) * 43758.5453) % 1;
    const tuftY = FIELD.top + 130 + pick * 300;
    ctx.beginPath();
    ctx.moveTo(x, tuftY);
    ctx.lineTo(x - 4, tuftY - 9);
    ctx.moveTo(x + 3, tuftY);
    ctx.lineTo(x + 3, tuftY - 11);
    ctx.moveTo(x + 7, tuftY);
    ctx.lineTo(x + 11, tuftY - 8);
    ctx.stroke();
  }
  // Scattered autumn leaves and straw on the ground.
  const rngStep = 47;
  for (let x = Math.floor((world.cameraX - 40) / rngStep) * rngStep; x < world.cameraX + 1000; x += rngStep) {
    const pick = Math.abs(Math.sin(x * 12.9898) * 43758.5453) % 1;
    const leafY = FIELD.ground + 14 + pick * 56;
    ctx.fillStyle = pick < 0.33 ? PALETTE.leafOrange : pick < 0.66 ? PALETTE.leafRed : PALETTE.leafYellow;
    ctx.save();
    ctx.translate(x + pick * 30, leafY);
    ctx.rotate(pick * 3);
    ellipse(ctx, 0, 0, 7, 3.5);
    ctx.restore();
  }
  // The escape trail: a dotted path the turkey is following.
  ctx.fillStyle = 'rgba(255,243,214,0.5)';
  for (let x = Math.floor((world.cameraX - 40) / 90) * 90; x < world.cameraX + 1000; x += 90) {
    ellipse(ctx, x, FIELD.ground + 34, 10, 4);
  }
}

function drawFences(ctx, world) {
  for (const fence of world.fences) {
    const x = fence.x;
    const gapTop = fence.gapY - 75;
    const gapBottom = fence.gapY + 75;
    ctx.fillStyle = world.fenceFlash > 0 ? '#ff8a7a' : '#7a4a21';
    // Posts above and below the gap, with two rails.
    for (const [top, bottom] of [[FIELD.top - 10, gapTop], [gapBottom, FIELD.ground + 8]]) {
      ctx.fillRect(x - 5, top, 10, bottom - top);
    }
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x - 70, FIELD.top + 30, 140, 8);
    ctx.fillRect(x - 70, FIELD.top + 90, 140, 8);
    ctx.fillRect(x - 70, gapBottom + 30, 140, 8);
    // A hand-painted sign over the gap.
    ctx.fillStyle = '#fff3d6';
    roundRect(ctx, x - 52, gapTop - 34, 104, 26, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    text(ctx, world.fences.indexOf(fence) === 0 ? 'TO THE BARN' : 'TO THE KITCHEN', x, gapTop - 20, 11, PALETTE.ink);
    // The back gate at the end of the world.
    if (fence === world.fences[world.fences.length - 1]) {
      ctx.fillStyle = '#5c7a3d';
      text(ctx, 'ESCAPE GATE →', x + 120, gapTop - 20, 13, '#fff3d6', 'left');
    }
  }
  // The final gate: a green hedge arch at the escape line.
  const gateX = FIELD.escapeMetres * FIELD.pxPerMetre;
  ctx.fillStyle = '#4a6b35';
  ctx.fillRect(gateX - 8, FIELD.top - 6, 16, FIELD.ground - FIELD.top + 6);
  ctx.fillStyle = '#5c7a3d';
  ellipse(ctx, gateX, FIELD.top + 6, 46, 26);
  ctx.fillStyle = '#fff3d6';
  text(ctx, 'FREEDOM', gateX, FIELD.top + 40, 13, '#fff3d6');
}

function drawHides(ctx, world) {
  for (const hide of world.hides) {
    const { x, y, w } = hide;
    if (hide.kind === 'hay') {
      ctx.fillStyle = PALETTE.hayDark;
      ellipse(ctx, x, y + 12, w / 2, 26);
      ctx.fillStyle = PALETTE.hay;
      ellipse(ctx, x, y + 4, w / 2, 30);
      ctx.strokeStyle = PALETTE.hayDark;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * (w / 6), y - 18);
        ctx.quadraticCurveTo(x + i * (w / 6) + 6, y + 2, x + i * (w / 6) - 2, y + 22);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#3f5c2e';
      ellipse(ctx, x, y + 6, w / 2, 30);
      ctx.fillStyle = '#5c7a3d';
      ellipse(ctx, x - 10, y - 6, w / 3, 22);
      ellipse(ctx, x + 12, y - 8, w / 3, 20);
      ctx.fillStyle = PALETTE.leafRed;
      ellipse(ctx, x - 18, y - 12, 4, 4);
      ellipse(ctx, x + 16, y - 16, 4, 4);
      ellipse(ctx, x + 2, y - 20, 4, 4);
    }
    ctx.fillStyle = 'rgba(255,243,214,0.9)';
    text(ctx, 'HIDE', x, y - 34, 10, 'rgba(255,243,214,0.9)');
  }
}

function drawPickups(ctx, world) {
  for (const pickup of world.pickups) {
    const bobY = Math.sin(pickup.bob) * 4;
    const { x, y } = pickup;
    if (pickup.kind === 'corn') {
      ctx.fillStyle = PALETTE.cornHusk;
      ctx.beginPath();
      ctx.moveTo(x - 12, y + bobY + 8);
      ctx.lineTo(x - 20, y + bobY + 22);
      ctx.lineTo(x - 4, y + bobY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 12, y + bobY + 8);
      ctx.lineTo(x + 20, y + bobY + 22);
      ctx.lineTo(x + 4, y + bobY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.corn;
      ellipse(ctx, x, y + bobY, 10, 15);
      ctx.fillStyle = '#d9a52e';
      ctx.fillRect(x - 6, y + bobY - 8, 12, 3);
      ctx.fillRect(x - 6, y + bobY, 12, 3);
      ctx.fillRect(x - 6, y + bobY + 8, 12, 3);
    } else if (pickup.kind === 'seed') {
      ctx.fillStyle = PALETTE.seed;
      ctx.beginPath();
      ctx.moveTo(x, y + bobY - 12);
      ctx.quadraticCurveTo(x + 10, y + bobY, x, y + bobY + 12);
      ctx.quadraticCurveTo(x - 10, y + bobY, x, y + bobY - 12);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ellipse(ctx, x - 2, y + bobY - 3, 2, 4);
    } else {
      ctx.save();
      ctx.translate(x, y + bobY);
      ctx.rotate(Math.sin(pickup.bob * 0.5) * 0.3);
      ctx.fillStyle = PALETTE.featherGold;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9a52e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawVents(ctx, world) {
  for (const vent of world.vents) {
    ctx.fillStyle = '#4a4a4a';
    roundRect(ctx, vent.x - 34, vent.y - 8, 68, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#2e2e2e';
    for (let i = -2; i <= 2; i += 1) ctx.fillRect(vent.x + i * 12 - 4, vent.y - 5, 8, 6);
    if (vent.state === 'warning') {
      ctx.fillStyle = `rgba(255,140,40,${0.35 + 0.3 * Math.sin(world.time * 14)})`;
      ellipse(ctx, vent.x, vent.y - 16, 30, 14);
      text(ctx, '!', vent.x, vent.y - 34, 20, '#ffb347');
    } else if (vent.state === 'blast') {
      const flame = ctx.createLinearGradient(0, vent.y, 0, vent.y - 170);
      flame.addColorStop(0, 'rgba(255,90,20,0.9)');
      flame.addColorStop(0.6, 'rgba(255,170,40,0.75)');
      flame.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(vent.x - 26, vent.y);
      ctx.quadraticCurveTo(vent.x - 30, vent.y - 90, vent.x - 6, vent.y - 165);
      ctx.quadraticCurveTo(vent.x, vent.y - 120, vent.x + 6, vent.y - 165);
      ctx.quadraticCurveTo(vent.x + 30, vent.y - 90, vent.x + 26, vent.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawPumpkins(ctx, world) {
  for (const pumpkin of world.pumpkins) {
    ctx.save();
    ctx.translate(pumpkin.x, pumpkin.y);
    ctx.fillStyle = '#e07a3f';
    ellipse(ctx, 0, 0, pumpkin.r, pumpkin.r * 0.85);
    ctx.strokeStyle = '#c95f27';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, pumpkin.r * 0.55, pumpkin.r * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#5c7a3d';
    ctx.fillRect(-2, -pumpkin.r * 0.85 - 6, 5, 9);
    ctx.restore();
  }
}

function drawKnives(ctx, world) {
  for (const knife of world.knives) {
    if (knife.state === 'telegraph') {
      const pulse = 0.5 + 0.3 * Math.sin(world.time * 16);
      ctx.strokeStyle = `rgba(255,80,60,${pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.ellipse(knife.x, FIELD.ground - 4, 22, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,80,60,${pulse})`;
      text(ctx, '!', knife.x, FIELD.ground - 26, 18, `rgba(255,80,60,${pulse})`);
    } else {
      const tilt = knife.state === 'stuck' ? 0.35 : 0;
      ctx.save();
      ctx.translate(knife.x, knife.y + KNIFE.length / 2);
      ctx.rotate(tilt);
      ctx.fillStyle = PALETTE.knifeBlade;
      ctx.beginPath();
      ctx.moveTo(-5, -KNIFE.length / 2);
      ctx.lineTo(5, -KNIFE.length / 2);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 16);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.knifeHandle;
      roundRect(ctx, -6, KNIFE.length / 2 - 14, 12, 16, 4);
      ctx.fill();
      ctx.restore();
      if (knife.state === 'stuck') {
        ctx.fillStyle = 'rgba(58,36,23,0.25)';
        ellipse(ctx, knife.x + 8, FIELD.ground + 2, 14, 4);
      }
    }
  }
}

/** The farmer: straw hat, beard, overalls and a pitchfork, with a vision cone. */
function drawFarmer(ctx, world) {
  const farmer = world.farmer;
  const x = farmer.x;
  const y = farmer.y;
  const dir = farmer.facing;
  // Vision cone: pale while patrolling, red while chasing. Kept short and
  // faint so it reads as a glance, not a floodlight.
  const chasing = farmer.state === 'chase';
  const coneColor = chasing ? 'rgba(255,60,40,0.13)' : 'rgba(255,243,214,0.07)';
  ctx.fillStyle = coneColor;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  const coneDir = dir > 0 ? 0 : Math.PI;
  ctx.arc(x, y - 20, FARMER.sightRange * 0.55, coneDir - 0.55, coneDir + 0.55);
  ctx.closePath();
  ctx.fill();
  const bob = Math.abs(Math.sin(farmer.stepPhase)) * 3;
  const legSwing = Math.sin(farmer.stepPhase) * 7;
  // A soft contact shadow under the farmer's feet.
  ctx.fillStyle = 'rgba(58,36,23,0.28)';
  ellipse(ctx, x, y + 2, 26, 6);
  // Legs (overalls).
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 26);
  ctx.lineTo(x - 8 + legSwing, y - bob);
  ctx.moveTo(x + 6, y - 26);
  ctx.lineTo(x + 8 - legSwing, y - bob);
  ctx.stroke();
  // Body: shirt and overalls.
  ctx.fillStyle = PALETTE.farmerShirt;
  roundRect(ctx, x - 17, y - 62, 34, 40, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(x - 15, y - 40, 30, 16);
  ctx.fillStyle = '#e8b98a';
  ellipse(ctx, x - 19, y - 46, 6, 9);
  ellipse(ctx, x + 19, y - 46, 6, 9);
  // Head, beard and straw hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  ellipse(ctx, x, y - 74, 15, 15);
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.ellipse(x, y - 64, 13, 9, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerHat;
  ellipse(ctx, x, y - 86, 22, 7);
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(x, y - 92, 13, 9, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.hatBand;
  ctx.fillRect(x - 13, y - 92, 26, 4);
  // Eyes: angry dots when chasing.
  ctx.fillStyle = '#2a1a10';
  ellipse(ctx, x + dir * 5 - 4, y - 76, 2, chasing ? 3 : 2);
  ellipse(ctx, x + dir * 5 + 5, y - 76, 2, chasing ? 3 : 2);
  // Pitchfork in the leading hand.
  const forkX = x + dir * 24;
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(forkX, y - 10);
  ctx.lineTo(forkX + dir * 4, y - 78);
  ctx.stroke();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 2.5;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(forkX + i * 5, y - 78);
    ctx.lineTo(forkX + i * 5 + dir * 4, y - 92);
    ctx.stroke();
  }
  if (farmer.spottedFlash > 0) {
    text(ctx, 'SPOTTED!', x, y - 116, 18, '#ff5a3c');
  }
  const label = farmer.state === 'chase' ? 'CHASING!' : farmer.state === 'search' ? 'SEARCHING…' : 'PATROLLING';
  text(ctx, label, x, y - 100, 10, chasing ? '#ff5a3c' : 'rgba(255,243,214,0.85)');
}

/** The turkey: a fanned tail, a round brown body, a red wattle and busy legs. */
function drawTurkey(ctx, world) {
  const turkey = world.turkey;
  const x = turkey.x;
  const y = turkey.y;
  const dir = turkey.facing;
  const hidden = turkey.hidden;
  const blink = turkey.invuln > 0 && Math.floor(world.time * 12) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  if (hidden) ctx.globalAlpha = 0.75;
  // A soft contact shadow grounds the turkey wherever it runs.
  ctx.fillStyle = 'rgba(58,36,23,0.28)';
  ellipse(ctx, x, y + 20, 24, 6);
  const legSwing = Math.sin(turkey.stepPhase) * 6;
  const moving = turkey.moving;
  // Tail fan: five feathers spread behind the body.
  for (let i = -2; i <= 2; i += 1) {
    const angle = -Math.PI / 2 + i * 0.42 * dir;
    const featherLen = 34 - Math.abs(i) * 4;
    const tx = x - dir * 14 + Math.cos(angle + (dir < 0 ? Math.PI : 0)) * 0;
    const ty = y - 22;
    ctx.save();
    ctx.translate(x - dir * 12, y - 18);
    ctx.rotate(dir * i * 0.38);
    ctx.fillStyle = i % 2 === 0 ? PALETTE.tailFeather : PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(-dir * 14, -8, 7, featherLen / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.tailTip;
    ctx.beginPath();
    ctx.ellipse(-dir * 18, -8 - featherLen / 2 + 8, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void tx; void ty;
  }
  // Legs.
  ctx.strokeStyle = '#e8a13b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 6);
  ctx.lineTo(x - 8 + (moving ? legSwing : 0), y + 18);
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + 8 - (moving ? legSwing : 0), y + 18);
  ctx.stroke();
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ellipse(ctx, x, y - 6, 24, 19);
  ctx.fillStyle = PALETTE.turkeyLight;
  ellipse(ctx, x + dir * 4, y - 2, 15, 11);
  // Wing.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.beginPath();
  ctx.ellipse(x - dir * 2, y - 8, 13, 8, dir * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head.
  ctx.fillStyle = PALETTE.turkeyBody;
  ctx.fillRect(x + dir * 12 - 5, y - 34, 10, 20);
  ctx.fillStyle = PALETTE.turkeyLight;
  ellipse(ctx, x + dir * 14, y - 38, 11, 10);
  // Beak, wattle, eye.
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(x + dir * 22, y - 40);
  ctx.lineTo(x + dir * 32, y - 36);
  ctx.lineTo(x + dir * 22, y - 33);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.wattle;
  ctx.beginPath();
  ctx.ellipse(x + dir * 18, y - 30, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ellipse(ctx, x + dir * 16, y - 41, 2.4, 2.4);
  ctx.fillStyle = '#fff';
  ellipse(ctx, x + dir * 17, y - 42, 0.9, 0.9);
  // A little red comb on top.
  ctx.fillStyle = PALETTE.wattle;
  ellipse(ctx, x + dir * 12, y - 48, 5, 3);
  ctx.restore();
  if (hidden) {
    text(ctx, 'HIDDEN', x, y - 62, 11, '#fff3d6');
  }
  if (turkey.dashTime > 0) {
    ctx.strokeStyle = 'rgba(233,196,106,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 34, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ellipse(ctx, p.x, p.y, p.size, p.size * 0.6);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    shadowText(ctx, f.text, f.x, f.y, 16, f.color);
  }
  ctx.globalAlpha = 1;
}

function drawLeaves(ctx, world) {
  for (const leaf of world.leaves) {
    const sx = leaf.x - world.cameraX;
    if (sx < -20 || sx > VIEW.width + 20) continue;
    ctx.save();
    ctx.translate(sx, leaf.y);
    ctx.rotate(leaf.o + world.time * leaf.s);
    ctx.fillStyle = leaf.s > 0.9 ? PALETTE.leafRed : leaf.s > 0.6 ? PALETTE.leafOrange : PALETTE.leafYellow;
    ctx.globalAlpha = 0.8;
    ellipse(ctx, 0, 0, 6 * leaf.s, 3 * leaf.s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world, muted) {
  ctx.fillStyle = 'rgba(58,36,23,0.72)';
  roundRect(ctx, 12, 10, 936, 46, 10);
  ctx.fill();
  text(ctx, `SCORE  ${world.score}`, 28, 33, 20, '#fff3d6', 'left');
  text(ctx, `DISTANCE  ${Math.floor(world.distance)} m / 1400 m`, 300, 33, 16, '#ffd9a0', 'left');
  text(ctx, world.stage.name, 640, 33, 16, '#e9c46a', 'left');
  // Lives as little turkey heads.
  for (let i = 0; i < 3; i += 1) {
    const lx = 830 + i * 30;
    ctx.fillStyle = i < world.lives ? PALETTE.turkeyBody : 'rgba(255,243,214,0.25)';
    ellipse(ctx, lx, 30, 10, 9);
    ctx.fillStyle = i < world.lives ? PALETTE.wattle : 'rgba(255,243,214,0.25)';
    ellipse(ctx, lx + 6, 36, 3, 4);
  }
  // Farmer state badge.
  const farmer = world.farmer;
  const badge = farmer.state === 'chase' ? ['FARMER: CHASING!', '#ff5a3c']
    : farmer.state === 'search' ? ['FARMER: SEARCHING…', '#ffb347']
    : ['FARMER: PATROLLING', '#8fce9b'];
  ctx.fillStyle = badge[1];
  roundRect(ctx, 12, 64, 210, 26, 8);
  ctx.fill();
  text(ctx, badge[0], 117, 77, 13, '#3a2417');
  // Dash cooldown.
  const dashReady = world.turkey.dashCooldown <= 0;
  ctx.fillStyle = 'rgba(58,36,23,0.72)';
  roundRect(ctx, 12, 96, 150, 18, 8);
  ctx.fill();
  ctx.fillStyle = dashReady ? '#e9c46a' : '#8a6a45';
  const dashFrac = dashReady ? 1 : 1 - world.turkey.dashCooldown / 1.25;
  roundRect(ctx, 14, 98, 146 * dashFrac, 14, 6);
  ctx.fill();
  text(ctx, dashReady ? 'DASH READY  [SPACE]' : 'DASH…', 87, 105, 10, '#fff3d6');
  // Distance progress bar along the bottom.
  const progress = Math.min(1, world.distance / 1400);
  ctx.fillStyle = 'rgba(58,36,23,0.6)';
  roundRect(ctx, 200, 512, 560, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#e9c46a';
  roundRect(ctx, 202, 514, 556 * progress, 8, 4);
  ctx.fill();
  text(ctx, 'COOP', 186, 518, 10, '#fff3d6', 'right');
  text(ctx, 'FREEDOM', 774, 518, 10, '#fff3d6', 'left');
  text(ctx, muted ? 'MUTED  [M]' : 'SOUND ON  [M]', 940, 496, 11, 'rgba(255,243,214,0.85)', 'right');
}

function drawBanner(ctx, world) {
  const alpha = Math.min(1, world.banner);
  ctx.globalAlpha = alpha;
  shadowText(ctx, world.bannerText, VIEW.width / 2, 170, 44, '#fff3d6');
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(58,24,10,0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  shadowText(ctx, 'TURKEY TROT', VIEW.width / 2, 120, 64, '#fff3d6');
  shadowText(ctx, 'The Great Thanksgiving Escape', VIEW.width / 2, 168, 24, '#e9c46a');
  text(ctx, 'Thanksgiving is tomorrow. The farmer is coming with his carving knife.', VIEW.width / 2, 214, 16, '#fff3d6');
  text(ctx, 'Run the farmyard, slip through the barn, dodge the kitchen oven —', VIEW.width / 2, 238, 16, '#fff3d6');
  text(ctx, 'and reach the freedom gate 1400 m away before dinner is served.', VIEW.width / 2, 260, 16, '#fff3d6');
  text(ctx, 'ARROWS / WASD — run     SPACE — dash     H — hide in the hay', VIEW.width / 2, 312, 15, '#ffd9a0');
  text(ctx, 'MOUSE — steer toward the pointer     M — mute     P — pause', VIEW.width / 2, 336, 15, '#ffd9a0');
  const pulse = 0.7 + 0.3 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  shadowText(ctx, 'PRESS ENTER OR CLICK TO PLAY', VIEW.width / 2, 396, 24, '#e9c46a');
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `BEST SCORE: ${best}`, VIEW.width / 2, 436, 16, '#fff3d6');
  text(ctx, 'Grab corn (+10) and pumpkin seeds (+25). Golden feathers make you fast.', VIEW.width / 2, 470, 13, 'rgba(255,243,214,0.8)');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(58,24,10,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  shadowText(ctx, 'PAUSED', VIEW.width / 2, 250, 48, '#fff3d6');
  text(ctx, 'Press P to keep running', VIEW.width / 2, 300, 16, '#ffd9a0');
}

function drawCaught(ctx, world, best) {
  ctx.fillStyle = 'rgba(80,16,8,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  shadowText(ctx, 'CAUGHT!', VIEW.width / 2, 150, 64, '#ffb3a0');
  text(ctx, 'The farmer got you… dinner is served.', VIEW.width / 2, 205, 20, '#fff3d6');
  text(ctx, `SCORE  ${world.score}      DISTANCE  ${Math.floor(world.distance)} m`, VIEW.width / 2, 260, 20, '#fff3d6');
  text(ctx, `BEST  ${Math.max(best, world.score)}`, VIEW.width / 2, 296, 16, '#e9c46a');
  const pulse = 0.7 + 0.3 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  shadowText(ctx, 'PRESS R OR CLICK TO TRY AGAIN', VIEW.width / 2, 360, 22, '#e9c46a');
  ctx.globalAlpha = 1;
}

function drawEscaped(ctx, world, best) {
  ctx.fillStyle = 'rgba(30,60,25,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  shadowText(ctx, 'ESCAPED!', VIEW.width / 2, 150, 64, '#e9c46a');
  text(ctx, 'You slipped the gate and vanished into the autumn woods.', VIEW.width / 2, 205, 20, '#fff3d6');
  text(ctx, 'Thanksgiving dinner will have to wait — this turkey is free.', VIEW.width / 2, 232, 16, '#fff3d6');
  text(ctx, `SCORE  ${world.score}      DISTANCE  1400 m`, VIEW.width / 2, 286, 20, '#fff3d6');
  text(ctx, `BEST  ${Math.max(best, world.score)}`, VIEW.width / 2, 322, 16, '#e9c46a');
  const pulse = 0.7 + 0.3 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  shadowText(ctx, 'PRESS R OR CLICK TO RUN AGAIN', VIEW.width / 2, 386, 22, '#e9c46a');
  ctx.globalAlpha = 1;
}
