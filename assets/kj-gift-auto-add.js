/**
 * Gift-with-purchase auto-add.
 *
 * Rules come from snippets/kj-gift-rules.liquid (JSON in #kj-gift-rules) and
 * mirror automatic BXGY discounts in Shopify admin. The discount makes the
 * gift free; this script only puts the gift in the cart (and takes it out
 * again), because Shopify never adds a BXGY "get" item on its own.
 *
 * - Gift lines never count toward a trigger, otherwise a gift that sits in its
 *   own trigger collection would keep itself in the cart.
 * - The promos are non-combinable, so Shopify discounts only one gift per
 *   order. When several rules qualify, only the most valuable gift is kept.
 * - It never dispatches cart:update. The drawer opens on that event, and this
 *   script listens to it, so dispatching would both pop the drawer on page
 *   load and risk re-entering itself. The cart section is re-rendered directly.
 * - If the shopper removes a gift, it is not forced back until they add more
 *   qualifying items.
 */
import { sectionRenderer } from '@theme/section-renderer';

const config = (() => {
  try {
    return JSON.parse(document.getElementById('kj-gift-rules')?.textContent || '{}');
  } catch (e) {
    return {};
  }
})();

const rules = (config.rules || []).map((rule) => ({
  ...rule,
  triggers: new Set(rule.triggerProductIds || []),
}));
const giftVariantIds = new Set(rules.map((rule) => rule.giftVariantId));

const store = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, String(value));
    } catch (e) {}
  },
};

let running = false;
let rerun = false;
let timer = null;

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(sync, 150);
}

async function sync() {
  if (!rules.length) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;

  try {
    const cart = await fetch('/cart.js', { headers: { Accept: 'application/json' } }).then((r) => r.json());
    const token = cart.token || 'no-token';

    const giftQty = {};
    const triggerQty = {};
    for (const rule of rules) triggerQty[rule.id] = 0;

    for (const item of cart.items) {
      if (giftVariantIds.has(item.variant_id)) {
        giftQty[item.variant_id] = (giftQty[item.variant_id] || 0) + item.quantity;
        continue;
      }
      for (const rule of rules) {
        if (rule.triggers.has(item.product_id)) triggerQty[rule.id] += item.quantity;
      }
    }

    // Only one non-combinable discount applies, so keep only the best gift.
    let winner = null;
    for (const rule of rules) {
      if (triggerQty[rule.id] < rule.requiredQty) continue;
      const declinedAt = Number(store.get(`kj-gift-declined:${token}:${rule.id}`) || -1);
      if (triggerQty[rule.id] <= declinedAt) continue;
      if (store.get(`kj-gift-failed:${token}:${rule.id}`)) continue;
      if (!winner || rule.giftValue > winner.giftValue) winner = rule;
    }

    const updates = {};
    for (const rule of rules) {
      const have = giftQty[rule.giftVariantId] || 0;
      const addedKey = `kj-gift-added:${token}:${rule.id}`;
      const qualifies = triggerQty[rule.id] >= rule.requiredQty;

      // We added it earlier, it is gone, and the cart still qualifies: the
      // shopper removed it on purpose, so remember that.
      if (have === 0 && store.get(addedKey) && qualifies) {
        store.set(`kj-gift-declined:${token}:${rule.id}`, triggerQty[rule.id]);
        store.set(addedKey, null);
        if (winner === rule) winner = null;
      }

      const want = winner === rule ? 1 : 0;
      if (have !== want) updates[rule.giftVariantId] = want;
      if (!qualifies) store.set(`kj-gift-declined:${token}:${rule.id}`, null);
    }

    if (!Object.keys(updates).length) return;

    const response = await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      // Usually the gift sold out. Stop retrying it for this cart.
      if (winner && updates[winner.giftVariantId] === 1) {
        store.set(`kj-gift-failed:${token}:${winner.id}`, 1);
      }
      return;
    }

    const updated = await response.json();
    for (const rule of rules) {
      if (updates[rule.giftVariantId] === 1) store.set(`kj-gift-added:${token}:${rule.id}`, 1);
      if (updates[rule.giftVariantId] === 0) store.set(`kj-gift-added:${token}:${rule.id}`, null);
    }

    refreshCartUI(updated);
  } catch (error) {
    console.error('[kj-gift]', error);
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      schedule();
    }
  }
}

function refreshCartUI(cart) {
  for (const el of document.querySelectorAll('cart-items-component[data-section-id]')) {
    sectionRenderer.renderSection(el.dataset.sectionId, { cache: false });
  }
  for (const icon of document.querySelectorAll('cart-icon')) {
    if (typeof icon.renderCartBubble === 'function') icon.renderCartBubble(cart.item_count, false, false);
  }
}

document.addEventListener('cart:update', schedule);
sync();
