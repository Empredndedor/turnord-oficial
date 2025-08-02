// Función para guardar configuración de horario y turnos
document.addEventListener("DOMContentLoaded", () => {
  const guardarBtn = document.querySelector('button.bg-green-600');
  const horaApertura = document.querySelector('input[type="time"]:nth-child(2)');
  const horaCierre = document.querySelector('input[type="time"]:nth-child(4)');
  const limiteTurnos = document.querySelector('input[type="number"]');

  // Cargar datos si existen
  if (localStorage.getItem("configHorario")) {
    const config = JSON.parse(localStorage.getItem("configHorario"));
    horaApertura.value = config.apertura;
    horaCierre.value = config.cierre;
    limiteTurnos.value = config.limite;
  }

  guardarBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const config = {
      apertura: horaApertura.value,
      cierre: horaCierre.value,
      limite: limiteTurnos.value
    };
    localStorage.setItem("configHorario", JSON.stringify(config));
    alert("Horario guardado correctamente.");
  });

  // Manejo de selección de sucursales
  const sucursalSelect = document.querySelector("select");
  const verBtn = document.querySelector('button.bg-blue-600');

  verBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const sucursal = sucursalSelect.value;
    alert("Estadísticas de: " + sucursal);
    // Aquí puedes conectar con tu backend para mostrar datos reales por sucursal
  });

  // Exportar datos simulados
  const exportExcelBtn = document.querySelector('button.bg-blue-600:nth-of-type(2)');
  const exportPdfBtn = document.querySelector('button.bg-gray-600');

  exportExcelBtn.addEventListener("click", () => {
    alert("Exportando a Excel... (aún no implementado)");
    // Aquí podrías usar SheetJS para exportar a Excel
  });

  exportPdfBtn.addEventListener("click", () => {
    alert("Exportando a PDF... (aún no implementado)");
    // Aquí podrías usar jsPDF para exportar a PDF
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const datos = JSON.parse(localStorage.getItem('historialIngresos')) || {
    dia: 0,
    semana: 0,
    mes: 0,
  };

  document.querySelector('.bg-green-100 p:last-child').textContent = `$${datos.dia.toFixed(2)}`;
  document.querySelector('.bg-blue-100 p:last-child').textContent = `$${datos.semana.toFixed(2)}`;
  document.querySelector('.bg-purple-100 p:last-child').textContent = `$${datos.mes.toFixed(2)}`;
});
