/* dash-edd.js · the web version of the EDD rollout dashboard in the EDD project of index.html (loaded after kit.js and site.js).
   Rebuilt from the dashboard delivered during the internship, keeping its analysis: GMV tab (windows → before/after →
   trends by year) and Shipping tab (coverage and adoption → promised days → on-time delivery and tracking → complaints).
   Every number comes from ONE seeded set of illustrative data generated below, so KPIs, formulas, charts, the guided
   demo (edd-tour.js) and the AI brief prototype (edd-brief.js) agree with each other. None of it is real eBay data.

   window.EDD is the shared interface: summary() and briefInput() do all the arithmetic (the brief's model never
   calculates), set()/on() keep the dashboard, the demo and the brief on the same filter. It is defined before any DOM
   work, so brief/export.html can load this file without the page and export the exact inputs the page builds. */
(function () {
  'use strict';
  if (typeof Kit === 'undefined') return;
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
  const day = (w, d) => new Date(Date.UTC(2026, 0, 4 + 7 * (w - 1) + d));   // week 1 starts on Sunday 4 January 2026
  const md = (dt) => (dt.getUTCMonth() + 1) + '/' + dt.getUTCDate();
  const wkDate = (w) => md(day(w, 0)), wkEnd = (w) => md(day(w, 6));
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
  // Weeks 1–25 (Jan 4–Jun 27). The data is "as of 19 July", the day after the GMV tab's exit window ends. Delivery scans
  // are complete for every week shown; item-not-received claims need 30 days after a week's last order, so the last
  // weeks are not mature yet (week 24 completes 20 July, week 25 on 27 July).
  const SW = 25, SX = Array.from({ length: SW }, (_, i) => i + 1);
  const ASOF = day(28, 7), ASOF_TXT = md(ASOF);
  const inrDone = (w) => day(w, 6 + 30);
  const mature = (w) => inrDone(w) <= ASOF;
  const IMM = SX.filter((w) => !mature(w));     // [24, 25]
  const WINS = {
    all: { w: SX },
    w18: { w: [18, 19, 20, 21], base: [14, 15, 16, 17] },
    w22: { w: [22, 23, 24, 25], base: [18, 19, 20, 21] },
  };
  const wl = (ws) => `W${ws[0]}–W${ws[ws.length - 1]}`, wd = (ws) => `${wkDate(ws[0])}–${wkEnd(ws[ws.length - 1])}`;
  // Four shipping options. SpeedPAK: almost every order is eligible, few switch to the model's date. Economy: tracking
  // scans start to go missing in the last weeks, and its measured on-time rate rises with it.
  const OPTS = [
    { k: 'speedpak', name: 'SpeedPAK', vol: 900, cov: [0.88, 0.94], ad: [0.07, 0.10], aov: 21, h: 2.6, tr: 8.2, ot: 0.93, inr: 0.009, trk: 0.975 },
    { k: 'economy', name: 'Economy', vol: 520, cov: [0.55, 0.70], ad: [0.28, 0.38], aov: 16, h: 3.0, tr: 11.4, ot: 0.89, inr: 0.014, trk: 0.915, dip: [0.03, 0.045, 0.055, 0.06] },
    { k: 'express', name: 'Express', vol: 240, cov: [0.70, 0.82], ad: [0.15, 0.24], aov: 48, h: 2.1, tr: 5.3, ot: 0.95, inr: 0.006, trk: 0.985 },
    { k: 'standard', name: 'Standard', vol: 380, cov: [0.62, 0.76], ad: [0.22, 0.32], aov: 27, h: 2.8, tr: 9.5, ot: 0.91, inr: 0.011, trk: 0.955 },
  ];
  const GROUPS = ['a', 'e', 'u'];   // used the model / eligible but not used / not covered
  const GLAB = { a: { en: 'Used the model', zh: '实际采用模型' }, e: { en: 'Eligible, not used', zh: '符合条件但未采用' }, u: { en: 'Not covered', zh: '未覆盖' } };
  const GFILL = { a: 'var(--adopt)', e: 'var(--elig)', u: 'var(--uncov)' };
  const GLINE = { a: 'var(--adopt)', e: 'var(--elig-line)', u: 'var(--uncov-line)' };
  const GMULT = { a: 1, e: 1.05, u: 0.93 };   // average order value relative to the option's
  for (const o of OPTS) {
    o.N = []; o.Ef = []; o.ar = [];
    o.hd = { a: [], e: [], u: [] }; o.td = { a: [], e: [], u: [] }; o.ots = { a: [], e: [], u: [] }; o.inrs = { a: [], e: [], u: [] }; o.trks = { a: [], e: [], u: [] };
    for (const w of SX) {
      const f = (w - 1) / (SW - 1), dip = o.dip && w >= 22 ? o.dip[w - 22] : 0;
      const n = Math.round(o.vol * (1 + 0.06 * Math.sin(w / 3.8)) * (1 - 0.18 * Math.exp(-((w - 7) ** 2) / 3)) * (1 + jit(0.04)));
      o.N.push(n);
      o.Ef.push(n * Math.min(0.97, lerp(o.cov[0], o.cov[1], f) + jit(0.012)));
      o.ar.push(Math.max(0.03, lerp(o.ad[0], o.ad[1], f) + jit(0.015)));
      // promised days: eligible-but-not-used orders keep the rule's date; used-the-model orders got a shorter one
      o.hd.a.push(o.h - 0.35 + jit(0.08)); o.hd.e.push(o.h + jit(0.08)); o.hd.u.push(o.h + 0.05 + jit(0.08));
      o.td.a.push(o.tr * 0.8 + jit(0.2)); o.td.e.push(o.tr * 0.99 + jit(0.2)); o.td.u.push(o.tr + jit(0.2));
      // on-time is measured on orders with a delivery scan; when scans go missing the measured rate drifts up (dip)
      o.ots.a.push(o.ot - 0.006 + dip * 0.3 + jit(0.006)); o.ots.e.push(o.ot + dip * 0.3 + jit(0.006)); o.ots.u.push(o.ot - 0.003 + dip * 0.3 + jit(0.006));
      o.trks.a.push(o.trk - dip + jit(0.004)); o.trks.e.push(o.trk - dip + jit(0.004)); o.trks.u.push(o.trk - 0.004 - dip + jit(0.004));
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
  const viewCache = {};
  function view(sel) {
    if (viewCache[sel]) return viewCache[sel];
    const os = sel === 'all' ? OPTS : OPTS.filter((o) => o.k === sel);
    return (viewCache[sel] = SX.map((w, i) => {
      const r = { n: {}, g: {}, hd: {}, td: {}, ot: {}, trk: {}, inr: {} };
      for (const k of GROUPS) {
        let n = 0, g = 0, hd = 0, td = 0, ot = 0, tk = 0, inr = 0;
        for (const o of os) { const c = cnt(o, k, i), sc = c * o.trks[k][i]; n += c; g += c * o.aov * GMULT[k]; hd += c * o.hd[k][i]; td += c * o.td[k][i]; tk += sc; ot += sc * o.ots[k][i]; inr += c * o.inrs[k][i]; }
        r.n[k] = n; r.g[k] = g; r.hd[k] = hd / n; r.td[k] = td / n; r.trk[k] = tk / n; r.ot[k] = ot / tk; r.inr[k] = inr / n;
      }
      return r;
    }));
  }
  // period figures for a set of weeks; on-time is weighted by orders with a scan, complaints use mature weeks only
  function agg(rows, ws) {
    const A = { n: {}, g: {}, hd: {}, td: {}, ot: {}, trk: {}, inr: {}, mat: ws.filter(mature) };
    for (const k of GROUPS) {
      const rs = ws.map((w) => rows[w - 1]), ms = A.mat.map((w) => rows[w - 1]), nsum = sum(rs.map((r) => r.n[k]));
      A.n[k] = nsum; A.g[k] = sum(rs.map((r) => r.g[k]));
      A.hd[k] = sum(rs.map((r) => r.hd[k] * r.n[k])) / nsum; A.td[k] = sum(rs.map((r) => r.td[k] * r.n[k])) / nsum;
      const sc = sum(rs.map((r) => r.trk[k] * r.n[k]));
      A.trk[k] = sc / nsum; A.ot[k] = sum(rs.map((r) => r.ot[k] * r.trk[k] * r.n[k])) / sc;
      A.inr[k] = ms.length ? sum(ms.map((r) => r.inr[k] * r.n[k])) / sum(ms.map((r) => r.n[k])) : null;
    }
    return A;
  }
  // rounded, printable figures; every difference below is taken from the rounded values, so the page adds up
  function pack(A, basis) {
    const v = A[basis], q = basis === 'g' ? (x) => Math.round(x / 1000) : Math.round;
    const N = q(v.a + v.e + v.u), E = q(v.a + v.e), Ad = q(v.a);
    const P = { N, E, A: Ad, cov: r1((E / N) * 100), ad: r1((Ad / E) * 100), hd: {}, td: {}, tot: {}, ot: {}, trk: {}, inr: {}, mat: A.mat, orders: Math.round(A.n.a + A.n.e + A.n.u) };
    for (const k of GROUPS) {
      P.hd[k] = r1(A.hd[k]); P.td[k] = r1(A.td[k]); P.tot[k] = r1(P.hd[k] + P.td[k]);
      P.ot[k] = r1(A.ot[k] * 100); P.trk[k] = r1(A.trk[k] * 100); P.inr[k] = A.inr[k] == null ? null : r2(A.inr[k] * 100);
    }
    return P;
  }
  const sumCache = {};
  function summary(opt, win, basis) {
    basis = basis || 'n';
    const key = opt + '|' + win + '|' + basis;
    if (sumCache[key]) return sumCache[key];
    const rows = view(opt), W = WINS[win];
    const cur = pack(agg(rows, W.w), basis), base = W.base ? pack(agg(rows, W.base), basis) : null;
    return (sumCache[key] = { opt, win, basis, weeks: W.w, baseWeeks: W.base || null, cur, base, full: W.w.every(mature) });
  }
  const optName = (opt) => (opt === 'all' ? { en: 'All shipping options', zh: '全部物流方式' } : { en: OPTS.find((o) => o.k === opt).name, zh: OPTS.find((o) => o.k === opt).name });
  function winName(win) {
    const W = WINS[win];
    if (win === 'all') return { en: 'all 25 weeks (W1–W25)', zh: '全部 25 周（W1–W25）' };
    return { en: `${wl(W.w)} (${wd(W.w)})`, zh: `${wl(W.w)}（${wd(W.w)}）` };
  }
  const scopeName = (opt, win) => ({ en: `${optName(opt).en} · ${winName(win).en}`, zh: `${optName(opt).zh} · ${winName(win).zh}` });

  // ---------------------------------------------------------------------------------- the brief's structured input
  // The program does every calculation; the model only explains. Numbers are passed as finished strings so the
  // brief can quote them exactly, and the checker can verify that every number in a brief came from here.
  const pc = (v) => v.toFixed(1) + '%', pp = (v) => sgn(v, 1) + ' pp', pc2 = (v) => v.toFixed(2) + '%';
  const byG = (o, f) => ({ used_model: f(o.a), eligible_not_used: f(o.e), not_covered: f(o.u) });
  function briefInput(opt, win, lang) {
    if (win === 'all') return null;
    const S = summary(opt, win, 'n'), c = S.cur, b = S.base, W = WINS[win];
    const chg = (f) => byG({ a: r1(f(c, 'a') - f(b, 'a')), e: r1(f(c, 'e') - f(b, 'e')), u: r1(f(c, 'u') - f(b, 'u')) }, pp);
    const daysTxt = (P) => byG({ a: 'a', e: 'e', u: 'u' }, (k) => `${P.tot[k].toFixed(1)} (handling ${P.hd[k].toFixed(1)} + transit ${P.td[k].toFixed(1)})`);
    const imm = W.w.filter((w) => !mature(w));
    const inr = S.full
      ? { maturity: `Complete: every window week has a full 30 days of claims (data as of ${ASOF_TXT}).`,
          window: byG(c.inr, pc2), baseline: byG(b.inr, pc2), change_pp: byG({ a: r2(c.inr.a - b.inr.a), e: r2(c.inr.e - b.inr.e), u: r2(c.inr.u - b.inr.u) }, (v) => sgn(v, 2) + ' pp') }
      : { maturity: `Not complete: ${W.w.length - imm.length} of ${W.w.length} window weeks have a full 30 days of claims (${wl(c.mat)}). ` +
            imm.map((w) => `W${w} completes on ${md(inrDone(w))}`).join(', ') + `. Data as of ${ASOF_TXT}.`,
          window: `Not reported until every window week is 30 days old (${md(inrDone(imm[imm.length - 1]))}).`,
          baseline: byG(b.inr, pc2) };
    return {
      about: 'Rollout monitoring for a model that predicts a shorter estimated delivery date (EDD, the delivery date a buyer sees when ordering) for cross-border orders. Within its scope the model\'s date replaces the rule\'s date only when it is shorter. Illustrative portfolio data, not eBay data.',
      output_language: lang,
      scope: {
        shipping_option: optName(opt).en,
        window: `${wl(W.w)} (${wd(W.w)})`,
        baseline: `${wl(W.base)} (${wd(W.base)}), the 4 weeks before`,
        count_basis: 'orders',
        data_as_of: ASOF_TXT,
        orders_in_window: nf(c.N),
      },
      groups: {
        used_model: 'eligible orders that used the model\'s (shorter) date',
        eligible_not_used: 'eligible orders that kept the rule\'s date',
        not_covered: 'orders outside the model\'s scope',
        note: 'The groups are observed, not randomly assigned.',
      },
      metrics: {
        coverage: { definition: 'eligible orders ÷ all orders', window: `${pc(c.cov)} (${nf(c.E)} ÷ ${nf(c.N)})`, baseline: pc(b.cov), change: pp(r1(c.cov - b.cov)) },
        adoption: { definition: 'orders that used the model\'s date ÷ eligible orders', window: `${pc(c.ad)} (${nf(c.A)} ÷ ${nf(c.E)})`, baseline: pc(b.ad), change: pp(r1(c.ad - b.ad)) },
        promised_days: {
          definition: 'business days promised to the buyer, order-weighted mean; total = seller handling + transit',
          window: daysTxt(c), baseline: daysTxt(b),
          gap_used_vs_eligible_not_used: { window: sgn(r1(c.tot.a - c.tot.e), 1) + ' days', baseline: sgn(r1(b.tot.a - b.tot.e), 1) + ' days' },
        },
        on_time: {
          definition: 'orders delivered (delivery scan) before the promised date ÷ orders with a delivery scan',
          maturity: 'Complete for every window week.',
          window: byG(c.ot, pc), baseline: byG(b.ot, pc), change: chg((P, k) => P.ot[k]),
        },
        tracking_coverage: {
          definition: 'orders with tracking scans ÷ all orders; on-time can only be measured on these orders',
          window: byG(c.trk, pc), baseline: byG(b.trk, pc), change: chg((P, k) => P.trk[k]),
        },
        item_not_received_30d: Object.assign({ definition: 'orders with an item-not-received claim within 30 days ÷ orders' }, inr),
      },
      gmv_tab_context: {
        note: 'From the GMV tab: Greater China sellers, all shipping options together, with its own fixed windows. Not filtered by shipping option or by this window. A descriptive comparison only.',
        base_window: 'W1–W4 (1/4–1/31)',
        exit_window: 'W25–W28 (6/21–7/18)',
        share_of_demand_index_exit_window: `${K.ex[2026].toFixed(1)} (base window = 100)`,
        change_vs_base: sgn(K.inSeg, 1) + '%',
        same_weeks_in_2024_and_2025_mean_change: sgn(K.season, 2) + '%',
        change_vs_season: sgn(K.vs, 2) + '%',
      },
      charts: {
        coverage: 'Coverage and adoption', promised_days: 'Promised handling and transit time', on_time: 'On-time delivery',
        tracking: 'Tracking coverage', item_not_received: 'Item-not-received rate (30 days)', gmv: 'GMV tab: before and after cards',
      },
    };
  }

  // ---------------------------------------------------------------------------------- shared state
  const state = { gmv: 'raw', opt: 'all', win: 'all', basis: 'n' };
  const listeners = [];
  const api = {
    OPTS: OPTS.map((o) => ({ k: o.k, name: o.name })), WINS: Object.keys(WINS), GROUPS, GLAB,
    ASOF: ASOF_TXT, IMM, inrDone: (w) => md(inrDone(w)), wl, wd, K,
    summary, briefInput, optName, winName, scopeName, state,
    set() {}, on(fn) { listeners.push(fn); }, focus() {}, showTab() {},
  };
  window.EDD = api;

  // ================================================================================== the page (skipped by brief/export.html)
  const root = document.querySelector('[data-edd-dash]');
  if (!root) return;

  // ---------------------------------------------------------------------------------- drawing: GMV tab
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

  // ---------------------------------------------------------------------------------- drawing: Shipping tab
  const WSHADE = () => {   // the chosen 4-week window and its baseline, shaded on the weekly charts
    const W = WINS[state.win];
    if (!W.base) return [];
    return [{ x0: W.base[0] - 0.5, x1: W.base[3] + 0.5, label: { en: 'Prior', zh: '对比期' } }, { x0: W.w[0] - 0.5, x1: W.w[3] + 0.5, label: { en: 'Now', zh: '本期' } }];
  };
  function covChart(box, rows, basis) {
    const W = Math.max(box.clientWidth, 280), H = 238, m = { l: 42, r: 6, t: 20, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, bw = pw / rows.length;
    const sy = (v) => m.t + (1 - v) * ph, Wn = WINS[state.win];
    const role = (w) => (!Wn.base ? 'in' : Wn.w.includes(w) ? 'in' : Wn.base.includes(w) ? 'base' : 'out');
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t({ en: 'Each week of orders split into: used the model, eligible but not used, not covered', zh: '每周订单分成三组：实际采用模型、符合条件但未采用、未覆盖' }))}">`;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) g += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`;
    for (const sh of WSHADE()) {
      const xa = m.l + (sh.x0 - 0.5) * bw;
      g += `<text class="cov-lab" x="${(xa + 2).toFixed(1)}" y="12">${esc(t(sh.label))}</text>`;
    }
    rows.forEach((r, i) => {
      const v = r[basis], tot = v.a + v.e + v.u, x = m.l + i * bw + bw * 0.12, w = bw * 0.76, ro = role(i + 1);
      let lo = 0;
      g += `<g class="wk ${ro}">`;
      for (const k of GROUPS) { const h = v[k] / tot; g += `<rect x="${x.toFixed(1)}" y="${sy(lo + h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * ph).toFixed(1)}" style="fill:${GFILL[k]}"/>`; lo += h; }
      g += '</g>';
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
  function eqHtml(S) {
    const k = S.basis === 'g', u = k ? 'k' : '', c = S.cur, b = S.base;
    const prior = (v, d) => (b ? `<span class="pr">${L({ en: 'Prior', zh: '对比期' })} ${v.toFixed(1)}% · ${sgn(d, 1)} pp</span>` : '');
    const eq = (lab, num, nl, den, dl, pct, pv) => `<p class="eq"><span class="k">${L(lab)}</span><span class="v">${L(nl)} <b>${nf(num)}${u}</b> ÷ ${L(dl)} ${nf(den)}${u} = <b>${pct.toFixed(1)}%</b></span>${pv}</p>`;
    return eq({ en: 'Coverage', zh: '覆盖率' }, c.E, { en: 'eligible', zh: '符合条件' }, c.N, { en: 'all', zh: '全部' }, c.cov, b ? prior(b.cov, r1(c.cov - b.cov)) : '')
      + eq({ en: 'Adoption among eligible', zh: '符合条件订单中的采用率' }, c.A, { en: 'used the model', zh: '实际采用' }, c.E, { en: 'eligible', zh: '符合条件' }, c.ad, b ? prior(b.ad, r1(c.ad - b.ad)) : '');
  }
  function eddTable(el, P) {
    const mh = Math.max(...GROUPS.map((k) => P.hd[k])), mt = Math.max(...GROUPS.map((k) => P.td[k]));
    let h = `<span class="hd"></span><span class="hd">${L({ en: 'Handling', zh: '预计处理' })}</span><span class="hd">${L({ en: 'Transit', zh: '预计运输' })}</span><span class="hd tot">${L({ en: 'Delivery', zh: '整体送达' })}</span>`;
    for (const k of GROUPS) {
      h += `<span class="lab" style="--c:${GFILL[k]}"><span class="sw"></span>${L(GLAB[k])}</span>`
        + `<span class="bar" style="--c:${GFILL[k]}"><i style="width:${((P.hd[k] / mh) * 70).toFixed(1)}%"></i>${P.hd[k].toFixed(1)}</span>`
        + `<span class="bar" style="--c:${GFILL[k]}"><i style="width:${((P.td[k] / mt) * 70).toFixed(1)}%"></i>${P.td[k].toFixed(1)}</span>`
        + `<span class="tot">${P.tot[k].toFixed(1)}</span>`;
    }
    el.innerHTML = h;
  }
  const lines = (rows, f, matureOnly) => GROUPS.map((k) => ({ key: k, label: GLAB[k], color: GLINE[k], width: k === 'a' ? 2.2 : 1.6, y: rows.map((r, i) => (matureOnly && !mature(i + 1) ? null : f(r, k))) }));
  const pct1 = (v) => (v * 100).toFixed(1) + '%', pct2 = (v) => (v * 100).toFixed(2) + '%';
  const by = (P, m, f) => { const p = GROUPS.map((k) => ({ en: `${GLAB[k].en} ${f(P[m][k])}`, zh: `${GLAB[k].zh} ${f(P[m][k])}` })); return { en: p.map((x) => x.en).join(' · '), zh: p.map((x) => x.zh).join(' · ') }; };
  const fp = (v) => v.toFixed(1) + '%', fp2 = (v) => v.toFixed(2) + '%';
  function periodLine(S, m, f) {   // "This window: … Prior: …" under a chart
    const c = by(S.cur, m, f);
    if (!S.base) return { en: `Weeks 1–25, order-weighted: ${c.en}.`, zh: `第 1–25 周，按订单加权：${c.zh}。` };
    const b = by(S.base, m, f), W = WINS[S.win];
    return { en: `Now (${wl(W.w)}): ${c.en}. Prior (${wl(W.base)}): ${b.en}.`, zh: `本期（${wl(W.w)}）：${c.zh}。对比期（${wl(W.base)}）：${b.zh}。` };
  }
  function drawShip() {
    const S = summary(state.opt, state.win, state.basis), Sn = summary(state.opt, state.win, 'n'), rows = view(state.opt);
    const W = WINS[state.win], name = optName(state.opt), shade = WSHADE();
    const span = W.base
      ? { en: `now ${wl(W.w)} (${wd(W.w)}), compared with the 4 weeks before, ${wl(W.base)} (${wd(W.base)})`, zh: `本期 ${wl(W.w)}（${wd(W.w)}），对比前 4 周 ${wl(W.base)}（${wd(W.base)}）` }
      : { en: 'weeks 1–25 (Jan 4–Jun 27)', zh: '第 1–25 周（1/4–6/27）' };
    $('ship-scope').innerHTML = L({ en: `${name.en}: ${span.en}; ${nf(Sn.cur.orders)} orders in the period (illustrative, data as of ${ASOF_TXT}). Every chart below follows these choices.`,
      zh: `${name.zh}：${span.zh}；期内共 ${nf(Sn.cur.orders)} 笔订单（示意，数据截至 ${ASOF_TXT}）。下面每张图都跟着这些选择变化。` });
    $('ship-eqs').innerHTML = eqHtml(S);
    covChart($('ship-cov'), rows, state.basis);
    eddTable($('ship-edd'), Sn.cur);
    const opts = (extra) => Object.assign({ x: SX, height: 196, left: 48, xstep: 4, xfmt: wkTick, zero: false, endLabels: false, tipx: wkTip }, extra);
    Kit.lineChart($('ship-edd-line'), opts({ series: lines(rows, (r, k) => r.hd[k] + r.td[k]), left: 40, yfmt: (v) => (Math.abs(v % 1) > 1e-9 ? v.toFixed(1) : v.toFixed(0)), tipfmt: (v) => v.toFixed(1), shade, title: { en: 'Promised delivery days by week', zh: '每周预计送达天数' } }));
    Kit.lineChart($('ship-ot'), opts({ series: lines(rows, (r, k) => r.ot[k]), yfmt: pct1, tipfmt: pct1, shade, title: { en: 'On-time delivery by week', zh: '每周实际准时送达率' } }));
    Kit.lineChart($('ship-trk'), opts({ series: lines(rows, (r, k) => r.trk[k]), yfmt: pct1, tipfmt: pct1, shade, title: { en: 'Tracking coverage by week', zh: '每周追踪覆盖率' } }));
    const immShade = { x0: IMM[0] - 0.5, x1: SW + 0.5, label: $('ship-inr').clientWidth >= 560 ? { en: '<30 days', zh: '未满 30 天' } : null };   // on phones the band is too narrow for a label; the caption says it
    Kit.lineChart($('ship-inr'), opts({ series: lines(rows, (r, k) => r.inr[k], true), left: 52, yfmt: pct2, tipfmt: pct2,
      shade: (W.base ? [shade[0]] : []).concat(state.win === 'w18' ? [shade[1]] : [], [immShade]), title: { en: 'Item-not-received rate by week', zh: '每周未收到货投诉率' } }));
    const gap = r1(Sn.cur.tot.a - Sn.cur.tot.e);
    $('ship-edd-cap').innerHTML = L({ en: `${W.base ? 'Now' : 'Weeks 1–25'}: orders that used the model were promised ${sgn(gap, 1)} days compared with eligible orders that kept the rule's date.`,
      zh: `${W.base ? '本期' : '第 1–25 周'}：采用模型的订单，承诺天数比「符合条件但未采用」的订单 ${sgn(gap, 1)} 天。` });
    $('ship-ot-cap').innerHTML = L(periodLine(Sn, 'ot', fp));
    $('ship-trk-cap').innerHTML = L(periodLine(Sn, 'trk', fp));
    const due = md(inrDone(SW));
    let inr;
    if (state.win === 'w22') {
      const imm = W.w.filter((w) => !mature(w)), b = by(Sn.base, 'inr', fp2);
      inr = { en: `Now: only ${wl(Sn.cur.mat)} have 30 days of claims; ${imm.map((w) => 'W' + w).join(' and ')} complete on ${imm.map((w) => md(inrDone(w))).join(' and ')}. The rate for this window can be read after ${due}. Prior (${wl(W.base)}): ${b.en}.`,
        zh: `本期 4 周里只有 ${wl(Sn.cur.mat)} 已满 30 天；${imm.map((w) => 'W' + w).join('、')} 分别在 ${imm.map((w) => md(inrDone(w))).join('、')} 满 30 天。本期投诉率要到 ${due} 之后才能完整计算。对比期（${wl(W.base)}）：${b.zh}。` };
    } else if (W.base) {
      inr = periodLine(Sn, 'inr', fp2);
      inr = { en: 'All weeks here have 30 days of claims. ' + inr.en, zh: '这两段时间都已满 30 天。' + inr.zh };
    } else {
      const c = by(Sn.cur, 'inr', fp2);
      inr = { en: `Weeks ${IMM.map((w) => w).join('–')} are not 30 days old yet (complete on ${IMM.map((w) => md(inrDone(w))).join(' and ')}), so they are left out. Weeks 1–${IMM[0] - 1}: ${c.en}.`,
        zh: `第 ${IMM.join('–')} 周还没满 30 天（分别在 ${IMM.map((w) => md(inrDone(w))).join('、')} 满），暂不计入。第 1–${IMM[0] - 1} 周：${c.zh}。` };
    }
    $('ship-inr-cap').innerHTML = L(inr);
  }

  // ---------------------------------------------------------------------------------- wiring
  const P = { gmv: $('dpanel-gmv'), ship: $('dpanel-shipping') };
  const lastW = new Map();
  function redraw(el, force) {   // draw only when visible (width > 0), and again whenever the width changes
    const w = el.offsetWidth;
    if (!w || (!force && lastW.get(el) === w)) return;
    lastW.set(el, w);
    (el === P.gmv ? drawGmv : drawShip)();
  }
  const SEGS = { gmv: $('gmv-mode'), opt: $('ship-opt'), win: $('ship-win'), basis: $('ship-basis') };
  function sync() {
    for (const k of Object.keys(SEGS)) SEGS[k].querySelectorAll('button[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state[k])));
  }
  api.set = (patch, source) => {
    let ship = false, gmv = false;
    for (const k of Object.keys(patch)) {
      if (!(k in state) || state[k] === patch[k]) continue;
      state[k] = patch[k];
      if (k === 'gmv') gmv = true; else ship = true;
    }
    sync();
    if (gmv) { if (P.gmv.offsetWidth) drawTrends(); else lastW.delete(P.gmv); }
    if (ship) { if (P.ship.offsetWidth) drawShip(); else lastW.delete(P.ship); }
    if (gmv || ship) listeners.forEach((fn) => fn(Object.assign({}, state), source || 'code'));
  };
  api.showTab = (name) => {
    const tab = $(name === 'gmv' ? 'dashboard-gmv' : 'dashboard-shipping');
    if (tab.getAttribute('aria-selected') !== 'true') tab.click();
  };
  api.focus = (ids) => {   // outline the blocks a demo step or a brief item is about
    root.querySelectorAll('.dash-block.is-focus').forEach((b) => b.classList.remove('is-focus'));
    (ids || []).forEach((id) => { const b = $(id); if (b) b.classList.add('is-focus'); });
  };
  function seg(el, key) {
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-v]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      api.set({ [key]: b.dataset.v }, 'user');
    });
  }
  for (const k of Object.keys(SEGS)) seg(SEGS[k], k);
  sync();
  if ('ResizeObserver' in window) { const ro = new ResizeObserver((es) => es.forEach((e) => redraw(e.target))); ro.observe(P.gmv); ro.observe(P.ship); }
  Kit.onResize(() => { redraw(P.gmv, true); redraw(P.ship, true); });
  Kit.onLang(() => { redraw(P.gmv, true); redraw(P.ship, true); });
  root.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => { redraw(P.gmv); redraw(P.ship); }));
  window.addEventListener('site:target', () => { redraw(P.gmv); redraw(P.ship); });
  redraw(P.gmv); redraw(P.ship);
})();
