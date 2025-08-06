import { supabase } from './database.js';

const negocioId = 'barberia0001';
let turnoAsignado = null;

function obtenerFechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function obtenerHoraActual() {
  return new Date().toLocaleTimeString('es-ES', { hour12: false });
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fecha-de-hoy').textContent = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const btnTomarTurno = document.querySelector('button[onclick*="modal"]');
  const mensajeContenedor = document.getElementById('mensaje-turno');
  const form = document.getElementById('formRegistroNegocio');
  let intervaloContador = null;

  // Función para generar nuevo turno
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

  // Verificar si el usuario ya tiene turno activo
  async function verificarTurnoActivo() {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('estado', 'En espera')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al verificar turno activo:', error.message);
      return false;
    }

    if (!data || data.length === 0) return false;

    // Para simplificar, asumimos un solo usuario, bloqueamos si hay algún turno en espera
    turnoAsignado = data[0].turno;
    mostrarMensajeConfirmacion(data[0]);
    btnTomarTurno.disabled = true;
    return true;
  }

  // Mostrar mensaje de confirmación con contador fijo
  function mostrarMensajeConfirmacion(turnoData) {
    let tiempoRestante = 30 * 60; // 30 minutos en segundos
    mensajeContenedor.innerHTML = `
      <div class="bg-green-100 text-green-700 rounded-xl p-4 shadow mt-4 text-sm">
        ✅ Hola <strong>${turnoData.nombre}</strong>, tu turno es <strong>${turnoData.turno}</strong>.<br>
        ⏳ Tiempo estimado: <span id="contador-tiempo">30 min 00 seg</span><br><br>
        <button id="cancelarTurno" class="bg-red-600 text-white px-3 py-1 mt-2 rounded hover:bg-red-700">
          Cancelar Turno
        </button>
      </div>
    `;

    // Actualizar contador regresivo
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

    // Botón cancelar turno
    document.getElementById('cancelarTurno').addEventListener('click', async () => {
      const confirmacion = confirm('¿Deseas cancelar tu turno?');
      if (!confirmacion) return;

      const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('turno', turnoData.turno)
        .eq('negocio_id', negocioId);

      if (error) {
        alert('Error al cancelar el turno: ' + error.message);
        return;
      }

      mensajeContenedor.innerHTML = `
        <div class="bg-red-100 text-red-700 rounded-xl p-4 shadow mt-4 text-sm">
          ❌ Has cancelado tu turno <strong>${turnoData.turno}</strong>.
        </div>
      `;
      btnTomarTurno.disabled = false;
      turnoAsignado = null;
      clearInterval(intervaloContador);
    });
  }

  // Listener submit para registrar turno
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Bloquear si ya tiene turno
    if (turnoAsignado) {
      alert('Ya tienes un turno activo. Por favor espera que sea atendido o cancélalo.');
      return;
    }

    const nombre = form.nombre.value.trim();
    const telefono = form.telefono.value.trim();
    const servicio = form.tipo.value;
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();

    const nuevoTurno = await generarNuevoTurno();

    const { data, error } = await supabase.from('turnos').insert([{
      negocio_id: negocioId,
      turno: nuevoTurno,
      nombre,
      telefono,
      servicio,
      estado: 'En espera',
      fecha,
      hora
    }]);

    if (error) {
      alert('Error al registrar turno: ' + error.message);
      return;
    }

    turnoAsignado = nuevoTurno;
    mostrarMensajeConfirmacion({ nombre, turno: nuevoTurno });
    form.reset();
    document.getElementById('modal').classList.add('hidden');
    btnTomarTurno.disabled = true;
  });

  // Suscribirse a cambios en la tabla turnos para actualizar estado del turno asignado
  supabase
    .channel('turnos-usuario')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'turnos',
        filter: `negocio_id=eq.${negocioId}`
      },
      async (payload) => {
        // Si hay un turno asignado, verifica si cambio de estado (p.ej. atendido)
        if (!turnoAsignado) return;

        const { data, error } = await supabase
          .from('turnos')
          .select('*')
          .eq('turno', turnoAsignado)
          .eq('negocio_id', negocioId)
          .limit(1)
          .single();

        if (error) {
          console.error('Error al obtener turno asignado:', error.message);
          return;
        }

        if (data.estado !== 'En espera') {
          // Si ya no está en espera (atendido o cancelado), desbloqueamos
          mensajeContenedor.innerHTML = `
            <div class="bg-blue-100 text-blue-700 rounded-xl p-4 shadow mt-4 text-sm">
              ✅ Tu turno <strong>${turnoAsignado}</strong> ha sido ${data.estado.toLowerCase()}.
            </div>
          `;
          turnoAsignado = null;
          btnTomarTurno.disabled = false;
          if (intervaloContador) clearInterval(intervaloContador);
        }
      }
    )
    .subscribe();

  // Al cargar la página, verificamos si el usuario ya tiene turno activo
  verificarTurnoActivo();
});

