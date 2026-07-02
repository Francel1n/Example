// Wordle-style shareable result: emoji grid of tactic + how it landed.

import { TACTICS } from './data.js';
import { gradeFor } from './data.js';

const OUTCOME_EMOJI = {
  drop: '↘️',
  bigdrop: '📉',
  anger: '😡',
  deal: '🤝',
  bust: '💥',
  walk: '🚶',
};

function tacticEmoji(id) {
  const t = TACTICS.find((t) => t.id === id);
  return t ? t.emoji : '🏳️';
}

export function buildShareGrid(history) {
  return history
    .map((h) => `${h.tactic ? tacticEmoji(h.tactic) : '🏳️'}${OUTCOME_EMOJI[h.outcome] || '❔'}`)
    .join(' ');
}

export function buildShareText(game, score, streak, url) {
  const grade = gradeFor(score);
  const header = game.mode === 'daily'
    ? `LOWBALL #${game.gameNo}`
    : 'LOWBALL (practice)';
  const lines = [
    `${header} — ${score}/100 ${grade.emoji}`,
    buildShareGrid(game.history),
  ];
  if (game.mode === 'daily' && streak > 1) lines.push(`🔥 ${streak} day streak`);
  lines.push(url);
  return lines.join('\n');
}

export async function shareResult(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      // fall through to clipboard
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
