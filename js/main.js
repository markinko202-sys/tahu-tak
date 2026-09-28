import { CATEGORIES, MODES, HINTS, RARITY, DISHES, QUESTIONS } from './data.js';

/* ---------- personalise here ---------- */
const CONFIG = { name: 'markinko202-sys', github: 'https://github.com/markinko202-sys' };

/* ---------- state ---------- */
const KEY = 'tahu-tak-v1';
const fresh = () => ({
  coins: 30,
  inv: {},
  seen: [],
  hints: { fifty: 1, auntie: 1, clue: 1, freeze: 0, skip: 0 },
  best: {},
  runs: [],
  daily: null,
});
let state = fresh();
try { state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let snapshots = {};
let stage = null;

/* ---------- helpers ---------- */
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local
function seeded(str) { // mulberry32 seeded from a string hash
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(a, rnd = Math.random) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fmt = (ms) => {
  const s = Math.max(0, ms) / 1000, m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};
const dish = (id) => DISHES.find((d) => d.id === id);
const mode = (id) => MODES.find((m) => m.id === id);
const cat = (id) => CATEGORIES.find((c) => c.id === id);
const img = (id, alt = '') => (snapshots[id] ? `<img src="${snapshots[id]}" alt="${alt}">` : '');
const marketPrice = (d) => Math.max(1, Math.round(d.price * (0.7 + seeded(today() + d.id)() * 0.7)));
const dishTotal = () => Object.values(state.inv).reduce((a, b) => a + b, 0);

function toast(html, imgId) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${imgId ? img(imgId) : ''}<span>${html}</span>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3000);
}

function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

/* ---------- wallet ---------- */
function renderWallet(what) {
  $('#coinCount').textContent = state.coins;
  $('#gCoins').textContent = state.coins;
  $('#dishCount').textContent = dishTotal();
  if (what === 'coins') { bump($('#coinCount').parentElement); bump($('#gCoins').parentElement); }
  if (what === 'dish') bump($('#dishCount').parentElement);
}
function addCoins(n) { state.coins += n; save(); renderWallet('coins'); renderShop(); }

/* ---------- dishes ---------- */
const ODDS = {
  pass: { common: 70, rare: 25, epic: 5, legendary: 0 },
  perfect: { common: 40, rare: 40, epic: 15, legendary: 5 },
  streak: { common: 60, rare: 30, epic: 8, legendary: 2 },
  daily: { common: 0, rare: 65, epic: 25, legendary: 10 },
};
function rollDish(tier) {
  const w = ODDS[tier];
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  let rarity = 'common';
  for (const [k, v] of Object.entries(w)) { if ((r -= v) < 0) { rarity = k; break; } }
  const pool = DISHES.filter((d) => d.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)].id;
}
function giveDish(id) {
  state.inv[id] = (state.inv[id] || 0) + 1;
  if (!state.seen.includes(id)) {
    state.seen.push(id);
    if (state.seen.length === DISHES.length) setTimeout(() => toast('<b>Makan Trip unlocked!</b> Find it in your kitchen.'), 1200);
  }
  save();
  renderWallet('dish');
  renderKitchen();
}

/* ---------- setup: modes + topics ---------- */
const sel = { mode: 'classic', cat: 'mix' };

function renderSetup() {
  const dailyDone = state.daily === today();
  $('#modeList').innerHTML = MODES.map((m) => `
    <button class="mode" role="radio" aria-checked="${sel.mode === m.id}" data-mode="${m.id}"
      ${m.id === 'daily' && dailyDone ? 'aria-disabled="true"' : ''}>
      <b>${m.name}</b><small>${m.en}</small><span>${m.id === 'daily' && dailyDone ? 'Done for today. Come back tomorrow for a new set.' : m.rule}</span>
    </button>`).join('');
  $('#catList').innerHTML = CATEGORIES.map((c) => `
    <button class="cat" role="radio" aria-checked="${sel.cat === c.id}" data-cat="${c.id}" ${sel.mode === 'daily' ? 'disabled' : ''}>
      ${c.name}<small>${c.en}</small></button>`).join('');
  const best = state.best[sel.mode];
  const notes = {
    classic: best ? `your best: ${fmt(best)} — beat it!` : 'pass the set in under 40s for bonus coins',
    blitz: best ? `your record: ${best} correct` : 'quick quick, no time to think',
    survival: best ? `longest run: ${best}` : 'one mistake and balik rumah',
    daily: dailyDone ? 'already played today' : 'rare dish or better if you pass',
  };
  $('#startNote').textContent = notes[sel.mode];
  $('#startBtn').disabled = sel.mode === 'daily' && dailyDone;
}

$('#modeList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b || b.getAttribute('aria-disabled') === 'true') return;
  sel.mode = b.dataset.mode;
  renderSetup();
});
$('#catList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  sel.cat = b.dataset.cat;
  renderSetup();
});

/* =========================================================
   game engine
   ========================================================= */
let run = null;
const game = $('#game');
const poolFor = (c) => QUESTIONS.map((_, i) => i).filter((i) => c === 'mix' || QUESTIONS[i].c === c);
const isSet = (m) => m === 'classic' || m === 'daily';

function startGame() {
  const m = sel.mode;
  if (m === 'daily' && state.daily === today()) return;
  const c = m === 'daily' ? 'mix' : sel.cat;
  const pool = m === 'daily' ? shuffle(poolFor('mix'), seeded('daily' + today())) : shuffle(poolFor(c));
  run = {
    mode: m, cat: c, pool,
    total: isSet(m) ? 5 : Infinity,
    n: 0, correct: 0, streak: 0, results: [], won: [], coinsWon: 0,
    elapsed: 0, last: performance.now(), frozenUntil: 0, paused: true,
    q: null, used: {}, locked: false, pending: null, over: false,
  };
  if (m === 'daily') { state.daily = today(); save(); renderSetup(); }

  game.hidden = false;
  document.body.style.overflow = 'hidden';
  stage?.pause(true);
  $('#gResult').hidden = true;
  $('#gPlay').hidden = false;
  $('#gMode').textContent = mode(m).name;
  $('#gTimer').className = 'g-timer';
  $('#gTimer').textContent = fmt(m === 'blitz' ? 60000 : 0);
  nextQuestion();
  requestAnimationFrame(loop);
}

function draw() {
  if (!run.pool.length) run.pool = shuffle(poolFor(run.cat).filter((i) => i !== run.q)); // endless modes refill
  return run.pool.shift();
}

function nextQuestion() {
  clearTimeout(run.pending);
  if (run.n >= run.total) return endGame();
  run.q = draw();
  run.used = {};
  run.locked = false;
  renderQuestion();
  run.paused = false;
  run.last = performance.now();
}

function renderQuestion() {
  const q = QUESTIONS[run.q];
  $('#gCat').textContent = `${cat(q.c).name} · ${cat(q.c).en}`;
  const h = $('#gQuestion');
  h.textContent = q.q;
  $('#gOptions').innerHTML = q.o.map((o, k) =>
    `<button class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${o}</span></button>`).join('');
  $('#gClue').hidden = true;
  $('#gFeedback').innerHTML = '';
  renderHints();
  renderProgress();
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}

function renderProgress() {
  const el = $('#gProgress');
  if (isSet(run.mode)) {
    el.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<i class="${i < run.results.length ? (run.results[i] ? 'ok' : 'no') : i === run.n ? 'now' : ''}"></i>`).join('');
  } else {
    const inFive = run.correct % 5;
    el.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < inFive ? 'ok' : i === inFive ? 'now' : ''}"></i>`).join('') +
      `<i class="count">${run.correct} ✓</i>`;
  }
}

function loop(now) {
  if (!run || run.over) return;
  const dt = now - run.last;
  run.last = now;
  const frozen = now < run.frozenUntil;
  if (!run.paused && !frozen) run.elapsed += dt;
  const t = $('#gTimer');
  if (run.mode === 'blitz') {
    const left = 60000 - run.elapsed;
    t.textContent = fmt(left);
    t.classList.toggle('low', left < 10000 && !frozen);
    if (left <= 0) { endGame(); return; }
  } else {
    t.textContent = fmt(run.elapsed);
  }
  t.classList.toggle('frozen', frozen);
  requestAnimationFrame(loop);
}

function answer(k) {
  if (!run || run.locked || run.over) return;
  const btn = $(`.opt[data-k="${k}"]`);
  if (!btn || btn.disabled) return;
  run.locked = true;
  run.paused = true;
  const q = QUESTIONS[run.q], ok = k === q.a;
  $$('.opt').forEach((b) => {
    b.disabled = true;
    if (+b.dataset.k === q.a) b.classList.add('right');
    else if (+b.dataset.k === k) b.classList.add('wrong');
  });
  const yes = ['Betul!', 'Pandai!', 'Syok!', 'Steady!'], no = ['Alamak!', 'Aiyo…', 'Salah!', 'Adoi!'];
  const word = (ok ? yes : no)[Math.floor(Math.random() * 4)];
  $('#gFeedback').innerHTML = `<b class="${ok ? 'yes' : 'nope'}">${word}</b>${q.fact}`;

  run.n++;
  run.results.push(ok);
  if (ok) {
    run.correct++;
    run.streak++;
    run.coinsWon += 2;
    addCoins(2);
    if (!isSet(run.mode) && run.correct % 5 === 0) {
      const id = rollDish('streak');
      giveDish(id);
      run.won.push(id);
      toast(`<b>${dish(id).name}</b> for 5 correct!`, id);
    }
  } else {
    run.streak = 0;
  }
  renderProgress();
  renderHints();

  const fast = run.mode === 'blitz';
  const delay = ok ? (fast ? 700 : 1500) : (fast ? 1300 : 2600);
  if (!ok && run.mode === 'survival') { run.pending = setTimeout(endGame, delay); return; }
  run.pending = setTimeout(nextQuestion, delay);
}

function proceed() { // Enter / click during feedback skips the wait
  if (!run || !run.locked || run.over) return;
  clearTimeout(run.pending);
  const last = run.results[run.results.length - 1];
  if (!last && run.mode === 'survival') endGame(); else nextQuestion();
}

/* ---------- hints ---------- */
function renderHints() {
  if (!run) return;
  $('#gHints').innerHTML = HINTS.map((h) => {
    const owned = state.hints[h.id] || 0;
    const usable = !run.locked && !run.used[h.id] && (owned > 0 || state.coins >= h.price);
    const tag = owned > 0 ? `<span class="tag">×${owned}</span>` : `<span class="tag buy">${h.price}c</span>`;
    return `<button class="hint-btn" data-hint="${h.id}" ${usable ? '' : 'disabled'}
      aria-label="${h.name}: ${owned > 0 ? `${owned} left` : `buy for ${h.price} coins`}">${h.name}${tag}</button>`;
  }).join('');
}

function useHint(id) {
  if (!run || run.locked || run.used[id]) return;
  const h = HINTS.find((x) => x.id === id);
  if (state.hints[id] > 0) state.hints[id]--;
  else if (state.coins >= h.price) { state.coins -= h.price; renderWallet('coins'); }
  else return;
  run.used[id] = true;
  save();
  renderShop();

  const q = QUESTIONS[run.q];
  const opts = $$('.opt');
  const live = () => opts.filter((b) => !b.disabled).map((b) => +b.dataset.k);
  switch (id) {
    case 'fifty': {
      shuffle(live().filter((k) => k !== q.a)).slice(0, 2).forEach((k) => {
        const b = opts[k];
        b.disabled = true;
        b.classList.add('gone');
      });
      break;
    }
    case 'auntie': {
      const alive = live();
      const wrong = alive.filter((k) => k !== q.a);
      const pick = Math.random() < 0.8 || !wrong.length ? q.a : wrong[Math.floor(Math.random() * wrong.length)];
      const votes = {};
      let left = 100 - (votes[pick] = 45 + Math.floor(Math.random() * 26));
      const rest = alive.filter((k) => k !== pick);
      rest.forEach((k, i) => { votes[k] = i === rest.length - 1 ? left : Math.floor(Math.random() * left * 0.7); left -= votes[k]; });
      opts.forEach((b) => {
        const k = +b.dataset.k;
        if (!(k in votes)) return;
        b.insertAdjacentHTML('beforeend', `<span class="poll-label">${votes[k]}%</span><span class="poll" style="width:0"></span>`);
        requestAnimationFrame(() => { $('.poll', b).style.width = votes[k] + '%'; });
      });
      $('#gFeedback').innerHTML = `<b>Makcik says:</b> "${q.o[pick]}, confirm!"`;
      break;
    }
    case 'clue':
      $('#gClue').textContent = q.clue;
      $('#gClue').hidden = false;
      break;
    case 'freeze':
      run.frozenUntil = performance.now() + 10000;
      $('#gTimer').classList.add('frozen');
      toast('Clock frozen for 10 seconds');
      break;
    case 'skip':
      run.q = draw();
      renderQuestion();
      run.used = { skip: true };
      break;
  }
  renderHints();
}

/* ---------- end of run ---------- */
function endGame() {
  if (!run || run.over) return;
  run.over = true;
  clearTimeout(run.pending);
  const m = run.mode;
  let bonus = 0, tier = null, pb = false, verdict;

  if (isSet(m)) {
    if (run.correct >= 4) tier = m === 'daily' ? 'daily' : run.correct === 5 ? 'perfect' : 'pass';
    if (tier) {
      const id = rollDish(tier);
      giveDish(id);
      run.won.push(id);
      bonus += run.correct === 5 ? 10 : 5;
      if (run.elapsed < 40000) bonus += 8;
      if (m === 'daily') bonus += run.correct * 2; // double answer coins
      if (!state.best[m] || run.elapsed < state.best[m]) { state.best[m] = Math.round(run.elapsed); pb = true; }
    }
    verdict = run.correct === 5 ? 'Terror lah! A perfect set.' : run.correct === 4 ? 'Boleh! Here’s your makan.'
      : run.correct === 3 ? 'Aiyo, so close. One more right and you’d have eaten.' : 'Time to go back to the mamak and study.';
  } else {
    if (!state.best[m] || run.correct > state.best[m]) { state.best[m] = run.correct; pb = run.correct > 0; }
    verdict = m === 'blitz' ? `${run.correct} right in 60 seconds.` : run.correct >= 10 ? 'That’s a proper streak.' : 'One life only, lah.';
  }
  if (bonus) addCoins(bonus);
  run.coinsWon += bonus;

  state.runs.unshift({ mode: m, cat: run.cat, score: isSet(m) ? `${run.correct}/5` : `${run.correct}`, time: Math.round(run.elapsed), won: run.won.length, at: Date.now() });
  state.runs = state.runs.slice(0, 8);
  save();
  renderRecords();
  renderSetup();

  const cards = run.won.slice(0, 3).map((id) => {
    const d = dish(id);
    return `<div class="reward"><div class="front">${img(id, d.name)}<b>${d.name}</b><span class="rarity r-${d.rarity}">${RARITY[d.rarity].label}</span></div><div class="back">?</div></div>`;
  }).join('');
  const extra = run.won.length > 3 ? `<p class="no-reward">+${run.won.length - 3} more in your kitchen</p>` : '';

  $('#gPlay').hidden = true;
  const r = $('#gResult');
  r.hidden = false;
  r.innerHTML = `
    <div class="res-score">${isSet(m) ? `${run.correct}/5` : run.correct}</div>
    <p class="res-verdict">${verdict}</p>
    <div class="res-stats">
      <span>Time ${fmt(run.elapsed)}</span>
      <span>+${run.coinsWon} coins</span>
      ${pb ? '<span class="pb">New personal best!</span>' : ''}
    </div>
    ${cards ? `<div class="rewards">${cards}</div>${extra}` : '<p class="no-reward">No dish this time. The uncle shakes his head.</p>'}
    <div class="res-actions">
      ${m === 'daily' ? '' : '<button class="btn btn-red" id="rAgain">Main lagi</button>'}
      <button class="btn btn-yellow" id="rKitchen">Go to kitchen</button>
      <button class="btn btn-paper" id="rClose">Close</button>
    </div>`;
  $('#rAgain')?.addEventListener('click', () => startGame());
  $('#rKitchen').addEventListener('click', () => { closeGame(); $('#kitchen').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); });
  $('#rClose').addEventListener('click', closeGame);
  ($('#rAgain') || $('#rKitchen')).focus();
}

function closeGame() {
  if (run) { clearTimeout(run.pending); run.over = true; }
  run = null;
  game.hidden = true;
  document.body.style.overflow = '';
  stage?.pause(false);
  $('#startBtn').focus({ preventScroll: true });
}

function quit() {
  if (run && !run.over) {
    if (!confirm(`Quit this run? It won’t be saved${run.mode === 'daily' ? ', and today’s daily set is used up' : ''}.`)) return;
  }
  closeGame();
}

/* ---------- game input ---------- */
$('#startBtn').addEventListener('click', () => startGame());
$('#gQuit').addEventListener('click', quit);
$('#gOptions').addEventListener('click', (e) => {
  const b = e.target.closest('.opt');
  if (b) answer(+b.dataset.k);
});
$('#gHints').addEventListener('click', (e) => {
  const b = e.target.closest('[data-hint]');
  if (b) useHint(b.dataset.hint);
});
$('#gPlay').addEventListener('click', (e) => {
  if (run?.locked && !e.target.closest('button')) proceed();
});
document.addEventListener('keydown', (e) => {
  if (game.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); quit(); return; }
  if (run && !run.over) {
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); return; }
    if (e.key === 'Enter' && run.locked) { e.preventDefault(); proceed(); return; }
  }
  if (e.key === 'Tab') { // keep focus inside the dialog
    const f = $$('button:not([disabled]), [tabindex="-1"]', game).filter((el) => el.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* =========================================================
   kitchen
   ========================================================= */
function renderKitchen() {
  let value = 0;
  $('#kitchenGrid').innerHTML = DISHES.map((d) => {
    const n = state.inv[d.id] || 0, known = state.seen.includes(d.id);
    const p = marketPrice(d), diff = Math.round(((p - d.price) / d.price) * 100);
    value += n * p;
    return `<article class="dish ${known ? '' : 'locked'}">
      <div class="dish-img">${img(d.id, known ? d.name : 'Undiscovered dish')}
        <span class="rarity r-${d.rarity}">${RARITY[d.rarity].label}</span>
        ${n ? `<span class="qty" aria-label="${n} in kitchen">×${n}</span>` : ''}
      </div>
      <h3>${known ? d.name : ''}</h3>
      <p>${known ? d.blurb : 'Win a set to discover this dish.'}</p>
      <div class="price-row"><span>Today <b>${p}c</b></span>
        <span class="${diff >= 0 ? 'trend-up' : 'trend-down'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}%</span></div>
      <div class="dish-actions">
        <button class="btn btn-yellow" data-sell="${d.id}" data-n="1" ${n ? '' : 'disabled'}>Sell 1</button>
        <button class="btn btn-paper" data-sell="${d.id}" data-n="${n}" ${n > 1 ? '' : 'disabled'}>Sell all</button>
      </div>
    </article>`;
  }).join('');
  $('#kitchenValue').textContent = value;
  renderTrip();
  $('#collectionNote').textContent = `You’ve discovered ${state.seen.length} of ${DISHES.length} dishes.`;
  $('#sellAll').disabled = !dishTotal();
}

/* ---------- Makan Trip (unlocks with the full collection; ?preview skips the grind) ---------- */
const PREVIEW = new URLSearchParams(location.search).has('preview');
function renderTrip() {
  const card = $('#tripCard');
  const open = PREVIEW || state.seen.length === DISHES.length;
  card.classList.toggle('locked', !open);
  card.href = PREVIEW ? 'drive.html?preview=1' : 'drive.html';
  card.setAttribute('aria-disabled', String(!open));
  $('#tripBadge').textContent = PREVIEW ? 'Preview' : open ? 'Unlocked' : `${state.seen.length}/${DISHES.length}`;
  $('#tripText').textContent = open
    ? 'Drive around the city, stop at the cafés to taste your dishes, then race the streets.'
    : 'Collect all 10 dishes to unlock a drive around the city.';
}
$('#tripCard').addEventListener('click', (e) => { if ($('#tripCard').classList.contains('locked')) e.preventDefault(); });

function sell(id, n) {
  const have = state.inv[id] || 0;
  n = Math.min(n, have);
  if (!n) return;
  const d = dish(id), earned = marketPrice(d) * n;
  state.inv[id] = have - n;
  addCoins(earned);
  renderKitchen();
  renderWallet('coins');
  toast(`Sold ${n}× ${d.name} for <b>${earned} coins</b>`, id);
}

$('#kitchenGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sell]');
  if (b) sell(b.dataset.sell, +b.dataset.n);
});
$('#sellAll').addEventListener('click', () => {
  const total = DISHES.reduce((s, d) => s + (state.inv[d.id] || 0) * marketPrice(d), 0);
  if (!total || !confirm(`Sell every dish for ${total} coins?`)) return;
  DISHES.forEach((d) => { state.inv[d.id] = 0; });
  addCoins(total);
  renderKitchen();
  renderWallet('coins');
  toast(`Kitchen cleared for <b>${total} coins</b>`);
});

/* =========================================================
   shop
   ========================================================= */
const BADGE = { fifty: '50:50', auntie: 'MAK', clue: '?', freeze: '10s', skip: '»' };
function renderShop() {
  $('#shopList').innerHTML = HINTS.map((h) => `
    <div class="hint-card">
      <span class="hint-badge" aria-hidden="true">${BADGE[h.id]}</span>
      <div><b>${h.name}</b><small>${h.malay}</small><p>${h.desc}</p></div>
      <div class="hint-buy">
        <span class="owned">Owned: ${state.hints[h.id] || 0}</span>
        <button class="btn btn-small btn-red" data-buy="${h.id}" ${state.coins >= h.price ? '' : 'disabled'}>Buy · ${h.price}c</button>
      </div>
    </div>`).join('');
}
$('#shopList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (!b) return;
  const h = HINTS.find((x) => x.id === b.dataset.buy);
  if (state.coins < h.price) return;
  state.coins -= h.price;
  state.hints[h.id] = (state.hints[h.id] || 0) + 1;
  save();
  renderWallet('coins');
  renderShop();
  toast(`Bought <b>${h.name}</b>. You now have ${state.hints[h.id]}.`);
});

/* =========================================================
   records
   ========================================================= */
function renderRecords() {
  const b = state.best;
  const lastDaily = state.runs.find((r) => r.mode === 'daily' && new Date(r.at).toLocaleDateString('en-CA') === today());
  $('#bestList').innerHTML = [
    ['Biasa', b.classic ? fmt(b.classic) : '—', 'fastest passing set'],
    ['Kilat', b.blitz ?? '—', 'most correct in 60s'],
    ['Satu Nyawa', b.survival ?? '—', 'longest streak'],
    ['Harian', lastDaily ? lastDaily.score : state.daily === today() ? 'quit' : 'open', lastDaily ? `today in ${fmt(lastDaily.time)}` : 'today’s set'],
  ].map(([k, v, s]) => `<div class="best-card"><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join('');

  $('#runList').innerHTML = state.runs.length
    ? state.runs.map((r) => `<tr><td>${mode(r.mode).name}</td><td>${cat(r.cat).name}</td><td>${r.score}</td><td>${fmt(r.time)}</td><td>${r.won ? `${r.won} dish${r.won > 1 ? 'es' : ''}` : '—'}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">no runs yet — go play lah</td></tr>';
}

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('Wipe all coins, dishes, hints and records?')) return;
  state = fresh();
  save();
  renderAll();
});

/* ---------- boot ---------- */
function renderAll() {
  renderWallet();
  renderSetup();
  renderKitchen();
  renderShop();
  renderRecords();
}

$('#authorName').textContent = CONFIG.name;
$('#githubLink').href = CONFIG.github;
renderAll();

try {
  const { initStage } = await import('./stage.js');
  stage = initStage($('#stage'), { dishIds: DISHES.map((d) => d.id), reducedMotion });
  snapshots = stage.snapshots;
  renderKitchen();
} catch (err) {
  console.warn('3D disabled:', err);
}
