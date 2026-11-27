// Dynamic category page: /pages/category.html?c=<categoryId>. Categories, platforms, versions and projects all come from Firebase.
(async function () {
  const esc = Utils.esc, $ = id => document.getElementById(id);
  const cid = new URLSearchParams(location.search).get('c') || '';
  const F = { edition: 'all', version: '', loaders: [], tags: [], sort: 'downloads', search: '' };
  let cat = null, platforms = [], projects = [];

  await window.ARX_READY;
  try {
    const c = await window.ARX_BACKEND.catalog();
    cat = c.categories.find(x => x.id === cid) || null;
    platforms = c.platforms.filter(p => (p.kind === 'loader' || p.kind === 'software') && (!p.categories || p.categories[cid]));
  } catch (e) { /* handled below */ }

  if (!cat) {
    $('category-title').textContent = 'Category not found';
    $('category-description').textContent = 'This category does not exist (or is disabled).';
    $('category-icon').style.display = 'none';
    $('filters-container').closest('div[style*="grid"]').style.display = 'none';
    document.querySelector('.mobile-filters-btn').style.display = 'none';
    return;
  }
  $('category-icon').src = cat.logo || '/assets/icons/mods.svg';
  $('category-icon').onerror = function () { this.onerror = null; this.src = '/assets/icons/mods.svg'; };
  $('category-title').textContent = cat.name;
  $('category-description').textContent = cat.edition === 'both' ? 'Java & Bedrock' : cat.edition === 'java' ? 'Java Edition' : 'Bedrock Edition';
  document.title = cat.name + ' - AR X Mine';

  // all published projects of this category, then build the filters from what actually exists
  projects = (await window.projectService.getProjects({ category: cid })).projects;
  const versions = [...new Set(projects.flatMap(p => p.minecraftVersions))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  $('version-filter').innerHTML = '<option value="">All Versions</option>' + versions.map(v => `<option>${esc(v)}</option>`).join('');
  const lg = $('loader-filter-group');
  if (platforms.length) {
    lg.style.display = 'block';
    lg.innerHTML = `<div class="filter-title">Loader / Software</div>` + platforms.map(p => `<label class="filter-option"><input type="checkbox" value="${esc(p.name)}" class="loader-checkbox">${p.logo ? `<img src="${esc(p.logo)}" class="software-logo" alt="" onerror="this.style.display='none'">` : ''} ${esc(p.name)}</label>`).join('');
  } else lg.style.display = 'none';
  const tags = [...new Set(projects.flatMap(p => p.tags))].slice(0, 15);
  $('tags-filter').innerHTML = tags.length ? tags.map(t => `<label class="filter-option"><input type="checkbox" value="${esc(t)}" class="tag-checkbox"> ${esc(t)}</label>`).join('') : '<span style="color:var(--color-text-secondary);font-size:var(--text-sm)">No tags yet</span>';
  if (cat.edition !== 'both') { const ef = document.querySelector('input[name="edition"]').closest('.filter-group'); ef.style.display = 'none'; }

  function render() {
    let r = projects.filter(p =>
      (F.edition === 'all' || p.edition === F.edition) &&
      (!F.version || p.minecraftVersions.includes(F.version)) &&
      (!F.loaders.length || F.loaders.some(l => p.loaders.some(x => x.toLowerCase() === l.toLowerCase()))) &&
      (!F.tags.length || F.tags.some(t => p.tags.includes(t))) &&
      (!F.search || (p.name + ' ' + p.description + ' ' + p.creator).toLowerCase().includes(F.search)));
    const t = p => new Date(p.updatedAt).getTime();
    r.sort((a, b) => F.sort === 'rating' ? b.rating - a.rating : F.sort === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : F.sort === 'updated' ? t(b) - t(a) : b.downloads - a.downloads);
    $('loading').style.display = 'none';
    $('projects-grid').innerHTML = r.map(p => Utils.createProjectCard(p)).join('');
    $('no-results').style.display = r.length ? 'none' : 'block';
    $('no-results').querySelector('p').textContent = projects.length ? 'No projects match your filters' : 'No projects in this category yet';
    $('results-count').textContent = `${r.length} ${r.length === 1 ? 'project' : 'projects'} found`;
  }

  // filter controls live inside #filters-container; the same node is moved into the mobile modal, so listeners keep working
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'edition') F.edition = t.value;
    else if (t.id === 'version-filter') F.version = t.value;
    else if (t.classList.contains('loader-checkbox')) F.loaders = [...document.querySelectorAll('.loader-checkbox:checked')].map(i => i.value);
    else if (t.classList.contains('tag-checkbox')) F.tags = [...document.querySelectorAll('.tag-checkbox:checked')].map(i => i.value);
    else if (t.id === 'sort-filter') F.sort = t.value;
    else return;
    render();
  });
  $('search-input').addEventListener('input', e => { F.search = e.target.value.trim().toLowerCase(); render(); });

  window.clearFilters = function () {
    Object.assign(F, { edition: 'all', version: '', loaders: [], tags: [], sort: 'downloads', search: '' });
    document.querySelectorAll('input[name="edition"]')[0].checked = true;
    document.querySelectorAll('.loader-checkbox,.tag-checkbox').forEach(cb => cb.checked = false);
    $('version-filter').value = ''; $('sort-filter').value = 'downloads'; $('search-input').value = '';
    render();
  };
  window.toggleMobileFilters = function () {
    const modal = $('mobile-filters-modal'), box = $('filters-container');
    if (!modal.classList.contains('active')) { $('mobile-filters-content').appendChild(box); modal.classList.add('active'); }
    else { document.querySelector('aside.desktop-sidebar').appendChild(box); modal.classList.remove('active'); }
  };
  render();
})();
