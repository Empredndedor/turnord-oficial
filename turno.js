let contador = 1;
let turnos = ["A01"];
let turnoActual = "A01";

function actualizarTurnoActual() {
  document.getElementById("turnoActual").textContent = turnoActual;
}

function abrirModal() {
  document.getElementById("modal").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("formTurno").reset();
}

function abrirModalCobro() {
  document.getElementById('modalCobro').classList.remove('hidden');
}

function cerrarModalCobro() {
  document.getElementById('modalCobro').classList.add('hidden');
  document.getElementById('montoCobrado').value = '';
}

function tomarTurno(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const servicio = document.getElementById('servicio').value;

  if (!nombre || !telefono || !servicio) {
    alert('Completa todos los campos');
    return;
  }

  contador++;
  const nuevoTurno = `A${contador.toString().padStart(2, "0")}`;
  turnos.push(nuevoTurno);
  agregarTurnoVisual(nuevoTurno, nombre, servicio);
  guardarHistorialTurno(nuevoTurno, nombre, servicio);
  if (turnos.length === 1) turnoActual = nuevoTurno;
  actualizarTurnoActual();
  cerrarModal();
}

function agregarTurnoVisual(turno, nombre, servicio) {
  const tiempoEspera = (turnos.indexOf(turno)) * 20;

  const div = document.createElement("div");
  div.className =
    "bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-xl text-left shadow";
  div.innerHTML = `
    <div><strong>${turno}</strong> - ${nombre} (${servicio})</div>
    <div class="text-sm">Tiempo estimado: ${tiempoEspera} min</div>
  `;
  document.getElementById("listaEspera").appendChild(div);
}

function guardarHistorialTurno(turno, nombre, servicio) {
  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const historial = JSON.parse(localStorage.getItem("historialTurnos")) || [];
  historial.push({ turno, cliente: nombre, servicio, hora, estado: "En espera" });
  localStorage.setItem("historialTurnos", JSON.stringify(historial));
}

function avanzarTurno() {
  if (turnos.length > 1) {
    const turnoAtendido = turnos.shift();
    turnoActual = turnos[0];
    actualizarTurnoActual();
    document.getElementById("listaEspera").removeChild(document.getElementById("listaEspera").firstElementChild);

    const historial = JSON.parse(localStorage.getItem("historialTurnos")) || [];
    const index = historial.findIndex(t => t.turno === turnoAtendido);
    if (index !== -1) {
      historial[index].estado = "Atendido";
      localStorage.setItem("historialTurnos", JSON.stringify(historial));
    }
  }
}

function devolverTurno() {
  const anterior = `A${(parseInt(turnoActual.slice(1)) - 1).toString().padStart(2, "0")}`;
  if (!turnos.includes(anterior)) {
    turnos.unshift(anterior);
    const div = document.createElement("div");
    div.textContent = anterior;
    div.className =
      "bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-xl text-center min-w-[60px]";
    document.getElementById("listaEspera").prepend(div);
    turnoActual = anterior;
    actualizarTurnoActual();
  }
}

function guardarCobro(event) {
  event.preventDefault();
  const monto = parseFloat(document.getElementById('montoCobrado').value);
  if (isNaN(monto) || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }

  let historial = JSON.parse(localStorage.getItem('historialIngresos')) || {
    dia: 0,
    semana: 0,
    mes: 0,
  };

  historial.dia += monto;
  historial.semana += monto;
  historial.mes += monto;

  localStorage.setItem('historialIngresos', JSON.stringify(historial));
  cerrarModalCobro();
  avanzarTurno();
}

// Al cargar
actualizarTurnoActual();
