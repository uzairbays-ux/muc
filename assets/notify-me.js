/**
 * <notify-me-form>
 *
 * Progressive enhancement for the out-of-stock "Notify me" form.
 *
 * Without JS the inner <form> posts natively to /contact as `form_type=contact`,
 * which emails the merchant every submission (name, email, phone, product).
 * That path always works and is why it is the default markup.
 *
 * With JS we intercept the submit and send TWO posts to /contact:
 *   1. form_type=customer  -> creates a customer tagged `notify-me`
 *                             and `notify-me: <product title>`
 *   2. form_type=contact   -> the same email the no-JS path would have sent,
 *                             so no request is ever lost
 *
 * Caveat worth knowing: Shopify does not reliably append a NEW tag to an
 * already-existing customer. A shopper who signs up for a second product with
 * the same email may keep only their original tag. The contact email in step 2
 * is the backstop for exactly that case.
 */
class NotifyMeForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.status = this.querySelector('[data-notify-status]');
    this.submitButton = this.querySelector('[type="submit"]');

    if (!this.form) return;

    this.form.addEventListener('submit', this.handleSubmit);
  }

  disconnectedCallback() {
    this.form?.removeEventListener('submit', this.handleSubmit);
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    const data = new FormData(this.form);
    const email = (data.get('contact[email]') || '').trim();

    if (!email) {
      this.setStatus(this.dataset.errorText, 'error');
      return;
    }

    this.setBusy(true);
    this.setStatus('', null);

    try {
      // 1. Tagged customer record. Sent first so the tag exists even if the
      //    contact email is rate-limited.
      await this.post({
        form_type: 'customer',
        'contact[email]': email,
        'contact[first_name]': data.get('contact[first_name]') || '',
        'contact[tags]': this.dataset.tags || 'notify-me',
      });

      // 2. Merchant notification with the full request, including phone.
      await this.post({
        form_type: 'contact',
        'contact[first_name]': data.get('contact[first_name]') || '',
        'contact[email]': email,
        'contact[phone]': data.get('contact[phone]') || '',
        'contact[body]': this.buildBody(data),
      });

      this.form.hidden = true;
      this.setStatus(this.dataset.successText, 'success');
    } catch (error) {
      console.error('[notify-me] submission failed', error);
      this.setStatus(this.dataset.errorText, 'error');
      this.setBusy(false);
    }
  };

  /**
   * Shopify's storefront form endpoint. Responds with a redirect to the
   * referring page; we only care that the request itself succeeded.
   */
  async post(fields) {
    const body = new URLSearchParams({ utf8: '✓', ...fields });

    const response = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`/contact responded ${response.status}`);
    }

    return response;
  }

  buildBody(data) {
    return [
      'Back-in-stock request',
      `Product: ${this.dataset.productTitle || ''}`,
      this.dataset.variantTitle ? `Variant: ${this.dataset.variantTitle}` : null,
      this.dataset.productUrl ? `URL: ${this.dataset.productUrl}` : null,
      `Name: ${data.get('contact[first_name]') || '—'}`,
      `Phone: ${data.get('contact[phone]') || '—'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  setBusy(isBusy) {
    if (!this.submitButton) return;
    this.submitButton.disabled = isBusy;
    this.submitButton.setAttribute('aria-busy', String(isBusy));
  }

  setStatus(message, state) {
    if (!this.status) return;
    this.status.textContent = message || '';
    this.status.classList.toggle('notify-me__status--error', state === 'error');
    this.status.classList.toggle('notify-me__status--success', state === 'success');
  }
}

if (!customElements.get('notify-me-form')) {
  customElements.define('notify-me-form', NotifyMeForm);
}
