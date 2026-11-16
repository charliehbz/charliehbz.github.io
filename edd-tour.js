/* edd-tour.js · the two-minute guided demo on cases/ebay-edd.html: "should this route get a wider rollout?"
   Three steps inside the Shipping tab, each one: look at a chart → see one thing → answer one question. Every number is
   read from window.EDD (dash-edd.js) for the demo's scope, the same figures the charts draw, so the text and the
   charts cannot disagree. If the reader changes a filter mid-demo, the card says so and offers to restore the scope. */
(function () {
  'use strict';
  const E = window.EDD, card = document.getElementById('tour');
  if (!E || !card || typeof Kit === 'undefined') return;
  const { L, MINUS } = Kit;
  const SC = { opt: 'speedpak', win: 'w22', basis: 'n' };          // the demo's route and window
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);
  const nf = (v) => Math.round(v).toLocaleString('en-US');
  let step = -1, choice = null, drift = false;

  // ------------------------------------------------------------------------------------------- the numbers
  function facts() {
    const S = E.summary(SC.opt, SC.win, 'n'), c = S.cur, b = S.base;
    const eco = E.summary('economy', SC.win, 'n');
    const imm = S.weeks.filter((w) => !c.mat.includes(w));
    return {
      N: nf(c.N), Eg: nf(c.E), A: nf(c.A), cov: c.cov.toFixed(1), ad: c.ad.toFixed(1),
      totA: c.tot.a.toFixed(1), totE: c.tot.e.toFixed(1), gap: Math.abs(r1(c.tot.a - c.tot.e)).toFixed(1),
      tdA: c.td.a.toFixed(1), tdE: c.td.e.toFixed(1), hdA: c.hd.a.toFixed(1), hdE: c.hd.e.toFixed(1),
      otA: c.ot.a.toFixed(1), otE: c.ot.e.toFixed(1), otGap: Math.abs(r1(c.ot.a - c.ot.e)).toFixed(1), otChg: sgn(r1(c.ot.a - b.ot.a), 1),
      trkA: c.trk.a.toFixed(1), trkE: c.trk.e.toFixed(1), trkAp: b.trk.a.toFixed(1),
      mat: E.wl(c.mat), imm: imm.map((w) => 'W' + w), immDue: imm.map((w) => E.inrDone(w)), due: E.inrDone(S.weeks[S.weeks.length - 1]),
      inrAp: b.inr.a.toFixed(2), inrEp: b.inr.e.toFixed(2),
      win: E.wl(S.weeks), base: E.wl(S.baseWeeks),
      ecoTrk: eco.cur.trk.a.toFixed(1), ecoTrkP: eco.base.trk.a.toFixed(1), ecoOt: eco.cur.ot.a.toFixed(1), ecoOtP: eco.base.ot.a.toFixed(1),
    };
  }

  // ------------------------------------------------------------------------------------------- the steps
  const B = (en, zh) => ({ en, zh });
  function content(f) {
    const immEn = f.imm.join(' and '), immZh = f.imm.join('、'), dueEn = f.immDue.join(' and '), dueZh = f.immDue.join('、');
    return [
      { at: 'blk-cov', focus: ['blk-cov'],
        q: B('Is the model really being used?', '模型真的被用到了吗？'),
        look: B('The "Coverage and adoption" chart: each week of SpeedPAK orders, split into three groups.', '「覆盖与采用」图：SpeedPAK 每周的订单，分成三组。'),
        see: B(`Coverage ${f.cov}%: ${f.Eg} ÷ ${f.N}, out of all SpeedPAK orders. Adoption ${f.ad}%: ${f.A} ÷ ${f.Eg}, out of eligible orders only. Almost every order is in scope; few switch to the model's date.`,
          `覆盖率 ${f.cov}%：${f.Eg} ÷ ${f.N}，分母是 SpeedPAK 的全部订单。采用率 ${f.ad}%：${f.A} ÷ ${f.Eg}，分母只是符合条件的订单。几乎所有订单都在模型范围内，真正换成模型时间的很少。`),
        answer: B('Covered, but rarely used: high coverage, low adoption. Low adoption on its own does not mean the model failed.', '覆盖到了，但用得少：高覆盖、低采用。采用率低本身不说明模型没起作用。'),
        verify: {
          title: B('Possible explanations, still to verify (not conclusions)', '可能的解释，仍待核查（不是结论）'),
          items: [B('The rule\'s promise may already be short enough, so the model has nothing shorter to offer.', '原规则的承诺可能已经足够短，模型给不出更短的时间。'),
            B('The phased rollout may apply the model to only part of the eligible orders.', '分阶段上线时，模型可能只用在了一部分符合条件的订单上。')],
          note: B('This dashboard cannot tell the two apart. That needs the gap between the model\'s date and the rule\'s date on eligible orders that kept the rule\'s date.', '这个看板分不开这两种情况：需要看「符合条件但未采用」订单上，模型时间与原规则时间的差距。'),
        } },
      { at: 'blk-edd', focus: ['blk-edd', 'blk-ot', 'blk-trk', 'blk-inr'],
        q: B('Are the shorter promises kept?', '更短的承诺能兑现吗？'),
        look: B('Read three charts together: promised days, on-time delivery and tracking coverage. Then check whether the complaint data is complete.', '联看三张图：承诺天数、实际准时送达率、追踪覆盖率；再看投诉数据是否成熟。'),
        list: [
          B(`Promised days: ${f.totA} for orders that used the model, ${f.gap} days shorter than eligible orders on the rule's date (${f.totE}); most of it is transit (${f.tdA} vs ${f.tdE}).`,
            `承诺天数：采用组 ${f.totA} 天，比符合条件但未采用的订单（${f.totE} 天）短 ${f.gap} 天，主要短在运输段（${f.tdA} 对 ${f.tdE} 天）。`),
          B(`On-time delivery: ${f.otA}% for orders that used the model, ${f.otE}% for eligible orders on the rule's date; ${f.otChg} pp against the prior window (${f.base}).`,
            `实际准时送达率：采用组 ${f.otA}%，未采用组 ${f.otE}%；采用组比对比期（${f.base}）${f.otChg} 个百分点。`),
          B(`Tracking coverage: ${f.trkA}% for orders that used the model, ${f.trkAp}% in the prior window. On-time is measured on about as many orders as before.`,
            `追踪覆盖率：采用组 ${f.trkA}%，对比期 ${f.trkAp}%。准时率是在和之前差不多多的订单上算出来的。`),
        ],
        can: B(`What we can say now: the shorter promise has not brought a sharp fall in on-time delivery. Orders that used the model are ${f.otGap} points below the others, and the two groups are not randomly assigned, so the gap is for diagnosis only.`,
          `此刻能判断：更短的承诺没有带来准时率的明显下滑。采用组比未采用组低 ${f.otGap} 个百分点；两组不是随机分组，这个差距只用来诊断。`),
        wait: B(`What has to wait: complaints. Only ${f.mat} of the 4 weeks have 30 days of claims; ${immEn} complete on ${dueEn}. In the mature prior window, orders that used the model had ${f.inrAp}% against ${f.inrEp}% for the others.`,
          `还需要等：投诉率。本期 4 周里只有 ${f.mat} 满 30 天，${immZh} 分别在 ${dueZh} 满。已成熟的对比期里，采用组投诉率 ${f.inrAp}%，未采用组 ${f.inrEp}%。`) },
      { at: 'blk-read', after: true, focus: [],
        q: B('What would you tell the business team?', '你会给业务团队什么建议？'),
        look: B('Pick one first, then see the reasoning.', '先选一个，再看依据。'),
        choices: { expand: B('Expand the rollout', '扩大上线'), watch: B('Keep watching', '继续观察'), check: B('Investigate first', '优先排查') },
        verdict: {
          watch: B('That matches the charts.', '和图表一致。'),
          expand: B('Too early.', '还早。'),
          check: B('Understandable, but there is no red flag yet.', '可以理解，但现在没有需要马上排查的信号。'),
        },
        why: {
          watch: B('The promise is shorter and on-time delivery has held, but the complaint data is not complete and the reason for low adoption is unknown.', '承诺确实更短、准时率没有明显变差，但投诉数据还没成熟，采用率低的原因也没查清。'),
          expand: B(`Coverage is already ${f.cov}%, so a wider scope adds few orders; what is unexplained is why only ${f.ad}% of eligible orders use the model's date, and complaints are not complete.`,
            `覆盖率已经是 ${f.cov}%，扩大范围能新增的订单有限；没解释的是为什么只有 ${f.ad}% 的符合条件订单用上模型时间，而且投诉数据还没成熟。`),
          check: B('On-time delivery and tracking coverage are stable. The reason for low adoption is worth finding out, but it is a data request for next week, not a rollout risk to act on today.', '准时率和追踪覆盖率都稳定。低采用的原因值得查，但它是下周的数据需求，不是今天就要处理的上线风险。'),
        },
        basis: [
          B(`Coverage ${f.cov}%, adoption ${f.ad}%: the open question is adoption, not reach.`, `覆盖率 ${f.cov}%、采用率 ${f.ad}%：要回答的是"为什么用得少"，不是"覆盖够不够"。`),
          B(`Promise ${f.gap} days shorter, on-time ${f.otGap} points lower than the other group, tracking coverage unchanged: no delivery red flag.`, `承诺短 ${f.gap} 天，准时率只比另一组低 ${f.otGap} 个百分点，追踪覆盖率没变：没有履约红灯。`),
          B(`Complaints for ${f.win} are complete only on ${f.due}.`, `${f.win} 的投诉数据要到 ${f.due} 才满 30 天。`),
        ],
        next: B(`Next check: after ${f.due}, compare the 30-day complaint rate of the two groups for ${f.win}; and ask the model team for the gap between the model's and the rule's date on eligible orders that kept the rule's date.`,
          `下一次查：${f.due} 之后，比较 ${f.win} 采用组和未采用组的 30 天投诉率；同时向模型团队要「符合条件但未采用」订单上模型时间与原规则时间的差距，分清低采用的原因。`),
        contrast: B(`For contrast, Economy over the same weeks: tracking coverage fell from ${f.ecoTrkP}% to ${f.ecoTrk}% while on-time rose from ${f.ecoOtP}% to ${f.ecoOt}%. That is a signal to investigate first: the better on-time rate may only reflect fewer orders being measured.`,
          `对照一下 Economy 同期：追踪覆盖率从 ${f.ecoTrkP}% 降到 ${f.ecoTrk}%，准时率却从 ${f.ecoOtP}% 升到 ${f.ecoOt}%。这才是该优先排查的信号：准时率变好，可能只是被测的订单变少了。`) },
    ];
  }

  // ------------------------------------------------------------------------------------------- rendering
  const btn = (act, label, cls) => `<button type="button" class="${cls || 'ghost'}" data-act="${act}">${L(label)}</button>`;
  function render() {
    const f = facts(), S = content(f)[step];
    let h = `<div class="tour-top"><p class="tour-k">${L(B('Demo', '演示'))} · ${L(B(`Step ${step + 1} of 3`, `第 ${step + 1} / 3 步`))}</p>`
      + `<p class="tour-sc">${L(B(`SpeedPAK · ${f.win}, compared with ${f.base} · illustrative data`, `SpeedPAK · ${f.win}，对比 ${f.base} · 示意数据`))}</p>${btn('exit', B('Exit demo', '退出演示'), 'tour-x')}</div>`;
    if (drift) {
      h += `<p class="tour-drift">${L(B('You changed a filter, so the charts no longer show the demo\'s scope. The text below is about SpeedPAK, ' + f.win + '.', '你改了筛选，图表已经不是演示的范围；下面的文字仍对应 SpeedPAK · ' + f.win + '。'))} ${btn('restore', B('Back to the demo scope', '回到演示范围'))}</p>`;
    }
    h += `<h3 class="tour-q">${L(S.q)}</h3><p class="tour-look">${L(S.look)}</p>`;
    if (S.see) h += `<p><b>${L(B('What you see', '现象'))}</b> ${L(S.see)}</p><p><b>${L(B('Answer', '回答'))}</b> ${L(S.answer)}</p>`
      + `<div class="tour-box"><p class="tb-k">${L(S.verify.title)}</p><ol>${S.verify.items.map((x) => `<li>${L(x)}</li>`).join('')}</ol><p class="note">${L(S.verify.note)}</p></div>`;
    if (S.list) h += `<ul class="tour-list">${S.list.map((x) => `<li>${L(x)}</li>`).join('')}</ul>`
      + `<div class="tour-mat"><p class="tm-can">${L(S.can)}</p><p class="tm-wait">${L(S.wait)}</p></div>`;
    if (S.choices) {
      h += `<div class="tour-choices" role="group" aria-label="Your recommendation">${Object.keys(S.choices).map((k) => `<button type="button" class="tour-choice" data-choice="${k}" aria-pressed="${choice === k}">${L(S.choices[k])}</button>`).join('')}</div>`;
      if (choice) {
        h += `<div class="tour-reveal"><p class="tr-v${choice === 'watch' ? ' ok' : ''}">${L(S.verdict[choice])} ${L(S.why[choice])}</p>`
          + `<p class="tb-k">${L(B('Basis, from the charts above', '依据（来自上面的图）'))}</p><ol>${S.basis.map((x) => `<li>${L(x)}</li>`).join('')}</ol>`
          + `<p>${L(S.next)}</p><p class="note">${L(S.contrast)} ${btn('economy', B('See Economy →', '看 Economy →'))}</p>`
          + `<p class="tour-end">${btn('brief', B('Draft this as a brief with AI ↓', '用 AI 把它起草成简报 ↓'), 'tour-go small')} ${btn('exit', B('Exit and browse freely', '退出演示，自由浏览'))}</p></div>`;
      }
    }
    h += `<div class="tour-nav">${step > 0 ? btn('prev', B('← Back', '← 上一步')) : '<span></span>'}<span class="tour-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</span>${step < 2 ? btn('next', B('Next →', '下一步 →'), 'tour-go small') : '<span></span>'}</div>`;
    card.innerHTML = h;
    // put the card next to the chart this step is about, and outline those charts
    const at = document.getElementById(S.at);
    if (S.after) at.after(card); else at.before(card);
    card.hidden = false;
    E.focus(S.focus);
  }
  function go(i, quiet) { step = i; render(); if (!quiet) card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function start(quiet) {
    choice = null; drift = false;
    E.showTab('ship');
    E.set(SC, 'tour');
    go(0, quiet);
  }
  function exit() { step = -1; card.hidden = true; E.focus([]); }

  card.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-choice]');
    if (c) { choice = c.dataset.choice; render(); card.querySelector('.tour-reveal').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'next') go(step + 1);
    else if (a === 'prev') go(step - 1);
    else if (a === 'exit') exit();
    else if (a === 'restore') { drift = false; E.set(SC, 'tour'); render(); }
    else if (a === 'economy') { exit(); E.set({ opt: 'economy', win: SC.win, basis: 'n' }, 'tour'); E.focus(['blk-ot', 'blk-trk']); document.getElementById('blk-trk').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else if (a === 'brief') { exit(); document.getElementById('ai-brief').scrollIntoView({ behavior: 'smooth' }); }
  });
  E.on((st, source) => {
    if (step < 0 || source === 'tour') return;
    const off = st.opt !== SC.opt || st.win !== SC.win || st.basis !== SC.basis;
    if (off !== drift) { drift = off; render(); }
  });
  Kit.onLang(() => { if (step >= 0) render(); });
  document.querySelectorAll('[data-tour-start]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); start(); }));
  // #demo opens the demo: on load, on a hash change, and from the one-file preview's router ('site:target')
  if (location.hash === '#demo') {   // arriving with #demo: the browser jumps to the #demo anchor once the page has
    start(true);                      // loaded, so the scroll to the card has to wait until after that jump
    const toCard = () => setTimeout(() => card.scrollIntoView({ block: 'start' }), 80);
    if (document.readyState === 'complete') toCard(); else window.addEventListener('load', toCard);
  }
  window.addEventListener('hashchange', () => { if (location.hash === '#demo') start(); });
  window.addEventListener('site:target', (ev) => { if (ev.detail === 'demo') start(); });
})();
