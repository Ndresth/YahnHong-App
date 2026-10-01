import { QueryCache, QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * Caché de datos del servidor (TanStack Query).
 * - Reintenta sola si falla la red o el servidor (Render reiniciando), nunca en errores 4xx.
 * - Vuelve a pedir los datos al regresar a la pestaña y al recuperar la conexión.
 * - Las pantallas que piden lo mismo comparten una sola petición y la misma copia.
 * Para avisar un error con un toast, la consulta declara `meta: { errorToast: 'id-del-toast' }`.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.errorToast) toast.error(error.message, { id: query.meta.errorToast });
    }
  }),
  defaultOptions: {
    queries: {
      retry: (intentos, error) => (error?.status === 0 || error?.status >= 500) && intentos < 3,
      retryDelay: (intento) => Math.min(1000 * 2 ** intento, 8000),
      staleTime: 10000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
  }
});

/** Claves de las consultas (una sola fuente para leer, actualizar e invalidar). */
export const CLAVES = {
  productos: (rol) => ['productos', rol || 'publico'],
  horario: ['horario'],
  ordenesActivas: ['ordenes', 'activas'],
  ordenesTurno: ['ordenes', 'turno'],
  ventasHoy: ['caja', 'ventasHoy'],
  gastosHoy: ['caja', 'gastosHoy'],
  reporte: (desde, hasta) => ['reportes', desde, hasta],
  reporteDia: (dia) => ['reportes', 'dia', dia],
  cierres: ['cierres'],
  diasCerrados: ['diasCerrados'],
  usuarios: ['usuarios']
};
