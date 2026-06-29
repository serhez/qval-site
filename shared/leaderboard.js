/* QVal interactive leaderboard — shared core.
 *
 * Builds a method x environment table from website/shared/data.json. Each draft
 * loads this module and themes the `lb-*` classes via its own CSS. One row per
 * method; cells are Spearman rho aggregated over the selected backbone(s).
 *
 * Usage:
 *   import { renderLeaderboard } from "../shared/leaderboard.js";
 *   renderLeaderboard(document.querySelector("#board"), { dataUrl: "../shared/data.json" });
 */

const SCALE = 0.8; // bar saturates at |rho| = 0.8 (values rarely exceed this)
const NEG_COLOR = "#9aa0a6";

const state = {
  payload: null,
  modality: "text",
  signal: "q",
  backbone: "__all__",
  families: new Set(), // empty => all families
  search: "",
  sortEnv: "__avg__",
  sortDir: -1, // -1 desc, 1 asc
};

let rootEl = null;

export async function renderLeaderboard(el, { dataUrl = "../shared/data.json" } = {}) {
  rootEl = el;
  el.classList.add("lb");
  el.innerHTML = `<p class="lb-loading">Loading results…</p>`;
  try {
    const res = await fetch(dataUrl);
    state.payload = await res.json();
  } catch (err) {
    el.innerHTML = `<p class="lb-error">Could not load results (${dataUrl}). Serve the site over HTTP, not file://.</p>`;
    return;
  }
  buildShell();
  update();
}

/* ---------- option derivation ---------- */

function sliceRecords() {
  return state.payload.records.filter(
    (r) => r.modality === state.modality && r.signal === state.signal
  );
}

function backbonesInSlice(records) {
  const order = state.payload.meta.models;
  const present = new Set(records.map((r) => r.model));
  return order.filter((m) => present.has(m));
}

/* ---------- shell ---------- */

function seg(name, options, current) {
  return `<div class="lb-seg" data-seg="${name}">${options
    .map(
      (o) =>
        `<button type="button" class="lb-seg-btn${
          o.value === current ? " is-active" : ""
        }" data-value="${o.value}">${o.label}</button>`
    )
    .join("")}</div>`;
}

function buildShell() {
  const meta = state.payload.meta;
  const familyChips = meta.family_order
    .map(
      (f) =>
        `<button type="button" class="lb-chip" data-family="${f}" style="--fam:${meta.family_colors[f]}">${f}</button>`
    )
    .join("");

  rootEl.innerHTML = `
    <div class="lb-controls">
      <div class="lb-control">
        <span class="lb-label">Observation</span>
        ${seg("modality", [
          { value: "text", label: "Text" },
          { value: "image", label: "Vision" },
        ], state.modality)}
      </div>
      <div class="lb-control">
        <span class="lb-label">Target</span>
        ${seg("signal", [
          { value: "q", label: "Q-value" },
          { value: "v", label: "State-value" },
        ], state.signal)}
      </div>
      <label class="lb-control">
        <span class="lb-label">Backbone</span>
        <select class="lb-backbone"></select>
      </label>
      <label class="lb-control lb-control--grow">
        <span class="lb-label">Filter</span>
        <input type="search" class="lb-search" placeholder="method name…" value="${state.search}">
      </label>
    </div>
    <div class="lb-families">${familyChips}</div>
    <div class="lb-tablewrap"><table class="lb-table"><thead></thead><tbody></tbody></table></div>
    <p class="lb-note">
      Cells show Spearman&nbsp;&rho; between a method's scores and reference Q-values
      (higher = better aligned). Bars are signed; <span class="lb-neg-key">grey</span> = anti-aligned.
      <span class="lb-sl-key">SL</span> = state-local metric (mean per-state &rho;), not directly comparable to the global &rho; other methods use.
    </p>
  `;

  rootEl.querySelectorAll(".lb-seg").forEach((segEl) => {
    segEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".lb-seg-btn");
      if (!btn) return;
      const key = segEl.dataset.seg;
      state[key] = btn.dataset.value;
      state.backbone = "__all__";
      update();
    });
  });

  rootEl.querySelector(".lb-search").addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderTable();
  });

  rootEl.querySelectorAll(".lb-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.family;
      if (state.families.has(f)) state.families.delete(f);
      else state.families.add(f);
      update();
    });
  });

  rootEl.querySelector(".lb-backbone").addEventListener("change", (e) => {
    state.backbone = e.target.value;
    renderTable();
  });
}

function update() {
  // refresh backbone select + family chip active state, then table
  const records = sliceRecords();
  const sel = rootEl.querySelector(".lb-backbone");
  const opts = backbonesInSlice(records);
  if (!opts.includes(state.backbone)) state.backbone = "__all__";
  sel.innerHTML =
    `<option value="__all__">All backbones (avg)</option>` +
    opts.map((m) => `<option value="${m}">${m}</option>`).join("");
  sel.value = state.backbone;

  rootEl.querySelectorAll(".lb-seg").forEach((segEl) => {
    const key = segEl.dataset.seg;
    segEl.querySelectorAll(".lb-seg-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.value === state[key]);
    });
  });

  rootEl.querySelectorAll(".lb-chip").forEach((chip) => {
    chip.classList.toggle("is-on", state.families.has(chip.dataset.family));
    chip.classList.toggle("is-dim", state.families.size > 0 && !state.families.has(chip.dataset.family));
  });

  renderTable();
}

/* ---------- table ---------- */

function aggregate(records) {
  // method -> { family, metricType, env -> [values] }
  const byMethod = new Map();
  for (const r of records) {
    if (state.backbone !== "__all__" && r.model !== state.backbone) continue;
    if (!byMethod.has(r.method))
      byMethod.set(r.method, { family: r.family, metricType: r.metric_type, envs: {} });
    const m = byMethod.get(r.method);
    (m.envs[r.environment] = m.envs[r.environment] || []).push(r.spearman);
  }
  return byMethod;
}

function mean(a) {
  return a.reduce((s, x) => s + x, 0) / a.length;
}

function renderTable() {
  const meta = state.payload.meta;
  const envs = meta.environments;
  const records = sliceRecords();
  const byMethod = aggregate(records);

  // method display order from meta, filtered by chips + search + data presence
  let methods = meta.methods
    .map((m) => m.name)
    .filter((name) => byMethod.has(name));
  if (state.families.size > 0)
    methods = methods.filter((name) => state.families.has(byMethod.get(name).family));
  if (state.search)
    methods = methods.filter((name) => name.toLowerCase().includes(state.search));

  const rows = methods.map((name) => {
    const info = byMethod.get(name);
    const cells = {};
    const present = [];
    for (const env of envs) {
      if (info.envs[env]) {
        const v = mean(info.envs[env]);
        cells[env] = v;
        present.push(v);
      } else cells[env] = null;
    }
    const avg = present.length ? mean(present) : null;
    return { name, family: info.family, metricType: info.metricType, cells, avg };
  });

  rows.sort((a, b) => {
    const key = state.sortEnv;
    const av = key === "__avg__" ? a.avg : a.cells[key];
    const bv = key === "__avg__" ? b.avg : b.cells[key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * state.sortDir;
  });

  // header
  const thead = rootEl.querySelector(".lb-table thead");
  const head = (key, label, cls = "") =>
    `<th class="lb-th ${cls}${state.sortEnv === key ? " is-sorted" : ""}" data-sort="${key}">
       ${label}<span class="lb-arrow">${
      state.sortEnv === key ? (state.sortDir === -1 ? "▾" : "▴") : ""
    }</span></th>`;
  thead.innerHTML = `<tr>
      <th class="lb-th lb-th-method">Method</th>
      ${envs.map((e) => head(e, e, "lb-th-env")).join("")}
      ${head("__avg__", "Average", "lb-th-avg")}
    </tr>`;
  thead.querySelectorAll(".lb-th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortEnv === key) state.sortDir *= -1;
      else {
        state.sortEnv = key;
        state.sortDir = -1;
      }
      renderTable();
    });
  });

  // body
  const tbody = rootEl.querySelector(".lb-table tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td class="lb-empty" colspan="${envs.length + 2}">No methods match this view — try a different Observation or Target, or clear the family filter. (Embedding &amp; some Pre-trained methods only have State-value results.)</td></tr>`;
    return;
  }
  const color = (fam) => meta.family_colors[fam];
  const cell = (v, fam) => {
    if (v === null) return `<td class="lb-cell lb-cell--na"><span class="lb-na">–</span></td>`;
    const w = Math.min(Math.abs(v) / SCALE, 1) * 50;
    const side = v >= 0 ? "left:50%" : `right:50%`;
    const c = v >= 0 ? color(fam) : NEG_COLOR;
    return `<td class="lb-cell">
        <span class="lb-bar"><span class="lb-bar-fill" style="width:${w}%;${side};background:${c}"></span></span>
        <span class="lb-val">${v.toFixed(2)}</span>
      </td>`;
  };

  tbody.innerHTML = rows
    .map((row, i) => {
      const sl = row.metricType === "state-local" ? `<sup class="lb-badge" title="state-local metric">SL</sup>` : "";
      return `<tr style="--fam:${color(row.family)}">
        <td class="lb-method">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-dot"></span>
          <span class="lb-mname">${row.name}${sl}</span>
          <span class="lb-fam">${row.family}</span>
        </td>
        ${state.payload.meta.environments.map((e) => cell(row.cells[e], row.family)).join("")}
        <td class="lb-avg-cell">${row.avg === null ? "–" : row.avg.toFixed(2)}</td>
      </tr>`;
    })
    .join("");
}
