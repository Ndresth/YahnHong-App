import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function ProductSidebar({ product, isOpen, onClose, onNotify }) {
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);

  if (!product) return null;

  const decrementar = () => { if (cantidad > 1) setCantidad(cantidad - 1); };
  const incrementar = () => setCantidad(cantidad + 1);

  const handleAdd = (size, price) => {
    addToCart(product, size, price, cantidad);
    onNotify(`¡Agregado! ${cantidad}x ${product.nombre}`);
    onClose(); 
  };

  return (
    <>
      {/* Fondo oscuro */}
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{zIndex: 1060}}></div>}

      {/* Sidebar del Producto */}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" 
           style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1070 }}>
        
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title fw-bold">Agregar al Pedido</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body">
            {/* 1. Imagen */}
            <div className="text-center mb-3">
                <img 
                    src={product.imagen || "https://via.placeholder.com/300?text=Sin+Foto"} 
                    alt={product.nombre}
                    className="rounded shadow-sm"
                    style={{width: '100%', maxHeight: '250px', objectFit: 'cover'}}
                    onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=Error"; }}
                />
            </div>

            <h3 className="fw-bold text-danger mb-1">{product.nombre}</h3>
            <p className="text-muted small">{product.descripcion}</p>
            
            <hr />

            {/* 2. Contador de Cantidad */}
            <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded border">
                <span className="fw-bold">Cantidad:</span>
                <div className="d-flex align-items-center gap-3">
                    <button onClick={decrementar} className="btn btn-outline-danger fw-bold rounded-circle" style={{width: '35px', height:'35px'}}>-</button>
                    <span className="fs-4 fw-bold text-dark">{cantidad}</span>
                    <button onClick={incrementar} className="btn btn-danger fw-bold rounded-circle" style={{width: '35px', height:'35px'}}>+</button>
                </div>
            </div>

            {/* 3. Botones de Tamaño y Precio */}
            <h6 className="fw-bold mb-3">Selecciona Tamaño:</h6>
            <div className="d-grid gap-2">
                {Object.entries(product.precios).map(([size, price]) => {
                    
                    // --- MAGIA AQUÍ: Si el precio es 0 o menor, NO mostramos el botón ---
                    if (price <= 0) return null;

                    return (
                      <button 
                          key={size} 
                          onClick={() => handleAdd(size, price)}
                          className="btn btn-outline-danger d-flex justify-content-between p-3 align-items-center shadow-sm"
                      >
                          <div className="text-start">
                              <span className="text-uppercase fw-bold d-block">{size}</span>
                              <small style={{fontSize: '0.75rem'}}> (Llevas {cantidad})</small>
                          </div>
                          <span className="fs-5 fw-bold">${(price * cantidad).toLocaleString()}</span>
                      </button>
                    );
                })}
            </div>
        </div>
      </div>
    </>
  );
}