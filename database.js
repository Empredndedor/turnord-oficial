// database.js - Versión corregida
import { createClient } from '@supabase/supabase-js';
// Importamos las credenciales desde el nuevo archivo config.js
import { supabaseUrl, supabaseAnonKey } from './config.js';

// Verificamos que las credenciales se hayan cargado correctamente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('La URL o la llave de Supabase no se encontraron en config.js');
}

// Creamos y exportamos el cliente de Supabase para que esté disponible en toda la aplicación
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función (opcional) para verificar la conexión, puede ser útil para depurar
export async function testConnection() {
  try {
    // Intentamos hacer una consulta simple a la tabla 'turnos'
    const { data, error } = await supabase.from('turnos').select('id').limit(1);

    if (error) {
        console.error('Error en la consulta de prueba a Supabase:', error);
        return false;
    }

    console.log('Conexión con Supabase verificada con éxito.');
    return true;
  } catch (e) {
    console.error('Error de conexión con Supabase:', e);
    return false;
  }
}
