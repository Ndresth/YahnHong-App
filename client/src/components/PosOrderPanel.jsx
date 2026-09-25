import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { METODOS_PAGO, TAMANO_LABEL, TOTAL_MESAS } from '../config';
import { api } from '../utils/api';
import { money } from '../utils/format';
import { getPrintSettings, printOrder } from '../utils/printReceipt';
import DesechablesPicker from './DesechablesPicker';
import PagoDividido from './PagoDividido';
import { partesCompletas, pagoDivididoValido } from '../utils/pagos';
import { DESECHABLES_VACIO, costoDesechables, desechablesParaEnviar } from '../utils/desechables';

const TIPOS = [
  { id: 'Mesa', icon: 'bi-shop' },
  { id: 'Llevar', icon: 'bi-bag' },
  { id: 'Domicilio', icon: 'bi-bicycle' }
];

const PARTES_INICIALES = [{ metodo: 'Efectivo', monto: '' }, { metodo: 'Nequi', monto: '' }];

/** "#12 · Mesa 5" / "#13 · Llevar · Ana" */
const etiquetaOrden = (o) => `#${o.numero ?? '—'} · ${o.tipo === 'Mesa' ? `Mesa ${o.numeroMesa}` : `${o.tipo === 'Llevar' ? 'Llevar' : 'Domicilio'} · ${o.cliente?.nombre || ''}`}`;

/**
 * Panel de la cuenta actual en el POS (fijo a la derecha en tablet/PC, hoja inferior en celular).
 * Modo normal: crea una orden. Modo adición (destino): agrega los productos a una orden que ya está en cocina.
 */
export default function PosOrderPanel({ open, onClose, mesasOcupadas, activas = [], onSent }) {
  const { cart, total, totalItems, updateQuantity, updateItemNote, clearCart, toOrderItems, tieneBebida } = useCart();
  const [tipo, setTipo] = useState('Mesa');
  const [mesa, setMesa] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '' });
  const [notaAbierta, setNotaAbierta] = useState(null);
  const [cambiandoMesa, setCambiandoMesa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [desechables, setDesechables] = useState(DESECHABLES_VACIO);
  const [imprimir, setImprimir] = useState(() => getPrintSettings().autoComandaPos);
  const [destinoId, setDestinoId] = useState(null); // orden a la que se adiciona
  const [eligiendoDestino, setEligiendoDestino] = useState(false);
  const [dividir, setDividir] = useState(false);
  const [partes, setPartes] = useState(PARTES_INICIALES);

  const destino = activas.find(o => o._id === destinoId) || null;
  const ordenDeMesa = useMemo(() => new Map(activas.filter(o => o.tipo === 'Mesa').map(o => [String(o.numeroMesa), o])), [activas]);
  const ordenMesaElegida = tipo === 'Mesa' && mesa ? ordenDeMesa.get(mesa) : null;
  const totalCuenta = total + costoDesechables(desechables);

  const reset = () => {
    clearCart();
    setMesa('');
    setCambiandoMesa(false);
    setCliente({ nombre: '', telefono: '', direccion: '' });
    setMetodoPago('Efectivo');
    setNotaAbierta(null);
    setDesechables(DESECHABLES_VACIO);
    setDestinoId(null);
    setEligiendoDestino(false);
    setDividir(false);
    setPartes(PARTES_INICIALES);
  };

  const elegirDestino = (id) => { setDestinoId(id || null); setEligiendoDestino(false); };

  const handleAgregar = async () => {
    if (!destino || cart.length === 0) return;
    setEnviando(true);
    try {
      const r = await api(`/api/orders/${destino._id}/items`, {
        method: 'POST',
        body: { items: toOrderItems(), desechables: desechablesParaEnviar(desechables, true) }
      });
      toast.success(`Adicionado a la orden #${r.orden.numero}`);
      if (r.pagoReiniciado) toast(`La orden #${r.orden.numero} tenía pago dividido: caja debe ajustarlo`, { icon: '⚠️', duration: 6000 });
      // Comanda solo con lo adicionado
      if (imprimir) printOrder({ ...r.orden, items: r.agregados, adicion: true }, 'cocina');
      reset();
      onSent?.(r.orden);
      onClose?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviar = async () => {
    if (destino) return handleAgregar();
    if (cart.length === 0) return;
    if (dividir && !pagoDivididoValido(partes, totalCuenta)) { toast.error('Revise el pago dividido: cada parte debe ser mayor a 0 y sin métodos repetidos'); return; }
    if (tipo === 'Mesa' && !mesa) { toast.error('Seleccione la mesa'); return; }
    if (tipo === 'Domicilio' && (!cliente.nombre.trim() || !cliente.direccion.trim() || cliente.telefono.replace(/\D/g, '').length < 7)) {
      toast.error('Complete nombre, teléfono y dirección'); return;
    }

    setEnviando(true);
    try {
      const orden = await api('/api/orders', {
        method: 'POST',
        body: {
          tipo,
          numeroMesa: tipo === 'Mesa' ? mesa : null,
          cliente: { ...cliente, metodoPago },
          ...(dividir ? { pagos: partesCompletas(partes, totalCuenta) } : {}),
          items: toOrderItems(),
          desechables: desechablesParaEnviar(desechables, tieneBebida)
        }
      });
      toast.success(`Orden #${orden.numero} enviada a cocina`);
      if (imprimir) printOrder(orden, 'cocina');
      reset();
      onSent?.(orden);
      onClose?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const botonTexto = destino ? `Adicionar a ${etiquetaOrden(destino)}`
    : tipo === 'Mesa' ? (mesa ? `Enviar Mesa ${mesa}` : 'Seleccione mesa') : tipo === 'Llevar' ? 'Enviar para llevar' : 'Enviar domicilio';

  return (
    <section className={`pos-order ${open ? 'open' : ''}`} aria-label="Cuenta actual">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <h6 className="m-0 fw-bold"><i className="bi bi-receipt me-2"></i>Cuenta <span className="badge bg-dark ms-1">{totalItems}</span></h6>
        <div className="d-flex gap-1">
          {cart.length > 0 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { if (confirm('¿Vaciar la cuenta?')) reset(); }}>
              <i className="bi bi-x-circle me-1"></i>Vaciar
            </button>
          )}
          <button className="btn btn-sm btn-light d-lg-none" onClick={onClose} aria-label="Cerrar"><i className="bi bi-chevron-down"></i></button>
        </div>
      </div>

      <div className="pos-order-items overflow-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-hand-index-thumb fs-1 d-block mb-2"></i>
            Toque el tamaño de un producto para agregarlo.
          </div>
        ) : cart.map(item => (
          <div key={item.key} className="py-2 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <div className="qty-control flex-shrink-0">
                <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Menos">
                  {item.quantity === 1 ? <i className="bi bi-trash text-danger fs-6"></i> : '−'}
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Más">+</button>
              </div>
              <div className="flex-grow-1 min-w-0 lh-sm">
                <div className="fw-semibold text-truncate">{item.nombre}</div>
                <small className="text-muted">{TAMANO_LABEL[item.selectedSize]}</small>
              </div>
              <div className="text-end">
                <div className="fw-bold text-nowrap">{money(item.selectedPrice * item.quantity)}</div>
                <button className={`btn btn-link btn-sm p-0 text-decoration-none ${item.nota ? 'text-warning' : 'text-muted'}`}
                  onClick={() => setNotaAbierta(notaAbierta === item.key ? null : item.key)}>
                  <i className="bi bi-chat-left-text me-1"></i>Nota
                </button>
              </div>
            </div>
            {(notaAbierta === item.key || item.nota) && (
              <input autoFocus={notaAbierta === item.key} className="form-control form-control-sm mt-1 bg-warning-subtle border-0"
                placeholder="Nota para cocina" maxLength={200}
                value={item.nota} onChange={e => updateItemNote(item.key, e.target.value)} />
            )}
          </div>
        ))}
        {cart.length > 0 && <DesechablesPicker value={desechables} onChange={setDesechables} tieneBebida={tieneBebida} compact />}
      </div>

      <div className="pos-order-footer border-top bg-light">
        {destino ? (
          <div className="destino-adicion mb-2">
            <div className="min-w-0">
              <div className="small text-uppercase fw-bold opacity-75"><i className="bi bi-plus-square me-1"></i>Adicionando a</div>
              <div className="fw-bold text-truncate">{etiquetaOrden(destino)} <span className="badge bg-dark ms-1">{destino.estado}</span></div>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setDestinoId(null)}>Cancelar</button>
          </div>
        ) : eligiendoDestino ? (
          <div className="mb-2">
            <select className="form-select" autoFocus defaultValue="" onChange={e => elegirDestino(e.target.value)} aria-label="Orden a la que se adiciona">
              <option value="" disabled>Elija la orden a la que va a adicionar…</option>
              {activas.map(o => <option key={o._id} value={o._id}>{etiquetaOrden(o)} · {o.estado}</option>)}
            </select>
            <button className="btn btn-sm btn-link text-decoration-none p-0 mt-1" onClick={() => setEligiendoDestino(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn btn-sm btn-outline-dark w-100 mb-2" onClick={() => setEligiendoDestino(true)} disabled={activas.length === 0}
            title={activas.length ? '' : 'No hay órdenes en cocina'}>
            <i className="bi bi-plus-square me-1"></i>Adicionar a un pedido que ya está en cocina
          </button>
        )}

        {!destino && (<>
        <div className="segmented mb-2">
          {TIPOS.map(t => (
            <button key={t.id} className={tipo === t.id ? 'active' : ''} onClick={() => setTipo(t.id)}>
              <i className={`bi ${t.icon} me-1`}></i>{t.id === 'Llevar' ? 'Llevar' : t.id}
            </button>
          ))}
        </div>

        {tipo === 'Mesa' && mesa && !cambiandoMesa && (
          <div className="mesa-elegida mb-2">
            <span className="fw-bold"><i className="bi bi-shop me-2"></i>Mesa {mesa}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setCambiandoMesa(true)}>
              <i className="bi bi-arrow-repeat me-1"></i>Cambiar
            </button>
          </div>
        )}
        {ordenMesaElegida && !cambiandoMesa && (
          <div className="alert alert-warning py-2 px-2 small mb-2 d-flex align-items-center justify-content-between gap-2">
            <span>La mesa {mesa} ya tiene la orden <strong>#{ordenMesaElegida.numero}</strong>.</span>
            <button className="btn btn-sm btn-warning fw-bold text-nowrap" onClick={() => elegirDestino(ordenMesaElegida._id)}>Adicionar a #{ordenMesaElegida.numero}</button>
          </div>
        )}
        {tipo === 'Mesa' && (!mesa || cambiandoMesa) && (
          <div className="mesa-grid mb-2">
            {Array.from({ length: TOTAL_MESAS }, (_, i) => String(i + 1)).map(n => (
              <button key={n} className={`mesa-btn ${mesa === n ? 'active' : ''} ${mesasOcupadas.has(n) ? 'ocupada' : ''}`}
                onClick={() => { setMesa(mesa === n ? '' : n); setCambiandoMesa(false); }} title={mesasOcupadas.has(n) ? 'Mesa con orden activa' : ''}>
                {n}
              </button>
            ))}
          </div>
        )}
        {tipo === 'Llevar' && (
          <input className="form-control mb-2" placeholder="Nombre del cliente (opcional)" maxLength={60}
            value={cliente.nombre} onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} />
        )}
        {tipo === 'Domicilio' && (
          <div className="d-grid gap-1 mb-2">
            <input className="form-control form-control-sm" placeholder="Nombre" maxLength={60} value={cliente.nombre} onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} />
            <input className="form-control form-control-sm" placeholder="Teléfono" inputMode="tel" maxLength={20} value={cliente.telefono} onChange={e => setCliente(c => ({ ...c, telefono: e.target.value }))} />
            <input className="form-control form-control-sm" placeholder="Dirección y barrio" maxLength={150} value={cliente.direccion} onChange={e => setCliente(c => ({ ...c, direccion: e.target.value }))} />
          </div>
        )}

        {dividir ? (
          <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center small mb-1">
              <span className="fw-bold"><i className="bi bi-pie-chart me-1"></i>Pago dividido</span>
              <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={() => { setDividir(false); setPartes(PARTES_INICIALES); }}>Un solo método</button>
            </div>
            <PagoDividido total={totalCuenta} partes={partes} onChange={setPartes} />
          </div>
        ) : (
          <div className="mb-2">
            <div className="segmented" role="group" aria-label="Método de pago">
              {METODOS_PAGO.map(m => (
                <button key={m.id} className={metodoPago === m.id ? 'active' : ''} onClick={() => setMetodoPago(m.id)} title={m.id}>
                  <i className={`bi ${m.icon}`}></i><span className="d-none d-xl-inline ms-1">{m.id}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-link p-0 mt-1 text-decoration-none small" onClick={() => setDividir(true)}
              title="El cliente paga con varios métodos (ej. mitad efectivo, mitad Nequi)">
              <i className="bi bi-pie-chart me-1"></i>Dividir pago entre varios métodos
            </button>
          </div>
        )}
        </>)}

        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="form-check m-0">
            <input className="form-check-input" type="checkbox" id="printCmd" checked={imprimir} onChange={e => setImprimir(e.target.checked)} />
            <label className="form-check-label small" htmlFor="printCmd"><i className="bi bi-printer me-1"></i>Imprimir comanda</label>
          </div>
          <span className="fs-4 fw-800">{destino && <small className="fs-6 text-muted fw-normal me-1">+</small>}{money(totalCuenta)}</span>
        </div>

        <button onClick={handleEnviar} className="btn btn-brand pos-send w-100 fw-bold rounded-3"
          disabled={cart.length === 0 || enviando || (!destino && tipo === 'Mesa' && !mesa)}>
          {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className={`bi ${destino ? 'bi-plus-square-fill' : 'bi-send-fill'} me-2`}></i>}
          {botonTexto}
        </button>
      </div>
    </section>
  );
}
