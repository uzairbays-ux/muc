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
 * - The cart can change while a sync is in flight (reads are slow on pages
 *   where the theme fires one /cart.js per product card). Every write returns
 *   the live cart, so the sync re-plans from that response until nothing is
 *   left to change; a gift added from a stale read is removed again at once.
 */
import { sectionRenderer } from '@theme/section-renderer';

// Generous on purpose: Shopify serializes a session's cart requests, and on a
// collection page the theme fires one /cart.js per product card on every cart
// update. A normal ~0.6s read measured 18-19s queued behind that burst, so a
// short timeout would abort requests that were going to succeed.
const REQUEST_TIMEOUT_MS = 30000;
const MAX_PASSES = 4;

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
 * Fetch JSON with a timeout, retrying throttled (429), server-error, non-JSON
 * and timed-out responses. Other 4xx responses are returned so the caller can
 * react (e.g. the gift sold out). Resolves to { ok, status, data }.
 */
async function requestJSON(url, options = {}, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await sleep(400 * 2 ** (attempt - 1) + Math.random() * 200);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(options.headers || {}) },
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      try {
        return { ok: response.ok, status: response.status, data: JSON.parse(text) };
      } catch (e) {
        lastError = new Error(`Non-JSON response (HTTP ${response.status})`);
      }
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Request failed');
}

function giftQuantities(items) {
  const qty = {};
  for (const item of items) {
    if (giftVariantIds.has(item.variant_id)) qty[item.variant_id] = (qty[item.variant_id] || 0) + item.quantity;
  }
  return qty;
}

function triggerQuantities(items) {
  const qty = {};
  for (const rule of rules) qty[rule.id] = 0;
  for (const item of items) {
    if (giftVariantIds.has(item.variant_id)) continue;
    for (const rule of rules) {
      if (rule.triggers.has(item.product_id)) qty[rule.id] += item.quantity;
    }
  }
  return qty;
}

/**
 * Work out the gift changes a cart needs. `detectDecline` is only true for a
 * cart observed from outside (a fresh read or a theme event): a gift missing
 * from the response to our own write is not the shopper removing it.
 */
function plan(cart, detectDecline) {
  const token = cart.token || 'no-token';
  const giftQty = giftQuantities(cart.items);
  const triggerQty = triggerQuantities(cart.items);

  for (const rule of rules) {
    const qualifies = triggerQty[rule.id] >= rule.requiredQty;
    const have = giftQty[rule.giftVariantId] || 0;
    if (detectDecline && qualifies && store.get(key('had', token, rule)) === '1' && have === 0) {
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

  return { token, winner, updates, giftQty, triggerQty };
}

function remember({ token, giftQty, triggerQty }) {
  for (const rule of rules) {
    const qualifies = triggerQty[rule.id] >= rule.requiredQty;
    store.set(key('had', token, rule), qualifies && (giftQty[rule.giftVariantId] || 0) > 0 ? 1 : null);
  }
}

let running = false;
let rerun = false;
let pendingCart = null;
let timer = null;

function schedule(delay = 150) {
  clearTimeout(timer);
  timer = setTimeout(sync, delay);
}

async function sync() {
  if (!rules.length) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  let failed = false;

  try {
    // A theme cart event already carries the fresh cart; skip the slow read.
    let cart = pendingCart;
    pendingCart = null;
    if (!cart) cart = (await requestJSON('/cart.js')).data;

    let observed = true;
    let changedCart = null;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const next = plan(cart, observed);
      if (!Object.keys(next.updates).length) {
        remember(next);
        break;
      }

      const result = await requestJSON('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: next.updates }),
      });

      if (!result.ok) {
        // A 4xx here is usually the gift selling out. Stop retrying it for
        // this cart; removals never fail this way.
        if (next.winner && next.updates[next.winner.giftVariantId] === 1) {
          store.set(key('failed', next.token, next.winner), 1);
        }
        break;
      }

      // The response is the live cart, including any change the shopper made
      // while we were waiting. Re-plan from it instead of trusting the read.
      cart = result.data;
      changedCart = cart;
      observed = false;
    }

    if (changedCart) refreshCartUI(changedCart);
  } catch (error) {
    // Every retry failed. Try again shortly rather than leaving a gift the
    // cart no longer qualifies for.
    console.error('[kj-gift]', error);
    failed = true;
  } finally {
    running = false;
    if (rerun || failed) {
      rerun = false;
      schedule(failed ? 2000 : 150);
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

document.addEventListener('cart:update', (event) => {
  const resource = event.detail?.resource;
  if (resource && Array.isArray(resource.items)) pendingCart = resource;
  schedule();
});
// Re-check when the shopper comes back to the tab or via the back button, so a
// sync that lost a request gets another chance before checkout.
window.addEventListener('pageshow', () => schedule());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') schedule();
});
sync();
