// Se importa el cliente de Supabase desde el archivo de configuración central (database.js).
// Esto asegura que toda la aplicación utiliza la misma conexión segura.
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

    // Asignar el negocio_id al usuario después del login exitoso
    if (data.user) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { negocio_id: 'barberia0001' }
      });
      
      if (updateError) {
        console.warn('No se pudo actualizar el negocio_id:', updateError.message);
      }
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

