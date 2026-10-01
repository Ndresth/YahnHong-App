import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getSession } from '../utils/api';
import { CLAVES } from '../utils/queryClient';

const leerCopia = () => {
  try { return JSON.parse(localStorage.getItem('menuCache') || 'null') || undefined; } catch { return undefined; }
};

/** Carga el menú. Muestra la última copia guardada mientras llega la respuesta (arranque en frío de Render). */
export function useProducts({ refetchInterval } = {}) {
  const queryClient = useQueryClient();
  // El personal ve también las categorías solo POS: su copia se guarda aparte de la del público
  const rol = getSession()?.role;
  const clave = useMemo(() => CLAVES.productos(rol), [rol]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const lista = await api('/api/productos');
      try { localStorage.setItem('menuCache', JSON.stringify(lista)); } catch { /* cuota llena */ }
      return lista;
    },
    placeholderData: leerCopia,
    refetchInterval
  });

  const setProductos = useCallback((cambio) => queryClient.setQueryData(clave, (prev = []) => (typeof cambio === 'function' ? cambio(prev) : cambio)), [queryClient, clave]);
  const reload = useCallback(() => refetch(), [refetch]);

  return {
    productos: data || [],
    loading: isPending, // con copia guardada no hay espera
    error: error?.message || null,
    reload,
    setProductos
  };
}
