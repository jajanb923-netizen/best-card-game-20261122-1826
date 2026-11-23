// Ember Duel — sound, synthesised live with WebAudio. One job: every effect
// (a card played, a trick won, damage, a win fanfare) without a single audio file.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  /** One oscillator blip: frequency slides from `from` to `to` over `seconds`. */
  function blip(from, to, seconds, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    playCard() {
      blip(520, 780, 0.09, 'triangle', 0.12);
    },
    flip() {
      blip(900, 500, 0.07, 'sine', 0.08);
    },
    winTrick() {
      blip(523, 523, 0.1, 'triangle', 0.12);
      blip(659, 659, 0.1, 'triangle', 0.12, 0.09);
      blip(784, 784, 0.16, 'triangle', 0.12, 0.18);
    },
    loseTrick() {
      blip(392, 330, 0.12, 'sawtooth', 0.05);
      blip(330, 262, 0.18, 'sawtooth', 0.05, 0.1);
    },
    damage() {
      blip(180, 60, 0.22, 'sawtooth', 0.1);
    },
    heal() {
      blip(440, 880, 0.25, 'sine', 0.09);
    },
    shield() {
      blip(300, 600, 0.15, 'square', 0.05);
    },
    winGame() {
      [523, 659, 784, 1047].forEach((note, i) => blip(note, note, 0.22, 'triangle', 0.12, i * 0.13));
      blip(1319, 1319, 0.4, 'triangle', 0.1, 0.55);
    },
    loseGame() {
      [392, 330, 262, 196].forEach((note, i) => blip(note, note * 0.9, 0.25, 'triangle', 0.1, i * 0.16));
    },
  };
}
