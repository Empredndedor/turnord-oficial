// config.js
export const Config = {
  supabaseUrl: 'TU_SUPABASE_URL', // Reemplazado por GitHub Actions
  supabaseKey: 'TU_SUPABASE_KEY', // Reemplazado por GitHub Actions

  getSupabaseConfig: function() {
    const url = this.supabaseUrl;
    const key = this.supabaseKey;

    if (url === 'TU_SUPABASE_URL' || key === 'TU_SUPABASE_KEY') {
      console.warn('Advertencia: Las credenciales de Supabase no han sido reemplazadas. Usando valores predeterminados.');
    }

    return { url, key };
  }
};


