// panel.js
import { supabase } from '../database.js';


const negocioId = 'barberia0001';

// Utilidad: fecha local YYYY-MM-DD
function ymdLocal(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Función para actualizar los contadores en el DOM
function actualizarContadores(turnosHoy) {
  document.getElementById('turnosEspera').textContent =
    turnosHoy.filter(t => t.estado === 'En espera').length;
  document.getElementById('turnosAtendidos').textContent =
    turnosHoy.filter(t => t.estado === 'Atendido').length;
  document.getElementById('turnosDia').textContent = turnosHoy.length;
}

// Función para actualizar la tabla con los turnos del día
function actualizarTabla(turnosHoy) {
  const tabla = document.getElementById('tablaHistorial');
  tabla.innerHTML =
    turnosHoy.length === 0
      ? `<tr><td colspan="4" class="py-4 text-center text-gray-500">No hay turnos registrados hoy.</td></tr>`
      : '';

  turnosHoy.forEach(turno => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="py-2 px-4 border-b">${turno.turno}</td>
      <td class="py-2 px-4 border-b">${turno.nombre || 'Sin nombre'}</td>
      <td class="py-2 px-4 border-b">${turno.hora || 'Sin hora'}</td>
      <td class="py-2 px-4 border-b">
        <span class="${
          turno.estado === 'En espera'
            ? 'text-yellow-500'
            : turno.estado === 'Atendido'
            ? 'text-green-500'
            : 'text-gray-500'
        } font-bold">${turno.estado}</span>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

// Función para cargar datos y actualizar vista, devuelve los turnos del día
async function cargarDatos() {
  try {
    const hoy = ymdLocal(new Date());
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('fecha', hoy)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const turnosHoy = data || [];

    actualizarContadores(turnosHoy);
    actualizarTabla(turnosHoy);

    return turnosHoy;
  } catch (err) {
    console.error('Error al cargar datos:', err);
    const tabla = document.getElementById('tablaHistorial');
    if (tabla) {
      tabla.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-500">Error al cargar los datos del panel.</td></tr>`;
    }
    const e1 = document.getElementById('turnosEspera');
    const e2 = document.getElementById('turnosAtendidos');
    const e3 = document.getElementById('turnosDia');
    if (e1) e1.textContent = '0';
    if (e2) e2.textContent = '0';
    if (e3) e3.textContent = '0';
    return [];
  }
}

// Función para limpiar historial del día actual
async function limpiarHistorialTurnos() {
  if (!confirm('¿Estás seguro que quieres limpiar el historial del día?')) return;

  try {
    const hoy = ymdLocal(new Date());

    // Obtener ids de turnos del día para borrar
    const { data, error: fetchError } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocioId)
      .eq('fecha', hoy);

    if (fetchError) throw fetchError;

    const idsAEliminar = (data || []).map(t => t.id);

    if (idsAEliminar.length === 0) {
      alert('No hay turnos para eliminar hoy.');
      return;
    }

    // Eliminar turnos
    const { error: deleteError } = await supabase
      .from('turnos')
      .delete()
      .in('id', idsAEliminar);

    if (deleteError) throw deleteError;

    alert('✅ Historial limpiado con éxito');
    cargarDatos();
  } catch (error) {
    console.error('Error al limpiar historial:', error);
    alert('❌ Error al limpiar historial: ' + error.message);
  }
}

// Suscripción en tiempo real para actualizar datos al instante
function suscribirseTurnos() {
  supabase
    .channel('canal-turnos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'turnos',
        filter: `negocio_id=eq.${negocioId}`,
      },
      async payload => {
        console.log('🟢 Actualización en tiempo real:', payload);
        await cargarDatos();
      }
    )
    .subscribe();
}

// Función para resaltar menú activo en sidebar
function resaltarMenu() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('aside nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) {
      link.classList.add('bg-white', 'text-blue-900', 'font-semibold', 'shadow');
    } else {
      link.classList.remove('bg-white', 'text-blue-900', 'font-semibold', 'shadow');
    }
  });
}

// Inicialización al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  resaltarMenu();
  cargarDatos();
  suscribirseTurnos();
});

// Exponer limpiar historial al global para el botón
window.limpiarHistorialTurnos = limpiarHistorialTurnos;
