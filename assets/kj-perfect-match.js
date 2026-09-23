/**
 * L'Oreal "Perfect Match" cart behaviour.
 *
 * Config comes from snippets/kj-perfect-match-rules.liquid (#kj-perfect-match-rules).
 *
 * Two jobs, both switchable from Theme settings > Perfect Match:
 *
 * 1. Redirect: after the shopper adds a Collection 1 (Mega Deal) product and
 *    their cart has no Collection 2 product yet, send them to Collection 2 so
 *    they can complete the pair. Only fires on a real add (a theme cart:update
 *    carrying the added product id), never on a page-load sync, and never when
 *    they are already on that collection.
 *
 * 2. One per collection: keep at most one Collection 1 product and one
 *    Collection 2 product, quantity 1 each. Extra items are removed, keeping
 *    the earliest added (cart order), which is the one the deal was unlocked
 *    with. Note this is stricter than L'Oreal's written conditions, which let
 *    extra qualifying SKUs sit in the cart without unlocking a second deal.
 *
 * The discount itself stays in Shopify (code-based Buy X Get Y per percentage
 * tier, one use per customer, does not combine). This file never prices
 * anything; it only shapes the cart.
 *
 * Never dispatches cart:update: the drawer opens on that event and this script
 * listens to it, so dispatching would pop the drawer open and risk re-entering
 * itself. The cart section is re-rendered directly instead.
 */
import { sectionRenderer } from '@theme/section-renderer';

const REQUEST_TIMEOUT_MS = 30000;

const config = (() => {
  try {
    return JSON.parse(document.getElementById('kj-perfect-match-rules')?.textContent || '{}');
  } catch (e) {
    return {};
  }
})();

const c1 = new Set(config.c1ProductIds || []);
const c2 = new Set(config.c2ProductIds || []);
const active = c1.size > 0 && c2.size > 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch JSON with a timeout, retrying throttled/5xx/non-JSON responses. */
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

const groupOf = (item) => (c1.has(item.product_id) ? 'c1' : c2.has(item.product_id) ? 'c2' : null);

/**
 * Lines to drop so only the earliest C1 and earliest C2 line survive, each at
 * quantity 1. Cart order is add order, so the extra is the newer one.
 */
function extraLines(items) {
  const seen = {};
  const updates = {};
  for (const item of items) {
    const group = groupOf(item);
    if (!group) continue;
    if (seen[group]) {
      updates[item.key] = 0;
    } else {
      seen[group] = true;
      if (item.quantity > 1) updates[item.key] = 1;
    }
  }
  return updates;
}

let running = false;
let rerun = false;
let timer = null;
let pending = null;

function schedule(detail) {
  if (detail) pending = detail;
  clearTimeout(timer);
  timer = setTimeout(run, 150);
}

async function run() {
  if (!active) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;

  const detail = pending;
  pending = null;

  try {
    let cart = detail?.resource && Array.isArray(detail.resource.items) ? detail.resource : (await requestJSON('/cart.js')).data;

    if (config.enforceOnePerCollection) {
      const updates = extraLines(cart.items);
      if (Object.keys(updates).length) {
        const result = await requestJSON('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        if (result.ok) {
          cart = result.data;
          refreshCartUI(cart);
        }
      }
    }

    // Redirect only for a real add of a Collection 1 product.
    if (!config.redirectToC2 || !config.collection2Url) return;
    const addedId = Number(detail?.data?.productId);
    if (!addedId || !c1.has(addedId)) return;
    if (cart.items.some((item) => c2.has(item.product_id))) return;
    if (window.location.pathname.startsWith(config.collection2Url)) return;

    window.location.href = `${config.collection2Url}?pm=1`;
  } catch (error) {
    console.error('[kj-pm]', error);
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

document.addEventListener('cart:update', (event) => schedule(event.detail));
run();
