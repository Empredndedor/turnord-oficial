document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault(); // Previene que se recargue la página

  const usuario = document.getElementById("username").value;
  const clave = document.getElementById("password").value;

  // Validar credenciales
  if (usuario === "persona1" && clave === "12345") {
    try {
      // Establecer sesión para el guard (auth.js lee 'authToken')
      localStorage.setItem("authToken", "1");

      // Si hay parámetro 'next', regresar a la página original
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      if (next) {
        window.location.replace(next);
      } else {
        window.location.replace("panel.html");
      }
    } catch (err) {
      // Fallback mínimo
      window.location.href = "panel.html";
    }
  } else {
    document.getElementById("error").classList.remove("hidden");
  }
});
