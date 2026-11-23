// Ember Duel — seeded random numbers (mulberry32). One job: deterministic draws,
// so a seed always replays the same deck order and the same AI rolls.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(max) {
      return Math.floor(this.next() * max);
    },
    pick(array) {
      return array[this.int(array.length)];
    },
    /** Fisher-Yates shuffle, in place, driven by this generator. */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = this.int(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },
  };
}
