import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast'; // ALERTA MODERNA

export default function CartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, total, clearCart } = useCart();
  const [cliente, setCliente] = useState({ nombre: '', direccion: '', telefono: '', barrio: '', metodoPago: 'Nequi' });

  const handleInputChange = (e) => {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
  };

  const handleWhatsApp = () => {
    if (!cliente.nombre || !cliente.direccion || !cliente.telefono || !cliente.barrio) {
      toast.error("Por favor completa todos tus datos");
      return;
    }

    const ordenBD = {
        tipo: 'Domicilio', // Importante para reportes
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

    // Feedback visual de carga
    toast.promise(
        fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ordenBD)
        }),
        {
            loading: 'Registrando pedido...',
            success: '¡Pedido registrado!',
            error: 'Error al registrar'
        }
    );

    let mensaje = `*Hola Yahn Hong, quiero un pedido:*\n\n`;
    mensaje += `*Nombre:* ${cliente.nombre}\n*Tel:* ${cliente.telefono}\n*Dir:* ${cliente.direccion} - ${cliente.barrio}\n*Pago:* ${cliente.metodoPago}\n------------------\n`;
    cart.forEach(item => {
      mensaje += `- ${item.quantity}x ${item.nombre} (${item.selectedSize})\n`;
      if(item.nota) mensaje += `  _Nota: ${item.nota}_\n`;
    });
    mensaje += `------------------\n*TOTAL: $${total.toLocaleString()}*`;

    const url = `https://wa.me/573022297929?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    clearCart();
    onClose();
  };

  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1050 }}>
        <div className="offcanvas-header bg-danger text-white">
          <h5 className="offcanvas-title fw-bold">🛒 Tu Pedido</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column">
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.length === 0 ? (
              <div className="text-center mt-5 text-muted"><p>Tu carrito está vacío.</p></div>
            ) : (
              <div className="list-group">
                {cart.map((item, index) => (
                  <div key={index} className="list-group-item border-0 border-bottom px-0">
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="fw-bold text-danger">{item.nombre}</div>
                        <small className="text-muted">{item.selectedSize} | x{item.quantity}</small>
                        {/* No mostramos input de nota aquí para no saturar al cliente, solo en POS */}
                      </div>
                      <div className="text-end">
                          <span className="fw-bold">${(item.selectedPrice * item.quantity).toLocaleString()}</span><br/>
                          <small className="text-danger" style={{cursor:'pointer'}} onClick={() => removeFromCart(item.id, item.selectedSize)}>Eliminar</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-top pt-3 bg-light p-3 rounded">
            <div className="d-flex justify-content-between mb-3">
                <span className="fs-5 fw-bold">Total:</span>
                <span className="fs-3 fw-bold text-danger">${total.toLocaleString()}</span>
            </div>
            <h6 className="mb-2 fw-bold">📍 Datos de Entrega</h6>
            <form className="d-grid gap-2">
              <input type="text" name="nombre" className="form-control form-control-sm" placeholder="Tu Nombre" value={cliente.nombre} onChange={handleInputChange} />
              <input type="tel" name="telefono" className="form-control form-control-sm" placeholder="Teléfono" value={cliente.telefono} onChange={handleInputChange} />
              <input type="text" name="direccion" className="form-control form-control-sm" placeholder="Dirección exacta" value={cliente.direccion} onChange={handleInputChange} />
              <input type="text" name="barrio" className="form-control form-control-sm" placeholder="Barrio" value={cliente.barrio} onChange={handleInputChange} />
              <select name="metodoPago" className="form-select form-select-sm" value={cliente.metodoPago} onChange={handleInputChange}>
                  <option value="Nequi">Pago con Nequi</option>
                  <option value="Efectivo">Pago en Efectivo</option>
              </select>
              <button type="button" onClick={handleWhatsApp} className="btn btn-success fw-bold mt-2" disabled={cart.length === 0}>✅ Enviar a WhatsApp</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}