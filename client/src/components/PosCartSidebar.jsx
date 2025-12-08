import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { swalBootstrap } from '../utils/swalConfig';

export default function PosCartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, total, clearCart, updateItemNote } = useCart();
  
  const [tipoPedido, setTipoPedido] = useState('Mesa'); 
  const [identificador, setIdentificador] = useState(''); 

  const handleCobrar = async () => {
    if (!identificador.trim()) {
        return swalBootstrap.fire({
            title: 'Faltan datos',
            text: tipoPedido === 'Mesa' ? 'Ingresa el número de mesa' : 'Ingresa el nombre del cliente',
            icon: 'warning',
            timer: 2000,
            showConfirmButton: false
        });
    }

    const confirm = await swalBootstrap.fire({
        title: '¿Confirmar Pedido?',
        text: `Total: $${total.toLocaleString()} - ${tipoPedido}: ${identificador}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enviar a Cocina',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        const nuevaOrden = {
            tipo: tipoPedido,
            numeroMesa: tipoPedido === 'Mesa' ? identificador : null,
            cliente: { 
                nombre: tipoPedido === 'Mesa' ? `Mesa ${identificador}` : identificador, 
                telefono: "", 
                direccion: "En Local", 
                metodoPago: "Efectivo/QR" 
            },
            items: cart.map(i => ({ 
                nombre: i.nombre, 
                cantidad: i.quantity, 
                precio: i.selectedPrice, 
                tamaño: i.selectedSize,
                nota: i.nota || '' // Enviamos la nota
            })),
            total: total
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaOrden)
            });

            if (res.ok) {
                swalBootstrap.fire({
                    title: '¡Enviado!',
                    text: 'La comanda está en cocina',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                clearCart();
                setIdentificador('');
                onClose();
            } else { throw new Error(); }
        } catch { swalBootstrap.fire('Error', 'No se pudo enviar', 'error'); }
    }
  };

  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{zIndex: 1040}}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1050 }}>
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title fw-bold"><i className="bi bi-cart-check me-2"></i>Nueva Comanda</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column">
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.length === 0 ? (
                <div className="text-center mt-5 text-muted d-flex flex-column align-items-center">
                    <i className="bi bi-basket fs-1 mb-2"></i>
                    <p>Agrega productos</p>
                </div>
            ) : (
              <div className="list-group list-group-flush">
                {cart.map((item, index) => (
                  <div key={index} className="list-group-item px-0 py-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="w-100 me-2">
                        <div className="fw-bold text-dark">{item.nombre}</div>
                        <div className="text-muted small mb-1">
                            <span className="badge bg-light text-dark border me-1">{item.selectedSize}</span>
                            x{item.quantity}
                        </div>
                        {/* INPUT DE NOTAS DE COCINA */}
                        <input 
                            type="text" 
                            className="form-control form-control-sm bg-light border-0 text-secondary" 
                            placeholder="Nota de cocina (opcional)..."
                            value={item.nota || ''}
                            onChange={(e) => updateItemNote(item.id, item.selectedSize, e.target.value)}
                        />
                      </div>
                      <div className="text-end" style={{minWidth: '70px'}}>
                          <span className="fw-bold d-block mb-1">${(item.selectedPrice * item.quantity).toLocaleString()}</span>
                          <button className="btn btn-sm text-danger p-0 border-0" onClick={() => removeFromCart(item.id, item.selectedSize)}>
                              <i className="bi bi-trash"></i>
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-top pt-3 bg-light p-3 rounded shadow-sm">
            <div className="btn-group w-100 mb-3" role="group">
                <input type="radio" className="btn-check" name="btnradio" id="btnMesa" autoComplete="off" 
                    checked={tipoPedido === 'Mesa'} onChange={() => setTipoPedido('Mesa')} />
                <label className="btn btn-outline-dark fw-bold" htmlFor="btnMesa">
                    <i className="bi bi-table me-2"></i>Mesa
                </label>

                <input type="radio" className="btn-check" name="btnradio" id="btnLlevar" autoComplete="off" 
                    checked={tipoPedido === 'Llevar'} onChange={() => setTipoPedido('Llevar')} />
                <label className="btn btn-outline-dark fw-bold" htmlFor="btnLlevar">
                    <i className="bi bi-bag-fill me-2"></i>Llevar
                </label>
            </div>

            <div className="input-group mb-3">
                <span className="input-group-text bg-white border-end-0">
                    <i className={`bi ${tipoPedido === 'Mesa' ? 'bi-hash' : 'bi-person-fill'}`}></i>
                </span>
                <input 
                    type="text" 
                    className="form-control border-start-0 ps-0" 
                    placeholder={tipoPedido === 'Mesa' ? "Número de Mesa..." : "Nombre Cliente..."} 
                    value={identificador} 
                    onChange={(e) => setIdentificador(e.target.value)} 
                />
            </div>

            <div className="d-flex justify-content-between mb-3 align-items-end">
                <span className="fs-5">Total:</span>
                <span className="fs-2 fw-bold text-success">${total.toLocaleString()}</span>
            </div>
            
            <button onClick={handleCobrar} className="btn btn-dark w-100 py-3 fw-bold rounded-pill" disabled={cart.length === 0}>
                <i className="bi bi-printer-fill me-2"></i> ENVIAR COMANDA
            </button>
          </div>
        </div>
      </div>
    </>
  );
}