import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { PLACEHOLDER_IMG, TAMANO_LABEL } from '../config';
import { money, preciosActivos } from '../utils/format';

/** Detalle de producto del menú público: cantidad + selección de tamaño. */
export default function ProductSidebar({ product, onClose }) {
  const { addToCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const isOpen = Boolean(product);

  const handleAdd = (size, price) => {
    addToCart(product, size, price, cantidad);
    toast.success(<span>Agregado: <b>{cantidad}x {product.nombre}</b></span>, { icon: '🥢' });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="side-backdrop" style={{ zIndex: 1060 }} onClick={onClose}></div>}
      <aside className={`side-panel ${isOpen ? 'open' : ''}`} style={{ zIndex: 1070 }} aria-hidden={!isOpen}>
        {product && (
          <>
            <div className="position-relative">
              <img src={product.imagen || PLACEHOLDER_IMG} alt={product.nombre} className="w-100" style={{ height: 240, objectFit: 'cover' }}
                onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
              <button className="btn btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm" onClick={onClose} aria-label="Cerrar">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="p-3 overflow-auto flex-grow-1">
              <h4 className="fw-bold mb-1">{product.nombre}</h4>
              <p className="text-muted small">{product.descripcion}</p>

              <div className="d-flex align-items-center justify-content-between my-3 p-2 bg-light rounded-3">
                <span className="fw-semibold ps-1">Cantidad</span>
                <div className="qty-control bg-white">
                  <button onClick={() => setCantidad(c => Math.max(1, c - 1))} aria-label="Menos">−</button>
                  <span>{cantidad}</span>
                  <button onClick={() => setCantidad(c => Math.min(99, c + 1))} aria-label="Más">+</button>
                </div>
              </div>

              <h6 className="fw-bold text-secondary mb-2">Elige el tamaño</h6>
              <div className="d-grid gap-2">
                {preciosActivos(product).map(([size, price]) => (
                  <button key={size} onClick={() => handleAdd(size, price)}
                    className="btn btn-outline-dark d-flex justify-content-between align-items-center p-3 rounded-3">
                    <span className="text-start">
                      <span className="fw-bold d-block">{TAMANO_LABEL[size]}</span>
                      <small className="text-muted">{money(price)} c/u</small>
                    </span>
                    <span className="fs-5 fw-bold">{money(price * cantidad)} <i className="bi bi-plus-circle-fill text-danger ms-1"></i></span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
