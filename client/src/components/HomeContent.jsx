import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function HomeContent({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('Todos');
  const { addToCart } = useCart();

  useEffect(() => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) {
              setProducts(data);
          } else {
              console.error("La API no devolvió un array:", data);
              setProducts([]);
          }
      })
      .catch(err => {
          console.error("Error cargando productos:", err);
          setProducts([]);
      });
  }, []);

  // Obtener categorías únicas con seguridad
  const categories = ['Todos', ...new Set(products.map(p => p.categoria || 'Sin Categoría'))];

  const filteredProducts = filter === 'Todos' 
    ? products 
    : products.filter(p => p.categoria === filter);

  const handleAdd = (e, product) => {
    e.stopPropagation(); 
    const precioFinal = product.precio || 0;
    addToCart(product, 1, precioFinal, product.tamaño || 'Personal');
    
    toast.success(`Agregado: ${product.nombre}`, {
        icon: '🥢',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
    });
  };

  return (
    <div>
      {/* Filtros */}
      <div className="filter-container">
        <div className="container">
          <div className="filter-scroll">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="container py-4">
        {products.length === 0 && (
            <div className="text-center py-5 text-muted">
                <p>Cargando productos o inventario vacío...</p>
            </div>
        )}

        <div className="row g-4">
          {/* CORRECCIÓN AQUI: Usamos 'index' en lugar de Math.random() */}
          {filteredProducts.map((product, index) => (
            <div key={product.id || index} className="col-6 col-md-4 col-lg-3">
              <div 
                className="product-card h-100 d-flex flex-column" 
                style={{cursor: 'pointer'}}
                onClick={() => onSelectProduct(product)}
              >
                <div style={{height: '150px', overflow: 'hidden', position: 'relative'}}>
                  <img 
                    src={product.imagen || '/images/placeholder.jpg'} 
                    alt={product.nombre || 'Producto'}
                    className="w-100 h-100"
                    style={{objectFit: 'cover'}}
                    loading="lazy"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=No+Img'}
                  />
                  <div className="position-absolute bottom-0 start-0 bg-dark text-white px-2 py-1" style={{fontSize: '0.8rem', opacity: 0.9, borderTopRightRadius: '10px'}}>
                    ${(product.precio || 0).toLocaleString()}
                  </div>
                </div>
                
                <div className="p-3 d-flex flex-column flex-grow-1">
                  <h6 className="fw-bold mb-1 text-truncate">{product.nombre || 'Sin Nombre'}</h6>
                  <small className="text-muted mb-3" style={{fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                    {product.descripcion || product.categoria}
                  </small>
                  
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                     <small className="text-secondary fw-bold" style={{fontSize: '0.75rem'}}>
                        {product.tamaño || 'Unico'}
                     </small>
                     <button 
                        className="btn btn-sm btn-outline-warning text-dark fw-bold rounded-pill px-3"
                        onClick={(e) => handleAdd(e, product)}
                     >
                        +
                     </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}