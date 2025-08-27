/*
  auth.js
  - Redirige a login.html si el usuario no está autenticado
  - Funciona en GitHub Pages (user page o project page) detectando el base path automáticamente
  - Expone helpers: window.authLogin(token?), window.authLogout()
*/
(function () {
  const AUTH_KEY = 'authToken';
  const LOGIN_PAGE = 'login.html';
  const PUBLIC_PAGES = new Set([
    'login.html',
    '404.html'
  ]);

  function getBasePath() {
    // Para GitHub Pages de proyecto: https://usuario.github.io/mi-repo/... => base = /mi-repo/
    // Para GitHub Pages de usuario/org: https://usuario.github.io/... => base = /
    const parts = location.pathname.split('/').filter(Boolean);
    // Si hay un primer segmento fijo (posible repo), úsalo como base. Si estás en la raíz (user page), base es '/'
    return parts.length ? `/${parts[0]}/` : '/';
  }

  function currentFile() {
    const p = location.pathname;
    const last = p.substring(p.lastIndexOf('/') + 1).toLowerCase();
    // Si es directorio y no especifica archivo, asumir index.html
    return last === '' ? 'index.html' : last;
  }

  function isAuthenticated() {
    return !!localStorage.getItem(AUTH_KEY);
  }

  function shouldBypass() {
    // Permitir login.html y 404.html sin autenticación
    if (PUBLIC_PAGES.has(currentFile())) return true;
    // Permitir bypass con query param para depurar (no exponer en producción si no quieres)
    const params = new URLSearchParams(location.search);
    if (params.get('skipAuth') === '1') return true;
    return false;
  }

  function redirectToLogin() {
    const base = getBasePath();
    const next = location.pathname + location.search + location.hash;
    const target = `${base}${LOGIN_PAGE}?next=${encodeURIComponent(next)}`;
    // Usar replace para no dejar historial intermedio
    location.replace(target);
  }

  // Ejecutar la verificación lo antes posible
  try {
    if (!isAuthenticated() && !shouldBypass()) {
      redirectToLogin();
    }
  } catch (e) {
    // Si algo falla, no bloquear la navegación
    console.warn('Guard auth falló, continuando sin bloquear:', e);
  }

  // Helpers globales para usar en login/logout
  window.authLogin = function authLogin(token) {
    try {
      localStorage.setItem(AUTH_KEY, token || '1');
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      const base = getBasePath();
      const fallback = `${base}index.html`;
      location.replace(next || fallback);
    } catch (e) {
      console.error('Error en authLogin:', e);
      alert('No se pudo completar el inicio de sesión.');
    }
  };

  window.authLogout = function authLogout() {
    try {
      localStorage.removeItem(AUTH_KEY);
      const base = getBasePath();
      location.replace(`${base}${LOGIN_PAGE}`);
    } catch (e) {
      console.error('Error en authLogout:', e);
      alert('No se pudo cerrar sesión.');
    }
  };
})();
