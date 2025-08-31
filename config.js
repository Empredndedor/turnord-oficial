// config.js - Configuración centralizada para GitHub Pages
const Config = {
  // === CONFIGURACIÓN DE SUPABASE ===
  supabaseUrl: 'TU_SUPABASE_URL', // Reemplazado por GitHub Actions
  supabaseKey: 'TU_SUPABASE_KEY', // Reemplazado por GitHub Actions

  // === CONFIGURACIÓN DEL NEGOCIO ===
  negocio: {
    id: 'barberia0001',
    nombre: 'Barbería Principal',
    configuracion: {
      hora_apertura: '08:00',
      hora_cierre: '23:00',
      limite_turnos: 50,
      hora_limite_turnos: '23:00'
    }
  },

  // === CONFIGURACIÓN DE RUTAS ===
  routes: {
    login: './login.html',
    panel: './panel.html',
    usuario: './usuario.html',
    configuracion: './configuracion.html'
  },

  // === CONFIGURACIÓN DE CDN ===
  cdn: {
    supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    tailwind: 'https://cdn.tailwindcss.com'
  },

  // === CONFIGURACIÓN DE GITHUB PAGES ===
  github: {
    isGitHubPages: window.location.hostname.includes('github.io'),
    basePath: window.location.hostname.includes('github.io') ? 
      `/${window.location.pathname.split('/')[1]}` : ''
  },

  // === MÉTODOS DE CONFIGURACIÓN ===
  getSupabaseConfig: function() {
    const url = this.supabaseUrl;
    const key = this.supabaseKey;

    if (url === 'TU_SUPABASE_URL' || key === 'TU_SUPABASE_KEY') {
      console.warn('Advertencia: Las credenciales de Supabase no han sido reemplazadas.');
    }

    return { url, key };
  },

  getNegocioConfig: function() {
    return this.negocio;
  },

  getRoute: function(routeName) {
    const basePath = this.github.basePath;
    const route = this.routes[routeName] || routeName;
    return this.github.isGitHubPages ? `${basePath}/${route}` : route;
  },

  getCDN: function(service) {
    return this.cdn[service];
  },

  // Método para obtener configuración completa
  getFullConfig: function() {
    return {
      supabase: this.getSupabaseConfig(),
      negocio: this.getNegocioConfig(),
      routes: this.routes,
      cdn: this.cdn,
      github: this.github
    };
  }
};
