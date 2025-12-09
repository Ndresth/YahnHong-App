import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast'; // IMPORTAR TOAST

// Eliminamos onNotify de las props porque ya no lo necesitamos
export default function ProductSidebar({ product, isOpen, onClose }) {
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);

  if (!product) return null;

  const decrementar = () => { if (cantidad > 1) setCantidad(cantidad - 1); };
  const incrementar = () => setCantidad(cantidad + 1);

  const handleAdd = (size, price) => {
    addToCart(product, size, price, cantidad);
    // USAMOS TOAST SUCCESS
    toast.success(
      <span>Agregado: <b>{cantidad}x {product.nombre}</b> ({size})</span>,
      { icon: '🥢' }
    );
    onClose(); 
  };

  // ... (El resto del return sigue igual)
  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{zIndex: 1060}}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" 
           style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1070 }}>
        
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title fw-bold"><i className="bi bi-box-seam me-2"></i>Detalle de Producto</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body">
            <div className="text-center mb-4">
                <img 
                    src={product.imagen || "https://via.placeholder.com/300?text=Sin+Foto"} 
                    alt={product.nombre}
                    className="rounded shadow-sm border"
                    style={{width: '100%', maxHeight: '250px', objectFit: 'cover'}}
                />
            </div>

            <h3 className="fw-bold text-dark mb-1">{product.nombre}</h3>
            <p className="text-muted small mb-4">{product.descripcion}</p>
            
            <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded border">
                <span className="fw-bold">Cantidad:</span>
                <div className="d-flex align-items-center gap-3">
                    <button onClick={decrementar} className="btn btn-outline-secondary rounded-circle btn-sm p-2"><i className="bi bi-dash"></i></button>
                    <span className="fs-4 fw-bold text-dark" style={{minWidth: '40px', textAlign:'center'}}>{cantidad}</span>
                    <button onClick={incrementar} className="btn btn-dark rounded-circle btn-sm p-2"><i className="bi bi-plus"></i></button>
                </div>
            </div>

            <h6 className="fw-bold mb-3 text-secondary">Seleccione presentación:</h6>
            <div className="d-grid gap-2">
                {Object.entries(product.precios).map(([size, price]) => {
                    if (price <= 0) return null;
                    return (
                      <button 
                          key={size} 
                          onClick={() => handleAdd(size, price)}
                          className="btn btn-outline-dark d-flex justify-content-between p-3 align-items-center shadow-sm border-secondary-subtle"
                      >
                          <div className="text-start">
                              <span className="text-uppercase fw-bold d-block">{size}</span>
                              <small className="text-muted" style={{fontSize: '0.75rem'}}>Precio unitario</small>
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