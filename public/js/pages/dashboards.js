// Live dashboards (admin / developer / user). Everything reads and writes the real Cloud Firestore; nothing is demo data.
(async function () {
  const kind = document.body.dataset.dash;
  const me = await window.authService.require(kind);          // redirects to login (or elsewhere) if the real session/role does not match
  const B = window.ARX_BACKEND, P = window.P3;
  const { esc, toast, urlOk, im, fld, val, modal, ask, table, empty, bind, head, stat, when, slug, fail, FB } = P;
  const nav = document.getElementById('dash-nav'), main = document.getElementById('dash-main');
  document.getElementById('dash-avatar').src = me.avatar || '/assets/images/default-avatar.svg';
  document.getElementById('dash-name').textContent = me.displayName || me.username;
  document.getElementById('dash-role').textContent = { admin: 'Administrator', developer: 'Developer', user: 'Member' }[me.role];
  const sections = [];
  const add = (id, label, render) => sections.push({ id, label, render });
  const loading = () => '<div class="p3-muted" style="padding:24px">Loading…</div>';
  const link = (u) => esc(u || '');
  const mdSafe = t => esc(t).replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/^# (.*)$/gm, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener nofollow" target="_blank">$1</a>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/\n/g, '<br>');
  const verifyBanner = () => '';

  /* ============================== ADMIN ============================== */
  if (kind === 'admin') {
    const PRESETS = ['Custom', 'YouTube', 'Facebook', 'Instagram', 'Discord', 'GitHub', 'X (Twitter)', 'TikTok', 'Telegram', 'Twitch', 'Reddit', 'WhatsApp', 'Website'];
    const DEFAULTS = { categories: [['mods', 'Mods', 'java'], ['modpacks', 'Modpacks', 'java'], ['shaders', 'Shaders', 'java'], ['plugins', 'Plugins', 'java'], ['servers', 'Servers', 'java'], ['resource-packs', 'Resource Packs', 'both'], ['data-packs', 'Data Packs', 'java'], ['maps', 'Maps', 'both'], ['addons', 'Addons', 'bedrock'], ['worlds', 'Worlds', 'bedrock'], ['skins', 'Skins', 'bedrock']], platforms: [['Fabric', 'loader'], ['Forge', 'loader'], ['NeoForge', 'loader'], ['Quilt', 'loader'], ['Paper', 'software'], ['Purpur', 'software'], ['Spigot', 'software'], ['Bukkit', 'software'], ['Velocity', 'software'], ['Iris', 'loader'], ['OptiFine', 'loader'], ['CurseForge', 'distribution']] };

    add('overview', 'Overview', async el => {
      el.innerHTML = head('Admin Overview') + verifyBanner() + loading();
      try {
        const [users, apps, projects, reports, pub] = await Promise.all([B.read('users'), B.read('developerApplications'), B.myProjects(), B.reports(), B.listPublic()]);
        const U = Object.values(users || {}), pend = projects.filter(p => p.status === 'pending');
        el.innerHTML = head('Admin Overview') + verifyBanner() + `<div class="grid grid-cols-3" style="margin-bottom:24px">${stat(U.length, 'Users')}${stat(U.filter(u => u.role === 'developer').length, 'Developers')}${stat(pub.length, 'Published projects')}${stat(pend.length, 'Projects awaiting approval')}${stat(Object.values(apps || {}).filter(a => a.status === 'pending').length, 'Developer applications')}${stat(reports.length, 'Open reports')}</div>`
          + '<h2>Awaiting approval</h2>' + (pend.map(p => `<div class="p3-row">${im(p.icon)}<div class="p3-grow"><b>${esc(p.name)}</b><div class="p3-muted">${esc(p.category)} · by ${esc(p.ownerName)}</div></div><a class="btn btn-secondary btn-sm" href="#projects">Review</a></div>`).join('') || empty('Nothing waiting for approval.'));
      } catch (e) { el.innerHTML = empty('Could not load overview: ' + e.message); }
    });

    add('users', 'Users', async function draw(el) {
      el.innerHTML = head('Users') + loading();
      let U; try { U = Object.entries((await B.read('users')) || {}); } catch (e) { el.innerHTML = empty('Could not load users: ' + e.message); return; }
      const owner = u => B.adminMails.includes(String(u.email || '').toLowerCase());
      el.innerHTML = head('Users (' + U.length + ')') + `<input id="q" class="input" placeholder="Search by name or email" style="max-width:360px;margin-bottom:12px"><div id="list"></div>`;
      const paint = () => {
        const q = el.querySelector('#q').value.toLowerCase();
        el.querySelector('#list').innerHTML = table(['User', 'Email', 'Role', 'Joined', 'Actions'], U.filter(([, u]) => (String(u.username) + ' ' + String(u.email) + ' ' + String(u.displayName)).toLowerCase().includes(q)).map(([uid, u]) => [`<b>${esc(u.displayName || u.username)}</b><div class="p3-muted">@${esc(u.username)}</div>`, esc(u.email), `<span class="badge badge-primary">${esc(owner(u) ? 'admin' : (u.role || 'user'))}</span>${u.suspended ? ' <span class="badge">suspended</span>' : ''}`, when(u.createdAt), owner(u) || uid === me.id ? '<span class="p3-muted">protected</span>' : `<div class="p3-actions"><button class="btn btn-ghost btn-sm" data-a="role" data-id="${uid}">Role</button><button class="btn btn-ghost btn-sm" data-a="${u.suspended ? 'unsuspend' : 'suspend'}" data-id="${uid}">${u.suspended ? 'Reactivate' : 'Suspend'}</button></div>`]));
      };
      el.querySelector('#q').oninput = paint; paint();
      const run = async (a, uid, role) => { try { await B.adminUser(a, uid, role); toast('Done'); draw(el); } catch (e) { fail(e); } };
      bind(el, (a, uid) => { if (a === 'role') modal('Change role', '<select id="r" class="input"><option>user</option><option>developer</option><option>admin</option></select>', o => { run('setRole', uid, o.querySelector('#r').value); }); else ask('Confirm: ' + a + '?', () => run(a, uid)); });
    });

    add('applications', 'Developer Applications', async function draw(el) {
      el.innerHTML = head('Developer Applications') + loading();
      let A; try { A = Object.entries((await B.read('developerApplications')) || {}); } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); return; }
      const pend = A.filter(([, a]) => a.status === 'pending'), rest = A.filter(([, a]) => a.status !== 'pending');
      const row = ([uid, a], acts) => `<div class="p3-row"><div class="p3-grow"><b>${esc(a.name)}</b> <span class="badge">${esc(a.status)}</span><div class="p3-muted">${esc(a.pitch)}</div>${a.links ? `<div class="p3-muted">${esc(a.links)}</div>` : ''}</div>${acts ? `<div class="p3-actions"><button class="btn btn-secondary btn-sm" data-a="approveDeveloper" data-id="${uid}">Approve</button><button class="btn btn-ghost btn-sm" data-a="rejectDeveloper" data-id="${uid}">Reject</button></div>` : ''}</div>`;
      el.innerHTML = head('Developer Applications') + '<h2>Pending</h2>' + (pend.map(x => row(x, true)).join('') || empty('No pending applications.')) + '<h2>Decided</h2>' + (rest.map(x => row(x, false)).join('') || empty('Nothing yet.'));
      bind(el, (a, uid) => ask(a === 'approveDeveloper' ? 'Approve this developer?' : 'Reject this application?', async () => { try { await B.adminUser(a, uid); toast('Done'); draw(el); } catch (e) { fail(e); } }));
    });

    add('projects', 'Projects', async function draw(el) {
      el.innerHTML = head('Projects') + loading();
      let ps; try { ps = await B.myProjects(); } catch (e) { el.innerHTML = empty('Could not load projects: ' + e.message); return; }
      ps.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || (b.updatedAt || 0) - (a.updatedAt || 0));
      el.innerHTML = head('Projects (' + ps.length + ')') + (ps.map(p => `<div class="p3-row">${im(p.icon)}<div class="p3-grow"><b>${esc(p.name)}</b> <span class="badge">${esc(p.status)}</span><div class="p3-muted">${esc(p.category)} · ${esc(p.edition)} · by ${esc(p.ownerName)}</div><div class="p3-muted">${esc((p.description || '').slice(0, 140))}</div></div><div class="p3-actions">${p.status === 'approved' ? `<a class="btn btn-secondary btn-sm" href="/pages/project.html?slug=${encodeURIComponent(p.id)}">View</a>` : ''}<button class="btn btn-secondary btn-sm" data-a="ok" data-id="${p.id}">Approve</button><button class="btn btn-ghost btn-sm" data-a="no" data-id="${p.id}">Reject</button><button class="btn btn-ghost btn-sm" style="color:var(--color-error)" data-a="rm" data-id="${p.id}">Delete</button></div></div>`).join('') || empty('No projects submitted yet.'));
      bind(el, (a, id) => ask(a === 'rm' ? 'Delete this project permanently?' : a === 'ok' ? 'Approve and publish?' : 'Reject and unpublish?', async () => { try { a === 'rm' ? await B.deleteProject(id) : await B.approve(id, a === 'ok'); window.projectService.invalidate(); draw(el); } catch (e) { fail(e); } }));
    });

    add('catalog', 'Categories & Platforms', async function draw(sec) {
      let cat; try { cat = await B.catalog({ all: true }); } catch (e) { sec.innerHTML = empty('Could not load catalog: ' + e.message); return; }
      const cf = c => fld('n', 'Name', c.name || '') + fld('lg', 'Logo (direct image URL)', c.logo || '', 'url').replace('<input', '<input data-prev="lv"') + `<img id="lv" class="p3-prev" src="${esc(c.logo || FB)}" alt="">`;
      const row = (k, x, i, n) => `<div class="p3-row">${im(x.logo)}<div class="p3-grow"><b>${esc(x.name)}</b> <span class="badge">${x.enabled ? 'on' : 'off'}</span><div class="p3-muted">${k === 'categories' ? esc(x.edition) : esc(x.kind)} · id ${esc(x.id)}</div></div><div class="p3-actions"><button class="btn btn-ghost btn-sm" data-a="up" data-k="${k}" data-id="${x.id}" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-ghost btn-sm" data-a="dn" data-k="${k}" data-id="${x.id}" ${i < n - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-secondary btn-sm" data-a="tg" data-k="${k}" data-id="${x.id}">${x.enabled ? 'Disable' : 'Enable'}</button><button class="btn btn-ghost btn-sm" data-a="ed" data-k="${k}" data-id="${x.id}">Edit</button><button class="btn btn-ghost btn-sm" data-a="rm" data-k="${k}" data-id="${x.id}">Delete</button></div></div>`;
      sec.innerHTML = head('Categories & Platforms') + `<div class="p3-actions" style="margin-bottom:12px"><button class="btn btn-primary" data-a="addc">Add category</button><button class="btn btn-primary" data-a="addp">Add platform / loader</button><button class="btn btn-ghost" data-a="seed">Load default set</button></div><h2>Categories</h2>${cat.categories.map((x, i) => row('categories', x, i, cat.categories.length)).join('') || empty('No categories yet. Add one or load the default set.')}<h2>Platforms, loaders & software</h2>${cat.platforms.map((x, i) => row('platforms', x, i, cat.platforms.length)).join('') || empty('No platforms yet.')}`;
      const save = async (k, id, d) => { try { await B.saveCatalog(k, id, d); draw(sec); } catch (e) { fail(e); } };
      bind(sec, async (a, id, btn) => {
        const k = btn.dataset.k, items = k ? cat[k] : null, x = items && items.find(y => y.id === id);
        if (a === 'seed') return ask('Write the default categories and platforms? Entries with the same id are replaced.', async () => { try { let o = 1; for (const [i, n, e] of DEFAULTS.categories) await B.saveCatalog('categories', i, { name: n, edition: e, logo: '', enabled: true, order: o++ }); o = 1; for (const [n, kd] of DEFAULTS.platforms) await B.saveCatalog('platforms', slug(n), { name: n, kind: kd, logo: '', enabled: true, order: o++ }); draw(sec); } catch (e) { fail(e); } });
        if (a === 'addc') return modal('New category', cf({}) + '<div class="form-group"><label class="form-label" for="ed">Edition</label><select id="ed" class="input"><option>java</option><option>bedrock</option><option>both</option></select></div>', o => { const n = val(o, 'n'), lg = val(o, 'lg'); if (!n) return 'Name required'; if (!urlOk(lg)) return 'Logo must be an http(s) image URL'; return save('categories', slug(n), { name: n, logo: lg, edition: val(o, 'ed'), enabled: true, order: Date.now() }); });
        if (a === 'addp') { const cs = cat.categories; return modal('New platform', cf({}) + '<div class="form-group"><label class="form-label" for="kd">Type</label><select id="kd" class="input"><option value="loader">Loader</option><option value="software">Server software</option><option value="distribution">Distribution platform</option></select></div><div class="form-group"><label class="form-label">Applies to (leave empty = all)</label>' + cs.map(c => `<label style="display:block"><input type="checkbox" data-c="${c.id}"> ${esc(c.name)}</label>`).join('') + '</div>', o => { const n = val(o, 'n'), lg = val(o, 'lg'); if (!n) return 'Name required'; if (!urlOk(lg)) return 'Logo must be an http(s) image URL'; const cats = Object.fromEntries([...o.querySelectorAll('[data-c]:checked')].map(i => [i.dataset.c, true])); return save('platforms', slug(n), { name: n, logo: lg, kind: val(o, 'kd'), enabled: true, order: Date.now(), ...(Object.keys(cats).length ? { categories: cats } : {}) }); }); }
        if (!x) return; const { id: _i, ...d } = x;
        if (a === 'tg') return save(k, id, { ...d, enabled: !x.enabled });
        if (a === 'ed') return modal('Edit ' + x.name, cf(x), o => { const n = val(o, 'n'), lg = val(o, 'lg'); if (!n) return 'Name required'; if (!urlOk(lg)) return 'Logo must be an http(s) image URL'; return save(k, id, { ...d, name: n, logo: lg }); });
        if (a === 'rm') return ask('Delete "' + x.name + '"? Existing projects keep their stored value.', async () => { try { await B.deleteCatalog(k, id); draw(sec); } catch (e) { fail(e); } });
        if (a === 'up' || a === 'dn') { const i = items.indexOf(x), y = items[a === 'up' ? i - 1 : i + 1]; if (!y) return; try { await B.saveCatalog(k, x.id, { ...d, order: y.order }); const { id: _, ...e } = y; await B.saveCatalog(k, y.id, { ...e, order: x.order }); draw(sec); } catch (e) { fail(e); } }
      });
    });

    add('banners', 'Home Banners', async function draw(el) {
      el.innerHTML = head('Home Banners') + loading();
      let bs; try { bs = await B.banners({ all: true }); } catch (e) { el.innerHTML = empty('Could not load banners: ' + e.message); return; }
      const form = b => fld('bt', 'Title', b.title || '') + fld('bc', 'Label (e.g. Modpack, Shader)', b.category || '') + fld('bd', 'Description', b.description || '', 'ta') + fld('bi', 'Banner image (direct URL)', b.image || '', 'url').replace('<input', '<input data-prev="bv"') + `<img id="bv" class="p3-prev" src="${esc(b.image || FB)}" alt="">` + fld('bl', 'Link when clicked', b.link || '', 'text', 'Full https:// link or a site path like /pages/project.html?slug=…');
      const read = o => { if (!val(o, 'bt')) return 'Title is required'; if (!val(o, 'bi') || !urlOk(val(o, 'bi'))) return 'A direct http(s) image URL is required'; return { title: val(o, 'bt'), category: val(o, 'bc'), description: val(o, 'bd'), image: val(o, 'bi'), link: val(o, 'bl') }; };
      el.innerHTML = head('Home Banners', 'New banner') + (bs.map((b, i) => `<div class="p3-row">${im(b.image, 'p3-img p3-wide')}<div class="p3-grow"><b>${esc(b.title)}</b> <span class="badge">${b.enabled === false ? 'hidden' : 'live'}</span><div class="p3-muted">${esc(b.description)}</div></div><div class="p3-actions"><button class="btn btn-ghost btn-sm" data-a="up" data-id="${b.id}" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-ghost btn-sm" data-a="dn" data-id="${b.id}" ${i < bs.length - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-secondary btn-sm" data-a="tg" data-id="${b.id}">${b.enabled === false ? 'Show' : 'Hide'}</button><button class="btn btn-ghost btn-sm" data-a="ed" data-id="${b.id}">Edit</button><button class="btn btn-ghost btn-sm" style="color:var(--color-error)" data-a="rm" data-id="${b.id}">Delete</button></div></div>`).join('') || empty('No banners yet. The home page hides the slider until you add one.'));
      const strip = ({ id, ...d }) => d;
      bind(el, async (a, id) => {
        const b = bs.find(x => x.id === id);
        try {
          if (a === 'add') return modal('New banner', form({}), o => { const r = read(o); if (typeof r === 'string') return r; return B.saveBanner(Date.now().toString(36), { ...r, enabled: true, order: bs.length + 1 }).then(() => draw(el)); }, 'Add');
          if (a === 'ed') return modal('Edit banner', form(b), o => { const r = read(o); if (typeof r === 'string') return r; return B.saveBanner(id, { ...strip(b), ...r }).then(() => draw(el)); });
          if (a === 'rm') return ask('Delete banner "' + b.title + '"?', async () => { await B.deleteBanner(id); draw(el); });
          if (a === 'tg') { await B.saveBanner(id, { ...strip(b), enabled: b.enabled === false }); return draw(el); }
          if (a === 'up' || a === 'dn') { const i = bs.indexOf(b), c = bs[a === 'up' ? i - 1 : i + 1]; if (!c) return; await B.saveBanner(b.id, { ...strip(b), order: c.order }); await B.saveBanner(c.id, { ...strip(c), order: b.order }); draw(el); }
        } catch (e) { fail(e); }
      });
    });

    add('socials', 'Social Links', async function draw(el) {
      el.innerHTML = head('Social Links') + loading();
      let ss; try { ss = await B.socials({ all: true }); } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); return; }
      const prev = s => Utils.socialIcon({ url: s.url || '', icon: s.icon || '' });
      const form = s => `<div class="form-group"><label class="form-label" for="sp">Platform</label><select id="sp" class="input">${PRESETS.map(p => `<option${p === (s.name || 'Custom') ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></div>` + fld('sn', 'Name shown on the site', s.name || '', 'text', 'For a custom link, type any name') + fld('su', 'Link (https://…)', s.url || '', 'url') + fld('si', 'Icon / logo (direct image URL, optional)', s.icon || '', 'url', 'Leave empty to use the website\'s own icon automatically') + `<img id="siv" class="p3-prev" src="${esc(s.icon ? s.icon : (s.url ? prev(s) : FB))}" alt="" style="width:48px;height:48px;object-fit:contain">`;
      const wire = o => { const sp = o.querySelector('#sp'), sn = o.querySelector('#sn'), su = o.querySelector('#su'), si = o.querySelector('#si'), pv = o.querySelector('#siv'); sp.onchange = () => { if (sp.value !== 'Custom') sn.value = sp.value; }; const refresh = () => { pv.src = si.value && urlOk(si.value) ? si.value : (su.value ? prev({ url: su.value }) : FB); }; si.oninput = su.oninput = refresh; return o; };
      const read = o => { const n = val(o, 'sn'), u = val(o, 'su'), ic = val(o, 'si'); if (!n) return 'Name is required'; if (!/^(https?:\/\/|mailto:)\S+$/i.test(u)) return 'Link must start with https://'; if (!urlOk(ic)) return 'Icon must be a direct http(s) image URL'; return { name: n, url: u, ...(ic ? { icon: ic } : {}) }; };
      el.innerHTML = head('Social Links', 'Add link') + '<p class="p3-muted">These appear in the footer of every page. Add YouTube, Facebook, Instagram, Discord, GitHub or any custom link, each with its own icon.</p>' + (ss.map((s, i) => `<div class="p3-row"><img class="p3-img" style="object-fit:contain;padding:6px" src="${esc(prev(s))}" alt="" onerror="this.onerror=null;this.src='${FB}'"><div class="p3-grow"><b>${esc(s.name)}</b> <span class="badge">${s.enabled === false ? 'hidden' : 'live'}</span><div class="p3-muted">${esc(s.url)}</div></div><div class="p3-actions"><button class="btn btn-ghost btn-sm" data-a="up" data-id="${s.id}" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-ghost btn-sm" data-a="dn" data-id="${s.id}" ${i < ss.length - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-secondary btn-sm" data-a="tg" data-id="${s.id}">${s.enabled === false ? 'Show' : 'Hide'}</button><button class="btn btn-ghost btn-sm" data-a="ed" data-id="${s.id}">Edit</button><button class="btn btn-ghost btn-sm" style="color:var(--color-error)" data-a="rm" data-id="${s.id}">Delete</button></div></div>`).join('') || empty('No social links yet.'));
      const strip = ({ id, ...d }) => d;
      bind(el, async (a, id) => {
        const s = ss.find(x => x.id === id);
        try {
          if (a === 'add') return wire(modal('Add social link', form({}), o => { const r = read(o); if (typeof r === 'string') return r; return B.saveSocial(Date.now().toString(36), { ...r, enabled: true, order: ss.length + 1 }).then(() => { draw(el); }); }, 'Add'));
          if (a === 'ed') return wire(modal('Edit social link', form(s), o => { const r = read(o), d = strip(s); delete d.icon; if (typeof r === 'string') return r; return B.saveSocial(id, { ...d, ...r }).then(() => draw(el)); }));
          if (a === 'rm') return ask('Delete "' + s.name + '"?', async () => { await B.deleteSocial(id); draw(el); });
          if (a === 'tg') { await B.saveSocial(id, { ...strip(s), enabled: s.enabled === false }); return draw(el); }
          if (a === 'up' || a === 'dn') { const i = ss.indexOf(s), c = ss[a === 'up' ? i - 1 : i + 1]; if (!c) return; await B.saveSocial(s.id, { ...strip(s), order: c.order }); await B.saveSocial(c.id, { ...strip(c), order: s.order }); draw(el); }
        } catch (e) { fail(e); }
      });
    });

    add('branding', 'Branding', async function draw(el) {
      el.innerHTML = head('Branding') + loading();
      let br; try { br = await B.brand(); } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); return; }
      const F = [['logo', 'Site logo (direct image URL)'], ['favicon', 'Favicon (direct image URL)'], ['projectIcon', 'Default project icon'], ['avatar', 'Default user avatar']];
      el.innerHTML = head('Branding') + `<form class="p3-form glass-card" id="bf">${F.map(([k, l]) => fld('b_' + k, l, br[k] || '', 'url')).join('')}<div class="p3-err" id="be"></div><button class="btn btn-primary">Save branding</button></form>`;
      el.querySelector('#bf').onsubmit = async e => { e.preventDefault(); const o = {}; for (const [k] of F) { const v = el.querySelector('#b_' + k).value.trim(); if (!urlOk(v)) { el.querySelector('#be').textContent = 'All image URLs must start with http(s)://'; return; } if (v) o[k] = v; } try { await B.saveBrand(o); toast('Branding saved'); } catch (x) { fail(x); } };
    });

    add('reports', 'Reports', async function draw(el) {
      el.innerHTML = head('Reports') + loading();
      let rs; try { rs = await B.reports(); } catch (e) { el.innerHTML = empty('Could not load reports: ' + e.message); return; }
      el.innerHTML = head('Reports (' + rs.length + ')') + (rs.map(r => `<div class="p3-row"><div class="p3-grow"><b>${esc(r.type)}</b> · ${esc(r.target)}<div class="p3-muted">${esc(r.reason)} · ${when(r.createdAt)}</div></div><div class="p3-actions">${r.type === 'project' ? `<a class="btn btn-secondary btn-sm" href="/pages/project.html?slug=${encodeURIComponent(r.target)}">Open</a>` : ''}<button class="btn btn-ghost btn-sm" data-a="res" data-id="${r.id}">Resolve</button></div></div>`).join('') || empty('No open reports. 🎉'));
      bind(el, (a, id) => ask('Mark this report as resolved?', async () => { try { await B.resolveReport(id); draw(el); } catch (e) { fail(e); } }));
    });
  }

  /* ============================== DEVELOPER ============================== */
  if (kind === 'developer') {
    add('overview', 'Overview', async el => {
      el.innerHTML = head('Developer Overview') + verifyBanner() + loading();
      try {
        const [ps, pub] = await Promise.all([B.myOwn(), B.listPublic()]), mine = pub.filter(p => p.ownerUid === me.id);
        el.innerHTML = head('Developer Overview') + verifyBanner() + `<div class="grid grid-cols-3" style="margin-bottom:24px">${stat(ps.length, 'Projects')}${stat(ps.filter(p => p.status === 'approved').length, 'Published')}${stat(ps.filter(p => p.status === 'pending').length, 'Awaiting approval')}${stat(mine.reduce((a, p) => a + (p.downloads || 0), 0), 'Total downloads')}${stat(mine.reduce((a, p) => a + (p.reviewCount || 0), 0), 'Reviews')}${stat(me.role === 'admin' ? 'Admin' : 'Approved', 'Developer status')}</div><a class="btn btn-primary" href="#projects">Manage projects</a>`;
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('projects', 'My Projects', async function draw(sec) {
      sec.innerHTML = head('My Projects') + loading();
      let ps, cat; try { [ps, cat] = await Promise.all([B.myOwn(), B.catalog()]); } catch (e) { sec.innerHTML = empty('Could not load: ' + e.message); return; }
      ps.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const pf = p => `<div class="form-group"><label class="form-label">Category</label>${cat.categories.map(c => `<label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="radio" name="cat" value="${c.id}" data-ed="${c.edition}" ${p.category === c.id ? 'checked' : ''}>${im(c.logo).replace('p3-img', 'p3-img" style="width:28px;height:28px')} ${esc(c.name)} <small>(${esc(c.edition)})</small></label>`).join('') || '<div class="p3-muted">The admin has not created categories yet.</div>'}</div>` + fld('n', 'Name', p.name || '') + fld('d', 'Short description', p.description || '') + fld('ic', 'Icon (direct image URL)', p.icon || '', 'url') + fld('bn', 'Banner (direct image URL)', p.banner || '', 'url') + fld('ss', 'Screenshot URLs (one per line, max 10)', (p.screenshots || []).join('\n'), 'ta') + fld('tg', 'Tags (comma separated)', (p.tags || []).join(', ')) + fld('li', 'License', p.license || '') + fld('rm', 'README (Markdown)', p.readme || '', 'ta') + '<div class="p3-muted">Preview:</div><div id="mp" class="p3-muted"></div>';
      const read = o => {
        const r = o.querySelector('[name=cat]:checked'); if (!r) return 'Choose a category';
        let ed = r.dataset.ed; if (ed === 'both') ed = /bedrock/i.test(val(o, 'li')) ? 'bedrock' : 'java';
        const ss = val(o, 'ss').split('\n').map(s => s.trim()).filter(Boolean), tags = val(o, 'tg').split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
        if (val(o, 'n').length < 3) return 'Name needs 3+ characters';
        if (![val(o, 'ic'), val(o, 'bn'), ...ss].every(urlOk) || ss.length > 10) return 'Image URLs must start with http(s)://';
        if (tags.some(t => t.length > 30)) return 'Each tag must be 30 characters or fewer';
        return { category: r.value, edition: ed === 'bedrock' ? 'bedrock' : 'java', name: val(o, 'n'), description: val(o, 'd'), icon: val(o, 'ic'), banner: val(o, 'bn'), screenshots: ss, tags, license: val(o, 'li'), readme: val(o, 'rm') };
      };
      sec.innerHTML = head('My Projects', 'New project') + verifyBanner() + (ps.map(p => `<div class="p3-row">${im(p.icon)}<div class="p3-grow"><b>${esc(p.name)}</b> <span class="badge">${esc(p.status)}</span><div class="p3-muted">${esc(p.category)} · updated ${when(p.updatedAt)}</div></div><div class="p3-actions">${p.status === 'approved' ? `<a class="btn btn-secondary btn-sm" href="/pages/project.html?slug=${encodeURIComponent(p.id)}">View</a>` : ''}<button class="btn btn-secondary btn-sm" data-a="ver" data-id="${p.id}">Versions & files</button><button class="btn btn-ghost btn-sm" data-a="ed" data-id="${p.id}">Edit</button><button class="btn btn-ghost btn-sm" data-a="rm" data-id="${p.id}">Delete</button></div></div>`).join('') || empty('No projects yet. Create your first one.'));
      const withPrev = o => { const t = o.querySelector('#rm'), m = o.querySelector('#mp'); const f = () => m.innerHTML = mdSafe(t.value); t.addEventListener('input', f); f(); return o; };
      bind(sec, async (a, id) => {
        const p = ps.find(x => x.id === id) || {};
        if (a === 'add' || a === 'ed') return withPrev(modal(a === 'add' ? 'New project' : 'Edit project', pf(p), o => { const r = read(o); if (typeof r === 'string') return r; return B.saveProject({ ...p, ...r, id: p.id }).then(() => { toast('Saved. Awaiting admin approval'); draw(sec); }); }));
        if (a === 'rm') return ask('Delete "' + p.name + '" and unpublish it?', () => B.deleteProject(id).then(() => { window.projectService.invalidate(); draw(sec); }).catch(fail));
        if (a === 'ver') {
          const [vs, mc] = await Promise.all([B.versions(id), B.mcVersions(p.edition)]);
          const pl = cat.platforms.filter(x => !x.categories || x.categories[p.category]); const fl = {}; for (const v of vs) fl[v.id] = await B.files(id, v.id);
          const o = modal('Versions: ' + p.name, vs.map(v => `<div class="p3-row"><div class="p3-grow"><b>v${esc(v.version)}</b><div class="p3-muted">MC ${esc(Object.keys(v.mc || {}).join(', '))} · ${esc(Object.keys(v.platforms || {}).join(', '))}</div>${(fl[v.id] || []).map(f => `<div class="p3-muted">📦 ${esc(f.name)} (${(f.size / 1048576).toFixed(1)} MB) <a href="#" data-del="${v.id}|${f.id}">remove</a></div>`).join('')}</div><input type="file" data-up="${v.id}" accept=".jar,.zip,.mcpack,.mcaddon,.mcworld,.mctemplate,.mrpack,.7z"></div>`).join('') || '<div class="p3-muted">No versions yet.</div>'
            + '<hr><h4>Add version</h4>' + fld('vn', 'Version number', '1.0.0') + `<div class="form-group"><label class="form-label">Minecraft versions (hold Ctrl/Cmd to select several)</label><select id="vm" class="input" multiple size="6">${mc.slice(0, 80).map(x => `<option>${esc(x)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Platforms</label>${pl.map(x => `<label style="display:block"><input type="checkbox" data-p="${x.id}"> ${esc(x.name)}</label>`).join('') || '<span class="p3-muted">No platforms configured.</span>'}</div>` + fld('vc', 'Changelog', '', 'ta') + '<progress id="pg" value="0" max="1" style="width:100%;display:none"></progress>',
            x => { const m = [...x.querySelector('#vm').selectedOptions].map(z => z.value), pp = [...x.querySelectorAll('[data-p]:checked')].map(z => z.dataset.p); if (!val(x, 'vn')) return 'Version number required'; if (!m.length) return 'Select at least one Minecraft version'; return B.saveVersion(id, slug(val(x, 'vn')) || 'v', { version: val(x, 'vn'), mc: m, platforms: pp, changelog: val(x, 'vc') }).then(() => { toast('Version saved'); window.projectService.invalidate(); draw(sec); }); }, 'Add version');
          o.querySelectorAll('[data-up]').forEach(i => i.onchange = async () => { const f = i.files[0]; if (!f) return; const pg = o.querySelector('#pg'); pg.style.display = 'block'; try { await B.uploadFile(f, { projectId: id, versionId: i.dataset.up, onProgress: v => pg.value = v }); toast('Uploaded'); o.remove(); draw(sec); } catch (e) { fail(e); pg.style.display = 'none'; } });
          o.querySelectorAll('[data-del]').forEach(l => l.onclick = e => { e.preventDefault(); const [v, f] = l.dataset.del.split('|'); ask('Remove this file?', () => B.deleteFile(id, v, f).then(() => { o.remove(); draw(sec); }).catch(fail)); });
        }
      });
    });

    add('comments', 'Comments', async function draw(el) {
      el.innerHTML = head('Comments on my projects') + loading();
      let all = []; try { const ps = await B.myOwn(); for (const p of ps) (await B.comments(p.id)).forEach(c => all.push({ ...c, pid: p.id, pname: p.name })); } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); return; }
      all.sort((a, b) => b.createdAt - a.createdAt);
      el.innerHTML = head('Comments on my projects') + (all.map(c => `<div class="p3-row"><div class="p3-grow"><b>${esc(c.userName)}</b> on ${esc(c.pname)} <span class="p3-muted">${when(c.createdAt)}</span><p>${esc(c.text)}</p></div><div class="p3-actions">${c.uid !== me.id ? `<button class="btn btn-secondary btn-sm" data-a="re" data-id="${c.pid}|${c.id}">Reply</button>` : ''}<button class="btn btn-ghost btn-sm" data-a="rm" data-id="${c.pid}|${c.id}">Delete</button></div></div>`).join('') || empty('No comments yet.'));
      bind(el, (a, key) => { const [pid, cid] = key.split('|'), c = all.find(x => x.pid === pid && x.id === cid); if (a === 're') return modal('Reply to ' + c.userName, fld('rt', 'Reply', '', 'ta'), o => { const t = val(o, 'rt'); if (!t) return 'Write a reply first'; return B.comment(pid, '@' + c.userName + ' ' + t.slice(0, 900)).then(() => draw(el)); }, 'Reply'); if (a === 'rm') ask('Delete this comment?', () => B.deleteComment(pid, cid).then(() => draw(el)).catch(fail)); });
    });
  }

  /* ============================== USER (everyone) ============================== */
  if (kind === 'user') {
    add('overview', 'Overview', async el => {
      el.innerHTML = head('Dashboard') + verifyBanner() + loading();
      try {
        const m = await B.myMeta(), n = Object.values(m.notifications || {});
        el.innerHTML = head('Welcome, ' + esc(me.displayName || me.username)) + verifyBanner() + `<div class="grid grid-cols-3" style="margin-bottom:24px">${stat(Object.keys(m.favorites || {}).length, 'Favorites')}${stat(Object.keys(m.following || {}).length, 'Following')}${stat(n.filter(x => !x.read).length, 'Unread notifications')}</div>`
          + (me.role === 'user' ? `<div class="glass-card"><h3>Become a creator</h3><p class="p3-muted">Share your own mods, packs and maps with the community.</p><a class="btn btn-primary" href="/pages/developer-application.html">Apply as developer</a></div>` : '<a class="btn btn-primary" href="/pages/developer-dashboard.html">Open developer dashboard</a>');
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('favorites', 'Favorites', async function draw(el) {
      el.innerHTML = head('Favorites') + loading();
      try {
        const m = await B.myMeta(), ids = Object.keys(m.favorites || {}), all = await window.projectService.all(), ps = all.filter(p => ids.includes(p.id));
        el.innerHTML = head('Favorites') + (ps.length ? `<div class="grid grid-cols-3">${ps.map(p => Utils.createProjectCard(p)).join('')}</div>` : empty('No favorites yet. Open a project and tap Favorite.'));
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('downloads', 'Downloads', async function draw(el) {
      el.innerHTML = head('Download history') + loading();
      try {
        const m = await B.myMeta(), d = Object.values(m.downloads || {}).sort((a, b) => b.at - a.at).slice(0, 50), all = await window.projectService.all();
        el.innerHTML = head('Download history') + (d.map(x => { const p = all.find(y => y.id === x.projectId); return `<div class="p3-row">${im(p && p.icon)}<div class="p3-grow"><b>${esc(p ? p.name : 'Removed project')}</b><div class="p3-muted">${esc(x.name)} · ${when(x.at)}</div></div>${p ? `<a class="btn btn-secondary btn-sm" href="/pages/project.html?slug=${encodeURIComponent(p.id)}">View</a>` : ''}</div>`; }).join('') || empty('No downloads yet.'));
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('following', 'Following', async function draw(el) {
      el.innerHTML = head('Following') + loading();
      try {
        const m = await B.myMeta(), ids = Object.keys(m.following || {}), pf = await Promise.all(ids.map(async id => ({ id, ...(await B.publicProfile(id) || {}) })));
        el.innerHTML = head('Following creators') + (pf.map(c => `<div class="p3-row">${im(c.avatar)}<div class="p3-grow"><b>${esc(c.displayName || c.username || 'Creator')}</b></div><button class="btn btn-secondary btn-sm" data-a="un" data-id="${c.id}">Unfollow</button></div>`).join('') || empty('You are not following anyone yet.'));
        bind(el, async (a, id) => { try { await B.toggleFollow(id); draw(el); } catch (e) { fail(e); } });
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('notifications', 'Notifications', async function draw(el) {
      el.innerHTML = head('Notifications') + loading();
      try {
        const m = await B.myMeta(), n = Object.entries(m.notifications || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.at - a.at);
        el.innerHTML = head('Notifications', n.some(x => !x.read) ? 'Mark all read' : '', 'all') + (n.map(x => `<div class="p3-row"><div class="p3-grow">${x.read ? '' : '● '}${esc(x.text)}<div class="p3-muted">${when(x.at)}</div></div><button class="btn btn-ghost btn-sm" data-a="rm" data-id="${x.id}">Dismiss</button></div>`).join('') || empty('You are all caught up.'));
        bind(el, async (a, id) => { try { if (a === 'all') await B.markNotifications(n.filter(x => !x.read).map(x => x.id)); else await B.removeNotification(id); draw(el); } catch (e) { fail(e); } });
      } catch (e) { el.innerHTML = empty('Could not load: ' + e.message); }
    });

    add('profile', 'Profile', async function (el) {
      const m = await B.myMeta().catch(() => ({}));
      el.innerHTML = head('Profile') + `<form class="p3-form glass-card" id="pf">${fld('dn', 'Display name', me.displayName || '')}${fld('em', 'Email', me.email, 'email', 'Your login email cannot be changed here')}${fld('mc', 'Minecraft username / Gamertag', me.minecraftUsername || '')}${fld('av', 'Avatar (direct image URL)', me.avatar || '', 'url').replace('<input', '<input data-live="1"')}<img id="avp" class="p3-prev" src="${esc(me.avatar || FB)}" alt="">${fld('bio', 'Bio', m.bio || '', 'ta')}<div class="p3-err" id="pe"></div><button class="btn btn-primary">Save profile</button></form><p style="margin-top:16px"><a class="btn btn-secondary" href="/pages/account-settings.html">Change password & account</a></p>`;
      el.querySelector('#em').disabled = true;
      el.querySelector('#av').addEventListener('input', e => { el.querySelector('#avp').src = urlOk(e.target.value) && e.target.value ? e.target.value : FB; });
      el.querySelector('#pf').onsubmit = async e => {
        e.preventDefault(); const a = val(el, 'av'), dn = val(el, 'dn');
        if (!dn || dn.length > 40) { el.querySelector('#pe').textContent = 'Display name must be 1-40 characters'; return; }
        if (!urlOk(a)) { el.querySelector('#pe').textContent = 'Avatar must be a direct http(s) image URL'; return; }
        const r = await window.authService.updateProfile({ displayName: dn, minecraftUsername: val(el, 'mc'), avatar: a, bio: val(el, 'bio').slice(0, 300) });
        if (r.success) { toast('Profile saved'); Object.assign(me, r.user); document.getElementById('dash-name').textContent = r.user.displayName; document.getElementById('dash-avatar').src = r.user.avatar; Utils.updateNavbarUser(); el.querySelector('#pe').textContent = ''; } else el.querySelector('#pe').textContent = r.error;
      };
    });
  }

  /* ============================== router ============================== */
  nav.innerHTML = sections.map(s => `<li class="dashboard-nav-item"><a href="#${s.id}" class="dashboard-nav-link" data-section="${s.id}">${esc(s.label)}</a></li>`).join('');
  async function route() {
    const id = (location.hash || '').slice(1), s = sections.find(x => x.id === id) || sections[0];
    nav.querySelectorAll('.dashboard-nav-link').forEach(a => a.classList.toggle('active', a.dataset.section === s.id));
    main.innerHTML = loading();
    const el = document.createElement('section'); el.className = 'dashboard-section'; main.innerHTML = ''; main.appendChild(el);
    try { await s.render(el); } catch (e) { console.error(e); el.innerHTML = empty('Something went wrong: ' + e.message); }

  }
  window.addEventListener('hashchange', route);
  route();
})();
