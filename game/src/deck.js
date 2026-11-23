// Ember Duel — the cards and the deck. One job: define every card in the game
// and build a shuffled 40-card deck from those definitions.
//
// Card kinds:
//   attack — a creature of one element with a power (1-10) and an ember cost.
//             The element cycle gives +3 power against the element it beats.
//   shield — "Perisai Bara": no attack this round, but the next damage aimed at
//             you is blocked entirely (the shield is then spent).
//   heal   — "Embun Pulih": no attack, restore 6 life at once (capped at 30).
//   burst  — "Ledakan Bara": a wild 12-power strike with no element, cost 4.
import { BURST_POWER, ELEMENTS, DECK_SIZE } from './config.js';

export const KIND_ATTACK = 'attack';
export const KIND_SHIELD = 'shield';
export const KIND_HEAL = 'heal';
export const KIND_BURST = 'burst';

const SPIRIT_NAMES = {
  [ELEMENTS.FIRE]: ['Bara Kecil', 'Jilat Api', 'Arang Panas', 'Pijar', 'Lidah Bara', 'Nyala', 'Membara', 'Panas Terik', 'Api Abadi', 'Mahkota Bara'],
  [ELEMENTS.LEAF]: ['Tunas', 'Akar Tua', 'Daun Tajam', 'Ranting', 'Lumut', 'Semak Duri', 'Pucuk', 'Hutan Rimbun', 'Akar Dunia', 'Raja Hutan'],
  [ELEMENTS.WATER]: ['Tetes', 'Riak', 'Arus', 'Ombak', 'Genangan', 'Hujan', 'Sungai', 'Samudra', 'Air Terjun', 'Badai Laut'],
};

/** Ember cost of an attack card: bigger power costs more, so every hand is a budget. */
export function attackCost(power) {
  if (power <= 3) return 1;
  if (power <= 6) return 2;
  return 3;
}

let nextId = 1;

/** Build one card object. `id` is unique per deck so the renderer can track it. */
export function makeCard(kind, element, power, cost, name) {
  return { id: nextId, kind, element, power, cost, name };
}

/** The full 40-card deck, in a fixed order before shuffling. */
export function buildDeck() {
  nextId = 1;
  const cards = [];
  for (const element of [ELEMENTS.FIRE, ELEMENTS.LEAF, ELEMENTS.WATER]) {
    const names = SPIRIT_NAMES[element];
    // Powers 1..10, one card each; the 10 is the elder spirit of its element.
    for (let power = 1; power <= 10; power += 1) {
      cards.push(makeCard(KIND_ATTACK, element, power, attackCost(power), names[power - 1]));
    }
  }
  for (let i = 0; i < 4; i += 1) cards.push(makeCard(KIND_SHIELD, null, 0, 2, 'Perisai Bara'));
  for (let i = 0; i < 3; i += 1) cards.push(makeCard(KIND_HEAL, null, 0, 2, 'Embun Pulih'));
  for (let i = 0; i < 3; i += 1) cards.push(makeCard(KIND_BURST, null, BURST_POWER, 4, 'Ledakan Bara'));
  if (cards.length !== DECK_SIZE) throw new Error(`deck must hold ${DECK_SIZE} cards, got ${cards.length}`);
  return cards;
}

/** A fresh shuffled deck from the seeded generator. */
export function createDeck(random) {
  return random.shuffle(buildDeck());
}
