// usuario.js
// =============================
// Importaciones y configuración
// =============================
import { supabase } from '../database.js';

// Identificador del negocio (hardcoded para este ejemplo)
const negocioId = 'barberia0001';

// =============================
// Estado y Cache Global
// =============================
let turnoAsignado = null;
let intervaloContador = null;
let telefonoUsuario = localStorage.getItem('telefonoUsuario') || null;
let serviciosCache = {};
let configCache = {
  hora_apertura: '08:00',
  hora_cierre: '23:00',
  limite_turnos: 50,
  dias_operacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] // Default
};

// =============================
// Funciones de Utilidad
// =============================

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 */
function obtenerFechaActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Obtiene la hora actual en formato HH:MM.
 */
function obtenerHoraActual() {
  const hoy = new Date();
  const horas = String(hoy.getHours()).padStart(2, '0');
  const minutos = String(hoy.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Genera una clave única para guardar el deadline de un turno en localStorage.
 */
function getDeadlineKey(turno) {
  return `turnoDeadline:${negocioId}:${turno}`;
}

/**
 * Muestra una notificación temporal en la UI.
 * @param {string} titulo - El título de la notificación.
 * @param {string} mensaje - El cuerpo del mensaje.
 * @param {'info'|'success'|'error'} tipo - El tipo de notificación.
 */
function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    const container = document.getElementById('mensaje-turno') || document.body;
    const colorClasses = {
      info: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
    };
    const notification = document.createElement('div');
    notification.className = `p-4 rounded-lg shadow-md mt-4 ${colorClasses[tipo]}`;
    notification.innerHTML = `<p class="font-bold">${titulo}</p><p class="text-sm">${mensaje}</p>`;

    const existingNotif = container.querySelector('[data-notification]');
    if(existingNotif) existingNotif.remove();

    notification.setAttribute('data-notification', 'true');
    container.prepend(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
}

// =============================
// Interacción con Supabase
// =============================

/**
 * Carga los servicios activos del negocio desde la base de datos.
 */
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

/**
 * Obtiene la configuración del negocio (horarios, límites) desde Supabase.
 */
async function actualizarConfiguracion() {
  try {
    const { data, error } = await supabase
      .from('configuracion_negocio')
      .select('hora_apertura, hora_cierre, limite_turnos, dias_operacion')
      .eq('negocio_id', negocioId)
      .single();

    if (error) throw new Error(error.message);

    if (data) {
      configCache = { ...configCache, ...data };
    }
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
  }
}

/**
 * Verifica si el negocio está en modo "break".
 * @returns {Promise<{enBreak: boolean, mensaje: string|null, tiempoRestante: number|null}>}
 */
async function verificarBreakNegocio() {
  try {
    const { data, error } = await supabase
      .from('estado_negocio')
      .select('en_break, break_end_time, break_message')
      .eq('negocio_id', negocioId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { enBreak: false, mensaje: null, tiempoRestante: null };
    }

    if (data && data.en_break) {
      const endTime = new Date(data.break_end_time);
      const now = new Date();
      if (endTime > now) {
        return {
          enBreak: true,
          mensaje: data.break_message || 'Estamos en break, regresamos pronto...',
          tiempoRestante: Math.ceil((endTime - now) / (1000 * 60))
        };
      }
    }
    return { enBreak: false, mensaje: null, tiempoRestante: null };
  } catch (error) {
    console.error('Error al verificar break:', error);
    return { enBreak: false, mensaje: null, tiempoRestante: null };
  }
}

/**
 * Verifica si una fecha dada es un día laboral para el negocio.
 * @param {Date} fecha - La fecha a verificar.
 * @returns {Promise<boolean>}
 */
async function esDiaLaboral(fecha = new Date()) {
    if (!configCache.dias_operacion || configCache.dias_operacion.length === 0) {
        await actualizarConfiguracion();
    }
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dia = diasSemana[fecha.getDay()];
    return configCache.dias_operacion.includes(dia);
}

// =============================
// Lógica de Negocio de Turnos
// =============================

/**
 * Genera un nuevo código de turno basado en la letra del día y el último número usado.
 * @returns {Promise<string>}
 */
async function generarNuevoTurno() {
  const letraHoy = obtenerLetraDelDia();
  const fechaHoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .eq('fecha', fechaHoy)
    .like('turno', `${letraHoy}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return `${letraHoy}01`;

  const ultimo = data[0].turno || `${letraHoy}00`;
  const numero = parseInt(ultimo.substring(1), 10) + 1;
  return `${letraHoy}${String(numero).padStart(2, '0')}`;
}

/**
 * Calcula el tiempo de espera estimado total para un turno.
 * Suma el tiempo restante del turno en atención y los tiempos de los servicios en la cola.
 * @param {string|null} turnoObjetivo - El turno para el cual calcular el ETA.
 * @returns {Promise<number>} - Tiempo estimado en minutos.
 */
async function calcularTiempoEstimadoTotal(turnoObjetivo = null) {
  const hoy = new Date().toISOString().slice(0, 10);
  let tiempoTotal = 0;

  try {
    const { data: enAtencion } = await supabase.from('turnos').select('servicio, started_at').eq('negocio_id', negocioId).eq('fecha', hoy).eq('estado', 'En atención').order('started_at', { ascending: true }).limit(1);
    if (enAtencion && enAtencion.length) {
      const servicio = enAtencion[0].servicio;
      const duracionTotal = serviciosCache[servicio] || 25;
      const inicio = enAtencion[0].started_at ? new Date(enAtencion[0].started_at) : null;
      if (inicio) {
        const transcurrido = Math.floor((Date.now() - inicio.getTime()) / 60000);
        tiempoTotal = Math.max(duracionTotal - transcurrido, 0);
      } else {
        tiempoTotal = duracionTotal;
      }
    }

    const { data: cola } = await supabase.from('turnos').select('turno, servicio').eq('negocio_id', negocioId).eq('estado', 'En espera').order('orden', { ascending: true }).order('created_at', { ascending: true });
    if (cola && cola.length) {
      const limite = turnoObjetivo ? cola.findIndex(t => t.turno === turnoObjetivo) : cola.length;
      const turnosASumar = limite === -1 ? cola : cola.slice(0, limite);
      for (const turno of turnosASumar) {
        tiempoTotal += serviciosCache[turno.servicio] || 25;
      }
    }
  } catch (error) {
    console.warn('Error calculando tiempo de cola:', error);
  }

  return tiempoTotal;
}

/**
 * Proceso principal para registrar un nuevo turno.
 */
async function tomarTurnoSimple(nombre, telefono, servicio) {
  const esLaboral = await esDiaLaboral();
  if (!esLaboral) {
    mostrarNotificacion('Hoy no es un día laboral', 'No se pueden tomar turnos en este día.', 'error');
    return;
  }

  const estadoBreak = await verificarBreakNegocio();
  if (estadoBreak.enBreak) {
    mostrarNotificacion('Negocio en Break', estadoBreak.mensaje, 'error');
    return;
  }

  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  if (horaActual < configCache.hora_apertura || horaActual > configCache.hora_cierre) {
    mostrarNotificacion('Fuera de horario', `Nuestro horario es de ${configCache.hora_apertura} a ${configCache.hora_cierre}.`, 'error');
    return;
  }

  const { count, error: countError } = await supabase.from('turnos').select('id', { count: 'exact', head: true }).eq('negocio_id', negocioId).eq('fecha', obtenerFechaActual());
  if (countError || (count || 0) >= configCache.limite_turnos) {
    mostrarNotificacion('Límite alcanzado', `Se ha alcanzado el límite de ${configCache.limite_turnos} turnos para hoy.`, 'error');
    return;
  }

  telefonoUsuario = telefono;
  localStorage.setItem('telefonoUsuario', telefonoUsuario);
  const { data: turnosActivos } = await supabase.from('turnos').select('id').eq('negocio_id', negocioId).eq('estado', 'En espera').eq('telefono', telefonoUsuario);
  if (turnosActivos && turnosActivos.length > 0) {
    mostrarNotificacion('Turno existente', 'Ya tienes un turno activo.', 'error');
    return;
  }

  const nuevoTurno = await generarNuevoTurno();
  const { error } = await supabase.from('turnos').insert([{ negocio_id: negocioId, turno: nuevoTurno, nombre, telefono, servicio, estado: 'En espera', fecha: obtenerFechaActual(), hora: obtenerHoraActual() }]);

  if (error) {
    mostrarNotificacion('Error', 'No se pudo registrar el turno: ' + error.message, 'error');
    return;
  }

  turnoAsignado = nuevoTurno;
  await mostrarMensajeConfirmacion({ nombre, turno: nuevoTurno });
  document.getElementById('formRegistroNegocio')?.reset();
  document.getElementById('modal')?.classList.add('hidden');
  document.querySelector('button[onclick*="modal"]')?.setAttribute('disabled', 'true');
  actualizarTurnoActualYConteo();
}

// =============================
// Lógica de UI y Eventos
// =============================

/**
 * Muestra el mensaje de confirmación con el turno asignado y el contador.
 */
async function mostrarMensajeConfirmacion(turnoData) {
    const deadlineKey = getDeadlineKey(turnoData.turno);
    let deadline = Number(localStorage.getItem(deadlineKey) || 0);
    if (!deadline || Number.isNaN(deadline) || deadline <= Date.now()) {
      const minutosEspera = await calcularTiempoEstimadoTotal(turnoData.turno);
      deadline = Date.now() + (minutosEspera * 60 * 1000);
      localStorage.setItem(deadlineKey, String(deadline));
    }

    const mensajeContenedor = document.getElementById('mensaje-turno');
    if (!mensajeContenedor) return;

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
      if (tiempoSpan) tiempoSpan.textContent = `${minutos} min ${segundos < 10 ? '0' : ''}${segundos} seg`;

      if (restante <= 0) {
        if (tiempoSpan) tiempoSpan.textContent = '🎉 Prepárate, tu turno está muy cerca.';
        clearInterval(intervaloContador);
      }
    }

    actualizarContador();
    intervaloContador = setInterval(actualizarContador, 1000);

    document.getElementById('cancelarTurno')?.addEventListener('click', async () => {
      if (!confirm('¿Deseas cancelar tu turno?')) return;
      const { error } = await supabase.from('turnos').delete().eq('turno', turnoData.turno).eq('negocio_id', negocioId).eq('telefono', telefonoUsuario);
      if (error) {
        mostrarNotificacion('Error', 'No se pudo cancelar el turno: ' + error.message, 'error');
        return;
      }
      mensajeContenedor.innerHTML = `<div class="bg-red-100 text-red-700 rounded-xl p-4 shadow mt-4 text-sm">❌ Has cancelado tu turno <strong>${turnoData.turno}</strong>.</div>`;
      document.querySelector('button[onclick*="modal"]')?.removeAttribute('disabled');
      turnoAsignado = null;
      clearInterval(intervaloContador);
      localStorage.removeItem(deadlineKey);
      localStorage.removeItem('telefonoUsuario');
      telefonoUsuario = null;
      actualizarTurnoActualYConteo();
    });
}

/**
 * Actualiza la UI con el turno actual y el conteo de espera.
 */
async function actualizarTurnoActualYConteo() {
  const hoy = obtenerFechaActual();
  const { data: enAtencion } = await supabase.from('turnos').select('turno').eq('negocio_id', negocioId).eq('fecha', hoy).eq('estado', 'En atención').order('started_at', { ascending: true }).limit(1);
  let turnoActualTexto = enAtencion && enAtencion.length ? enAtencion[0].turno : null;

  if (!turnoActualTexto) {
    const { data: enEspera } = await supabase.from('turnos').select('turno').eq('negocio_id', negocioId).eq('fecha', hoy).eq('estado', 'En espera').order('created_at', { ascending: true }).limit(1);
    turnoActualTexto = enEspera && enEspera.length ? enEspera[0].turno : null;
  }

  const { count } = await supabase.from('turnos').select('id', { count: 'exact', head: true }).eq('negocio_id', negocioId).eq('fecha', hoy).eq('estado', 'En espera');

  document.getElementById('turno-actual').textContent = turnoActualTexto || `${obtenerLetraDelDia()}00`;
  document.getElementById('conteo-turno').textContent = (count || 0).toString();
}

/**
 * Verifica si el usuario actual (basado en localStorage) tiene un turno activo.
 */
async function verificarTurnoActivo() {
    telefonoUsuario = localStorage.getItem('telefonoUsuario');
    if (!telefonoUsuario) return false;

    const { data, error } = await supabase.from('turnos').select('*').eq('negocio_id', negocioId).eq('estado', 'En espera').eq('telefono', telefonoUsuario).order('created_at', { ascending: false }).limit(1).single();

    if (error || !data) return false;

    turnoAsignado = data.turno;
    await mostrarMensajeConfirmacion(data);
    return true;
}

// =============================
// Inicialización y Suscripciones
// =============================

window.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('formRegistroNegocio');
  const btnTomarTurno = document.querySelector('button[onclick*="modal"]');

  // Cargar configuraciones críticas primero
  await Promise.all([actualizarConfiguracion(), cargarServiciosActivos()]);

  const esLaboral = await esDiaLaboral();
  const estadoBreak = await verificarBreakNegocio();

  if (btnTomarTurno) {
      if (!esLaboral) {
          btnTomarTurno.disabled = true;
          btnTomarTurno.title = "Hoy no es un día laboral.";
          btnTomarTurno.classList.add('opacity-50', 'cursor-not-allowed');
      } else if (estadoBreak.enBreak) {
          btnTomarTurno.disabled = true;
          btnTomarTurno.title = "El negocio está en break.";
          btnTomarTurno.classList.add('opacity-50', 'cursor-not-allowed');
          mostrarNotificacion('Negocio en Break', estadoBreak.mensaje, 'error');
      } else {
          btnTomarTurno.disabled = false;
          btnTomarTurno.classList.remove('opacity-50', 'cursor-not-allowed');
      }
  }

  // Configurar UI
  const fechaElem = document.getElementById('fecha-de-hoy');
  if (fechaElem) {
    const fechaTexto = new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    fechaElem.innerHTML = `${fechaTexto} <span class="text-blue-600 dark:text-blue-400 font-bold">(Turnos serie ${obtenerLetraDelDia()})</span>`;
  }

  // Validaciones en inputs
  document.getElementById('telefono')?.addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, ''); });
  document.getElementById('nombre')?.addEventListener('input', function () { this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, ''); });

  if (await verificarTurnoActivo()) {
    if (btnTomarTurno) btnTomarTurno.disabled = true;
  }

  await actualizarTurnoActualYConteo();

  // Event listener para el formulario
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Procesando...`;

    try {
      const nombre = form.nombre.value.trim();
      const telefono = form.telefono.value.trim();
      const servicio = form.tipo.value;

      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{2,40}$/.test(nombre)) {
        mostrarNotificacion('Entrada inválida', 'El nombre solo debe contener letras y espacios (2 a 40 caracteres).', 'error'); return;
      }
      if (!/^\d{8,15}$/.test(telefono)) {
        mostrarNotificacion('Entrada inválida', 'El teléfono debe contener solo números (8 a 15 dígitos).', 'error'); return;
      }
      if (!servicio) {
        mostrarNotificacion('Entrada inválida', 'Por favor, seleccione un servicio.', 'error'); return;
      }
      await tomarTurnoSimple(nombre, telefono, servicio);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });

  // Suscripciones de Supabase
  supabase.channel('turnos-usuario').on('postgres_changes', { event: '*', schema: 'public', table: 'turnos', filter: `negocio_id=eq.${negocioId}` }, async (payload) => {
    await actualizarTurnoActualYConteo();
    if(telefonoUsuario && payload.eventType === 'DELETE' && payload.old.telefono === telefonoUsuario) {
        // Lógica para cuando el turno del usuario es eliminado (atendido/cancelado)
        mostrarNotificacion('Turno Finalizado', `Tu turno ${payload.old.turno} ha sido completado.`);
        document.querySelector('button[onclick*="modal"]')?.removeAttribute('disabled');
        turnoAsignado = null;
        if (intervaloContador) clearInterval(intervaloContador);
        localStorage.removeItem(getDeadlineKey(payload.old.turno));
        localStorage.removeItem('telefonoUsuario');
        telefonoUsuario = null;
    }
  }).subscribe();

  supabase.channel('servicios-usuario').on('postgres_changes', { event: '*', schema: 'public', table: 'servicios', filter: `negocio_id=eq.${negocioId}` }, cargarServiciosActivos).subscribe();

  supabase.channel('estado-negocio-usuario').on('postgres_changes', { event: '*', schema: 'public', table: 'estado_negocio', filter: `negocio_id=eq.${negocioId}` }, async () => {
    const estado = await verificarBreakNegocio();
    const btn = document.querySelector('button[onclick*="modal"]');
    if (btn) {
        btn.disabled = estado.enBreak;
        btn.classList.toggle('opacity-50', estado.enBreak);
        btn.classList.toggle('cursor-not-allowed', estado.enBreak);
        if(estado.enBreak) mostrarNotificacion('Negocio en Break', estado.mensaje, 'error');
    }
  }).subscribe();

  supabase.channel('configuracion-negocio-usuario').on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_negocio', filter: `negocio_id=eq.${negocioId}` }, actualizarConfiguracion).subscribe();
});

window.cerrarModal = () => {
    document.getElementById('modal')?.classList.add('hidden');
};
