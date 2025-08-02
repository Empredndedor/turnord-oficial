// ✅ usuario-turnos-tomado.js
// Este script debe cargarse como <script type="module" src="usuario-turnos-tomado.js"></script>

import { supabase } from './database.js';

export async function tomarTurno(nombre, telefono, tipo, descripcion) {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Verifica si ya tiene un turno pendiente
    const { data: turnosExistentes, error: errorConsulta } = await supabase
      .from('turnos')
      .select('*')
      .eq('telefono', telefono)
      .eq('estado', 'pendiente')
      .eq('fecha', hoy);

    if (errorConsulta) throw errorConsulta;

    if (turnosExistentes.length > 0) {
      alert('Ya tienes un turno pendiente. Espera a que se atienda.');
      return;
    }

    // Obtener el último turno del día para generar el siguiente código
    const { data: turnosHoy, error: errorTurnosHoy } = await supabase
      .from('turnos')
      .select('turno')
      .eq('fecha', hoy)
      .order('turno', { ascending: false });

    if (errorTurnosHoy) throw errorTurnosHoy;

    let nuevoCodigo = 'A01';
    if (turnosHoy.length > 0) {
      const ultimo = turnosHoy[0].turno;
      const num = parseInt(ultimo.slice(1)) + 1;
      nuevoCodigo = `A${num.toString().padStart(2, '0')}`;
    }

    const nuevo = {
      nombre,
      telefono,
      tipo,
      descripcion,
      turno: nuevoCodigo,
      estado: 'pendiente',
      fecha: hoy,
    };

    const { data: nuevoTurno, error: insertError } = await supabase.from('turnos').insert([nuevo]);

    if (insertError) {
      console.error('Error al insertar turno:', insertError);
    } else {
      console.log('Turno guardado en Supabase:', nuevoTurno);
    }
  } catch (error) {
    console.error('Error general al tomar turno:', error);
  }
}
