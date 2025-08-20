// usuario.js
import { supabase } from '../database.js';


const negocioId = 'barberia0001';
let turnoAsignado = null;
let intervaloContador = null;
let telefonoUsuario = localStorage.getItem('telefonoUsuario') || null;

let HORA_LIMITE_TURNOS = "23:00"; // valor por defecto

// Persistencia del deadline del turno para que el contador continúe al volver a la pestaña
function getDeadlineKey(turno) {
  return `turnoDeadline:${negocioId}:${turno}`;
}

// Catálogo de servicios (nombre -> duracion_min)
let serviciosCache = {};
async function cargarServiciosActivos() {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .select('nombre,duracion_min')
      .eq('negocio_id', negocioId)
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    serviciosCache = {};
    (data || []).forEach(s => { serviciosCache[s.nombre] = s.duracion_min; });
    const sel = document.querySelector('select[name="tipo"]');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccione un servicio</option>' +
        (data || []).map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
    }
  } catch (e) {
    console.warn('No se pudieron cargar servicios activos.', e);
  }
}

async function tomarTurnoSimple(nombre, telefono, servicio) {
  // Verificar si el negocio está en break
  const estadoBreak = await verificarBreakNegocio();
  if (estadoBreak.enBreak) {
    mostrarNotificacionBreak(estadoBreak.mensaje, estadoBreak.tiempoRestante);
    return;
  }

  const horaCierre = (await obtenerConfig()).hora_cierre;
  const ahora = new Date();
  const [cierreHora, cierreMin] = horaCierre.split(':').map(Number);

  if (
    ahora.getHours() > cierreHora ||
    (ahora.getHours() === cierreHora && ahora.getMinutes() > cierreMin)
  ) {
    alert('Ya hemos cerrado, no se pueden tomar más turnos.');
    return;
  }

  const { error } = await supabase.from('turnos').insert([
    {
      negocio_id: negocioId,
      nombre,
      telefono,
      servicio,
      estado: 'En espera',
      fecha: new Date().toISOString().split('T')[0],
      hora: ahora.toLocaleTimeString(),
    },
  ]);

  if (error) {
    console.error('Error tomando turno:', error.message);
    alert('Error al tomar el turno');
  } else {
    alert('Turno registrado correctamente');
  }
}



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
window.cerrarModal = cerrarModal;

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
  const deadlineKey = getDeadlineKey(turnoData.turno);
  let deadline = Number(localStorage.getItem(deadlineKey) || 0);
  if (!deadline || Number.isNaN(deadline) || deadline <= Date.now()) {
    // 1) Obtener turno en atención (para añadir su remanente si aplica)
    const hoyISO = new Date().toISOString().slice(0,10);
    let restanteAtencion = 0;
    try {
      const { data: enAtencion } = await supabase
        .from('turnos')
        .select('servicio, started_at')
        .eq('negocio_id', negocioId)
        .eq('fecha', hoyISO)
        .eq('estado', 'En atención')
        .order('started_at', { ascending: true })
        .limit(1);
      if (enAtencion && enAtencion.length) {
        const serv = enAtencion[0].servicio;
        const dur = serviciosCache[serv] || 25;
        const inicio = enAtencion[0].started_at ? new Date(enAtencion[0].started_at) : null;
        if (inicio) {
          const trans = Math.floor((Date.now() - inicio.getTime()) / 60000);
          restanteAtencion = Math.max(dur - trans, 0);
        } else {
          restanteAtencion = dur;
        }
      }
    } catch {}

    // 2) Obtener cola en espera y sumar duraciones de los turnos por delante
    const { data: cola } = await supabase
      .from('turnos')
      .select('turno, servicio')
      .eq('negocio_id', negocioId)
      .eq('estado', 'En espera')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });

    let minutosEspera = restanteAtencion;
    if (cola && cola.length) {
      const idx = cola.findIndex(x => x.turno === turnoData.turno);
      const limite = idx === -1 ? cola.length : idx; // si no está aún en la cola, toma todos
      for (let i = 0; i < limite; i++) {
        const serv = cola[i].servicio;
        minutosEspera += (serviciosCache[serv] || 25);
      }
    }

    deadline = Date.now() + (minutosEspera * 60 * 1000);
    localStorage.setItem(deadlineKey, String(deadline));
  }

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
    const restante = Math.ceil((deadline - Date.now()) / 1000);
    const segundosPos = Math.max(0, restante);
    const minutos = Math.floor(segundosPos / 60);
    const segundos = segundosPos % 60;
    tiempoSpan.textContent = `${minutos} min ${segundos < 10 ? '0' : ''}${segundos} seg`;

    if (restante <= 0) {
      tiempoSpan.textContent = `🎉 Prepárate, tu turno está muy cerca.`;
      clearInterval(intervaloContador);
    }
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
    localStorage.removeItem(deadlineKey);
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
  await cargarServiciosActivos();
  await cargarHoraCierre();

  const fechaElem = document.getElementById('fecha-de-hoy');
  const btnTomarTurno = document.querySelector('button[onclick*="modal"]');
  const form = document.getElementById('formRegistroNegocio');

  // Estado de break inicial
  const estadoBreakInicial = await verificarBreakNegocio();
  if (estadoBreakInicial.enBreak) {
    btnTomarTurno.disabled = true;
    btnTomarTurno.classList.add('opacity-50','cursor-not-allowed');
    mostrarNotificacionBreak(estadoBreakInicial.mensaje, estadoBreakInicial.tiempoRestante);
  } else {
    btnTomarTurno.disabled = false;
    btnTomarTurno.classList.remove('opacity-50','cursor-not-allowed');
  }

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

    // Verificar si el negocio está en break
    const estadoBreak = await verificarBreakNegocio();
    if (estadoBreak.enBreak) {
      mostrarNotificacionBreak(estadoBreak.mensaje, estadoBreak.tiempoRestante);
      return;
    }

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
            localStorage.removeItem(getDeadlineKey(data.turno));
            localStorage.removeItem('telefonoUsuario');
            telefonoUsuario = null;
          }
        }
        await actualizarTurnoActualYConteo();
      }
    )
    .subscribe();

  // Suscripción al estado de negocio (break)
  supabase
    .channel('estado-negocio-usuario')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'estado_negocio',
        filter: `negocio_id=eq.${negocioId}`,
      },
      async () => {
        const estado = await verificarBreakNegocio();
        if (estado.enBreak) {
          btnTomarTurno.disabled = true;
          btnTomarTurno.classList.add('opacity-50','cursor-not-allowed');
          mostrarNotificacionBreak(estado.mensaje, estado.tiempoRestante);
        } else {
          btnTomarTurno.disabled = false;
          btnTomarTurno.classList.remove('opacity-50','cursor-not-allowed');
        }
      }
    )
    .subscribe();
});




// usuario.js


// Ayuda: compara "HH:MM" (24h)
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Obtiene config (apertura, cierre, límite)
async function obtenerConfig() {
  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('hora_apertura, hora_cierre, limite_turnos')
    .eq('negocio_id', negocioId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Cuenta turnos de una fecha YYYY-MM-DD
async function contarTurnosDia(fechaISO) {
  const { count, error } = await supabase
    .from('turnos')
    .select('id', { count: 'exact', head: true })
    .eq('negocio_id', negocioId)
    .eq('fecha', fechaISO);

  if (error) throw new Error(error.message);
  return count || 0;
}

/**
 * Llama a esta función cuando el usuario intente reservar.
 * - nombre, telefono, servicio: strings
 * - fechaISO: "YYYY-MM-DD" (ej. 2025-08-12)
 * - horaHHMM: "HH:MM" 24h (ej. "14:30")
 */
// ===== FUNCIONES DE VERIFICACIÓN DE BREAK =====

// Verificar si el negocio está en break
async function verificarBreakNegocio() {
  try {
    const { data, error } = await supabase
      .from('estado_negocio')
      .select('en_break, break_end_time, break_message')
      .eq('negocio_id', negocioId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { enBreak: false, mensaje: null };
    }

    if (data && data.en_break) {
      const endTime = new Date(data.break_end_time);
      const now = new Date();
      
      if (endTime > now) {
        return { 
          enBreak: true, 
          mensaje: data.break_message || 'Estamos en break, regresamos pronto...',
          tiempoRestante: Math.ceil((endTime - now) / (1000 * 60)) // en minutos
        };
      }
    }
    
    return { enBreak: false, mensaje: null };
  } catch (error) {
    console.error('Error al verificar break:', error);
    return { enBreak: false, mensaje: null };
  }
}

// Mostrar notificación de break
function mostrarNotificacionBreak(mensaje, tiempoRestante) {
  const notificacion = document.createElement('div');
  notificacion.className = 'fixed top-4 right-4 bg-orange-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
  notificacion.innerHTML = `
    <div class="flex items-start space-x-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h4 class="font-semibold mb-1">Negocio en Break</h4>
        <p class="text-sm mb-2">${mensaje}</p>
        <p class="text-xs opacity-90">Tiempo estimado: ${tiempoRestante} minutos</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(notificacion);
  
  // Auto-remover después de 8 segundos
  setTimeout(() => {
    if (notificacion.parentElement) {
      notificacion.remove();
    }
  }, 8000);
}

export async function tomarTurno(nombre, telefono, servicio, fechaISO, horaHHMM) {
  try {
    // Verificar si el negocio está en break
    const estadoBreak = await verificarBreakNegocio();
    if (estadoBreak.enBreak) {
      mostrarNotificacionBreak(estadoBreak.mensaje, estadoBreak.tiempoRestante);
      return;
    }

    const cfg = await obtenerConfig();
    const aperturaMin = hhmmToMinutes(cfg.hora_apertura);
    const cierreMin   = hhmmToMinutes(cfg.hora_cierre);
    const horaMin     = hhmmToMinutes(horaHHMM);

    // Validar hora dentro del horario [apertura, cierre]
    if (horaMin < aperturaMin || horaMin > cierreMin) {
      alert(`⛔ El negocio solo atiende de ${cfg.hora_apertura} a ${cfg.hora_cierre}.`);
      return;
    }

    // Límite diario
    const usados = await contarTurnosDia(fechaISO);
    if (usados >= cfg.limite_turnos) {
      alert(`⛔ Se alcanzó el límite de ${cfg.limite_turnos} turnos para ${fechaISO}.`);
      return;
    }

    // Inserta turno
    const ahora = new Date();
    const { error: insertError } = await supabase.from('turnos').insert([{
      negocio_id: negocioId,
      nombre,
      telefono,
      servicio,
      estado: 'En espera',
      fecha: fechaISO,
      hora: horaHHMM,
      created_at: ahora.toISOString()
    }]);

    if (insertError) {
      console.error(insertError);
      alert('❌ Error al registrar el turno.');
    } else {
      alert('✅ Turno registrado con éxito.');
      // aquí puedes refrescar listas, etc.
    }

  } catch (e) {
    console.error(e);
    alert('❌ No se pudo validar la configuración del negocio.');
  }
}
