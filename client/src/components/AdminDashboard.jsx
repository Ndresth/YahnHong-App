import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState({ total: 0, cantidadPedidos: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  // Cargar Productos (Ruta relativa para Render)
  const fetchProductos = () => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error(err));
  };

  // Cargar Ventas
  const fetchVentas = () => {
    fetch('/api/ventas/hoy')
      .then(res => res.json())
      .then(data => setVentas(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    // Actualizar ventas cada 30 segs
    const interval = setInterval(fetchVentas, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- FUNCIÓN MAGICA CORREGIDA ---
  const handleCerrarCaja = async () => {
    if (!window.confirm("⚠️ ¿CERRAR CAJA?\n\n1. Se descargará el Excel con el TOTAL.\n2. Se BORRARÁN todos los pedidos para iniciar mañana en $0.")) {
        return;
    }

    // 1. Descargar Excel
    window.open('/api/ventas/excel', '_blank');

    // 2. Preguntar confirmación de borrado
    setTimeout(async () => {
        const confirmDelete = window.confirm("¿El Excel se descargó correctamente?\n\nSi le das ACEPTAR, el sistema se reiniciará a $0.");
        
        if (confirmDelete) {
            try {
                const res = await fetch('/api/ventas/cerrar', { method: 'DELETE' });
                
                if (res.ok) {
                    alert("✅ ¡Caja Cerrada! El sistema está limpio.");
                    
                    // --- AQUÍ ESTÁ LA CORRECCIÓN: Forzamos el 0 visualmente ---
                    setVentas({ total: 0, cantidadPedidos: 0 });
                    // ---------------------------------------------------------
                    
                } else {
                    alert("Hubo un error al intentar borrar los datos.");
                }
            } catch (error) {
                console.error(error);
                alert("Error de conexión al intentar cerrar caja.");
            }
        }
    }, 3000);
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

      {/* ZONA FINANCIERA */}
      <div className="row mb-5">
        <div className="col-md-12">
            <div className="card bg-dark text-white shadow">
                <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-center p-4">
                    <div className="mb-3 mb-md-0">
                        <h5 className="text-white-50 mb-1">Ventas Acumuladas ({ventas.cantidadPedidos} pedidos)</h5>
                        <h1 className="display-4 fw-bold text-warning mb-0">${ventas.total.toLocaleString()}</h1>
                    </div>
                    <div className="text-end">
                        <button onClick={handleCerrarCaja} className="btn btn-light fw-bold px-4 py-3 rounded-pill">
                            <i className="bi bi-file-earmark-spreadsheet-fill text-success me-2"></i> 
                            Cerrar Caja y Reiniciar
                        </button>
                        <div className="text-white-50 small mt-2">
                            *Descarga reporte y borra historial
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