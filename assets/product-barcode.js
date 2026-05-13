import { Component } from '@theme/component';
import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

/**
 * A custom element that displays a product barcode.
 * Listens for variant update events and updates the barcode display accordingly.
 *
 * @typedef {Object} Refs
 * @property {HTMLElement} barcodeContainer - The container element for the barcode
 * @property {HTMLElement} barcode - The span element that displays the barcode text
 *
 * @extends {Component<Refs>}
 */
class ProductBarcodeComponent extends Component {
  requiredRefs = ['barcodeContainer', 'barcode'];

  connectedCallback() {
    super.connectedCallback();
    const target = this.closest('[id*="ProductInformation-"], [id*="QuickAdd-"], product-card');
    if (!target) return;
    target.addEventListener(ThemeEvents.variantUpdate, this.updateBarcode);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const target = this.closest('[id*="ProductInformation-"], [id*="QuickAdd-"], product-card');
    if (!target) return;
    target.removeEventListener(ThemeEvents.variantUpdate, this.updateBarcode);
  }

  /**
   * Updates the barcode.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updateBarcode = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    }

    if (event.target instanceof HTMLElement && event.target.dataset.productId !== this.dataset.productId) {
      return;
    }

    if (event.detail.resource) {
      const resource = /** @type {any} */ (event.detail.resource);
      const variantBarcode = resource.barcode || '';

      if (variantBarcode) {
        this.style.display = 'block';
        this.refs.barcode.textContent = variantBarcode;
      } else {
        this.style.display = 'none';
        this.refs.barcode.textContent = '';
      }
    }
  };
}

if (!customElements.get('product-barcode-component')) {
  customElements.define('product-barcode-component', ProductBarcodeComponent);
}
