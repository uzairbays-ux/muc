(function () {
  // Trigger variant IDs — all Lifter Glaze Tinted Lip Oil Balm variants
  var TRIGGER_VARIANTS = [
    47955934970092, // 003 Rose Bite (combined product)
    47955934937324, // 005 Peach Quench
    47955934904556, // 006 Caramel Glow
    47955934871788, // 007 Berry Haze
    47955934839020, // 009 Latte Crush
    47297576730860, // 003 Rose Bite (individual product)
    47297576796396, // 005 Peach Quench
    47297576829164, // 006 Caramel Glow
    47297576861932, // 007 Berry Haze
    47297576927468, // 009 Latte Crush
  ];

  // FOC gift variant
  var FOC_VARIANT_ID = 47955988447468;
  var REQUIRED_QTY = 2;

  var _busy = false;

  function getCart() {
    return fetch('/cart.js').then(function (r) { return r.json(); });
  }

  function syncFOC() {
    if (_busy) return;
    _busy = true;

    getCart().then(function (cart) {
      var triggerQty = 0;
      var focItem = null;

      cart.items.forEach(function (item) {
        if (TRIGGER_VARIANTS.indexOf(item.variant_id) !== -1) {
          triggerQty += item.quantity;
        }
        if (item.variant_id === FOC_VARIANT_ID) {
          focItem = item;
        }
      });

      var shouldHaveFOC = triggerQty >= REQUIRED_QTY;

      if (shouldHaveFOC && !focItem) {
        // Add FOC item
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: FOC_VARIANT_ID, quantity: 1 })
        }).then(function () {
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        });
      } else if (!shouldHaveFOC && focItem) {
        // Remove FOC item
        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: FOC_VARIANT_ID, quantity: 0 })
        }).then(function () {
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        });
      }
    }).finally(function () {
      _busy = false;
    });
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', syncFOC);

  // Run after any cart change (Horizon theme events)
  document.addEventListener('cart:updated', syncFOC);
  document.addEventListener('cart:refresh', syncFOC);

  // Also hook into fetch to catch add-to-cart calls
  var _origFetch = window.fetch;
  window.fetch = function (url) {
    var result = _origFetch.apply(this, arguments);
    if (typeof url === 'string' && (url.includes('/cart/add') || url.includes('/cart/change') || url.includes('/cart/update'))) {
      result.then(function () { setTimeout(syncFOC, 300); });
    }
    return result;
  };
})();
