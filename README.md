# QVal project website

Self-contained, static website for the QVal paper. No build step, no external
dependencies (GitHub-Pages-ready, offline-safe). The site lives at the root of
this repository.

```
.
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
how it works → quickstart → extend → environments → leaderboard → downstream
guided search → findings → cite,
split into two zones (the testbed tool, then the benchmark study).

## View it

Serve the repository root:

```bash
python3 -m http.server 8137
```

Then visit http://localhost:8137/

A server is required: the leaderboard fetches `shared/data.json`, which the browser
blocks over `file://`.

## Deploy

Upload the whole repository to any static host (GitHub Pages, Netlify,
Surge, …). The site is at the deploy root — no subpath. All asset paths are
relative, so it works from any base URL. Live at https://q-val.com.

## Regenerate the leaderboard data

`shared/data.json` is exported by the value-bench paper-figure pipeline
(latest-summary dedup + name resolution), run from the value-bench root:

```bash
uv run --no-sync python -m scripts.paper_figures.export_leaderboard \
    --results-root catalogs/qval_benchmark/data/evaluations_state_local \
    --ablation-results-root catalogs/qval_benchmark/data/evaluations \
    --out path/to/qval-site/shared/data.json
```

- **Benchmark** — from `--results-root`: Q-value targets, within-state
  Spearman ρ averaged over states (the paper's headline metric). LLM-based
  methods score text; embedding and pre-trained methods score images.
- **Ablations** — from `--ablation-results-root`: image-input Q-values and
  state-value targets, global ρ.

The leaderboard's three views select records by `signal`, `modality` and
`metric_type` (see `VIEWS` in `shared/leaderboard.js`).

## Still to fill in

- Author homepage links (names render unlinked).
- A QVal logo/mark (currently a typographic "Q" favicon + wordmark).
