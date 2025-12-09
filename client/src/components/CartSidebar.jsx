import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast'; // IMPORTAR

export default function CartSidebar({ isOpen, onClose }) {
  // ... (hooks y estados iguales)
  const { cart, removeFromCart, total, clearCart, updateItemNote } = useCart();
  const [cliente, setCliente] = useState({ nombre: '', direccion: '', telefono: '', barrio: '', metodoPago: 'Nequi' });
  const handleInputChange = (e) => { setCliente({ ...cliente, [e.target.name]: e.target.value }); };

  const handleWhatsApp = () => {
    if (!cliente.nombre || !cliente.direccion || !cliente.telefono || !cliente.barrio) {
      // REEMPLAZO DE ALERT
      toast.error("Por favor complete los datos de facturación y entrega.");
      return;
    }

    // ... (resto de la función igual que antes) ...
    const ordenBD = {
        tipo: 'Domicilio',
        numeroMesa: null,
        cliente: {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: `${cliente.direccion} - ${cliente.barrio}`,
            metodoPago: cliente.metodoPago
        },
        items: cart.map(i => ({
            nombre: i.nombre,
            cantidad: i.quantity,
            precio: i.selectedPrice,
            tamaño: i.selectedSize,
            nota: i.nota || ''
        })),
        total: total
    };

    // Usamos toast.promise para dar feedback de carga
    toast.promise(
      fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordenBD)
      }),
       {
         loading: 'Registrando pedido en sistema...',
         success: 'Pedido registrado correctamente',
         error: 'Error al registrar el pedido',
       }
    ).catch(err => console.error("Error API:", err));

    let mensaje = `*PEDIDO WEB - YAHN HONG*\n\n`;
    mensaje += `*Cliente:* ${cliente.nombre}\n*Tel:* ${cliente.telefono}\n*Dir:* ${cliente.direccion} - ${cliente.barrio}\n*Pago:* ${cliente.metodoPago}\n------------------\n`;
    cart.forEach(item => {
      mensaje += `- ${item.quantity}x ${item.nombre} (${item.selectedSize})\n`;
      if(item.nota) mensaje += `  _Nota: ${item.nota}_\n`;
    });
    mensaje += `------------------\n*TOTAL: $${total.toLocaleString()} + Domicilio*`;

    const url = `https://wa.me/573022297929?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    clearCart();
    onClose();
  };
  
  // ... (Return sigue igual)
  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1050 }}>
        <div className="offcanvas-header bg-danger text-white">
          <h5 className="offcanvas-title fw-bold"><i className="bi bi-bag me-2"></i>Resumen de Orden</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column">
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.length === 0 ? (
              <div className="text-center mt-5 text-muted">
                <i className="bi bi-cart-x display-1"></i>
                <p className="mt-2">No hay items seleccionados.</p>
              </div>
            ) : (
              <div className="list-group">
                {cart.map((item, index) => (
                  <div key={index} className="list-group-item border-0 border-bottom px-0 pb-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="w-100 me-2">
                        <div className="fw-bold text-dark">{item.nombre}</div>
                        <small className="text-muted">{item.selectedSize} | Cant: {item.quantity}</small>
                        <input 
                            type="text" 
                            className="form-control form-control-sm mt-1 bg-light border-0" 
                            placeholder="Observaciones..."
                            value={item.nota || ''}
                            onChange={(e) => updateItemNote(item.id, item.selectedSize, e.target.value)}
                        />
                      </div>
                      <div className="text-end" style={{minWidth: '80px'}}>
                          <span className="fw-bold">${(item.selectedPrice * item.quantity).toLocaleString()}</span><br/>
                          <small className="text-danger" style={{cursor:'pointer'}} onClick={() => removeFromCart(item.id, item.selectedSize)}>
                              <i className="bi bi-trash"></i>
                          </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-top pt-3 bg-light p-3 rounded">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fs-5 fw-bold">Subtotal:</span>
                <span className="fs-3 fw-bold text-danger">${total.toLocaleString()}</span>
            </div>
            <div className="text-end text-muted small fst-italic mb-3">
                <i className="bi bi-info-circle me-1"></i>El valor del domicilio se cobra contra entrega
            </div>

            <h6 className="mb-2 fw-bold text-secondary"><i className="bi bi-geo-alt me-1"></i>Datos de Envío</h6>
            <form className="d-grid gap-2">
              <input type="text" name="nombre" className="form-control form-control-sm" placeholder="Nombre completo" value={cliente.nombre} onChange={handleInputChange} />
              <input type="tel" name="telefono" className="form-control form-control-sm" placeholder="Teléfono" value={cliente.telefono} onChange={handleInputChange} />
              <input type="text" name="direccion" className="form-control form-control-sm" placeholder="Dirección" value={cliente.direccion} onChange={handleInputChange} />
              <input type="text" name="barrio" className="form-control form-control-sm" placeholder="Barrio" value={cliente.barrio} onChange={handleInputChange} />
              <select name="metodoPago" className="form-select form-select-sm" value={cliente.metodoPago} onChange={handleInputChange}>
                  <option value="Nequi">Nequi / Bancolombia</option>
                  <option value="Efectivo">Efectivo</option>
              </select>
              <button type="button" onClick={handleWhatsApp} className="btn btn-success fw-bold mt-2" disabled={cart.length === 0}>
                  <i className="bi bi-whatsapp me-2"></i> Solicitar por WhatsApp
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}