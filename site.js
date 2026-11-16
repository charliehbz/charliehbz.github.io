/* site.js · behaviour shared by the pages of this portfolio (loaded after kit.js).
   1. Dashboard tabs on a case page: each [data-dash] holds a role="tablist"; arrow keys, Home and End move between tabs.
      A tab's id in the address (#dashboard-shipping, #prci-dashboard-ctv …) or a 'site:target' event from the one-file
      preview opens that tab and scrolls to its section.
   2. Home preview [data-cov-demo]: the "coverage / adoption" toggle sets data-mode, and CSS swaps which dots,
      formula and definitions are shown. Works without this script too (it then stays on coverage). */
(function () {
  'use strict';

  // ------------------------------------------------------------------------------- 1. dashboard tabs
  // Every [data-dash] gets its own tab group (the one-file preview holds several case pages at once).
  const groups = Array.from(document.querySelectorAll('[data-dash]')).map((dash) => {
    const list = dash.querySelector('[role="tablist"]');
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t) => t.addEventListener('click', () => select(t)));
    list.addEventListener('keydown', (ev) => {
      const i = tabs.indexOf(document.activeElement), n = tabs.length;
      if (i < 0) return;
      const j = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
      if (j === undefined) return;
      ev.preventDefault();
      select(tabs[j], true);
    });
    select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);   // panels stay visible if scripts are off
    return { tabs, select };
  });
  function target(id) {
    if (!id) return;
    for (const g of groups) {
      const tab = g.tabs.find((t) => t.id === id);
      if (!tab) continue;
      g.select(tab);
      const sec = tab.closest('section');
      if (sec) sec.scrollIntoView();
      return;
    }
  }
  window.addEventListener('hashchange', () => target(decodeURIComponent(location.hash.slice(1))));
  window.addEventListener('site:target', (ev) => target(ev.detail));
  target(decodeURIComponent(location.hash.slice(1)));

  // ------------------------------------------------------------------------------- 2. home preview
  document.querySelectorAll('[data-cov-demo]').forEach((fig) => {
    const btns = Array.from(fig.querySelectorAll('button[data-mode]'));
    btns.forEach((b) => b.addEventListener('click', () => {
      fig.dataset.mode = b.dataset.mode;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  });
})();
