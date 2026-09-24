import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { NEGOCIO, TAMANO_LABEL } from '../config';
import { api } from '../utils/api';
import { money } from '../utils/format';
import DesechablesPicker from './DesechablesPicker';
import { hhmm } from '../hooks/useHorario';
import { DESECHABLES_VACIO, costoDesechables, desechablesParaEnviar } from '../utils/desechables';

const CLIENTE_KEY = 'clienteWeb';
const CLIENTE_VACIO = { nombre: '', telefono: '', direccion: '', barrio: '', metodoPago: 'Nequi', entrega: 'Domicilio' };
const loadCliente = () => {
  try { return { ...CLIENTE_VACIO, ...JSON.parse(localStorage.getItem(CLIENTE_KEY) || '{}') }; }
  catch { return { ...CLIENTE_VACIO }; }
};

const HORA_SUGERIDA_MIN = 15;
const MIN_ANTICIPACION_MIN = 10; // Mismo piso que valida el servidor (server/lib/fechas.js)
const ENTREGAS = [
  { id: 'Domicilio', label: 'Domicilio', icon: 'bi-bicycle' },
  { id: 'Llevar', label: 'Recoger en el local', icon: 'bi-bag-check' }
];

/** "HH:MM" (hora de Colombia, como la interpreta el servidor) dentro de `min` minutos, redondeado a 5 min. */
const horaMinima = (min = HORA_SUGERIDA_MIN, base = Date.now()) => {
  const [h, m] = new Date(base + min * 60000)
    .toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .split(':').map(Number);
  const total = Math.min(h * 60 + Math.ceil(m / 5) * 5, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** "14:30" -> "2:30 p. m." */
const hora12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
};

/** Carrito del menú público: registra el pedido en el sistema y lo envía por WhatsApp. */
const maxHora = (a, b) => (a > b ? a : b);

export default function CartSidebar({ isOpen, onClose, horario }) {
  const { cart, total, updateQuantity, updateItemNote, clearCart, toOrderItems, tieneBebida } = useCart();
  const [cliente, setCliente] = useState(loadCliente);
  const [enviando, setEnviando] = useState(false);
  const [desechables, setDesechables] = useState(DESECHABLES_VACIO);
  const [programar, setProgramar] = useState(false);
  const [horaProg, setHoraProg] = useState('');
  const esDomicilio = cliente.entrega !== 'Llevar';

  // Horario: sin datos (servidor lento) no se bloquea; el servidor valida igual
  const hoy = horario?.hoy;
  const puedeYa = !horario || horario.abierto;
  const puedeProgramar = !horario || Boolean(hoy && horario.ahora < hoy.cierra - MIN_ANTICIPACION_MIN * 60000);
  const cerrado = Boolean(horario) && !puedeYa && !puedeProgramar;
  const programado = programar || !puedeYa; // antes de abrir solo se puede programar
  const base = horario?.ahora ?? Date.now(); // reloj del servidor si ya cargó
  const horaMin = hoy ? maxHora(horaMinima(MIN_ANTICIPACION_MIN, base), hhmm(hoy.abre)) : horaMinima(MIN_ANTICIPACION_MIN, base);
  const horaMax = hoy ? hhmm(hoy.cierra) : undefined;
  const sugerida = hoy ? maxHora(horaMinima(HORA_SUGERIDA_MIN, base), hhmm(hoy.abre)) : horaMinima(HORA_SUGERIDA_MIN, base);
  const horaSugerida = horaMax && sugerida > horaMax ? maxHora(horaMin, horaMax) : sugerida;
  const horaFinal = horaProg || horaSugerida;

  const set = (e) => setCliente(c => ({ ...c, [e.target.name]: e.target.value }));

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!cliente.nombre.trim()) { toast.error('Escriba su nombre.'); return; }
    if (esDomicilio && (!cliente.direccion.trim() || !cliente.barrio.trim())) {
      toast.error('Complete dirección y barrio.');
      return;
    }
    if (cliente.telefono.replace(/\D/g, '').length < 7) {
      toast.error('Ingrese un teléfono válido.');
      return;
    }
    if (cerrado) { toast.error(horario.texto); return; }
    if (programado && (horaFinal < horaMin || (horaMax && horaFinal > horaMax))) {
      toast.error(`Elija una hora de hoy entre ${hora12(horaMin)} y ${hora12(horaMax || '23:59')}.`);
      return;
    }

    // Se abre la pestaña YA (dentro del clic) para que el navegador no la bloquee;
    // se le asigna la URL de WhatsApp cuando el servidor confirma el pedido.
    const wa = window.open('', '_blank');
    setEnviando(true);
    try {
      const orden = await api('/api/orders', {
        method: 'POST',
        body: {
          tipo: esDomicilio ? 'Domicilio' : 'Llevar',
          horaProgramada: programado ? horaFinal : '',
          cliente: {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: esDomicilio ? `${cliente.direccion} - ${cliente.barrio}` : '',
            metodoPago: cliente.metodoPago
          },
          items: toOrderItems(),
          desechables: desechablesParaEnviar(desechables, tieneBebida)
        }
      });

      let msg = `*PEDIDO WEB #${orden.numero} - ${NEGOCIO.nombre}*\n*${esDomicilio ? 'DOMICILIO' : 'PARA RECOGER EN EL LOCAL'}*\n\n`;
      msg += `*Cliente:* ${orden.cliente.nombre}\n*Tel:* ${orden.cliente.telefono}\n`;
      if (esDomicilio) msg += `*Dir:* ${orden.cliente.direccion}\n`;
      msg += `*${esDomicilio ? 'Entregar' : 'Recoger'}:* ${programado ? `a las ${hora12(horaFinal)}` : 'lo antes posible'}\n`;
      msg += `*Pago:* ${orden.cliente.metodoPago}\n------------------\n`;
      orden.items.forEach(i => {
        msg += `- ${i.cantidad}x ${i.nombre}${i.extra ? '' : ` (${TAMANO_LABEL[i.tamaño] || i.tamaño})`}\n`;
        if (i.nota) msg += `  _Nota: ${i.nota}_\n`;
      });
      msg += `------------------\n*TOTAL: ${money(orden.total)}${esDomicilio ? ' + Domicilio' : ''}*`;
      const url = `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(msg)}`;

      if (wa) wa.location.href = url; else window.location.href = url;

      try { localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente)); } catch { /* sin espacio */ }
      clearCart();
      setDesechables(DESECHABLES_VACIO);
      setProgramar(false);
      setHoraProg('');
      onClose();
      toast.success(`Pedido #${orden.numero} registrado. ¡Gracias!`, { duration: 5000 });
    } catch (err) {
      wa?.close();
      toast.error(err.message || 'No se pudo registrar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {isOpen && <div className="side-backdrop" onClick={onClose}></div>}
      <aside className={`side-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="d-flex justify-content-between align-items-center p-3 bg-danger text-white">
          <h5 className="m-0 fw-bold"><i className="bi bi-bag me-2"></i>Tu pedido</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
        </div>

        <div className="flex-grow-1 overflow-auto p-3">
          {cart.length === 0 ? (
            <div className="text-center mt-5 text-muted">
              <i className="bi bi-cart-x display-3"></i>
              <p className="mt-2">Aún no has agregado productos.</p>
              <button className="btn btn-outline-danger rounded-pill" onClick={onClose}>Ver el menú</button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.key} className="border-bottom pb-2 mb-2">
                  <div className="d-flex justify-content-between gap-2">
                    <div className="min-w-0">
                      <div className="fw-bold lh-sm">{item.nombre}</div>
                      <small className="text-muted">{TAMANO_LABEL[item.selectedSize]} · {money(item.selectedPrice)}</small>
                    </div>
                    <span className="fw-bold text-nowrap">{money(item.selectedPrice * item.quantity)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Menos">
                        {item.quantity === 1 ? <i className="bi bi-trash text-danger fs-6"></i> : '−'}
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Más">+</button>
                    </div>
                    <input type="text" className="form-control form-control-sm bg-light border-0" placeholder="Nota para cocina"
                      maxLength={200} value={item.nota || ''} onChange={e => updateItemNote(item.key, e.target.value)} />
                  </div>
                </div>
              ))}

              <DesechablesPicker value={desechables} onChange={setDesechables} tieneBebida={tieneBebida} />

              <form id="checkout" onSubmit={handleEnviar} className="d-grid gap-2 mt-3">
                <h6 className="fw-bold text-secondary mb-0"><i className="bi bi-truck me-1"></i>¿Cómo lo recibes?</h6>
                <div className="segmented" role="group" aria-label="Tipo de entrega">
                  {ENTREGAS.map(t => (
                    <button type="button" key={t.id} className={cliente.entrega === t.id ? 'active' : ''}
                      onClick={() => setCliente(c => ({ ...c, entrega: t.id }))}>
                      <i className={`bi ${t.icon} me-1`}></i>{t.label}
                    </button>
                  ))}
                </div>
                {!esDomicilio && (
                  <div className="small text-muted"><i className="bi bi-geo-alt me-1"></i>Recoges en {NEGOCIO.direccion}</div>
                )}

                <h6 className="fw-bold text-secondary mb-0 mt-1"><i className="bi bi-clock me-1"></i>¿Para cuándo?</h6>
                <div className="segmented" role="group" aria-label="Hora">
                  <button type="button" className={!programado ? 'active' : ''} onClick={() => setProgramar(false)} disabled={!puedeYa}
                    title={puedeYa ? '' : 'Estamos cerrados en este momento'}>Lo antes posible</button>
                  <button type="button" className={programado ? 'active' : ''} onClick={() => setProgramar(true)} disabled={cerrado}>
                    <i className="bi bi-alarm me-1"></i>A una hora
                  </button>
                </div>
                {cerrado && (
                  <div className="alert alert-danger py-2 small m-0"><i className="bi bi-moon-stars me-1"></i>{horario.texto} — por hoy ya no recibimos pedidos.</div>
                )}
                {!puedeYa && !cerrado && (
                  <div className="small text-danger"><i className="bi bi-clock-history me-1"></i>{horario.texto} — programa tu pedido para hoy.</div>
                )}
                {programado && !cerrado && (
                  <div className="d-flex align-items-center gap-2">
                    <input type="time" className="form-control" style={{ maxWidth: 150 }} step={300} min={horaMin} max={horaMax}
                      value={horaFinal} onChange={e => setHoraProg(e.target.value)} aria-label="Hora" required />
                    <small className="text-muted">Hoy{horaMax ? `, hasta las ${hora12(horaMax)}` : ''}</small>
                  </div>
                )}

                <h6 className="fw-bold text-secondary mb-0 mt-1"><i className="bi bi-person me-1"></i>Tus datos</h6>
                <input name="nombre" className="form-control" placeholder="Nombre completo" autoComplete="name" maxLength={60} value={cliente.nombre} onChange={set} />
                <input name="telefono" type="tel" inputMode="tel" className="form-control" placeholder="Teléfono" autoComplete="tel" maxLength={20} value={cliente.telefono} onChange={set} />
                {esDomicilio && (
                  <>
                    <input name="direccion" className="form-control" placeholder="Dirección" autoComplete="street-address" maxLength={110} value={cliente.direccion} onChange={set} />
                    <input name="barrio" className="form-control" placeholder="Barrio" maxLength={35} value={cliente.barrio} onChange={set} />
                  </>
                )}
                <div className="segmented" role="group" aria-label="Método de pago">
                  {['Nequi', 'Efectivo'].map(m => (
                    <button type="button" key={m} className={cliente.metodoPago === m ? 'active' : ''}
                      onClick={() => setCliente(c => ({ ...c, metodoPago: m }))}>
                      <i className={`bi ${m === 'Nequi' ? 'bi-phone' : 'bi-cash-coin'} me-1`}></i>{m === 'Nequi' ? 'Nequi / Bancolombia' : 'Efectivo'}
                    </button>
                  ))}
                </div>
              </form>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-top p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Subtotal</span>
              <span className="fs-4 fw-bold text-danger">{money(total + costoDesechables(desechables))}</span>
            </div>
            <div className="text-muted small mb-2">
              <i className="bi bi-info-circle me-1"></i>{esDomicilio ? 'El domicilio se cobra contra entrega' : 'Pagas al recoger tu pedido'}
            </div>
            <button type="submit" form="checkout" className="btn btn-success w-100 py-3 fw-bold rounded-3" disabled={enviando || cerrado}>
              {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className={`bi ${cerrado ? 'bi-moon-stars' : 'bi-whatsapp'} me-2`}></i>}
              {cerrado ? horario.texto : 'Enviar pedido por WhatsApp'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
