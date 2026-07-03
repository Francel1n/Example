# NoUpload 🔒 — PDF tools that never see your files

**Merge, split, reorder and convert PDFs entirely in the browser. Zero upload, verifiably.**

Every day, millions of people push their contracts, payslips, IDs and medical records
to third-party servers just to merge two PDFs — because that's how the big PDF sites
work. None of that is technically necessary anymore: browsers are perfectly capable
of doing the work locally. NoUpload ships the PDF engine *to you* instead of shipping
your files *to a server*.

## Tools

| Page | What it does |
|---|---|
| `merge.html` | Combine any number of PDFs into one, reorderable |
| `split.html` | Extract pages with print-dialog ranges (`1-3, 7, 12-`) |
| `organize.html` | Thumbnail every page; drag to reorder, rotate, delete, export |
| `images-to-pdf.html` | JPG/PNG → one PDF (auto page size or centered A4) |

## The privacy claim, and how it's enforced

- **No upload endpoint exists.** The site is static files; there is no server-side
  processing anywhere.
- **The claim is machine-verified.** The e2e test suite drives every tool in a real
  Chromium and fails if *any* network request carries a file-sized body.
- **Users can verify it themselves** — the landing page tells them how (DevTools →
  Network tab; the tools even keep working offline once loaded).
- Analytics (PostHog) capture anonymous usage events only: tool used, page counts,
  durations. Never file names, never file contents.

## Why this can win users

- **Real, recurring need** — "merge pdf" and friends are some of the highest-volume
  utility searches on the web, and every incumbent gates them behind uploads,
  accounts, daily limits and premium tiers.
- **A differentiator you can see**: no upload progress bar. Files process instantly
  because the bytes never travel. Privacy-conscious niches (legal, health, HR,
  journalists) actively search for this.
- **Zero marginal cost** — static hosting scales to any traffic level for free,
  so "free forever, no limits" is a sustainable promise, not a teaser.

## Architecture

```
index.html            landing (SEO + privacy pitch + FAQ)
merge / split /
organize /
images-to-pdf.html    one page per tool, thin inline glue code
js/pdf-ops.js         all PDF logic — pure, DOM-free, unit-tested in Node
js/ui.js              dropzone, file rows, downloads, toasts
js/ph.js              PostHog EU snippet (anonymous usage analytics)
js/analytics.js       capture wrapper (never breaks a tool if blocked)
vendor/               pdf-lib 1.17.1 (MIT) + PDF.js 4.10 (Apache-2.0), vendored —
                      no CDN, consistent with "nothing leaves this page"
test/                 pdf-ops unit tests (node --test)
```

`js/pdf-ops.js` is deliberately isomorphic: the exact code that runs in the browser
is unit-tested in Node against real PDFs built with pdf-lib.

## Analytics (PostHog)

Instrumented funnel per tool: `$pageview → files_added → tool_run → download_clicked`,
plus `tool_error` with a stage tag. Properties include tool name, file/page counts,
output size and processing time — enough to see which tools earn their keep and where
people drop off, with zero personal data.

## Develop

```bash
npx serve .    # any static server (ES modules need http, not file://)
node --test    # unit tests
```

## Roadmap

- Compress PDF (image re-encoding via canvas)
- Password removal/protection
- PWA install for full offline use
- French localization (`/fr`)
