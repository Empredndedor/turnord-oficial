// configuracion.js
import { supabase } from '../../../database.js';
import Config from '../../../config.js';

const root = document.documentElement;
let negocioId; // Se obtendrá del usuario autenticado

async function getNegocioId() {
  if (negocioId) return negocioId;
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.user_metadata && user.user_metadata.negocio_id) {
    negocioId = user.user_metadata.negocio_id;
    return negocioId;
  }
  // Si no se encuentra el negocio_id, redirigir o mostrar error
  alert('No se pudo obtener el ID del negocio. Por favor, inicie sesión de nuevo.');
  window.location.replace(Config.getRoute('login'));
  return null;
}

function aplicarTema(themePrimary, themeMode) {
  const colors = ['red', 'orange', 'blue', 'black', 'green', 'pink', 'purple'];
  colors.forEach(c => root.classList.remove('theme-' + c));
  root.classList.add('theme-' + themePrimary);
  root.classList.toggle('dark', themeMode === 'dark');

  localStorage.setItem('theme_primary', themePrimary);
  localStorage.setItem('theme_mode', themeMode);
}

// Cargar configuración desde Supabase
async function cargarConfig() {
  const currentNegocioId = await getNegocioId();
  if (!currentNegocioId) return;

  try {
    const { data, error } = await supabase
      .from('configuracion_negocio')
      .select('ajustes') // Seleccionamos la columna 'ajustes' que contiene el tema
      .eq('negocio_id', currentNegocioId)
      .maybeSingle();

    if (error) throw error;

    const themePrimary = data?.ajustes?.theme_primary || localStorage.getItem('theme_primary') || 'blue';
    const themeMode = data?.ajustes?.theme_mode || localStorage.getItem('theme_mode') || 'light';

    document.getElementById('theme-primary').value = themePrimary;
    document.getElementById('theme-mode').value = themeMode;

    aplicarTema(themePrimary, themeMode);
  } catch (err) {
    console.error('Error al cargar configuración:', err.message || err);
  }
}

// Guardar configuración en Supabase
async function guardarConfig() {
  const currentNegocioId = await getNegocioId();
  if (!currentNegocioId) return;

  const theme_primary = document.getElementById('theme-primary').value;
  const theme_mode = document.getElementById('theme-mode').value;

  try {
    const { error } = await supabase
      .from('configuracion_negocio')
      .upsert(
        {
          negocio_id: currentNegocioId,
          ajustes: { theme_primary, theme_mode }
        },
        { onConflict: 'negocio_id' }
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
