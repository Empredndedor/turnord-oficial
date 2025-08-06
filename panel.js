import { supabase } from './database.js';

const negocioId = 'barberia0001';

// Función principal para cargar datos
async function cargarDatos() {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('negocio_id', negocioId)
      .gte('fecha', hoy)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calcular contadores
    const turnosEspera = data.filter(t => t.estado === 'En espera').length;
    const turnosAtendidos = data.filter(t => t.estado === 'Atendido').length;
    const turnosDia = data.length;

    // Actualizar HTML
    document.getElementById('turnosEspera').textContent = turnosEspera;
    document.getElementById('turnosAtendidos').textContent = turnosAtendidos;
    document.getElementById('turnosDia').textContent = turnosDia;

    // Llenar tabla
    const tabla = document.getElementById('tablaHistorial');
    tabla.innerHTML = '';

    data.forEach(turno => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td class="py-2 px-4 border-b">${turno.turno}</td>
        <td class="py-2 px-4 border-b">${turno.nombre || ''}</td>
        <td class="py-2 px-4 border-b">${turno.hora || ''}</td>
        <td class="py-2 px-4 border-b">${turno.estado}</td>
      `;
      tabla.appendChild(fila);
    });

  } catch (error) {
    console.error('Error al cargar datos del panel:', error.message);
  }
}

// Limpiar historial del día actual
async function limpiarHistorialTurnos() {
  const confirmacion = confirm('¿Estás seguro que quieres limpiar el historial del día?');
  if (!confirmacion) return;

  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('negocio_id', negocioId)
      .gte('fecha', hoy);

    if (error) throw error;

    alert('✅ Historial limpiado con éxito');
    cargarDatos();

  } catch (error) {
    alert('❌ Error al limpiar historial: ' + error.message);
  }
}

// Suscribirse en tiempo real a cambios en la tabla 'turnos'
function suscribirseTurnos() {
  supabase
    .channel('canal-turnos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'turnos',
        filter: `negocio_id=eq.${negocioId}`
      },
      (payload) => {
        console.log('🟢 Cambio en turnos:', payload);
        cargarDatos(); // actualizar el panel automáticamente
      }
    )
    .subscribe();
}

// Iniciar cuando la página carga
window.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  suscribirseTurnos(); // habilita actualizaciones en tiempo real
});

// Exponer función de limpieza para el botón
window.limpiarHistorialTurnos = limpiarHistorialTurnos;
