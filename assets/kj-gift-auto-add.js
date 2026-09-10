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
 * - Cart requests retry with backoff. On pages with many product cards the
 *   theme fires one /cart.js per card on every cart update, which can get the
 *   storefront throttled; a gift left behind on a cart that no longer
 *   qualifies would be charged at full price.
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

const key = (kind, token, rule) => `kj-gift-${kind}:${token}:${rule.id}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch JSON, retrying throttled (429), server-error and non-JSON responses.
 * Other 4xx responses are returned as-is so the caller can react (e.g. the
 * gift sold out). Resolves to { ok, status, data }.
 */
async function requestJSON(url, options = {}, attempts = 4) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
    try {
      const response = await fetch(url, {
        ...options,
        headers: { Accept: 'application/json', ...(options.headers || {}) },
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        lastError = new Error(`Non-JSON response (HTTP ${response.status})`);
        continue;
      }
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Request failed');
}

let running = false;
let rerun = false;
let timer = null;

function schedule(delay = 150) {
  clearTimeout(timer);
  timer = setTimeout(sync, delay);
}

function giftQuantities(items) {
  const qty = {};
  for (const item of items) {
    if (giftVariantIds.has(item.variant_id)) qty[item.variant_id] = (qty[item.variant_id] || 0) + item.quantity;
  }
  return qty;
}

async function sync() {
  if (!rules.length) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;

  try {
    const { data: cart } = await requestJSON('/cart.js');
    const token = cart.token || 'no-token';

    const giftQty = giftQuantities(cart.items);
    const triggerQty = {};
    for (const rule of rules) triggerQty[rule.id] = 0;
    for (const item of cart.items) {
      if (giftVariantIds.has(item.variant_id)) continue;
      for (const rule of rules) {
        if (rule.triggers.has(item.product_id)) triggerQty[rule.id] += item.quantity;
      }
    }

    // A removal only counts as the shopper's choice when the previous sync saw
    // a qualifying cart that held the gift, and the cart still qualifies now.
    // Anything else (gift removed because the cart stopped qualifying, a new
    // cart, a failed request) must not block the gift from coming back.
    for (const rule of rules) {
      const qualifies = triggerQty[rule.id] >= rule.requiredQty;
      const have = giftQty[rule.giftVariantId] || 0;
      if (qualifies && store.get(key('had', token, rule)) === '1' && have === 0) {
        store.set(key('declined', token, rule), triggerQty[rule.id]);
      }
      if (!qualifies) store.set(key('declined', token, rule), null);
    }

    // Only one non-combinable discount applies, so keep only the best gift.
    let winner = null;
    for (const rule of rules) {
      if (triggerQty[rule.id] < rule.requiredQty) continue;
      const declined = store.get(key('declined', token, rule));
      if (declined !== null && triggerQty[rule.id] <= Number(declined)) continue;
      if (store.get(key('failed', token, rule))) continue;
      if (!winner || rule.giftValue > winner.giftValue) winner = rule;
    }

    const updates = {};
    for (const rule of rules) {
      const have = giftQty[rule.giftVariantId] || 0;
      const want = winner === rule ? 1 : 0;
      if (have !== want) updates[rule.giftVariantId] = want;
    }

    let finalQty = giftQty;
    if (Object.keys(updates).length) {
      const result = await requestJSON('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!result.ok) {
        // A 4xx here is usually the gift selling out. Stop retrying it for
        // this cart; removals never fail this way.
        if (winner && updates[winner.giftVariantId] === 1) store.set(key('failed', token, winner), 1);
      } else {
        finalQty = giftQuantities(result.data.items);
        refreshCartUI(result.data);
      }
    }

    // Remember what this sync ended with, for the next removal check.
    for (const rule of rules) {
      const qualifies = triggerQty[rule.id] >= rule.requiredQty;
      store.set(key('had', token, rule), qualifies && (finalQty[rule.giftVariantId] || 0) > 0 ? 1 : null);
    }
  } catch (error) {
    // Every retry failed (storefront still throttled). Try again shortly
    // rather than leaving a gift the cart no longer qualifies for.
    console.error('[kj-gift]', error);
    rerun = true;
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      schedule(2000);
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

document.addEventListener('cart:update', () => schedule());
// Re-check when the shopper comes back to the tab or via the back button, so a
// sync that lost a throttled request gets another chance before checkout.
window.addEventListener('pageshow', () => schedule());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') schedule();
});
sync();
