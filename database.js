// database.js - Versión segura
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import Config from './config.js';

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
}// database.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://fhequkvqxsbdkmgmoftp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZXF1a3ZxeHNiZGttZ21vZnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTM3NzAsImV4cCI6MjA2OTQ4OTc3MH0.tVXmyBG39oxWJVlmFwHXAaYDBWxakssZ7g-BywmlZEM';
export const supabase = createClient(supabaseUrl, supabaseKey);

