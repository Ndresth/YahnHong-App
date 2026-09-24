import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import StaffNav from '../components/StaffNav';
import { useLiveEvents, useVisibleInterval } from '../hooks/useLiveEvents';
import { api } from '../utils/api';
import { hora, minutosDesde } from '../utils/format';
import { getPrintSettings, printOrder, setPrintSettings } from '../utils/printReceipt';
import { TAMANO_LABEL } from '../config';

const SIGUIENTE = {
  Pendiente: { estado: 'Preparando', label: 'Empezar', icon: 'bi-fire', cls: 'btn-primary' },
  Preparando: { estado: 'Listo', label: 'Listo', icon: 'bi-check2-circle', cls: 'btn-success' },
  Listo: { estado: 'Completado', label: 'Entregado', icon: 'bi-box-arrow-right', cls: 'btn-light' }
};
const FILTROS = ['Todos', 'Mesa', 'Llevar', 'Domicilio'];
const MIN_ALERTA = 10;
const MIN_TARDE = 20;
const MIN_ANTES_PROGRAMADO = 30; // un pedido programado pasa a la fila 30 min antes de su hora

/** Momento desde el que corre el cronómetro: la llegada, o 30 min antes de la hora programada. */
const inicioCocina = (o) => {
  const llegada = new Date(o.fecha).getTime();
  if (!o.horaProgramada) return llegada;
  return Math.max(llegada, new Date(o.horaProgramada).getTime() - MIN_ANTES_PROGRAMADO * 60000);
};

const minutosPara = (d, now) => Math.max(0, Math.round((new Date(d).getTime() - now) / 60000));
const faltan = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/** Pitido corto con WebAudio (no requiere archivos de sonido). */
const useBeep = () => {
  const ctx = useRef(null);
  const unlock = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    ctx.current.resume();
  };
  const beep = () => {
    const ac = ctx.current;
    if (!ac) return;
    [0, 0.22].forEach(offset => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + offset + 0.18);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + offset); o.stop(ac.currentTime + offset + 0.2);
    });
  };
  return { unlock, beep };
};

export default function KitchenPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [now, setNow] = useState(Date.now());
  const [nuevas, setNuevas] = useState(() => new Set());
  const [sonido, setSonido] = useState(false);
  const [autoPrint, setAutoPrint] = useState(() => getPrintSettings().autoComandaCocina);
  const [ocupado, setOcupado] = useState(null);
  const { unlock, beep } = useBeep();

  // Refs para leer valores actuales dentro del handler del stream
  const opts = useRef({ sonido, autoPrint });
  useEffect(() => { opts.current = { sonido, autoPrint }; }, [sonido, autoPrint]);

  const cargar = useCallback(() => {
    api('/api/orders').then(setOrdenes).catch(e => toast.error(e.message, { id: 'kds-err' }));
  }, []);

  const live = useLiveEvents((type, data) => {
    if (type === 'conectado' || type === 'caja:cerrada') return cargar();
    if (type === 'orden:nueva') {
      setOrdenes(prev => prev.some(o => o._id === data._id) ? prev : [...prev, data]);
      setNuevas(prev => new Set(prev).add(data._id));
      setTimeout(() => setNuevas(prev => { const n = new Set(prev); n.delete(data._id); return n; }), 15000);
      if (opts.current.sonido) beep();
      if (opts.current.autoPrint) printOrder(data, 'cocina');
      toast(`Nueva orden #${data.numero}`, { icon: '🔔' });
    }
    if (type === 'orden:actualizada') {
      setOrdenes(prev => ['Completado', 'Cancelado'].includes(data.estado)
        ? prev.filter(o => o._id !== data._id)
        : prev.map(o => o._id === data._id ? data : o));
    }
  });

  useVisibleInterval(cargar, 60000); // Respaldo por si el stream se pierde
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const avanzar = async (orden) => {
    const next = SIGUIENTE[orden.estado];
    if (!next) return;
    setOcupado(orden._id);
    try {
      const act = await api(`/api/orders/${orden._id}/estado`, { method: 'PATCH', body: { estado: next.estado } });
      setOrdenes(prev => act.estado === 'Completado' ? prev.filter(o => o._id !== act._id) : prev.map(o => o._id === act._id ? act : o));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const toggleSonido = () => {
    if (!sonido) { unlock(); setTimeout(beep, 50); }
    setSonido(s => !s);
  };

  const toggleAutoPrint = () => {
    const v = !autoPrint;
    setAutoPrint(v);
    setPrintSettings({ autoComandaCocina: v });
    toast(v ? 'Se imprimirá la comanda de cada orden nueva en ESTE equipo' : 'Impresión automática desactivada', { icon: '🖨️' });
  };

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  const filtradas = useMemo(() => ordenes.filter(o => filtro === 'Todos' || o.tipo === filtro), [ordenes, filtro]);
  // Programados que aún no empiezan: van aparte hasta 30 min antes de su hora (o si ya se empezaron)
  const esperando = (o) => o.estado === 'Pendiente' && o.horaProgramada && inicioCocina(o) > now;
  const programados = filtradas.filter(esperando).sort((a, b) => new Date(a.horaProgramada) - new Date(b.horaProgramada));
  const visibles = filtradas.filter(o => !esperando(o)).sort((a, b) => inicioCocina(a) - inicioCocina(b));
  const conteo = (t) => ordenes.filter(o => t === 'Todos' || o.tipo === t).length;

  return (
    <div className="kds">
      <StaffNav live={live}>
        <button className={`btn btn-sm ${sonido ? 'btn-warning' : 'btn-outline-light'}`} onClick={toggleSonido} title="Sonido al llegar orden">
          <i className={`bi ${sonido ? 'bi-volume-up-fill' : 'bi-volume-mute'}`}></i>
        </button>
        <button className={`btn btn-sm ${autoPrint ? 'btn-warning' : 'btn-outline-light'}`} onClick={toggleAutoPrint} title="Imprimir comandas automáticamente">
          <i className="bi bi-printer"></i>
        </button>
        <button className="btn btn-sm btn-outline-light d-none d-md-inline-block" onClick={fullscreen} title="Pantalla completa">
          <i className="bi bi-arrows-fullscreen"></i>
        </button>
      </StaffNav>

      <div className="container-fluid py-3">
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <div className="filter-scroll">
            {FILTROS.map(f => (
              <button key={f} className={`filter-btn ${filtro === f ? 'active' : ''}`} onClick={() => setFiltro(f)}>
                {f === 'Llevar' ? 'Para llevar' : f} <span className="ms-1 opacity-75">{conteo(f)}</span>
              </button>
            ))}
          </div>
          {!sonido && (
            <button className="btn btn-sm btn-outline-warning ms-auto" onClick={toggleSonido}>
              <i className="bi bi-bell me-1"></i>Activar sonido de alerta
            </button>
          )}
        </div>

        {programados.length > 0 && (
          <div className="kds-programados mb-3">
            <div className="fw-bold small text-uppercase mb-2"><i className="bi bi-alarm me-1"></i>Programados ({programados.length}) · entran a la fila {MIN_ANTES_PROGRAMADO} min antes</div>
            <div className="d-flex flex-wrap gap-2">
              {programados.map(o => (
                <div key={o._id} className="kds-prog-chip">
                  <span className="fw-bold">{hora(o.horaProgramada)}</span>
                  <span>#{o.numero} · {o.tipo === 'Llevar' ? 'Recoger' : o.tipo}{o.tipo !== 'Mesa' && ` · ${o.cliente?.nombre || ''}`}</span>
                  <span className="opacity-75">{o.items.filter(i => !i.extra).reduce((a, i) => a + i.cantidad, 0)} platos · faltan {faltan(minutosPara(o.horaProgramada, now))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {visibles.length === 0 ? (
          <div className="text-center text-white-50 py-5">
            <i className="bi bi-check2-circle display-3 d-block mb-2"></i>
            <h4>Sin órdenes pendientes</h4>
          </div>
        ) : (
          <div className="kds-grid">
            {visibles.map(o => {
              const min = minutosDesde(inicioCocina(o), now);
              const alerta = o.estado !== 'Listo' && (min >= MIN_TARDE ? 'late' : min >= MIN_ALERTA ? 'warn' : '');
              const next = SIGUIENTE[o.estado];
              return (
                <article key={o._id} className={`kds-card ${alerta} ${nuevas.has(o._id) ? 'nueva' : ''}`}>
                  <header className={`kds-head ${o.tipo}`}>
                    <span className="fs-5">
                      {o.tipo === 'Mesa' ? `MESA ${o.numeroMesa}` : o.tipo === 'Llevar' ? (o.origen === 'Web' ? 'RECOGER' : 'PARA LLEVAR') : 'DOMICILIO'}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <span className="opacity-75">#{o.numero}</span>
                      <span className="kds-timer" title={`Entró a las ${hora(o.fecha)}${o.horaProgramada ? ` · programado para las ${hora(o.horaProgramada)}` : ''}`}><i className="bi bi-stopwatch me-1"></i>{min}′</span>
                    </span>
                  </header>
                  {o.horaProgramada && (
                    <div className="kds-programada"><i className="bi bi-alarm me-1"></i>PARA LAS {hora(o.horaProgramada)}</div>
                  )}

                  <div className="px-3 pt-2 d-flex justify-content-between align-items-center small text-white-50">
                    <span className="text-truncate">{o.tipo !== 'Mesa' ? o.cliente?.nombre : o.usuario}</span>
                    <span className={`kds-estado ${o.estado} text-white`}>{o.estado}</span>
                  </div>
                  {o.tipo === 'Domicilio' && (
                    <div className="px-3 small text-white-50 text-truncate"><i className="bi bi-geo-alt me-1"></i>{o.cliente?.direccion}</div>
                  )}

                  <div className="mt-2">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="kds-item">
                        <span className="kds-qty">{i.cantidad}×</span>
                        <span className="fw-semibold">{i.nombre}</span>
                        {!i.extra && <small className="text-white-50 ms-1">{TAMANO_LABEL[i.tamaño] || i.tamaño}</small>}
                        {i.nota && <div className="kds-note"><i className="bi bi-exclamation-triangle-fill me-1"></i>{i.nota}</div>}
                      </div>
                    ))}
                  </div>

                  <footer className="p-2 d-flex gap-2">
                    <button className="btn btn-outline-light btn-sm" onClick={() => printOrder(o, 'cocina')} title="Imprimir comanda">
                      <i className="bi bi-printer"></i>
                    </button>
                    <button className="btn btn-outline-light btn-sm" onClick={() => printOrder(o, 'cliente')} title="Imprimir factura">
                      <i className="bi bi-receipt"></i>
                    </button>
                    {next && (
                      <button className={`btn ${next.cls} flex-grow-1 fw-bold`} disabled={ocupado === o._id} onClick={() => avanzar(o)}>
                        {ocupado === o._id ? <span className="spinner-border spinner-border-sm"></span> : <><i className={`bi ${next.icon} me-1`}></i>{next.label}</>}
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
