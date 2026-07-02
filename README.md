# LOWBALL 🤝 — The Daily Negotiation Game

**One deal a day. Everyone on Earth haggles with the same seller.**

Every day at midnight UTC, a new negotiation drops: a 1974 Vespa, a food truck, a
"definitely authentic" vintage watch. The seller has a **hidden floor price** and a
personality — sentimental, stubborn, desperate, chatty, or a straight-up shark.
You get **5 offers**, each paired with a tactic:

| Tactic | | Works on… |
|---|---|---|
| 😐 Straight offer | no games | everyone (safe) |
| 🔍 Spot a flaw | "is that rust?" | sharks — never the sentimental |
| 🤫 Silence | name a price, say nothing | talkers |
| 💵 Cash today | bills on the table | anyone in a hurry |
| 🚪 Start to leave | risky bluff | the desperate — backfires on the stubborn |
| 😊 Flatter | admire everything | the sentimental |

Lowball too hard and the seller gets angry. Too angry and they **walk**, and you
score zero. Close a great deal and you get a score out of 100, a grade
(👑 *Silver Tongue* down to 🚪 *Doormat*), and a Wordle-style emoji grid to share:

```
LOWBALL #14 — 82/100 🥇
🤫📉 💵↘️ 😊🤝
🔥 6 day streak
```

## Why it works as a product

- **Daily ritual + streaks + shareable emoji grid** — the exact growth loop that
  made Wordle explode, applied to a universally relatable fantasy: winning a
  negotiation.
- **The engine is fully deterministic** (seeded by the UTC date), so the whole
  world plays the *same* seller with the *same* hidden floor — results are
  comparable, which is what makes sharing them fun.
- **Skill is real**: reading the seller's personality and picking the right
  tactic roughly doubles your score vs. naive play (verified by simulation in
  the test suite). Reckless lowballing busts ~1 game in 3.
- **Zero backend, zero cost**: pure static HTML/CSS/JS, deploys to GitHub Pages.
  No accounts, no cookies banner needed beyond analytics, nothing to scale.

## Architecture

```
index.html          UI shell + PostHog snippet
css/style.css       dark, mobile-first chat interface
js/rng.js           seeded PRNG (xmur3 + mulberry32)
js/data.js          14 scenarios, 5 personalities, all dialogue, tactics, grades
js/engine.js        deterministic negotiation engine + par-based scoring
js/main.js          game flow, chat rendering, modals
js/storage.js       streaks & stats; games persist as replayable action logs
js/share.js         emoji share grid (Web Share API + clipboard fallback)
js/analytics.js     PostHog wrapper (safe when blocked)
test/               engine test suite — run with `node --test`
```

Key design decisions:

- **Replayable action logs.** Because the engine is deterministic, a mid-game
  refresh restores the exact game by replaying your recorded actions against
  the same seed. No game state is ever serialized.
- **Par-based scoring.** Each day the engine computes *par* — the best price
  achievable with perfect play against that seller. Your score measures how
  much of that theoretical discount you captured, so a tough stubborn seller
  is scored as generously as an easy desperate one.
- **Diminishing tactics.** Repeating a tactic halves its effect each time,
  forcing varied play.

## Analytics (PostHog)

The full funnel is instrumented out of the box:

`game_started → offer_made (×n) → deal_closed | negotiation_busted | walked_away → results_viewed → share_clicked`

Event properties include game number, scenario, seller personality, tactic,
offer-to-list ratio, rounds used, and final score — enough to answer questions
like *"which personality busts the most players?"* or *"does anger predict
churn?"*, and to A/B test difficulty with feature flags later.

## Run locally

```bash
npx serve .          # any static server works
node --test          # engine test suite
```

## Deploy

Pushing to `master` runs the tests and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: repo **Settings → Pages →
Source: GitHub Actions**.
