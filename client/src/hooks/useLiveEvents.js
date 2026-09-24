import { useEffect, useRef, useState } from 'react';
import { getSession } from '../utils/api';

/**
 * Se suscribe al stream SSE del servidor (/api/stream) usando fetch,
 * para poder enviar el token en el header (EventSource no lo permite).
 * Reconecta sola si se cae la conexión (ej. Render reinicia el servicio).
 *
 * @param {(type: string, data: any) => void} onEvent
 * @returns {boolean} conectado
 */
export function useLiveEvents(onEvent) {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  useEffect(() => { handler.current = onEvent; });

  useEffect(() => {
    let stopped = false;
    let controller;
    let retry;

    const connect = async () => {
      const session = getSession();
      if (!session || stopped) return;
      controller = new AbortController();
      try {
        const res = await fetch('/api/stream', {
          headers: { Authorization: `Bearer ${session.token}`, Accept: 'text/event-stream' },
          signal: controller.signal
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        setConnected(true);
        handler.current('conectado', null);

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            let type = 'message';
            let data = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) type = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (data) {
              try { handler.current(type, JSON.parse(data)); } catch { /* evento mal formado */ }
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
      setConnected(false);
      if (!stopped) retry = setTimeout(connect, 3000);
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      controller?.abort();
    };
  }, []);

  return connected;
}

/**
 * Ejecuta `fn` cada `ms`, pero sólo si la pestaña está visible.
 * Se usa como respaldo del stream en tiempo real.
 */
export function useVisibleInterval(fn, ms) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; });
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') saved.current(); };
    const id = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [ms]);
}
