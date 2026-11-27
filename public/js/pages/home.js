// Homepage: everything comes from Firebase (banners, categories, projects, creators). No demo data.
(function () {
  const esc = window.Utils.esc;
  let slides = 0, current = 0, timer;
  const edition = () => localStorage.getItem('arxmine_edition') || 'java';
  const empty = (m) => `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:var(--space-xl);color:var(--color-text-secondary)">${esc(m)}</div>`;
  const safeLink = (l) => (/^(https?:\/\/|\/)/.test(l || '') && !/^\/\//.test(l)) ? l : '#';

  async function init() {
    initEditionToggle();
    initBannerSlider();
    await window.ARX_READY;
    loadBanners(); loadCategories(); loadProjects();
  }

  async function loadBanners() {
    const section = document.getElementById('banner-slider').closest('section');
    const track = document.getElementById('banner-track'), dots = document.getElementById('banner-indicators');
    let banners = [];
    try { banners = window.ARX_BACKEND ? await window.ARX_BACKEND.banners() : []; } catch (e) { /* hidden below */ }
    if (!banners.length) { section.style.display = 'none'; slides = 0; return; }
    section.style.display = '';
    slides = banners.length;
    track.innerHTML = banners.map(b => `
      <div class="banner-slide">
        <img src="${esc(b.image)}" alt="${esc(b.title)}" class="banner-image" onerror="this.onerror=null;this.src='/assets/images/default-banner.svg'">
        <div class="banner-overlay">
          ${b.category ? `<span class="banner-category">${esc(b.category)}</span>` : ''}
          <h2 class="banner-title">${esc(b.title)}</h2>
          <p class="banner-description">${esc(b.description)}</p>
          ${b.link ? `<a href="${esc(safeLink(b.link))}" class="btn btn-primary">Learn More</a>` : ''}
        </div>
      </div>`).join('');
    dots.innerHTML = banners.map((_, i) => `<span class="banner-indicator ${i ? '' : 'active'}" data-slide="${i}"></span>`).join('');
    dots.querySelectorAll('.banner-indicator').forEach((d, i) => d.addEventListener('click', () => { goTo(i); resetAuto(); }));
    current = 0; goTo(0); resetAuto();
  }

  async function loadCategories() {
    const grid = document.getElementById('categories-grid');
    let cats = [];
    try { cats = window.ARX_BACKEND ? (await window.ARX_BACKEND.catalog()).categories : []; } catch (e) { /* empty */ }
    const ed = edition();
    cats = cats.filter(c => c.edition === ed || c.edition === 'both');
    grid.innerHTML = cats.length ? cats.map((c, i) => `
      <a href="/pages/category.html?c=${encodeURIComponent(c.id)}" class="glass-card category-card hover-lift stagger-item" style="animation-delay:${i * 0.08}s">
        <div class="category-icon float-effect"><img src="${esc(c.logo || '/assets/icons/mods.svg')}" alt="" onerror="this.onerror=null;this.src='/assets/icons/mods.svg'"></div>
        <h3 class="category-name">${esc(c.name)}</h3>
      </a>`).join('') : empty('Categories will appear here once the admin creates them.');
  }

  function showProjects(id, list, msg) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = list.length ? list.map(p => window.Utils.createProjectCard(p).replace('class="project-card', 'class="project-card stagger-item hover-lift')).join('') : empty(msg);
  }

  async function loadProjects() {
    const ed = edition();
    const base = await window.projectService.getProjects({ edition: ed, sort: 'downloads' });
    const byDl = base.projects.slice(0, 4);
    const recent = [...base.projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
    const top = [...base.projects].sort((a, b) => b.rating - a.rating || b.downloads - a.downloads).filter(p => p.rating > 0).slice(0, 4);
    showProjects('trending-mods', byDl, 'No projects published yet.');
    showProjects('popular-modpacks', recent, 'No projects published yet.');
    showProjects('featured-shaders', top, 'Highly rated projects will show up here.');
    loadCreators(await window.projectService.all());
  }

  async function loadCreators(all) {
    const box = document.getElementById('top-creators'); if (!box) return;
    const by = {};
    all.forEach(p => { if (!p.creatorId) return; const c = by[p.creatorId] || (by[p.creatorId] = { id: p.creatorId, name: p.creator, projects: 0, downloads: 0 }); c.projects++; c.downloads += p.downloads; });
    const top = Object.values(by).sort((a, b) => b.downloads - a.downloads || b.projects - a.projects).slice(0, 3);
    const profiles = await Promise.all(top.map(c => window.ARX_BACKEND.publicProfile(c.id).catch(() => null)));
    box.innerHTML = top.length ? top.map((c, i) => { const pr = profiles[i] || {}; return `
      <div class="glass-card" style="text-align:center;padding:var(--space-xl)">
        <img src="${esc(pr.avatar || '/assets/images/default-avatar.svg')}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto var(--space-md);border:3px solid var(--color-primary)" onerror="this.onerror=null;this.src='/assets/images/default-avatar.svg'">
        <h3 style="margin-bottom:var(--space-xs)">${esc(pr.displayName || c.name)}</h3>
        <div style="display:flex;justify-content:space-around;margin:var(--space-md) 0;padding:var(--space-md);background:var(--color-glass);border-radius:var(--radius-md)">
          <div><div style="font-size:var(--text-xl);font-weight:700;color:var(--color-primary)">${c.projects}</div><div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Projects</div></div>
          <div><div style="font-size:var(--text-xl);font-weight:700;color:var(--color-primary)">${window.Utils.formatNumber(c.downloads)}</div><div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Downloads</div></div>
        </div>
        <a href="/pages/discover.html?creator=${encodeURIComponent(c.id)}" class="btn btn-primary" style="width:100%">View projects</a>
      </div>`; }).join('') : empty('Top creators will appear here once projects are published.');
  }

  function initEditionToggle() {
    const buttons = document.querySelectorAll('.edition-btn');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active')); btn.classList.add('active');
      localStorage.setItem('arxmine_edition', btn.dataset.edition);
      loadCategories(); loadProjects();
    }));
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.edition === edition()));
  }

  function initBannerSlider() {
    const p = document.getElementById('banner-prev'), n = document.getElementById('banner-next');
    if (p) p.addEventListener('click', () => { if (slides) goTo((current - 1 + slides) % slides); resetAuto(); });
    if (n) n.addEventListener('click', () => { if (slides) goTo((current + 1) % slides); resetAuto(); });
  }
  function goTo(i) {
    const track = document.getElementById('banner-track'); if (!track || !slides) return;
    current = i; track.style.transform = `translateX(-${current * 100}%)`;
    document.querySelectorAll('.banner-indicator').forEach((d, k) => d.classList.toggle('active', k === current));
  }
  function resetAuto() { clearInterval(timer); if (slides > 1) timer = setInterval(() => goTo((current + 1) % slides), 5000); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
