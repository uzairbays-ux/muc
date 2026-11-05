/* "You may also like" in the cart drawer (snippets/kj-cart-upsell.liquid).
   Products: /recommendations/products.json for the most recently added cart
   line(s), minus what is already in the cart, gifts, and sold-out items.
   Tracking: UTM on the product links; a hidden _added_from line property on
   anything added from here, visible on the order in admin. */
const UTM = 'utm_source=cart_drawer&utm_medium=upsell&utm_campaign=you_may_also_like';
const SOURCE = 'cart-drawer';
const cache = new Map();

const money = (cents) => 'Rs.' + Math.round(cents / 100).toLocaleString('en-PK');
const isGift = (p) => /gift/i.test(p.type || '') || /-foc$|foc-/.test(p.handle);

// intents in order: the first one that returns products wins, so a product
// page can ask for Shopify's "complementary" picks and fall back to "related".
async function recommendationsFor(ids, intents = ['related']) {
  const key = intents.join('+') + ':' + ids.join(',');
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      for (const intent of intents) {
        const seen = new Set();
        const out = [];
        for (const id of ids) {
          try {
            const r = await fetch(`/recommendations/products.json?product_id=${id}&limit=10&intent=${intent}`);
            if (!r.ok) continue;
            for (const p of (await r.json()).products) {
              if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
            }
          } catch (e) { /* no recommendations for this id */ }
          if (out.length >= 10) break;
        }
        if (out.length) return out;
      }
      return [];
    })());
  }
  return cache.get(key);
}

// Empty cart: a collection (bestsellers) instead of recommendations. The
// collection JSON has a different shape, so normalise it to the recommendations one.
async function collectionProducts(handle) {
  const key = 'c:' + handle;
  if (!cache.has(key)) {
    cache.set(key, fetch(`/collections/${handle}/products.json?limit=12`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => d.products.map((p) => {
        const cents = (x) => (x == null ? null : Math.round(parseFloat(x) * 100));
        const variants = p.variants.map((v) => ({ id: v.id, available: v.available, price: cents(v.price) }));
        const first = variants.find((v) => v.available) || variants[0];
        const cap = cents((p.variants.find((v) => v.available) || p.variants[0] || {}).compare_at_price);
        return { id: p.id, handle: p.handle, title: p.title, type: p.product_type, url: '/products/' + p.handle,
          available: variants.some((v) => v.available), price: first ? first.price : 0, compare_at_price: cap || 0,
          featured_image: p.images && p.images[0] ? p.images[0].src : null, variants };
      }))
      .catch(() => []));
  }
  return cache.get(key);
}

class KjCartUpsell extends HTMLElement {
  // The drawer updates by morphing the DOM against the server's HTML, which
  // empties our list and puts `hidden` back without re-inserting the element,
  // so re-render on attribute and child changes, not only on connect.
  static observedAttributes = ['data-source-ids', 'data-in-cart', 'hidden'];

  connectedCallback() {
    this.observer ??= new MutationObserver(() => this.schedule());
    this.observer.observe(this, { childList: true, subtree: true });
    this.schedule();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.schedule();
  }

  schedule() {
    // A timer, not requestAnimationFrame: frames pause in a background tab,
    // which would leave the row empty after a cart update made there.
    if (this.queued) return;
    this.queued = true;
    setTimeout(() => { this.queued = false; this.render(); }, 0);
  }

  async render() {
    const list = this.querySelector('[data-kj-up-list]');
    if (!list || list.children.length) return; // already filled
    const ids = (this.dataset.sourceIds || '').split(',').filter(Boolean);
    const inCart = new Set((this.dataset.inCart || '').split(',').filter(Boolean).map(Number));
    const handle = this.dataset.collection;
    if (!ids.length && !handle) return;
    const intents = (this.dataset.intent || 'related').split(',').filter(Boolean);
    const pool = handle ? await collectionProducts(handle) : await recommendationsFor(ids, intents);
    const products = pool
      .filter((p) => p.available && !inCart.has(p.id) && !isGift(p))
      .slice(0, Number(this.dataset.limit) || (handle ? 8 : 6));
    const target = this.querySelector('[data-kj-up-list]');
    if (!this.isConnected || !target || target.children.length || !products.length) return;
    target.innerHTML = products.map((p) => this.card(p)).join('');
    this.hidden = false;
  }

  card(p) {
    const v = p.variants.find((x) => x.available) || p.variants[0];
    const url = `${p.url}${p.url.includes('?') ? '&' : '?'}${UTM}`; // recommendation urls already carry pr_* params
    const img = p.featured_image ? `<img src="${p.featured_image}${p.featured_image.includes('?') ? '&' : '?'}width=300" alt="" loading="lazy" width="132" height="132">` : '';
    const off = p.compare_at_price > p.price ? `<span class="kj-up__off">${Math.round((1 - p.price / p.compare_at_price) * 100)}% off</span>` : '';
    const price = p.compare_at_price > p.price ? `<s>${money(p.compare_at_price)}</s>${money(p.price)}` : money(p.price);
    const title = p.title.replace(/^[^-]+-\s*/, ''); // drop the "Brand - " prefix, the card is small
    const action = p.variants.length > 1
      ? `<a class="kj-up__btn" href="${url}">Choose</a>`
      : `<button type="button" class="kj-up__btn" data-kj-up-add="${v.id}" data-product-id="${p.id}">Add to Bag</button>`;
    return `<li class="kj-up__item">
      <a class="kj-up__link" href="${url}">
        <span class="kj-up__img">${img}${off}</span>
        <span class="kj-up__title">${title.replace(/</g, '&lt;')}</span>
        <span class="kj-up__price">${price}</span>
      </a>${action}</li>`;
  }
}

if (!customElements.get('kj-cart-upsell')) customElements.define('kj-cart-upsell', KjCartUpsell);

// One delegated handler: the drawer is re-rendered via innerHTML on every cart change.
if (!window.__kjCartUpsell) {
  window.__kjCartUpsell = true;
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-kj-up-add]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Adding…';
    const sections = [...document.querySelectorAll('cart-items-component[data-section-id]')].map((el) => el.dataset.sectionId);
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: [{ id: Number(btn.dataset.kjUpAdd), quantity: 1, properties: { _added_from: btn.closest('kj-cart-upsell')?.dataset.source || SOURCE } }],
          sections: sections.join(','),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || 'Could not add');
      const cart = await fetch('/cart.js').then((r) => r.json());
      const ev = new Event('cart:update', { bubbles: true });
      ev.detail = { resource: cart, sourceId: btn.dataset.kjUpAdd, data: { source: 'kj-cart-upsell', itemCount: 1, productId: btn.dataset.productId, variantId: btn.dataset.kjUpAdd, sections: data.sections } };
      btn.dispatchEvent(ev);
    } catch (err) {
      console.error('[kj-cart-upsell]', err);
      btn.textContent = 'Sold out';
      setTimeout(() => { btn.textContent = 'Add to Bag'; btn.disabled = false; }, 2500);
    }
  });
}
