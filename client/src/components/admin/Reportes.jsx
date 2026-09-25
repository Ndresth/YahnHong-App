import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, downloadFile } from '../../utils/api';
import { money, hora } from '../../utils/format';
import { COLOR_METODO, METODOS_PAGO, TAMANO_LABEL } from '../../config';
import { textoPago } from '../../utils/pagos';
import { hoy, sumarDias, diasEntre, semanaDe, mesDe, diaCorto, diaLargo, mesLargo, rangoCorto } from '../../utils/fechas';

const COLOR_VENTAS = '#198754';
const kFmt = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v);
const METODOS = METODOS_PAGO.map(m => m.id);
const TIPO_LABEL = { Mesa: 'Mesa', Llevar: 'Para llevar', Domicilio: 'Domicilio' };
/** Web + Llevar = "Recoger en el local". */
const nombreTipo = (tipo, origen) => (tipo === 'Llevar' && origen === 'Web' ? 'Recoger' : TIPO_LABEL[tipo] || 'Sin tipo');
const labelTipo = (t) => `${nombreTipo(t.tipo, t.origen)}${t.origen === 'Web' && t.tipo !== 'Llevar' ? ' (web)' : ''}`;

/** Rango del periodo que contiene `ancla`, y el periodo anterior para comparar. */
const calcularPeriodo = (modo, ancla, rango) => {
  if (modo === 'semana') {
    const p = semanaDe(ancla);
    return { ...p, label: rangoCorto(p.desde, p.hasta), prev: semanaDe(sumarDias(p.desde, -1)) };
  }
  if (modo === 'mes') {
    const p = mesDe(ancla);
    return { ...p, label: mesLargo(p.desde), prev: mesDe(sumarDias(p.desde, -1)) };
  }
  const n = diasEntre(rango.desde, rango.hasta);
  return { ...rango, label: rangoCorto(rango.desde, rango.hasta), prev: { desde: sumarDias(rango.desde, -n), hasta: sumarDias(rango.desde, -1) } };
};

const Variacion = ({ actual, anterior }) => {
  if (!anterior) return <span className="text-muted small">sin datos del periodo anterior</span>;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  const sube = pct >= 0;
  return (
    <span className={`small fw-semibold ${sube ? 'text-success' : 'text-danger'}`}>
      <i className={`bi ${sube ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} me-1`}></i>{sube ? '+' : ''}{pct}% vs anterior
    </span>
  );
};

const Kpi = ({ label, value, className = '', children }) => (
  <div className="col-6 col-md-4 col-xl"><div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${className}`}>{value}</div>
    {children}
  </div></div>
);

/** Barras de proporción con etiqueta y valor siempre visibles (el color nunca va solo). */
const Proporciones = ({ filas }) => {
  const total = filas.reduce((a, f) => a + f.valor, 0);
  if (!total) return <div className="text-muted small py-3 text-center">Sin ventas</div>;
  return (
    <div className="d-grid gap-2">
      {filas.map(f => (
        <div key={f.label}>
          <div className="d-flex justify-content-between small">
            <span className="fw-semibold">{f.label}{f.extra && <span className="text-muted fw-normal"> · {f.extra}</span>}</span>
            <span><span className="fw-bold">{money(f.valor)}</span> <span className="text-muted">{Math.round((f.valor / total) * 100)}%</span></span>
          </div>
          <div className="prop-track"><div className="prop-fill" style={{ width: `${(f.valor / total) * 100}%`, background: f.color || COLOR_VENTAS }}></div></div>
        </div>
      ))}
    </div>
  );
};

const TooltipVentas = ({ active, payload, label, formatLabel }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="fw-bold">{formatLabel ? formatLabel(label) : label}</div>
      <div>{money(d.ventas)} · {d.pedidos} pedido{d.pedidos === 1 ? '' : 's'}</div>
      {d.gastos > 0 && <div className="text-danger">Gastos {money(d.gastos)}</div>}
    </div>
  );
};

const GraficoBarras = ({ data, xKey, xFormat, labelFormat, onClick, height = 260 }) => (
  <div style={{ height }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} onClick={onClick ? (e) => e?.activeLabel !== undefined && onClick(e.activeLabel) : undefined}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey={xKey} tickFormatter={xFormat} fontSize={12} tickLine={false} axisLine={{ stroke: '#d4d4d8' }} interval="preserveStartEnd" />
        <YAxis tickFormatter={kFmt} fontSize={12} width={40} tickLine={false} axisLine={false} />
        <Tooltip content={<TooltipVentas formatLabel={labelFormat} />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
        <Bar dataKey="ventas" fill={COLOR_VENTAS} radius={[4, 4, 0, 0]} maxBarSize={36} style={onClick ? { cursor: 'pointer' } : undefined} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const TopProductos = ({ productos }) => (
  <div className="table-responsive">
    <table className="table table-sm align-middle small mb-0">
      <thead className="table-light"><tr><th className="ps-3">Producto</th><th className="text-end">Cant.</th><th className="text-end pe-3">Ventas</th></tr></thead>
      <tbody>
        {productos.map(p => (
          <tr key={`${p.nombre}-${p.tamaño}`}>
            <td className="ps-3">{p.nombre} <span className="text-muted">{TAMANO_LABEL[p.tamaño] || p.tamaño}</span></td>
            <td className="text-end">{p.cantidad}</td>
            <td className="text-end pe-3 fw-semibold">{money(p.ventas)}</td>
          </tr>
        ))}
        {productos.length === 0 && <tr><td colSpan={3} className="text-center text-muted py-3">Sin ventas</td></tr>}
      </tbody>
    </table>
  </div>
);

const filasMetodo = (porMetodo) => Object.entries(porMetodo)
  .sort((a, b) => b[1] - a[1])
  .map(([m, v]) => ({ label: m, valor: v, color: COLOR_METODO[m] }));

const filasTipo = (tipos) => tipos.map(t => ({ label: labelTipo(t), valor: t.ventas, extra: `${t.pedidos} ped.` }));

/** Horas del día con ventas, rellenando huecos entre la primera y la última. */
const horasCompletas = (horas) => {
  if (!horas.length) return [];
  const byH = new Map(horas.map(h => [h.hora, h]));
  const min = Math.min(...horas.map(h => h.hora));
  const max = Math.max(...horas.map(h => h.hora));
  return Array.from({ length: max - min + 1 }, (_, i) => byH.get(min + i) || { hora: min + i, ventas: 0, pedidos: 0 });
};
const fmtHora = (h) => `${h}:00`;

/** Detalle de un día: resumen, horas, productos y lista de órdenes. */
function DetalleDia({ dia, onClose }) {
  const [rep, setRep] = useState(null);
  const [det, setDet] = useState(null);

  useEffect(() => {
    Promise.all([api(`/api/reportes?desde=${dia}&hasta=${dia}`), api(`/api/reportes/dia/${dia}`)])
      .then(([r, d]) => { setRep(r); setDet(d); })
      .catch(e => { toast.error(e.message); onClose(); });
  }, [dia, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} role="dialog" aria-modal="true" aria-labelledby="dia-title" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable modal-fullscreen-md-down">
          <div className="modal-content border-0 rounded-4 overflow-hidden">
            <div className="modal-header bg-dark text-white border-0">
              <h5 className="modal-title fw-bold" id="dia-title"><i className="bi bi-calendar-day me-2"></i>{diaLargo(dia)}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
            </div>
            <div className="modal-body bg-body-tertiary">
              {!rep ? <div className="text-center py-5"><div className="spinner-border text-danger"></div></div> : (
                <div className="d-grid gap-3">
                  <div className="row g-2">
                    <Kpi label="Ventas" value={money(rep.resumen.ventas)} className="text-success" />
                    <Kpi label="Pedidos" value={rep.resumen.pedidos}>{rep.resumen.cancelados > 0 && <span className="small text-muted">{rep.resumen.cancelados} anulado(s)</span>}</Kpi>
                    <Kpi label="Ticket promedio" value={money(rep.resumen.ticketPromedio)} />
                    <Kpi label="Gastos" value={money(rep.resumen.gastos)} className="text-danger" />
                    <Kpi label="Neto" value={money(rep.resumen.neto)} />
                  </div>
                  <div className="row g-3">
                    <div className="col-lg-7"><div className="card-soft p-3 h-100">
                      <h6 className="fw-bold"><i className="bi bi-clock me-2"></i>Ventas por hora</h6>
                      {rep.horas.length ? <GraficoBarras data={horasCompletas(rep.horas)} xKey="hora" xFormat={fmtHora} labelFormat={fmtHora} height={220} />
                        : <div className="text-muted small py-4 text-center">Sin ventas</div>}
                    </div></div>
                    <div className="col-lg-5"><div className="card-soft p-3 h-100 d-grid gap-3 align-content-start">
                      <div><h6 className="fw-bold">Métodos de pago</h6><Proporciones filas={filasMetodo(rep.resumen.ventasPorMetodo)} /></div>
                      <div><h6 className="fw-bold">Tipo de pedido</h6><Proporciones filas={filasTipo(rep.tipos)} /></div>
                    </div></div>
                  </div>
                  <div className="row g-3">
                    <div className="col-lg-5"><div className="card-soft h-100">
                      <h6 className="fw-bold p-3 m-0 border-bottom">Productos vendidos</h6>
                      <TopProductos productos={rep.productos} />
                    </div></div>
                    <div className="col-lg-7"><div className="card-soft h-100">
                      <h6 className="fw-bold p-3 m-0 border-bottom">Órdenes ({det.ordenes.length})</h6>
                      <div className="table-responsive" style={{ maxHeight: 420 }}>
                        <table className="table table-sm table-hover align-middle small mb-0">
                          <thead className="table-light sticky-top"><tr><th className="ps-3">#</th><th>Hora</th><th>Tipo</th><th>Detalle</th><th className="text-end pe-3">Total</th></tr></thead>
                          <tbody>
                            {det.ordenes.map(o => (
                              <tr key={o._id} className={o.estado === 'Cancelado' ? 'text-decoration-line-through text-muted' : ''}>
                                <td className="ps-3">{o.numero ?? '—'}</td>
                                <td className="text-nowrap">{hora(o.fecha)}{o.horaProgramada && <div className="text-primary"><i className="bi bi-alarm me-1"></i>{hora(o.horaProgramada)}</div>}</td>
                                <td className="text-nowrap">{o.tipo === 'Mesa' ? `Mesa ${o.numeroMesa}` : nombreTipo(o.tipo, o.origen)}{o.origen === 'Web' && <span className="badge bg-info-subtle text-info-emphasis ms-1">Web</span>}</td>
                                <td style={{ minWidth: 180 }}>
                                  {o.tipo !== 'Mesa' && <div className="fw-semibold">{o.cliente?.nombre}</div>}
                                  <span className="text-muted">{(o.items || []).filter(i => !i.extra).map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}</span>
                                </td>
                                <td className="text-end pe-3 text-nowrap"><div className="fw-semibold">{money(o.total)}</div><span className="text-muted">{textoPago(o)}</span></td>
                              </tr>
                            ))}
                            {det.ordenes.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-3">Sin órdenes</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      {det.gastos.length > 0 && (
                        <div className="border-top p-3 small">
                          <div className="fw-bold mb-1">Gastos</div>
                          {det.gastos.map(g => (
                            <div key={g._id} className="d-flex justify-content-between"><span>{hora(g.fecha)} · {g.descripcion}</span><span className="text-danger">-{money(g.monto)}</span></div>
                          ))}
                        </div>
                      )}
                    </div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HistorialCierres() {
  const [cierres, setCierres] = useState(null);
  useEffect(() => { api('/api/cierres').then(setCierres).catch(e => { toast.error(e.message); setCierres([]); }); }, []);

  const descargar = (id) => toast.promise(
    downloadFile(`/api/ventas/excel/${id}`, `Reporte_${id}.xlsx`),
    { loading: 'Generando Excel…', success: 'Reporte descargado', error: 'Error al descargar' }
  );

  if (cierres === null) return <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-danger"></div></div>;
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle small mb-0">
        <thead className="table-light">
          <tr><th className="ps-3">Cierre</th><th>Ventas</th><th>Gastos</th><th>Esperado</th><th>Contado</th><th>Balance</th><th>Por</th><th></th></tr>
        </thead>
        <tbody>
          {cierres.map(c => (
            <tr key={c._id}>
              <td className="ps-3">{new Date(c.fechaFin).toLocaleDateString('es-CO')}<br /><span className="text-muted">{hora(c.fechaFin)} · {c.cantidadPedidos} pedidos</span></td>
              <td className="fw-bold">{money(c.totalVentasSistema)}</td>
              <td className="text-danger">-{money(c.totalGastos)}</td>
              <td>{money(c.totalCajaTeorico)}</td>
              <td className="fw-bold text-primary">{money(c.totalEfectivoReal)}</td>
              <td>
                {c.diferencia === 0 ? <span className="badge bg-success">OK</span>
                  : c.diferencia > 0 ? <span className="badge bg-info text-dark">+{money(c.diferencia)}</span>
                    : <span className="badge bg-danger">-{money(-c.diferencia)}</span>}
              </td>
              <td>{c.usuario}</td>
              <td className="pe-3"><button className="btn btn-sm btn-outline-success" onClick={() => descargar(c._id)} title="Descargar Excel"><i className="bi bi-download"></i></button></td>
            </tr>
          ))}
          {cierres.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">Aún no hay cierres</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Reportes de rendimiento por semana, mes o rango, con detalle por día.
 * Se calculan por la fecha de cada orden: el cierre de caja no borra nada.
 */
export default function Reportes() {
  const [modo, setModo] = useState('semana');
  const [ancla, setAncla] = useState(hoy);
  const [rango, setRango] = useState(() => ({ desde: sumarDias(hoy(), -29), hasta: hoy() }));
  const [datos, setDatos] = useState(null);
  const [anterior, setAnterior] = useState(null);
  const [cargado, setCargado] = useState(''); // clave del periodo que ya llegó (o falló)
  const [diaSel, setDiaSel] = useState(null);
  const [verCierres, setVerCierres] = useState(false);
  const cerrarDia = useCallback(() => setDiaSel(null), []);

  const periodo = useMemo(() => calcularPeriodo(modo, ancla, rango), [modo, ancla, rango]);
  const { desde, hasta, prev } = periodo;
  const rangoValido = desde <= hasta && diasEntre(desde, hasta) <= 400;
  const clave = `${desde}|${hasta}`;
  const cargando = rangoValido && cargado !== clave;

  useEffect(() => {
    if (!rangoValido) return;
    let vigente = true;
    Promise.all([
      api(`/api/reportes?desde=${desde}&hasta=${hasta}`),
      api(`/api/reportes?desde=${prev.desde}&hasta=${prev.hasta}`).catch(() => null)
    ])
      .then(([actual, previo]) => { if (vigente) { setDatos(actual); setAnterior(previo); } })
      .catch(e => vigente && toast.error(e.message))
      .finally(() => vigente && setCargado(`${desde}|${hasta}`));
    return () => { vigente = false; };
  }, [desde, hasta, prev.desde, prev.hasta, rangoValido]);

  const mover = (dir) => {
    if (modo === 'semana') setAncla(a => sumarDias(semanaDe(a).desde, dir * 7));
    else setAncla(a => (dir < 0 ? sumarDias(mesDe(a).desde, -1) : sumarDias(mesDe(a).hasta, 1)));
  };
  const esActual = modo !== 'rango' && desde <= hoy() && hoy() <= hasta;

  const r = datos?.resumen;
  const a = anterior?.resumen;
  const diasConMov = (datos?.dias || []).filter(d => d.pedidos || d.gastos || d.cancelados);
  const metodosTabla = METODOS.filter(m => (r?.ventasPorMetodo?.[m] || 0) > 0);

  return (
    <div className="d-grid gap-3">
      {/* Filtros del periodo */}
      <div className="card-soft p-2 d-flex flex-wrap align-items-center gap-2">
        <div className="segmented" style={{ minWidth: 260 }}>
          {[['semana', 'Semana'], ['mes', 'Mes'], ['rango', 'Rango']].map(([id, l]) => (
            <button key={id} className={modo === id ? 'active' : ''} onClick={() => setModo(id)}>{l}</button>
          ))}
        </div>
        {modo === 'rango' ? (
          <div className="d-flex align-items-center gap-1">
            <input type="date" className="form-control form-control-sm" value={rango.desde} max={rango.hasta} onChange={e => e.target.value && setRango(x => ({ ...x, desde: e.target.value }))} aria-label="Desde" />
            <span className="text-muted">a</span>
            <input type="date" className="form-control form-control-sm" value={rango.hasta} min={rango.desde} onChange={e => e.target.value && setRango(x => ({ ...x, hasta: e.target.value }))} aria-label="Hasta" />
          </div>
        ) : (
          <div className="d-flex align-items-center gap-1">
            <button className="btn btn-sm btn-light" onClick={() => mover(-1)} aria-label="Anterior"><i className="bi bi-chevron-left"></i></button>
            <span className="fw-bold px-1 text-nowrap">{periodo.label}</span>
            <button className="btn btn-sm btn-light" onClick={() => mover(1)} disabled={esActual} aria-label="Siguiente"><i className="bi bi-chevron-right"></i></button>
            {!esActual && <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setAncla(hoy())}>Hoy</button>}
          </div>
        )}
        {cargando && <div className="spinner-border spinner-border-sm text-danger ms-auto"></div>}
      </div>

      {!rangoValido && <div className="alert alert-warning m-0">El rango debe ser de máximo 400 días.</div>}

      {r && (
        <>
          <div className="row g-2 g-md-3">
            <Kpi label="Ventas" value={money(r.ventas)} className="text-success"><Variacion actual={r.ventas} anterior={a?.ventas} /></Kpi>
            <Kpi label="Pedidos" value={r.pedidos}><Variacion actual={r.pedidos} anterior={a?.pedidos} /></Kpi>
            <Kpi label="Ticket promedio" value={money(r.ticketPromedio)}><Variacion actual={r.ticketPromedio} anterior={a?.ticketPromedio} /></Kpi>
            <Kpi label="Gastos" value={money(r.gastos)} className="text-danger" />
            <Kpi label="Neto (ventas − gastos)" value={money(r.neto)}>{r.cancelados > 0 && <span className="small text-muted">{r.cancelados} orden(es) anulada(s)</span>}</Kpi>
          </div>

          <div className="card-soft p-3">
            <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2">
              <h6 className="fw-bold m-0"><i className="bi bi-bar-chart me-2"></i>Ventas por día</h6>
              <span className="small text-muted">Toque un día para ver el detalle</span>
            </div>
            <GraficoBarras data={datos.dias} xKey="dia" xFormat={diaCorto} labelFormat={diaLargo} onClick={setDiaSel} />
          </div>

          <div className="row g-3">
            <div className="col-lg-4"><div className="card-soft p-3 h-100">
              <h6 className="fw-bold"><i className="bi bi-wallet2 me-2"></i>Métodos de pago</h6>
              <Proporciones filas={filasMetodo(r.ventasPorMetodo)} />
            </div></div>
            <div className="col-lg-4"><div className="card-soft p-3 h-100">
              <h6 className="fw-bold"><i className="bi bi-shop me-2"></i>Tipo de pedido</h6>
              <Proporciones filas={filasTipo(datos.tipos)} />
            </div></div>
            <div className="col-lg-4"><div className="card-soft p-3 h-100">
              <h6 className="fw-bold"><i className="bi bi-clock me-2"></i>Horas de más venta</h6>
              {datos.horas.length ? <GraficoBarras data={horasCompletas(datos.horas)} xKey="hora" xFormat={fmtHora} labelFormat={fmtHora} height={200} />
                : <div className="text-muted small py-4 text-center">Sin ventas</div>}
            </div></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-7"><div className="card-soft h-100">
              <h6 className="fw-bold p-3 m-0 border-bottom"><i className="bi bi-calendar3 me-2"></i>Detalle por día</h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Día</th><th className="text-end">Pedidos</th><th className="text-end">Ventas</th>
                      {metodosTabla.map(m => <th key={m} className="text-end d-none d-md-table-cell">{m}</th>)}
                      <th className="text-end">Gastos</th><th className="text-end pe-3">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasConMov.map(d => (
                      <tr key={d.dia} role="button" onClick={() => setDiaSel(d.dia)}>
                        <td className="ps-3 fw-semibold text-nowrap">{diaCorto(d.dia)}<i className="bi bi-chevron-right text-muted ms-1 small"></i></td>
                        <td className="text-end">{d.pedidos}</td>
                        <td className="text-end fw-bold">{money(d.ventas)}</td>
                        {metodosTabla.map(m => <td key={m} className="text-end d-none d-md-table-cell">{d.porMetodo[m] ? money(d.porMetodo[m]) : '—'}</td>)}
                        <td className="text-end text-danger">{d.gastos ? `-${money(d.gastos)}` : '—'}</td>
                        <td className="text-end pe-3 fw-semibold">{money(d.ventas - d.gastos)}</td>
                      </tr>
                    ))}
                    {diasConMov.length === 0 && <tr><td colSpan={5 + metodosTabla.length} className="text-center text-muted py-4">Sin movimientos en este periodo</td></tr>}
                  </tbody>
                  {diasConMov.length > 1 && (
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td className="ps-3">Total</td><td className="text-end">{r.pedidos}</td><td className="text-end">{money(r.ventas)}</td>
                        {metodosTabla.map(m => <td key={m} className="text-end d-none d-md-table-cell">{money(r.ventasPorMetodo[m])}</td>)}
                        <td className="text-end text-danger">-{money(r.gastos)}</td><td className="text-end pe-3">{money(r.neto)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div></div>
            <div className="col-lg-5"><div className="card-soft h-100">
              <h6 className="fw-bold p-3 m-0 border-bottom"><i className="bi bi-trophy me-2"></i>Productos más vendidos</h6>
              <TopProductos productos={datos.productos.slice(0, 15)} />
            </div></div>
          </div>
        </>
      )}

      <div className="card-soft">
        <button className="btn w-100 text-start fw-bold p-3 d-flex justify-content-between align-items-center" onClick={() => setVerCierres(v => !v)} aria-expanded={verCierres}>
          <span><i className="bi bi-clock-history me-2"></i>Historial de cierres de caja</span>
          <i className={`bi ${verCierres ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </button>
        {verCierres && <div className="border-top"><HistorialCierres /></div>}
      </div>

      {diaSel && <DetalleDia dia={diaSel} onClose={cerrarDia} />}
    </div>
  );
}
