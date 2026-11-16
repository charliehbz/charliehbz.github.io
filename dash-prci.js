/* dash-prci.js · Fashion high-risk GMV mix (PRCI): the home preview [data-prci-demo] and the web dashboard
   [data-prci-dash] on cases/prci.html. Rebuilt from the five-page dashboard delivered during the internship.
   ONE seeded set of illustrative data feeds both, so the decomposition, tables, charts and the home preview agree.
   None of it is real eBay data. Loaded after kit.js and site.js. */
(function () {
  'use strict';
  if (typeof Kit === 'undefined') return;
  const home = document.querySelector('[data-prci-demo]'), root = document.querySelector('[data-prci-dash]');
  if (!home && !root) return;
  const { t, L, esc, MINUS } = Kit;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------------------------- helpers
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20260628), jit = (a) => (R() - 0.5) * 2 * a;
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);
  const pick = (arr, ws) => ws.map((w) => arr[w - 1]);
  const wkD = (w) => new Date(Date.UTC(2025, 6, 6 + 7 * (w - 1)));               // week 1 starts Sun 6 Jul 2025
  const wkTick = (w) => { const d = wkD(w); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
  const wkTip = (w) => { const d = wkD(w), s = d.getUTCFullYear() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); return t({ en: 'Week from ' + s, zh: s + ' 起的一周' }); };
  const svgL = (x, attrs) => { const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' '); return `<text ${a} lang="en">${esc(x.en)}</text><text ${a} lang="zh">${esc(x.zh)}</text>`; };

  // ================================================================================== data
  // 54 retail weeks; the formal comparison is three weeks before vs three weeks after the end of June 2026.
  const NW = 54, WX = Array.from({ length: NW }, (_, i) => i + 1), PRE = [49, 50, 51], POST = [52, 53, 54], MATURE = 50;
  const NAMED = [
    { en: "Men's Shoes", zh: '男鞋', g: 9.0, r: 0.235, shock: 0.052, gp: 0.93, inr: 1.25 },
    { en: "Men's Clothing", zh: '男装', g: 18.0, r: 0.168, shock: -0.011, gp: 0.86, inr: 1.0 },
    { en: "Women's Clothing", zh: '女装', g: 13.0, r: 0.105, shock: -0.004, gp: 0.87, inr: 0.9 },
    { en: "Women's Shoes", zh: '女鞋', g: 6.0, r: 0.120, shock: 0.002, gp: 0.88, inr: 1.0 },
    { en: 'Watches', zh: '手表', g: 5.5, r: 0.190, shock: -0.016, gp: 0.84, inr: 1.3 },
    { en: "Women's Bags", zh: '女包', g: 5.0, r: 0.150, shock: 0.006, gp: 0.90, inr: 1.1 },
    { en: "Men's Accessories", zh: '男士配饰', g: 3.0, r: 0.200, shock: 0.010, gp: 0.89, inr: 1.2 },
    { en: "Women's Accessories", zh: '女士配饰', g: 3.2, r: 0.160, shock: -0.012, gp: 0.86, inr: 1.0 },
    { en: 'Fine Jewelry', zh: '珠宝', g: 3.0, r: 0.090, shock: 0.000, gp: 0.88, inr: 0.8 },
    { en: 'Fashion Jewelry', zh: '时尚饰品', g: 2.6, r: 0.140, shock: 0.004, gp: 0.87, inr: 1.1 },
    { en: 'Sunglasses', zh: '太阳镜', g: 1.8, r: 0.180, shock: -0.006, gp: 0.95, inr: 1.0 },
    { en: "Kids' Clothing", zh: '童装', g: 2.0, r: 0.080, shock: 0.001, gp: 0.88, inr: 0.9 },
  ];
  const CATS = NAMED.map((c) => Object.assign({ named: true }, c));
  for (let k = 1; k <= 28; k++) CATS.push({ en: 'Other category ' + k, zh: '其他品类 ' + k, named: false, g: 0.3 + R() * 1.2, r: 0.05 + R() * 0.15, shock: jit(0.005), gp: 0.86 + jit(0.03), inr: 0.8 + R() * 0.5 });
  const season = (w) => 1 + 0.12 * Math.exp(-((w - 22) ** 2) / 18) + 0.03 * Math.sin(w / 6);   // holiday peak around week 22
  for (const c of CATS) {
    const ph = R() * 6, aov = 18 + R() * 30;
    c.G = WX.map((w) => c.g * season(w) * (1 + jit(0.035)) * (w >= 52 ? c.gp : 1));
    c.rate = WX.map((w) => Math.max(0.01, c.r * (1 + 0.04 * Math.sin(w / 5 + ph)) + jit(0.004) + (w >= 52 ? c.shock : 0)));
    c.H = c.G.map((g, i) => g * c.rate[i]);
    // 30-day risk rates per order: high-risk sellers vs the rest (INR, SNAD per order; LOSS per GMV)
    c.txH = c.H.map((h) => h / aov); c.txO = c.G.map((g, i) => (g - c.H[i]) / aov);
    const rr = (base, hr) => WX.map(() => base * c.inr * (hr ? 2.3 : 1) * (1 + jit(0.12)));
    c.inrH = rr(0.010, true); c.inrO = rr(0.010, false); c.snadH = rr(0.006, true); c.snadO = rr(0.006, false); c.lossH = rr(0.004, true); c.lossO = rr(0.004, false);
  }
  const win = (c, ws) => ({ G: sum(pick(c.G, ws)), H: sum(pick(c.H, ws)) });
  const GPRE = sum(CATS.map((c) => win(c, PRE).G)), HPRE = sum(CATS.map((c) => win(c, PRE).H));
  const GPOST = sum(CATS.map((c) => win(c, POST).G)), HPOST = sum(CATS.map((c) => win(c, POST).H));
  const RPRE = HPRE / GPRE, RPOST = HPOST / GPOST;

  // Shift-share (CTV). Printed figures are rounded to 0.01 pp and built so that every sum on the page is exact:
  // delta = rate + mix per row, and the "other 28 categories" row takes the rounding remainder of the total.
  const D = {};
  D.pre = r2(RPRE * 100); D.post = r2(RPOST * 100); D.total = r2(D.post - D.pre);
  D.hrChg = r1((HPOST / HPRE - 1) * 100); D.gmvChg = r1((GPOST / GPRE - 1) * 100);
  const eff = (c) => { const a = win(c, PRE), b = win(c, POST), mp = a.G / GPRE, mq = b.G / GPOST, rp = a.H / a.G, rq = b.H / b.G;
    return { mixPre: mp, mixPost: mq, ratePre: rp, ratePost: rq, rate: mq * (rq - rp) * 100, mix: (mq - mp) * (rp - RPRE) * 100 }; };
  D.rows = CATS.filter((c) => c.named).map((c) => { const e = eff(c), rate = r2(e.rate), mix = r2(e.mix); return Object.assign(e, { name: { en: c.en, zh: c.zh }, rateD: rate, mixD: mix, delta: r2(rate + mix) }); });
  {
    const others = CATS.filter((c) => !c.named).map(eff), Gp = sum(CATS.filter((c) => !c.named).map((c) => win(c, PRE).G)), Gq = sum(CATS.filter((c) => !c.named).map((c) => win(c, POST).G));
    const Hp = sum(CATS.filter((c) => !c.named).map((c) => win(c, PRE).H)), Hq = sum(CATS.filter((c) => !c.named).map((c) => win(c, POST).H));
    const delta = r2(D.total - sum(D.rows.map((r) => r.delta))), rate = r2(sum(others.map((e) => e.rate)));
    D.other = { name: { en: 'Other 28 categories', zh: '其余 28 个品类' }, mixPre: Gp / GPRE, mixPost: Gq / GPOST, ratePre: Hp / Gp, ratePost: Hq / Gq, rateD: rate, mixD: r2(delta - rate), delta, isOther: true };
  }
  D.all = D.rows.concat([D.other]);
  for (const r of D.all) r.ctv = (r.delta / D.total) * 100;
  D.top = D.rows.slice().sort((a, b) => b.delta - a.delta)[0];   // the biggest push upwards
  const rest = D.all.filter((r) => r !== D.top);
  D.restD = r2(D.total - D.top.delta); D.restRate = r2(sum(rest.map((r) => r.rateD))); D.restMix = r2(D.restD - D.restRate);
  D.totRate = r2(D.top.rateD + D.restRate); D.totMix = r2(D.total - D.totRate);

  // Seller concentration: high-risk GMV by seller-rank bucket (shares of each window's total high-risk GMV)
  const BUCKETS = [{ en: 'Top 1–10', zh: '前 1–10' }, { en: '11–50', zh: '11–50' }, { en: '51–100', zh: '51–100' }, { en: '101–500', zh: '101–500' }, { en: '501–1,000', zh: '501–1,000' }, { en: '1,000+', zh: '1,000 以后' }];
  const shares = (arr) => { const v = arr.map((x) => r1(x * 100)); v[v.length - 1] = r1(100 - sum(v.slice(0, -1))); return v; };
  const SELLER = { pre: shares([0.118, 0.152, 0.108, 0.338, 0.126, 0.158]), post: shares([0.112, 0.149, 0.110, 0.352, 0.124, 0.153]) };

  // Segments: shares of Fashion GMV are set; the last segment's rate is solved so each window adds up to the overall share.
  const DIMS = {
    market: { label: { en: 'Market', zh: '市场' }, segs: [{ en: 'HIPO', zh: 'HIPO' }, { en: 'IN', zh: 'IN' }, { en: 'SEA', zh: 'SEA' }], s: [[0.45, 0.19, 0.36], [0.47, 0.18, 0.35]], r: [[0.160, 0.070], [0.172, 0.066]],
      cap: { en: 'HIPO is the only market whose own high-risk share rose.', zh: 'HIPO 是唯一一个内部高风险占比上升的市场。' } },
    managed: { label: { en: 'Managed', zh: '托管' }, segs: [{ en: 'Managed', zh: '托管卖家' }, { en: 'Unmanaged', zh: '非托管卖家' }], s: [[0.38, 0.62], [0.39, 0.61]], r: [[0.025], [0.025]],
      cap: { en: 'Unmanaged sellers carry a far higher share than managed ones.', zh: '非托管卖家的高风险占比远高于托管卖家。' } },
    tenure: { label: { en: 'Tenure', zh: '新老卖家' }, segs: [{ en: 'New sellers', zh: '新卖家' }, { en: 'Existing sellers', zh: '老卖家' }], s: [[0.12, 0.88], [0.12, 0.88]], r: [[0.150], [0.130]],
      cap: { en: 'Existing sellers moved up while new sellers moved down.', zh: '老卖家上升，新卖家下降。' } },
    action: { label: { en: 'Actions', zh: '处置记录' }, segs: [{ en: 'Ever actioned', zh: '曾被处置' }, { en: 'Never actioned', zh: '从未处置' }], s: [[0.08, 0.92], [0.08, 0.92]], r: [[0.270], [0.285]],
      cap: { en: '"Ever actioned" is a seller attribute, not a before/after: a higher share here does not show that actions failed. High-risk sellers are also more likely to be actioned.', zh: '「曾被处置」是卖家属性，不区分处置前后：这里的占比更高，不能说明处置无效；高风险卖家本来也更容易被处置。' } },
  };
  for (const d of Object.values(DIMS)) {
    d.rate = [0, 1].map((w) => { const Rw = w ? RPOST : RPRE, s = d.s[w], r = d.r[w].slice(); r.push((Rw - sum(r.map((x, j) => x * s[j]))) / s[s.length - 1]); return r; });
  }

  // Category concentration: cumulative share of high-risk GMV by category rank, each window sorted on its own
  const conc = (ws) => { const h = CATS.map((c) => ({ c, h: win(c, ws).H })).sort((a, b) => b.h - a.h), tot = sum(h.map((x) => x.h)); let acc = 0; return h.map((x) => { acc += x.h; return { name: { en: x.c.en, zh: x.c.zh }, cum: (acc / tot) * 100 }; }); };
  const CONC = { pre: conc(PRE), post: conc(POST) };

  // weekly views for a scope: 'all' (Fashion) or a named category index
  function scope(sel) {
    const cs = sel === 'all' ? CATS : [CATS[+sel]];
    const wk = (f) => WX.map((w, i) => f(cs, i));
    const wavg = (num, den) => (cs2, i) => sum(cs2.map((c) => num(c, i))) / sum(cs2.map((c) => den(c, i)));
    return {
      share: wk(wavg((c, i) => c.H[i], (c, i) => c.G[i])),
      inr: [wk(wavg((c, i) => c.inrH[i] * c.txH[i], (c, i) => c.txH[i])), wk(wavg((c, i) => c.inrO[i] * c.txO[i], (c, i) => c.txO[i]))],
      snad: [wk(wavg((c, i) => c.snadH[i] * c.txH[i], (c, i) => c.txH[i])), wk(wavg((c, i) => c.snadO[i] * c.txO[i], (c, i) => c.txO[i]))],
      loss: [wk(wavg((c, i) => c.lossH[i] * c.H[i], (c, i) => c.H[i])), wk(wavg((c, i) => c.lossO[i] * (c.G[i] - c.H[i]), (c, i) => c.G[i] - c.H[i]))],
    };
  }
  window.PRCI_DATA = { D, SELLER, DIMS, CONC, RPRE, RPOST };   // read-only, for checking the numbers in a console

  // ================================================================================== shared chart: contributions
  const COL = { rate: 'var(--rate-eff)', mix: 'var(--mix-eff)' };
  function contribBars(box, rows, o) {   // rows: [{name, rateD, mixD, delta, ctv?, total?}]; o.split: show rate/mix parts
    const W = Math.max(box.clientWidth, 280), rowH = o.rowH || 28, labW = Math.min(o.labW || 150, W * 0.34), valW = 58;
    const H = rows.length * rowH + 30;
    let lo = 0, hi = 0;
    for (const r of rows) { const pos = Math.max(0, r.rateD) + Math.max(0, r.mixD), neg = Math.min(0, r.rateD) + Math.min(0, r.mixD); lo = Math.min(lo, neg, r.delta); hi = Math.max(hi, pos, r.delta); }
    const pad = (hi - lo) * 0.06 || 0.1; lo -= pad; hi += pad;
    const sx = (v) => labW + ((v - lo) / (hi - lo)) * (W - labW - valW - 8);
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t(o.title))}">`;
    for (const v of Kit.ticks(lo, hi, W < 480 ? 3 : 5).out) g += `<line class="gridline" x1="${sx(v)}" x2="${sx(v)}" y1="18" y2="${H - 4}"/><text x="${sx(v)}" y="11" text-anchor="middle">${sgn(v, 1)}</text>`;
    g += `<line class="zero" x1="${sx(0)}" x2="${sx(0)}" y1="18" y2="${H - 4}"/>`;
    rows.forEach((r, j) => {
      const y = 26 + j * rowH + rowH / 2 - 4;
      if (r.total) g += `<line class="gridline" x1="0" x2="${W}" y1="${y - rowH / 2}" y2="${y - rowH / 2}"/>`;
      g += svgL(r.name, { x: labW - 10, y: y + 4, 'text-anchor': 'end', style: `fill:var(--ink);font-size:12px${r.total ? ';font-weight:700' : ''}` });
      if (o.split) {
        let p = 0, n = 0;
        for (const k of ['rate', 'mix']) {
          const v = r[k + 'D']; if (!v) continue;
          const a = v > 0 ? p : n + v, b = v > 0 ? p + v : n; if (v > 0) p += v; else n += v;
          g += `<rect x="${sx(a).toFixed(1)}" y="${y - 7}" width="${Math.max(1, sx(b) - sx(a)).toFixed(1)}" height="14" rx="2" style="fill:${COL[k]}"/>`;
        }
        g += `<circle cx="${sx(r.delta).toFixed(1)}" cy="${y}" r="3.5" style="fill:var(--ink);stroke:var(--paper);stroke-width:1.5px"/>`;
      } else {
        const a = Math.min(0, r.delta), b = Math.max(0, r.delta);
        g += `<rect x="${sx(a).toFixed(1)}" y="${y - 7}" width="${Math.max(1, sx(b) - sx(a)).toFixed(1)}" height="14" rx="2" style="fill:${r.total ? 'var(--ink)' : 'var(--muted)'}"/>`;
      }
      g += `<text x="${W - 4}" y="${y + 4}" text-anchor="end" style="fill:var(--ink);font-weight:600">${sgn(r.delta, 2)}</text>`;
    });
    g += `<rect class="hit" x="0" y="18" width="${W}" height="${H - 18}" fill="transparent"/></svg>`;
    box.innerHTML = g;
    const svg = box.querySelector('svg'), hit = svg.querySelector('.hit');
    const show = (ev) => {
      const rc = svg.getBoundingClientRect(), py = ((ev.clientY - rc.top) / rc.height) * H, j = Math.floor((py - 26) / rowH);
      if (j < 0 || j >= rows.length) { Kit.tipHide(box); return; }
      const r = rows[j];
      Kit.tipShow(box, `<b>${esc(t(r.name))}</b><br>${esc(t({ en: 'Rate effect', zh: 'Rate 效应' }))} ${sgn(r.rateD, 2)} · ${esc(t({ en: 'Mix effect', zh: 'Mix 效应' }))} ${sgn(r.mixD, 2)} pp${r.ctv != null ? '<br>CTV ' + sgn(r.ctv, 0) + '%' : ''}`,
        ((ev.clientX - rc.left) / rc.width) * rc.width, ((26 + j * rowH) / H) * rc.height);
    };
    hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show); hit.addEventListener('pointerleave', () => Kit.tipHide(box));
  }

  // ================================================================================== home preview
  if (home) {
    const box = home.querySelector('.chart'), eq = home.querySelector('[data-eq]'), def = home.querySelector('[data-def]');
    const rows = [
      { name: D.top.name, rateD: D.top.rateD, mixD: D.top.mixD, delta: D.top.delta },
      { name: { en: 'Other categories', zh: '其余品类合计' }, rateD: D.restRate, mixD: D.restMix, delta: D.restD },
      { name: { en: 'Overall change', zh: '整体变化' }, rateD: D.totRate, mixD: D.totMix, delta: D.total, total: true },
    ];
    let mode = home.dataset.mode || 'net';
    const draw = () => {
      contribBars(box, rows, { split: mode === 'split', rowH: 34, labW: 124, title: { en: 'Contribution to the change in the high-risk share, pp', zh: '对高风险成交占比变化的贡献（pp）' } });
      const n = D.top.name;
      eq.innerHTML = mode === 'split'
        ? L({ en: `${n.en} ${sgn(D.top.delta, 2)} = rate ${sgn(D.top.rateD, 2)} + mix ${sgn(D.top.mixD, 2)} pp`, zh: `${n.zh} ${sgn(D.top.delta, 2)} = Rate ${sgn(D.top.rateD, 2)} + Mix ${sgn(D.top.mixD, 2)} pp` })
        : L({ en: `${sgn(D.top.delta, 2)} ${sgn(D.restD, 2).replace(/^([+−])/, '$1 ')} = ${sgn(D.total, 2)} pp`, zh: `${sgn(D.top.delta, 2)} ${sgn(D.restD, 2).replace(/^([+−])/, '$1 ')} = ${sgn(D.total, 2)} pp` });
      def.innerHTML = mode === 'split'
        ? L({ en: `Most of ${n.en}'s push comes from a higher high-risk share inside the category (rate effect); its larger weight in Fashion adds little (mix effect).`, zh: `${n.zh}的贡献大部分来自品类内部高风险卖家占比上升（Rate 效应），品类在 Fashion 里变重带来的只是一小部分（Mix 效应）。` })
        : L({ en: `The overall share moved only ${sgn(D.total, 2)} pp, but ${n.en} alone pushed it up ${Math.abs(D.top.delta).toFixed(2)} while the other categories together pulled it back ${Math.abs(D.restD).toFixed(2)}.`, zh: `整体只变了 ${sgn(D.total, 2)} 个百分点，但${n.zh}单独推高 ${Math.abs(D.top.delta).toFixed(2)}，其余品类合计拉回 ${Math.abs(D.restD).toFixed(2)}。` });
      home.querySelectorAll('[data-show]').forEach((el) => { el.hidden = el.dataset.show !== mode; });
    };
    home.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode; home.dataset.mode = mode;
      home.querySelectorAll('button[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    let lw = 0;
    const redraw = () => { const w = box.offsetWidth; if (w && w !== lw) { lw = w; draw(); } };
    if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(box);
    Kit.onLang(draw); Kit.onResize(redraw); window.addEventListener('site:target', redraw);
    redraw();
  }
  if (!root) return;

  // ================================================================================== dashboard
  const state = { cat: 'all', metric: 'inr', win: 'post', dim: 'market' };
  const SHADE_WIN = [{ x0: 48.5, x1: 54.5, label: { en: 'Windows', zh: '前后窗口' } }];
  const pct = (d) => (v) => (v * 100).toFixed(d) + '%';

  function drawCat() {
    const s = scope(state.cat), all = state.cat === 'all' ? s : scope('all');
    const series = [{ key: 'all', label: { en: 'Fashion overall', zh: 'Fashion 整体' }, y: all.share, color: 'var(--ink)', width: 2 }];
    if (state.cat !== 'all') { const c = CATS[+state.cat]; series.push({ key: 'cat', label: { en: c.en, zh: c.zh }, y: s.share, color: 'var(--hr)', width: 2 }); }
    Kit.lineChart($('p-cat-mix'), { x: WX, series, height: 230, left: 46, xstep: 9, xfmt: wkTick, zero: false, endLabels: false, shade: SHADE_WIN, yfmt: pct(0), tipfmt: pct(1), tipx: wkTip, title: { en: 'High-risk share of GMV by week', zh: '每周高风险成交占比' } });
    const m = state.metric, lab = { inr: { en: 'INR per order', zh: '未收到货投诉（每单）' }, snad: { en: 'SNAD per order', zh: '与描述不符投诉（每单）' }, loss: { en: 'Loss per GMV', zh: '损失（占成交额）' } }[m];
    const hide = (arr) => arr.map((v, i) => (i + 1 > MATURE ? null : v));
    Kit.lineChart($('p-cat-risk'), { x: WX, height: 230, left: 50, xstep: 9, xfmt: wkTick, zero: false, endLabels: false, yfmt: pct(1), tipfmt: pct(2), tipx: wkTip,
      shade: [{ x0: MATURE + 0.5, x1: NW + 0.5, label: { en: 'Not mature', zh: '未成熟' } }],
      series: [{ key: 'hr', label: { en: 'High-risk sellers', zh: '高风险卖家' }, y: hide(s[m][0]), color: 'var(--hr)', width: 2 }, { key: 'o', label: { en: 'Other sellers', zh: '其他卖家' }, y: hide(s[m][1]), color: 'var(--nonhr)', width: 1.6 }],
      title: lab });
    $('p-risk-title').innerHTML = L(lab);
    const sel = state.cat === 'all' ? { en: 'Fashion overall', zh: 'Fashion 整体' } : { en: CATS[+state.cat].en, zh: CATS[+state.cat].zh };
    const w = (arr, ws) => sum(pick(arr, ws)) / ws.length;
    $('p-cat-cap').innerHTML = L({
      en: `${sel.en}: ${pct(1)(w(s.share, PRE))} in the before window, ${pct(1)(w(s.share, POST))} after (weekly mean; the case figures weight by GMV). Shaded: the before and after windows.`,
      zh: `${sel.zh}：基期周均 ${pct(1)(w(s.share, PRE))}，观察期周均 ${pct(1)(w(s.share, POST))}（这里是各周平均；贡献分解按成交额加权）。阴影是前后窗口。` });
  }

  function drawCtv() {
    $('p-ctv-eqs').innerHTML =
      `<p class="eq"><span class="k">${L({ en: 'High-risk share of Fashion GMV', zh: 'Fashion 高风险成交占比' })}</span><span class="v">${L({ en: 'before', zh: '基期' })} ${D.pre.toFixed(2)}% → ${L({ en: 'after', zh: '观察期' })} ${D.post.toFixed(2)}% = <b>${sgn(D.total, 2)} pp</b></span></p>`
      + `<p class="eq"><span class="k">${L({ en: 'Numerator and denominator', zh: '分子和分母' })}</span><span class="v">${L({ en: 'high-risk GMV', zh: '高风险成交额' })} <b>${sgn(D.hrChg, 1)}%</b> · ${L({ en: 'all Fashion GMV', zh: '全部成交额' })} <b>${sgn(D.gmvChg, 1)}%</b></span></p>`;
    const rows = D.all.slice().sort((a, b) => (a.isOther ? 1 : b.isOther ? -1 : b.delta - a.delta));
    rows.push({ name: { en: 'Overall change', zh: '整体变化' }, rateD: D.totRate, mixD: D.totMix, delta: D.total, total: true });
    contribBars($('p-ctv-bars'), rows, { split: true, title: { en: 'Contribution of each category to the change, pp', zh: '各品类对整体变化的贡献（pp）' } });
    const p1 = (v) => (v * 100).toFixed(1) + '%';
    Kit.table($('p-ctv-table'), {
      sortKey: 'delta', sortDir: 'desc',
      columns: [
        { key: 'name', label: { en: 'Category', zh: '品类' }, align: 'l', html: (r) => L(r.name), pri: 1 },
        { key: 'mixPre', label: { en: 'GMV weight, before', zh: '成交额权重 · 基期' }, fmt: p1, pri: 3 },
        { key: 'mixPost', label: { en: 'GMV weight, after', zh: '成交额权重 · 观察期' }, fmt: p1, pri: 3 },
        { key: 'ratePre', label: { en: 'High-risk share, before', zh: '高风险占比 · 基期' }, fmt: p1, pri: 2 },
        { key: 'ratePost', label: { en: 'High-risk share, after', zh: '高风险占比 · 观察期' }, fmt: p1, pri: 2 },
        { key: 'rateD', label: { en: 'Rate effect, pp', zh: 'Rate 效应 pp' }, fmt: (v) => sgn(v, 2), pri: 2 },
        { key: 'mixD', label: { en: 'Mix effect, pp', zh: 'Mix 效应 pp' }, fmt: (v) => sgn(v, 2), pri: 3 },
        { key: 'delta', label: { en: 'Total, pp', zh: '合计 pp' }, fmt: (v) => sgn(v, 2), tone: 'low', pri: 1 },
        { key: 'ctv', label: { en: 'CTV', zh: 'CTV' }, fmt: (v) => sgn(v, 0) + '%', pri: 1 },
      ],
      rows: D.all.map((r) => Object.assign({}, r)),
    });
  }

  function drawSeller() {
    const v = SELLER[state.win], box = $('p-sel-chart');
    const W = Math.max(box.clientWidth, 280), H = 250, m = { l: 40, r: 10, t: 18, b: 30 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, bw = pw / v.length, sy = (p) => m.t + (1 - p / 100) * ph;
    let g = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(t({ en: 'Share of high-risk GMV by seller-rank bucket, with the cumulative share', zh: '按卖家排名分组的高风险成交额占比，及累计占比' }))}">`;
    for (const p of [0, 25, 50, 75, 100]) g += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${sy(p)}" y2="${sy(p)}"/><text x="${m.l - 8}" y="${sy(p) + 4}" text-anchor="end">${p}%</text>`;
    let acc = 0, path = '';
    v.forEach((p, i) => {
      const x = m.l + i * bw + bw * 0.2, w = bw * 0.6;
      g += `<rect x="${x.toFixed(1)}" y="${sy(p).toFixed(1)}" width="${w.toFixed(1)}" height="${(sy(0) - sy(p)).toFixed(1)}" rx="2" style="fill:var(--hr)"/>`;
      g += `<text class="bar-v" x="${(x + w / 2).toFixed(1)}" y="${(sy(p) - 5).toFixed(1)}" text-anchor="middle">${p.toFixed(1)}%</text>`;
      g += svgL(BUCKETS[i], { x: (x + w / 2).toFixed(1), y: H - 10, 'text-anchor': 'middle' });
      acc = r1(acc + p); const cx = m.l + (i + 0.5) * bw;
      path += (i ? 'L' : 'M') + cx.toFixed(1) + ' ' + sy(acc).toFixed(1);
    });
    g += `<path d="${path}" style="fill:none;stroke:var(--ink);stroke-width:1.6px"/>`;
    acc = 0;
    v.forEach((p, i) => { acc = r1(acc + p); const cx = m.l + (i + 0.5) * bw; g += `<circle cx="${cx.toFixed(1)}" cy="${sy(acc).toFixed(1)}" r="3.5" style="fill:var(--ink);stroke:var(--paper);stroke-width:1.5px"/>`; if (i > 0) g += `<text x="${(cx + 6).toFixed(1)}" y="${(sy(acc) - 7).toFixed(1)}" style="fill:var(--ink)">${acc.toFixed(1)}%</text>`; });
    box.innerHTML = g + '</svg>';
    const top10 = v[0], mid = v[3], big = v.indexOf(Math.max(...v));
    $('p-sel-eqs').innerHTML =
      `<p class="eq"><span class="k">${L({ en: 'Top 10 sellers', zh: '前 10 名卖家' })}</span><span class="v"><b>${top10.toFixed(1)}%</b> ${L({ en: 'of high-risk GMV', zh: '的高风险成交额' })}</span></p>`
      + `<p class="eq"><span class="k">${L({ en: 'Sellers ranked 101–500', zh: '排名 101–500 的卖家' })}</span><span class="v"><b>${mid.toFixed(1)}%</b>${L(big === 3 ? { en: ' — the largest group', zh: '，是最大的一组' } : { en: '', zh: '' })}</span></p>`;
  }

  function drawSeg() {
    const d = DIMS[state.dim];
    const rows = [{ label: { en: 'Fashion overall', zh: 'Fashion 整体' }, a: r1(RPRE * 100), b: r1(RPOST * 100), color: 'var(--ink)' }]
      .concat(d.segs.map((sg, j) => ({ label: sg, a: r1(d.rate[0][j] * 100), b: r1(d.rate[1][j] * 100), color: 'var(--hr)' })));
    const all = rows.flatMap((r) => [r.a, r.b]);
    Kit.dumbbell($('p-seg-chart'), {
      rows, aName: { en: 'Before', zh: '基期' }, bName: { en: 'After', zh: '观察期' },
      fmt: (v) => v.toFixed(1) + '%', dfmt: (v) => v.toFixed(1) + ' pp', better: 'lower', domain: [0, Math.ceil(Math.max(...all) * 1.12)],
      title: { en: 'High-risk share within each segment, before to after', zh: '各分群内部的高风险占比：基期 → 观察期' },
    });
    $('p-seg-cap').innerHTML = L({ en: d.cap.en + ' These are shares within each segment; a segment\'s weight in Fashion also moves, so a change here is not its contribution to the overall change.', zh: d.cap.zh + '这些是各分群内部的占比；分群在 Fashion 里的权重也在变，所以这里的变化不等于它对整体变化的贡献。' });
  }

  function drawCatcon() {
    const n = CONC.pre.length, X = Array.from({ length: n }, (_, i) => i + 1);
    Kit.lineChart($('p-cc-chart'), { x: X, height: 240, left: 44, xstep: 5, xfmt: (k) => String(k), zero: true, endLabels: false, domain: [0, 100], yfmt: (v) => v.toFixed(0) + '%', tipfmt: (v) => v.toFixed(1) + '%',
      tipx: (k) => t({ en: 'Top ' + k + ' categories', zh: '前 ' + k + ' 个品类' }),
      series: [{ key: 'pre', label: { en: 'Before', zh: '基期' }, y: CONC.pre.map((x) => x.cum), color: 'var(--nonhr)', width: 1.6, dash: '4 3' }, { key: 'post', label: { en: 'After', zh: '观察期' }, y: CONC.post.map((x) => x.cum), color: 'var(--hr)', width: 2 }],
      title: { en: 'Cumulative share of high-risk GMV by category rank', zh: '按品类排名累计的高风险成交额占比' } });
    const at = (arr, k) => arr[k - 1].cum.toFixed(1) + '%';
    $('p-cc-eqs').innerHTML = [5, 10].map((k) => `<p class="eq"><span class="k">${L({ en: 'Top ' + k + ' categories', zh: '前 ' + k + ' 个品类' })}</span><span class="v">${at(CONC.pre, k)} → <b>${at(CONC.post, k)}</b></span></p>`).join('')
      + `<p class="eq"><span class="k">${L({ en: 'Largest category, after', zh: '观察期最大的品类' })}</span><span class="v"><b>${L(CONC.post[0].name)}</b></span></p>`;
  }

  // ---------------------------------------------------------------------------------- wiring
  const PANELS = [['p-panel-cat', drawCat], ['p-panel-ctv', drawCtv], ['p-panel-seller', drawSeller], ['p-panel-seg', drawSeg], ['p-panel-catcon', drawCatcon]].map(([id, fn]) => ({ el: $(id), fn }));
  const lastW = new Map();
  function redraw(p, force) { const w = p.el.offsetWidth; if (!w || (!force && lastW.get(p.el) === w)) return; lastW.set(p.el, w); p.fn(); }
  const redrawAll = (force) => PANELS.forEach((p) => redraw(p, force));
  function seg(el, fn) {
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-v]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      el.querySelectorAll('button[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fn(b.dataset.v);
    });
  }
  // category chips are written here so the list always matches the data
  $('p-cat-pick').innerHTML = [['all', { en: 'Fashion overall', zh: 'Fashion 整体' }]].concat(CATS.filter((c) => c.named).slice(0, 8).map((c) => [String(CATS.indexOf(c)), { en: c.en, zh: c.zh }]))
    .map(([v, lab]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === 'all'}">${L(lab)}</button>`).join('');
  seg($('p-cat-pick'), (v) => { state.cat = v; drawCat(); });
  seg($('p-metric'), (v) => { state.metric = v; drawCat(); });
  seg($('p-sel-win'), (v) => { state.win = v; drawSeller(); });
  seg($('p-seg-dim'), (v) => { state.dim = v; drawSeg(); });
  if ('ResizeObserver' in window) { const ro = new ResizeObserver((es) => es.forEach((e) => { const p = PANELS.find((x) => x.el === e.target); if (p) redraw(p); })); PANELS.forEach((p) => ro.observe(p.el)); }
  Kit.onResize(() => redrawAll(true));
  Kit.onLang(() => redrawAll(true));
  root.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => redrawAll()));
  window.addEventListener('site:target', () => redrawAll());
  redrawAll();
})();
