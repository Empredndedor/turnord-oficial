import { supabase } from '../database.js';

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
    // Validar monto_cobrado
    const monto = Number(monto_cobrado);
    if (!resumen[fecha]) resumen[fecha] = 0;
    resumen[fecha] += isNaN(monto) ? 0 : monto;
  });

  // Convertir a array
  return Object.entries(resumen).map(([fecha, ganancia]) => ({
    Fecha: fecha,
    Ganancia: ganancia.toFixed(2),
  }));
}

// Función para exportar a Excel
async function exportarAExcel() {
  let ingresos = await obtenerGanancias();

  if (ingresos.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Ordenar por fecha ascendente
  ingresos = ingresos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

  // Calcular total general
  const total = ingresos.reduce((sum, fila) => sum + Number(fila.Ganancia), 0);

  // Agregar fila de total general
  ingresos.push({
    Fecha: 'TOTAL',
    Ganancia: total.toFixed(2),
  });

  const ws = XLSX.utils.json_to_sheet(ingresos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');

  XLSX.writeFile(wb, 'historial_ingresos.xlsx');
}

// Función para mostrar ganancias del día, semana y mes
async function mostrarTotales() {
  const ingresos = await obtenerGanancias();

  // Obtener fechas actuales
  const hoy = new Date();
  const diaActual = hoy.toISOString().slice(0, 10);

  // Calcular inicio de semana (lunes)
  const primerDiaSemana = new Date(hoy);
  primerDiaSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
  const inicioSemana = primerDiaSemana.toISOString().slice(0, 10);

  // Calcular inicio de mes
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);

  let totalDia = 0, totalSemana = 0, totalMes = 0;

  ingresos.forEach(({ Fecha, Ganancia }) => {
    if (Fecha === 'TOTAL') return; // Saltar fila de total

    if (Fecha === diaActual) totalDia += Number(Ganancia);

    if (Fecha >= inicioSemana && Fecha <= diaActual) totalSemana += Number(Ganancia);

    if (Fecha >= inicioMes && Fecha <= diaActual) totalMes += Number(Ganancia);
  });

  document.getElementById('ganancia-dia').textContent = totalDia.toFixed(2);
  document.getElementById('ganancia-semana').textContent = totalSemana.toFixed(2);
  document.getElementById('ganancia-mes').textContent = totalMes.toFixed(2);
}

// Evento clic botón exportar
document.getElementById('exportExcel').addEventListener('click', exportarAExcel);

// Llama a mostrarTotales al cargar la página
mostrarTotales();

// Si tienes un formulario para agregar montos, llama a mostrarTotales() después de agregar un monto exitosamente
document.querySelector('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const horaCierre = document.getElementById('hora-cierre').value;

  // Guardar en Supabase
  const { error } = await supabase
    .from('configuracion_negocio')
    .upsert([{ negocio_id: negocioId, hora_cierre: horaCierre }]);

  if (error) {
    alert('Error al guardar configuración');
    return;
  }

  alert('¡Configuración guardada!');
});

window.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('hora_cierre')
    .eq('negocio_id', negocioId)
    .single();

  if (!error && data && data.hora_cierre) {
    document.getElementById('hora-cierre').value = data.hora_cierre;
  }
});
