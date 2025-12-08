import React, { useState, useEffect } from 'react';
import { printReceipt } from '../utils/printReceipt';
import toast from 'react-hot-toast';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);

  const cargarPedidos = () => {
    fetch('/api/orders') 
      .then(res => res.json())
      .then(data => setOrdenes(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000); 
    return () => clearInterval(intervalo);
  }, []);

  const handleCompletar = (orden) => {
    // 1. Imprimir
    printReceipt(orden.items, orden.total, orden.cliente, orden.tipo, orden.numeroMesa);

    // 2. Completar en BD
    fetch(`/api/orders/${orden._id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Completado' })
    })
    .then(() => {
        toast.success("Pedido despachado");
        cargarPedidos();
    })
    .catch(() => toast.error("Error al completar"));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h2 className="fw-bold text-dark"><i className="bi bi-fire text-danger me-2"></i>Cocina en Vivo</h2>
        <div className="text-muted small">
            <i className="bi bi-clock-history me-1"></i> Actualizado: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="text-center mt-5 py-5 text-muted">
            <i className="bi bi-cup-hot display-1 d-block mb-3 opacity-50"></i>
            <h4>Todo tranquilo por ahora</h4>
            <p>Esperando nuevas comandas...</p>
        </div>
      ) : (
        <div className="row g-4">
            {ordenes.map(orden => (
                <div key={orden._id} className="col-md-6 col-lg-4 col-xl-3">
                    <div className={`card h-100 shadow border-0 ${orden.tipo === 'Llevar' ? 'bg-warning-subtle' : ''}`}>
                        <div className={`card-header fw-bold d-flex justify-content-between align-items-center ${orden.tipo === 'Llevar' ? 'bg-warning text-dark' : 'bg-dark text-white'}`}>
                            <span>
                                {orden.tipo === 'Llevar' ? <i className="bi bi-bag-fill me-2"></i> : <i className="bi bi-table me-2"></i>}
                                {orden.tipo === 'Llevar' ? 'PARA LLEVAR' : `MESA ${orden.numeroMesa}`}
                            </span>
                            <span className="badge bg-white text-dark small">#{orden._id.slice(-4)}</span>
                        </div>
                        
                        <div className="card-body">
                            <h5 className="card-title fw-bold mb-1">{orden.cliente.nombre}</h5>
                            <small className="text-muted d-block mb-3"><i className="bi bi-clock me-1"></i>{new Date(orden.fecha).toLocaleTimeString()}</small>
                            
                            <ul className="list-group list-group-flush mb-3">
                                {orden.items.map((item, idx) => (
                                    <li key={idx} className="list-group-item px-0 py-2 d-flex justify-content-between bg-transparent border-bottom-dashed">
                                        <div style={{lineHeight: '1.2'}}>
                                            <span className="fw-bold fs-5 me-2">{item.cantidad}x</span> 
                                            {item.nombre}
                                            <div className="text-muted small fst-italic ms-4">{item.tamaño}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="card-footer bg-transparent border-0 p-3">
                            <button 
                                onClick={() => handleCompletar(orden)}
                                className="btn btn-success w-100 fw-bold py-2 shadow-sm"
                            >
                                <i className="bi bi-check-lg me-2"></i>DESPACHAR
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}