(function () {
  'use strict';

  /* ─── CSS injected once ─────────────────────────────────────── */
  const CSS = `
    @media (max-width: 749px) {
      .product-grid { padding: 6px; }
    }

    @media (max-width: 749px) {

      /* ── Lock the drawer scroll so only content-area scrolls ── */
      .mmt-transformed .menu-drawer {
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }

      .mmt-transformed .menu-drawer__navigation {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      /* Hide original vertical list */
      .mmt-transformed .menu-drawer__menu.has-submenu {
        display: none !important;
      }

      /* ── Tab bar — flex, no scroll itself ── */
      .mmt-tab-bar {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        border-bottom: 1.5px solid rgba(0,0,0,0.1);
        padding: 8px 12px;
        gap: 8px;
        background: var(--color-background, #fff);
      }
      .mmt-tab-bar::-webkit-scrollbar { display: none; }

      /* ── Tab pill ── */
      .mmt-tab {
        flex: 0 0 auto;
        padding: 7px 7px;
        border: none;
        border-radius: 5px;
        background: transparent;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(0,0,0,0.45);
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.18s, color 0.18s;
      }

      /* Active tab: filled dark pill */
      .mmt-tab.is-active {
        background: rgb(0,0,0);
        color: #fff;
      }

      /* ── Content area — the ONLY scrolling container ── */
      .mmt-content-area {
        flex: 1 1 auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        min-height: 0;
      }

      /* ── Panel fade-in ── */
      .mmt-panel {
        padding: 0;
        animation: mmt-fade-in 0.15s ease;
      }

      @keyframes mmt-fade-in {
        from { opacity: 0; transform: translateY(3px); }
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

      /* ── Child row (replaces old .mmt-child-link) ── */
      .mmt-child-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background 0.12s;
      }
      .mmt-child-row:hover,
      .mmt-child-row:active { background: rgba(0,0,0,0.04); }

      /* ── Thumbnail ── */
      .mmt-child-img {
        width: 48px;
        height: 48px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
        background: rgba(0,0,0,0.06);
      }
      .mmt-child-img--placeholder {
        display: none;
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
      .mmt-child-text::first-letter { text-transform: uppercase; }
      .mmt-child-text--link {
        text-decoration: none;
        color: inherit;
      }

      /* ── Chevron (+ / −) ── */
      .mmt-child-chevron {
        flex-shrink: 0;
        font-size: 18px;
        font-weight: 300;
        color: rgba(0,0,0,0.4);
        line-height: 1;
        transition: transform 0.2s;
        user-select: none;
      }

      /* ── Grandchildren accordion list ── */
      .mmt-grand-list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: rgba(0,0,0,0.03);
      }

      .mmt-grand-item {
        border-top: 1px solid rgba(0,0,0,0.06);
      }

      .mmt-grand-link {
        display: block;
        padding: 10px 20px 10px 82px;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.02em;
        text-transform: lowercase;
        color: rgba(0,0,0,0.7);
        text-decoration: none;
        transition: background 0.12s;
      }
      .mmt-grand-link::first-letter { text-transform: uppercase; }
      .mmt-grand-link:hover,
      .mmt-grand-link:active { background: rgba(0,0,0,0.06); }

      /* ── Product grid (panels with no child nav links) ── */
      .mmt-product-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 16px;
      }

      .mmt-product-card {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        gap: 6px;
      }

      .mmt-product-card img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 8px;
        background: rgba(0,0,0,0.05);
      }

      .mmt-product-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .mmt-product-title {
        font-size: 11px;
        font-weight: 500;
        color: rgb(0,0,0);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.3;
      }

      .mmt-product-price {
        font-size: 11px;
        color: rgba(0,0,0,0.55);
        font-weight: 600;
      }

      /* ── Direct link (top-level with no children) ── */
      .mmt-direct-link {
        display: block;
        padding: 18px 20px;
        font-size: 14px;
        font-weight: 600;
        color: inherit;
        text-decoration: none;
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
    /* Guard: tab bar already in place means we're done */
    if (drawer.querySelector('.mmt-tab-bar')) return;

    const nav     = drawer.querySelector('.menu-drawer__navigation');
    const topList = drawer.querySelector('.menu-drawer__menu.has-submenu');
    if (!nav || !topList) return;

    const topItems = Array.from(topList.querySelectorAll(':scope > li'));
    if (!topItems.length) return;

    /* Clear any leftover state from a previous (morph-undone) transform */
    drawer.classList.remove('mmt-transformed');
    nav.querySelectorAll('.mmt-tab-bar, .mmt-content-area').forEach(function (el) { el.remove(); });

    /* Build tab bar */
    const tabBar = document.createElement('div');
    tabBar.className = 'mmt-tab-bar';
    tabBar.setAttribute('role', 'tablist');

    /* Build content area */
    const contentArea = document.createElement('div');
    contentArea.className = 'mmt-content-area';

    topItems.forEach(function (item, i) {
      /* ── Resolve title & href for this top-level item ── */
      const directA   = item.querySelector(':scope > a');
      const summaryEl = item.querySelector(':scope > details > summary, :scope > accordion-custom > details > summary');
      const titleEl   = directA || summaryEl;
      const title     = titleEl
        ? (titleEl.querySelector('.menu-drawer__menu-item-text') || titleEl).textContent.trim()
        : item.textContent.slice(0, 30).trim();
      /* href: prefer direct <a>, then data-url on summary (accordion items), else '#' */
      const href = directA
        ? directA.href
        : (summaryEl && summaryEl.dataset.url ? summaryEl.dataset.url : '#');

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
      shopAll.href = href;
      shopAll.className = 'mmt-shop-all';
      shopAll.textContent = 'shop all ' + title.toLowerCase();
      panel.appendChild(shopAll);

      /* Child items — handles 2-level (flat/accordion) and 3-level (push-panel) structures */
      var directChildList = item.querySelector(
        ':scope > ul, ' +
        ':scope > details > ul, ' +
        ':scope > accordion-custom > details > ul, ' +
        ':scope > details .menu-drawer__menu--childlist'
      );
      var childLis = directChildList ? Array.from(directChildList.querySelectorAll(':scope > li')) : [];
      if (childLis.length) {
        var ul = document.createElement('ul');
        ul.className = 'mmt-child-list';
        ul.setAttribute('role', 'list');

        childLis.forEach(function (child) {
          var childA = child.querySelector(':scope > a, :scope > details > summary a, :scope > accordion-custom > details > summary a');
          if (!childA) return;

          /* Collect grandchildren */
          var grandList = child.querySelector(
            ':scope > ul, ' +
            ':scope > details > ul, ' +
            ':scope > accordion-custom > details > ul, ' +
            ':scope > details .menu-drawer__menu--childlist'
          );
          var grandLis  = grandList ? Array.from(grandList.querySelectorAll(':scope > li')) : [];

          var li = document.createElement('li');
          li.className = 'mmt-child-item';

          /* Row: thumbnail + label + toggle icon */
          var row = document.createElement('div');
          row.className = 'mmt-child-row';

          if (grandLis.length) {
            /* Make the whole row a button-style toggle */
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-expanded', 'false');
          }

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
          row.appendChild(thumb);

          /* Label — link if no grandchildren, span if accordion */
          var textNode = childA.querySelector('.menu-drawer__menu-item-text');
          var labelText = (textNode ? textNode.textContent : childA.textContent).trim();

          if (grandLis.length) {
            var label = document.createElement('span');
            label.className = 'mmt-child-text';
            label.textContent = labelText;
            row.appendChild(label);

            var chevron = document.createElement('span');
            chevron.className = 'mmt-child-chevron';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.textContent = '+';
            row.appendChild(chevron);
          } else {
            var rowLink = document.createElement('a');
            rowLink.href = childA.href;
            rowLink.className = 'mmt-child-text mmt-child-text--link';
            rowLink.textContent = labelText;
            row.appendChild(rowLink);
          }

          li.appendChild(row);

          /* Grandchildren accordion panel */
          if (grandLis.length) {
            var grandUl = document.createElement('ul');
            grandUl.className = 'mmt-grand-list';
            grandUl.hidden = true;

            grandLis.forEach(function (grand) {
              var grandA = grand.querySelector('a');
              if (!grandA) return;
              var gLi = document.createElement('li');
              gLi.className = 'mmt-grand-item';
              var gLink = document.createElement('a');
              gLink.href = grandA.href;
              gLink.className = 'mmt-grand-link';
              var gTextNode = grandA.querySelector('.menu-drawer__menu-item-text');
              gLink.textContent = (gTextNode ? gTextNode.textContent : grandA.textContent).trim();
              gLi.appendChild(gLink);
              grandUl.appendChild(gLi);
            });

            li.appendChild(grandUl);

            /* Toggle accordion on row click */
            row.addEventListener('click', function () {
              var isOpen = grandUl.hidden === false;
              grandUl.hidden = isOpen;
              chevron.textContent = isOpen ? '+' : '−';
              row.setAttribute('aria-expanded', String(!isOpen));
            });
            row.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
            });
          }

          ul.appendChild(li);
        });
        panel.appendChild(ul);
      } else {
        /* No child nav links — fetch 8 products from the featured collection */
        var grid = document.createElement('div');
        grid.className = 'mmt-product-grid';
        panel.appendChild(grid);

        fetch('/products.json?collection_id=473827148012&limit=8&sort_by=best-selling')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var products = (data.products || []).slice(0, 8);
            if (!products.length) { grid.remove(); return; }
            products.forEach(function (product) {
              var card = document.createElement('a');
              card.href = '/products/' + product.handle;
              card.className = 'mmt-product-card';

              var imgEl = document.createElement('img');
              var imgSrc = product.images[0] ? product.images[0].src : '';
              imgEl.src = imgSrc.replace(/(\.(jpg|jpeg|png|gif|webp))(\?.*)?$/i, '_300x300$1$3');
              imgEl.alt = product.title;
              imgEl.loading = 'lazy';
              card.appendChild(imgEl);

              var info = document.createElement('div');
              info.className = 'mmt-product-info';

              var titleEl = document.createElement('span');
              titleEl.className = 'mmt-product-title';
              titleEl.textContent = product.title;
              info.appendChild(titleEl);

              var priceEl = document.createElement('span');
              priceEl.className = 'mmt-product-price';
              var raw = parseFloat(product.variants[0].price);
              priceEl.textContent = 'Rs. ' + Math.round(raw).toLocaleString();
              info.appendChild(priceEl);

              card.appendChild(info);
              grid.appendChild(card);
            });
          })
          .catch(function () {});
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

  /* ─── Init ──────────────────────────────────────────────────── */
  function init() {
    injectCSS();

    function tryTransform(drawer) {
      if (window.innerWidth > 749) return;
      transformDrawer(drawer);

      /* Keep a permanent observer on this drawer.
         Catches two cases:
         1. Menu content not yet in DOM at DOMContentLoaded (hydration arrives later)
         2. Shopify's morph/hydration undoes our transform — re-run it. */
      if (!drawer._mmtObserved) {
        drawer._mmtObserved = true;
        new MutationObserver(function () {
          if (window.innerWidth > 749) return;
          transformDrawer(drawer);
        }).observe(drawer, { childList: true, subtree: true });
      }
    }

    document.querySelectorAll('header-drawer').forEach(tryTransform);

    /* Catch drawers added later (theme editor full section swap) */
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
