// UI Components and Utilities
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Format numbers
function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  
  return date.toLocaleDateString();
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Create toast container if it doesn't exist
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

// Modal utilities
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Image loader with fallback
function loadImage(element, src, fallback) {
  const img = new Image();
  img.onload = () => {
    element.src = src;
  };
  img.onerror = () => {
    element.src = fallback || window.CONFIG.images.defaultProjectIcon;
  };
  img.src = src;
}

// Lazy load images
function initLazyLoad() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        const fallback = img.dataset.fallback;
        
        loadImage(img, src, fallback);
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}

// Dropdown toggle
function initDropdowns() {
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    if (toggle.dataset.bound) return;
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = toggle.closest('.dropdown');
      
      // Close other dropdowns
      document.querySelectorAll('.dropdown.active').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('active');
        }
      });
      
      dropdown.classList.toggle('active');
    });
  });
  
  // Close dropdowns when clicking outside (registered once)
  if (!window.__ddOutside) {
    window.__ddOutside = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    });
  }
}

// Mobile menu
function initMobileMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const menuClose = document.querySelector('.mobile-menu-close');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  
  if (menuToggle && mobileMenu && overlay) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.add('active');
      overlay.classList.add('active');
    });
    
    const closeMenu = () => {
      mobileMenu.classList.remove('active');
      overlay.classList.remove('active');
    };
    
    if (menuClose) {
      menuClose.addEventListener('click', closeMenu);
    }
    
    overlay.addEventListener('click', closeMenu);
  }
}

// Search functionality
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (!searchInput || !searchResults) return;
  
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      searchResults.classList.remove('active');
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      const result = await window.projectService.getProjects({ search: query });
      
      if (result.success && result.projects.length > 0) {
        displaySearchResults(result.projects.slice(0, 5));
        searchResults.classList.add('active');
      } else {
        searchResults.classList.remove('active');
      }
    }, 300);
  });
  
  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('active');
    }
  });
}

function displaySearchResults(projects) {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;
  
  searchResults.innerHTML = projects.map(project => `
    <a href="/pages/project.html?slug=${encodeURIComponent(project.slug)}" class="search-result-item">
      <img src="${esc(project.icon)}" alt="" class="search-result-icon" onerror="this.onerror=null;this.src='/assets/images/default-icon.svg'">
      <div class="search-result-info">
        <div class="search-result-title">${esc(project.name)}</div>
        <div class="search-result-meta">
          ${esc(project.category)} • ${formatNumber(project.downloads)} downloads
        </div>
      </div>
    </a>
  `).join('');
}

// Star rating component
function createStarRating(rating, interactive = false) {
  const container = document.createElement('div');
  container.className = 'star-rating';
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = i <= rating ? '★' : '☆';
    
    if (interactive) {
      star.style.cursor = 'pointer';
      star.addEventListener('click', () => {
        // Handle rating click
        const stars = container.querySelectorAll('.star');
        stars.forEach((s, index) => {
          s.innerHTML = index < i ? '★' : '☆';
        });
      });
    }
    
    container.appendChild(star);
  }
  
  return container;
}

// Project card component
function createProjectCard(project) {
  return `
    <div class="project-card glass-card" data-cat="${String(project.category||'').toLowerCase().replace(/[^a-z]/g,'')}">
      <a href="/pages/project.html?slug=${encodeURIComponent(project.slug)}" class="project-card-link">
        <div class="project-card-icon">
          <img src="${esc(project.icon)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/default-icon.svg'">
        </div>
        <div class="project-card-content">
          <h3 class="project-card-title">${esc(project.name)}</h3>
          <p class="project-card-description">${esc(project.description)}</p>
          <div class="project-card-meta">
            <span class="badge badge-primary">${esc(project.category)}</span>
            <div class="project-card-stats">
              <span title="Downloads">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ${formatNumber(project.downloads)}
              </span>
              <span title="Rating">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                ${project.rating}
              </span>
            </div>
          </div>
          <div class="project-card-footer">
            <span class="project-card-author">by ${esc(project.creator)}</span>
            <span class="project-card-updated">${formatDate(project.updatedAt)}</span>
          </div>
        </div>
      </a>
    </div>
  `;
}

// Initialize all components
function initComponents() {
  initToastContainer();
  initDropdowns();
  initMobileMenu();
  initSearch();
  initLazyLoad();
  
  // Update navbar user menu (cached user first, then the verified Firebase session)
  updateNavbarUser();
  initSite();
  if (window.ARX_READY) window.ARX_READY.then(() => updateNavbarUser());
}

// Update navbar based on auth state (logged-in menu with Logout, or Login / Sign Up when logged out)
function updateNavbarUser() {
  const user = window.authService.getCurrentUser();
  const navbarActions = document.querySelector('.navbar-actions');
  const mobileActions = document.querySelector('.mobile-menu-actions');

  if (navbarActions) {
    if (user) {
      const dev = ['developer', 'admin'].includes(user.role);
      navbarActions.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-ghost dropdown-toggle" type="button" aria-haspopup="true">
            <img src="${esc(user.avatar || '/assets/images/default-avatar.svg')}" alt="" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null;this.src='/assets/images/default-avatar.svg'">
            <span>${esc(user.displayName || user.username)}</span>
          </button>
          <div class="dropdown-menu">
            <a href="/pages/dashboard.html" class="dropdown-item">Dashboard</a>
            <a href="/pages/dashboard.html#favorites" class="dropdown-item">Favorites</a>
            ${dev ? '<a href="/pages/developer-dashboard.html" class="dropdown-item">Developer Dashboard</a>' : '<a href="/pages/developer-application.html" class="dropdown-item">Become a Creator</a>'}
            ${user.role === 'admin' ? '<a href="/pages/admin-dashboard.html" class="dropdown-item">Admin Dashboard</a>' : ''}
            <div class="dropdown-divider"></div>
            <a href="/pages/account-settings.html" class="dropdown-item">Account Settings</a>
            <a href="#" class="dropdown-item" data-logout>Logout</a>
          </div>
        </div>`;
    } else {
      navbarActions.innerHTML = `
        <a href="/pages/login.html" class="btn btn-secondary btn-sm">Login</a>
        <a href="/pages/register.html" class="btn btn-primary btn-sm">Sign Up</a>`;
    }
    initDropdowns();
  }

  if (mobileActions) {
    mobileActions.innerHTML = user
      ? `<a href="/pages/dashboard.html" class="btn btn-secondary">Dashboard</a><a href="#" class="btn btn-primary" data-logout>Logout</a>`
      : `<a href="/pages/login.html" class="btn btn-secondary">Login</a><a href="/pages/register.html" class="btn btn-primary">Sign Up</a>`;
  }

  // Hide "Join Community" / "Create Account" calls to action for people who are already logged in
  document.querySelectorAll('[data-guest-only]').forEach(el => { el.style.display = user ? 'none' : ''; });
}

// One delegated handler for every Logout control
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-logout]');
  if (!a) return;
  e.preventDefault();
  window.authService.logout();
});

// ---------- Site chrome driven by the database (brand, footer, social links) ----------
const SOCIAL_FALLBACK_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9fb3a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>');
function socialIcon(s) {
  if (s.icon) return s.icon;
  try {
    const host = new URL(s.url).hostname;
    if (host) return 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(host);
  } catch (e) { /* mailto etc. */ }
  return SOCIAL_FALLBACK_ICON;
}
function renderSocials(list) {
  document.querySelectorAll('.footer-social').forEach(box => {
    box.innerHTML = list.map(s => `
      <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.name)}" title="${esc(s.name)}" class="social-link">
        <img src="${esc(socialIcon(s))}" alt="${esc(s.name)}" width="24" height="24" loading="lazy" style="width:24px;height:24px;object-fit:contain;border-radius:4px" onerror="this.onerror=null;this.src='${SOCIAL_FALLBACK_ICON}'">
      </a>`).join('');
    box.style.display = list.length ? 'flex' : 'none';
    box.style.gap = '12px';
    box.style.alignItems = 'center';
    box.style.flexWrap = 'wrap';
  });
}
function ensureFooter() {
  if (document.querySelector('.footer') || document.body.hasAttribute('data-nofooter')) return;
  if (document.querySelector('.dashboard-sidebar, .p3-page')) return; // dashboards and auth pages stay clean
  const f = document.createElement('footer');
  f.className = 'footer';
  f.innerHTML = `<div class="container"><div class="footer-content" style="display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:center">
      <div><h4>AR X Mine</h4><div class="footer-social" style="display:none"></div></div>
      <ul class="footer-links" style="display:flex;gap:16px;flex-wrap:wrap;list-style:none;padding:0;margin:0">
        <li><a href="/pages/about.html">About</a></li><li><a href="/pages/guidelines.html">Guidelines</a></li>
        <li><a href="/pages/terms.html">Terms</a></li><li><a href="/pages/privacy.html">Privacy</a></li></ul></div>
    <div class="footer-bottom"><p>&copy; ${new Date().getFullYear()} AR X Mine. Not affiliated with Mojang or Microsoft.</p></div></div>`;
  document.body.appendChild(f);
}
async function initSite() {
  ensureFooter();
  const ok = await window.ARX_READY;
  if (!ok || !window.ARX_BACKEND) return;
  try {
    const [brand, socials] = await Promise.all([window.ARX_BACKEND.brand(), window.ARX_BACKEND.socials()]);
    if (brand.logo) document.querySelectorAll('.navbar-logo img').forEach(i => { i.src = brand.logo; });
    if (brand.favicon) { let l = document.querySelector('link[rel~=icon]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = brand.favicon; }
    if (window.CONFIG) {
      if (brand.projectIcon) CONFIG.images.defaultProjectIcon = brand.projectIcon;
      if (brand.avatar) CONFIG.images.defaultAvatar = brand.avatar;
    }
    renderSocials(socials);
    const { categories } = await window.ARX_BACKEND.catalog();
    const link = c => `/pages/category.html?c=${encodeURIComponent(c.id)}`;
    const dd = document.getElementById('nav-categories');
    if (dd) dd.innerHTML = categories.map(c => `<a href="${link(c)}" class="dropdown-item">${esc(c.name)}</a>`).join('') + '<div class="dropdown-divider"></div><a href="/pages/discover.html" class="dropdown-item">All projects</a>';
    const fc = document.getElementById('footer-categories');
    if (fc) fc.innerHTML = categories.slice(0, 8).map(c => `<li><a href="${link(c)}">${esc(c.name)}</a></li>`).join('');
    const mm = document.getElementById('mobile-categories');
    if (mm) mm.innerHTML = categories.map(c => `<li class="mobile-menu-item"><a href="${link(c)}" class="mobile-menu-link">${esc(c.name)}</a></li>`).join('');
  } catch (e) { console.warn('site settings', e); }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}

// Export utilities
if (typeof window !== 'undefined') {
  window.Utils = {
    formatNumber,
    formatDate,
    showToast,
    showModal,
    hideModal,
    loadImage,
    createStarRating,
    createProjectCard,
    updateNavbarUser,
    esc,
    renderSocials,
    socialIcon
  };
}
