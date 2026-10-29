/**
 * <kj-reviews>: renders Judge.me reviews in the Makeup City design.
 *
 * Data: the first page comes from the product's judgeme.widget metafield
 * (embedded in a <template>, so none of its markup or scripts run); further
 * pages and other sort orders come from Judge.me's public widget endpoint,
 * which returns the same review markup. Review text is read with
 * textContent and written with textContent, so review HTML is never injected.
 *
 * Writing a review uses Judge.me's own form from its review widget block
 * further down the page: we open it, move its form into our slot and preset
 * the star rating the shopper picked.
 */
const API = 'https://api.judge.me/reviews/reviews_for_widget';
const PER_PAGE = 5;

class KjReviews extends HTMLElement {
  connectedCallback() {
    this.list = this.querySelector('[data-list]');
    this.moreBtn = this.querySelector('[data-more]');
    this.sortSel = this.querySelector('[data-sort]');
    this.clearBtn = this.querySelector('[data-clear]');
    this.slot = this.querySelector('[data-form-slot]');
    this.total = Number(this.dataset.count) || 0;
    this.productTitle = (this.dataset.productTitle || '').trim().toLowerCase();
    this.page = 1;
    this.sort = 'created_at:desc';
    this.filter = null;
    this.pick = 0;

    // First page from the metafield.
    const tpl = this.querySelector('template[data-first-page]');
    const first = tpl ? this.parse(tpl.innerHTML) : [];
    this.render(first, false);
    this.updateMore(first.length);

    this.moreBtn.addEventListener('click', () => this.load(this.page + 1, true));
    this.sortSel.addEventListener('change', () => {
      this.sort = this.sortSel.value;
      this.load(1, false);
    });
    this.clearBtn.addEventListener('click', () => this.setFilter(null));
    this.querySelectorAll('[data-filter]').forEach((b) =>
      b.addEventListener('click', () => this.setFilter(Number(b.dataset.filter)))
    );
    this.querySelectorAll('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        this.setPick(Number(b.dataset.pick));
        this.openForm();
      })
    );
    this.querySelector('[data-write]').addEventListener('click', () => this.openForm());

    this.hideJudgeMeWidget();
  }

  /* ---------- data ---------- */

  parse(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    return [...doc.querySelectorAll('.jdgm-rev')].map((el) => {
      const txt = (sel) => el.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() || '';
      const body = [...el.querySelectorAll('.jdgm-rev__body p')].map((p) => p.textContent.trim()).filter(Boolean).join('\n') || txt('.jdgm-rev__body');
      const pics = [...el.querySelectorAll('.jdgm-rev__pics img, .jdgm-rev__pics a[data-mfp-src]')]
        .map((n) => n.getAttribute('data-src') || n.getAttribute('src') || n.getAttribute('data-mfp-src') || n.getAttribute('href'))
        .filter((u) => u && /^https:\/\//.test(u));
      return {
        score: Number(el.querySelector('.jdgm-rev__rating')?.dataset.score) || 0,
        date: el.querySelector('time')?.getAttribute('datetime') || '',
        author: txt('.jdgm-rev__author') || 'Anonymous',
        verified: el.dataset.verifiedBuyer === 'true',
        title: txt('.jdgm-rev__title'),
        body,
        pics: [...new Set(pics)].slice(0, 6),
        reply: txt('.jdgm-rev__reply-content') || txt('.jdgm-rev__reply'),
      };
    });
  }

  async load(page, append) {
    this.moreBtn.setAttribute('aria-busy', 'true');
    const [sortBy, dir] = this.sort.split(':');
    const params = new URLSearchParams({
      url: this.dataset.shop,
      shop_domain: this.dataset.shop,
      platform: 'shopify',
      product_id: this.dataset.productId,
      page: String(page),
      per_page: String(PER_PAGE),
      sort_by: sortBy,
      sort_dir: dir,
    });
    if (this.filter) params.set('filter_rating', String(this.filter));
    try {
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      let reviews = this.parse(data.html || '');
      if (this.filter) reviews = reviews.filter((r) => r.score === this.filter);
      this.page = page;
      if (typeof data.total_count === 'number') this.total = data.total_count;
      this.render(reviews, append);
      this.updateMore(reviews.length);
    } catch (e) {
      console.error('[kj-reviews]', e);
    } finally {
      this.moreBtn.removeAttribute('aria-busy');
    }
  }

  setFilter(stars) {
    this.filter = stars;
    this.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.filter) === stars));
    this.clearBtn.hidden = !stars;
    this.load(1, false);
  }

  updateMore(lastBatch) {
    this.moreBtn.hidden = lastBatch < PER_PAGE || this.page * PER_PAGE >= this.total;
  }

  /* ---------- view ---------- */

  render(reviews, append) {
    if (!append) this.list.replaceChildren();
    if (!reviews.length && !append) {
      const li = document.createElement('li');
      li.className = 'kj-rv__empty';
      li.textContent = this.filter ? 'No reviews with this rating yet.' : 'No reviews yet. Be the first to review this product.';
      this.list.append(li);
      return;
    }
    for (const r of reviews) this.list.append(this.item(r));
  }

  item(r) {
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const li = el('li', 'kj-rv__item');

    const top = el('div', 'kj-rv__item-top');
    const stars = el('span', 'kj-rv__stars');
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `${r.score} out of 5 stars`);
    for (let i = 1; i <= 5; i++) stars.append(el('span', `kj-rv__star${i <= r.score ? ' is-on' : ''}`));
    top.append(stars);
    if (r.date) {
      const d = new Date(r.date);
      const t = el('time', 'kj-rv__date', isNaN(d) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
      t.setAttribute('datetime', r.date);
      top.append(t);
    }
    li.append(top);

    const author = el('div', 'kj-rv__author');
    author.append(el('span', `kj-rv__avatar${r.verified ? ' is-verified' : ''}`, (r.author[0] || 'A').toUpperCase()));
    const name = el('span', null, r.author);
    if (r.verified) name.append(el('span', 'kj-rv__verified', 'Verified'));
    author.append(name);
    li.append(author);

    if (r.title) li.append(el('h3', 'kj-rv__title', r.title));
    // Judge.me fills an empty review body with the product title; don't repeat it.
    if (r.body && r.body.trim().toLowerCase() !== this.productTitle) li.append(el('p', 'kj-rv__body', r.body));

    if (r.pics.length) {
      const pics = el('div', 'kj-rv__pics');
      for (const src of r.pics) {
        const img = el('img');
        img.src = src;
        img.alt = 'Photo from a customer review';
        img.loading = 'lazy';
        pics.append(img);
      }
      li.append(pics);
    }

    if (r.reply) {
      const reply = el('div', 'kj-rv__reply');
      reply.append(el('strong', null, 'Makeup City replied'));
      reply.append(document.createTextNode(r.reply));
      li.append(reply);
    }
    return li;
  }

  /* ---------- write a review (Judge.me form) ---------- */

  setPick(n) {
    this.pick = n;
    this.querySelectorAll('[data-pick]').forEach((b) => {
      const on = Number(b.dataset.pick) <= n;
      b.classList.toggle('is-on', on);
      b.querySelector('.kj-rv__star').classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(Number(b.dataset.pick) === n));
    });
  }

  hideJudgeMeWidget() {
    // Judge.me sets the widget up after load; tag it as our form host once it exists.
    const tag = () => {
      const w = document.querySelector('.jdgm-review-widget');
      if (w) w.classList.add('kj-rv-host');
      return !!w;
    };
    if (tag()) return;
    const mo = new MutationObserver(() => tag() && mo.disconnect());
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 15000);
  }

  async openForm() {
    let form = this.slot.querySelector('.jdgm-form-wrapper');
    if (!form) {
      const link = document.querySelector('.jdgm-review-widget .jdgm-write-rev-link');
      if (!link) {
        // Judge.me not ready (or blocked): fall back to its widget anchor.
        document.querySelector('.jdgm-review-widget')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // Judge.me only builds its form while the widget is visible: unhide it
      // for the click, then move the form into our slot and hide it again.
      const widget = link.closest('.jdgm-review-widget');
      widget?.classList.remove('kj-rv-host');
      link.click();
      for (let i = 0; i < 30 && !(form = document.querySelector('.jdgm-review-widget .jdgm-form-wrapper')); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      widget?.classList.add('kj-rv-host');
      if (!form) return;
      this.slot.append(form);
    }
    this.slot.hidden = false;
    if (this.pick) form.querySelector(`.jdgm-form__rating [data-alt="${this.pick}"]`)?.click();
    this.slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

if (!customElements.get('kj-reviews')) customElements.define('kj-reviews', KjReviews);
