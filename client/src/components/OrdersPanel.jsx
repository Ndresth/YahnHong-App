import React, { useState, useEffect } from 'react';
import { printReceipt } from '../utils/printReceipt';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);

  const cargarPedidos = () => {
    // URL COMPLETA PARA LOCAL (Recuerda cambiar a /api/orders para Render)
    fetch('/api/orders') 
      .then(res => res.json())
      .then(data => setOrdenes(data))
      .catch(err => console.error(err));
  };

  // Auto-refresco cada 5 segundos
  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000); 
    return () => clearInterval(intervalo);
  }, []);

  // --- FUNCIÓN DE UN SOLO CLIC ---
  const handleImprimirYCompletar = (orden) => {
    // 1. Generar el recibo visual (Impresión)
    const itemsAdaptados = orden.items.map(i => ({
        nombre: i.nombre,
        quantity: i.cantidad,
        selectedSize: i.tamaño,
        selectedPrice: i.precio
    }));
    
    // Lanza la ventana de impresión
    printReceipt(itemsAdaptados, orden.total, orden.cliente);

    // 2. Marcar como completado en la Base de Datos INMEDIATAMENTE
    // (Sin preguntar, para que desaparezca de la pantalla)
    fetch(`/api/orders/${orden._id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Completado' }) // Le decimos explícitamente que ya acabó
    })
    .then(() => {
        // 3. Recargamos la lista para que el pedido desaparezca visualmente
        cargarPedidos();
    })
    .catch(err => console.error("Error al completar orden:", err));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-danger">👨‍🍳 Cocina / Caja</h2>
        <span className="badge bg-dark fs-6">Auto-actualizando...</span>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="alert alert-secondary text-center py-5">
            <h4>Todo despachado ✅</h4>
            <p>Esperando nuevos pedidos...</p>
        </div>
      ) : (
        <div className="row">
            {ordenes.map(orden => (
                <div key={orden._id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card shadow border-danger h-100">
                        <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                            <span className="fw-bold fs-5">#{orden._id.slice(-4)}</span> {/* ID corto visual */}
                            <span className="badge bg-warning text-dark">{new Date(orden.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="card-body">
                            <h5 className="card-title fw-bold mb-0">{orden.cliente.nombre}</h5>
                            <span className="badge bg-light text-dark border mb-2">{orden.cliente.metodoPago}</span>
                            <p className="small text-muted mb-2">{orden.cliente.direccion}</p>
                            <hr />
                            <ul className="list-group list-group-flush mb-3">
                                {orden.items.map((item, idx) => (
                                    <li key={idx} className="list-group-item px-0 py-1 d-flex justify-content-between align-items-center">
                                        <span style={{lineHeight: '1.2'}}>
                                            <strong>{item.cantidad}x</strong> {item.nombre} 
                                            <br/><small className="text-muted" style={{fontSize:'0.8em'}}>{item.tamaño}</small>
                                        </span>
                                        <span className="fw-bold">${(item.precio * item.cantidad).toLocaleString()}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="alert alert-secondary py-2 text-end mb-0">
                                <span className="text-muted small me-2">Total:</span>
                                <span className="fw-bold fs-4 text-dark">${orden.total.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="card-footer bg-white p-0">
                            <button 
                                onClick={() => handleImprimirYCompletar(orden)}
                                className="btn btn-dark w-100 fw-bold py-3 rounded-0 rounded-bottom"
                                style={{letterSpacing: '1px'}}
                            >
                                <i className="bi bi-printer-fill me-2"></i> IMPRIMIR Y DESPACHAR
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