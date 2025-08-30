// index-data.js
// Este script se encarga de obtener los datos de la tabla 'turnos' y mostrarlos en index.html
// También verifica la conexión a otras tablas clave del sistema.

import { supabase } from './database.js';

// Función para cargar y mostrar los turnos
async function cargarTurnos() {
  const listaElement = document.getElementById('turnos-lista');
  if (!listaElement) {
    console.error('El elemento con id "turnos-lista" no se encontró en el HTML.');
    return;
  }

  try {
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*')
      .order('fecha', { ascending: true })
      .limit(10);

    if (error) throw error;

    listaElement.innerHTML = '';
    if (turnos.length === 0) {
      listaElement.innerHTML = '<li class="bg-white/10 p-3 rounded-lg text-center">No hay próximos turnos.</li>';
      return;
    }

    turnos.forEach(turno => {
      const li = document.createElement('li');
      li.className = 'bg-white/20 p-4 rounded-lg shadow flex justify-between items-center';
      const nombreCliente = turno.nombre_cliente || 'Cliente no especificado';
      const fecha = turno.fecha ? new Date(turno.fecha).toLocaleDateString('es-ES') : 'Fecha no especificada';
      const hora = turno.hora || '';
      li.innerHTML = `<span><strong class="font-semibold">${nombreCliente}</strong></span><span class="text-sm">${fecha} ${hora}</span>`;
      listaElement.appendChild(li);
    });

  } catch (err) {
    console.error('Error al cargar los turnos:', err);
    listaElement.innerHTML = `<li class="bg-red-500/50 text-white p-3 rounded-lg text-center">Error al cargar los turnos: ${err.message}</li>`;
  }
}

// Función para verificar la conexión a otras tablas
async function verificarConexiones() {
  const statusListElement = document.getElementById('system-status-lista');
  if (!statusListElement) {
    console.error('El elemento con id "system-status-lista" no se encontró en el HTML.');
    return;
  }

  const tablasParaVerificar = ['configuracion_negocio', 'servicios'];
  statusListElement.innerHTML = ''; // Limpiar la lista

  for (const tabla of tablasParaVerificar) {
    const li = document.createElement('li');
    li.className = 'flex justify-between items-center';

    let statusHTML;
    try {
      // Usamos { head: true } para no descargar datos, solo verificar el acceso
      const { error } = await supabase.from(tabla).select('id', { head: true, count: 'exact' }).limit(1);
      if (error) throw error;
      statusHTML = `<span>Tabla '${tabla}'</span> <span class="font-bold text-green-400">Conectado</span>`;
    } catch (err) {
      console.error(`Error al verificar la tabla ${tabla}:`, err);
      statusHTML = `<span>Tabla '${tabla}'</span> <span class="font-bold text-red-400">Error</span>`;
    }
    li.innerHTML = statusHTML;
    statusListElement.appendChild(li);
  }
}

// Ejecutar ambas funciones al cargar la página
cargarTurnos();
verificarConexiones();
