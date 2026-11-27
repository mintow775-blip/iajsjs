// Forgot / reset / verify-email / account-settings pages (real Firebase flows).
(async function () {
  const kind = document.body.dataset.p3, r = document.getElementById('p3-root'), P = window.P3, { esc, fld, val, toast, urlOk, FB } = P;
  const ok = await window.ARX_READY, B = window.ARX_BACKEND, q = new URLSearchParams(location.search);
  if (!ok || !B) { r.innerHTML = '<h1>Unavailable</h1><p class="p3-muted">The backend is not configured.</p>'; return; }
  const msg = e => String(e && e.message || e).replace('Firebase: ', '').replace(/\s*\(auth\/[^)]*\)\.?/, '').trim();
  const pwOk = v => v.length >= 8 && /\d/.test(v) && /[a-zA-Z]/.test(v);

  if (kind === 'forgot') {
    r.innerHTML = `<h1>Forgot password</h1><p class="p3-muted">Enter your account email and we will send a reset link.</p><form class="p3-form" id="f"><div class="form-group"><label class="form-label" for="e">Email</label><input id="e" class="input" type="email" inputmode="email" autocomplete="email" required></div><button class="btn btn-primary">Send reset link</button></form>`;
    r.querySelector('#f').onsubmit = async e => { e.preventDefault(); try { await B.sendReset(r.querySelector('#e').value.trim()); } catch (x) { /* never reveal whether an account exists */ } r.innerHTML = '<h1>Check your inbox</h1><p>If an account exists for that email, a reset link has been sent.</p><a class="btn btn-secondary" href="/pages/login.html">Back to login</a>'; };
  }

  if (kind === 'reset') {
    const code = q.get('oobCode');
    if (!code) r.innerHTML = '<h1>Reset password</h1><p>Open the reset link from your email to continue.</p><a class="btn btn-secondary" href="/pages/forgot-password.html">Request a new link</a>';
    else {
      r.innerHTML = `<h1>Reset password</h1><form class="p3-form" id="f">${fld('a', 'New password', '', 'password', '8+ characters with letters and numbers')}${fld('b', 'Confirm password', '', 'password')}<div class="p3-err" id="er"></div><button class="btn btn-primary">Update password</button></form>`;
      r.querySelector('#f').onsubmit = async e => { e.preventDefault(); const a = r.querySelector('#a').value, b = r.querySelector('#b').value, er = r.querySelector('#er'); if (!pwOk(a)) { er.textContent = 'Password needs 8+ characters with letters and numbers'; return; } if (a !== b) { er.textContent = 'Passwords do not match'; return; } try { await B.applyReset(code, a); toast('Password updated. Redirecting to login…'); setTimeout(() => location.href = '/pages/login.html', 1200); } catch (x) { er.textContent = msg(x) || 'This link is invalid or expired'; } };
    }
  }

  if (kind === 'verify') { location.replace('/pages/dashboard.html'); return; }

  if (kind === 'account') {
    const u = await authService.require('user');
    r.innerHTML = `<h1>Account Settings</h1>
      <form class="p3-form glass-card" id="pf"><h3>Profile</h3>${fld('dn', 'Display name', u.displayName || '')}${fld('mc', 'Minecraft username / Gamertag', u.minecraftUsername || '')}${fld('av', 'Avatar (direct image URL)', u.avatar || '', 'url')}<img id="avp" class="p3-prev" src="${esc(u.avatar || FB)}" alt=""><div class="p3-err" id="pe"></div><button class="btn btn-primary">Save profile</button></form>
      <form class="p3-form glass-card" id="pw" style="margin-top:16px"><h3>Change password</h3>${fld('o', 'Current password', '', 'password')}${fld('n', 'New password', '', 'password', '8+ characters with letters and numbers')}<div class="p3-err" id="we"></div><button class="btn btn-primary">Update password</button></form>
      <div class="glass-card" style="margin-top:16px"><h3>Email</h3><p class="p3-muted">${esc(u.email)}</p></div>
      <div class="p3-actions" style="margin-top:16px"><a class="btn btn-ghost" href="/pages/dashboard.html">Back to dashboard</a><button class="btn btn-secondary" id="lo">Log out</button></div>`;
    r.querySelector('#av').addEventListener('input', e => { r.querySelector('#avp').src = urlOk(e.target.value) && e.target.value ? e.target.value : FB; });
    r.querySelector('#pf').onsubmit = async e => { e.preventDefault(); const dn = val(r, 'dn'); if (!dn || dn.length > 40) { r.querySelector('#pe').textContent = 'Display name must be 1-40 characters'; return; } if (!urlOk(val(r, 'av'))) { r.querySelector('#pe').textContent = 'Avatar must be a direct http(s) image URL'; return; } const res = await authService.updateProfile({ displayName: dn, minecraftUsername: val(r, 'mc'), avatar: val(r, 'av') }); if (res.success) { r.querySelector('#pe').textContent = ''; toast('Saved'); Utils.updateNavbarUser(); } else r.querySelector('#pe').textContent = res.error; };
    r.querySelector('#pw').onsubmit = async e => { e.preventDefault(); const er = r.querySelector('#we'), nw = r.querySelector('#n').value; if (!pwOk(nw)) { er.textContent = 'New password needs 8+ characters with letters and numbers'; return; } try { await B.changePassword(r.querySelector('#o').value, nw); er.textContent = ''; e.target.reset(); toast('Password updated'); } catch (x) { er.textContent = /invalid-credential|wrong-password/.test(String(x.code)) ? 'Current password is wrong' : (msg(x) || 'Could not update password'); } };
    r.querySelector('#lo').onclick = () => authService.logout();
  }
})();
