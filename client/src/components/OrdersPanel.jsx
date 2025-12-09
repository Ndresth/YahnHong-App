import React, { useState, useEffect, useRef } from 'react';
import { printReceipt } from '../utils/printReceipt';
import { swalBootstrap } from '../utils/swalConfig'; 
import toast from 'react-hot-toast';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false); // Estado para saber si el audio está activo
  
  // Referencias para mantener valores sin renderizar de nuevo
  const prevOrdenesLength = useRef(0);
  const audioRef = useRef(new Audio('/sounds/ding.mp3')); // Asegúrate de crear este archivo

  const cargarPedidos = () => {
    fetch('/api/orders') 
      .then(res => res.json())
      .then(data => {
        // LÓGICA DE ALERTA DE SONIDO
        // Si hay más órdenes que antes, y no es la primera carga (0), suena la campana
        if (data.length > prevOrdenesLength.current && prevOrdenesLength.current !== 0) {
            if (audioEnabled) {
                audioRef.current.currentTime = 0; // Reiniciar sonido si ya estaba sonando
                audioRef.current.play().catch(e => console.error("Error reproduciendo audio:", e));
            }
            toast('¡Nueva Orden en Cocina!', { icon: '🔔', duration: 4000 });
        }
        
        // Actualizamos la referencia para la próxima comparación
        prevOrdenesLength.current = data.length;
        setOrdenes(data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000); 
    return () => clearInterval(intervalo);
  }, [audioEnabled]); // Dependencia agregada para que el intervalo lea el estado actualizado

  // Función para habilitar el audio (el navegador requiere interacción humana)
  const enableAudio = () => {
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setAudioEnabled(true);
          toast.success("Audio Activado Correctamente");
      }).catch(() => toast.error("No se pudo activar el audio"));
  };

  const handleImprimir = (orden, modoImpresion) => {
    const itemsAdaptados = orden.items.map(i => ({
        nombre: i.nombre, quantity: i.cantidad, selectedSize: i.tamaño, selectedPrice: i.precio, nota: i.nota
    }));
    const ordenInfo = { tipo: orden.tipo, numero: orden.numeroMesa, id: orden._id };
    printReceipt(itemsAdaptados, orden.total, orden.cliente, modoImpresion, ordenInfo);
  };

  const handleCompletar = async (id, clienteNombre) => {
    const result = await swalBootstrap.fire({
        title: '¿Despachar Orden?',
        text: `Se marcará como completado el pedido de: ${clienteNombre}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, Despachar',
        confirmButtonColor: '#198754',
        cancelButtonText: 'Cancelar'
    });

    if(!result.isConfirmed) return;
    
    toast.promise(
        fetch(`/api/orders/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Completado' })
        }).then(() => {
            // Ajustamos el contador para que no suene al recargar (porque bajó la cantidad)
            prevOrdenesLength.current = Math.max(0, prevOrdenesLength.current - 1);
            cargarPedidos();
        }),
        {
            loading: 'Procesando...',
            success: 'Orden despachada',
            error: 'Error al actualizar'
        }
    );
  };

  const getCardStyle = (tipo) => {
      switch(tipo) {
          case 'Mesa': return { border: 'border-primary', bg: 'bg-primary', icon: 'bi-shop' };
          case 'Domicilio': return { border: 'border-warning', bg: 'bg-warning text-dark', icon: 'bi-bicycle' };
          case 'Llevar': return { border: 'border-success', bg: 'bg-success', icon: 'bi-bag-fill' };
          default: return { border: 'border-secondary', bg: 'bg-secondary', icon: 'bi-question' };
      }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-danger"><i className="bi bi-clipboard-data me-2"></i>Gestión de Pedidos</h2>
        <div className="d-flex gap-2">
            {!audioEnabled && (
                <button onClick={enableAudio} className="btn btn-outline-dark btn-sm animate__animated animate__pulse animate__infinite">
                    <i className="bi bi-volume-mute-fill me-1"></i> Activar Sonido
                </button>
            )}
            <span className="badge bg-secondary d-flex align-items-center"><i className="bi bi-activity me-1"></i>En línea</span>
        </div>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="alert alert-secondary text-center py-5">
            <h4><i className="bi bi-check2-circle me-2"></i>Sin pendientes</h4>
            <p className="mb-0">No hay órdenes activas en este momento.</p>
        </div>
      ) : (
        <div className="row">
            {ordenes.map(orden => {
                const style = getCardStyle(orden.tipo);
                return (
                    <div key={orden._id} className="col-md-6 col-lg-4 mb-4">
                        <div className={`card shadow h-100 ${style.border}`}>
                            
                            <div className={`card-header text-white d-flex justify-content-between align-items-center ${style.bg}`}>
                                <div className="fw-bold text-uppercase">
                                    <i className={`bi ${style.icon} me-2`}></i>
                                    {orden.tipo === 'Mesa' ? `MESA ${orden.numeroMesa}` : orden.tipo}
                                </div>
                                <span className="badge bg-light text-dark opacity-75">
                                    {new Date(orden.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            <div className="card-body">
                                <h5 className="card-title fw-bold mb-0 text-truncate">{orden.cliente.nombre}</h5>
                                {orden.tipo === 'Domicilio' && <p className="small text-muted mb-2 text-truncate"><i className="bi bi-geo-alt me-1"></i>{orden.cliente.direccion}</p>}
                                
                                <hr />
                                <ul className="list-group list-group-flush mb-3">
                                    {orden.items.map((item, idx) => (
                                        <li key={idx} className="list-group-item px-0 py-2 d-flex flex-column align-items-start">
                                            <div className="w-100 d-flex justify-content-between">
                                                <span>
                                                    <span className="badge bg-dark me-2">{item.cantidad}</span> 
                                                    <span className="fw-bold">{item.nombre}</span>
                                                </span>
                                                <small className="text-muted">{item.tamaño}</small>
                                            </div>
                                            {item.nota && (
                                                <div className="alert alert-warning mt-1 mb-0 py-1 px-2 w-100 small">
                                                    <i className="bi bi-info-circle-fill me-1"></i> 
                                                    <strong>Obs:</strong> {item.nota}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="card-footer bg-white p-2">
                                <div className="row g-2">
                                    <div className="col-6">
                                        <button onClick={() => handleImprimir(orden, 'cocina')} className="btn btn-secondary w-100 btn-sm">
                                            <i className="bi bi-printer me-1"></i> Comanda
                                        </button>
                                    </div>
                                    <div className="col-6">
                                        <button onClick={() => handleImprimir(orden, 'cliente')} className="btn btn-outline-dark w-100 btn-sm">
                                            <i className="bi bi-receipt me-1"></i> Factura
                                        </button>
                                    </div>
                                    <div className="col-12">
                                        <button onClick={() => handleCompletar(orden._id, orden.cliente.nombre)} className="btn btn-success w-100 fw-bold">
                                            <i className="bi bi-check-lg me-2"></i> DESPACHAR
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}