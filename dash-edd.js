/* dash-edd.js · the web version of the EDD rollout dashboard on cases/ebay-edd.html (loaded after kit.js and site.js).
   Rebuilt from the dashboard delivered during the internship, keeping its analysis: GMV tab (windows → before/after →
   trends by year) and Shipping tab (coverage and adoption → promised days → on-time delivery → item-not-received).
   Every number comes from ONE seeded set of illustrative data generated below, so KPIs, formulas, charts and filters
   agree with each other. None of it is real eBay data. */
(function () {
  'use strict';
  const root = document.querySelector('[data-edd-dash]');
  if (!root || typeof Kit === 'undefined') return;
  const { t, L, esc, MINUS } = Kit;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------------------------- helpers
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20260704), jit = (a) => (R() - 0.5) * 2 * a;
  const sum = (a) => a.reduce((s, v) => s + v, 0), mean = (a) => sum(a) / a.length;
  const lerp = (a, b, f) => a + (b - a) * f;
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);
  const nf = (v) => Math.round(v).toLocaleString('en-US');
  const pick = (arr, ws) => ws.map((w) => arr[w - 1]);
  const wkDate = (w) => { const d = new Date(Date.UTC(2026, 0, 4 + 7 * (w - 1))); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
  const wkTip = (w) => t({ en: 'Week ' + w + ' (from ' + wkDate(w) + ')', zh: '第 ' + w + ' 周（' + wkDate(w) + ' 起）' });
  const wkTick = (w) => 'W' + w;

  // ================================================================================== GMV tab data
  // Three years of weekly GMV for the selected sellers (S), total demand (D) and the region's GC sellers (RG).
  const GW = 28, GX = Array.from({ length: GW }, (_, i) => i + 1);
  const BASE = [1, 2, 3, 4], EXIT = [25, 26, 27, 28];
  const YEARS = [2024, 2025, 2026];
  const YCOL = { 2024: 'var(--y2024)', 2025: 'var(--y2025)', 2026: 'var(--y2026)' };
  const SHADE = [{ x0: 0.5, x1: 4.5, label: { en: 'Base', zh: '基期' } }, { x0: 24.5, x1: 28.5, label: { en: 'Exit', zh: '观察期' } }];
  const DEM = { 2024: 150, 2025: 157, 2026: 163 }, SHR = { 2024: 0.080, 2025: 0.077, 2026: 0.079 };
  const TREND = { 2024: (w) => 0.012 * w / GW, 2025: (w) => -0.010 * w / GW, 2026: (w) => (w < 10 ? 0 : Math.min(1, (w - 10) / 12) * 0.03) };
  const lny = (w) => 1 - 0.12 * Math.exp(-((w - 7) ** 2) / 3.5);   // a dip around the lunar new year, every year
  const G = {};
  for (const y of YEARS) {
    const D = GX.map((w) => DEM[y] * (1 + 0.045 * Math.sin((w + 2) / 4.4)) * (1 - 0.05 * Math.exp(-((w - 7) ** 2) / 5)) * (1 + jit(0.012)));
    const SH = GX.map((w) => SHR[y] * lny(w) * (1 + TREND[y](w) + jit(0.01)));
    const S = D.map((d, i) => d * SH[i]);
    const RG = S.map((s) => s / (0.42 * (1 + jit(0.01))));
    const ix = (a) => { const b = mean(pick(a, BASE)); return a.map((v) => (v / b) * 100); };
    G[y] = { D, SH, S, RG, Di: ix(D), SHi: ix(SH), Si: ix(S) };
  }
  // KPIs, computed from the rounded figures that are printed, so every formula on the page adds up exactly.
  const K = { ex: {}, d: {} };
  for (const y of YEARS) { K.ex[y] = r1(mean(pick(G[y].SHi, EXIT))); K.d[y] = r1(K.ex[y] - 100); }
  K.sB = r1(sum(pick(G[2026].S, BASE))); K.rB = r1(sum(pick(G[2026].RG, BASE)));
  K.mixP = r1((K.sB / K.rB) * 100);              // selected sellers' share of the region's GMV in the base window, %
  K.inSeg = K.d[2026];                           // share index change, before vs after, %
  K.region = r2((K.mixP / 100) * K.inSeg);       // pp of region GMV
  K.season = r2((K.d[2024] + K.d[2025]) / 2);    // what the same weeks did in earlier years
  K.vs = r2(K.inSeg - K.season);
  K.regionVs = r2((K.mixP / 100) * K.vs);

  // ================================================================================== Shipping tab data
  const SW = 25, SX = Array.from({ length: SW }, (_, i) => i + 1), IMM = 4;   // last 4 weeks: claims not yet 30 days old
  const OPTS = [
    { k: 'speedpak', name: 'SpeedPAK', vol: 900, cov: [0.86, 0.93], ad: [0.21, 0.31], aov: 21, h: 2.6, tr: 8.2, ot: 0.93, inr: 0.009 },
    { k: 'economy', name: 'Economy', vol: 520, cov: [0.56, 0.70], ad: [0.11, 0.20], aov: 16, h: 3.0, tr: 11.4, ot: 0.89, inr: 0.014 },
    { k: 'express', name: 'Express', vol: 240, cov: [0.70, 0.82], ad: [0.15, 0.25], aov: 48, h: 2.1, tr: 5.3, ot: 0.95, inr: 0.006 },
    { k: 'standard', name: 'Standard', vol: 380, cov: [0.62, 0.76], ad: [0.19, 0.30], aov: 27, h: 2.8, tr: 9.5, ot: 0.91, inr: 0.011 },
  ];
  const GROUPS = ['a', 'e', 'u'];   // used the model / eligible but not used / not covered
  const GLAB = { a: { en: 'Used the model', zh: '实际采用模型' }, e: { en: 'Eligible, not used', zh: '符合条件但未采用' }, u: { en: 'Not covered', zh: '未覆盖' } };
  const GFILL = { a: 'var(--adopt)', e: 'var(--elig)', u: 'var(--uncov)' };
  const GLINE = { a: 'var(--adopt)', e: 'var(--elig-line)', u: 'var(--uncov-line)' };
  const GMULT = { a: 1, e: 1.05, u: 0.93 };   // average order value relative to the option's
  for (const o of OPTS) {
    o.N = []; o.Ef = []; o.ar = [];
    o.hd = { a: [], e: [], u: [] }; o.td = { a: [], e: [], u: [] }; o.ots = { a: [], e: [], u: [] }; o.inrs = { a: [], e: [], u: [] };
    for (const w of SX) {
      const f = (w - 1) / (SW - 1);
      const n = Math.round(o.vol * (1 + 0.06 * Math.sin(w / 3.8)) * (1 - 0.18 * Math.exp(-((w - 7) ** 2) / 3)) * (1 + jit(0.04)));
      o.N.push(n);
      o.Ef.push(n * Math.min(0.97, lerp(o.cov[0], o.cov[1], f) + jit(0.012)));
      o.ar.push(Math.max(0.03, lerp(o.ad[0], o.ad[1], f) + jit(0.015)));
      // promised days: eligible-but-not-used orders keep the rule's date; used-the-model orders got a shorter one
      o.hd.a.push(o.h - 0.35 + jit(0.08)); o.hd.e.push(o.h + jit(0.08)); o.hd.u.push(o.h + 0.05 + jit(0.08));
      o.td.a.push(o.tr * 0.8 + jit(0.2)); o.td.e.push(o.tr * 0.99 + jit(0.2)); o.td.u.push(o.tr + jit(0.2));
      o.ots.a.push(o.ot - 0.006 + jit(0.008)); o.ots.e.push(o.ot + jit(0.008)); o.ots.u.push(o.ot - 0.003 + jit(0.008));
      o.inrs.a.push(o.inr * (1 + jit(0.12)) + 0.0004); o.inrs.e.push(o.inr * (1 + jit(0.12))); o.inrs.u.push(o.inr * (1 + jit(0.12)) + 0.0002);
    }
  }
  // Calibrate the whole set to exactly 80 % coverage and 25 % adoption: the same ratios as the 100-order example on the home page.
  function settle(arrs, target) { const d = target - sum(arrs.map(sum)); let bi = 0, bj = 0, bv = -1; arrs.forEach((a, i) => a.forEach((v, j) => { if (v > bv) { bv = v; bi = i; bj = j; } })); arrs[bi][bj] += d; }
  const Ntot = sum(OPTS.map((o) => sum(o.N)));
  const kE = (0.8 * Ntot) / sum(OPTS.map((o) => sum(o.Ef)));
  OPTS.forEach((o) => { o.E = o.Ef.map((v, i) => Math.min(o.N[i] - 1, Math.round(v * kE))); });
  settle(OPTS.map((o) => o.E), Math.round(0.8 * Ntot));
  const Etot = sum(OPTS.map((o) => sum(o.E)));
  const rawA = OPTS.map((o) => o.E.map((e, i) => e * o.ar[i]));
  const kA = (0.25 * Etot) / sum(rawA.map(sum));
  OPTS.forEach((o, j) => { o.A = rawA[j].map((v, i) => Math.min(o.E[i], Math.round(v * kA))); });
  settle(OPTS.map((o) => o.A), Math.round(0.25 * Etot));
  const cnt = (o, k, i) => (k === 'a' ? o.A[i] : k === 'e' ? o.E[i] - o.A[i] : o.N[i] - o.E[i]);

  // weekly rows for the chosen option (or all of them): counts, sales and order-weighted averages per group
  function view(sel) {
    const os = sel === 'all' ? OPTS : OPTS.filter((o) => o.k === sel);
    return SX.map((w, i) => {
      const r = { n: {}, g: {}, hd: {}, td: {}, ot: {}, inr: {} };
      for (const k of GROUPS) {
        let n = 0, g = 0, hd = 0, td = 0, ot = 0, inr = 0;
        for (const o of os) { const c = cnt(o, k, i); n += c; g += c * o.aov * GMULT[k]; hd += c * o.hd[k][i]; td += c * o.td[k][i]; ot += c * o.ots[k][i]; inr += c * o.inrs[k][i]; }
        r.n[k] = n; r.g[k] = g; r.hd[k] = hd / n; r.td[k] = td / n; r.ot[k] = ot / n; r.inr[k] = inr / n;
      }
      return r;
    });
  }
  function totals(rows) {
    const T = { n: {}, g: {}, hd: {}, td: {}, ot: {}, inr: {} };
    for (const k of GROUPS) {
      const ns = rows.map((r) => r.n[k]), nsum = sum(ns), mat = rows.slice(0, SW - IMM);
      T.n[k] = nsum; T.g[k] = sum(rows.map((r) => r.g[k]));
      for (const m of ['hd', 'td', 'ot']) T[m][k] = sum(rows.map((r) => r[m][k] * r.n[k])) / nsum;
      T.inr[k] = sum(mat.map((r) => r.inr[k] * r.n[k])) / sum(mat.map((r) => r.n[k]));
    }
    return T;
  }

  // ================================================================================== drawing: GMV tab
  const state = { gmv: 'raw', opt: 'all', basis: 'n' };
  function drawGmv() {
    const tile = (lab, big, sub) => `<div class="stat"><span class="lab">${L(lab)}</span><span class="big">${big}</span><span class="sub">${L(sub)}</span></div>`;
    const mix = K.mixP.toFixed(1) + '%';
    $('gmv-kpis').innerHTML = [
      tile({ en: 'GMV mix, base window', zh: '基期 GMV 占比' }, mix,
        { en: `Selected ${K.sB.toFixed(1)} ÷ region ${K.rB.toFixed(1)}`, zh: `选定卖家 ${K.sB.toFixed(1)} ÷ 区域 ${K.rB.toFixed(1)}` }),
      tile({ en: 'In-segment change · before vs after', zh: '段内变化 · 前后对比' }, sgn(K.inSeg, 1) + '%',
        { en: `Exit-window share index ${K.ex[2026].toFixed(1)} − 100`, zh: `观察期份额指数 ${K.ex[2026].toFixed(1)} − 100` }),
      tile({ en: 'Region impact · before vs after', zh: '折算到区域 · 前后对比' }, sgn(K.region, 2) + ' pp',
        { en: `${mix} × ${sgn(K.inSeg, 1)}%`, zh: `${mix} × ${sgn(K.inSeg, 1)}%` }),
      tile({ en: 'In-segment change · vs season', zh: '段内变化 · 扣除季节' }, sgn(K.vs, 2) + '%',
        { en: `2026 ${sgn(K.inSeg, 1)}% − past-year mean ${sgn(K.season, 2)}%`, zh: `2026 年 ${sgn(K.inSeg, 1)}% − 往年同期均值 ${sgn(K.season, 2)}%` }),
      tile({ en: 'Region impact · vs season', zh: '折算到区域 · 扣除季节' }, sgn(K.regionVs, 2) + ' pp',
        { en: `${mix} × ${sgn(K.vs, 2)}%`, zh: `${mix} × ${sgn(K.vs, 2)}%` }),
    ].join('');
    const all = YEARS.map((y) => K.ex[y]);
    Kit.dumbbell($('gmv-db'), {
      rows: YEARS.map((y) => ({ label: String(y), a: 100, b: K.ex[y], color: YCOL[y] })),
      aName: { en: 'Base window', zh: '基期' }, bName: { en: 'Exit window', zh: '观察期' },
      fmt: (v) => v.toFixed(1), dfmt: (v) => v.toFixed(1), better: 'higher',
      domain: [Math.floor(Math.min(100, ...all) - 2), Math.ceil(Math.max(100, ...all) + 2)],
      title: { en: 'Share index, base window to exit window, by year', zh: '各年份额指数：从基期到观察期' },
    });
    $('gmv-db-cap').innerHTML = L({
      en: `Share index: each year's base window = 100; the dot is the exit-window mean. 2024 moved ${sgn(K.d[2024], 1)}, 2025 ${sgn(K.d[2025], 1)}, a mean of ${sgn(K.season, 2)}. 2026 moved ${sgn(K.inSeg, 1)}; the difference, ${sgn(K.vs, 2)}, is the change "vs season".`,
      zh: `份额指数：每年以自己的基期为 100，圆点是观察期均值。2024 年 ${sgn(K.d[2024], 1)}，2025 年 ${sgn(K.d[2025], 1)}，平均 ${sgn(K.season, 2)}；2026 年 ${sgn(K.inSeg, 1)}。两者之差 ${sgn(K.vs, 2)}，就是「扣除季节」的段内变化。`,
    });
    drawTrends();
  }
  function drawTrends() {
    const idx = state.gmv === 'idx', f0 = (v) => v.toFixed(0);
    const specs = [
      { id: 'gmv-t1', y: (yr) => (idx ? G[yr].Si : G[yr].S), f: idx ? f0 : (v) => v.toFixed(1),
        title: idx ? { en: "Selected sellers' GMV · index", zh: '选定卖家 GMV · 指数' } : { en: "Selected sellers' GMV (illustrative units)", zh: '选定卖家 GMV（示意单位）' } },
      { id: 'gmv-t2', y: (yr) => (idx ? G[yr].Di : G[yr].D), f: f0,
        title: idx ? { en: 'Total demand GMV · index', zh: '市场需求总 GMV · 指数' } : { en: 'Total demand GMV (illustrative units)', zh: '市场需求总 GMV（示意单位）' } },
      { id: 'gmv-t3', y: (yr) => (idx ? G[yr].SHi : G[yr].SH.map((v) => v * 100)), f: idx ? f0 : (v) => v.toFixed(1) + '%',
        title: idx ? { en: 'Share of demand · index', zh: '市场份额 · 指数' } : { en: 'Share of demand', zh: '市场份额' } },
    ];
    for (const s of specs) {
      $(s.id + '-title').innerHTML = L(s.title);
      const series = YEARS.map((yr) => ({ key: String(yr), label: String(yr), y: s.y(yr), color: YCOL[yr], width: yr === 2026 ? 2.2 : 1.6 }));
      if (idx) series.push({ key: 'base', label: { en: 'Base = 100', zh: '基期 = 100' }, y: GX.map(() => 100), color: 'var(--muted)', width: 1, dash: '3 3' });
      Kit.lineChart($(s.id), { x: GX, series, height: 210, left: 46, xstep: 4, xfmt: wkTick, shade: SHADE, zero: false, endLabels: false, yfmt: s.f, tipfmt: s.f, tipx: wkTip, title: s.title });
    }
    $('gmv-read').innerHTML = L(idx
      ? { en: 'Base-window index: each year is divided by its own base-window mean, so all three start near 100 and you compare paths, not levels. In the exit window, the gap between 2026 and the earlier years is what the cards above turn into numbers.', zh: '基期指数：每年都除以自己基期的均值，三条线都从 100 附近出发，比较的是走势而不是量级。观察期里 2026 年与往年之间的差距，就是上面几张卡片算出来的数字。' }
      : { en: 'Raw values: level and seasonality. Each year sits at a different level, so the height of a line says nothing about its direction. Switch to the index to compare paths.', zh: '原始值：看量级和季节起伏。三年的水平不同，线的高低说明不了走势。切到「基期指数」才能比较三年的走势。' });
  }

  // ================================================================================== drawing: Shipping tab
  function covChart(box, rows, basis) {
    const W = Math.max(box.clientWidth, 280), H = 230, m = { l: 42, r: 6, t: 12, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, bw = pw / rows.length;
    const sy = (v) => m.t + (1 - v) * ph;
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t({ en: 'Each week of orders split into: used the model, eligible but not used, not covered', zh: '每周订单分成三组：实际采用模型、符合条件但未采用、未覆盖' }))}">`;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) g += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`;
    rows.forEach((r, i) => {
      const v = r[basis], tot = v.a + v.e + v.u, x = m.l + i * bw + bw * 0.12, w = bw * 0.76;
      let lo = 0;
      for (const k of GROUPS) { const h = v[k] / tot; g += `<rect x="${x.toFixed(1)}" y="${sy(lo + h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * ph).toFixed(1)}" style="fill:${GFILL[k]}"/>`; lo += h; }
      if ((i + 1) % 4 === 0) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${wkTick(i + 1)}</text>`;
    });
    g += `<rect class="hit" x="${m.l}" y="0" width="${pw}" height="${H}" fill="transparent" style="cursor:crosshair"/></svg>`;
    box.innerHTML = g;
    const svg = box.querySelector('svg'), hit = svg.querySelector('.hit');
    const show = (ev) => {
      const rc = svg.getBoundingClientRect(), px = ((ev.clientX - rc.left) / rc.width) * W, i = Math.floor((px - m.l) / bw);
      if (i < 0 || i >= rows.length) { Kit.tipHide(box); return; }
      const v = rows[i][basis], tot = v.a + v.e + v.u;
      Kit.tipShow(box, `<b>${esc(wkTip(i + 1))}</b><br>${esc(t({ en: 'Coverage', zh: '覆盖率' }))} ${(((v.a + v.e) / tot) * 100).toFixed(1)}% · ${esc(t({ en: 'Adoption', zh: '采用率' }))} ${((v.a / (v.a + v.e)) * 100).toFixed(1)}%`,
        ((m.l + (i + 0.5) * bw) / W) * rc.width, (sy((v.a + v.e) / tot) / H) * rc.height);
    };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', () => Kit.tipHide(box));
  }
  function eqHtml(T, basis) {
    const k = basis === 'g', q = (x) => (k ? Math.round(x / 1000) : x), u = k ? 'k' : '';
    const N = q(T[basis].a + T[basis].e + T[basis].u), E = q(T[basis].a + T[basis].e), A = q(T[basis].a);
    const eq = (lab, num, nl, den, dl) => `<p class="eq"><span class="k">${L(lab)}</span><span class="v">${L(nl)} <b>${nf(num)}${u}</b> ÷ ${L(dl)} ${nf(den)}${u} = <b>${((num / den) * 100).toFixed(1)}%</b></span></p>`;
    return eq({ en: 'Coverage', zh: '覆盖率' }, E, { en: 'eligible', zh: '符合条件' }, N, { en: 'all', zh: '全部' })
      + eq({ en: 'Adoption among eligible', zh: '符合条件订单中的采用率' }, A, { en: 'used the model', zh: '实际采用' }, E, { en: 'eligible', zh: '符合条件' });
  }
  function drawCov() { const rows = view(state.opt), T = totals(rows); $('ship-eqs').innerHTML = eqHtml(T, state.basis); covChart($('ship-cov'), rows, state.basis); }
  function eddTable(el, T) {
    const hd = {}, td = {};
    for (const k of GROUPS) { hd[k] = r1(T.hd[k]); td[k] = r1(T.td[k]); }
    const mh = Math.max(...GROUPS.map((k) => hd[k])), mt = Math.max(...GROUPS.map((k) => td[k]));
    let h = `<span class="hd"></span><span class="hd">${L({ en: 'Handling', zh: '预计处理' })}</span><span class="hd">${L({ en: 'Transit', zh: '预计运输' })}</span><span class="hd tot">${L({ en: 'Delivery', zh: '整体送达' })}</span>`;
    for (const k of GROUPS) {
      h += `<span class="lab" style="--c:${GFILL[k]}"><span class="sw"></span>${L(GLAB[k])}</span>`
        + `<span class="bar" style="--c:${GFILL[k]}"><i style="width:${((hd[k] / mh) * 70).toFixed(1)}%"></i>${hd[k].toFixed(1)}</span>`
        + `<span class="bar" style="--c:${GFILL[k]}"><i style="width:${((td[k] / mt) * 70).toFixed(1)}%"></i>${td[k].toFixed(1)}</span>`
        + `<span class="tot">${(hd[k] + td[k]).toFixed(1)}</span>`;
    }
    el.innerHTML = h;
  }
  const lines = (rows, f, mature) => GROUPS.map((k) => ({ key: k, label: GLAB[k], color: GLINE[k], width: k === 'a' ? 2.2 : 1.6, y: rows.map((r, i) => (mature && i >= SW - IMM ? null : f(r, k))) }));
  const pct1 = (v) => (v * 100).toFixed(1) + '%', pct2 = (v) => (v * 100).toFixed(2) + '%';
  function drawShip() {
    const rows = view(state.opt), T = totals(rows);
    const name = state.opt === 'all' ? { en: 'All shipping options', zh: '全部物流方式' } : (() => { const o = OPTS.find((x) => x.k === state.opt); return { en: o.name, zh: o.name }; })();
    const Nall = T.n.a + T.n.e + T.n.u;
    $('ship-scope').innerHTML = L({ en: `${name.en}: weeks 1–25 (Jan 4–Jun 27), ${nf(Nall)} orders (illustrative). Every chart below follows this choice.`, zh: `${name.zh}：第 1–25 周（1/4–6/27），共 ${nf(Nall)} 笔订单（示意）。下面每张图都跟着这个选择变化。` });
    $('ship-eqs').innerHTML = eqHtml(T, state.basis);
    covChart($('ship-cov'), rows, state.basis);
    eddTable($('ship-edd'), T);
    Kit.lineChart($('ship-edd-line'), { x: SX, series: lines(rows, (r, k) => r.hd[k] + r.td[k]), height: 190, left: 40, xstep: 4, xfmt: wkTick, zero: false, endLabels: false, yfmt: (v) => v.toFixed(0), tipfmt: (v) => v.toFixed(1), tipx: wkTip, title: { en: 'Promised delivery days by week', zh: '每周预计送达天数' } });
    Kit.lineChart($('ship-ot'), { x: SX, series: lines(rows, (r, k) => r.ot[k]), height: 200, left: 48, xstep: 4, xfmt: wkTick, zero: false, endLabels: false, yfmt: pct1, tipfmt: pct1, tipx: wkTip, title: { en: 'On-time delivery by week', zh: '每周实际准时送达率' } });
    Kit.lineChart($('ship-inr'), { x: SX, series: lines(rows, (r, k) => r.inr[k], true), height: 200, left: 52, xstep: 4, xfmt: wkTick, zero: false, endLabels: false, yfmt: pct2, tipfmt: pct2, tipx: wkTip,
      shade: [{ x0: SW - IMM + 0.5, x1: SW + 0.5, label: { en: 'Under 30 days', zh: '未满 30 天' } }], title: { en: 'Item-not-received rate by week', zh: '每周未收到货投诉率' } });
    const by = (m, f) => GROUPS.map((k) => ({ en: `${GLAB[k].en} ${f(T[m][k])}`, zh: `${GLAB[k].zh} ${f(T[m][k])}` }));
    const join = (arr) => ({ en: arr.map((x) => x.en).join(' · '), zh: arr.map((x) => x.zh).join(' · ') });
    const ot = join(by('ot', pct1)), inr = join(by('inr', pct2));
    $('ship-ot-cap').innerHTML = L({ en: `Delivery scan before the promised date. Period, order-weighted: ${ot.en}.`, zh: `签收扫描早于预计送达时间。期内按订单加权：${ot.zh}。` });
    $('ship-inr-cap').innerHTML = L({ en: `Claims within 30 days of the order. Weeks 22–25 are left out until they are 30 days old. Weeks 1–21: ${inr.en}.`, zh: `下单后 30 天内发起的未收到货投诉。第 22–25 周未满 30 天，暂不计入。第 1–21 周：${inr.zh}。` });
  }

  // ================================================================================== wiring
  const P = { gmv: $('dpanel-gmv'), ship: $('dpanel-shipping') };
  const lastW = new Map();
  function redraw(el, force) {   // draw only when visible (width > 0), and again whenever the width changes
    const w = el.offsetWidth;
    if (!w || (!force && lastW.get(el) === w)) return;
    lastW.set(el, w);
    (el === P.gmv ? drawGmv : drawShip)();
  }
  function seg(el, fn) {
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-v]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      el.querySelectorAll('button[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fn(b.dataset.v);
    });
  }
  seg($('gmv-mode'), (v) => { state.gmv = v; drawTrends(); });
  seg($('ship-opt'), (v) => { state.opt = v; drawShip(); });
  seg($('ship-basis'), (v) => { state.basis = v; drawCov(); });
  if ('ResizeObserver' in window) { const ro = new ResizeObserver((es) => es.forEach((e) => redraw(e.target))); ro.observe(P.gmv); ro.observe(P.ship); }
  Kit.onResize(() => { redraw(P.gmv, true); redraw(P.ship, true); });
  Kit.onLang(() => { redraw(P.gmv, true); redraw(P.ship, true); });
  root.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => { redraw(P.gmv); redraw(P.ship); }));
  window.addEventListener('site:target', () => { redraw(P.gmv); redraw(P.ship); });
  redraw(P.gmv); redraw(P.ship);
})();
