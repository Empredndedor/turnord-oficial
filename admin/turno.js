import { supabase } from '../database.js';

const negocioId = 'barberia0001';
let turnoActual = null;
let HORA_APERTURA = "08:00"; // valor por defecto
let HORA_LIMITE_TURNOS = "23:00"; // valor por defecto
let chart = null; // Variable para almacenar la instancia del gráfico

// Cache de servicios (nombre -> duracion_min)
let serviciosCache = {};
async function cargarServicios() {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .select('nombre,duracion_min')
      .eq('negocio_id', negocioId)
      .eq('activo', true);
    if (error) throw error;
    serviciosCache = {};
    (data || []).forEach(s => { serviciosCache[s.nombre] = s.duracion_min; });
    // Poblar select de servicios si existe en esta vista
    const sel = document.getElementById('servicio');
    if (sel && data && data.length) {
      sel.innerHTML = '<option value="">Seleccione un servicio</option>' +
        data.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
    }
  } catch (e) {
    console.warn('No se pudieron cargar servicios, usando fallback.', e);
  }
}

// Cargar hora límite desde configuracion_negocio
async function cargarHoraLimite() {
  try {
    const { data } = await supabase
      .from('configuracion_negocio')
      .select('hora_apertura, hora_cierre')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    if (data) {
      if (data.hora_apertura) HORA_APERTURA = data.hora_apertura;
      if (data.hora_cierre) HORA_LIMITE_TURNOS = data.hora_cierre;
    }
  } catch (e) {
    console.warn('No se pudo cargar horario, usando valores por defecto.', e);
  }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar modo oscuro
  initThemeToggle();
  
  // Inicializar fecha y hora actual
  actualizarFechaHora();
  setInterval(actualizarFechaHora, 60000); // Actualizar cada minuto

  // Cargar configuración
  await cargarHoraLimite();
  // Cargar servicios activos
  await cargarServicios();
  
  // Cargar turnos y estadísticas
  await cargarTurnos();
  await cargarEstadisticas();
  
  // Configurar eventos
  document.getElementById('refrescar-turnos')?.addEventListener('click', async () => {
    await cargarTurnos();
    mostrarNotificacion('Turnos actualizados', 'success');
  });
  
  // Configurar menú móvil
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  mobileMenuButton?.addEventListener('click', toggleMobileMenu);
  overlay?.addEventListener('click', toggleMobileMenu);
  
  function toggleMobileMenu() {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('opacity-0');
    overlay.classList.toggle('pointer-events-none');
  }

  // Suscripción en tiempo real para que la vista se actualice al instante
  suscribirseTurnos();
});

// Función para inicializar el toggle de tema oscuro/claro
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;
  
  // Verificar preferencia guardada
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
  
  themeToggle?.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    const isDark = htmlElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// Función para actualizar la fecha y hora actual
function actualizarFechaHora() {
  const ahora = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaFormateada = ahora.toLocaleDateString('es-ES', opciones);
  const horaFormateada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  document.getElementById('fecha-actual').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  document.getElementById('hora-actual').textContent = horaFormateada;
}

// Tomar turno manual desde el modal
async function tomarTurno(event) {
  event.preventDefault();
  console.log("tomarTurno llamada");

  // Validar horario de apertura y cierre
  const ahora = new Date();
  const horaActual = ahora.toTimeString().slice(0,5);
  const horaStr = ahora.toLocaleTimeString('es-ES', { hour12: false });  // formato 24h "HH:mm:ss"
  if (horaActual < HORA_APERTURA) {
    mostrarNotificacion(`Aún no hemos abierto. Horario: ${HORA_APERTURA} - ${HORA_LIMITE_TURNOS}`, 'error');
    return;
  }
  if (horaActual >= HORA_LIMITE_TURNOS) {
    mostrarNotificacion('Ya no se pueden tomar turnos a esta hora. Intenta mañana.', 'error');
    return;
  }

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();

  if (!nombre || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{2,40}$/.test(nombre)) {
    mostrarNotificacion('El nombre solo debe contener letras y espacios (2 a 40 caracteres).', 'error');
    return;
  }
  if (!/^\d{8,15}$/.test(telefono)) {
    mostrarNotificacion('El teléfono debe contener solo números (8 a 15 dígitos).', 'error');
    return;
  }

  const servicio = document.getElementById('servicio').value;

  const turnoGenerado = await generarNuevoTurno();

  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('turnos').insert([{
    negocio_id: negocioId,
    turno: turnoGenerado,
    nombre: nombre,
    telefono: telefono,
    servicio: servicio,
    estado: 'En espera',
    hora: horaStr,
    fecha: hoy
  }]);

  if (error) {
    mostrarNotificacion('Error al guardar turno: ' + error.message, 'error');
    console.error(error);
    return;
  }

  cerrarModal();
  mostrarNotificacion(`Turno ${turnoGenerado} registrado para ${nombre}`, 'success');
  await cargarTurnos();
  await cargarEstadisticas();
}

// Calcular tiempo de espera estimado basado en el servicio
function calcularTiempoEsperaEstimado(servicio) {
  // Si hay catálogo cargado, úsalo
  if (serviciosCache && serviciosCache[servicio]) return serviciosCache[servicio];
  // Fallback si no hay catálogo
  const tiemposServicio = {
    'Barbería': 30,
    'Corte de cabello': 20,
    'Afeitado': 15,
    'Tratamiento facial': 40
  };
  return tiemposServicio[servicio] || 25;
}

// Calcular tiempo estimado total considerando todos los servicios en cola
async function calcularTiempoEstimadoTotal(turnoObjetivo = null) {
  const hoy = new Date().toISOString().slice(0, 10);
  let tiempoTotal = 0;

  // 1) Obtener tiempo restante del turno en atención
  try {
    const { data: enAtencion } = await supabase
      .from('turnos')
      .select('servicio, started_at')
      .eq('negocio_id', negocioId)
      .eq('fecha', hoy)
      .eq('estado', 'En atención')
      .order('started_at', { ascending: true })
      .limit(1);

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
  } catch (error) {
    console.warn('Error calculando tiempo de atención:', error);
  }

  // 2) Obtener cola de espera y sumar tiempos de servicios
  try {
    const { data: cola } = await supabase
      .from('turnos')
      .select('turno, servicio')
      .eq('negocio_id', negocioId)
      .eq('estado', 'En espera')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });

    if (cola && cola.length) {
      // Si se especifica un turno objetivo, solo sumar hasta ese turno
      const limite = turnoObjetivo ? 
        cola.findIndex(t => t.turno === turnoObjetivo) : 
        cola.length;
      
      const turnosASumar = limite === -1 ? cola : cola.slice(0, limite);
      
      for (const turno of turnosASumar) {
        const duracionServicio = serviciosCache[turno.servicio] || 25;
        tiempoTotal += duracionServicio;
      }
    }
  } catch (error) {
    console.warn('Error calculando tiempo de cola:', error);
  }

  return tiempoTotal;
}

// Generar el próximo turno disponible
async function generarNuevoTurno() {
  const { data, error } = await supabase
    .from('turnos')
    .select('turno')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error al generar turno:', error.message);
    return 'A01';
  }

  if (!data || data.length === 0 || !data[0].turno) {
    return 'A01';
  }

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

  const hoy = new Date().toISOString().slice(0, 10);

  // Buscar si hay un turno actualmente en atención
  const { data: enAtencion, error: errAt } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'En atención')
    .eq('negocio_id', negocioId)
    .eq('fecha', hoy)
    .order('started_at', { ascending: true })
    .limit(1);

  // Cargar cola de espera
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'En espera')
    .eq('negocio_id', negocioId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error al cargar turnos:', error.message);
    mostrarNotificacion('Error al cargar turnos', 'error');
    return;
  }

  const lista = document.getElementById('listaEspera');
  const sinTurnos = document.getElementById('sin-turnos');
  const contadorEspera = document.getElementById('contador-espera');
  const turnosEsperaElement = document.getElementById('turnos-espera');
  
  lista.innerHTML = '';
  
  // Actualizar contador
  if (contadorEspera) {
    contadorEspera.textContent = `${data.length} turno${data.length !== 1 ? 's' : ''}`;
  }
  
  if (turnosEsperaElement) {
    turnosEsperaElement.textContent = data.length;
  }
  
  // Actualizar barra de progreso
  const cargaEspera = document.getElementById('carga-espera');
  if (cargaEspera) {
    // Calcular porcentaje de carga (máximo 100% a partir de 10 turnos)
    const porcentaje = Math.min(data.length * 10, 100);
    cargaEspera.style.width = `${porcentaje}%`;
  }

  // Mostrar mensaje si no hay turnos
  if (data.length === 0 && sinTurnos) {
    sinTurnos.classList.remove('hidden');
  } else if (sinTurnos) {
    sinTurnos.classList.add('hidden');
  }

  // Crear tarjetas de turnos con tiempo estimado mejorado
  for (let index = 0; index < data.length; index++) {
    const t = data[index];
    const div = document.createElement('div');
    div.className = 'bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 transition-all hover:shadow-md';
    
    // Calcular tiempo de espera real (desde creación)
    const horaCreacion = new Date(`${t.fecha}T${t.hora}`);
    const ahora = new Date();
    const minutosEsperaReal = Math.floor((ahora - horaCreacion) / 60000);
    
    // Calcular tiempo estimado hasta que le toque (basado en servicios)
    const tiempoEstimadoHasta = await calcularTiempoEstimadoTotal(t.turno);
    
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-2xl font-bold text-blue-700 dark:text-blue-400">${t.turno}</span>
        <span class="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">${t.hora.slice(0, 5)}</span>
      </div>
      <p class="text-gray-700 dark:text-gray-300 font-medium mt-2 truncate">${t.nombre || 'Cliente'}</p>
      <div class="flex justify-between items-center mt-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">${t.servicio || 'Servicio'}</span>
        <div class="text-right">
          <span class="text-xs text-gray-500 dark:text-gray-400 block">Esperando: ${minutosEsperaReal} min</span>
          <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">ETA: ${tiempoEstimadoHasta} min</span>
        </div>
      </div>
    `;
    
    lista.appendChild(div);
  }

  // Determinar turno actual: en atención si existe, si no el primero en espera
  turnoActual = (enAtencion && enAtencion.length > 0) ? enAtencion[0] : (data.length > 0 ? data[0] : null);

  // Actualizar información del turno actual
  document.getElementById('turnoActual').textContent = turnoActual ? turnoActual.turno : '--';

  const clienteActual = document.getElementById('cliente-actual');
  if (clienteActual) {
    clienteActual.textContent = turnoActual ? turnoActual.nombre : '-';
  }

  const tiempoEstimado = document.getElementById('tiempo-estimado');
  if (tiempoEstimado) {
    if (turnoActual) {
      if (turnoActual.estado === 'En atención') {
        // Mostrar que está en atención actualmente
        const inicio = turnoActual.started_at ? new Date(turnoActual.started_at) : null;
        if (inicio) {
          const trans = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 60000));
          tiempoEstimado.textContent = `En atención · ${trans} min`;
        } else {
          tiempoEstimado.textContent = `En atención`;
        }
      } else {
        // Estimado por servicio
        const mins = (serviciosCache && serviciosCache[turnoActual.servicio]) ? serviciosCache[turnoActual.servicio] : 25;
        tiempoEstimado.textContent = `${mins} min`;
      }
    } else {
      tiempoEstimado.textContent = '-';
    }
  }
  
  console.log("Turno actual:", turnoActual);
  
  // Calcular tiempo promedio de espera mejorado
  if (data.length > 0) {
    const tiempoPromedio = document.getElementById('tiempo-promedio');
    if (tiempoPromedio) {
      // Calcular el tiempo total acumulado de todos los servicios en cola
      const tiempoTotalCola = await calcularTiempoEstimadoTotal();
      const promedio = data.length > 0 ? tiempoTotalCola / data.length : 0;
      tiempoPromedio.textContent = `${Math.round(promedio)} min`;
    }
  }
}

// Cargar estadísticas para el gráfico
async function cargarEstadisticas() {
  const hoy = new Date().toISOString().slice(0, 10);
  
  // Obtener turnos atendidos hoy
  const { data: turnosAtendidos, error: errorAtendidos } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'Atendido')
    .eq('negocio_id', negocioId)
    .eq('fecha', hoy);
    
  if (errorAtendidos) {
    console.error('Error al cargar estadísticas:', errorAtendidos.message);
    return;
  }
  
  // Obtener turnos devueltos hoy
  const { data: turnosDevueltos, error: errorDevueltos } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'Devuelto')
    .eq('negocio_id', negocioId)
    .eq('fecha', hoy);
    
  if (errorDevueltos) {
    console.error('Error al cargar estadísticas de turnos devueltos:', errorDevueltos.message);
    return;
  }
  
  // Actualizar contador de turnos atendidos
  const turnosAtendidosElement = document.getElementById('turnos-atendidos');
  if (turnosAtendidosElement) {
    turnosAtendidosElement.textContent = turnosAtendidos.length;
  }
  
  // Calcular ingresos totales
  const ingresos = turnosAtendidos.reduce((total, turno) => total + (turno.monto_cobrado || 0), 0);
  const ingresosHoy = document.getElementById('ingresos-hoy');
  if (ingresosHoy) {
    ingresosHoy.textContent = `RD$${ingresos.toFixed(2)}`;
  }
  
  // Calcular promedio de cobro
  const promedioCobro = document.getElementById('promedio-cobro');
  if (promedioCobro && turnosAtendidos.length > 0) {
    const promedio = ingresos / turnosAtendidos.length;
    promedioCobro.textContent = `RD$${promedio.toFixed(2)}`;
  }
  
  // Crear gráfico de estadísticas
  const ctx = document.getElementById('estadisticasChart');
  if (!ctx) return;
  
  // Agrupar turnos por hora
  const turnosPorHora = {};
  const horasDelDia = [];
  
  // Inicializar horas del día (de 8 AM a 8 PM)
  for (let i = 8; i <= 20; i++) {
    const hora = i < 10 ? `0${i}:00` : `${i}:00`;
    horasDelDia.push(hora);
    turnosPorHora[hora] = { atendidos: 0, devueltos: 0, espera: 0 };
  }
  
  // Contar turnos atendidos por hora
  turnosAtendidos.forEach(turno => {
    const hora = turno.hora.slice(0, 5);
    const horaRedondeada = `${hora.slice(0, 2)}:00`;
    if (turnosPorHora[horaRedondeada]) {
      turnosPorHora[horaRedondeada].atendidos++;
    }
  });
  
  // Contar turnos devueltos por hora
  turnosDevueltos.forEach(turno => {
    const hora = turno.hora.slice(0, 5);
    const horaRedondeada = `${hora.slice(0, 2)}:00`;
    if (turnosPorHora[horaRedondeada]) {
      turnosPorHora[horaRedondeada].devueltos++;
    }
  });
  
  // Obtener turnos en espera
  const { data: turnosEspera, error: errorEspera } = await supabase
    .from('turnos')
    .select('*')
    .eq('estado', 'En espera')
    .eq('negocio_id', negocioId)
    .eq('fecha', hoy);
    
  if (!errorEspera && turnosEspera) {
    turnosEspera.forEach(turno => {
      const hora = turno.hora.slice(0, 5);
      const horaRedondeada = `${hora.slice(0, 2)}:00`;
      if (turnosPorHora[horaRedondeada]) {
        turnosPorHora[horaRedondeada].espera++;
      }
    });
  }
  
  // Preparar datos para el gráfico
  const datosAtendidos = horasDelDia.map(hora => turnosPorHora[hora].atendidos);
  const datosDevueltos = horasDelDia.map(hora => turnosPorHora[hora].devueltos);
  const datosEspera = horasDelDia.map(hora => turnosPorHora[hora].espera);
  
  // Destruir gráfico existente si hay uno
  if (chart) {
    chart.destroy();
  }
  
  // Crear nuevo gráfico
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: horasDelDia,
      datasets: [
        {
          label: 'Atendidos',
          data: datosAtendidos,
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Devueltos',
          data: datosDevueltos,
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        },
        {
          label: 'En Espera',
          data: datosEspera,
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#4b5563'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.2)'
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#4b5563'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.2)'
          }
        }
      }
    }
  });
}

// Suscripción en tiempo real a cambios en turnos
function suscribirseTurnos() {
  supabase
    .channel('turnos-admin')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'turnos', filter: `negocio_id=eq.${negocioId}` },
      async () => {
        await cargarTurnos();
        await cargarEstadisticas();
      }
    )
    .subscribe();
}

// Modal para tomar turno
function abrirModal() {
  console.log("abrirModal llamada");
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').classList.add('flex');
  document.getElementById('nombre').focus();
}

function cerrarModal() {
  console.log("cerrarModal llamada");
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal').classList.remove('flex');
  document.getElementById('formTurno').reset();
}

// Modal de cobro
function abrirModalCobro() {
  console.log("abrirModalCobro llamada");
  if (!turnoActual) {
    mostrarNotificacion('No hay turno en espera.', 'warning');
    return;
  }
  document.getElementById('modalCobro').classList.remove('hidden');
  document.getElementById('modalCobro').classList.add('flex');
  document.getElementById('montoCobrado').focus();
}

function cerrarModalCobro() {
  console.log("cerrarModalCobro llamada");
  document.getElementById('modalCobro').classList.add('hidden');
  document.getElementById('modalCobro').classList.remove('flex');
  document.getElementById('formCobro').reset();
}

// Atender ahora
async function atenderAhora() {
  if (!turnoActual) {
    mostrarNotificacion('No hay turno en espera.', 'warning');
    return;
  }
  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'En atención', started_at: new Date().toISOString() })
    .eq('id', turnoActual.id)
    .eq('estado', 'En espera');
  if (error) {
    mostrarNotificacion('Error al atender: ' + error.message, 'error');
    return;
  }
  mostrarNotificacion(`Atendiendo turno ${turnoActual.turno}`, 'success');
  await cargarTurnos();
  await cargarEstadisticas();
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
    mostrarNotificacion('Error al guardar cobro: ' + error.message, 'error');
    console.error(error);
    return;
  }

  cerrarModalCobro();
  mostrarNotificacion(`Turno ${turnoActual.turno} finalizado con cobro de RD$${monto}`, 'success');
  await cargarTurnos();
  await cargarEstadisticas();
}

// Devolver turno al final de la cola
async function devolverTurno() {
  console.log("devolverTurno llamada");
  if (!turnoActual) {
    mostrarNotificacion('No hay turno que devolver.', 'warning');
    return;
  }

  if (!confirm(`¿Enviar el turno ${turnoActual.turno} al final de la cola?`)) {
    return;
  }

  const ahoraISO = new Date().toISOString();

  // Mantener 'En espera' y actualizar created_at para mandarlo al final
  // mover al final: orden = MAX(orden)+1 para hoy
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: maxData, error: maxErr } = await supabase
    .from('turnos')
    .select('orden')
    .eq('negocio_id', negocioId)
    .eq('fecha', hoy)
    .order('orden', { ascending: false })
    .limit(1);
  if (maxErr) {
    mostrarNotificacion('Error al devolver turno: ' + maxErr.message, 'error');
    return;
  }
  const nextOrden = (maxData && maxData.length ? maxData[0].orden : 0) + 1;
  const { error } = await supabase
    .from('turnos')
    .update({ orden: nextOrden })
    .eq('id', turnoActual.id)
    .eq('estado', 'En espera');

  if (error) {
    mostrarNotificacion('Error al devolver turno: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion(`Turno ${turnoActual.turno} enviado al final de la cola`, 'info');
  await cargarTurnos();
  await cargarEstadisticas();
}

// Función para mostrar notificaciones con SweetAlert2
function mostrarNotificacion(mensaje, tipo = 'info') {
  const iconos = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  
  Swal.fire({
    title: tipo === 'error' ? 'Error' : tipo === 'success' ? 'Éxito' : 'Información',
    text: mensaje,
    icon: iconos[tipo] || 'info',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });
}

// Exportar funciones para uso en HTML
window.tomarTurno = tomarTurno;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;
window.guardarCobro = guardarCobro;
window.devolverTurno = devolverTurno;
window.atenderAhora = atenderAhora;
