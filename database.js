// database.js
import * as supabasePkg from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';
import Config from './config.js';

// Extraemos createClient del paquete
const { createClient } = supabasePkg;

// Validación por si no se carga correctamente
if (!createClient) {
  console.error('Error: No se pudo importar createClient desde supabase-js. Verifica la URL del CDN.');
}

// Obtenemos la configuración (URL y clave)
const { url, key } = Config.getSupabaseConfig();

// Creamos el cliente de Supabase
export const supabase = createClient(url, key);

// Función opcional para verificar conexión
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('turnos').select('id').limit(1);

    if (error) {
      console.error('Error al probar conexión con Supabase:', error);
      return false;
    }

    console.log('Conexión con Supabase verificada:', data);
    return true;
  } catch (err) {
    console.error('Error inesperado al probar conexión con Supabase:', err);
    return false;
  }
}

