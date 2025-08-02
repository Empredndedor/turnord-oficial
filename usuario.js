// usuario.js
import { tomarTurno } from './usuario-turnos-tomado.js';

document.addEventListener('DOMContentLoaded', () => {
  const fechaHoy = document.getElementById('fecha-de-hoy');
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  function getTiempoDia() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'Mañana';
    if (hora >= 12 && hora < 18) return 'Tarde';
    return 'Noche';
  }

  function mostrarFecha() {
    const dia = diasSemana[new Date().getDay()];
    const tiempo = getTiempoDia();
    fechaHoy.textContent = `Hoy es ${dia} - ${tiempo}`;
  }

  mostrarFecha();

  const modal = document.getElementById('modal');
  const form = document.getElementById('formRegistroNegocio');
  const mensajeTurno = document.getElementById('mensaje-turno');
  const turnoActual = document.getElementById('turno-actual');
  const conteoTurno = document.getElementById('conteo-turno');

  function cerrarModal() {
    modal.classList.add('hidden');
    form.reset();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const nombre = formData.get('nombre');
    const telefono = formData.get('telefono');
    const tipo = formData.get('tipo');
    const descripcion = formData.get('descripcion');

    const resultado = await tomarTurno(nombre, telefono, tipo, descripcion);

    cerrarModal();

    // Simulación de resultado del turno (ajustar según lo que devuelva tomarTurno)
    const numeroTurno = resultado?.numeroTurno || generarTurno();
    const tiempoEstimado = resultado?.tiempoEstimado || calcularTiempo(conteoTurno.textContent);

    mensajeTurno.innerHTML = `
      <div class="bg-green-100 text-green-800 p-4 rounded-xl mt-4 shadow-md">
        <p class="font-semibold">¡Turno registrado con éxito!</p>
        <p>Nombre: <strong>${nombre}</strong></p>
        <p>Número de turno: <strong>${numeroTurno}</strong></p>
        <p>Tiempo estimado de espera: <strong>${tiempoEstimado} minutos</strong></p>
      </div>
    `;

    // Actualiza conteo visual
    conteoTurno.textContent = parseInt(conteoTurno.textContent) + 1;
  });

  function generarTurno() {
    const actual = turnoActual.textContent;
    const letra = actual.charAt(0);
    const numero = parseInt(actual.substring(1)) + 1;
    return `${letra}${numero.toString().padStart(2, '0')}`;
  }

  function calcularTiempo(conteo) {
    const personasDelante = parseInt(conteo);
    const minutosPorPersona = 5;
    return personasDelante * minutosPorPersona;
  }
});
