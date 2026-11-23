// Ember Duel — the rules, as a pure state machine with no DOM in it.
// One job: hands, ember, tricks and life, so the same code runs the live game
// and the screenshot autopilot, and Node can play whole games headlessly.
//
// A round: both sides pick one card from their hand at the same time.
//   * An attack card strikes with its power; the element cycle adds +3 when
//     your element beats the other card's element.
//   * Perisai Bara blocks the next damage aimed at you, then is spent.
//   * Embun Pulih restores 6 life at once. Ledakan Bara strikes for 12, no element.
// The higher effective power wins the trick; the loser takes the difference
// as damage (a tie deals none). The trick winner gains 1 ember. First side
// to 0 life loses. Ember refills by 2 each round, to a cap of 10.
import {
  ADVANTAGE_BONUS, BURST_POWER, ELEMENT_BEATS, EMBER_PER_ROUND, HAND_SIZE,
  HEAL_AMOUNT, MAX_EMBER, MAX_LIFE, START_EMBER, START_LIFE, WINNER_EMBER_BONUS,
} from './config.js';
import { createDeck, KIND_BURST, KIND_HEAL, KIND_SHIELD } from './deck.js';

export const PHASE_TITLE = 'title';
export const PHASE_SELECT = 'select';
export const PHASE_REVEAL = 'reveal';
export const PHASE_OVER = 'over';

/** A fresh side of the table: life, ember, hand and the running tallies. */
function createSide() {
  return {
    life: START_LIFE,
    ember: START_EMBER,
    hand: [],
    shield: false,
    tricks: 0,
    damageDealt: 0,
    elementPlays: { fire: 0, leaf: 0, water: 0 },
  };
}

export function createGame(random) {
  return {
    random,
    phase: PHASE_TITLE,
    round: 0,
    deck: createDeck(random),
    discard: [],
    player: createSide(),
    ai: createSide(),
    played: { player: null, ai: null },
    lastTrick: null,
    winner: null,
    log: [],
  };
}

function drawOne(game, side) {
  if (game.deck.length === 0) {
    if (game.discard.length === 0) return;
    game.deck = game.random.shuffle(game.discard);
    game.discard = [];
  }
  side.hand.push(game.deck.pop());
}

function drawUp(game, side) {
  while (side.hand.length < HAND_SIZE) drawOne(game, side);
}

/**
 * Guarantee `side` can play something: if no card in hand is affordable, grant
 * 2 ember and draw a card, a few times. The deck is rich in cheap cards, so
 * this almost never fires — it only stops a dead hand from stalling the duel.
 */
export function ensurePlayable(game, side) {
  for (let tries = 0; tries < 4 && !side.hand.some((card) => canPlay(side, card)); tries += 1) {
    side.ember = Math.min(MAX_EMBER, side.ember + 2);
    drawOne(game, side);
  }
}

/** Deal the opening hands and open round 1. */
export function startGame(game) {
  game.phase = PHASE_SELECT;
  game.round = 1;
  game.deck = createDeck(game.random);
  game.discard = [];
  game.player = createSide();
  game.ai = createSide();
  game.played = { player: null, ai: null };
  game.lastTrick = null;
  game.winner = null;
  game.log = ['Duel dimulai! Turunkan kartumu.'];
  drawUp(game, game.player);
  drawUp(game, game.ai);
  ensurePlayable(game, game.player);
  ensurePlayable(game, game.ai);
}

export function canPlay(side, card) {
  return side.ember >= card.cost;
}

/** Effective strike power of `card` against `foeCard` (0 for shield/heal). */
export function effectivePower(card, foeCard) {
  if (!card || card.kind === KIND_SHIELD || card.kind === KIND_HEAL) return 0;
  if (card.kind === KIND_BURST) return BURST_POWER;
  let power = card.power;
  if (foeCard && foeCard.element && ELEMENT_BEATS[card.element] === foeCard.element) {
    power += ADVANTAGE_BONUS;
  }
  return power;
}

/** Player's score: damage dealt plus 5 per trick won. */
export function scoreOf(side) {
  return side.damageDealt + side.tricks * 5;
}

function spendAndDiscard(game, side, card) {
  const index = side.hand.indexOf(card);
  if (index < 0) throw new Error('card not in hand');
  side.hand.splice(index, 1);
  side.ember -= card.cost;
  game.discard.push(card);
  if (card.element) side.elementPlays[card.element] += 1;
}

function applyDamage(game, target, amount, source) {
  if (amount <= 0) return 0;
  if (target.shield) {
    target.shield = false;
    game.log.push('Perisai Bara menahan serangan!');
    return 0;
  }
  target.life = Math.max(0, target.life - amount);
  source.damageDealt += amount;
  return amount;
}

/**
 * Resolve one round. Both cards must already be chosen; the trick is settled
 * here and the table is set for the next round (or the game ends).
 * Returns the trick record the renderer and the log show.
 */
export function playRound(game, playerCard, aiCard) {
  if (game.phase !== PHASE_SELECT) throw new Error('not the select phase');
  game.played = { player: playerCard, ai: aiCard };
  spendAndDiscard(game, game.player, playerCard);
  spendAndDiscard(game, game.ai, aiCard);

  // Specials land before the strike is measured.
  if (playerCard.kind === KIND_HEAL) {
    game.player.life = Math.min(MAX_LIFE, game.player.life + HEAL_AMOUNT);
    game.log.push(`Kamu memulihkan ${HEAL_AMOUNT} nyawa.`);
  }
  if (aiCard.kind === KIND_HEAL) {
    game.ai.life = Math.min(MAX_LIFE, game.ai.life + HEAL_AMOUNT);
    game.log.push('Lawan memulihkan 6 nyawa.');
  }
  if (playerCard.kind === KIND_SHIELD) game.player.shield = true;
  if (aiCard.kind === KIND_SHIELD) game.ai.shield = true;

  const playerPower = effectivePower(playerCard, aiCard);
  const aiPower = effectivePower(aiCard, playerCard);
  const trick = {
    round: game.round,
    playerCard, aiCard, playerPower, aiPower,
    advantage: null, winner: null, damage: 0, blocked: false,
  };
  if (playerCard.element && aiCard.element && ELEMENT_BEATS[playerCard.element] === aiCard.element) {
    trick.advantage = 'player';
  } else if (aiCard.element && playerCard.element && ELEMENT_BEATS[aiCard.element] === playerCard.element) {
    trick.advantage = 'ai';
  }

  if (playerPower > aiPower) {
    trick.winner = 'player';
    const dealt = applyDamage(game, game.ai, playerPower - aiPower, game.player);
    trick.damage = dealt;
    trick.blocked = dealt === 0 && playerPower - aiPower > 0;
    game.player.tricks += 1;
    game.player.ember = Math.min(MAX_EMBER, game.player.ember + WINNER_EMBER_BONUS);
    game.log.push(`Kamu menang trik! ${playerCard.name} (${playerPower}) mengalahkan ${aiCard.name} (${aiPower}).`);
  } else if (aiPower > playerPower) {
    trick.winner = 'ai';
    const dealt = applyDamage(game, game.player, aiPower - playerPower, game.ai);
    trick.damage = dealt;
    trick.blocked = dealt === 0 && aiPower - playerPower > 0;
    game.ai.tricks += 1;
    game.ai.ember = Math.min(MAX_EMBER, game.ai.ember + WINNER_EMBER_BONUS);
    game.log.push(`Lawan menang trik. ${aiCard.name} (${aiPower}) mengalahkan ${playerCard.name} (${playerPower}).`);
  } else {
    game.log.push(`Seri! Kedua kartu sama kuat (${playerPower}).`);
  }
  game.lastTrick = trick;
  game.phase = PHASE_REVEAL;
  return trick;
}

/** After the reveal animation, move on: refill ember, draw up, next round. */
export function nextRound(game) {
  if (game.phase !== PHASE_REVEAL) throw new Error('not the reveal phase');
  if (game.player.life <= 0 || game.ai.life <= 0) {
    game.phase = PHASE_OVER;
    game.winner = game.ai.life <= 0 && game.player.life > 0 ? 'player'
      : game.player.life <= 0 && game.ai.life > 0 ? 'ai'
      : game.player.life <= 0 && game.ai.life <= 0 ? 'draw' : null;
    if (game.winner === 'player') game.log.push('Kamu memenangkan duel!');
    else if (game.winner === 'ai') game.log.push('Lawan memenangkan duel.');
    else if (game.winner === 'draw') game.log.push('Duel berakhir seri!');
    return;
  }
  game.round += 1;
  game.played = { player: null, ai: null };
  for (const side of [game.player, game.ai]) {
    side.ember = Math.min(MAX_EMBER, side.ember + EMBER_PER_ROUND);
  }
  drawUp(game, game.player);
  drawUp(game, game.ai);
  ensurePlayable(game, game.player);
  ensurePlayable(game, game.ai);
  game.phase = PHASE_SELECT;
}
