/* edd-brief.js · the "draft this week's rollout brief with AI" prototype in the EDD project of index.html (a portfolio extension,
   not part of the internship deliverable).
   Flow: the reader picks a shipping option and a 4-week window (the same filter as the dashboard) → EDD.briefInput()
   (dash-edd.js) works out every metric, change, denominator and maturity status → a language model turns that
   structured input into a brief that answers three questions, each point tagged with its chart.
   Modes: if section#ai-brief has data-endpoint, the input is POSTed there (a server function that holds the API key,
   see server/brief-worker.js). Without one (this static site), the page shows the example generated in advance for
   the same scope and language (brief-data.js), and says so. If the filter changes after a brief is shown, the brief
   keeps its own scope label and offers to redraft or to restore its scope. */
(function () {
  'use strict';
  const E = window.EDD, D = window.BRIEF_DATA, sec = document.getElementById('ai-brief');
  if (!E || !sec || typeof Kit === 'undefined') return;
  const { L, esc } = Kit;
  const $ = (id) => document.getElementById(id);
  const ENDPOINT = (sec.dataset.endpoint || '').trim();
  const B = (en, zh) => ({ en, zh });
  const lang = () => document.documentElement.getAttribute('data-lang') || 'zh';
  const CH = {
    coverage: { blk: 'blk-cov', tab: 'ship', label: B('Coverage and adoption', '覆盖与采用') },
    promised_days: { blk: 'blk-edd', tab: 'ship', label: B('Promised days', '承诺天数') },
    on_time: { blk: 'blk-ot', tab: 'ship', label: B('On-time delivery', '实际准时送达率') },
    tracking: { blk: 'blk-trk', tab: 'ship', label: B('Tracking coverage', '追踪覆盖率') },
    item_not_received: { blk: 'blk-inr', tab: 'ship', label: B('Item-not-received rate', '未收到货投诉率') },
    gmv: { blk: 'blk-gmv-kpi', tab: 'gmv', label: B('GMV tab: before and after', 'GMV 页签：前后对比') },
  };
  const KIND = {
    data_not_mature: B('Data not complete', '数据未成熟'), cause_not_verified: B('Cause to verify', '原因待核查'),
    descriptive_only: B('Descriptive only', '只是描述'), groups_not_comparable: B('Groups not comparable', '分组不可比'),
  };
  const SECS = [
    ['observed', B('What we saw this week', '本周观察到了什么')],
    ['open_questions', B('What the evidence cannot tell us yet', '现有证据还回答不了什么')],
    ['next_checks', B('What to check first next week', '下周优先核查什么')],
  ];
  let brief = null;   // { opt, win, source: 'example' | 'live', data: { zh, en } or { <lang>: … }, model, at }

  // ------------------------------------------------------------------------------------------- controls (shared filter)
  const segOpt = $('brief-opt'), segWin = $('brief-win'), go = $('brief-go');
  const press = (seg, v) => seg.querySelectorAll('button[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  segOpt.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-v]'); if (b) E.set({ opt: b.dataset.v }, 'brief-ctl'); });
  segWin.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-v]'); if (b) E.set({ win: b.dataset.v }, 'brief-ctl'); });
  const scopeOf = (opt, win) => { const s = E.scopeName(opt, win); return B(`${s.en}, compared with the 4 weeks before · counted by orders`, `${s.zh}，对比前 4 周 · 按订单数`); };

  function syncCtl() {
    const st = E.state, ready = st.win !== 'all';
    press(segOpt, st.opt); press(segWin, st.win);
    go.disabled = !ready;
    $('brief-scope').innerHTML = ready
      ? L(B(`Scope: ${scopeOf(st.opt, st.win).en}. The dashboard above uses the same filter.`, `范围：${scopeOf(st.opt, st.win).zh}。上面的看板用的是同一个筛选。`))
      : L(B('Briefs cover a 4-week window. Pick W18–W21 or W22–W25 (the dashboard is showing all 25 weeks).', '简报按 4 周窗口生成：请选择 W18–W21 或 W22–W25（看板现在显示的是全部 25 周）。'));
    const ex = E.briefInput(st.opt, ready ? st.win : 'w22', lang());
    const pick = { scope: ex.scope, metrics: { coverage: ex.metrics.coverage, adoption: ex.metrics.adoption, item_not_received_30d: ex.metrics.item_not_received_30d }, '…': 'promised_days, on_time, tracking_coverage, gmv_tab_context, charts' };
    $('brief-input').textContent = (ready ? '' : '// W22–W25\n') + JSON.stringify(pick, null, 1);
    renderStale();
  }

  // ------------------------------------------------------------------------------------------- mode line
  function modeLine() {
    $('brief-mode').innerHTML = ENDPOINT
      ? L(B('Live mode: the structured input goes to a server function that calls the Claude API; the key never reaches this page.', '实时模式：结构化输入发给服务端函数，由它调用 Claude API；密钥不会出现在网页里。'))
      : L(B(`Example mode: this static site does not call a model. "Draft the brief" shows output generated in advance by ${D ? D.model : 'the model'} (prompt ${D ? D.version : ''}) from exactly the input this page builds for the chosen scope, one run per language.`,
        `示例模式：这个静态网站不实时调用模型。点「生成简报」显示的是用本页为该范围构造的同一份输入、预先生成的模型输出（${D ? D.model : ''}，提示词 ${D ? D.version : ''}），中英文各生成一次。`));
  }

  // ------------------------------------------------------------------------------------------- drafting
  async function draft() {
    const st = E.state;
    if (st.win === 'all') return;
    if (st.basis !== 'n') E.set({ basis: 'n' }, 'brief');
    const out = $('brief-out');
    if (ENDPOINT) {
      const lg = lang();
      out.innerHTML = `<p class="note">${L(B('Drafting…', '正在生成…'))}</p>`;
      try {
        const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: `${st.opt}|${st.win}|${lg}`, input: E.briefInput(st.opt, st.win, lg) }) });
        const j = await r.json();
        if (!r.ok || !j.brief) throw new Error(j.error || r.status);
        brief = { opt: st.opt, win: st.win, source: 'live', data: { [lg]: j.brief }, model: j.model, at: new Date() };
      } catch (e) {
        out.innerHTML = `<p class="callout">${L(B('The live draft failed (' + esc(e.message) + '). Nothing was shown in its place.', '实时生成失败（' + esc(e.message) + '），没有显示任何替代内容。'))}</p>`;
        return;
      }
    } else {
      const ex = D && D.examples[`${st.opt}|${st.win}`];
      if (!ex) { out.innerHTML = `<p class="callout">${L(B('No example was generated for this scope.', '这个范围没有预生成的示例。'))}</p>`; return; }
      brief = { opt: st.opt, win: st.win, source: 'example', data: ex, model: D.model };
    }
    renderBrief();
  }
  go.addEventListener('click', draft);

  // ------------------------------------------------------------------------------------------- rendering
  function body(b) {
    let h = `<p class="bo-h">${esc(b.headline)}</p>`;
    for (const [key, title] of SECS) {
      h += `<div class="bo-sec"><h4>${L(title)}</h4><ul>`;
      for (const it of b[key] || []) {
        const c = CH[it.chart];
        h += '<li>'
          + (it.kind ? `<span class="bo-kind">${L(KIND[it.kind] || B(it.kind, it.kind))}</span> ` : '')
          + `<span class="bo-t">${esc(it.text)}</span>`
          + (it.when ? ` <span class="bo-when">${L(B('When:', '时间：'))} ${esc(it.when)}</span>` : '')
          + (c ? ` <button type="button" class="to-chart" data-chart="${esc(it.chart)}">${L(B('See chart: ', '看图：'))}${L(c.label)} →</button>` : '')
          + '</li>';
      }
      h += '</ul></div>';
    }
    return h;
  }
  function renderBrief() {
    if (!brief) return;
    const langs = Object.keys(brief.data);
    const meta = brief.source === 'example'
      ? B(`Example generated in advance · ${brief.model} · prompt ${D.version} · not a live call`, `预生成示例 · ${brief.model} · 提示词 ${D.version} · 非实时调用`)
      : B(`Live draft · ${brief.model} · ${brief.at.toLocaleString('en-GB')}`, `实时生成 · ${brief.model} · ${brief.at.toLocaleString('zh-CN')}`);
    let h = `<div class="bo-head"><p class="bo-scope">${L(B('Brief for: ', '简报范围：'))}${L(scopeOf(brief.opt, brief.win))}</p><p class="bo-meta">${L(meta)}</p></div><div id="brief-stale"></div>`;
    h += langs.map((l) => `<div class="bo-body" lang="${l}">${body(brief.data[l])}</div>`).join('');
    if (brief.source === 'live') {
      const other = langs[0] === 'zh' ? 'en' : 'zh';
      h += `<p class="note" lang="${other}">${L(B('This brief was drafted in Chinese. Draft it again to get English.', '这份简报是用英文生成的。重新生成可以得到中文版。'))}</p>`;
    }
    $('brief-out').innerHTML = h;
    renderStale();
  }
  function renderStale() {
    const box = $('brief-stale');
    if (!brief || !box) return;
    const st = E.state, stale = st.opt !== brief.opt || st.win !== brief.win;
    $('brief-out').classList.toggle('is-stale', stale);
    if (!stale) { box.innerHTML = ''; return; }
    const now = st.win === 'all' ? E.scopeName(st.opt, 'all') : scopeOf(st.opt, st.win);
    box.innerHTML = `<div class="bo-stale"><p>${L(B(`The filter is now ${now.en}. This brief still describes ${scopeOf(brief.opt, brief.win).en}.`, `筛选已改为 ${now.zh}；这份简报仍对应 ${scopeOf(brief.opt, brief.win).zh}。`))}</p>`
      + `<p>${st.win !== 'all' ? `<button type="button" class="brief-go small" data-act="redraft">${L(B('Draft for the new scope', '为新范围生成'))}</button> ` : ''}<button type="button" class="ghost" data-act="restore">${L(B("Go back to the brief's scope", '切回简报的范围'))}</button></p></div>`;
  }

  // ------------------------------------------------------------------------------------------- back to the charts
  function toChart(id) {
    const c = CH[id];
    if (!c) return;
    if (c.tab === 'ship' && brief && (E.state.opt !== brief.opt || E.state.win !== brief.win || E.state.basis !== 'n')) E.set({ opt: brief.opt, win: brief.win, basis: 'n' }, 'brief');
    E.showTab(c.tab);
    E.focus([c.blk]);
    const el = $(c.blk);
    let back = el.querySelector('.back-brief');
    document.querySelectorAll('.back-brief').forEach((x) => { if (x !== back) x.remove(); });
    if (!back) {
      back = document.createElement('button');
      back.type = 'button'; back.className = 'back-brief ghost';
      back.innerHTML = L(B('← Back to the brief', '← 回到简报'));
      back.addEventListener('click', () => { back.remove(); E.focus([]); $('brief-out').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      el.prepend(back);
    }
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  $('brief-out').addEventListener('click', (ev) => {
    const c = ev.target.closest('.to-chart');
    if (c) { toChart(c.dataset.chart); return; }
    const a = ev.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'restore') E.set({ opt: brief.opt, win: brief.win, basis: 'n' }, 'brief');
    if (a.dataset.act === 'redraft') draft();
  });

  // ------------------------------------------------------------------------------------------- how it works, and the checks
  if (D) {
    $('brief-system').textContent = D.system;
    const ev = D.eval || {};
    let h = '';
    if (ev.method) h += `<p>${L(ev.method)}</p>`;
    if (ev.rows) {
      h += `<div class="table-wrap"><table class="ev-table"><thead><tr><th>${L(B('Scenario', '场景'))}</th><th>${L(B('Inputs tested', '实际测试的输入'))}</th><th>${L(B('Pass when', '验收标准'))}</th><th>${L(B('Result', '结果'))}</th></tr></thead><tbody>`;
      for (const r of ev.rows) h += `<tr><td><b>${L(r.scenario)}</b></td><td>${L(r.input)}</td><td>${L(r.criteria)}</td><td class="ev-res">${L(r.result)}</td></tr>`;
      h += '</tbody></table></div>';
    }
    if (ev.failure) {
      const f = ev.failure;
      h += `<div class="ev-fail"><p class="tb-k">${L(B('A real failure, the fix and the retest', '一次真实的失败、修改和复测'))}</p>`
        + `<p><b>${L(B('Original output', '原输出'))}</b> · ${L(f.scope)}</p><blockquote>${L(f.original)}</blockquote>`
        + `<p><b>${L(B('Problem', '问题'))}</b> ${L(f.problem)}</p><p><b>${L(B('Change', '修改'))}</b> ${L(f.change)}</p><p><b>${L(B('Retest', '复测'))}</b> ${L(f.retest)}</p>`;
      if (f.after) h += `<blockquote>${L(f.after)}</blockquote>`;
      h += '</div>';
    }
    if (ev.limits) h += `<p class="note">${L(ev.limits)}</p>`;
    $('brief-eval-body').innerHTML = h;
  }
  modeLine();
  syncCtl();
  E.on(() => syncCtl());
  Kit.onLang(() => syncCtl());
})();
