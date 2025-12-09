import React, { useState, useEffect } from 'react';

export default function HomeContent({ onSelectProduct }) {
  const [menu, setMenu] = useState([])
  const [filtro, setFiltro] = useState("Todos"); 

  useEffect(() => {
    fetch('/api/productos').then(res => res.json()).then(setMenu).catch(console.error);
  }, [])

  const ordenCategorias = ["Todos", "Arroz Frito", "Chop Suey", "Espaguetes", "Agridulce", "Platos Especiales", "Comidas Corrientes", "Porciones", "Bebidas"];

  let productosParaMostrar = [];
  if (filtro === "Todos") {
    productosParaMostrar = [...menu].sort((a, b) => {
      const indexA = ordenCategorias.indexOf(a.categoria);
      const indexB = ordenCategorias.indexOf(b.categoria);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  } else {
    productosParaMostrar = menu.filter(p => p.categoria === filtro);
  }

  return (
    <div>
      <div className="filter-container">
        <div className="container">
            <div className="filter-scroll">
                {ordenCategorias.map(cat => (
                <button key={cat} className={`filter-btn ${filtro === cat ? 'active' : ''}`} onClick={() => setFiltro(cat)}>{cat}</button>
                ))}
            </div>
        </div>
      </div>
      <div className="container py-4">
        <div className="row g-3">
            {productosParaMostrar.map((plato) => (
            <div key={plato.id} className="col-12 col-lg-6">
                <div className="card product-card h-100 p-2 d-flex flex-row align-items-center">
                <div style={{width: '120px', height: '120px', flexShrink: 0}} className="rounded overflow-hidden border">
                    <img src={plato.imagen || "https://via.placeholder.com/150"} alt={plato.nombre} style={{width: '100%', height: '100%', objectFit:'cover'}} onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Sin+Foto"; }}/>
                </div>
                <div className="card-body p-2 ps-3 w-100 d-flex flex-column justify-content-center">
                    <h5 className="card-title fw-bold mb-1 text-dark" style={{fontSize: '1.1rem'}}>{plato.nombre}</h5>
                    <small className="text-muted d-block mb-2 text-truncate" style={{maxWidth: '250px'}}>{plato.descripcion}</small>
                    <div className="d-flex justify-content-between align-items-end mt-1">
                        <span className="fw-bold text-danger fs-5">
                          ${(plato.precios ? (Object.values(plato.precios).find(p => p > 0) || 0) : 0).toLocaleString()}
                        </span>
                        <button className="btn btn-sm btn-add" onClick={() => onSelectProduct(plato)}>
                            <i className="bi bi-plus-lg me-1"></i>Agregar
                        </button>
                    </div>
                </div>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  )
}