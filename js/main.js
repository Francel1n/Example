import { Negotiation, todayInfo, fmtMoney, MAX_ROUNDS } from './engine.js';
import { TACTICS, gradeFor } from './data.js';
import { loadStats, recordResult, saveGameLog, loadGameLog } from './storage.js';
import { track } from './analytics.js';
import { buildShareGrid, buildShareText, shareResult } from './share.js';

const $ = (id) => document.getElementById(id);
const chat = $('chat');
const controls = $('controls');
const SITE_URL = 'https://' + (location.host || 'lowball.game') + location.pathname.replace(/index\.html$/, '');

let game = null;
let actionLog = []; // replayable action log for the daily game
let selectedTactic = null;
let today = todayInfo();

// ---------- Chat rendering ----------

function addMsg(role, html) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = html;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function sellerSays(text, instant = false) {
  const priced = text.replace(/€[\d,]+/g, (m) => `<span class="price">${m}</span>`);
  if (instant) {
    addMsg('seller', priced);
    return Promise.resolve();
  }
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<i></i><i></i><i></i>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;
  return new Promise((resolve) => {
    setTimeout(() => {
      typing.remove();
      addMsg('seller', priced);
      resolve();
    }, 650 + Math.random() * 500);
  });
}

function playerSays(tacticId, amount) {
  const t = TACTICS.find((x) => x.id === tacticId);
  addMsg('player', `${t ? t.emoji + ' ' : ''}<span class="price">${fmtMoney(amount)}</span>`);
}

// ---------- HUD ----------

function refreshHud() {
  const closed = game.status === 'deal';
  $('deal-price-label').textContent = closed ? 'paid ✓' : 'asking';
  $('deal-ask').textContent = fmtMoney(closed ? game.price : game.ask);
  $('seller-mood').textContent = game.moodEmoji;
  $('rounds-left').textContent =
    game.status === 'open' ? `${MAX_ROUNDS - game.round} offer${MAX_ROUNDS - game.round === 1 ? '' : 's'} left` : '';
  $('btn-accept').textContent = `Take their price · ${fmtMoney(game.ask)}`;
  const askEl = $('deal-ask');
  askEl.classList.remove('bump');
  void askEl.offsetWidth;
  askEl.classList.add('bump');
}

function renderTactics() {
  const wrap = $('tactics');
  wrap.innerHTML = '';
  for (const t of TACTICS) {
    const btn = document.createElement('button');
    btn.className = 'tactic';
    if ((game.tacticUse[t.id] || 0) >= 2) btn.classList.add('used-out');
    if (selectedTactic === t.id) btn.classList.add('selected');
    btn.innerHTML = `<span class="t-emoji">${t.emoji}</span><span>${t.label}</span>`;
    btn.addEventListener('click', () => {
      selectedTactic = t.id;
      $('tactic-hint').textContent = t.hint;
      renderTactics();
      updateOfferButton();
    });
    wrap.appendChild(btn);
  }
}

function updateOfferButton() {
  const val = parseInt($('offer-input').value, 10);
  $('btn-offer').disabled = !selectedTactic || !Number.isFinite(val) || val <= 0;
}

function setControlsForStatus() {
  const finalMode = game.status === 'final';
  const over = ['deal', 'bust', 'walked'].includes(game.status);
  $('tactics').classList.toggle('hidden', finalMode || over);
  document.querySelector('.offer-row').classList.toggle('hidden', finalMode || over);
  $('tactic-hint').classList.toggle('hidden', over);
  if (finalMode) {
    $('tactic-hint').textContent = 'Final offer on the table. Take it or leave it.';
    $('btn-accept').textContent = `Accept final price · ${fmtMoney(game.ask)}`;
  }
  $('btn-accept').classList.toggle('hidden', over);
  $('btn-walk').classList.toggle('hidden', !finalMode);
  $('endgame').classList.toggle('hidden', !over);
}

// ---------- Game flow ----------

function startGame(mode, seedStr, gameNo, savedActions = null) {
  game = new Negotiation(seedStr, gameNo, mode);
  actionLog = [];
  selectedTactic = null;
  chat.innerHTML = '';
  $('offer-input').value = '';
  $('tactic-hint').textContent = 'Pick a tactic, then name your price.';

  $('deal-emoji').textContent = game.scenario.emoji;
  $('deal-title').textContent = game.scenario.title;
  $('deal-sub').textContent = game.scenario.sub;
  $('seller-name').textContent =
    game.scenario.seller + (mode === 'practice' ? ' · practice 🎲' : ` · #${gameNo}`);

  sellerSays(game.greeting(), !!savedActions);

  if (savedActions) {
    for (const a of savedActions) applyAction(a, true);
    actionLog = savedActions.slice();
  } else {
    track('game_started', {
      mode,
      game_number: gameNo,
      scenario: game.scenario.id,
      personality: game.persona.id,
    });
  }

  renderTactics();
  refreshHud();
  setControlsForStatus();
  updateOfferButton();
}

function applyAction(action, instant = false) {
  let result = null;
  if (action.type === 'offer') {
    playerSays(action.tactic, action.amount);
    result = game.makeOffer(action.tactic, action.amount);
  } else if (action.type === 'acceptAsk') {
    addMsg('player', `🤝 Deal at <span class="price">${fmtMoney(game.ask)}</span>`);
    result = game.acceptAsk();
  } else if (action.type === 'walk') {
    addMsg('player', '🚶 I\'m out. Good luck with it.');
    game.walkAway();
  }

  const after = () => {
    if (result && result.line) sellerSays(result.line, instant);
    if (game.status === 'walked') addMsg('system', 'You walked away with your wallet intact.');
    refreshHud();
    setControlsForStatus();
    renderTactics();
    if (['deal', 'bust', 'walked'].includes(game.status)) onGameOver(instant);
  };
  instant ? after() : setTimeout(after, 50);
  return result;
}

function doAction(action) {
  const result = applyAction(action, false);
  if (game.mode === 'daily') {
    actionLog.push(action);
    saveGameLog(game.gameNo, actionLog);
  }
  if (action.type === 'offer') {
    track('offer_made', {
      mode: game.mode,
      round: game.round,
      tactic: action.tactic,
      offer_ratio: +(action.amount / game.list).toFixed(3),
      result: result ? result.type : 'unknown',
    });
  }
}

function onGameOver(instant) {
  const score = game.score();
  if (game.status === 'deal') {
    track('deal_closed', {
      mode: game.mode, score,
      rounds: game.round,
      price_ratio: +(game.price / game.list).toFixed(3),
      game_number: game.gameNo,
    });
  } else if (game.status === 'bust') {
    track('negotiation_busted', { mode: game.mode, rounds: game.round, game_number: game.gameNo });
  } else {
    track('walked_away', { mode: game.mode, game_number: game.gameNo });
  }
  if (game.mode === 'daily') recordResult(game.gameNo, score, game.status === 'deal');
  if (!instant) setTimeout(showResults, 900);
}

// ---------- Results ----------

function showResults() {
  const score = game.score();
  const grade = game.status === 'walked'
    ? { label: 'Walked Away', emoji: '🚶' }
    : gradeFor(score);

  $('result-title').textContent =
    game.status === 'deal' ? 'Deal closed! 🤝'
      : game.status === 'bust' ? 'They stormed off 💥'
      : 'No deal 🚶';
  $('result-score').textContent = score;
  $('result-grade').textContent = `${grade.emoji} ${grade.label}`;

  const floorLine = `Their secret floor was ${fmtMoney(game.floor)} (asking ${fmtMoney(game.list)}).`;
  $('result-detail').textContent =
    game.status === 'deal'
      ? `You paid ${fmtMoney(game.price)} — saving ${fmtMoney(game.list - game.price)}. ${floorLine}`
      : game.status === 'bust'
        ? `You pushed too hard and blew the deal. ${floorLine}`
        : `You kept your money. ${floorLine}`;

  $('result-grid').textContent = buildShareGrid(game.history);
  $('countdown').parentElement.classList.toggle('hidden', game.mode !== 'daily');
  openModal('modal-results');
  track('results_viewed', { mode: game.mode, score, game_number: game.gameNo });
}

async function onShare() {
  const stats = loadStats();
  const text = buildShareText(game, game.score(), stats.streak, SITE_URL);
  try {
    const how = await shareResult(text);
    if (how === 'copied') showToast('Copied to clipboard 📋');
    track('share_clicked', { mode: game.mode, method: how, score: game.score() });
  } catch {
    showToast('Could not share on this device');
  }
}

// ---------- Stats / modals / misc ----------

function fillStats() {
  const s = loadStats();
  $('stat-played').textContent = s.played;
  $('stat-deals').textContent = s.deals;
  $('stat-avg').textContent = s.played ? Math.round(s.totalScore / s.played) : '–';
  $('stat-best').textContent = s.best ?? '–';
  $('stat-streak').textContent = s.streak;
  $('stat-maxstreak').textContent = s.maxStreak;
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModals() { document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden')); }

let toastTimer = null;
function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

function tickCountdown() {
  const ms = today.nextGameAt - Date.now();
  if (ms <= 0) { location.reload(); return; }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  $('countdown').textContent = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ---------- Wiring ----------

$('btn-offer').addEventListener('click', () => {
  const amount = parseInt($('offer-input').value, 10);
  const err = game.validateOffer(amount);
  if (err) { showToast(err); return; }
  $('offer-input').value = '';
  const tactic = selectedTactic;
  selectedTactic = null;
  $('tactic-hint').textContent = 'Pick a tactic, then name your price.';
  doAction({ type: 'offer', tactic, amount });
  updateOfferButton();
});

$('offer-input').addEventListener('input', updateOfferButton);
$('offer-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !$('btn-offer').disabled) $('btn-offer').click();
});

$('btn-accept').addEventListener('click', () => doAction({ type: 'acceptAsk' }));
$('btn-walk').addEventListener('click', () => doAction({ type: 'walk' }));
$('btn-results').addEventListener('click', showResults);
$('btn-share').addEventListener('click', onShare);

$('btn-practice').addEventListener('click', () => {
  closeModals();
  track('practice_started', {});
  startGame('practice', `practice-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, 0);
});

$('btn-help').addEventListener('click', () => { openModal('modal-help'); track('help_opened', {}); });
$('btn-stats').addEventListener('click', () => { fillStats(); openModal('modal-stats'); });

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
document.querySelectorAll('.modal').forEach((m) =>
  m.addEventListener('click', (e) => { if (e.target === m) closeModals(); })
);

// ---------- Boot ----------

const saved = loadGameLog(today.gameNo);
startGame('daily', today.seedStr, today.gameNo, saved);

if (!localStorage.getItem('lowball_seen_help')) {
  localStorage.setItem('lowball_seen_help', '1');
  openModal('modal-help');
}

setInterval(tickCountdown, 1000);
tickCountdown();
