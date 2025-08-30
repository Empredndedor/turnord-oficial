// database.js - Versión segura
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import Config from './admin/configuracion.js';

// Obtener configuración de forma segura
const config = Config.getSupabaseConfig();

if (!config.url || !config.key) {
  throw new Error('Configuración de Supabase no encontrada');
}

export const supabase = createClient(config.url, config.key);

// Función para verificar conexión
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('turnos').select('count').limit(1);
    return !error;
  } catch (e) {
    console.error('Error de conexión:', e);
    return false;
  }
}
