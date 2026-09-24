import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../../utils/swalConfig';
import { api, getSession } from '../../utils/api';
import { fechaLarga, hora, money } from '../../utils/format';
import { COLOR_METODO, METODOS_PAGO } from '../../config';
import CierreCajaModal from './CierreCajaModal';
import { getCierrePendiente } from '../../utils/cierre';

const Kpi = ({ icon, tone, label, value, sub }) => (
  <div className="kpi">
    <span className={`kpi-icon ${tone}`}><i className={`bi ${icon}`}></i></span>
    <div className="min-w-0">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="small text-muted text-truncate">{sub}</div>}
    </div>
  </div>
);

const TIPO_ICON = { Mesa: 'bi-shop', Llevar: 'bi-bag', Domicilio: 'bi-bicycle' };

/** Resumen visual del turno, gastos y arqueo de caja. */
export default function CajaView({ finanzas, gastos, ordenes, onChange }) {
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [guardando, setGuardando] = useState(false);
  const [pendiente, setPendiente] = useState(getCierrePendiente);
  const [modalAbierto, setModalAbierto] = useState(() => Boolean(getCierrePendiente()));

  const stats = useMemo(() => {
    const validas = ordenes.filter(o => o.estado !== 'Cancelado');
    const fechas = [...ordenes, ...gastos].map(x => new Date(x.fecha).getTime());
    const inicio = fechas.length ? new Date(Math.min(...fechas)) : null;

    const porTipo = ['Mesa', 'Llevar', 'Domicilio'].map(t => {
      const os = validas.filter(o => o.tipo === t);
      return { tipo: t, cantidad: os.length, total: os.reduce((a, o) => a + o.total, 0) };
    });

    const productos = new Map();
    validas.forEach(o => o.items.filter(i => !i.extra).forEach(i => {
      const p = productos.get(i.nombre) || { nombre: i.nombre, cantidad: 0, total: 0 };
      p.cantidad += i.cantidad; p.total += i.cantidad * i.precio;
      productos.set(i.nombre, p);
    }));
    const top = [...productos.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    const horas = new Map();
    validas.forEach(o => {
      const h = new Date(o.fecha).getHours();
      horas.set(h, (horas.get(h) || 0) + o.total);
    });
    const hs = [...horas.keys()];
    const porHora = hs.length
      ? Array.from({ length: Math.max(...hs) - Math.min(...hs) + 1 }, (_, i) => {
        const h = Math.min(...hs) + i;
        return { h, total: horas.get(h) || 0 };
      })
      : [];

    return { inicio, porTipo, top, porHora };
  }, [ordenes, gastos]);

  const metodos = METODOS_PAGO.map(m => ({ id: m.id, total: finanzas.ventasPorMetodo?.[m.id] || 0 })).filter(m => m.total > 0);
  const maxHora = Math.max(1, ...stats.porHora.map(x => x.total));
  const maxTop = Math.max(1, ...stats.top.map(x => x.cantidad));

  const handleRegistrarGasto = async (e) => {
    e.preventDefault();
    if (!nuevoGasto.descripcion.trim() || !(Number(nuevoGasto.monto) > 0)) {
      toast.error('Complete concepto y monto.');
      return;
    }
    setGuardando(true);
    try {
      await api('/api/gastos', { method: 'POST', body: { descripcion: nuevoGasto.descripcion, monto: Number(nuevoGasto.monto) } });
      toast.success('Gasto registrado');
      setNuevoGasto({ descripcion: '', monto: '' });
      onChange();
    } catch (err) { toast.error(err.message); }
    finally { setGuardando(false); }
  };

  const handleBorrarGasto = async (g) => {
    const r = await swalBootstrap.fire({
      title: '¿Eliminar gasto?', text: `${g.descripcion} — ${money(g.monto)}`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    try {
      await api(`/api/gastos/${g._id}`, { method: 'DELETE' });
      toast.success('Gasto eliminado');
      onChange();
    } catch (err) { toast.error(err.message); }
  };

  const abrirCierre = () => {
    if (finanzas.cantidadPedidos === 0 && gastos.length === 0 && !finanzas.cancelados) {
      toast('No hay movimientos para cerrar', { icon: 'ℹ️' });
      return;
    }
    setModalAbierto(true);
  };

  const sinVentas = finanzas.cantidadPedidos === 0;

  return (
    <>
      {pendiente && !modalAbierto && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-octagon-fill fs-5"></i>
          <div className="me-auto">El último cierre no tiene el Excel descargado.</div>
          <button className="btn btn-sm btn-danger" onClick={() => setModalAbierto(true)}>Descargar ahora</button>
        </div>
      )}

      {/* Encabezado del turno */}
      <div className="turno-head">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="turno-pill"><span className="live-dot on"></span>Turno abierto</span>
            <span className="text-muted small">{fechaLarga(new Date())}</span>
          </div>
          <h4 className="fw-bold mb-0 mt-1">
            {stats.inicio ? <>Desde las {hora(stats.inicio)}</> : 'Sin movimientos todavía'}
          </h4>
          <div className="small text-muted">Caja a cargo de {getSession()?.nombre}</div>
        </div>
        <button onClick={abrirCierre} className="btn btn-warning btn-lg fw-bold px-4 shadow-sm">
          <i className="bi bi-safe2 me-2"></i>Arqueo y cierre
        </button>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><Kpi icon="bi-graph-up-arrow" tone="green" label="Ventas" value={money(finanzas.totalVentas)} sub={finanzas.cancelados ? `${finanzas.cancelados} anulada(s)` : 'Sin anulaciones'} /></div>
        <div className="col-6 col-xl-3"><Kpi icon="bi-receipt" tone="blue" label="Pedidos" value={finanzas.cantidadPedidos} sub={finanzas.pendientes ? `${finanzas.pendientes} en cocina` : 'Ninguno en cocina'} /></div>
        <div className="col-6 col-xl-3"><Kpi icon="bi-person-check" tone="violet" label="Ticket promedio" value={money(finanzas.ticketPromedio)} sub="por pedido" /></div>
        <div className="col-6 col-xl-3"><Kpi icon="bi-wallet2" tone="red" label="Gastos" value={money(finanzas.totalGastos)} sub={`${gastos.length} salida(s) de efectivo`} /></div>
      </div>

      <div className="row g-3">
        {/* Efectivo y métodos */}
        <div className="col-lg-8">
          <div className="card-soft p-3 p-md-4 h-100">
            <div className="efectivo-hero">
              <div>
                <div className="stat-label text-white-50">Efectivo esperado en el cajón</div>
                <div className="efectivo-valor">{money(finanzas.totalCaja)}</div>
                <div className="small text-white-50">
                  {money(finanzas.efectivoVentas || 0)} en ventas en efectivo − {money(finanzas.totalGastos)} de gastos
                </div>
              </div>
              <i className="bi bi-cash-coin efectivo-deco" aria-hidden="true"></i>
            </div>

            <h6 className="fw-bold mt-4 mb-2">Ventas por método de pago</h6>
            {metodos.length === 0 ? (
              <div className="text-muted small py-3">Aún no hay ventas en este turno.</div>
            ) : (
              <>
                <div className="stack-bar" role="img" aria-label="Distribución de ventas por método de pago">
                  {metodos.map(m => (
                    <span key={m.id} style={{ width: `${(m.total / finanzas.totalVentas) * 100}%`, background: COLOR_METODO[m.id] }}
                      data-tip={`${m.id}: ${money(m.total)}`}></span>
                  ))}
                </div>
                <div className="row g-2 mt-1">
                  {metodos.map(m => (
                    <div key={m.id} className="col-6 col-md-3">
                      <div className="metodo-legend">
                        <span className="dot" style={{ background: COLOR_METODO[m.id] }}></span>
                        <span className="text-muted small">{m.id}</span>
                        <div><b>{money(m.total)}</b> <span className="small text-muted">{Math.round((m.total / finanzas.totalVentas) * 100)}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h6 className="fw-bold mt-4 mb-2">Ventas por hora</h6>
            {stats.porHora.length === 0 ? (
              <div className="text-muted small">Se mostrará cuando entren pedidos.</div>
            ) : (
              <div className="hour-chart" role="img" aria-label="Ventas por hora">
                {stats.porHora.map(x => (
                  <div key={x.h} className="hour-col" data-tip={`${x.h}:00 — ${money(x.total)}`}>
                    <div className="hour-bar-wrap">
                      <div className="hour-bar" style={{ height: `${(x.total / maxHora) * 100}%` }}></div>
                    </div>
                    <span className="hour-label">{x.h}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gastos */}
        <div className="col-lg-4">
          <div className="card-soft p-3 h-100 d-flex flex-column">
            <h6 className="fw-bold"><i className="bi bi-wallet2 me-2 text-danger"></i>Salidas de efectivo</h6>
            <form onSubmit={handleRegistrarGasto} className="d-grid gap-2 mb-2">
              <input className="form-control" placeholder="Concepto" maxLength={120}
                value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })} />
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input type="number" inputMode="numeric" min="1" className="form-control" placeholder="Monto"
                  value={nuevoGasto.monto} onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })} />
                <button type="submit" className="btn btn-danger fw-semibold" disabled={guardando}><i className="bi bi-plus-lg me-1"></i>Registrar</button>
              </div>
            </form>
            <ul className="list-unstyled gasto-list flex-grow-1 mb-0">
              {gastos.map(g => (
                <li key={g._id}>
                  <div className="min-w-0">
                    <div className="fw-semibold text-truncate">{g.descripcion}</div>
                    <div className="small text-muted">{hora(g.fecha)} · {g.usuario}</div>
                  </div>
                  <b className="text-danger text-nowrap">-{money(g.monto)}</b>
                  <button className="btn btn-sm btn-link text-muted p-1" onClick={() => handleBorrarGasto(g)} aria-label={`Eliminar ${g.descripcion}`}><i className="bi bi-trash"></i></button>
                </li>
              ))}
              {gastos.length === 0 && <li className="justify-content-center text-muted fst-italic">Sin salidas registradas</li>}
            </ul>
          </div>
        </div>

        {/* Por tipo */}
        <div className="col-md-6 col-lg-4">
          <div className="card-soft p-3 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-diagram-3 me-2"></i>Por tipo de pedido</h6>
            {stats.porTipo.map(t => (
              <div key={t.tipo} className="tipo-row">
                <span className="tipo-icon"><i className={`bi ${TIPO_ICON[t.tipo]}`}></i></span>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{t.tipo === 'Llevar' ? 'Para llevar' : t.tipo}</div>
                  <div className="small text-muted">{t.cantidad} pedido(s)</div>
                </div>
                <b>{money(t.total)}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Más vendidos */}
        <div className="col-md-6 col-lg-8">
          <div className="card-soft p-3 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-trophy me-2 text-warning"></i>Más vendidos del turno</h6>
            {sinVentas || stats.top.length === 0 ? (
              <div className="text-muted small">Todavía no hay productos vendidos.</div>
            ) : stats.top.map((p, i) => (
              <div key={p.nombre} className="top-row" data-tip={`${p.cantidad} unidades · ${money(p.total)}`}>
                <span className="top-rank">{i + 1}</span>
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex justify-content-between gap-2">
                    <span className="fw-semibold text-truncate">{p.nombre}</span>
                    <span className="small text-nowrap"><b>{p.cantidad}</b> <span className="text-muted">· {money(p.total)}</span></span>
                  </div>
                  <div className="top-track"><div style={{ width: `${(p.cantidad / maxTop) * 100}%` }}></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalAbierto && (
        <CierreCajaModal
          finanzas={finanzas}
          pendiente={pendiente}
          onClosed={onChange}
          onClose={() => { setModalAbierto(false); setPendiente(getCierrePendiente()); }}
        />
      )}
    </>
  );
}
