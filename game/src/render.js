// Ember Duel — everything the eye sees, drawn on one canvas. One job: paint
// the table, the hands, the played cards, the life and ember totals, the
// title, win and loss screens, and the motion that gives the cards weight
// (slides, flips, shake, floating damage numbers, confetti, drifting embers).
//
// Suits are told apart by colour AND shape: each element has its own drawn
// glyph (flame, leaf, drop) and its own colour, and specials have theirs.
import {
  CREAM, ELEMENT_STYLE, GOLD, INK, MAX_EMBER, TABLE_FELT, TABLE_FELT_DARK,
  TABLE_HEIGHT, TABLE_WIDTH,
} from './config.js';
import { KIND_BURST, KIND_HEAL, KIND_SHIELD } from './deck.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const CARD_W = 150;
const CARD_H = 210;
const HAND_W = 140;
const HAND_H = 196;
const ARENA_W = 130;
const ARENA_H = 182;
const MINI_W = 104;
const MINI_H = 146;

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** The element/special glyphs, drawn as vector shapes — the game's own art. */
function drawGlyph(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const s = size / 2;
  ctx.beginPath();
  if (glyph === 'flame') {
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.7, s * 0.5, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.9, -s * 0.2, 0, -s);
    ctx.moveTo(0, s * 0.7);
    ctx.bezierCurveTo(s * 0.35, s * 0.3, s * 0.3, -s * 0.2, 0, -s * 0.45);
    ctx.bezierCurveTo(-s * 0.3, -s * 0.2, -s * 0.35, s * 0.3, 0, s * 0.7);
  } else if (glyph === 'leaf') {
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s, -s * 0.4, s * 0.8, s * 0.8, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.8, -s, -s * 0.4, 0, -s);
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.8);
  } else if (glyph === 'drop') {
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.85, s * 0.1, s * 0.7, s, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s, -s * 0.85, s * 0.1, 0, -s);
  } else if (glyph === 'shield') {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.85, -s * 0.55);
    ctx.lineTo(s * 0.85, s * 0.1);
    ctx.bezierCurveTo(s * 0.85, s * 0.7, s * 0.4, s * 0.95, 0, s);
    ctx.bezierCurveTo(-s * 0.4, s * 0.95, -s * 0.85, s * 0.7, -s * 0.85, s * 0.1);
    ctx.lineTo(-s * 0.85, -s * 0.55);
    ctx.closePath();
  } else if (glyph === 'burst') {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const outer = i % 2 === 0 ? s : s * 0.45;
      const px = Math.cos(angle) * outer;
      const py = Math.sin(angle) * outer;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function cardStyle(card) {
  if (card.kind === KIND_SHIELD) return { name: 'Perisai', color: '#b8860b', dark: '#6b4e00', light: '#f7e08b', glyph: 'shield' };
  if (card.kind === KIND_HEAL) return { name: 'Pulih', color: '#0f766e', dark: '#134e4a', light: '#99f6e4', glyph: 'drop' };
  if (card.kind === KIND_BURST) return { name: 'Liar', color: '#7c3aed', dark: '#4c1d95', light: '#ddd6fe', glyph: 'burst' };
  return ELEMENT_STYLE[card.element];
}

/** One card face. `flip` 0..1 squashes the card horizontally mid-flip. */
function drawCard(ctx, card, x, y, w, h, options = {}) {
  const { faceDown = false, selected = false, hovered = false, dimmed = false, flip = 1 } = options;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(Math.max(0.05, flip), 1);
  ctx.translate(-w / 2, -h / 2);
  const lift = selected ? -18 : hovered ? -10 : 0;
  ctx.translate(0, lift);
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  roundRect(ctx, -3, -3, w, h, 14);
  ctx.fillStyle = faceDown ? '#7c2d12' : CREAM;
  ctx.fill();
  ctx.lineWidth = selected ? 5 : 2;
  ctx.strokeStyle = selected ? GOLD : faceDown ? '#f5c542' : '#8a7a5c';
  ctx.stroke();
  if (faceDown) {
    roundRect(ctx, 10, 10, w - 20, h - 20, 10);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawGlyph(ctx, 'flame', w / 2, h / 2, Math.min(w, h) * 0.42, '#f5c542');
  } else {
    const style = cardStyle(card);
    const scale = w / CARD_W;
    // Colour band with the element glyph and name.
    ctx.fillStyle = style.color;
    roundRect(ctx, 0, 0, w, 44 * scale, 14);
    ctx.fill();
    ctx.fillRect(0, 22 * scale, w, 22 * scale);
    drawGlyph(ctx, style.glyph, 26 * scale, 22 * scale, 26 * scale, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(19 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.name, 44 * scale, 23 * scale);
    // The big number: power, or the special's mark.
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(64 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    if (card.kind === KIND_SHIELD) {
      drawGlyph(ctx, 'shield', w / 2, 96 * scale, 72 * scale, style.color);
      ctx.font = `bold ${Math.round(20 * scale)}px system-ui, sans-serif`;
      ctx.fillText('TAHAN', w / 2, 152 * scale);
    } else if (card.kind === KIND_HEAL) {
      drawGlyph(ctx, 'drop', w / 2, 96 * scale, 72 * scale, style.color);
      ctx.font = `bold ${Math.round(20 * scale)}px system-ui, sans-serif`;
      ctx.fillText('+6 NYAWA', w / 2, 152 * scale);
    } else if (card.kind === KIND_BURST) {
      drawGlyph(ctx, 'burst', w / 2, 96 * scale, 78 * scale, style.color);
      ctx.font = `bold ${Math.round(64 * scale)}px system-ui, sans-serif`;
      ctx.fillText('12', w / 2, 152 * scale);
    } else {
      drawGlyph(ctx, style.glyph, w / 2, 74 * scale, 40 * scale, style.light);
      ctx.fillText(String(card.power), w / 2, 128 * scale);
    }
    // Card name and ember cost.
    ctx.font = `bold ${Math.round(16 * scale)}px system-ui, sans-serif`;
    ctx.fillStyle = '#5b4a35';
    ctx.fillText(card.name, w / 2, 176 * scale);
    for (let i = 0; i < card.cost; i += 1) {
      ctx.beginPath();
      ctx.arc(w / 2 + (i - (card.cost - 1) / 2) * 18 * scale, 196 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#e8491d';
      ctx.fill();
    }
  }
  if (dimmed) {
    roundRect(ctx, 0, 0, w, h, 14);
    ctx.fillStyle = 'rgba(20,20,20,0.55)';
    ctx.fill();
  }
  ctx.restore();
}

function drawLifeBar(ctx, x, y, w, life, max, label, alignRight = false) {
  const h = 26;
  ctx.save();
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fdf6e3';
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.fillText(`${label}  ${life}`, alignRight ? x + w : x, y + h / 2);
  const barX = x;
  const barY = y + h + 4;
  roundRect(ctx, barX, barY, w, 14, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  const ratio = Math.max(0, life / max);
  const grad = ctx.createLinearGradient(barX, 0, barX + w, 0);
  grad.addColorStop(0, '#ef4444');
  grad.addColorStop(1, '#f97316');
  roundRect(ctx, barX, barY, Math.max(14, w * ratio), 14, 7);
  ctx.fillStyle = ratio > 0.25 ? grad : '#ef4444';
  ctx.fill();
  ctx.restore();
  return barY + 14;
}

function drawEmberBar(ctx, x, y, w, ember, max, label) {
  ctx.save();
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5c542';
  ctx.textAlign = 'left';
  ctx.fillText(`${label}  ${ember}/${max}`, x, y);
  const barY = y + 14;
  roundRect(ctx, x, barY, w, 12, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(1, '#f5c542');
  roundRect(ctx, x, barY, Math.max(12, w * (ember / max)), 12, 6);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = TABLE_WIDTH * dpr;
  canvas.height = TABLE_HEIGHT * dpr;
  ctx.scale(dpr, dpr);

  let shakeUntil = 0;
  let shakePower = 0;
  const floaters = [];
  const confetti = [];
  const embers = [];
  for (let i = 0; i < 26; i += 1) {
    embers.push({ x: Math.random() * TABLE_WIDTH, y: Math.random() * TABLE_HEIGHT, r: 1 + Math.random() * 2.5, speed: 8 + Math.random() * 22, drift: (Math.random() - 0.5) * 12 });
  }

  function addFloater(text, x, y, color) {
    floaters.push({ text, x, y, color, life: 1.4 });
  }

  function burstConfetti() {
    const colors = ['#f5c542', '#e8491d', '#3d9b4f', '#2b7fd4', '#fdf6e3'];
    for (let i = 0; i < 120; i += 1) {
      confetti.push({
        x: TABLE_WIDTH / 2 + (Math.random() - 0.5) * 300,
        y: 300 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 420,
        vy: -120 - Math.random() * 260,
        size: 5 + Math.random() * 7,
        color: colors[i % colors.length],
        life: 2.4,
        spin: (Math.random() - 0.5) * 10,
        angle: Math.random() * Math.PI,
      });
    }
  }

  function updateParticles(dt, now) {
    for (const ember of embers) {
      ember.y -= ember.speed * dt;
      ember.x += ember.drift * dt;
      if (ember.y < -10) {
        ember.y = TABLE_HEIGHT + 10;
        ember.x = Math.random() * TABLE_WIDTH;
      }
    }
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      floaters[i].y -= 34 * dt;
      floaters[i].life -= dt;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }
    for (let i = confetti.length - 1; i >= 0; i -= 1) {
      const piece = confetti[i];
      piece.vy += 420 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.spin * dt;
      piece.life -= dt;
      if (piece.life <= 0 || piece.y > TABLE_HEIGHT + 20) confetti.splice(i, 1);
    }
    if (now < shakeUntil) shakePower = Math.max(0, shakePower - dt * 30);
  }

  function drawTableBackground() {
    const grad = ctx.createRadialGradient(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 80, TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 760);
    grad.addColorStop(0, TABLE_FELT);
    grad.addColorStop(1, TABLE_FELT_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    ctx.strokeStyle = 'rgba(245,197,66,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 560, 330, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,197,66,0.18)';
    ctx.beginPath();
    ctx.ellipse(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 480, 270, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const ember of embers) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(ember.y / 40);
      ctx.fillStyle = '#ffb199';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawOpponent(game) {
    const ai = game.ai;
    // Avatar and name.
    ctx.save();
    ctx.beginPath();
    ctx.arc(88, 66, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#7c2d12';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    drawGlyph(ctx, 'flame', 88, 64, 44, '#f5c542');
    ctx.restore();
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sang Penjaga Bara', 140, 52);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#d6c9a8';
    ctx.fillText(`Trik: ${ai.tricks}   •   Perisai: ${ai.shield ? 'AKTIF' : '—'}`, 140, 82);
    drawLifeBar(ctx, 900, 34, 300, ai.life, 30, '❤ NYAWA LAWAN', true);
    drawEmberBar(ctx, 900, 84, 300, ai.ember, MAX_EMBER, 'Bara');
    // Face-down hand.
    const total = MINI_W * ai.hand.length + 10 * (ai.hand.length - 1);
    let x = (TABLE_WIDTH - total) / 2;
    for (let i = 0; i < ai.hand.length; i += 1) {
      drawCard(ctx, ai.hand[i], x, 128, MINI_W, MINI_H, { faceDown: true });
      x += MINI_W + 10;
    }
  }

  function drawPlayerPanel(game, score) {
    const player = game.player;
    // Left column: who you are, your life and your ember — clear of the hand.
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Kamu — Duelis Bara', 40, 576);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#d6c9a8';
    ctx.fillText(`Trik: ${player.tricks}   •   Perisai: ${player.shield ? 'AKTIF' : '—'}`, 40, 604);
    ctx.restore();
    drawLifeBar(ctx, 40, 624, 200, player.life, 30, '❤ NYAWA');
    drawEmberBar(ctx, 40, 676, 200, player.ember, MAX_EMBER, 'Bara');
    // Right column: the big score and the controls, clear of the hand.
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('SKOR', 1240, 576);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(String(score), 1240, 616);
    ctx.fillStyle = '#d6c9a8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Klik kartu 2x = mainkan', 1240, 664);
    ctx.fillText('1-5 + Enter  •  P jeda  •  M bisu', 1240, 688);
    ctx.restore();
  }

  function handGeometry(count) {
    const gap = 14;
    const total = HAND_W * count + gap * (count - 1);
    return { x0: (TABLE_WIDTH - total) / 2, gap };
  }

  function drawPlayerHand(game, view) {
    const { x0, gap } = handGeometry(game.player.hand.length);
    const y = 556;
    game.player.hand.forEach((card, index) => {
      const x = x0 + index * (HAND_W + gap);
      const hovered = view.hoverIndex === index;
      const selected = view.selectedIndex === index;
      const dimmed = game.phase === 'select' && !canPlayNow(game, card);
      drawCard(ctx, card, x, y, HAND_W, HAND_H, { selected, hovered, dimmed });
      if (selected) {
        ctx.save();
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = GOLD;
        ctx.fillText(`[${index + 1}]`, x + HAND_W / 2, y - 34);
        ctx.restore();
      }
    });
    return { x0, y, gap };
  }

  function canPlayNow(game, card) {
    return game.player.ember >= card.cost;
  }

  function drawArena(game, view) {
    const trick = game.lastTrick;
    ctx.save();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fdf6e3';
    ctx.fillText(`— RONDE ${game.round} —`, TABLE_WIDTH / 2, 290);
    ctx.restore();

    const slotY = 306;
    const leftX = TABLE_WIDTH / 2 - ARENA_W - 34;
    const rightX = TABLE_WIDTH / 2 + 34;
    // Empty slots.
    for (const x of [leftX, rightX]) {
      roundRect(ctx, x, slotY, ARENA_W, ARENA_H, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,197,66,0.4)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#d6c9a8';
    ctx.textAlign = 'center';
    ctx.fillText('KAMU', leftX + ARENA_W / 2, slotY + ARENA_H + 16);
    ctx.fillText('LAWAN', rightX + ARENA_W / 2, slotY + ARENA_H + 16);
    ctx.restore();

    if (game.phase === 'reveal' && game.played.player && game.played.ai) {
      const flip = Math.abs(Math.cos(view.revealProgress * Math.PI));
      const slide = Math.min(1, view.revealProgress * 2);
      const playerY = slotY + (1 - slide) * 220;
      const aiY = slotY + (1 - slide) * -160;
      drawCard(ctx, game.played.player, leftX, playerY, ARENA_W, ARENA_H, { flip });
      drawCard(ctx, game.played.ai, rightX, aiY, ARENA_W, ARENA_H, { flip });
      if (view.revealProgress > 0.55 && trick) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(TABLE_WIDTH / 2, slotY + ARENA_H / 2, 44, 0, Math.PI * 2);
        ctx.fillStyle = trick.winner === 'player' ? '#3d9b4f' : trick.winner === 'ai' ? '#e8491d' : '#8a7a5c';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = GOLD;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(trick.winner === 'player' ? 'MENANG' : trick.winner === 'ai' ? 'KALAH' : 'SERI', TABLE_WIDTH / 2, slotY + ARENA_H / 2 - 8);
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`${trick.playerPower} vs ${trick.aiPower}`, TABLE_WIDTH / 2, slotY + ARENA_H / 2 + 18);
        ctx.restore();
        if (trick.advantage) {
          ctx.save();
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = GOLD;
          ctx.fillText('⚡ Keunggulan elemen +3!', TABLE_WIDTH / 2, slotY + ARENA_H + 40);
          ctx.restore();
        }
      }
    } else if (game.phase === 'select') {
      ctx.save();
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fdf6e3';
      ctx.fillText('Pilih kartumu — klik, atau tekan 1-5 lalu Enter', TABLE_WIDTH / 2, slotY + ARENA_H / 2 - 10);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#d6c9a8';
      ctx.fillText('Kartu abu-abu: bara tidak cukup', TABLE_WIDTH / 2, slotY + ARENA_H / 2 + 18);
      ctx.restore();
    }
    // The running commentary sits in the free band under the opponent's
    // hand, clear of the arena, the log never hiding behind a raised card.
    ctx.save();
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d6c9a8';
    const log = game.log[game.log.length - 1] ?? '';
    ctx.fillText(log, 40, 296);
    ctx.restore();
  }

  function drawTitle(game, best) {
    drawTableBackground();
    // Decorative fanned cards.
    const fan = [
      { element: 'fire', power: 9, name: 'Membara', cost: 3, kind: 'attack' },
      { element: 'leaf', power: 7, name: 'Hutan Rimbun', cost: 3, kind: 'attack' },
      { element: 'water', power: 8, name: 'Samudra', cost: 3, kind: 'attack' },
    ];
    fan.forEach((card, i) => {
      ctx.save();
      ctx.translate(TABLE_WIDTH / 2 + (i - 1) * 170, 300);
      ctx.rotate((i - 1) * 0.12);
      drawCard(ctx, { id: -i, ...card }, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      ctx.restore();
    });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(232,73,29,0.8)';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.fillText('EMBER DUEL', TABLE_WIDTH / 2, 130);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('Duel kartu elemen — Api mengalahkan Daun, Daun mengalahkan Air, Air mengalahkan Api', TABLE_WIDTH / 2, 178);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Kamu dan Sang Penjaga Bara sama-sama punya 30 nyawa. Menangkan trik,', TABLE_WIDTH / 2, 560);
    ctx.fillText('kurangi nyawa lawan sampai 0. Kartu kuat butuh bara — kelola baramu!', TABLE_WIDTH / 2, 588);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('Klik atau tekan Spasi untuk mulai', TABLE_WIDTH / 2, 650);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = '#d6c9a8';
    ctx.fillText('1-5 pilih kartu  •  Enter mainkan  •  P jeda  •  M bisu', TABLE_WIDTH / 2, 700);
    if (best > 0) {
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillStyle = '#fdf6e3';
      ctx.fillText(`Skor terbaik: ${best}`, TABLE_WIDTH / 2, 736);
    }
    ctx.restore();
  }

  function drawOver(game, best) {
    const won = game.winner === 'player';
    const draw = game.winner === 'draw';
    ctx.save();
    ctx.fillStyle = 'rgba(5,20,10,0.93)';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    if (won && confetti.length === 0) burstConfetti();
    for (const piece of confetti) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.angle);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.shadowColor = won ? 'rgba(245,197,66,0.9)' : 'rgba(232,73,29,0.8)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = won ? GOLD : '#f87171';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.fillText(draw ? 'SERI!' : won ? 'MENANG!' : 'KALAH', TABLE_WIDTH / 2, 260);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fdf6e3';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(
      draw ? 'Duel berakhir tanpa pemenang — coba lagi!'
        : won ? 'Sang Penjaga Bara tumbang. Mahkota bara milikmu!'
        : 'Sang Penjaga Bara menang kali ini. Balas dendam?',
      TABLE_WIDTH / 2, 330,
    );
    const stats = [
      `Ronde: ${game.round}`,
      `Trik dimenangkan: ${game.player.tricks} — ${game.ai.tricks}`,
      `Damage diberikan: ${game.player.damageDealt}`,
      `Skor: ${scoreOf(game.player)}`,
      `Skor terbaik: ${Math.max(best, scoreOf(game.player))}`,
    ];
    ctx.font = 'bold 22px system-ui, sans-serif';
    stats.forEach((line, i) => ctx.fillText(line, TABLE_WIDTH / 2, 400 + i * 38));
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('Tekan Spasi untuk main lagi', TABLE_WIDTH / 2, 640);
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = 'rgba(5,20,10,0.7)';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('JEDA', TABLE_WIDTH / 2, 360);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Tekan P atau Spasi untuk lanjut', TABLE_WIDTH / 2, 420);
    ctx.restore();
  }

  function drawFloaters() {
    for (const floater of floaters) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, floater.life));
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = floater.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 5;
      ctx.strokeText(floater.text, floater.x, floater.y);
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    }
  }

  function scoreOf(side) {
    return side.damageDealt + side.tricks * 5;
  }

  let lastNow = 0;
  return {
    addFloater,
    burstConfetti,
    shake(seconds, power) {
      shakeUntil = performance.now() / 1000 + seconds;
      shakePower = power;
    },
    handGeometry,
    cardAt(game, x, y) {
      if (game.phase !== 'select') return -1;
      const { x0, gap } = handGeometry(game.player.hand.length);
      for (let i = 0; i < game.player.hand.length; i += 1) {
        const cx = x0 + i * (HAND_W + gap);
        if (x >= cx && x <= cx + HAND_W && y >= 556 - 18 && y <= 556 + HAND_H) return i;
      }
      return -1;
    },
    draw(game, screen, view, best) {
      const now = performance.now() / 1000;
      const dt = lastNow === 0 ? 0.016 : Math.min(0.05, now - lastNow);
      lastNow = now;
      updateParticles(dt, now);
      ctx.save();
      if (now < shakeUntil) {
        ctx.translate((Math.random() - 0.5) * shakePower, (Math.random() - 0.5) * shakePower);
      }
      if (screen === SCREEN_TITLE) {
        drawTitle(game, best);
      } else {
        drawTableBackground();
        drawOpponent(game);
        drawArena(game, view);
        drawPlayerHand(game, view);
        drawPlayerPanel(game, scoreOf(game.player));
        if (screen === SCREEN_OVER) drawOver(game, best);
        if (screen === SCREEN_PAUSED) drawPaused();
      }
      drawFloaters();
      ctx.restore();
    },
  };
}
