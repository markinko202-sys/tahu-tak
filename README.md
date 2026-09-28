# Makan Quest

A gamified 3D tour of Malaysian hawker food. Tap floating dishes to collect stamps, pour the perfect teh tarik, pass the quiz and level up from **Hungry Tourist** to **Food Sultan**.

## Highlights

- **Three.js scene**: all six dishes (nasi lemak, roti canai, teh tarik, satay, cendol, durian) are built from primitives in code. No 3D files, no images.
- **One WebGL renderer**: it renders the hero scene and also captures the product shots used on the cards and in the passport.
- **Gamification**: XP, 6 levels, 7 badges, stamp passport, confetti and toasts. Progress is saved in `localStorage`.
- **Teh tarik mini-game**: a hold-and-release timing game that works with pointer, touch and keyboard.
- **Accessible and responsive**: keyboard support, visible focus, ARIA progressbar and live regions, `prefers-reduced-motion`, and layouts from 375px phones up to wide desktops. The 3D orbit re-lays itself out around the copy on phones.
- **Zero build step**: vanilla ES modules plus an import map. It deploys to GitHub Pages as is.

## Run locally

```bash
python3 -m http.server 5173
```

Open http://localhost:5173.

## Structure

```
index.html      markup + HUD
css/style.css   design tokens, layout, animations
js/scene.js     Three.js scene, dish models, raycast picking, snapshots
js/main.js      game state, XP/levels/badges, menu, mini-game, quiz
```

Put your name and GitHub link in `CONFIG` at the top of `js/main.js`.
