// Ember Duel — boot and the one loop. One job: own the screens, the clock and
// the wiring between input, engine, AI, renderer and sound.
//
// ?seed=N fixes the deck order and the AI rolls. ?shot=title|play|win|lose
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
//
// The game moves between four screens: title, play, paused and game over.
// During play a round is: select a card (click, or 1-5 then Enter) → both
// cards are revealed with a slide and a flip → the trick settles, damage
// floats up, and the next round begins.
import { BEST_KEY, START_LIFE } from './config.js';
import { createRandom } from './random.js';
import {
  PHASE_OVER, PHASE_REVEAL, PHASE_SELECT, canPlay, createGame, effectivePower,
  nextRound, playRound, scoreOf, startGame,
} from './engine.js';
import { chooseCard } from './ai.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

const REVEAL_SECONDS = 1.6;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, { selectedIndex: -1, hoverIndex: -1, revealProgress: scene.revealProgress }, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selectedIndex = 0;
  let revealTimer = 0;
  let lastTrickSeen = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function beginGame() {
    startGame(game);
    screen = SCREEN_PLAY;
    selectedIndex = 0;
    revealTimer = 0;
    lastTrickSeen = null;
    announce(`Duel dimulai. ${START_LIFE} nyawa. Pilih kartumu.`);
  }

  function finishGame() {
    screen = SCREEN_OVER;
    const score = scoreOf(game.player);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (game.winner === 'player') {
      audio.winGame();
      renderer.burstConfetti();
      announce(`Menang! Skor ${score}. Skor terbaik ${best}.`);
    } else {
      audio.loseGame();
      announce(`Kalah. Skor ${score}. Skor terbaik ${best}.`);
    }
  }

  function playSelected() {
    if (game.phase !== PHASE_SELECT) return;
    const card = game.player.hand[selectedIndex];
    if (!card || !canPlay(game.player, card)) return;
    const aiCard = chooseCard(game);
    if (!aiCard) return;
    audio.playCard();
    const trick = playRound(game, card, aiCard);
    lastTrickSeen = trick;
    revealTimer = 0;
    if (trick.winner === 'player') {
      audio.winTrick();
      if (trick.damage > 0) {
        audio.damage();
        renderer.shake(0.25, 10);
        renderer.addFloater(`-${trick.damage}`, 640, 420, '#ff6b4a');
      }
    } else if (trick.winner === 'ai') {
      audio.loseTrick();
      if (trick.damage > 0) {
        audio.damage();
        renderer.shake(0.25, 10);
        renderer.addFloater(`-${trick.damage}`, 640, 420, '#ff6b4a');
      }
    } else {
      audio.flip();
    }
    if (card.kind === 'heal' || (game.played.player && game.played.player.kind === 'heal')) audio.heal();
    if (card.kind === 'shield') audio.shield();
    announce(game.log[game.log.length - 1] ?? '');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions.bits & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions.bits & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Jeda.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Lanjut.');
      }
      return;
    }
    if (actions.bits & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) beginGame();
      else if (screen === SCREEN_PLAY) playSelected();
      return;
    }
    if (screen !== SCREEN_PLAY || game.phase !== PHASE_SELECT) return;
    if (actions.digit !== null && actions.digit < game.player.hand.length) {
      selectedIndex = actions.digit;
    }
    if (actions.move !== 0) {
      const count = game.player.hand.length;
      selectedIndex = ((selectedIndex + actions.move) % count + count) % count;
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      beginGame();
      return;
    }
    if (screen !== SCREEN_PLAY || game.phase !== PHASE_SELECT) return;
    const index = renderer.cardAt(game, click.x, click.y);
    if (index < 0) return;
    if (index === selectedIndex) playSelected();
    else selectedIndex = index;
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_PLAY) {
      const hover = renderer.cardAt(game, input.mouse.x, input.mouse.y);
      if (game.phase === PHASE_REVEAL) {
        revealTimer += dt;
        if (revealTimer >= REVEAL_SECONDS) {
          nextRound(game);
          if (game.phase === PHASE_OVER) finishGame();
          else {
            selectedIndex = 0;
            announce('Ronde berikutnya. Pilih kartumu.');
          }
        }
      }
      renderer.draw(game, screen, {
        selectedIndex: game.phase === PHASE_SELECT ? selectedIndex : -1,
        hoverIndex: game.phase === PHASE_SELECT ? hover : -1,
        revealProgress: game.phase === PHASE_REVEAL ? Math.min(1, revealTimer / REVEAL_SECONDS) : 0,
      }, best);
    } else {
      renderer.draw(game, screen, { selectedIndex: -1, hoverIndex: -1, revealProgress: 0 }, best);
    }
  }

  // Leaving the tab pauses a running game rather than letting the AI play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Ember Duel. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
