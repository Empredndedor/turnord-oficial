// database.js - Versión corregida
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
// Credenciales de Supabase
const supabaseUrl = "https://fhequkvqxsbdkmgmoftp.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZXF1a3ZxeHNiZGttZ21vZnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTM3NzAsImV4cCI6MjA2OTQ4OTc3MH0.tVXmyBG39oxWJVlmFwHXAaYDBWxakssZ7g-BywmlZEM"

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
