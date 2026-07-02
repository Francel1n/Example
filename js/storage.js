// LocalStorage persistence: lifetime stats + resumable daily game.

const STATS_KEY = 'lowball_stats_v1';
const GAME_KEY = 'lowball_game_v1';

const DEFAULT_STATS = {
  played: 0,
  deals: 0,
  totalScore: 0,
  best: null,
  streak: 0,
  maxStreak: 0,
  lastGameNo: null,
};

export function loadStats() {
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordResult(gameNo, score, isDeal) {
  const s = loadStats();
  if (s.lastGameNo === gameNo) return s; // already recorded today
  s.played += 1;
  if (isDeal) s.deals += 1;
  s.totalScore += score;
  s.best = s.best === null ? score : Math.max(s.best, score);
  s.streak = s.lastGameNo === gameNo - 1 ? s.streak + 1 : 1;
  s.maxStreak = Math.max(s.maxStreak, s.streak);
  s.lastGameNo = gameNo;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
  return s;
}

// The engine is deterministic, so persisting the action log is enough to
// rebuild the whole game (mid-progress or finished) after a refresh.
export function saveGameLog(gameNo, actions) {
  localStorage.setItem(GAME_KEY, JSON.stringify({ gameNo, actions }));
}

export function loadGameLog(gameNo) {
  try {
    const data = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
    return data && data.gameNo === gameNo ? data.actions : null;
  } catch {
    return null;
  }
}
