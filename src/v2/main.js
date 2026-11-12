/* Vinex Projekt — VERSION 2 behaviour. Vanilla JS, no dependencies. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;

  /* ---------- Mobile menu (below 1180px the nav collapses into a dropdown card) ---------- */
  const top = $('#top-nav');
  const btnMenu = $('.menu-btn');
  if (top && btnMenu) {
    const list = $('#navlist');
    const setOpen = (open) => {
      top.classList.toggle('open', open);
      btnMenu.setAttribute('aria-expanded', String(open));
      btnMenu.setAttribute('aria-label', open ? btnMenu.dataset.close : btnMenu.dataset.open);
      if (open) { const first = $('a', list); if (first) first.focus({ preventScroll: true }); }
    };
    btnMenu.addEventListener('click', () => setOpen(!top.classList.contains('open')));
    list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (!top.classList.contains('open')) return;
      if (e.key === 'Escape') { setOpen(false); btnMenu.focus(); }
      if (e.key === 'Tab') {
        const f = [btnMenu, ...$$('a', list)];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    document.addEventListener('click', (e) => { if (top.classList.contains('open') && !top.contains(e.target)) setOpen(false); });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
  }

  /* ---------- Language switch keeps the #anchor ---------- */
  $$('a[data-lang-link]').forEach((a) => {
    a.addEventListener('click', () => { if (location.hash) a.href = a.getAttribute('href').split('#')[0] + location.hash; });
  });

  /* ---------- Scroll reveal ---------- */
  const reveal = $$('[data-reveal]');
  if (reveal.length) {
    if (reduced || !('IntersectionObserver' in window)) reveal.forEach((el) => el.classList.add('is-in'));
    else {
      const ro = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      reveal.forEach((el) => ro.observe(el));
    }
  }

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const img = $('.lb-stage img', lb), cap = $('.lb-cap', lb), count = $('.lb-count', lb);
    let items = [], index = 0, opener = null;
    const show = (i) => {
      index = (i + items.length) % items.length;
      const it = items[index];
      img.classList.add('is-loading');
      img.onload = () => img.classList.remove('is-loading');
      img.srcset = it.dataset.srcset || '';
      img.sizes = '100vw';
      img.src = it.dataset.full;
      img.alt = it.dataset.alt || '';
      cap.textContent = it.dataset.caption || '';
      count.textContent = `${index + 1} ${lb.dataset.of} ${items.length}`;
      [items[index + 1], items[index - 1]].forEach((n) => { if (n) { const p = new Image(); p.srcset = n.dataset.srcset || ''; p.sizes = '100vw'; p.src = n.dataset.full; } });
    };
    $$('[data-lightbox]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        opener = el;
        items = $$(`[data-lightbox="${el.dataset.lightbox}"]`);
        lb.classList.toggle('is-single', items.length < 2);
        show(items.indexOf(el));
        lb.showModal();
        body.style.overflow = 'hidden';
      });
    });
    $('.lb-prev', lb).addEventListener('click', () => show(index - 1));
    $('.lb-next', lb).addEventListener('click', () => show(index + 1));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('close', () => { body.style.overflow = ''; img.removeAttribute('src'); img.removeAttribute('srcset'); if (opener) opener.focus(); });
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-stage')) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50 && items.length > 1) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Contact form: validation + POST to site.formEndpoint ---------- */
  const form = $('#contact-form');
  if (form) {
    const d = form.dataset;
    const status = $('.form-status', form);
    const fill = (s) => s.replace('{email}', `<a href="mailto:${d.email}">${d.email}</a>`).replace('{phone}', `<a href="tel:${d.phoneHref}">${d.phone}</a>`);
    const rules = {
      name: (v) => v.trim().length >= 2 || d.errName,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || d.errEmail,
      message: (v) => v.trim().length >= 10 || d.errMessage,
    };
    const check = (el) => {
      const res = rules[el.name](el.value);
      const err = $(`#${el.id}-err`, form);
      const bad = res !== true;
      el.setAttribute('aria-invalid', String(bad));
      err.textContent = bad ? res : '';
      return !bad;
    };
    Object.keys(rules).forEach((n) => {
      const el = form.elements[n];
      el.addEventListener('blur', () => { if (el.value) check(el); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.classList.remove('is-ok');
      const fields = Object.keys(rules).map((n) => form.elements[n]);
      const ok = fields.map(check).every(Boolean);
      if (!ok) { status.textContent = d.errSummary; fields.find((f) => f.getAttribute('aria-invalid') === 'true').focus(); return; }
      if (form.elements.website && form.elements.website.value) return; // honeypot
      const endpoint = d.endpoint;
      if (!endpoint) { status.innerHTML = fill(d.notConnected); return; }
      const btn = $('.sub', form), t = $('.t', btn), label = t.textContent;
      btn.disabled = true; t.textContent = d.sending;
      try {
        const r = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(r.status);
        const data = await r.json().catch(() => ({}));
        if (data.success === false || data.success === 'false') throw new Error(data.message || 'rejected');
        form.reset(); status.textContent = d.success; status.classList.add('is-ok');
      } catch (err) {
        status.innerHTML = fill(d.failure);
      } finally { btn.disabled = false; t.textContent = label; }
    });
  }

  /* ---------- Map: load the iframe only when it nears the viewport ---------- */
  const map = $('iframe[data-src]');
  if (map) {
    const load = () => { map.src = map.dataset.src; map.removeAttribute('data-src'); };
    if ('IntersectionObserver' in window) {
      const mo = new IntersectionObserver((en) => { if (en[0].isIntersecting) { load(); mo.disconnect(); } }, { rootMargin: '400px' });
      mo.observe(map);
    } else load();
  }
})();
