/* kit.js · chart, table and toggle helpers for the portfolio template (personal-site-design skill)
   No libraries; every colour is a CSS variable from kit.css, so light and dark both work.
   Labels may be {en, zh} pairs; the page shows one language at a time.

   Quick reference (all return nothing; they draw into `box`, a <div class="chart">):
     Kit.lineChart(box, {x, series:[{key, label, y, color, width?, dash?, hidden?}], height?, yfmt?, xfmt?, xstep?,
                         shade?:[{x0, x1, label?}], endLabels?: 'auto'|true|false, notes?:[{x, y, text, dx?, dy?, anchor?}],
                         domain?:[ymin, ymax], zero?: true, tipfmt?, tipx?, onClick?, title?})
     Kit.barChart(box, {items:[{label, v, note?}], color?, height?, yfmt?, valueLabels?: 'auto'|true|false})
     Kit.dumbbell(box, {rows:[{label, a, b, color?}], aName, bName, fmt?, dfmt?, better?: 'higher'|'lower', domain?:[lo, hi]})
                       better: which direction counts as an improvement (colours the change column teal or red)
     Kit.matrix(box, {nodes:[{label, color, group}], value:(i, j) => number|null, max?, tip?:(i, j, v) => html})
     Kit.spark(values, color, w?, h?) -> '<svg ...>' string for a table cell
     Kit.table(tableEl, {columns, rows, sortKey?, sortDir?})   (see the comment above `table`)
     Kit.initToggles()   wires buttons [data-set-lang] and [data-set-theme]; remembers the choice;
                         first visit uses <html data-default-lang="zh"> if present, else English
     Kit.t(x) -> text in the current language when x is {en, zh}; Kit.L(x) -> '<span lang>' pair HTML
     Kit.onResize(fn)    re-run fn when the width changes */
const Kit = (function () {
  'use strict';
  const MINUS = '−';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v, d) => (v !== v || v == null ? '–' : (v < 0 ? MINUS : '') + Math.abs(v).toFixed(d));
  const fmt = {
    f0: (v) => num(v, 0), f1: (v) => num(v, 1), f2: (v) => num(v, 2), f3: (v) => num(v, 3),
    sgn3: (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(3),
    pct0: (v) => num(v * 100, 0) + '%', pct1: (v) => num(v * 100, 1) + '%',
    money: (v) => { const a = Math.abs(v), s = v < 0 ? MINUS : ''; if (a < 0.5) return '$0'; return a >= 1000 ? s + '$' + (a % 1000 ? (a / 1000).toFixed(1) : (a / 1000).toFixed(0)) + 'M' : s + '$' + Math.round(a) + 'k'; },
    year: (x) => String(Math.floor(x)),
  };

  // ---------------------------------------------------------------- language
  const lang = () => document.documentElement.getAttribute('data-lang') || 'en';
  const t = (x) => (x && typeof x === 'object' ? (x[lang()] != null ? x[lang()] : x.en) : x);
  const L = (x) => (x && typeof x === 'object' ? `<span lang="en">${esc(x.en)}</span><span lang="zh">${esc(x.zh)}</span>` : esc(x));
  // SVG text in both languages; CSS hides the other one.
  function svgText(x, attrs, cls) {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    if (x && typeof x === 'object') return `<text ${a} class="${cls || ''}" lang="en">${esc(x.en)}</text><text ${a} class="${cls || ''}" lang="zh">${esc(x.zh)}</text>`;
    return `<text ${a} class="${cls || ''}">${esc(x)}</text>`;
  }
  const textLen = (x) => { const s = String(t(x)); let n = 0; for (const ch of s) n += /[　-鿿＀-￯]/.test(ch) ? 2 : 1; return n; };

  // ---------------------------------------------------------------- axes and tooltip
  function niceStep(span, count) {
    const raw = span / Math.max(count, 1), mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    return (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
  }
  function ticks(lo, hi, count) {
    const st = niceStep(hi - lo, count), out = [];
    for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
    return { out, st };
  }
  function tipShow(box, html, px, py) {
    let tip = box.querySelector('.tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; box.appendChild(tip); }
    tip.innerHTML = html; tip.style.opacity = '1';
    const bw = box.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = px + 12; if (x + tw > bw) x = px - tw - 12; if (x < 0) x = Math.max(0, Math.min(bw - tw, px - tw / 2));
    let y = py - th - 10; if (y < 0) y = py + 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function tipHide(box) { const tip = box.querySelector('.tip'); if (tip) tip.style.opacity = '0'; }
  function bisect(xs, x) { let lo = 0, hi = xs.length; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; } return lo; }

  // ---------------------------------------------------------------- line chart
  function lineChart(box, o) {
    const xs = o.x, n = xs.length, H = o.height || 340;
    const W = Math.max(box.clientWidth, 280);
    const vis = o.series.filter((s) => !s.hidden);
    const narrow = W < 560;   // phones: no end labels (chips are the legend) and no notes, so the plot keeps its width
    const wantEnd = !narrow && (o.endLabels === true || (o.endLabels !== false && vis.length <= 6));
    const endW = wantEnd ? Math.min(160, 12 + 6.6 * Math.max(...vis.map((s) => textLen(s.label)))) : 0;
    const m = { l: o.left || 54, r: Math.max(o.right || 14, endW), t: 14, b: 28 };
    let ymin = Infinity, ymax = -Infinity;
    for (const s of vis) for (let i = 0; i < n; i++) { const v = s.y[i]; if (v === v && v != null) { if (v < ymin) ymin = v; if (v > ymax) ymax = v; } }
    if (!isFinite(ymin)) { ymin = 0; ymax = 1; }
    if (o.domain) { ymin = o.domain[0]; ymax = o.domain[1]; }   // shared scale for small multiples
    if (o.zero !== false) { ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0); }
    const pad = (ymax - ymin) * 0.05 || 1; ymin -= o.zero !== false && ymin === 0 ? 0 : pad; ymax += pad;
    const x0 = xs[0], x1 = xs[n - 1];
    const sx = (x) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
    const sy = (v) => m.t + (1 - (v - ymin) / (ymax - ymin)) * (H - m.t - m.b);
    const yfmt = o.yfmt || ((v) => String(v));
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t(o.title || 'Line chart'))}">`;
    for (const sh of o.shade || []) {
      const xa = sx(Math.max(x0, sh.x0)), xb = sx(Math.min(x1, sh.x1));
      if (xb > xa) {
        g += `<rect class="shade" x="${xa}" y="${m.t}" width="${xb - xa}" height="${H - m.t - m.b}"/>`;
        if (sh.label) g += svgText(sh.label, { x: xa + 8, y: m.t + 14 }, 'shade-lab');
      }
    }
    const yt = ticks(ymin, ymax, H > 260 ? 5 : 4);
    for (const v of yt.out) g += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${yfmt(v)}</text>`;
    if (o.zero !== false && ymin < 0) g += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${sy(0)}" y2="${sy(0)}"/>`;
    // x ticks: whole years by default, thinned by available width; pass xstep and xfmt for weeks or months
    const span = x1 - x0, pxPerYr = (W - m.l - m.r) / (span || 1);
    const ystep = o.xstep || (span < 3 ? 0.5 : pxPerYr > 55 ? 1 : pxPerYr > 28 ? 2 : 4);
    const xfmt = o.xfmt || ((y) => (ystep < 1 && y % 1 ? 'Jul ' + Math.floor(y) : String(Math.floor(y))));
    for (let y = Math.ceil(x0 / ystep) * ystep; y <= x1 + 1e-9; y += ystep) {
      g += `<text x="${sx(y)}" y="${H - 8}" text-anchor="middle">${xfmt(y)}</text><line class="gridline" x1="${sx(y)}" x2="${sx(y)}" y1="${H - m.b}" y2="${H - m.b + 4}"/>`;
    }
    const step = Math.max(1, Math.floor(n / (W * 1.5)));
    const ends = [];
    for (const s of vis) {
      let d = '', pen = false, last = null;
      for (let i = 0; i < n; i += (i + step < n ? step : Math.max(1, n - 1 - i))) {
        const v = s.y[i];
        if (v !== v || v == null) { pen = false; if (i === n - 1) break; continue; }
        d += (pen ? 'L' : 'M') + sx(xs[i]).toFixed(1) + ' ' + sy(v).toFixed(1); pen = true; last = i;
        if (i === n - 1) break;
      }
      g += `<path class="ln" data-k="${esc(s.key)}" d="${d}" style="stroke:${s.color};stroke-width:${s.width || 1.6}px${s.dash ? ';stroke-dasharray:' + s.dash : ''}"/>`;
      if (last != null) ends.push({ s, x: sx(xs[last]), y: sy(s.y[last]) });
    }
    if (wantEnd && ends.length) {
      // nudge labels apart: at least 14px between neighbours, kept inside the plot height
      ends.sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
      const over = ends[ends.length - 1].y - (H - m.b);
      if (over > 0) for (const e of ends) e.y -= over;
      for (let k = ends.length - 2; k >= 0; k--) if (ends[k + 1].y - ends[k].y < 14) ends[k].y = ends[k + 1].y - 14;
      for (const e of ends) g += svgText(e.s.label, { x: (W - m.r + 6).toFixed(1), y: (e.y + 4).toFixed(1), 'data-k': esc(e.s.key), style: `fill:${e.s.color}` }, 'end');
    }
    for (const nt of narrow ? [] : o.notes || []) {
      const px = sx(nt.x), py = sy(nt.y), ty = py + (nt.dy == null ? -36 : nt.dy);
      let tx = px + (nt.dx == null ? 0 : nt.dx);
      // keep the note inside the chart: estimate its width and slide it back in if needed
      const both = typeof nt.text === 'object' ? [nt.text.en, nt.text.zh] : [nt.text];
      const w = 6.4 * Math.max(...both.map((s) => textLen(s)));
      const anchor = nt.anchor || 'middle', left = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
      if (left < 2) tx += 2 - left; else if (left + w > W - 2) tx -= left + w - (W - 2);
      g += `<line class="note-line" x1="${px}" y1="${py}" x2="${px}" y2="${ty + (ty < py ? 4 : -12)}"/>`;
      g += svgText(nt.text, { x: tx.toFixed(1), y: ty, 'text-anchor': anchor }, 'note');
    }
    g += `<line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="display:none"/><circle class="dot" r="4" style="display:none;stroke:var(--paper);stroke-width:1.5px"/>`;
    g += `<rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" style="cursor:${o.onClick ? 'pointer' : 'crosshair'}"/></svg>`;
    box.innerHTML = g;
    const svg = box.querySelector('svg'), guide = svg.querySelector('.guide'), dot = svg.querySelector('.dot'), ov = svg.lastElementChild;
    let focusKey = null;
    function move(ev) {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W, py = ((ev.clientY - r.top) / r.height) * H;
      const xv = x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0);
      const i = Math.min(n - 1, Math.max(0, bisect(xs, xv)));
      let best = null, bd = Infinity;
      for (const s of vis) { const v = s.y[i]; if (v !== v || v == null) continue; const dd = Math.abs(sy(v) - py); if (dd < bd) { bd = dd; best = s; } }
      if (!best) { leave(); return; }
      const v = best.y[i];
      guide.setAttribute('x1', sx(xs[i])); guide.setAttribute('x2', sx(xs[i])); guide.style.display = '';
      dot.setAttribute('cx', sx(xs[i])); dot.setAttribute('cy', sy(v)); dot.style.fill = best.color; dot.style.display = '';
      if (vis.length > 1) {
        svg.classList.add('has-focus');
        if (focusKey !== best.key) { svg.querySelectorAll('path.ln, text.end').forEach((p) => p.classList.toggle('focus', p.dataset.k === String(best.key))); focusKey = best.key; }
      }
      const f = best.fmt || o.tipfmt || ((z) => z.toFixed(3));
      const xl = o.tipx ? o.tipx(xs[i], i) : xs[i].toFixed(2);
      tipShow(box, `<b>${esc(t(best.label))}</b><br>${esc(xl)} · ${f(v)}`, (sx(xs[i]) / W) * r.width, (sy(v) / H) * r.height);
      box._hover = best.key;
    }
    function leave() {
      guide.style.display = 'none'; dot.style.display = 'none'; svg.classList.remove('has-focus');
      svg.querySelectorAll('.focus').forEach((p) => p.classList.remove('focus')); focusKey = null; tipHide(box); box._hover = null;
    }
    ov.addEventListener('pointermove', move);
    ov.addEventListener('pointerdown', move);
    ov.addEventListener('pointerleave', leave);
    if (o.onClick) ov.addEventListener('click', () => { if (box._hover != null) o.onClick(box._hover); });
  }

  // ---------------------------------------------------------------- bar chart
  // valueLabels 'auto': ≤ 12 bars → print values on bars and drop the y axis; more bars → y axis, values in the tooltip.
  function barChart(box, o) {
    const W = Math.max(box.clientWidth, 280), H = o.height || 200;
    const k = o.items.length, labelsOn = o.valueLabels === true || (o.valueLabels !== false && k <= 12);
    const m = { l: labelsOn ? 8 : 46, r: 8, t: labelsOn ? 18 : 10, b: 24 };
    const vals = o.items.map((d) => d.v), yfmt = o.yfmt || fmt.f2;
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals); const pad = (hi - lo) * 0.08 || 0.05; lo = lo < 0 ? lo - pad : 0; hi += pad;
    const sy = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    const bw = (W - m.l - m.r) / k;
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t(o.title || 'Bar chart'))}">`;
    if (!labelsOn) for (const v of ticks(lo, hi, 4).out) g += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${yfmt(v)}</text>`;
    g += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${sy(0)}" y2="${sy(0)}"/>`;
    const lw = 6.6 * Math.max(...o.items.map((d) => textLen(d.label))) + 8;   // thin the x labels so they never touch
    const every = Math.max(1, Math.ceil(lw / bw));
    o.items.forEach((d, j) => {
      const x = m.l + j * bw + bw * 0.16, w = bw * 0.68, y0 = sy(Math.max(0, d.v)), y1 = sy(Math.min(0, d.v));
      g += `<rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, y1 - y0).toFixed(1)}" rx="2" style="fill:${d.v < 0 ? 'var(--red)' : o.color || 'var(--navy)'}"/>`;
      if (labelsOn) g += `<text class="bar-v" x="${(x + w / 2).toFixed(1)}" y="${(d.v < 0 ? y1 + 12 : y0 - 5).toFixed(1)}" text-anchor="middle">${yfmt(d.v)}</text>`;
      if (j % every === 0) g += svgText(d.label, { x: (x + w / 2).toFixed(1), y: H - 8, 'text-anchor': 'middle' });
    });
    g += `</svg>`;
    box.innerHTML = g;
    const svg = box.querySelector('svg');
    svg.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const j = Math.floor((px - m.l) / bw);
      if (j < 0 || j >= k) { tipHide(box); return; }
      const d = o.items[j];
      tipShow(box, `<b>${esc(t(d.label))}</b> · ${yfmt(d.v)}${d.note ? '<br>' + esc(t(d.note)) : ''}`, ((m.l + (j + 0.5) * bw) / W) * r.width, (sy(Math.max(0, d.v)) / H) * r.height);
    });
    svg.addEventListener('pointerleave', () => tipHide(box));
  }

  // ---------------------------------------------------------------- dumbbell: before / after per row
  function dumbbell(box, o) {
    const W = Math.max(box.clientWidth, 280), rowH = 26, labW = Math.min(220, W * 0.36), valW = 54;
    const H = o.rows.length * rowH + 30, f = o.fmt || fmt.f3;
    const all = o.rows.flatMap((r) => [r.a, r.b]);
    const dom = o.domain || [Math.min(0, ...all), Math.max(...all) * 1.05];
    const sx = (v) => labW + ((v - dom[0]) / (dom[1] - dom[0])) * (W - labW - valW - 12);
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t(o.title || 'Before and after'))}">`;
    for (const v of ticks(dom[0], dom[1], W < 480 ? 2 : 4).out) g += `<line class="gridline" x1="${sx(v)}" x2="${sx(v)}" y1="18" y2="${H - 6}"/><text x="${sx(v)}" y="11" text-anchor="middle">${f(v)}</text>`;
    o.rows.forEach((r, j) => {
      const y = 30 + j * rowH, c = r.color || 'var(--navy)';
      g += svgText(r.label, { x: labW - 10, y: y + 4, 'text-anchor': 'end', style: 'fill:var(--ink);font-size:12px' });
      g += `<line x1="${sx(r.a)}" x2="${sx(r.b)}" y1="${y}" y2="${y}" style="stroke:var(--rule);stroke-width:3px;stroke-linecap:round"/>`;
      g += `<circle cx="${sx(r.a)}" cy="${y}" r="4.5" style="fill:var(--paper);stroke:var(--muted);stroke-width:1.5px"><title>${esc(t(o.aName))}: ${f(r.a)}</title></circle>`;
      g += `<circle cx="${sx(r.b)}" cy="${y}" r="5" style="fill:${c}"><title>${esc(t(o.bName))}: ${f(r.b)}</title></circle>`;
      const d = r.b - r.a, good = o.better === 'lower' ? d < 0 : d > 0, df = o.dfmt || f;
      g += `<text x="${W - 4}" y="${y + 4}" text-anchor="end" style="fill:${d === 0 ? 'var(--muted)' : good ? 'var(--teal)' : 'var(--red)'};font-weight:600">${(d > 0 ? '+' : d < 0 ? MINUS : '') + df(Math.abs(d))}</text>`;
    });
    g += `</svg>`;
    box.innerHTML = g;
  }

  // ---------------------------------------------------------------- matrix (idea × idea), instead of a hairball network
  function matrix(box, o) {
    const nodes = o.nodes, k = nodes.length, W = Math.max(box.clientWidth, 280);
    const labW = Math.min(170, W * 0.34), cell = Math.max(10, Math.floor((W - labW - 4) / k)), top = 16;
    const H = top + cell * k + 4;
    let max = o.max || 0; if (!max) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const v = o.value(i, j); if (v != null && v > max) max = v; }
    let g = `<svg viewBox="0 0 ${labW + cell * k + 4} ${H}" role="img" aria-label="${esc(t(o.title || 'Matrix'))}">`;
    nodes.forEach((nd, i) => {   // group colour bar on top, row labels on the left
      g += `<rect x="${labW + i * cell}" y="4" width="${cell - 1}" height="6" rx="1.5" style="fill:${nd.color}"/>`;
      g += svgText(nd.label, { x: labW - 8, y: top + i * cell + cell / 2 + 4, 'text-anchor': 'end' });
    });
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
      const v = i === j ? null : o.value(i, j), x = labW + j * cell, y = top + i * cell;
      if (v == null || v === 0) g += `<rect class="cell empty" data-i="${i}" data-j="${j}" x="${x}" y="${y}" width="${cell}" height="${cell}"/>`;
      else g += `<rect class="cell" data-i="${i}" data-j="${j}" x="${x}" y="${y}" width="${cell}" height="${cell}" style="fill:color-mix(in srgb, var(--navy) ${Math.round(18 + 82 * v / max)}%, var(--panel))"/>`;
    }
    let prev = nodes[0].group;  // thin lines between groups
    nodes.forEach((nd, i) => { if (i && nd.group !== prev) { g += `<line class="grp-line" x1="${labW + i * cell}" x2="${labW + i * cell}" y1="${top}" y2="${top + k * cell}"/><line class="grp-line" x1="${labW}" x2="${labW + k * cell}" y1="${top + i * cell}" y2="${top + i * cell}"/>`; } prev = nd.group; });
    g += `</svg>`;
    box.innerHTML = g;
    const svg = box.querySelector('svg');
    svg.addEventListener('pointermove', (ev) => {
      const el = ev.target.closest('rect.cell'); if (!el) { tipHide(box); return; }
      const i = +el.dataset.i, j = +el.dataset.j, v = o.value(i, j), r = svg.getBoundingClientRect(), br = box.getBoundingClientRect();
      tipShow(box, o.tip ? o.tip(i, j, v) : `<b>${esc(t(nodes[i].label))}</b> × <b>${esc(t(nodes[j].label))}</b><br>${v || 0}`, ev.clientX - br.left, ev.clientY - br.top);
    });
    svg.addEventListener('pointerleave', () => tipHide(box));
  }

  // ---------------------------------------------------------------- sparkline for a table cell
  function spark(values, color, w, h) {
    w = w || 96; h = h || 22;
    let lo = Infinity, hi = -Infinity; for (const v of values) if (v === v) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!isFinite(lo)) return '';
    const sx = (i) => 1 + (i / (values.length - 1)) * (w - 2), sy = (v) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4);
    let d = ''; values.forEach((v, i) => { if (v === v) d += (d ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); });
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" style="fill:none;stroke:${color};stroke-width:1.4px;stroke-linejoin:round"/></svg>`;
  }

  // ---------------------------------------------------------------- sortable table
  // columns: [{key, label, align:'l'|'r', fmt?(v,row), pri?:1|2|3, tone?:'high'|'low', html?(row)}]
  //   tone 'high' = higher is better, 'low' = lower is better → best third .good, weakest third .bad
  //   pri: 1 always shown, 2 hidden ≤ 560px, 3 hidden ≤ 900px (see kit.css section 15)
  // rows: plain objects; row.color (CSS var) draws the family stripe before the first column.
  function table(el, o) {
    let sortKey = o.sortKey || null, dir = o.sortDir || 'desc';
    const cols = o.columns, rows = o.rows.slice();
    const tones = {};
    for (const c of cols) if (c.tone) {
      const ord = rows.filter((r) => r[c.key] === r[c.key] && r[c.key] != null).sort((a, b) => (c.tone === 'high' ? b[c.key] - a[c.key] : a[c.key] - b[c.key]));
      const third = Math.round(ord.length / 3), m = new Map();
      ord.forEach((r, i) => m.set(r, i < third ? 'good' : i >= ord.length - third ? 'bad' : ''));
      tones[c.key] = m;
    }
    function draw() {
      if (sortKey) {
        rows.sort((a, b) => { const va = a[sortKey], vb = b[sortKey]; const r = typeof va === 'number' ? va - vb : String(t(va)).localeCompare(String(t(vb))); return dir === 'asc' ? r : -r; });
      }
      const th = cols.map((c) => `<th class="${c.align === 'l' ? 'l' : ''}"${c.pri ? ` data-pri="${c.pri}"` : ''}${sortKey === c.key ? ` aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : ''}><button type="button" data-k="${c.key}">${L(c.label)}</button></th>`).join('');
      const tb = rows.map((r) => '<tr>' + cols.map((c, ci) => {
        const v = r[c.key], tone = tones[c.key] ? tones[c.key].get(r) || '' : '';
        const body = c.html ? c.html(r) : c.fmt ? c.fmt(v, r) : L(v);
        const stripe = ci === 0 && r.color ? `<span class="stripe" style="--c:${r.color}"></span>` : '';
        return `<td class="${[c.align === 'l' ? 'l' : '', tone, c.cls || ''].join(' ').trim()}"${c.pri ? ` data-pri="${c.pri}"` : ''}>${stripe}${body}</td>`;
      }).join('') + '</tr>').join('');
      el.innerHTML = `<thead><tr>${th}</tr></thead><tbody>${tb}</tbody>`;
    }
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('th button'); if (!b) return;
      const k = b.dataset.k, c = cols.find((x) => x.key === k);
      if (sortKey === k) dir = dir === 'asc' ? 'desc' : 'asc'; else { sortKey = k; dir = c.align === 'l' || c.tone === 'low' ? 'asc' : 'desc'; }
      draw();
    });
    draw();
    return { redraw: draw };
  }

  // ---------------------------------------------------------------- language and theme toggles
  const LS_LANG = 'site_lang_choice', LS_THEME = 'site_theme_choice';
  const listeners = [];
  function setLang(l) {
    document.documentElement.setAttribute('data-lang', l); document.documentElement.lang = l;
    try { localStorage.setItem(LS_LANG, l); } catch (e) { /* storage blocked: fine */ }
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
    listeners.forEach((fn) => fn());
  }
  function setTheme(th) {
    if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th);
    try { localStorage.setItem(LS_THEME, th); } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-set-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setTheme === th)));
  }
  function initToggles() {
    let l = 'en', th = 'auto';
    const def = document.documentElement.getAttribute('data-default-lang') || 'en';
    l = def;
    try { l = localStorage.getItem(LS_LANG) || def; th = localStorage.getItem(LS_THEME) || 'auto'; } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
    document.querySelectorAll('[data-set-theme]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.setTheme)));
    setLang(l === 'zh' ? 'zh' : 'en'); setTheme(th);
  }
  function onLang(fn) { listeners.push(fn); }
  function onResize(fn) {
    let w = window.innerWidth, timer = 0;
    window.addEventListener('resize', () => { if (window.innerWidth === w) return; w = window.innerWidth; clearTimeout(timer); timer = setTimeout(fn, 120); });
  }

  return { MINUS, esc, fmt, t, L, ticks, niceStep, tipShow, tipHide, lineChart, barChart, dumbbell, matrix, spark, table, initToggles, setLang, setTheme, onLang, onResize };
})();
