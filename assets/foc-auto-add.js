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

  var FOC_VARIANT_ID = 47955988447468;
  var REQUIRED_QTY = 2;
  var _busy = false;

  function syncFOC() {
    if (_busy) return;
    _busy = true;

    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
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
          return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: FOC_VARIANT_ID, quantity: 1 })
          });
        } else if (!shouldHaveFOC && focItem) {
          return fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: FOC_VARIANT_ID, quantity: 0 })
          });
        }
      })
      .then(function () { _busy = false; })
      .catch(function () { _busy = false; });
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', syncFOC);

  // Horizon theme cart event (correct event name from events.js)
  document.addEventListener('cart:update', syncFOC);
})();
