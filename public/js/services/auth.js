// AR X Mine: auth + project facade. Real Firebase only (no demo users, no demo data).
// This classic script runs first on every page; js/services/firebase.js (ES module) fills in window.ARX_BACKEND and resolves ARX_READY.
window.ARX_READY = window.ARX_READY || new Promise(r => { window.__arxResolve = r; });

class AuthService {
  constructor() { this.currentUser = null; this.loadCurrentUser(); }
  // Cached user for instant navbar rendering. The real session is verified by Firebase (see ARX_READY); pages that must be protected use authService.require().
  loadCurrentUser() {
    try { this.currentUser = JSON.parse(localStorage.getItem('arxmine_user') || 'null'); } catch (e) { this.currentUser = null; }
  }
  getCurrentUser() { return this.currentUser; }
  isLoggedIn() { return !!this.currentUser; }
  isDeveloper() { return !!this.currentUser && ['developer', 'admin'].includes(this.currentUser.role); }
  isAdmin() { return !!this.currentUser && this.currentUser.role === 'admin'; }
  async backend() {
    const ok = await window.ARX_READY;
    if (!ok || !window.ARX_BACKEND) throw new Error('Backend is not configured');
    return window.ARX_BACKEND;
  }
  clean(e) { return String((e && e.message) || e).replace('Firebase: ', '').replace(/\s*\(auth\/[^)]*\)\.?/, '').trim() || 'Something went wrong'; }
  async login(email, password) {
    try {
      email = String(email || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { success: false, error: 'Please log in with your email address' };
      return { success: true, user: await (await this.backend()).login(email, password) };
    } catch (e) {
      const c = String((e && e.code) || '');
      const m = /invalid-credential|wrong-password|user-not-found|invalid-login/.test(c) ? 'Wrong email or password' : /too-many/.test(c) ? 'Too many attempts. Try again later' : this.clean(e);
      return { success: false, error: m };
    }
  }
  async register(d) {
    try { return { success: true, user: await (await this.backend()).register(d) }; }
    catch (e) {
      const c = String((e && e.code) || '');
      return { success: false, error: /email-already/.test(c) ? 'This email is already registered. Please log in' : /weak-password/.test(c) ? 'Password is too weak (use 8+ characters)' : this.clean(e) };
    }
  }
  async logout() {
    try { const b = await this.backend(); await b.logout(); } catch (e) { /* ignore */ }
    this.currentUser = null; localStorage.removeItem('arxmine_user'); location.href = '/';
  }
  async updateProfile(d) { try { return { success: true, user: await (await this.backend()).updateProfile(d) }; } catch (e) { return { success: false, error: this.clean(e) }; } }
  async applyForDeveloper(d) {
    try { await (await this.backend()).applyDeveloper(d); return { success: true, message: 'Application submitted for admin review' }; }
    catch (e) { return { success: false, error: this.clean(e) }; }
  }
  // Route protection. role: 'user' | 'developer' | 'admin'. Waits for the REAL Firebase session, so a logged-out visitor can never see protected pages.
  async require(role = 'user') {
    const ok = await window.ARX_READY, B = window.ARX_BACKEND;
    const u = ok && B && B.auth.currentUser ? this.currentUser : null;
    const go = (to) => { location.replace(to); return new Promise(() => {}); };
    if (!u) { this.currentUser = null; localStorage.removeItem('arxmine_user'); return go('/pages/login.html?next=' + encodeURIComponent(location.pathname + location.search)); }
    if (role === 'admin' && u.role !== 'admin') return go(u.needsVerify ? '/pages/verify-email.html' : '/pages/dashboard.html');
    if (role === 'developer' && !['developer', 'admin'].includes(u.role)) return go('/pages/developer-application.html');
    return u;
  }
}

// ---- projects (live data from Firebase: projectsPublic) ----
const DEF_ICON = '/assets/images/default-icon.svg';
function normProject(id, p) {
  const keys = (o) => Object.keys(o || {});
  const arr = (o) => Array.isArray(o) ? o.filter(Boolean) : keys(o).length ? Object.values(o) : [];
  const ts = (n) => new Date(Number(n) || Date.now()).toISOString();
  return {
    id, slug: id, name: p.name || 'Untitled', description: p.description || '', readme: p.readme || '',
    icon: p.icon || (window.CONFIG && CONFIG.images.defaultProjectIcon) || DEF_ICON, banner: p.banner || '',
    screenshots: arr(p.screenshots), category: p.category || '', edition: p.edition || 'java',
    license: p.license || '', creator: p.ownerName || 'Unknown', creatorId: p.ownerUid || '',
    downloads: Number(p.downloads) || 0, rating: Number(p.rating) || 0, reviews: Number(p.reviewCount) || 0,
    tags: arr(p.tags), dependencies: arr(p.dependencies), loaders: keys(p.platforms), minecraftVersions: keys(p.mc),
    createdAt: ts(p.createdAt || p.updatedAt), updatedAt: ts(p.updatedAt), featured: !!p.featured
  };
}
class ProjectService {
  async all() {
    const ok = await window.ARX_READY;
    if (!ok) return [];
    const now = Date.now();
    if (this._c && now - this._t < 20000) return this._c;
    const list = await window.ARX_BACKEND.listPublic();
    this._c = list.map(p => normProject(p.id, p)); this._t = now; return this._c;
  }
  invalidate() { this._c = null; }
  async getProjects(f = {}) {
    try {
      let r = [...await this.all()];
      if (f.edition) r = r.filter(p => p.edition === f.edition);
      if (f.category) r = r.filter(p => p.category === f.category);
      if (f.creatorId) r = r.filter(p => p.creatorId === f.creatorId);
      if (f.search) { const q = f.search.toLowerCase(); r = r.filter(p => (p.name + ' ' + p.description + ' ' + p.creator + ' ' + p.tags.join(' ')).toLowerCase().includes(q)); }
      if (f.version) r = r.filter(p => p.minecraftVersions.includes(f.version));
      if (f.loader) r = r.filter(p => p.loaders.some(l => l.toLowerCase() === String(f.loader).toLowerCase()));
      if (f.tags && f.tags.length) r = r.filter(p => f.tags.some(t => p.tags.includes(t)));
      const s = f.sort || 'downloads', t = (p) => new Date(p.updatedAt).getTime();
      r.sort((a, b) => s === 'rating' ? b.rating - a.rating || b.downloads - a.downloads : s === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : s === 'updated' ? t(b) - t(a) : b.downloads - a.downloads);
      return { success: true, projects: r };
    } catch (e) { return { success: false, projects: [], error: e.message }; }
  }
  async getProject(id) {
    try { await window.ARX_READY; const p = await window.ARX_BACKEND.getPublic(id); return p ? { success: true, project: normProject(id, p) } : { success: false, error: 'Project not found' }; }
    catch (e) { return { success: false, error: e.message }; }
  }
  async getFeaturedProjects() { const r = await this.getProjects({ sort: 'downloads' }); return { success: true, projects: r.projects.slice(0, 8) }; }
}
window.authService = new AuthService();
window.projectService = new ProjectService();
