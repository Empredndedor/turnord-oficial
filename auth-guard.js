import { supabase } from './database.js';

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // No hay sesión, redirigir a login
    window.location.replace('login.html');
  }
})();
