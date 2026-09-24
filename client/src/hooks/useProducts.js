import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';

/** Carga el menú. Muestra la última copia guardada mientras llega la respuesta (arranque en frío de Render). */
export function useProducts() {
  const [productos, setProductos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('menuCache') || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(productos.length === 0);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const data = await api('/api/productos');
      setProductos(data);
      setError(null);
      try { localStorage.setItem('menuCache', JSON.stringify(data)); } catch { /* cuota llena */ }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { productos, loading, error, reload, setProductos };
}
