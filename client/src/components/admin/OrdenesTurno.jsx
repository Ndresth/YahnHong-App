import { Fragment, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../../utils/swalConfig';
import { api } from '../../utils/api';
import { hora, money } from '../../utils/format';
import { printOrder } from '../../utils/printReceipt';
import { METODOS_PAGO, TAMANO_LABEL } from '../../config';

const ESTADO_BADGE = {
  Pendiente: 'bg-secondary', Preparando: 'bg-primary', Listo: 'bg-success',
  Completado: 'bg-light text-dark border', Cancelado: 'bg-danger'
};

/** Todas las órdenes del turno: reimprimir, corregir método de pago o anular. */
export default function OrdenesTurno({ ordenes, onChange }) {
  const [q, setQ] = useState('');
  const [abierta, setAbierta] = useState(null);

  const visibles = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ordenes;
    return ordenes.filter(o => `${o.numero} ${o.cliente?.nombre} ${o.numeroMesa ?? ''} ${o.tipo}`.toLowerCase().includes(s));
  }, [ordenes, q]);

  const cambiarPago = async (o, metodoPago) => {
    try {
      await api(`/api/orders/${o._id}/pago`, { method: 'PATCH', body: { metodoPago } });
      toast.success(`Orden #${o.numero}: ${metodoPago}`);
      onChange();
    } catch (e) { toast.error(e.message); }
  };

  const anular = async (o) => {
    const r = await swalBootstrap.fire({
      title: `¿Anular orden #${o.numero}?`, text: `${o.cliente?.nombre} — ${money(o.total)}. No se sumará a las ventas.`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, anular', cancelButtonText: 'Volver'
    });
    if (!r.isConfirmed) return;
    try {
      await api(`/api/orders/${o._id}/estado`, { method: 'PATCH', body: { estado: 'Cancelado' } });
      toast.success('Orden anulada');
      onChange();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="card-soft">
      <div className="p-3 d-flex flex-wrap gap-2 align-items-center border-bottom">
        <h6 className="fw-bold m-0 me-auto"><i className="bi bi-list-ul me-2"></i>Órdenes del turno ({ordenes.length})</h6>
        <input type="search" className="form-control form-control-sm" style={{ maxWidth: 240 }} placeholder="Buscar #, mesa, cliente…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 small table-sm-touch">
          <thead className="table-light">
            <tr><th className="ps-3">#</th><th>Hora</th><th>Tipo</th><th>Cliente</th><th>Estado</th><th>Pago</th><th className="text-end">Total</th><th className="text-end pe-3">Acciones</th></tr>
          </thead>
          <tbody>
            {visibles.map(o => {
              const cancelada = o.estado === 'Cancelado';
              return (
                <Fragment key={o._id}>
                  <tr className={cancelada ? 'text-decoration-line-through text-muted' : ''}>
                    <td className="ps-3 fw-bold">{o.numero ?? '—'}</td>
                    <td>{hora(o.fecha)}</td>
                    <td>
                      {o.tipo === 'Mesa' ? `Mesa ${o.numeroMesa}` : o.tipo === 'Llevar' && o.origen === 'Web' ? 'Recoger' : o.tipo}
                      {o.origen === 'Web' && <span className="badge bg-info-subtle text-info-emphasis ms-1">Web</span>}
                      {o.horaProgramada && <div className="small text-primary fw-semibold"><i className="bi bi-alarm me-1"></i>{hora(o.horaProgramada)}</div>}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 160 }}>{o.cliente?.nombre}</td>
                    <td><span className={`badge ${ESTADO_BADGE[o.estado] || 'bg-secondary'}`}>{o.estado}</span></td>
                    <td>
                      <select className="form-select form-select-sm" style={{ minWidth: 120 }} disabled={cancelada}
                        value={METODOS_PAGO.some(m => m.id === o.cliente?.metodoPago) ? o.cliente.metodoPago : 'Efectivo'}
                        onChange={e => cambiarPago(o, e.target.value)}>
                        {METODOS_PAGO.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    </td>
                    <td className="text-end fw-bold">{money(o.total)}</td>
                    <td className="text-end pe-3 text-nowrap">
                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setAbierta(abierta === o._id ? null : o._id)} title="Ver detalle"><i className="bi bi-eye"></i></button>
                      <button className="btn btn-sm btn-outline-dark me-1" onClick={() => printOrder(o, 'cliente')} title="Imprimir factura"><i className="bi bi-receipt"></i></button>
                      <button className="btn btn-sm btn-outline-dark me-1" onClick={() => printOrder(o, 'cocina')} title="Imprimir comanda"><i className="bi bi-printer"></i></button>
                      {!cancelada && <button className="btn btn-sm btn-outline-danger" onClick={() => anular(o)} title="Anular"><i className="bi bi-x-circle"></i></button>}
                    </td>
                  </tr>
                  {abierta === o._id && (
                    <tr className="table-light">
                      <td colSpan={8} className="ps-4">
                        {o.items.map((i, idx) => (
                          <div key={idx}>{i.cantidad}× {i.nombre}{!i.extra && ` (${TAMANO_LABEL[i.tamaño] || i.tamaño})`} — {money(i.precio * i.cantidad)}{i.nota && <em className="text-warning-emphasis"> · {i.nota}</em>}</div>
                        ))}
                        {o.anuladoPor && <div className="text-danger mt-1"><i className="bi bi-x-circle me-1"></i>Anulada por {o.anuladoPor}{o.anuladoEn && ` a las ${hora(o.anuladoEn)}`}</div>}
                        <div className="text-muted mt-1">Registró: {o.usuario || '—'}{o.cliente?.telefono && ` · Tel: ${o.cliente.telefono}`}{o.tipo === 'Domicilio' && ` · ${o.cliente?.direccion}`}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visibles.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">Sin órdenes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
