// Ember Duel — keyboard and mouse input. One job: turn presses and clicks into
// game actions, and report the mouse position for hover highlights.
//
// Keyboard: 1-5 select a card in hand, Enter/Space play the selected card,
// Left/Right move the selection, P or Esc pauses, M mutes, Enter/Space also
// starts from the title and end screens. Mouse: hover raises a card, click
// selects it, a second click (or the big "Mainkan" button) plays it.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  const actions = { bits: 0, digit: null, move: 0 };
  const mouse = { x: -1, y: -1, clicked: false, clickX: 0, clickY: 0 };

  function keyDown(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '5') actions.digit = Number(key) - 1;
    else if (key === 'arrowleft') actions.move -= 1;
    else if (key === 'arrowright') actions.move += 1;
    else if (key === ' ' || key === 'enter') {
      actions.bits |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'p' || key === 'escape') actions.bits |= ACTION_PAUSE;
    else if (key === 'm') actions.bits |= ACTION_MUTE;
    keys.add(key);
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  function mouseClick(event) {
    mouseMove(event);
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  }

  window.addEventListener('keydown', keyDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('click', mouseClick);

  return {
    mouse,
    /** Take this frame's queued actions, then clear them. */
    takeActions() {
      const taken = { bits: actions.bits, digit: actions.digit, move: actions.move };
      actions.bits = 0;
      actions.digit = null;
      actions.move = 0;
      return taken;
    },
    /** Take this frame's click, then clear it. */
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
  };
}
