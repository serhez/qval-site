import { renderLeaderboard } from "./shared/leaderboard.js";

/* ---- leaderboard ---- */
renderLeaderboard(document.getElementById("board"), { dataUrl: "shared/data.json" });

/* ---- bibtex ---- */
fetch("shared/bibtex.txt")
    .then((r) => r.text())
    .then((t) => {
        document.getElementById("bibtex").textContent = t.trim();
    })
    .catch(() => {
        document.getElementById("bibtex").textContent = "@article{hernandezgutierrez2026qval, ...}";
    });

/* ---- lightweight syntax highlighting (no deps) ----
   Single-pass tokenizer per language. Each rule is wrapped in exactly one
   capturing group (rules use only non-capturing groups internally), so the
   matched group index maps directly to a token type. */
const LANGS = {
    bash: [
        ["comment", "#.*"],
        ["string", "\"[^\"]*\"|'[^']*'"],
        ["cmd", "\\b(?:uv|pip|python3|python|cd|git|export|bash|sh)\\b"],
        ["flag", "(?:^|\\s)--?[A-Za-z][\\w-]*"],
    ],
    python: [
        ["comment", "#.*"],
        ["string", "\"[^\"]*\"|'[^']*'"],
        [
            "keyword",
            "\\b(?:class|def|return|import|from|as|with|if|elif|else|for|while|in|not|and|or|is|lambda|self|None|True|False|pass|raise|yield|try|except|finally|assert|global|del|continue|break)\\b",
        ],
        [
            "builtin",
            "\\b(?:float|int|str|bool|list|dict|tuple|set|len|range|print|super|isinstance|enumerate|zip|map|filter|abs|min|max|sum)\\b",
        ],
        ["type", "\\b[A-Z][A-Za-z0-9_]*\\b"],
        ["number", "\\b\\d+(?:\\.\\d+)?\\b"],
    ],
    yaml: [
        ["comment", "#.*"],
        ["key", "^[ \\t]*[\\w.-]+(?=:)"],
        ["string", "\"[^\"]*\"|'[^']*'"],
        ["bool", "\\b(?:true|false|null|yes|no)\\b"],
        ["number", "\\b\\d+(?:\\.\\d+)?\\b"],
    ],
};

function buildLexer(rules) {
    const re = new RegExp(rules.map((r) => "(" + r[1] + ")").join("|"), "gm");
    return { re, types: rules.map((r) => r[0]) };
}
const LEXERS = Object.fromEntries(Object.entries(LANGS).map(([name, rules]) => [name, buildLexer(rules)]));

const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlight(code, lex) {
    let out = "";
    let last = 0;
    let m;
    lex.re.lastIndex = 0;
    while ((m = lex.re.exec(code))) {
        if (m.index > last) out += escHtml(code.slice(last, m.index));
        let type = null;
        for (let g = 1; g < m.length; g++) {
            if (m[g] !== undefined) {
                type = lex.types[g - 1];
                break;
            }
        }
        out += `<span class="tok-${type}">${escHtml(m[0])}</span>`;
        last = m.index + m[0].length;
        if (m[0].length === 0) lex.re.lastIndex++; // guard against zero-width loops
    }
    out += escHtml(code.slice(last));
    return out;
}

document.querySelectorAll("code[data-lang]").forEach((el) => {
    const lex = LEXERS[el.dataset.lang];
    if (!lex) return;
    el.innerHTML = highlight(el.textContent, lex);
});

/* ---- copy buttons (code blocks + bibtex) ---- */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy");
    if (!btn) return;
    const block = btn.closest(".codeblock, .bibwrap");
    if (!block) return;
    const src = block.querySelector("code, pre");
    navigator.clipboard.writeText(src.innerText.trim()).then(() => {
        const old = btn.textContent;
        btn.textContent = "copied";
        btn.classList.add("done");
        setTimeout(() => {
            btn.textContent = old;
            btn.classList.remove("done");
        }, 1300);
    });
});

/* ---- hero terminal typewriter ---- */
const SESSION = [
    { c: "c-prompt", t: "❯ " },
    { c: "c-cmd", t: "python scripts/pipeline/predict.py", type: true },
    { t: "\n" },
    { c: "c-dim", t: "  scoring 94 state–action pairs with my_method …\n", print: 380 },
    { c: "c-prompt", t: "❯ " },
    { c: "c-cmd", t: "python scripts/pipeline/evaluate.py", type: true },
    { t: "\n" },
    { c: "c-dim", t: "  Spearman ρ  vs reference Q*\n", print: 300 },
    { c: "c-cmd", t: "  direct-single  ", print: 160 },
    { c: "c-num", t: "0.45\n", print: 60 },
    { c: "c-cmd", t: "  ranking        ", print: 160 },
    { c: "c-num", t: "0.34\n", print: 60 },
    { c: "c-cmd", t: "  my_method      ", print: 160 },
    { c: "c-num", t: "0.18\n", print: 60 },
    { c: "c-ok", t: "  ✓ done: no training run required\n", print: 420 },
];

const out = document.getElementById("typed");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function span(cls, text) {
    const s = document.createElement("span");
    if (cls) s.className = cls;
    s.textContent = text;
    return s;
}

if (out) {
    if (reduce) {
        SESSION.forEach((seg) => out.appendChild(span(seg.c, seg.t)));
        document.querySelector(".caret")?.style.setProperty("display", "none");
    } else {
        runSession(0);
    }
}

function runSession(i) {
    if (i >= SESSION.length) return;
    const seg = SESSION[i];
    if (seg.type) {
        const el = span(seg.c, "");
        out.appendChild(el);
        let j = 0;
        const tick = () => {
            el.textContent += seg.t[j++];
            if (j < seg.t.length) setTimeout(tick, 34);
            else setTimeout(() => runSession(i + 1), 90);
        };
        tick();
    } else if (seg.print) {
        setTimeout(() => {
            out.appendChild(span(seg.c, seg.t));
            runSession(i + 1);
        }, seg.print);
    } else {
        out.appendChild(span(seg.c, seg.t));
        runSession(i + 1);
    }
}

/* ====== background motifs ported from the lab deck ======
   Palette matches the site tokens: ink #211d17, muted #857c6e, accent #8a2b34. */
const motionReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ---- hero motif: scattered points settling onto a Q-alignment diagonal ---- */
function setupHeroMotif() {
    const canvas = document.getElementById("hero-canvas");
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    const N = 46,
        DUR = 1600,
        ACCENT = "#8a2b34",
        INK = "#211d17";
    let pts = [],
        W = 0,
        H = 0,
        start = null,
        raf = null,
        seed = 1337;
    const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    function build() {
        seed = 1337;
        pts = [];
        for (let k = 0; k < N; k++) {
            const t = k / (N - 1);
            const tx = 0.08 + 0.84 * t;
            const ty = 0.82 - 0.62 * t + (rnd() - 0.5) * 0.07;
            const sy = 0.15 + rnd() * 0.7;
            pts.push({ tx, ty, sx: tx + (rnd() - 0.5) * 0.04, sy, r: 2.2 + rnd() * 2.6, hot: rnd() > 0.74 });
        }
    }
    function resize() {
        const r = canvas.getBoundingClientRect();
        W = r.width;
        H = r.height;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function draw(p) {
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 0.1 * p;
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0.08 * W, 0.82 * H);
        ctx.lineTo(0.92 * W, 0.2 * H);
        ctx.stroke();
        for (const pt of pts) {
            const x = (pt.sx + (pt.tx - pt.sx) * p) * W;
            const y = (pt.sy + (pt.ty - pt.sy) * p) * H;
            ctx.globalAlpha = (pt.hot ? 0.3 : 0.16) * (0.5 + 0.5 * p);
            ctx.fillStyle = pt.hot ? ACCENT : INK;
            ctx.beginPath();
            ctx.arc(x, y, pt.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    function frame(ts) {
        if (start === null) start = ts;
        const p = ease(Math.min(1, (ts - start) / DUR));
        draw(p);
        if (p < 1) raf = requestAnimationFrame(frame);
        else raf = null;
    }
    build();
    resize();
    if (motionReduce) {
        draw(1);
    } else {
        draw(0);
        raf = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", () => {
        resize();
        if (!raf) draw(1);
    });
}

/* ---- tool-intro motif: a sprawling trajectory tree, reward at almost no leaf ---- */
function setupTreeMotif() {
    const canvas = document.getElementById("tool-tree");
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    const MAXDEPTH = 11,
        CAP = 900;
    let edges = [],
        leaves = [],
        rewards = [],
        root = null,
        raf = null,
        startT = null,
        endT = 3.0,
        seed = 20260628;
    const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    function build() {
        seed = 20260628;
        const r = canvas.getBoundingClientRect();
        const W = r.width,
            H = r.height;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        edges = [];
        leaves = [];
        rewards = [];
        const L0 = Math.max(54, 0.07 * W);
        let count = 0;
        root = { x: 0.04 * W, y: 0.5 * H, depth: 0, tDone: 0 };
        const queue = [{ node: root, dir: 0, depth: 0, edge: null }];
        while (queue.length) {
            const it = queue.shift();
            const node = it.node,
                dir = it.dir,
                depth = it.depth,
                parentEdge = it.edge;
            const pTerm = depth < 3 ? 0 : Math.min(0.42, 0.03 + 0.045 * depth);
            if (depth >= MAXDEPTH || count > CAP || rnd() < pTerm) {
                node.tDone = parentEdge ? parentEdge.t1 : 0;
                leaves.push(node);
                continue;
            }
            const u = rnd();
            const nKids = u < 0.12 ? 1 : u < 0.68 ? 2 : 3;
            const spread = 1.05 * Math.pow(0.94, depth);
            for (let c = 0; c < nKids; c++) {
                const off =
                    nKids === 1
                        ? (rnd() - 0.5) * 1.0
                        : -spread + 2 * spread * (c / (nKids - 1)) + (rnd() - 0.5) * 0.55;
                let cdir = dir + off;
                cdir += (0.5 - node.y / H) * 0.45;
                if (cdir < -1.25) cdir = -1.25;
                else if (cdir > 1.25) cdir = 1.25;
                const len = L0 * Math.pow(0.93, depth) * (0.6 + 0.8 * rnd());
                const child = { x: node.x + Math.cos(cdir) * len, y: node.y + Math.sin(cdir) * len, depth: depth + 1, tDone: 0 };
                const t0 = parentEdge ? parentEdge.t1 + (0.01 + 0.085 * rnd()) : 0.03 * rnd();
                const t1 = t0 + (0.09 + 0.1 * rnd());
                const edge = { a: node, b: child, depth: depth, t0: t0, t1: t1, value: 0 };
                child.parentEdge = edge;
                edges.push(edge);
                count++;
                queue.push({ node: child, dir: cdir, depth: depth + 1, edge: edge });
            }
        }
        let maxT1 = 0;
        for (const e of edges) if (e.t1 > maxT1) maxT1 = e.t1;
        endT = maxT1 + 0.95;
        // keep the two rare rewards clear of the centered text column(s)
        const boxes = [];
        canvas.parentNode.querySelectorAll(".measure").forEach((el) => {
            const tr = el.getBoundingClientRect();
            boxes.push({ l: tr.left - r.left - 26, t: tr.top - r.top - 20, rr: tr.right - r.left + 26, b: tr.bottom - r.top + 20 });
        });
        const clearOfText = (l) => boxes.every((b) => l.x < b.l || l.x > b.rr || l.y < b.t || l.y > b.b);
        const cand = leaves.filter((l) => l.x > 0.4 * W && l.x < 0.96 * W && l.y > 0.06 * H && l.y < 0.94 * H && clearOfText(l));
        cand.sort((a, b) => a.y - b.y);
        if (cand.length >= 2) rewards = [cand[Math.floor(cand.length * 0.27)], cand[Math.floor(cand.length * 0.75)]];
        else rewards = cand.slice(0, 2);
        for (const rw of rewards) rw.rStart = rw.tDone + 0.12;
        // back up value from each rewarded leaf toward the root, like a discounted Q-value
        const GAMMA = 0.8;
        for (const rw of rewards) {
            let node = rw,
                steps = 0;
            while (node.parentEdge) {
                const e = node.parentEdge;
                const v = Math.pow(GAMMA, steps);
                if (v > e.value) e.value = v;
                node = e.a;
                steps++;
            }
        }
    }
    function draw(el) {
        const r = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, r.width, r.height);
        for (const ed of edges) {
            const p = ease(clamp((el - ed.t0) / (ed.t1 - ed.t0)));
            if (p <= 0) continue;
            const x = ed.a.x + (ed.b.x - ed.a.x) * p,
                y = ed.a.y + (ed.b.y - ed.a.y) * p;
            // cool faint ink far from any reward, warming to accent-red as value backs up
            const val = ed.value;
            const cr = Math.round(33 + 105 * val),
                cg = Math.round(29 + 14 * val),
                cb = Math.round(23 + 29 * val);
            const coolA = Math.max(0.05, 0.2 - 0.018 * ed.depth);
            const a = Math.min(0.78, coolA + 0.6 * val);
            ctx.strokeStyle = "rgba(" + cr + "," + cg + "," + cb + "," + a.toFixed(3) + ")";
            ctx.lineWidth = Math.max(0.5, 1.5 - 0.1 * ed.depth) + 1.8 * val;
            ctx.beginPath();
            ctx.moveTo(ed.a.x, ed.a.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        for (const lf of leaves) {
            const lp = clamp((el - lf.tDone) / 0.25);
            if (lp <= 0) continue;
            ctx.fillStyle = "rgba(133,124,110," + (0.2 * lp).toFixed(3) + ")";
            ctx.beginPath();
            ctx.arc(lf.x, lf.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        if (root) {
            ctx.fillStyle = "#211d17";
            ctx.beginPath();
            ctx.arc(root.x, root.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        for (const rw of rewards) {
            const rp = ease(clamp((el - rw.rStart) / 0.55));
            if (rp <= 0) continue;
            ctx.fillStyle = "rgba(138,43,52," + (0.13 * rp).toFixed(3) + ")";
            ctx.beginPath();
            ctx.arc(rw.x, rw.y, 16 * rp, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#8a2b34";
            ctx.beginPath();
            ctx.arc(rw.x, rw.y, 2.5 + 4 * rp, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function frame(ts) {
        if (startT === null) startT = ts;
        const el = (ts - startT) / 1000;
        draw(el);
        if (el < endT) raf = requestAnimationFrame(frame);
        else raf = null;
    }
    function play() {
        if (raf) cancelAnimationFrame(raf);
        build();
        startT = null;
        if (motionReduce) {
            draw(endT);
            return;
        }
        raf = requestAnimationFrame(frame);
    }
    build();
    draw(motionReduce ? endT : 0);
    window.addEventListener("resize", () => {
        build();
        if (!raf) draw(endT);
    });
    // play once when the intro scrolls into view (it sits below the fold)
    if (motionReduce || !("IntersectionObserver" in window)) {
        draw(endT);
    } else {
        const io = new IntersectionObserver(
            (ents) => {
                ents.forEach((e) => {
                    if (e.isIntersecting) {
                        play();
                        io.disconnect();
                    }
                });
            },
            { threshold: 0.25 },
        );
        io.observe(canvas.parentNode);
    }
}

/* ---- pipeline diagram: play its staged animation when it scrolls into view ---- */
function setupPipeReveal() {
    const pipes = document.querySelectorAll(".pipe");
    if (!pipes.length) return;
    if (motionReduce || !("IntersectionObserver" in window)) {
        pipes.forEach((p) => p.classList.add("is-revealed"));
        return;
    }
    const io = new IntersectionObserver(
        (ents) => {
            ents.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add("is-revealed");
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.3 },
    );
    pipes.forEach((p) => io.observe(p));
}

setupHeroMotif();
setupTreeMotif();
setupPipeReveal();
