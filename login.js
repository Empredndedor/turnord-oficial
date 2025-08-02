document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault(); // Previene que se recargue la página

  const usuario = document.getElementById("username").value;
  const clave = document.getElementById("password").value;

  // Validar credenciales
  if (usuario === "persona1" && clave === "12345") {
    window.location.href = "panel.html"; // Redirige al panel
  } else {
    document.getElementById("error").classList.remove("hidden");
  }
});
