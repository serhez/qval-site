# QVal project website

Self-contained, static website for the QVal paper. No build step, no external
dependencies (GitHub-Pages-ready, offline-safe). The site lives at the root of
this directory — opening `website/` *is* the site.

```
website/
  index.html        the site (editorial style, testbed-first)
  style.css
  app.js            leaderboard init, syntax highlighting, copy buttons, hero terminal
  shared/
    data.json       leaderboard records (generated, see below)
    leaderboard.js  interactive leaderboard core
    bibtex.txt      citation
    figures/        web-ready figures (PNG)
```

Its section order follows the paper's storyline: problem → Q-alignment →
how it works → quickstart → extend → environments → leaderboard → findings → cite,
split into two zones (the testbed tool, then the benchmark study).

## View it

Serve the `website/` directory and open the root:

```bash
cd website
python3 -m http.server 8137
```

Then visit http://localhost:8137/

A server is required: the leaderboard fetches `shared/data.json`, which the browser
blocks over `file://`.

## Deploy

Upload the whole `website/` directory to any static host (GitHub Pages, Netlify,
Surge, …). The site is at the deploy root — no subpath. All asset paths are
relative, so it works from any base URL.

## Regenerate the leaderboard data

`shared/data.json` is produced from the final evaluation summaries by reusing the
paper-figure data pipeline (latest-summary dedup + name resolution):

```bash
uv run --no-sync python -m scripts.paper_figures.export_leaderboard \
    --results-root data/evaluations --out website/shared/data.json
```

The leaderboard shows Spearman ρ against reference Q-values. Embedding and some
Pre-trained methods were evaluated against state-value targets, so they appear under
the "State-value" target rather than "Q-value".

## Still to fill in

- The "Paper" links point at `paper.pdf` (site root). Drop the compiled PDF into
  `website/paper.pdf` before sharing, or repoint the links to the arXiv URL once live.
- Author homepage links (names render unlinked).
- A QVal logo/mark (currently a typographic "Q" favicon + wordmark).
- Confirm the deploy target/slug (`bethgelab.github.io/lit-benchmark/`).
