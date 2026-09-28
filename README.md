# Tahu Tak?

A Malaysia trivia game you can eat. Pass a set of questions to win a hawker dish. Keep your dishes or sell them at the daily market for coins, then spend the coins on hints.

## Gameplay

- **4 modes**
  - **Biasa**: 5 questions, pass with 4+, and try to beat your fastest time.
  - **Kilat**: 60-second time attack.
  - **Satu Nyawa**: one life, sudden death.
  - **Harian**: a seeded daily set, the same for everyone and one try per day.
- **6 topics**: food, geography, history, culture, nature, or a mix of all of them. There are 50 fact-checked questions, each with a clue and a follow-up fact.
- **10 dishes** in 4 rarities. Perfect sets and the daily mode improve your odds.
- **Economy**: market prices move every day (seeded by date). You can sell one dish, sell all of one dish, or clear the whole kitchen.
- **5 hints**: 50:50, Ask Auntie (a poll that is right about 80% of the time), Clue, Freeze clock, and Skip. You can stock them up in the shop or buy one mid-game.
- **Records**: best time or score per mode, plus your last 8 runs. Everything is saved in `localStorage`.

## Tech

- **Three.js with a scroll-linked stage**: one fixed WebGL canvas. Each 3D prop is pinned to an empty placeholder in the layout and animated by how far that placeholder has scrolled through the viewport. The props are the Petronas Towers, a tingkat that opens in layers, a flipping coin, a lazy susan of dishes and a blooming hibiscus.
- **Toon shading with ink outlines**, so the models match the printed neo-brutalist UI.
- **All models are built in code from primitives.** The dish images on the cards are rendered once by the same renderer.
- **Vanilla ES modules plus an import map**, so there is no build step. It deploys to GitHub Pages as is.
- **Accessibility**: keyboard play (1–4 to answer, Enter to continue, Esc to quit), a focus-trapped dialog, ARIA radio groups and live regions, and `prefers-reduced-motion` support.

## Run locally

```bash
python3 -m http.server 5173
```

## Structure

```
index.html     page + game dialog
css/style.css  kopitiam neo-brutalist design system
js/data.js     questions, dishes, modes, hints
js/models.js   toon/ink 3D models
js/stage.js    scroll-linked Three.js stage + dish snapshots
js/main.js     game engine, economy, shop, records
```
