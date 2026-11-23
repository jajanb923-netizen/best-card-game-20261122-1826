// Ember Duel — the screenshot scenes behind ?shot=title|play|win|lose.
// One job: stage a real game state for each screenshot, by playing the real
// rules forward with the autopilots, so every frame is what a genuine game
// looks like and the same seed always gives the same frame.
//
//   title — a fresh table on the title screen.
//   play  — mid-duel: several rounds in, lives reduced, both cards on the
//           table mid-reveal, so the cover shows the full game at a glance.
//   win   — a finished duel the player won, on the win screen.
//   lose  — a finished duel the player lost, on the loss screen.
import { autopilotCard, chooseCard } from './ai.js';
import { nextRound, playRound, startGame, PHASE_OVER, PHASE_SELECT } from './engine.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_ROUNDS = 7;
const GAME_LIMIT_ROUNDS = 120;

/** Play one full round with both autopilots. Returns false if the game ended. */
function playAutopilotRound(game, playerSkill, aiSkill) {
  if (game.phase !== PHASE_SELECT) return false;
  const playerCard = autopilotCard(game, game.player, playerSkill);
  const aiCard = aiSkill === 'ai' ? chooseCard(game) : autopilotCard(game, game.ai, aiSkill);
  if (!playerCard || !aiCard) return false;
  playRound(game, playerCard, aiCard);
  nextRound(game);
  return game.phase !== PHASE_OVER;
}

/**
 * Stage `game` to the named scene and return the screen to draw and the
 * reveal progress to show (1 = cards fully revealed on the table).
 */
export function stageShot(name, game) {
  startGame(game);
  if (name === 'title') {
    game.phase = 'title';
    return { screen: SCREEN_TITLE, revealProgress: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_ROUNDS && game.phase !== PHASE_OVER; i += 1) {
      playAutopilotRound(game, 'strong', 'ai');
    }
    if (game.phase === PHASE_OVER) {
      return { screen: SCREEN_OVER, revealProgress: 1 };
    }
    // One more round, stopped mid-reveal so both cards lie on the table.
    const playerCard = autopilotCard(game, game.player, 'strong');
    const aiCard = chooseCard(game);
    if (playerCard && aiCard) {
      playRound(game, playerCard, aiCard);
      return { screen: SCREEN_PLAY, revealProgress: 1 };
    }
    return { screen: SCREEN_PLAY, revealProgress: 0 };
  }
  const playerSkill = name === 'win' ? 'strong' : 'weak';
  const aiSkill = name === 'win' ? 'weak' : 'strong';
  for (let i = 0; i < GAME_LIMIT_ROUNDS && game.phase !== PHASE_OVER; i += 1) {
    if (name === 'win') playAutopilotRound(game, playerSkill, aiSkill);
    else playAutopilotRound(game, 'weak', 'ai');
  }
  return { screen: SCREEN_OVER, revealProgress: 1 };
}
