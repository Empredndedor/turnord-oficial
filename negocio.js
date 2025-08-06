import { supabase } from './database.js';

const negocioId = 'barberia0001';

// Función para obtener ganancias agrupadas por fecha
async function obtenerGanancias() {
  const { data, error } = await supabase
    .from('turnos')
    .select('fecha, monto_cobrado')
    .eq('negocio_id', negocioId);

  if (error) {
    console.error('Error al obtener ingresos:', error);
    return [];
  }

  // Agrupar y sumar montos por fecha
  const resumen = {};
  data.forEach(({ fecha, monto_cobrado }) => {
    if (!resumen[fecha]) resumen[fecha] = 0;
    resumen[fecha] += Number(monto_cobrado) || 0;
  });

  // Convertir a array
  return Object.entries(resumen).map(([fecha, ganancia]) => ({
    Fecha: fecha,
    Ganancia: ganancia.toFixed(2),
  }));
}

// Función para exportar a Excel
async function exportarAExcel() {
  const ingresos = await obtenerGanancias();

  if (ingresos.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(ingresos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');

  XLSX.writeFile(wb, 'historial_ingresos.xlsx');
}

// Evento clic botón exportar
document.getElementById('exportExcel').addEventListener('click', exportarAExcel);
