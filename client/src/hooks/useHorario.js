import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { fechaArchivo } from '../utils/format';
import { sumarDias } from '../utils/fechas';
import { CLAVES } from '../utils/queryClient';

const TZ = 'America/Bogota';

/** "HH:MM" (24 h) de una fecha en hora de Colombia. */
export const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "11:30 a. m." en hora de Colombia. */
export const hora12 = (d) => new Date(d).toLocaleTimeString('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

const franja = (f) => f && { dia: f.dia, festivo: f.festivo, cerrado: f.cerrado || null, abre: new Date(f.abre).getTime(), cierra: new Date(f.cierra).getTime() };

/**
 * Horario de atención según el servidor (única fuente: server/lib/horario.js).
 * Recalcula el estado cada 30 s con el reloj del servidor, así que cambia a
 * Abierto/Cerrado sin recargar la página. Se vuelve a pedir cada 15 min y al
 * regresar a la pestaña (p. ej. al día siguiente).
 */
export function useHorario() {
  const { data: datos, dataUpdatedAt } = useQuery({
    queryKey: CLAVES.horario,
    queryFn: async () => {
      const d = await api('/api/horario');
      return { offset: new Date(d.ahora).getTime() - Date.now(), franjas: [franja(d.hoy), franja(d.proxima)] };
    },
    staleTime: 60000,
    refetchInterval: 15 * 60000
    // sin horario la web sigue funcionando: el servidor valida cada pedido
  });
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(reloj);
  }, []);

  const estado = useMemo(() => {
    if (!datos) return null;
    const t = Math.max(ahora, dataUpdatedAt) + datos.offset; // hora del servidor
    const hoyDia = fechaArchivo(t);
    const franjaHoy = datos.franjas.find(f => f.dia === hoyDia) || null;
    const cerradoHoy = franjaHoy?.cerrado || null; // día especial cerrado desde Caja → Ajustes
    const hoy = cerradoHoy ? null : franjaHoy;
    const abierto = Boolean(hoy && t >= hoy.abre && t < hoy.cierra);
    const antesDeAbrir = Boolean(hoy && t < hoy.abre);
    const siguiente = abierto ? null : antesDeAbrir ? hoy : datos.franjas.find(f => f.abre > t && !f.cerrado) || null;

    let texto;
    if (abierto) texto = `Abierto · hasta ${hora12(hoy.cierra)}`;
    else if (!siguiente) texto = 'Cerrado';
    else {
      const cuando = siguiente.dia === hoyDia ? 'hoy'
        : siguiente.dia === sumarDias(hoyDia, 1) ? 'mañana'
          : new Date(siguiente.abre).toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long' });
      texto = `Cerrado · abre ${cuando} ${hora12(siguiente.abre)}`;
    }
    if (cerradoHoy) texto = texto.replace('Cerrado', /^cerrado/i.test(cerradoHoy) ? 'Cerrado hoy' : `Cerrado hoy (${cerradoHoy})`);
    return { ahora: t, hoy, abierto, antesDeAbrir, siguiente, texto, cerradoHoy };
  }, [datos, dataUpdatedAt, ahora]);

  return estado;
}
