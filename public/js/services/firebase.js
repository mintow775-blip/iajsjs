// Firebase client layer (ES module): real Auth + Cloud Firestore. Security is enforced by firestore.rules and Vercel Functions, never by this file.
// The public API (window.ARX_BACKEND) is the same as before, so the pages did not need to change.
//
// Firestore layout (collection/doc):
//   users/{uid} (+ subcollections favorites, following, notifications, downloads)   usernames/{name}   publicProfiles/{uid}   developerApplications/{uid}
//   site/brand   banners/{id}   socials/{id}   catalogCategories/{id}   catalogPlatforms/{id}   catalogMcVersions/{id}
//   projects/{id}   projectsPublic/{id}   projectVersions/{pid}/items/{vid}   projectFiles/{pid}/versions/{vid}/files/{fid}
//   reviews/{pid}/items/{uid}   reviewVotes/{pid}/items/{ruid}__{voter}   comments/{pid}/items/{cid}   reports/{id}   uploads/{uid}/items/{uploadId}
const FB = window.ARX_FIREBASE, V = FB.sdkVersion, G = `https://www.gstatic.com/firebasejs/${V}/`;
const done = ok => window.__arxResolve && window.__arxResolve(ok);
const bad = !FB.config.projectId || !FB.config.apiKey;
function banner(msg) { document.addEventListener('DOMContentLoaded', () => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;text-align:center'; d.textContent = msg; document.body.prepend(d); }); }
if (bad) { banner('Backend not configured: set apiKey and projectId in js/config/firebase-config.js'); window.ARX_BACKEND = null; done(false); }
else {
  const [{ initializeApp }, A, F] = await Promise.all([import(G + 'firebase-app.js'), import(G + 'firebase-auth.js'), import(G + 'firebase-firestore.js')]);
  const app = initializeApp(FB.config), auth = A.getAuth(app);
  // Long-polling auto-detect keeps Firestore working behind proxies / school / mobile networks that break WebChannel streams.
  const db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
  if (FB.enableAnalytics && FB.config.measurementId) import(G + 'firebase-analytics.js').then(m => m.getAnalytics(app)).catch(() => {});
  const now = () => Date.now();
  const dref = p => F.doc(db, p), cref = p => F.collection(db, p);
  const odd = p => p.split('/').filter(Boolean).length % 2 === 1;
  // rd('a/b') -> document data or null.  rd('a') (a collection) -> { id: data } map, like the old Realtime Database did.
  const rd = async p => {
    if (odd(p)) { const s = await F.getDocs(cref(p)); return Object.fromEntries(s.docs.map(d => [d.id, d.data()])); }
    const s = await F.getDoc(dref(p)); return s.exists() ? s.data() : null;
  };
  const rl = async p => (await F.getDocs(cref(p))).docs.map(d => ({ id: d.id, ...d.data() }));   // collection -> [{id, ...data}]
  const list = o => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));
  const batch = () => F.writeBatch(db);
  const byOrder = (a, b) => (a.order || 0) - (b.order || 0);
  const CAT = k => 'catalog' + k.charAt(0).toUpperCase() + k.slice(1);   // categories | platforms | mcVersions
  const token = () => auth.currentUser ? auth.currentUser.getIdToken() : Promise.reject(new Error('Login required'));
  const adminMails = (FB.adminEmails || []).map(x => String(x).toLowerCase());
  const isAdminMail = u => !!u && !!u.email && adminMails.includes(u.email.toLowerCase());   // admin email: no OTP / verification needed
  async function api(path, { method = 'GET', body, headers = {}, raw } = {}) {
    const r = await fetch('/api/' + path, { method, body: raw ? body : (body && JSON.stringify(body)), headers: { Authorization: 'Bearer ' + await token(), ...(raw ? {} : body ? { 'content-type': 'application/json' } : {}), ...headers } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || ('Request failed (' + r.status + ')')); return j;
  }
  // First sign-in for accounts that have no profile yet (e.g. created in the Firebase console): create it so roles/UI work.
  async function ensureProfile(u, p) {
    if (p && p.username) return p;
    let un = String(u.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
    un = un.padEnd(3, '0') + Math.random().toString(36).slice(2, 6);
    try {
      const b = batch(), dn = u.displayName || un;
      b.set(dref('usernames/' + un), { uid: u.uid });
      b.set(dref('users/' + u.uid), { username: un, email: u.email, createdAt: now(), displayName: dn }, { merge: true });
      b.set(dref('publicProfiles/' + u.uid), { username: un, displayName: dn });
      await b.commit();
    } catch (e) { console.warn('ensureProfile', e); }
    return { ...(p || {}), username: un, displayName: (p && p.displayName) || u.displayName || un, createdAt: now() };
  }
  let adminSynced = false;
  async function hydrate(u) {
    if (!u) { localStorage.removeItem('arxmine_user'); if (window.authService) authService.currentUser = null; return null; }
    let p = (await rd('users/' + u.uid).catch(() => null)) || {};
    p = await ensureProfile(u, p);
    let role = ['admin', 'developer'].includes(p.role) ? p.role : 'user';
    if (isAdminMail(u)) { role = 'admin'; if (p.role !== 'admin' && !adminSynced) { adminSynced = true; api('bootstrap-admin', { method: 'POST' }).catch(() => {}); } }
    const o = { id: u.uid, uid: u.uid, username: p.username, displayName: p.displayName || p.username, email: u.email, avatar: p.avatar || (window.CONFIG && CONFIG.images && CONFIG.images.defaultAvatar) || '', minecraftUsername: p.minecraftUsername || '', role, isDeveloper: role !== 'user', developerStatus: p.developerStatus || 'none', emailVerified: true, needsVerify: false, joinedAt: new Date(p.createdAt || now()).toISOString(), suspended: !!p.suspended };
    localStorage.setItem('arxmine_user', JSON.stringify(o)); if (window.authService) authService.currentUser = o; return o;
  }
  const B = window.ARX_BACKEND = {
    auth, db, api, token, hydrate, read: rd, list, RT: F, FS: F, adminMails,
    async register({ email, password, username, displayName, minecraftUsername }) {
      const un = String(username || '').toLowerCase(); if (!/^[a-z0-9_]{3,20}$/.test(un)) throw new Error('Username: 3-20 chars, a-z 0-9 _');
      if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
      const c = await A.createUserWithEmailAndPassword(auth, email, password), uid = c.user.uid;
      try {
        const b = batch(), dn = displayName || un;
        b.set(dref('usernames/' + un), { uid });
        b.set(dref('users/' + uid), { username: un, email: c.user.email, createdAt: now(), displayName: dn, minecraftUsername: minecraftUsername || '' });
        b.set(dref('publicProfiles/' + uid), { username: un, displayName: dn, minecraftUsername: minecraftUsername || '' });
        await b.commit();
      } catch (e) { await c.user.delete().catch(() => {}); throw new Error('Username already taken or invalid'); }
      return hydrate(c.user);
    },
    async login(email, password) {
      let c;
      try { c = await A.signInWithEmailAndPassword(auth, email, password); }
      catch (e) {
        // Owner admin email: the server creates/repairs that account (password from the ADMIN_PASSWORD env var), then we sign in again.
        if (adminMails.includes(String(email).toLowerCase()) && /invalid-credential|user-not-found|wrong-password|invalid-login/.test(String(e.code))) {
          const r = await fetch('/api/admin-setup', { method: 'POST' }).catch(() => null);
          if (r && r.ok) c = await A.signInWithEmailAndPassword(auth, email, password); else throw e;
        } else throw e;
      } const u = await hydrate(c.user); if (u.suspended) { await A.signOut(auth); await hydrate(null); throw new Error('Account suspended'); } return u; },
    logout: async () => { await A.signOut(auth); localStorage.removeItem('arxmine_user'); },
    sendReset: e => A.sendPasswordResetEmail(auth, e), applyReset: (code, pw) => A.confirmPasswordReset(auth, code, pw), applyCode: c => A.applyActionCode(auth, c),
    // (no email/OTP verification step)
    async changePassword(oldPw, newPw) { const u = auth.currentUser; await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, oldPw)); return A.updatePassword(u, newPw); },
    async updateProfile({ displayName, minecraftUsername, avatar, bio }) {
      const u = auth.currentUser, b = batch(), mine = {}, pub = {};
      if (displayName != null) { mine.displayName = displayName; pub.displayName = displayName; }
      if (minecraftUsername != null) { mine.minecraftUsername = minecraftUsername; pub.minecraftUsername = minecraftUsername; }
      if (avatar != null) { mine.avatar = avatar; pub.avatar = avatar; }
      if (bio != null) mine.bio = bio;
      if (Object.keys(mine).length) b.set(dref('users/' + u.uid), mine, { merge: true });
      if (Object.keys(pub).length) b.set(dref('publicProfiles/' + u.uid), pub, { merge: true });
      await b.commit(); return hydrate(u);
    },
    applyDeveloper: d => F.setDoc(dref('developerApplications/' + auth.currentUser.uid), { name: d.name, pitch: d.pitch, links: d.links || '', status: 'pending', createdAt: now() }),
    myApplication: async () => rd('developerApplications/' + auth.currentUser.uid),
    // ---- site content managed from the admin panel: brand, banners, social links ----
    brand: async () => (await rd('site/brand')) || {}, saveBrand: o => F.setDoc(dref('site/brand'), o),
    async banners({ all = false } = {}) { return (await rl('banners')).filter(x => all || x.enabled !== false).sort(byOrder); },
    saveBanner: (id, d) => F.setDoc(dref('banners/' + id), d), deleteBanner: id => F.deleteDoc(dref('banners/' + id)),
    async socials({ all = false } = {}) { return (await rl('socials')).filter(x => all || x.enabled !== false).sort(byOrder); },
    saveSocial: (id, d) => F.setDoc(dref('socials/' + id), d), deleteSocial: id => F.deleteDoc(dref('socials/' + id)),
    // ---- dynamic catalog ----
    async catalog({ all = false } = {}) { const [c, p] = await Promise.all([rl(CAT('categories')), rl(CAT('platforms'))]); const f = a => a.filter(x => all || x.enabled).sort(byOrder); return { categories: f(c), platforms: f(p) }; },
    saveCatalog: (kind, id, data) => F.setDoc(dref(`${CAT(kind)}/${id}`), data), deleteCatalog: (kind, id) => F.deleteDoc(dref(`${CAT(kind)}/${id}`)),
    async mcVersions(edition = 'java') {
      if (edition === 'java') try { const r = await fetch('/api/mc-versions'); if (r.ok) return (await r.json()).versions.map(v => v.id); } catch (e) {}
      return (await rl(CAT('mcVersions'))).filter(v => v.enabled && (v.edition === edition || v.edition === 'both')).sort(byOrder).map(v => v.id);
    },
    // ---- projects ----
    saveProject: async p => {
      const u = auth.currentUser, id = p.id || F.doc(cref('projects')).id, old = p.id ? await rd('projects/' + id) : null;
      const me = JSON.parse(localStorage.getItem('arxmine_user') || '{}');
      const d = { ...p, ownerUid: old?.ownerUid || u.uid, ownerName: old?.ownerName || me.username || '', status: 'pending', createdAt: old?.createdAt || now(), updatedAt: now() }; delete d.id;
      for (const k of Object.keys(d)) if (d[k] === undefined) delete d[k];
      await F.setDoc(dref('projects/' + id), d); return id;
    },
    deleteProject: async id => { await F.deleteDoc(dref('projectsPublic/' + id)).catch(() => {}); await F.deleteDoc(dref('projects/' + id)); },
    myProjects: async () => rl('projects'),
    async myOwn() { return (await F.getDocs(F.query(cref('projects'), F.where('ownerUid', '==', auth.currentUser.uid)))).docs.map(d => ({ id: d.id, ...d.data() })); },
    async approve(id, yes) {
      const p = await rd('projects/' + id); if (!p) return;
      const b = batch();
      if (yes) {
        const prev = await rd('projectsPublic/' + id);
        b.set(dref('projectsPublic/' + id), { ...p, status: 'approved', downloads: (prev && prev.downloads) || 0, approvedAt: now() });
        b.update(dref('projects/' + id), { status: 'approved' });
        await b.commit(); await api('sync-project', { method: 'POST', body: { projectId: id } }).catch(() => {});
      } else { b.delete(dref('projectsPublic/' + id)); b.update(dref('projects/' + id), { status: 'rejected' }); await b.commit(); }
    },
    listPublic: async () => rl('projectsPublic'), getPublic: async id => { const p = await rd('projectsPublic/' + id); return p && { id, ...p }; },
    sync: pid => api('sync-project', { method: 'POST', body: { projectId: pid } }).catch(() => {}),
    async saveVersion(pid, vid, v) { await F.setDoc(dref(`projectVersions/${pid}/items/${vid}`), { version: v.version, changelog: v.changelog || '', mc: Object.fromEntries(v.mc.map(x => [x, true])), platforms: Object.fromEntries(v.platforms.map(x => [x, true])), createdAt: now() }); await B.sync(pid); },
    versions: async pid => (await rl(`projectVersions/${pid}/items`)).sort((a, b) => b.createdAt - a.createdAt), files: async (pid, vid) => rl(`projectFiles/${pid}/versions/${vid}/files`),
    // ---- files (Backblaze B2 through Vercel Functions) ----
    async uploadFile(file, { projectId, versionId, onProgress = () => {} }) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['jar', 'zip', 'mcpack', 'mcaddon', 'mcworld', 'mctemplate', 'mrpack', '7z'].includes(ext)) throw new Error('File type not allowed'); if (file.size > 20 * 1024 * 1024 || !file.size) throw new Error('File must be under 20 MB');
      const id = crypto.randomUUID(), size = 3 * 1024 * 1024, n = Math.ceil(file.size / size);
      for (let i = 0; i < n; i++) { await api('upload-chunk', { method: 'POST', raw: true, body: file.slice(i * size, (i + 1) * size), headers: { 'x-upload-id': id, 'x-chunk-index': String(i), 'content-type': 'application/octet-stream' } }); onProgress((i + 1) / n * 0.8); }
      await api('upload-finalize', { method: 'POST', body: { uploadId: id, chunks: n, projectId, versionId, filename: file.name } }).catch(() => {});
      const path = `uploads/${auth.currentUser.uid}/items/${id}`; for (let t = 0; t < 90; t++) { await new Promise(r => setTimeout(r, 2000)); const s = await rd(path); onProgress(0.8 + Math.min(t / 90, 1) * 0.2); if (s?.state === 'done') return s; if (s?.state === 'error') throw new Error(s.message || 'Upload failed'); }
      throw new Error('Upload timed out. Check the version\'s files before retrying.');
    },
    async download(p, v, a) { const j = await api(`download?p=${encodeURIComponent(p)}&v=${encodeURIComponent(v)}&a=${encodeURIComponent(a)}`); window.projectService && projectService.invalidate(); location.href = j.url; return j; },
    deleteFile: (projectId, versionId, assetKey) => api('file-delete', { method: 'POST', body: { projectId, versionId, assetKey } }),
    adminUser: (action, uid, role) => api('admin-user', { method: 'POST', body: { action, uid, role } }),
    // ---- community ----
    async saveReview(pid, { stars, text }) { const me = JSON.parse(localStorage.getItem('arxmine_user') || '{}'); await F.setDoc(dref(`reviews/${pid}/items/${auth.currentUser.uid}`), { stars: Number(stars), text, userName: me.username || '', createdAt: now() }); await B.sync(pid); },
    async deleteReview(pid, uid) { await F.deleteDoc(dref(`reviews/${pid}/items/${uid}`)); await B.sync(pid); }, reviews: async pid => (await rl(`reviews/${pid}/items`)).sort((a, b) => b.createdAt - a.createdAt),
    vote: (pid, ruid, helpful) => F.setDoc(dref(`reviewVotes/${pid}/items/${ruid}__${auth.currentUser.uid}`), { ruid, voter: auth.currentUser.uid, helpful: !!helpful }),
    async votes(pid) { const o = {}; for (const d of (await F.getDocs(cref(`reviewVotes/${pid}/items`))).docs) { const v = d.data(); (o[v.ruid] = o[v.ruid] || {})[v.voter] = !!v.helpful; } return o; },
    report: (type, target, reason) => F.addDoc(cref('reports'), { type, target, reason, by: auth.currentUser.uid, createdAt: now(), status: 'open' }),
    reports: async () => (await rl('reports')).sort((a, b) => b.createdAt - a.createdAt), resolveReport: id => F.deleteDoc(dref('reports/' + id)),
    comment: (pid, text) => { const me = JSON.parse(localStorage.getItem('arxmine_user') || '{}'); return F.addDoc(cref(`comments/${pid}/items`), { uid: auth.currentUser.uid, userName: me.username || '', text, createdAt: now() }); },
    comments: async pid => (await rl(`comments/${pid}/items`)).sort((a, b) => b.createdAt - a.createdAt), deleteComment: (pid, cid) => F.deleteDoc(dref(`comments/${pid}/items/${cid}`)),
    isFavorite: async pid => !!(await rd(`users/${auth.currentUser.uid}/favorites/${pid}`)),
    async toggleFavorite(pid) { const p = `users/${auth.currentUser.uid}/favorites/${pid}`, on = !(await rd(p)); on ? await F.setDoc(dref(p), { v: true }) : await F.deleteDoc(dref(p)); return on; },
    async toggleFollow(cid) { const p = `users/${auth.currentUser.uid}/following/${cid}`, on = !(await rd(p)); on ? await F.setDoc(dref(p), { v: true }) : await F.deleteDoc(dref(p)); return on; },
    // Same shape as the old Realtime Database user node: the profile fields plus favorites / following / notifications / downloads maps.
    async myMeta() {
      const base = 'users/' + auth.currentUser.uid, [d, fav, fol, not, dl] = await Promise.all([rd(base), rd(base + '/favorites'), rd(base + '/following'), rd(base + '/notifications'), rd(base + '/downloads')]);
      const m = { ...(d || {}) }, has = o => o && Object.keys(o).length;
      if (has(fav)) m.favorites = Object.fromEntries(Object.keys(fav).map(k => [k, true]));
      if (has(fol)) m.following = Object.fromEntries(Object.keys(fol).map(k => [k, true]));
      if (has(not)) m.notifications = not; if (has(dl)) m.downloads = dl;
      return m;
    },
    publicProfile: async uid => rd('publicProfiles/' + uid),
    markNotifications: async ids => { const b = batch(); ids.forEach(i => b.update(dref(`users/${auth.currentUser.uid}/notifications/${i}`), { read: true })); await b.commit(); },
    removeNotification: id => F.deleteDoc(dref(`users/${auth.currentUser.uid}/notifications/${id}`))
  };
  window.ARX_BACKEND = B;
  let first = true;
  A.onAuthStateChanged(auth, async u => {
    try { await hydrate(u); } catch (e) { console.error(e); }
    if (first) { first = false; done(true); } else if (window.Utils && Utils.updateNavbarUser) Utils.updateNavbarUser();
  });
}
