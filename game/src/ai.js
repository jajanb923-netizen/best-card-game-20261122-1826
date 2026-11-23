// Ember Duel — the opponent, "Sang Penjaga Bara". One job: pick the AI's card
// each round with a policy a player can read and counter.
//
// The policy, in order:
//   1. Heal when hurt (life 9 or less) and a heal is affordable.
//   2. Finish the player when a lethal strike is in hand and their life is low.
//   3. Counter the player's favourite element: the AI remembers which element
//      the player plays most and favours the element that beats it.
//   4. Guard with a shield when the player's last trick hit hard.
//   5. Otherwise spend a middle card and keep the biggest for later — unless
//      it trails by 2 tricks, when it reaches for its strongest card.
// Every choice rolls on the seeded generator, so the same seed replays it.
import { ELEMENT_BEATS, HEAL_AMOUNT } from './config.js';
import { canPlay, effectivePower } from './engine.js';
import { KIND_ATTACK, KIND_BURST, KIND_HEAL, KIND_SHIELD } from './deck.js';

function affordable(ai, cards) {
  return cards.filter((card) => canPlay(ai, card));
}

function strongest(cards) {
  return cards.reduce((best, card) => (card.power > (best?.power ?? -1) ? card : best), null);
}

/** The element the player has played most so far (null when none yet). */
function playerFavouriteElement(game) {
  const counts = game.player.elementPlays;
  let best = null;
  let bestCount = 0;
  for (const element of Object.keys(counts)) {
    if (counts[element] > bestCount) {
      best = element;
      bestCount = counts[element];
    }
  }
  return best;
}

export function chooseCard(game) {
  const ai = game.ai;
  const random = game.random;
  const hand = affordable(ai, ai.hand);
  if (hand.length === 0) return null;

  const heals = hand.filter((card) => card.kind === KIND_HEAL);
  if (ai.life <= 9 && heals.length > 0 && random.next() < 0.85) return heals[0];

  const attacks = hand.filter((card) => card.kind === KIND_ATTACK || card.kind === KIND_BURST);
  const shields = hand.filter((card) => card.kind === KIND_SHIELD);

  // A lethal strike when the player is nearly down.
  if (game.player.life <= 8 && attacks.length > 0) {
    const lethal = attacks.filter((card) => effectivePower(card, { element: null }) >= game.player.life);
    if (lethal.length > 0 && random.next() < 0.9) return strongest(lethal);
  }

  // Guard after a hard hit: the shield blocks the next damage outright.
  const lastHit = game.lastTrick?.damage ?? 0;
  if (shields.length > 0 && lastHit >= 5 && random.next() < 0.6) return shields[0];

  // Counter the player's favourite element when a beating card is in hand.
  const favourite = playerFavouriteElement(game);
  if (favourite) {
    const counters = attacks.filter(
      (card) => card.kind === KIND_ATTACK && ELEMENT_BEATS[card.element] === favourite,
    );
    if (counters.length > 0 && random.next() < 0.6) return strongest(counters);
  }

  // Trailing by two tricks: reach for the strongest card.
  if (game.player.tricks - ai.tricks >= 2 && attacks.length > 0) return strongest(attacks);

  // Otherwise a middle card: sort by power and take the middle one, so the
  // biggest cards stay in hand for later rounds.
  if (attacks.length > 0) {
    const sorted = [...attacks].sort((a, b) => a.power - b.power);
    return sorted[Math.floor(sorted.length / 2)];
  }
  return hand[0];
}

/** A simple autopilot for one side, used by the screenshot staging. */
export function autopilotCard(game, side, skill) {
  const player = side;
  const random = game.random;
  const hand = affordable(player, player.hand);
  if (hand.length === 0) return null;
  const heals = hand.filter((card) => card.kind === KIND_HEAL);
  if (player.life <= 10 && heals.length > 0) return heals[0];
  const attacks = hand.filter((card) => card.kind === KIND_ATTACK || card.kind === KIND_BURST);
  if (skill === 'strong') {
    // Play the strongest affordable attack, preferring an element advantage.
    const best = attacks.reduce((top, card) => {
      const power = effectivePower(card, game.lastTrick?.aiCard ?? { element: null });
      const topPower = top ? effectivePower(top, game.lastTrick?.aiCard ?? { element: null }) : -1;
      return power > topPower ? card : top;
    }, null);
    return best ?? hand[0];
  }
  if (skill === 'weak' && random.next() < 0.7) {
    const sorted = [...attacks].sort((a, b) => a.power - b.power);
    return sorted[0] ?? hand[0];
  }
  return random.pick(hand);
}
