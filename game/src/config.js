// Turkey Trot: tuning, palette and stage table.
// One clear job: every number the rest of the game reads lives here, so a
// balance change is a one-line edit and nothing else has to move.
export const VIEW = { width: 960, height: 540 };

// The turkey roams a band of the yard; the ground line is where feet land.
export const FIELD = {
  top: 150,
  ground: 462,
  left: 36,
  right: 924,
  // Distance (in metres) where each stage begins. The escape ends at the
  // back gate, 1400 m from the coop.
  escapeMetres: 1400,
  pxPerMetre: 10,
};

export const TURKEY = {
  radius: 20,
  runSpeed: 235,
  dashSpeed: 560,
  dashTime: 0.18,
  dashCooldown: 1.25,
  invulnerableTime: 2.0,
  hideSettleTime: 0.8,
};

// The farmer is a little slower than the turkey's run on the farmyard and
// catches up in the kitchen, so the dash and the haystacks matter more later.
export const FARMER = {
  radius: 24,
  patrolSpeed: 95,
  chaseSpeed: [205, 222, 240],
  searchSpeed: 130,
  sightRange: 330,
  sightHalfAngle: 0.62,
  hearingRange: 260,
  dashHearingRange: 420,
  loseSightTime: 2.0,
  searchTime: 4.5,
};

export const KNIFE = {
  telegraphTime: 0.65,
  fallSpeed: 780,
  stickTime: 1.4,
  width: 10,
  length: 54,
};

export const PICKUP = {
  cornScore: 10,
  seedScore: 25,
  featherScore: 50,
  featherSpeedTime: 3.0,
};

// One stage per stretch of the run: name, palette shift, what spawns, and
// how busy the yard is. Difficulty rises through spawn intervals.
export const STAGES = [
  {
    name: 'THE FARMYARD',
    fromMetres: 0,
    skyTop: '#ffd9a0',
    skyBottom: '#f4a259',
    ground: '#b5773a',
    groundDark: '#96602c',
    knifeEvery: [2.6, 3.4],
    cornEvery: [1.1, 1.9],
    seedChance: 0.16,
    featherChance: 0.05,
    hideEvery: [5.5, 8.5],
    pumpkinChance: 0.35,
  },
  {
    name: 'THE BARN',
    fromMetres: 400,
    skyTop: '#e9b872',
    skyBottom: '#c97b3d',
    ground: '#9c6b34',
    groundDark: '#7d5426',
    knifeEvery: [2.0, 2.8],
    cornEvery: [1.0, 1.7],
    seedChance: 0.2,
    featherChance: 0.06,
    hideEvery: [5.0, 7.5],
    pumpkinChance: 0.5,
  },
  {
    name: 'THE KITCHEN',
    fromMetres: 900,
    skyTop: '#d99a5b',
    skyBottom: '#a85f2e',
    ground: '#8a5a2e',
    groundDark: '#6e4522',
    knifeEvery: [1.5, 2.2],
    cornEvery: [0.9, 1.5],
    seedChance: 0.24,
    featherChance: 0.07,
    hideEvery: [4.5, 7.0],
    pumpkinChance: 0.25,
  },
];

// Autumn palette shared by every drawing routine.
export const PALETTE = {
  turkeyBody: '#8a5a2b',
  turkeyDark: '#6b4420',
  turkeyLight: '#b07a3e',
  tailFeather: '#c97b2d',
  tailTip: '#e9c46a',
  wattle: '#d64545',
  beak: '#e9a13b',
  farmerShirt: '#4a7c59',
  farmerOveralls: '#3b5b8c',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9b36a',
  hatBand: '#7a4a21',
  knifeBlade: '#dfe6ea',
  knifeHandle: '#3a2a1a',
  corn: '#f2c14e',
  cornHusk: '#7da05c',
  seed: '#e07a5f',
  featherGold: '#f2c14e',
  hay: '#e3c878',
  hayDark: '#c9a94f',
  leafOrange: '#e07a3f',
  leafRed: '#c94f3d',
  leafYellow: '#e9c46a',
  ink: '#3a2417',
  cream: '#fff3d6',
};


/** The stage table row for a distance, and its index (0 farmyard, 1 barn, 2 kitchen). */
export function stageForMetres(metres) {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (metres >= STAGES[i].fromMetres) index = i;
  }
  return { stage: STAGES[index], index };
}

/** Step the simulation advances on: a fixed 60 Hz tick. */
export const STEP = 1 / 60;
