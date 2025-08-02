function limpiarHistorialTurnos() {
  if (confirm("¿Estás seguro de que deseas eliminar todo el historial de turnos?")) {
    localStorage.removeItem("historialTurnos");
    location.reload();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("tablaHistorial");
  const historial = JSON.parse(localStorage.getItem("historialTurnos")) || [];

  historial.forEach(item => {
    const fila = document.createElement("tr");
    const colorClase = item.estado === "Atendido" ? "text-green-600" : "text-yellow-600";
    fila.innerHTML = `
      <td class="py-2 px-4 border-b">${item.turno}</td>
      <td class="py-2 px-4 border-b">${item.cliente}</td>
      <td class="py-2 px-4 border-b">${item.hora}</td>
      <td class="py-2 px-4 border-b ${colorClase} font-semibold">${item.estado}</td>
    `;
    tbody.appendChild(fila);
  });
});
