import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState({ total: 0, cantidadPedidos: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // NUEVO ESTADO: Para bloquear el botón de borrar hasta que descarguen
  const [descargaConfirmada, setDescargaConfirmada] = useState(false);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  const fetchProductos = () => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error(err));
  };

  const fetchVentas = () => {
    fetch('/api/ventas/hoy')
      .then(res => res.json())
      .then(data => setVentas(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    const interval = setInterval(fetchVentas, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- PASO 1: DESCARGAR EXCEL DE FORMA SEGURA ---
  const handleDescargarExcel = async () => {
    setCargandoExcel(true);
    try {
        const response = await fetch('/api/ventas/excel');
        
        if (response.ok) {
            // Convertimos la respuesta en un archivo descargable (Blob)
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cierre_Caja_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            // ¡ÉXITO! Habilitamos el botón de borrar
            setDescargaConfirmada(true);
            alert("✅ Excel descargado correctamente. Ahora puedes cerrar la caja.");
        } else {
            alert("Error al generar el Excel. Intenta de nuevo.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al descargar.");
    } finally {
        setCargandoExcel(false);
    }
  };

  // --- PASO 2: BORRAR DATOS (Solo si ya descargó) ---
  const handleReiniciarCaja = async () => {
    if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nSe borrarán TODOS los pedidos de la base de datos y el contador volverá a $0.\n\nEsta acción no se puede deshacer.")) {
        return;
    }

    try {
        const res = await fetch('/api/ventas/cerrar', { method: 'DELETE' });
        if (res.ok) {
            alert("✅ ¡Caja reiniciada con éxito!");
            setVentas({ total: 0, cantidadPedidos: 0 }); // Reinicio visual inmediato
            setDescargaConfirmada(false); // Bloqueamos el botón de nuevo para mañana
        } else {
            alert("Hubo un problema al intentar borrar la base de datos.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al reiniciar caja.");
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar plato?')) {
      fetch(`/api/productos/${id}`, { method: 'DELETE' })
      .then(() => { alert('Eliminado'); fetchProductos(); });
    }
  };

  const handleSave = (formData) => {
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct 
        ? `/api/productos/${formData.id}`
        : '/api/productos';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    }).then(() => {
        setShowForm(false);
        fetchProductos();
    });
  };

  return (
    <div className="container py-5">
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Administrativo</h2>
        <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
      </div>

      {/* ZONA FINANCIERA MEJORADA */}
      <div className="row mb-5">
        <div className="col-md-12">
            <div className="card bg-dark text-white shadow">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        {/* Columna de Totales */}
                        <div className="col-md-6 mb-3 mb-md-0">
                            <h5 className="text-white-50 mb-1">Ventas Acumuladas ({ventas.cantidadPedidos} pedidos)</h5>
                            <h1 className="display-4 fw-bold text-warning mb-0">${ventas.total.toLocaleString()}</h1>
                        </div>

                        {/* Columna de Botones (Flujo de 2 Pasos) */}
                        <div className="col-md-6 text-end">
                            <div className="d-flex gap-2 justify-content-md-end flex-column flex-md-row">
                                
                                {/* PASO 1 */}
                                <button 
                                    onClick={handleDescargarExcel} 
                                    className="btn btn-primary fw-bold py-2"
                                    disabled={cargandoExcel}
                                >
                                    {cargandoExcel ? 'Generando...' : '1. Descargar Reporte 📥'}
                                </button>

                                {/* PASO 2 (Deshabilitado hasta que descargues) */}
                                <button 
                                    onClick={handleReiniciarCaja} 
                                    className={`btn fw-bold py-2 ${descargaConfirmada ? 'btn-danger' : 'btn-secondary'}`}
                                    disabled={!descargaConfirmada}
                                    title={!descargaConfirmada ? "Debes descargar el Excel primero" : "Borrar datos del día"}
                                >
                                    2. Reiniciar Caja 🗑️
                                </button>
                            </div>
                            <div className="text-white-50 small mt-2">
                                {descargaConfirmada 
                                    ? "✅ Reporte guardado. Ya puedes reiniciar la caja." 
                                    : "⚠️ Por seguridad, descarga el reporte antes de borrar."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Gestión de Menú</h4>
        <button className="btn btn-success fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}>+ Nuevo Plato</button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">Imagen</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th className="text-end p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.id}>
                    <td className="p-3">
                      <img src={prod.imagen || "https://via.placeholder.com/50"} alt="img" className="rounded" style={{width: '50px', height: '50px', objectFit: 'cover'}} />
                    </td>
                    <td className="fw-bold">{prod.nombre}</td>
                    <td><span className="badge bg-secondary text-light">{prod.categoria}</span></td>
                    <td>${prod.precios ? Object.values(prod.precios).find(p => p > 0)?.toLocaleString() : '0'}</td>
                    <td className="text-end p-3">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}>Editar</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <ProductForm 
            productToEdit={editingProduct} 
            onClose={() => setShowForm(false)} 
            onSave={handleSave} 
        />
      )}
    </div>
  );
}