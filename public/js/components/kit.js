// Shared UI helpers for dashboards and account pages (window.P3).
(function () {
  const U = window.Utils || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FB = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#14251B"/><path d="M32 10l16 16-16 28L16 26z" fill="#22C55E"/></svg>');
  const toast = (m, t) => (window.Utils && Utils.showToast) ? Utils.showToast(m, t || 'success') : alert(m);
  const urlOk = u => !u || /^https?:\/\/\S+$/i.test(u);
  const im = (u, c) => `<img class="${c || 'p3-img'}" src="${esc(u || FB)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FB}'">`;
  const fld = (id, l, v, t, h) => `<div class="form-group"><label class="form-label" for="${id}">${l}</label>${t === 'ta' ? `<textarea id="${id}" class="input" rows="3">${esc(v)}</textarea>` : `<input id="${id}" class="input" type="${t || 'text'}" value="${esc(v)}">`}${h ? `<div class="p3-muted">${h}</div>` : ''}</div>`;
  const val = (o, id) => o.querySelector('#' + id).value.trim();
  function modal(title, body, ok, label) {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML = `<div class="glass-card" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:24px"><h3 style="margin-bottom:12px">${esc(title)}</h3>${body}<div class="p3-err" data-e></div><div class="p3-actions" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-x type="button">Cancel</button><button class="btn btn-primary" data-ok type="button">${label || 'Save'}</button></div></div>`;
    document.body.appendChild(o);
    const close = () => o.remove();
    o.querySelector('[data-x]').onclick = close;
    o.onclick = e => { if (e.target === o) close(); };
    o.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    o.querySelector('[data-ok]').onclick = async () => {
      const btn = o.querySelector('[data-ok]'); btn.disabled = true;
      try { const r = await ok(o); if (typeof r === 'string') { o.querySelector('[data-e]').textContent = r; btn.disabled = false; } else close(); }
      catch (e) { o.querySelector('[data-e]').textContent = String(e && e.message || e).replace('Firebase: ', ''); btn.disabled = false; }
    };
    o.querySelectorAll('[data-prev]').forEach(i => i.addEventListener('input', () => { const p = o.querySelector('#' + i.dataset.prev); if (p) p.src = urlOk(i.value) && i.value ? i.value : FB; }));
    const f = o.querySelector('input,textarea,select'); f && f.focus();
    return o;
  }
  const ask = (m, fn) => modal('Please confirm', `<p>${esc(m)}</p>`, () => fn(), 'Confirm');
  const table = (h, rows) => `<div class="p3-scroll"><table class="p3-t cards"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td data-l="${esc(h[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const empty = m => `<div class="glass-card p3-muted" style="text-align:center;padding:24px">${esc(m)}</div>`;
  const bind = (root, fn) => { root.onclick = e => { const b = e.target.closest('[data-a]'); if (b) fn(b.dataset.a, b.dataset.id, b); }; };
  const head = (t, btn, id) => `<div class="p3-top"><h1>${t}</h1>${btn ? `<button class="btn btn-primary" data-a="${id || 'add'}">${btn}</button>` : ''}</div>`;
  const stat = (v, l) => `<div class="glass-card stat-card"><div class="stat-value">${esc(v)}</div><div class="stat-label">${esc(l)}</div></div>`;
  const when = n => n ? new Date(Number(n)).toLocaleDateString() : '';
  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const fail = e => toast(String(e && e.message || 'Failed').replace('Firebase: ', ''), 'error');
  window.P3 = { esc, FB, toast, urlOk, im, fld, val, modal, ask, table, empty, bind, head, stat, when, slug, fail };
})();
