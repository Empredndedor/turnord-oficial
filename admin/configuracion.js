// configuracion.js
import { supabase } from '../database.js'; // database.js está en la misma carpeta

const negocioId = 'barberia0001';
const root = document.documentElement;


function aplicarTema(themePrimary, themeMode) {
  const colors = ['red','orange','blue','black','green','pink','purple'];
  colors.forEach(c => root.classList.remove('theme-' + c));
  root.classList.add('theme-' + themePrimary);
  root.classList.toggle('dark', themeMode === 'dark');

  localStorage.setItem('theme_primary', themePrimary);
  localStorage.setItem('theme_mode', themeMode);
}



// Cargar configuración desde Supabase
async function cargarConfig() {
  try {
    const { data, error } = await supabase
      .from('configuracion_negocio')
      .select('theme_primary, theme_mode')
      .eq('negocio_id', negocioId)
      .maybeSingle();

    if (error) throw error;

    const themePrimary = data?.theme_primary || localStorage.getItem('theme_primary') || 'blue';
    const themeMode    = data?.theme_mode    || localStorage.getItem('theme_mode')    || 'light';

    document.getElementById('theme-primary').value = themePrimary;
    document.getElementById('theme-mode').value = themeMode;

    aplicarTema(themePrimary, themeMode);
  } catch (err) {
    console.error('Error al cargar configuración:', err.message || err);
  }
}

// Guardar configuración en Supabase
async function guardarConfig() {
  const theme_primary = document.getElementById('theme-primary').value;
  const theme_mode    = document.getElementById('theme-mode').value;

  try {
    const { error } = await supabase
      .from('configuracion_negocio')
      .upsert(
        { negocio_id: negocioId, theme_primary, theme_mode },
        { onConflict: 'negocio_id' } // asegúrate que negocio_id sea UNIQUE
      );

    if (error) throw error;

    aplicarTema(theme_primary, theme_mode);
    document.getElementById('status').textContent = 'Guardado ✅';
  } catch (err) {
    console.error('Error al guardar configuración:', err.message || err);
    document.getElementById('status').textContent = 'Error al guardar ❌';
  }
}

// Eventos
document.getElementById('btn-guardar').addEventListener('click', guardarConfig);

// Cambiar modo rápido desde el botón
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const select = document.getElementById('theme-mode');
  const next = select.value === 'light' ? 'dark' : 'light';
  select.value = next;
  aplicarTema(document.getElementById('theme-primary').value, next);
});

// Cargar configuración al iniciar
document.addEventListener('DOMContentLoaded', cargarConfig);

