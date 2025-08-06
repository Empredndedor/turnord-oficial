import { supabase } from './database.js';

const negocioId = 'barberia0001';
let turnoActual = null;

// Tomar turno manual desde el modal
async function tomarTurno(event) {
  event.preventDefault();
  console.log("tomarTurno llamada");

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const servicio = document.getElementById('servicio').value;

  const turnoGenerado = await generarNuevoTurno();

  const ahora = new Date();
const horaStr = ahora.toLocaleTimeString('es-ES', { hour12: false });  // formato 24h "HH:mm:ss"


  const { error } = await supabase.from('turnos').insert([{
  negocio_id: negocioId,
  turno: turnoGenerado,
  nombre: nombre,
  telefono: telefono,
  servicio: servicio,
  estado: 'En espera',
  hora: horaStr    // enviamos la hora
}]);


  if (error) {
    alert('Error al guardar turno: ' + error.message);
    console.error(error);
    return;
  }

  cerrarModal();
  alert(`✅ Turno ${turnoGenerado} registrado para ${nombre}`);
  await cargarTurnos();
}

// Generar el próximo turno disponible
async function generarNuevoTurno() {
  const { data, error } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })  // Orden descendente para obtener último registro
    .limit(1);

  if (error) {
    console.error('Error al generar turno:', error.message);
    return 'A01';
  }

  if (!data || data.length === 0) return 'A01';

  const ultimo = data[0].turno;
  const letra = ultimo.charAt(0);
  const numero = parseInt(ultimo.substring(1)) + 1;
  const nuevoTurno = `${letra}${numero.toString().padStart(2, '0')}`;
  console.log("Nuevo turno generado:", nuevoTurno);
  return nuevoTurno;
}

// Cargar turnos en espera
async function cargarTurnos() {
  console.log("cargarTurnos llamada");

  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'En espera')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error al cargar turnos:', error.message);
    return;
  }

  const lista = document.getElementById('listaEspera');
  lista.innerHTML = '';

  data.forEach(t => {
    const div = document.createElement('div');
    div.className = 'bg-blue-100 text-blue-900 p-3 rounded-lg shadow';
    div.innerHTML = `<strong>${t.turno}</strong><br>${t.cliente || ''}`;
    lista.appendChild(div);
  });

  turnoActual = data.length > 0 ? data[0] : null;
  document.getElementById('turnoActual').textContent = turnoActual ? turnoActual.turno : '--';
  console.log("Turno actual:", turnoActual);
}

// Modal para tomar turno
function abrirModal() {
  console.log("abrirModal llamada");
  document.getElementById('modal').classList.remove('hidden');
}

function cerrarModal() {
  console.log("cerrarModal llamada");
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('formTurno').reset();
}

// Modal de cobro
function abrirModalCobro() {
  console.log("abrirModalCobro llamada");
  if (!turnoActual) {
    alert('No hay turno en espera.');
    return;
  }
  document.getElementById('modalCobro').classList.remove('hidden');
}

function cerrarModalCobro() {
  console.log("cerrarModalCobro llamada");
  document.getElementById('modalCobro').classList.add('hidden');
  document.getElementById('formCobro').reset();
}

// Guardar el cobro e indicar que el turno fue atendido
async function guardarCobro(event) {
  event.preventDefault();
  console.log("guardarCobro llamada");

  const monto = parseFloat(document.getElementById('montoCobrado').value);
  if (!turnoActual) return;

  const { error } = await supabase
    .from('turnos')
    .update({
      estado: 'Atendido',
      monto_cobrado: monto
    })
    .eq('id', turnoActual.id);

  if (error) {
    alert('Error al guardar cobro: ' + error.message);
    console.error(error);
    return;
  }

  cerrarModalCobro();
  alert(`✅ Turno ${turnoActual.turno} finalizado con cobro de RD$${monto}`);
  await cargarTurnos();
}

// Devolver turno al final de la cola
async function devolverTurno() {
  console.log("devolverTurno llamada");
  if (!turnoActual) {
    alert('No hay turno que devolver.');
    return;
  }

  // Cambiamos estado a 'Devuelto' para indicar que se pone al final
  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'Devuelto' })
    .eq('id', turnoActual.id);

  if (error) {
    alert('Error al devolver turno: ' + error.message);
    console.error(error);
    return;
  }

  alert(`🔁 Turno ${turnoActual.turno} devuelto`);
  await cargarTurnos();
}

// Al cargar la página, carga los turnos
window.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded - cargando turnos");
  cargarTurnos();
});

// Exponer funciones para que el HTML pueda llamarlas en onclick
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;
window.devolverTurno = devolverTurno;
window.guardarCobro = guardarCobro;
window.tomarTurno = tomarTurno;

console.log("Funciones expuestas y script cargado.");
