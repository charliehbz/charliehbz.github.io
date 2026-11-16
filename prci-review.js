/* prci-review.js · "Can this risk recommendation go to the strategy team?" on cases/prci.html.
   A portfolio extension designed after the internship: a hand-built draft (not model output) is reviewed sentence by
   sentence — keep, rewrite, or needs more data — and each judgement links to the evidence in the dashboard below.
   The judgements are preset; no model is called. Every number is read from window.PRCI (dash-prci.js), the same
   figures the charts and the table draw, so the review text cannot disagree with them. */
(function () {
  'use strict';
  const P = window.PRCI, sec = document.getElementById('review');
  if (!P || !sec || typeof Kit === 'undefined') return;
  const { L, MINUS } = Kit;
  const $ = (id) => document.getElementById(id);
  const B = (en, zh) => ({ en, zh });
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);
  const pc1 = (v) => (v * 100).toFixed(1) + '%';

  // ------------------------------------------------------------------------------------------- the numbers
  const D = P.D, top = D.top;
  const second = D.rows.filter((r) => r !== top).sort((a, b) => b.delta - a.delta)[0];
  const pulls = D.all.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const big = D.rows.slice().sort((a, b) => b.hrPost - a.hrPost)[0];               // most high-risk GMV, after
  const f = {
    top: top.name, d: sgn(top.delta, 2), rate: sgn(top.rateD, 2), mix: sgn(top.mixD, 2), total: sgn(D.total, 2), rest: sgn(D.restD, 2),
    second: second.name, d2: sgn(second.delta, 2),
    pulls: B(pulls.map((r) => `${r.name.en} (${sgn(r.delta, 2)})`).join(', '), pulls.map((r) => `${r.name.zh}（${sgn(r.delta, 2)}）`).join('、')),
    big: big.name, bigShare: pc1(big.hrPost), topShare: pc1(top.hrPost),
    rPre: pc1(top.ratePre), rPost: pc1(top.ratePost),
    s10: P.SELLER.post[0].toFixed(1) + '%', s500: P.SELLER.post[3].toFixed(1) + '%',
  };
  const n = (x) => x.en, z = (x) => x.zh;

  // ------------------------------------------------------------------------------------------- the draft and the judgements
  const CH = { keep: B('Keep', '可保留'), rewrite: B('Rewrite', '需改写'), data: B('Needs more data', '需补数据') };
  const ICON = { keep: '✓', rewrite: '✎', data: '+' };
  const S = [
    { text: B("Men's Shoes is the biggest driver of this rise in Fashion's high-risk share of GMV.", '男鞋是本次 Fashion 高风险成交额占比上升的最大推动项。'),
      answer: 'keep', ev: 'ctv-top', evLabel: B('the contributions chart', '品类贡献分解图'),
      why: [
        B(`In the decomposition, ${n(f.top)} adds ${f.d} pp (rate ${f.rate}, mix ${f.mix}), the largest push of any category; the next, ${n(f.second)}, adds only ${f.d2}. The overall share rose just ${f.total} because other categories pull the other way: ${f.pulls.en}; all other categories together ${f.rest}.`,
          `贡献分解里，${z(f.top)}贡献 ${f.d} 个百分点（Rate ${f.rate}、Mix ${f.mix}），是所有品类里最大的上行项；排第二的${z(f.second)}只有 ${f.d2}。整体只上升 ${f.total}，因为其他品类在往下拉：${f.pulls.zh}；其余品类合计 ${f.rest}。`),
        B(`Two kinds of "biggest": ${n(f.top)} contributed most to this change, but the category with the most high-risk GMV is ${n(f.big)} — ${f.bigShare} of Fashion's high-risk GMV after, against ${f.topShare} for ${n(f.top)} — and ${n(f.big)} pulled the share down this time. The draft says "driver", so it can stay; "${n(f.top)} has the most high-risk GMV" would be wrong.`,
          `注意两种「最大」：${z(f.top)}是对这次变化贡献最大的品类；但高风险成交额体量最大的是${z(f.big)}：观察期占 Fashion 高风险成交额的 ${f.bigShare}，${z(f.top)}是 ${f.topShare}，而${z(f.big)}这次在往下拉。草稿说的是「推动项」，所以可以保留；若写成「${z(f.top)}的高风险成交额最多」就错了。`),
      ],
      wrong: {
        rewrite: B('No rewrite needed: the sentence is about contribution to the change, which is exactly what the decomposition answers.', '不用改：这句话说的是对变化的贡献，正好是贡献分解回答的问题。'),
        data: B('No more data needed: the decomposition covers every category, and the rows add up exactly to the overall change.', '不用补数据：贡献分解覆盖了全部品类，各行加起来正好等于整体变化。'),
      },
      look: B(`Outlined: ${n(f.top)}, the biggest push. Shaded: the categories pulling down. In the table, the column "Share of Fashion's high-risk GMV, after" shows that ${n(f.big)} is the largest by volume.`,
        `深色框是${z(f.top)}，最大的上行项；浅灰底的行在往下拉。明细表「占 Fashion 高风险成交额 · 观察期」一列能看到，体量最大的是${z(f.big)}。`) },
    { text: B("Recently, more Men's Shoes sellers have become high-risk.", '近期更多男鞋卖家变成了高风险。'),
      answer: 'rewrite', ev: 'ctv-note', evLabel: B('the note beside the contributions chart', '贡献图旁的说明'),
      supported: B(`What the data supports: "Within Men's Shoes, sellers currently tagged high-risk account for a larger share of GMV." Their share of Men's Shoes GMV went from ${f.rPre} to ${f.rPost}, the rate effect of ${f.rate} pp.`,
        `数据支持的表述：「在男鞋品类里，当前被标为高风险的卖家贡献了更高比例的成交额。」男鞋内高风险卖家的成交额占比从 ${f.rPre} 升到 ${f.rPost}，对应 Rate 效应 ${f.rate} 个百分点。`),
      why: [
        B('"More sellers": the metric is measured in GMV. The share can grow because these sellers sold more or because the others sold less; it cannot show the number of high-risk sellers changed.', '「更多卖家」：指标按成交额计算。比重变大，可能是这些卖家卖得更多，也可能是其他卖家卖得更少，推不出高风险卖家的人数变化。'),
        B('"Have become high-risk": tiers come from the latest snapshot when the data was pulled, applied to every past week. Both windows use the same tiers, so the data cannot show in which week any seller changed tier.', '「变成了高风险」：风险标签取自跑表时的最新快照，回填到所有历史周。基期和观察期用的是同一份标签，看不出卖家在哪一周变更了等级。'),
      ],
      wrong: {
        keep: B('Cannot stay as written: "more sellers" and "have become" both claim more than the data can show.', '不能原样保留：「更多卖家」「变成了」都超出了数据能证明的范围。'),
        data: B('To prove the sentence as written you would need more data (seller counts per window, tiers by week). But part of it is already supported, so rewrite it first and list the extra data as a follow-up.', '要证明原句，确实需要补数据（各期卖家人数、按周生效的风险等级）。但这句话里有一部分现有数据已经能说清，先改写成有证据的表述，补数据作为后续。'),
      },
      look: B(`Read the ${n(f.top)} row's rate effect (clay) and the note below the chart: it is a change in GMV share, not in seller numbers or tiers. The table has ${n(f.top)}'s high-risk share of its GMV, before and after.`,
        `看${z(f.top)}那一行的 Rate 效应（陶土色）和图下的说明：它是成交额比重的变化，不是卖家人数，也不是等级变更。明细表里有${z(f.top)}「品类内高风险成交占比」的基期和观察期。`) },
    { text: B('Recommend acting first on the top sellers.', '建议优先处置头部卖家。'),
      answer: 'data', ev: 'seller-scope', evLabel: B('the seller-concentration chart', '卖家集中度图'),
      why: [
        B(`The only seller evidence is the seller-concentration chart, and its scope is all of Fashion, not Men's Shoes. Even if every number is right — after the change, the top 10 sellers hold ${f.s10} of Fashion's high-risk GMV and sellers ranked 101–500 hold ${f.s500} — it cannot say where Men's Shoes' high-risk GMV sits. Even across Fashion, the largest group is not the top.`,
          `能找到的卖家证据只有卖家集中度图，它的范围是整个 Fashion，不是男鞋。即使每个数字都准确（观察期前 10 名卖家占 Fashion 高风险成交额的 ${f.s10}，排名 101–500 的卖家占 ${f.s500}），也回答不了「男鞋内部的风险成交额集中在哪些卖家」。何况在整个 Fashion，最大的一组也不是头部。`),
      ],
      need: B('Next step for the business team: pull a Men\'s Shoes × seller-rank breakdown for both windows, then read the risk records of the sellers concerned (claims, losses, past actions) before weighing any action. The illustrative data has no such cross-cut, so this page does not draw one. Whether and how to act is the strategy team\'s decision.',
        '给业务同事的下一步：补看「男鞋 × 卖家排名」的交叉分布（基期和观察期），再结合相关卖家的具体风险记录（投诉、损失、历史处置），评估处置依据。示意数据没有这个交叉维度，所以页面上不画这张图。是否处置、如何处置由策略团队决定。'),
      wrong: {
        keep: B('Cannot stay: the evidence is neither about Men\'s Shoes nor about any seller\'s risk record.', '不能保留：现有证据既不在男鞋范围内，也不涉及具体卖家的风险记录。'),
        rewrite: B('Rewording will not fix it: what is missing is data, not phrasing. Turn it into a specific request for data.', '改措辞解决不了：缺的是数据，不是表述。把它改成具体的排查请求。'),
      },
      look: B('Note the scope tag beside the title: all of Fashion. Men\'s Shoes\' own breakdown is not in this chart; the box below says what is missing.', '注意标题旁的范围标签：整个 Fashion。男鞋内部的分布不在这张图里，图下写明了缺什么。') },
  ];
  const FINAL = {
    text: [
      B(`${n(f.top)} is the biggest driver of this rise in Fashion's high-risk share of GMV: it added ${f.d} pp while the overall share rose ${f.total}, with ${n(f.big)} and other categories pulling down.`,
        `${z(f.top)}是本次 Fashion 高风险成交额占比上升的最大推动项：贡献 ${f.d} 个百分点，整体只上升 ${f.total}，${z(f.big)}等品类在往下拉。`),
      B(`Within ${n(f.top)}, sellers currently tagged high-risk account for a larger share of GMV (${f.rPre} → ${f.rPost}). This is a GMV share with tiers from the latest snapshot, so it does not show more high-risk sellers or when any seller's tier changed.`,
        `在${z(f.top)}品类里，当前被标为高风险的卖家贡献了更高比例的成交额（${f.rPre} → ${f.rPost}）；这一指标按成交额计算，风险等级取自跑表时的最新快照，不能说明高风险卖家人数增加，也看不出卖家何时变更等级。`),
      B(`No action targets yet: please first pull high-risk GMV by seller rank within ${n(f.top)} for both windows and review the sellers' risk records, then decide whether and how to act.`,
        `处置对象暂不建议：请先补看${z(f.top)}品类内按卖家排名的高风险成交额分布（基期和观察期），并结合相关卖家的风险记录，再评估是否处置、如何处置。`),
    ],
    changed: [
      B('Kept the category finding that has evidence, and added the context: a small net rise with other categories pulling down.', '保留有证据的品类发现，并补上「整体只小幅上升、其他品类在往下拉」的上下文。'),
      B('Replaced "more sellers have become high-risk" with an accurate description of the GMV mix, stating the denominator and when the tiers were taken.', '把「更多卖家变成高风险」改成对成交结构的准确描述，写明分母和标签取值时间。'),
      B('Turned an action recommendation without evidence into a specific request for data; the decision stays with the strategy team.', '把证据不足的处置建议改成具体的数据请求；处置决定留给策略团队。'),
    ],
  };

  // ------------------------------------------------------------------------------------------- state and rendering
  const ans = [null, null, null];
  let cur = 0;
  const card = $('rv-card'), draft = $('rv-draft'), fin = $('rv-final');
  const done = () => ans.filter(Boolean).length;
  const btn = (act, label, cls) => `<button type="button" class="${cls || 'ghost'}" data-act="${act}">${L(label)}</button>`;

  function renderDraft() {
    draft.innerHTML = `<p class="rv-draft-k">${L(B('Draft to review · a hand-built test case', '待审核的草稿 · 人工构造的测试样例'))}</p><p class="rv-text">`
      + S.map((s, i) => `<button type="button" class="rv-s${i === cur ? ' on' : ''}${ans[i] ? ' done' : ''}" data-i="${i}"><span class="rv-n">${i + 1}</span>${L(s.text)}${ans[i] ? ` <span class="rv-chip">${ICON[s.answer]} ${L(CH[s.answer])}</span>` : ''}</button>`).join(' ')
      + '</p>';
  }
  function renderCard() {
    const s = S[cur], a = ans[cur];
    let h = `<div class="tour-top"><p class="tour-k">${L(B('Review', '审核'))} · ${L(B(`Sentence ${cur + 1} of 3`, `第 ${cur + 1} / 3 句`))}</p><p class="tour-sc">${L(B(`${done()} of 3 judged · illustrative data`, `已审 ${done()} / 3 · 示意数据`))}</p></div>`
      + `<blockquote class="rv-quote">${L(s.text)}</blockquote>`
      + `<p class="tour-look">${L(B('Can this sentence go to the strategy team as it is?', '这句话能原样发给策略团队吗？'))}</p>`
      + `<div class="tour-choices" role="group" aria-label="Your judgement">${Object.keys(CH).map((k) => `<button type="button" class="tour-choice" data-choice="${k}" aria-pressed="${a === k}">${ICON[k]} ${L(CH[k])}</button>`).join('')}</div>`;
    if (a) {
      const ok = a === s.answer;
      h += `<div class="tour-reveal"><p class="tr-v${ok ? ' ok' : ''}">${ok ? L(B('Right: ', '判断正确：')) : L(B('Suggested: ', '建议：'))}${L(CH[s.answer])}${L(B('.', '。'))}${ok ? '' : ' ' + L(s.wrong[a])}</p>`;
      if (s.supported) h += `<p class="rv-sup">${L(s.supported)}</p>`;
      h += `<p class="tb-k">${L(s.answer === 'rewrite' ? B('Two misreadings in the original', '原句的两处误读') : B('Basis', '判断依据'))}</p><ul class="tour-list">${s.why.map((x) => `<li>${L(x)}</li>`).join('')}</ul>`;
      if (s.need) h += `<div class="missing"><p class="tb-k">${L(B('Missing data, and the next step', '缺的数据和下一步'))}</p><p>${L(s.need)}</p></div>`;
      h += `<p class="tour-end">${btn('evidence', B(`See the evidence: ${s.evLabel.en} →`, `查看证据：${s.evLabel.zh} →`), 'tour-go small')}</p></div>`;
    }
    h += `<div class="tour-nav">${cur > 0 ? btn('prev', B('← Previous', '← 上一句')) : '<span></span>'}<span class="tour-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('')}</span>`
      + (cur < 2 ? btn('next', B('Next sentence →', '下一句 →'), a ? 'tour-go small' : 'ghost') : done() === 3 ? btn('final', B('See the reviewed version ↓', '看审核后的版本 ↓'), 'tour-go small') : '<span></span>') + '</div>';
    card.innerHTML = h;
  }
  function renderFinal() {
    if (done() < 3) { fin.hidden = true; return; }
    const tags = [B('Kept, with context', '保留，补上下文'), B('Rewritten', '改写'), B('Now a data request', '改为数据请求')];
    fin.innerHTML = `<p class="tb-k">${L(B('Version for the strategy team', '可发给策略团队的版本'))}</p>`
      + `<div class="rv-out">${FINAL.text.map((x, i) => `<p><span class="rv-tag">${i + 1} · ${L(tags[i])}</span> ${L(x)}</p>`).join('')}</div>`
      + `<p class="tb-k">${L(B('What the review changed', '审核改变了什么'))}</p><ol class="tour-list">${FINAL.changed.map((x) => `<li>${L(x)}</li>`).join('')}</ol>`
      + `<p class="tour-end">${btn('restart', B('Review again', '重新审核'))} ${btn('accept', B('How I would accept this AI feature ↓', '我会怎样验收这个 AI 功能 ↓'))}</p>`;
    fin.hidden = false;
  }
  const render = () => { renderDraft(); renderCard(); renderFinal(); };

  // ------------------------------------------------------------------------------------------- evidence, and the way back
  function clearEvidence() { document.querySelectorAll('.ev-banner').forEach((b) => b.remove()); }
  function back() { clearEvidence(); P.clear(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function openEvidence(i) {
    const s = S[i], blk = P.show(s.ev);
    if (!blk) return;
    clearEvidence();
    const bn = document.createElement('div');
    bn.className = 'ev-banner';
    bn.innerHTML = `<p><b>${L(B(`Evidence for sentence ${i + 1}`, `第 ${i + 1} 句的证据`))}</b> · ${L(s.look)}</p><button type="button" class="ghost" data-back>${L(B(`← Back to sentence ${i + 1}`, `← 回到第 ${i + 1} 句`))}</button>`;
    bn.querySelector('[data-back]').addEventListener('click', back);
    const at = s.ev === 'ctv-note' ? $('p-ctv-note') : blk;   // sentence 2: the note under the chart is the evidence
    if (at === blk) blk.prepend(bn); else at.before(bn);
    bn.scrollIntoView({ block: s.ev === 'ctv-note' ? 'center' : 'start', behavior: 'smooth' });
  }

  sec.addEventListener('click', (ev) => {
    const si = ev.target.closest('.rv-s');
    if (si) { cur = +si.dataset.i; render(); card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const c = ev.target.closest('[data-choice]');
    if (c) { ans[cur] = c.dataset.choice; render(); return; }
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'next') { cur++; render(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else if (a === 'prev') { cur--; render(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else if (a === 'evidence') openEvidence(cur);
    else if (a === 'final') fin.scrollIntoView({ block: 'start', behavior: 'smooth' });
    else if (a === 'restart') { ans.fill(null); cur = 0; clearEvidence(); P.clear(); render(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else if (a === 'accept') { const d = $('rv-accept'); d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  });
  document.querySelectorAll('[data-review-start]').forEach((x) => x.addEventListener('click', (ev) => { ev.preventDefault(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
  render();
})();
