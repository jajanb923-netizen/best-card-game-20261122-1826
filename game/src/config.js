// Ember Duel — shared constants: table size, economy, elements and the trick rules.
// One job: every number the rest of the game agrees on lives here.
export const TABLE_WIDTH = 1280;
export const TABLE_HEIGHT = 800;

export const START_LIFE = 30;
export const MAX_LIFE = 30;
export const HAND_SIZE = 5;
export const START_EMBER = 3;
export const MAX_EMBER = 10;
export const EMBER_PER_ROUND = 2;
export const WINNER_EMBER_BONUS = 1;
export const DECK_SIZE = 40;

// The three elements form one cycle: fire scorches leaf, leaf drinks water,
// water douses fire. Playing the advantaged element adds ADVANTAGE_BONUS power.
export const ELEMENTS = {
  FIRE: 'fire',
  LEAF: 'leaf',
  WATER: 'water',
};
export const ELEMENT_BEATS = {
  [ELEMENTS.FIRE]: ELEMENTS.LEAF,
  [ELEMENTS.LEAF]: ELEMENTS.WATER,
  [ELEMENTS.WATER]: ELEMENTS.FIRE,
};
export const ADVANTAGE_BONUS = 3;
export const HEAL_AMOUNT = 6;
export const BURST_POWER = 12;

// Element presentation: name, colour and the shape the renderer draws,
// so an element is told apart by colour AND shape, never by text alone.
export const ELEMENT_STYLE = {
  [ELEMENTS.FIRE]: { name: 'Api', color: '#e8491d', dark: '#8f1d05', light: '#ffb199', glyph: 'flame' },
  [ELEMENTS.LEAF]: { name: 'Daun', color: '#3d9b4f', dark: '#14532d', light: '#b7e4c7', glyph: 'leaf' },
  [ELEMENTS.WATER]: { name: 'Air', color: '#2b7fd4', dark: '#0b3d91', light: '#a8d0f5', glyph: 'drop' },
};

export const CARD_BACK_COLOR = '#7c2d12';
export const TABLE_FELT = '#14532d';
export const TABLE_FELT_DARK = '#0b341c';
export const GOLD = '#f5c542';
export const CREAM = '#fdf6e3';
export const INK = '#241f1a';

export const BEST_KEY = 'ember-duel-best';
