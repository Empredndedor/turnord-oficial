// usuario.js
import { supabase } from '../database.js';


const negocioId = 'barberia0001';
let turnoAsignado = null;
let intervaloContador = null;
let telefonoUsuario = localStorage.getItem('telefonoUsuario') || null;

let HORA_LIMITE_TURNOS = "23:00"; // valor por defecto

// === Funciones auxiliares ===
function obtenerFechaActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function obtenerHoraActual() {
  const hoy = new Date();
  const horas = String(hoy.getHours()).padStart(2, '0');
  const minutos = String(hoy.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function cerrarModal() {
  document.getElementById('modal').classList.add('hidden');
}

// === Carga de configuración ===
async function cargarHoraCierre() {
  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('hora_cierre')
    .eq('negocio_id', negocioId)
    .single();

  if (!error && data && data.hora_cierre) {
    HORA_LIMITE_TURNOS = data.hora_cierre;
  }
}

// === Generar nuevo turno ===
async function generarNuevoTurno() {
  const { data, error } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 'A01';

  const ultimo = data[0].turno;
  const letra = ultimo.charAt(0);
  const numero = parseInt(ultimo.substring(1)) + 1;
  return `${letra}${numero.toString().padStart(2, '0')}`;
}

// === Verificar si el usuario ya tiene un turno activo ===
async function verificarTurnoActivo() {
  telefonoUsuario = localStorage.getItem('telefonoUsuario');
  if (!telefonoUsuario) return false;

  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('estado', 'En espera')
    .eq('telefono', telefonoUsuario)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al verificar turno activo:', error.message);
    return false;
  }

  if (!data || data.length === 0) return false;

  turnoAsignado = data[0].turno;
  await mostrarMensajeConfirmacion(data[0]);
  return true;
}

// === Obtener posición en la fila ===
async function obtenerPosicionEnFila(turnoUsuario) {
  const { data, error } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .eq('estado', 'En espera')
    .order('created_at', { ascending: true });

  if (error || !data) return 0;

  const index = data.findIndex(t => t.turno === turnoUsuario);
  return index;
}

// === Mostrar mensaje de confirmación con contador ===
async function mostrarMensajeConfirmacion(turnoData) {
  const tiempoPorTurno = 10; // minutos
  const posicion = await obtenerPosicionEnFila(turnoData.turno);
  let tiempoRestante = (posicion + 1) * tiempoPorTurno * 60;

  const mensajeContenedor = document.getElementById('mensaje-turno');
  mensajeContenedor.innerHTML = `
    <div class="bg-green-100 text-green-700 rounded-xl p-4 shadow mt-4 text-sm">
      ✅ Hola <strong>${turnoData.nombre}</strong>, tu turno es <strong>${turnoData.turno}</strong>.<br>
      ⏳ Tiempo estimado: <span id="contador-tiempo"></span><br><br>
      <button id="cancelarTurno" class="bg-red-600 text-white px-3 py-1 mt-2 rounded hover:bg-red-700">
        Cancelar Turno
      </button>
    </div>
  `;

  const tiempoSpan = document.getElementById('contador-tiempo');
  if (intervaloContador) clearInterval(intervaloContador);

  function actualizarContador() {
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    tiempoSpan.textContent = `${minutos} min ${segundos < 10 ? '0' : ''}${segundos} seg`;

    if (tiempoRestante <= 0) {
      tiempoSpan.textContent = `🎉 Prepárate, tu turno está muy cerca.`;
      clearInterval(intervaloContador);
    }
    tiempoRestante--;
  }

  actualizarContador();
  intervaloContador = setInterval(actualizarContador, 1000);

  // Cancelar turno
  document.getElementById('cancelarTurno').addEventListener('click', async () => {
    const confirmacion = confirm('¿Deseas cancelar tu turno?');
    if (!confirmacion) return;

    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('turno', turnoData.turno)
      .eq('negocio_id', negocioId)
      .eq('telefono', telefonoUsuario);

    if (error) {
      alert('Error al cancelar el turno: ' + error.message);
      return;
    }

    mensajeContenedor.innerHTML = `
      <div class="bg-red-100 text-red-700 rounded-xl p-4 shadow mt-4 text-sm">
        ❌ Has cancelado tu turno <strong>${turnoData.turno}</strong>.
      </div>
    `;
    document.querySelector('button[onclick*="modal"]').disabled = false;
    turnoAsignado = null;
    clearInterval(intervaloContador);
    localStorage.removeItem('telefonoUsuario');
    telefonoUsuario = null;
    await actualizarTurnoActualYConteo();
  });
}

// === Actualizar turno actual y conteo ===
async function actualizarTurnoActualYConteo() {
  const { data: turnoActualData } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .eq('estado', 'En espera')
    .order('created_at', { ascending: true })
    .limit(1);

  const { count } = await supabase
    .from('turnos')
    .select('*', { count: 'exact', head: true })
    .eq('negocio_id', negocioId)
    .eq('estado', 'En espera');

  document.getElementById('turno-actual').textContent = turnoActualData?.[0]?.turno || 'A00';
  document.getElementById('conteo-turno').textContent = count || '0';
}

// === Inicialización al cargar la página ===
window.addEventListener('DOMContentLoaded', async () => {
  await cargarHoraCierre();

  const fechaElem = document.getElementById('fecha-de-hoy');
  const btnTomarTurno = document.querySelector('button[onclick*="modal"]');
  const form = document.getElementById('formRegistroNegocio');

  // Mostrar fecha
  fechaElem.textContent = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Validaciones en tiempo real
  document.getElementById('telefono').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
  document.getElementById('nombre').addEventListener('input', function () {
    this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '');
  });

  // Verificar si ya tiene turno
  if (await verificarTurnoActivo()) {
    btnTomarTurno.disabled = true;
  }

  await actualizarTurnoActualYConteo();

  // Registro de nuevo turno
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);
    if (horaActual >= HORA_LIMITE_TURNOS) {
      alert('Ya no se pueden tomar turnos a esta hora. Intenta mañana.');
      return;
    }

    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const servicio = form.tipo.value;

    telefonoUsuario = telefono;
    localStorage.setItem('telefonoUsuario', telefono);

    const { data: turnosActivos } = await supabase
      .from('turnos')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('estado', 'En espera')
      .eq('telefono', telefonoUsuario);

    if (turnosActivos && turnosActivos.length > 0) {
      alert('Ya tienes un turno activo.');
      return;
    }

    const nuevoTurno = await generarNuevoTurno();
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();

    const { error } = await supabase.from('turnos').insert([
      {
        negocio_id: negocioId,
        turno: nuevoTurno,
        nombre,
        telefono,
        servicio,
        estado: 'En espera',
        fecha,
        hora,
      },
    ]);

    if (error) {
      alert('Error al registrar turno: ' + error.message);
      return;
    }

    turnoAsignado = nuevoTurno;
    await mostrarMensajeConfirmacion({ nombre, turno: nuevoTurno });
    form.reset();
    cerrarModal();
    btnTomarTurno.disabled = true;

    await actualizarTurnoActualYConteo();
  });

  // Suscripción en tiempo real
  supabase
    .channel('turnos-usuario')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'turnos',
        filter: `negocio_id=eq.${negocioId}`,
      },
      async (payload) => {
        telefonoUsuario = localStorage.getItem('telefonoUsuario');
        if (telefonoUsuario) {
          const { data, error } = await supabase
            .from('turnos')
            .select('*')
            .eq('negocio_id', negocioId)
            .eq('telefono', telefonoUsuario)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && data && data.estado !== 'En espera') {
            document.getElementById('mensaje-turno').innerHTML = `
              <div class="bg-blue-100 text-blue-700 rounded-xl p-4 shadow mt-4 text-sm">
                ✅ Tu turno <strong>${data.turno}</strong> ha sido ${data.estado.toLowerCase()}.
              </div>
            `;
            turnoAsignado = null;
            btnTomarTurno.disabled = false;
            if (intervaloContador) clearInterval(intervaloContador);
            localStorage.removeItem('telefonoUsuario');
            telefonoUsuario = null;
          }
        }
        await actualizarTurnoActualYConteo();
      }
    )
    .subscribe();
});