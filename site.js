/* site.js · behaviour shared by the portfolio page (loaded after kit.js, before the projects' own scripts).
   1. Projects: index.html holds both cases as [data-project] sections. The case cards on the first screen (.pick) and
      the compact bar shown after them (.proj-nav) show one at a time and set the address: /#edd, /#prci. Any other #id (#demo, #review, #ai-brief, #dashboard-shipping …) opens the
      project that contains it and scrolls there. Works with copy-paste, refresh, and back/forward.
   2. Dashboard tabs inside a case: each [data-dash] holds a role="tablist"; arrow keys, Home and End move between tabs.
      A tab's id in the address opens that tab.
   3. Sticky header: measures the top bar and the project tabs, so anything scrolled into view lands below them
      (CSS reads --head-h and --stick). */
(function () {
  'use strict';
  const root = document.documentElement;

  // ------------------------------------------------------------------------------- 2. dashboard tabs
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
  function openTab(id) {   // a dashboard tab's id: select it and scroll to its section; false if id is not a tab
    for (const g of groups) {
      const tab = g.tabs.find((t) => t.id === id);
      if (!tab) continue;
      g.select(tab);
      const sec = tab.closest('section');
      if (sec) sec.scrollIntoView();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------------------- 3. sticky header
  const head = document.querySelector('.topbar'), nav = document.querySelector('.proj-nav'), cards = document.querySelector('.pick-wrap');
  function measure() {   // the compact bar is fixed and counted in: anything scrolled to lands below it
    const h = head && getComputedStyle(head).position === 'sticky' ? head.offsetHeight : 0;
    root.style.setProperty('--head-h', h + 'px');
    root.style.setProperty('--stick', (h + (nav ? nav.offsetHeight : 0) + 12) + 'px');
  }
  // show the compact bar only once the case cards have scrolled out of view
  if (nav && cards && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { root.setAttribute('data-bar', es[0].isIntersecting ? 'off' : 'on'); }, { rootMargin: '-80px 0px 0px 0px' }).observe(cards);
  } else if (nav) root.setAttribute('data-bar', 'on');
  measure();
  window.addEventListener('resize', measure);
  if (typeof Kit !== 'undefined') Kit.onLang(measure);

  // ------------------------------------------------------------------------------- 1. projects
  const projects = Array.from(document.querySelectorAll('[data-project]'));
  const keys = projects.map((p) => p.dataset.project);
  const links = Array.from(document.querySelectorAll('[data-proj]'));
  const projectOf = (id) => {   // a project key, an id inside a project, or an id on a project's card
    if (keys.includes(id)) return id;
    const el = id ? document.getElementById(id) : null;
    const p = el && (el.closest('[data-project]') || el.closest('[data-pick]'));
    return p ? p.dataset.project || p.dataset.pick : null;
  };
  function setTitle() {
    const p = projects.find((x) => x.dataset.project === root.getAttribute('data-proj'));
    if (p) document.title = root.getAttribute('data-lang') === 'en' ? p.dataset.titleEn : p.dataset.titleZh;
  }
  function setProject(k) {
    root.setAttribute('data-proj', k);
    links.forEach((a) => { if (a.dataset.proj === k) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('[data-pick]').forEach((c) => c.toggleAttribute('data-on', c.dataset.pick === k));
    setTitle();
  }
  // Show the project that holds `id` (or the default one) and scroll. A project key: to the top of the page on a load or
  // a history step (the cards show which project is open), to the start of the project on a click. Else to the element.
  function go(id, how) {
    if (!projects.length) { if (id && !openTab(id)) { const el = document.getElementById(id); if (el) el.scrollIntoView(); } return; }
    const k = projectOf(id) || keys[0];
    setProject(k);
    if (keys.includes(id) && how === 'click') { document.getElementById('project-' + k).scrollIntoView(); return; }
    if (!id || keys.includes(id) || !document.getElementById(id)) { window.scrollTo(0, 0); return; }
    if (!openTab(id)) document.getElementById(id).scrollIntoView();
    window.dispatchEvent(new CustomEvent('site:target', { detail: id }));   // e.g. #demo starts the EDD demo
  }
  const fromHash = () => decodeURIComponent(location.hash.slice(1));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Same-page links are handled here: the address changes (so it can be shared) and the right project is shown.
  // Scripts that handle their own links call preventDefault first and are left alone.
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!keys.includes(id) && !document.getElementById(id)) return;
    ev.preventDefault();
    try { if (location.hash === '#' + id) history.replaceState(null, '', '#' + id); else history.pushState(null, '', '#' + id); } catch (e) { /* a previewer without history: fine */ }
    go(id, 'click');
  });
  window.addEventListener('popstate', () => go(fromHash()));
  window.addEventListener('hashchange', () => go(fromHash()));
  if (typeof Kit !== 'undefined') Kit.onLang(setTitle);
  // for the projects' own scripts: open a project without scrolling (a demo then scrolls to its own card)
  window.SiteNav = {
    current: () => root.getAttribute('data-proj'),
    show(k) {
      if (!keys.includes(k) || root.getAttribute('data-proj') === k) return;
      setProject(k);
      try { history.pushState(null, '', '#' + k); } catch (e) { /* no history in this previewer */ }
    },
  };
  go(fromHash(), 'load');
})();
