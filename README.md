[![make.fun bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/jajanb923-netizen/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/jajanb923-netizen/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

# Ember Duel — Duel Kartu Elemen

Duel kartu orisinal yang dimainkan di browser desktop dari file statis.
Kamu dan **Sang Penjaga Bara** sama-sama punya 30 nyawa. Setiap ronde kalian
menurunkan satu kartu secara bersamaan — kartu yang lebih kuat memenangkan
trik dan mengurangi nyawa lawan sebesar selisih kekuatannya.

## Aturan

- **Tiga elemen, satu siklus:** Api mengalahkan Daun, Daun mengalahkan Air,
  Air mengalahkan Api. Elemen yang diuntungkan mendapat **+3 kekuatan**.
- **Bara (ember):** setiap kartu butuh bara; bara terisi +2 tiap ronde
  (maks 10). Kartu kuat butuh bara banyak — kelola baramu.
- **Kartu spesial:** *Perisai Bara* menahan damage berikutnya,
  *Embun Pulih* memulihkan 6 nyawa, *Ledakan Bara* menyerang 12 tanpa elemen.
- **Menang trik** memberi +1 bara. Nyawa lawan habis = menang.
- **Lawan AI** yang bisa dibaca dan dilawan: ia menyembuhkan diri saat
  terluka, mengincar pukulan mematikan, dan melawan elemen yang paling
  sering kamu mainkan — jadi variasikan kartumu.

## Cara main

Buka `game/index.html` di desktop Chrome (atau `node serve.ts`, lalu
http://localhost:8080). Klik kartu dua kali untuk memainkannya, atau
tekan **1–5** untuk memilih lalu **Enter**. **P** jeda, **M** bisu.
Tanpa network request — semua file lokal.

## Struktur

- `game/src/engine.js` — aturan duel (state machine murni)
- `game/src/deck.js` — definisi 40 kartu
- `game/src/ai.js` — lawan AI + autopilot untuk screenshot
- `game/src/render.js` — gambar meja, kartu, animasi, partikel
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — efek suara dari WebAudio (tanpa file audio)
- `game/src/shots.js` — staging deterministik untuk screenshot
- `game/src/random.js` — RNG dengan seed
- `game/src/config.js` — konstanta bersama
- `game/src/main.js` — boot + loop
