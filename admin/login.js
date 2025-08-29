import { supabase } from '../database.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('error');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Si el login es exitoso, Supabase guarda la sesión.
    // Redirigir al panel de administración.
    window.location.replace('panel.html');

  } catch (error) {
    console.error('Error en el inicio de sesión:', error.message);
    errorElement.textContent = 'Email o contraseña incorrecta.';
    errorElement.classList.remove('hidden');
  }
});
