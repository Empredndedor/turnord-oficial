// database.js - Versión corregida
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
// Importamos las credenciales desde el nuevo archivo config.js
import { supabaseUrl, supabaseAnonKey } from './config.js';

// Verificamos que las credenciales se hayan cargado correctamente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('La URL o la llave de Supabase no se encontraron en config.js');
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
