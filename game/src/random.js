// Seeded randomness for Turkey Trot.
// One clear job: a tiny deterministic generator so a ?seed=N run (and every
// screenshot) plays out the same way every time it is opened.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max) from the given generator. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max] from the given generator. */
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one entry of an array with the given generator. */
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

/** True with the given probability. */
export function chance(rng, probability) {
  return rng() < probability;
}


/** Shuffle a copy of an array in place-free style, using the given generator. */
export function shuffle(rng, array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
