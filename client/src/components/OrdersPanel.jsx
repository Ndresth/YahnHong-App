import React, { useState, useEffect } from 'react';
import { printReceipt } from '../utils/printReceipt';
import { swalBootstrap } from '../utils/swalConfig';
import toast from 'react-hot-toast';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);

  const cargarPedidos = () => {
    fetch('/api/orders').then(res => res.json()).then(setOrdenes).catch(console.error);
  };

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000); 
    return () => clearInterval(intervalo);
  }, []);

  const handleImprimir = (orden, modo) => {
    const itemsAdaptados = orden.items.map(i => ({
        nombre: i.nombre, quantity: i.cantidad, selectedSize: i.tamaño, selectedPrice: i.precio, nota: i.nota
    }));
    const ordenInfo = { tipo: orden.tipo, numero: orden.numeroMesa };
    printReceipt(itemsAdaptados, orden.total, orden.cliente, modo, ordenInfo);
  };

  const handleCompletar = async (id) => {
    const result = await swalBootstrap.fire({
        title: '¿Despachar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        confirmButtonColor: '#198754'
    });

    if(result.isConfirmed) {
        fetch(`/api/orders/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Completado' })
        }).then(() => { toast.success("Despachado"); cargarPedidos(); });
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-danger">Cocina / Pendientes</h2>
        <span className="badge bg-warning text-dark">En vivo</span>
      </div>
      <div className="row">
            {ordenes.map(orden => (
                <div key={orden._id} className="col-md-6 col-lg-4 mb-4">
                    <div className={`card shadow h-100 border-${orden.tipo === 'Domicilio' ? 'warning' : 'dark'}`}>
                        <div className={`card-header text-white fw-bold d-flex justify-content-between ${orden.tipo === 'Domicilio' ? 'bg-warning text-dark' : 'bg-dark'}`}>
                            <span>{orden.tipo === 'Mesa' ? `MESA ${orden.numeroMesa}` : orden.tipo}</span>
                            <span>{new Date(orden.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="card-body">
                            <h5 className="card-title fw-bold">{orden.cliente.nombre}</h5>
                            {orden.tipo === 'Domicilio' && <p className="small mb-2">{orden.cliente.direccion}</p>}
                            <hr />
                            <ul className="list-group list-group-flush">
                                {orden.items.map((item, idx) => (
                                    <li key={idx} className="list-group-item px-0">
                                        <span className="badge bg-dark me-2">{item.cantidad}</span> 
                                        <strong>{item.nombre}</strong> <small>({item.tamaño})</small>
                                        {item.nota && <div className="bg-warning p-1 mt-1 small rounded">OBS: {item.nota}</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="card-footer bg-white row g-1">
                            <div className="col-6"><button onClick={() => handleImprimir(orden, 'cocina')} className="btn btn-secondary w-100 btn-sm">Comanda</button></div>
                            <div className="col-6"><button onClick={() => handleImprimir(orden, 'cliente')} className="btn btn-outline-dark w-100 btn-sm">Factura</button></div>
                            <div className="col-12"><button onClick={() => handleCompletar(orden._id)} className="btn btn-success w-100 fw-bold">DESPACHAR</button></div>
                        </div>
                    </div>
                </div>
            ))}
      </div>
    </div>
  );
}