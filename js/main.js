/* ---------- personalise here ---------- */
const CONFIG = {
  name: 'Artemiy',
  github: 'https://github.com/',
};

/* ---------- data ---------- */
const DISHES = [
  { id: 'nasi-lemak', name: 'Nasi Lemak', region: 'kl', place: 'Kampung Baru, KL', heat: 2, price: 'RM 6',
    desc: "Coconut rice, sambal, crispy anchovies, peanuts and egg — the country's unofficial national breakfast.",
    tip: 'Ask for "sambal lebih" if you can handle extra chili.' },
  { id: 'roti-canai', name: 'Roti Canai', region: 'penang', place: 'Mamak stalls, Penang', heat: 1, price: 'RM 2.50',
    desc: 'Flaky, hand-flipped flatbread torn apart and dunked in dhal. Tastes best at a 24-hour mamak at 2 a.m.',
    tip: 'Order "roti banjir" — flooded in curry.' },
  { id: 'teh-tarik', name: 'Teh Tarik', region: 'kl', place: 'Every mamak, nationwide', heat: 0, price: 'RM 2.20',
    desc: '"Pulled tea" — poured back and forth from arm\'s length until it wears a thick, frothy crown.',
    tip: 'Say "kurang manis" for less sugar.' },
  { id: 'satay', name: 'Satay Kajang', region: 'kl', place: 'Kajang, Selangor', heat: 1, price: 'RM 1 / stick',
    desc: 'Charcoal-grilled skewers glazed with turmeric and lemongrass, served with chunky peanut sauce.',
    tip: 'Minimum order is usually ten sticks. Nobody stops at ten.' },
  { id: 'cendol', name: 'Cendol', region: 'melaka', place: 'Jonker Street, Melaka', heat: 0, price: 'RM 4',
    desc: 'Shaved ice, pandan jelly, coconut milk and smoky gula Melaka — engineered for 33°C afternoons.',
    tip: 'Add red beans or durian for the full experience.' },
  { id: 'durian', name: 'Musang King', region: 'penang', place: 'Balik Pulau, Penang', heat: 0, price: 'RM 45 / kg',
    desc: 'The King of Fruits. Banned on trains, adored everywhere else. Creamy, bittersweet, unforgettable.',
    tip: 'Eat it at the stall — hotels will not thank you.' },
];

const QUIZ = [
  { q: 'Which drink is famously "pulled" between two cups?', options: ['Kopi O', 'Teh Tarik', 'Milo Dinosaur', 'Sirap Bandung'], a: 1,
    explain: 'Pulling cools the tea and aerates it into that signature foam.' },
  { q: 'What gives cendol its smoky, caramel sweetness?', options: ['Condensed milk', 'Honey', 'Gula Melaka', 'Maple syrup'], a: 2,
    explain: 'Gula Melaka is palm sugar, boiled down over fire.' },
  { q: 'When is a typical mamak stall open?', options: ['Breakfast only', 'Weekends', 'Lunch hours', 'Often 24 hours'], a: 3,
    explain: 'Many mamaks never close — perfect for late-night football and roti.' },
  { q: 'Which fruit is banned on most Malaysian public transport?', options: ['Durian', 'Mangosteen', 'Rambutan', 'Jackfruit'], a: 0,
    explain: 'The smell is legendary. Look for the "No Durian" signs.' },
];

const LEVELS = [
  { min: 0, title: 'Hungry Tourist' },
  { min: 80, title: 'Mamak Regular' },
  { min: 200, title: 'Hawker Hunter' },
  { min: 380, title: 'Pasar Malam Pro' },
  { min: 560, title: 'Makan Master' },
  { min: 750, title: 'Food Sultan' },
];

const ICONS = {
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M17 10h1a3 3 0 0 1 0 6h-2"/><path d="M8 2c0 2 2 2 2 4M12 2c0 2 2 2 2 4"/>',
  brain: '<circle cx="12" cy="12" r="9"/><path d="M9 10a3 3 0 1 1 4 2.8c-.6.3-1 .8-1 1.5V15"/><path d="M12 18h.01"/>',
  map: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  chili: '<path d="M17 4c-1 1-1 2 0 3-4 0-6 3-8 7s-4 6-7 6c6 2 13-1 15-7 1-3 1-5 0-6 1 0 2-1 2-2"/>',
  crown: '<path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5Z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const BADGES = [
  { id: 'first-bite', name: 'First Bite', desc: 'Collect your first dish', icon: 'bowl' },
  { id: 'full-plate', name: 'Full Plate', desc: 'Collect all six dishes', icon: 'star' },
  { id: 'tarik-master', name: 'Tarik Master', desc: 'Land a perfect pour', icon: 'cup' },
  { id: 'quiz-whiz', name: 'Quiz Whiz', desc: 'Ace the quiz 4/4', icon: 'brain' },
  { id: 'explorer', name: 'Explorer', desc: 'Visit every section', icon: 'map' },
  { id: 'chili-hunter', name: 'Chili Hunter', desc: 'Find the hidden chili', icon: 'chili' },
  { id: 'hawker-hunter', name: 'Hawker Hunter', desc: 'Reach level 3', icon: 'crown' },
];

/* ---------- state ---------- */
const KEY = 'makan-quest-v1';
const fresh = () => ({ xp: 0, collected: [], badges: [], tarikXP: 0, quizDone: false, visited: [], pours: 0, perfect: 0 });
let state = fresh();
try { state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let snapshots = {};

/* ---------- XP + levels ---------- */
const levelIndex = (xp) => LEVELS.reduce((idx, l, i) => (xp >= l.min ? i : idx), 0);

function renderHUD() {
  const i = levelIndex(state.xp), cur = LEVELS[i], next = LEVELS[i + 1];
  const pct = next ? ((state.xp - cur.min) / (next.min - cur.min)) * 100 : 100;
  $('#lvlNum').textContent = i + 1;
  $('#lvlTitle').textContent = cur.title;
  $('#xpFill').style.width = pct + '%';
  $('#xpText').textContent = next ? `${state.xp} / ${next.min} XP` : `${state.xp} XP · MAX`;
  $('#xpBar').setAttribute('aria-valuenow', Math.round(pct));
  $('#xpBar').setAttribute('aria-valuetext', `Level ${i + 1}, ${cur.title}, ${state.xp} XP`);
  $('#stampCount').textContent = `${state.collected.length}/${DISHES.length}`;
}

function addXP(n) {
  const before = levelIndex(state.xp);
  state.xp += n;
  const after = levelIndex(state.xp);
  save();
  renderHUD();

  const bar = $('#xpBar').getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = 'xp-pop';
  pop.textContent = `+${n} XP`;
  pop.style.left = bar.left + bar.width / 2 - 24 + 'px';
  pop.style.top = bar.bottom + 6 + 'px';
  document.body.append(pop);
  setTimeout(() => pop.remove(), 1200);

  if (after > before) {
    const chip = $('#lvlChip');
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    toast({ icon: 'crown', title: `Level ${after + 1} — ${LEVELS[after].title}`, sub: 'You levelled up!' });
    confetti();
    if (after >= 2) unlock('hawker-hunter');
  }
}

function unlock(id) {
  if (state.badges.includes(id)) return;
  state.badges.push(id);
  const b = BADGES.find((x) => x.id === id);
  toast({ icon: b.icon, title: `Badge unlocked: ${b.name}`, sub: `${b.desc} · +25 XP` });
  renderPassport();
  addXP(25);
}

/* ---------- toasts + confetti ---------- */
function toast({ icon: ic, img, title, sub }) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${img ? `<img src="${img}" alt="">` : `<span class="t-icon">${icon(ic)}</span>`}<div><b>${title}</b><small>${sub}</small></div>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3400);
}

const cvs = $('#confetti'), ctx = cvs.getContext('2d');
let pieces = [];
function confetti() {
  if (reducedMotion) return;
  cvs.width = innerWidth * devicePixelRatio;
  cvs.height = innerHeight * devicePixelRatio;
  const colors = ['#ffb627', '#ff4d3d', '#3ddc84', '#ff5fa2', '#fbf6ee'];
  for (let i = 0; i < 160; i++) {
    pieces.push({
      x: innerWidth / 2, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, c: colors[i % colors.length], life: 1,
    });
  }
  if (pieces.length === 160) requestAnimationFrame(drawConfetti);
}
function drawConfetti() {
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  pieces = pieces.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of pieces) {
    p.vy += 0.4; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.r * 2));
    ctx.restore();
  }
  if (pieces.length) requestAnimationFrame(drawConfetti);
  else ctx.clearRect(0, 0, innerWidth, innerHeight);
}

/* ---------- collecting ---------- */
let scene3d = null;

function collect(id) {
  const dish = DISHES.find((d) => d.id === id);
  if (state.collected.includes(id)) {
    toast({ img: snapshots[id], icon: 'bowl', title: dish.name, sub: `Already stamped · ${dish.place}` });
    return;
  }
  state.collected.push(id);
  scene3d?.markCollected(id);
  toast({ img: snapshots[id], icon: 'bowl', title: `${dish.name} collected!`, sub: `${dish.place} · +50 XP` });
  updateCard(id);
  renderPassport();
  addXP(50);
  if (state.collected.length === 1) unlock('first-bite');
  if (state.collected.length === DISHES.length) { unlock('full-plate'); confetti(); }
}

/* ---------- menu cards ---------- */
function renderMenu() {
  $('#menuGrid').innerHTML = DISHES.map((d) => `
    <article class="card reveal" data-id="${d.id}" data-region="${d.region}">
      <div class="card-img">
        <span class="placeholder">${d.name[0]}</span>
        <span class="stamp-mark">STAMPED</span>
      </div>
      <div class="card-top"><h3>${d.name}</h3><span class="price">${d.price}</span></div>
      <div class="meta">
        <span>${icon('pin')} ${d.place}</span>
        <span class="heat" aria-label="Heat ${d.heat} of 3">${[0, 1, 2].map((i) => icon('chili').replace('<svg', `<svg class="${i < d.heat ? 'on' : ''}"`)).join('')}</span>
      </div>
      <p>${d.desc}</p>
      <p class="tip">${d.tip}</p>
      <button class="btn btn-primary" data-collect="${d.id}"></button>
    </article>`).join('');
  DISHES.forEach((d) => updateCard(d.id));

  $('#menuGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-collect]');
    if (b) collect(b.dataset.collect);
  });

  // 3D tilt + spotlight
  if (!reducedMotion && matchMedia('(hover: hover)').matches) {
    $$('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => c.setAttribute('aria-pressed', c === chip));
    const f = chip.dataset.filter;
    $$('.card').forEach((c) => c.classList.toggle('hidden', f !== 'all' && c.dataset.region !== f));
  }));
}

function updateCard(id) {
  const card = $(`.card[data-id="${id}"]`);
  if (!card) return;
  const got = state.collected.includes(id);
  card.classList.toggle('collected', got);
  $('[data-collect]', card).innerHTML = got ? `${icon('check')} Stamped` : 'Collect stamp · +50 XP';
}

function applySnapshots() {
  for (const d of DISHES) {
    const src = snapshots[d.id];
    if (!src) continue;
    const box = $(`.card[data-id="${d.id}"] .card-img`);
    box.querySelector('.placeholder')?.remove();
    const img = new Image();
    img.src = src;
    img.alt = `3D model of ${d.name}`;
    box.prepend(img);
  }
  renderPassport();
}

/* ---------- teh tarik mini-game ---------- */
function initTarik() {
  const btn = $('#pourBtn'), fill = $('#fill'), target = $('#target'), status = $('#tarikStatus');
  const pitcher = $('#pitcher'), stream = $('#stream'), splash = $('#splash');
  let level = 0, holding = false, locked = false, last = 0, band = 0, streak = 0;
  const BAND = 11;

  const newRound = () => {
    level = 0; locked = false;
    band = 55 + Math.random() * 25;
    target.style.bottom = band + '%';
    target.style.height = BAND + '%';
    fill.style.height = '0%';
    fill.classList.add('empty');
    status.textContent = 'Hold the button (or Space) to pour.';
  };

  const loop = (now) => {
    if (!holding) return;
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    level += (24 + level * 0.55) * dt;
    fill.style.height = Math.min(level, 100) + '%';
    fill.classList.toggle('empty', level < 2);
    if (level >= 100) return release();
    requestAnimationFrame(loop);
  };

  const start = () => {
    if (holding || locked) return;
    holding = true;
    btn.classList.add('holding'); pitcher.classList.add('pouring'); stream.classList.add('on');
    status.textContent = 'Pouring…';
    last = performance.now();
    requestAnimationFrame(loop);
  };

  const release = () => {
    if (!holding) return;
    holding = false; locked = true;
    btn.classList.remove('holding'); pitcher.classList.remove('pouring'); stream.classList.remove('on');
    state.pours++;
    let word, color, xp = 0;
    const top = band + BAND;
    if (level >= 100) { word = 'TUMPAH!'; color = 'var(--chili)'; status.textContent = 'Spilled everywhere. The uncle is not impressed.'; streak = 0; }
    else if (level >= band && level <= top) {
      word = 'PERFECT!'; color = 'var(--pandan)'; xp = 40; streak++; state.perfect++;
      status.textContent = `Perfect foam! ${streak > 1 ? `${streak} in a row.` : ''}`;
      unlock('tarik-master');
    } else if (level >= band - 7 && level <= top + 7) {
      word = 'SEDAP'; color = 'var(--amber)'; xp = 15; streak = 0;
      status.textContent = level < band ? 'Close — a little more next time.' : 'Close — a touch too much foam.';
    } else { word = 'KURANG'; color = 'var(--muted)'; streak = 0; status.textContent = 'Not enough tea. Keep pulling!'; }

    splash.textContent = word;
    splash.style.color = color;
    splash.classList.remove('show'); void splash.offsetWidth; splash.classList.add('show');

    // cap mini-game XP so the quest stays balanced
    const give = Math.min(xp, 120 - state.tarikXP);
    if (give > 0) { state.tarikXP += give; addXP(give); } else save();
    renderTarikStats(streak);
    setTimeout(newRound, 1400);
  };

  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); start(); });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
  btn.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') release(); });

  newRound();
  renderTarikStats(0);
}
function renderTarikStats(streak) {
  $('#statPours').textContent = state.pours;
  $('#statPerfect').textContent = state.perfect;
  $('#statStreak').textContent = streak;
}

/* ---------- quiz ---------- */
function initQuiz() {
  const box = $('#quizBox');
  let i = 0, results = [];

  const render = () => {
    const bar = `<div class="quiz-progress">${QUIZ.map((_, k) =>
      `<span class="${k < results.length ? (results[k] ? 'done' : 'miss') : k === i ? 'now' : ''}"></span>`).join('')}</div>`;

    if (i >= QUIZ.length) {
      const score = results.filter(Boolean).length;
      box.innerHTML = `${bar}<div class="quiz-result"><div class="big">${score}/${QUIZ.length}</div>
        <h3>${score === QUIZ.length ? 'Certified local. Boleh!' : score >= 2 ? 'Not bad — almost a regular.' : 'Time for more makan research.'}</h3>
        <button class="btn btn-ghost" id="quizRetry">Try again</button></div>`;
      if (!state.quizDone) { state.quizDone = true; save(); }
      if (score === QUIZ.length) unlock('quiz-whiz');
      $('#quizRetry').onclick = () => { i = 0; results = []; render(); };
      return;
    }
    const q = QUIZ[i];
    box.innerHTML = `${bar}<h3>${q.q}</h3>
      <div class="options">${q.options.map((o, k) => `<button class="option" data-k="${k}">${o}</button>`).join('')}</div>
      <p class="explain" hidden></p><div class="quiz-foot"></div>`;
    $$('.option', box).forEach((b) => b.addEventListener('click', () => answer(+b.dataset.k)));
  };

  const answer = (k) => {
    const q = QUIZ[i], ok = k === q.a;
    $$('.option', box).forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.a) b.classList.add('right');
      else if (idx === k) b.classList.add('wrong');
    });
    const ex = $('.explain', box);
    ex.hidden = false;
    ex.textContent = (ok ? 'Correct! ' : 'Not quite. ') + q.explain;
    results.push(ok);
    if (ok && !state.quizDone) addXP(25);
    const next = document.createElement('button');
    next.className = 'btn btn-primary';
    next.textContent = i === QUIZ.length - 1 ? 'See result' : 'Next question';
    next.onclick = () => { i++; render(); };
    $('.quiz-foot', box).append(next);
    next.focus({ preventScroll: true });
  };

  render();
}

/* ---------- passport ---------- */
function renderPassport() {
  $('#stampGrid').innerHTML = DISHES.map((d, k) => {
    const got = state.collected.includes(d.id);
    const img = snapshots[d.id] ? `<img src="${snapshots[d.id]}" alt="">` : '';
    return `<div class="stamp ${got ? 'got' : ''}" style="--rot:${[-8, 5, -3, 7, -6, 4][k]}deg" aria-label="${d.name}: ${got ? 'collected' : 'not collected'}">${img}<span>${d.name}</span></div>`;
  }).join('');
  $('#badgeList').innerHTML = BADGES.map((b) => {
    const on = state.badges.includes(b.id);
    return `<li class="badge ${on ? 'on' : ''}"><span class="badge-icon">${icon(on ? b.icon : 'lock')}</span>
      <div><b>${b.name}</b><small>${b.desc}</small></div></li>`;
  }).join('');
}

/* ---------- section visits + reveal ---------- */
function initObservers() {
  const reveal = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); }
  }), { threshold: 0.12 });
  $$('.section-head, .card, .tarik, .quiz, .passport').forEach((el) => { el.classList.add('reveal'); reveal.observe(el); });

  const sections = $$('[data-section]');
  const visit = new IntersectionObserver((entries) => entries.forEach((en) => {
    const id = en.target.id;
    if (!en.isIntersecting || state.visited.includes(id)) return;
    state.visited.push(id);
    if (id !== 'hero') addXP(10); else save();
    if (sections.every((s) => state.visited.includes(s.id))) unlock('explorer');
  }), { threshold: 0.35 });
  sections.forEach((s) => visit.observe(s));
}

/* ---------- boot ---------- */
async function boot() {
  $('#year').textContent = new Date().getFullYear();
  $('#authorName').textContent = CONFIG.name;
  $('#githubLink').href = CONFIG.github;

  renderMenu();
  renderPassport();
  renderHUD();
  initTarik();
  initQuiz();
  initObservers();

  const chili = $('#chili');
  if (state.badges.includes('chili-hunter')) chili.classList.add('found');
  chili.addEventListener('click', () => { chili.classList.add('found'); unlock('chili-hunter'); });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all XP, stamps and badges?')) return;
    state.collected.forEach((id) => scene3d?.markCollected(id, false));
    state = fresh();
    save();
    DISHES.forEach((d) => updateCard(d.id));
    renderHUD(); renderPassport(); renderTarikStats(0);
    chili.classList.remove('found');
  });

  const tip = $('#tooltip'), hero = $('#hero');
  try {
    const { initScene } = await import('./scene.js');
    scene3d = initScene($('#scene'), {
      dishIds: DISHES.map((d) => d.id),
      reducedMotion,
      reserveEl: $('.hero-copy'),
      onCollect: collect,
      onHover(id, x, y) {
        if (!id) { tip.hidden = true; return; }
        const d = DISHES.find((z) => z.id === id), got = state.collected.includes(id);
        tip.innerHTML = `${d.name}<small>${got ? 'Stamped ✓' : 'Tap to collect · +50 XP'}</small>`;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
        tip.hidden = false;
      },
    });
    snapshots = scene3d.snapshots;
    state.collected.forEach((id) => scene3d.markCollected(id));
    applySnapshots();
  } catch (err) {
    console.warn('3D disabled:', err);
    $('#webglFallback').hidden = false;
    hero.classList.add('no-3d');
  }
}

boot();
