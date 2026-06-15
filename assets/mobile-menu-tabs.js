(function () {
  'use strict';

  /* ─── CSS injected once ─────────────────────────────────────── */
  const CSS = `
    /* Only activate on mobile */
    @media (max-width: 749px) {

      /* Hide the original vertical list after transform */
      .mmt-transformed .menu-drawer__menu.has-submenu {
        display: none !important;
      }

      /* ── Tab bar ── */
      .mmt-tab-bar {
        display: flex;
        align-items: center;
        gap: 0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        border-bottom: 1.5px solid rgba(0,0,0,0.1);
        padding: 0;
        background: inherit;
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--color-background, #fff);
      }
      .mmt-tab-bar::-webkit-scrollbar { display: none; }

      .mmt-tab {
        flex: 0 0 auto;
        padding: 14px 16px;
        border: none;
        background: none;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(0,0,0,0.45);
        cursor: pointer;
        white-space: nowrap;
        border-bottom: 2.5px solid transparent;
        margin-bottom: -1.5px;
        transition: color 0.15s, border-color 0.15s;
      }

      .mmt-tab.is-active {
        color: rgb(0,0,0);
        border-bottom-color: currentColor;
      }

      /* ── Content area ── */
      .mmt-content-area {
        overflow-y: auto;
        flex: 1 1 auto;
      }

      /* ── Panel ── */
      .mmt-panel {
        padding: 0;
        animation: mmt-fade-in 0.18s ease;
      }

      @keyframes mmt-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── Shop all link ── */
      .mmt-shop-all {
        display: block;
        padding: 14px 20px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(0,0,0,0.5);
        text-decoration: none;
        letter-spacing: 0.02em;
        border-bottom: 1px solid rgba(0,0,0,0.08);
      }

      .mmt-shop-all:hover { color: rgba(0,0,0,0.9); }

      /* ── Child list ── */
      .mmt-child-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .mmt-child-item {
        border-bottom: 1px solid rgba(0,0,0,0.08);
      }

      .mmt-child-link {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 20px;
        text-decoration: none;
        color: inherit;
        transition: background 0.12s;
      }

      .mmt-child-link:hover,
      .mmt-child-link:active {
        background: rgba(0,0,0,0.04);
      }

      /* ── Thumbnail ── */
      .mmt-child-img {
        width: 48px;
        height: 48px;
        border-radius: 4px;
        object-fit: cover;
        flex-shrink: 0;
        background: rgba(0,0,0,0.06);
      }

      .mmt-child-img--placeholder {
        display: inline-block;
        background: rgba(0,0,0,0.06);
      }

      /* ── Child label ── */
      .mmt-child-text {
        flex: 1 1 auto;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.01em;
        color: rgb(0,0,0);
        text-transform: lowercase;
      }

      .mmt-child-text::first-letter {
        text-transform: uppercase;
      }

      /* ── Plus indicator ── */
      .mmt-child-plus {
        flex-shrink: 0;
        font-size: 16px;
        font-weight: 300;
        color: rgba(0,0,0,0.4);
        line-height: 1;
      }

      /* ── Direct link (no children) ── */
      .mmt-direct-link {
        display: block;
        padding: 18px 20px;
        font-size: 14px;
        font-weight: 600;
        color: inherit;
        text-decoration: none;
      }

      /* make the nav flex so tab-bar stays sticky */
      .mmt-transformed .menu-drawer__navigation {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
    }
  `;

  function injectCSS() {
    if (document.getElementById('mobile-menu-tabs-css')) return;
    const style = document.createElement('style');
    style.id = 'mobile-menu-tabs-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ─── Transform a single drawer ────────────────────────────── */
  function transformDrawer(drawer) {
    if (drawer._mmtDone) return;

    const nav     = drawer.querySelector('.menu-drawer__navigation');
    const topList = drawer.querySelector('.menu-drawer__menu.has-submenu');
    if (!nav || !topList) return;

    const topItems = Array.from(topList.querySelectorAll(':scope > li'));
    if (!topItems.length) return;

    drawer._mmtDone = true;

    /* Build tab bar */
    const tabBar = document.createElement('div');
    tabBar.className = 'mmt-tab-bar';
    tabBar.setAttribute('role', 'tablist');

    /* Build content area */
    const contentArea = document.createElement('div');
    contentArea.className = 'mmt-content-area';

    topItems.forEach(function (item, i) {
      /* ── Resolve title & href for this top-level item ── */
      const directA  = item.querySelector(':scope > a');
      const summaryEl = item.querySelector(':scope > details > summary, :scope > accordion-custom-component > details > summary');
      const titleEl  = directA || summaryEl;
      const title    = titleEl
        ? (titleEl.querySelector('.menu-drawer__menu-item-text') || titleEl).textContent.trim()
        : item.textContent.slice(0, 30).trim();
      const href     = directA ? directA.href : '#';

      /* ── Tab button ── */
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'mmt-tab' + (i === 0 ? ' is-active' : '');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      tab.setAttribute('data-mmt-index', i);
      tab.textContent = title;
      tabBar.appendChild(tab);

      /* ── Panel ── */
      var panel = document.createElement('div');
      panel.className = 'mmt-panel';
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = i !== 0;

      /* "Shop all X" link */
      var shopAll = document.createElement('a');
      shopAll.href = href !== '#' ? href : '#';
      shopAll.className = 'mmt-shop-all';
      shopAll.textContent = 'shop all ' + title.toLowerCase();
      panel.appendChild(shopAll);

      /* Child items */
      var childLis = item.querySelectorAll('ul li, details ul li');
      if (childLis.length) {
        var ul = document.createElement('ul');
        ul.className = 'mmt-child-list';
        ul.setAttribute('role', 'list');

        childLis.forEach(function (child) {
          var childA = child.querySelector('a');
          if (!childA) return;

          var li = document.createElement('li');
          li.className = 'mmt-child-item';

          var a = document.createElement('a');
          a.href = childA.href;
          a.className = 'mmt-child-link';

          /* Thumbnail */
          var img = child.querySelector('img');
          var thumb;
          if (img) {
            thumb = document.createElement('img');
            thumb.src = img.src;
            if (img.srcset) thumb.srcset = img.srcset;
            thumb.alt = img.alt || '';
            thumb.width = 48;
            thumb.height = 48;
            thumb.loading = 'lazy';
          } else {
            thumb = document.createElement('span');
          }
          thumb.className = 'mmt-child-img' + (img ? '' : ' mmt-child-img--placeholder');
          a.appendChild(thumb);

          /* Label */
          var textNode = childA.querySelector('.menu-drawer__menu-item-text');
          var label = document.createElement('span');
          label.className = 'mmt-child-text';
          label.textContent = (textNode ? textNode.textContent : childA.textContent).trim();
          a.appendChild(label);

          /* Plus if has grandchildren */
          var hasGrand = child.querySelector('details, ul ul');
          if (hasGrand) {
            var plus = document.createElement('span');
            plus.className = 'mmt-child-plus';
            plus.setAttribute('aria-hidden', 'true');
            plus.textContent = '+';
            a.appendChild(plus);
          }

          li.appendChild(a);
          ul.appendChild(li);
        });
        panel.appendChild(ul);
      }

      contentArea.appendChild(panel);

      /* Tab click */
      tab.addEventListener('click', function () {
        tabBar.querySelectorAll('.mmt-tab').forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        contentArea.querySelectorAll('.mmt-panel').forEach(function (p) {
          p.hidden = true;
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        panel.hidden = false;
      });
    });

    /* Insert before the original list */
    nav.insertBefore(tabBar, topList);
    nav.insertBefore(contentArea, topList);

    /* Mark drawer as transformed so CSS kicks in */
    drawer.classList.add('mmt-transformed');
  }

  /* ─── Watch for drawers & their open state ─────────────────── */
  function init() {
    injectCSS();

    function tryTransform(drawer) {
      /* Only run on mobile viewports */
      if (window.innerWidth > 749) return;
      var details = drawer.querySelector('[ref="details"], details.menu-drawer-container');
      if (!details) return;

      var mo = new MutationObserver(function () {
        if (details.hasAttribute('open')) transformDrawer(drawer);
      });
      mo.observe(details, { attributes: true, attributeFilter: ['open'] });

      /* Already open */
      if (details.hasAttribute('open')) transformDrawer(drawer);
    }

    document.querySelectorAll('header-drawer').forEach(tryTransform);

    /* Catch drawers added later (theme editor / section rendering) */
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'HEADER-DRAWER') tryTransform(node);
          node.querySelectorAll && node.querySelectorAll('header-drawer').forEach(tryTransform);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
