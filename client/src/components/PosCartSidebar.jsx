import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function PosCartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, total, clearCart } = useCart(); // Importamos clearCart
  const [mesa, setMesa] = useState(''); 

  const handleCobrar = () => {
    if(window.confirm("¿Enviar pedido a Caja/Cocina?")) {
        const nuevaOrden = {
            cliente: { nombre: "Mesa " + mesa, telefono: "", direccion: "En Local", metodoPago: "Efectivo/QR" },
            items: cart.map(i => ({ nombre: i.nombre, cantidad: i.quantity, precio: i.selectedPrice, tamaño: i.selectedSize })),
            total: total
        };

        // URL COMPLETA PARA LOCAL
        fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaOrden)
        })
        .then(res => {
            if(res.ok) {
                alert("✅ Enviado a cocina");
                clearCart(); // Vaciamos carrito
                setMesa('');
                onClose();
            } else { alert("Error al enviar"); }
        })
        .catch(err => console.error(err));
    }
  };

  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{zIndex: 1040}}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1050 }}>
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title">🖥️ Caja / Mesero</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.length === 0 ? <div className="text-center mt-5 text-muted"><p>Sin productos</p></div> : 
              <div className="list-group">
                {cart.map((item, index) => (
                  <div key={index} className="list-group-item border-0 border-bottom px-0">
                    <div className="d-flex justify-content-between">
                      <div><div className="fw-bold">{item.nombre}</div><small className="text-muted">{item.selectedSize} | x{item.quantity}</small></div>
                      <div className="text-end"><span className="fw-bold">${(item.selectedPrice * item.quantity).toLocaleString()}</span><br/><small className="text-danger" style={{cursor:'pointer'}} onClick={() => removeFromCart(item.id, item.selectedSize)}>Quitar</small></div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
          <div className="border-top pt-3 bg-light p-3">
            <div className="d-flex justify-content-between mb-3"><span className="fs-4 fw-bold">Total:</span><span className="fs-2 fw-bold text-success">${total.toLocaleString()}</span></div>
            <input type="text" className="form-control mb-3" placeholder="Número de Mesa" value={mesa} onChange={(e) => setMesa(e.target.value)} />
            <button onClick={handleCobrar} className="btn btn-dark w-100 py-3 fw-bold" disabled={cart.length === 0}><i className="bi bi-send-fill me-2"></i> ENVIAR A COCINA</button>
          </div>
        </div>
      </div>
    </>
  );
}