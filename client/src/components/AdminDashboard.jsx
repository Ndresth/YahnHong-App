import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  // 1. Declaración de estados (Aquí nace setProductos)
  const [productos, setProductos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate();

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  // 2. Función para Cargar Productos (Dentro del componente para usar setProductos)
  const fetchProductos = () => {
    // Usamos la URL completa para local: http://localhost:3000
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error("Error cargando productos:", err));
  };

  // 3. Efecto inicial
  useEffect(() => {
    fetchProductos();
  }, []);

  // 4. Eliminar
  const handleDelete = (id) => {
    if (window.confirm('¿Seguro que quieres eliminar este plato?')) {
      fetch(`/api/productos/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error("Error al eliminar");
        return res.json();
      })
      .then(() => {
        alert('Producto eliminado');
        fetchProductos(); // Recargar lista
      })
      .catch(err => alert("Error al eliminar: " + err));
    }
  };

  // 5. Abrir Formulario
  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (producto) => {
    setEditingProduct(producto);
    setShowForm(true);
  };

  // 6. Guardar (Crear o Editar)
  const handleSave = (formData) => {
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct 
        ? `/api/productos/${formData.id}`
        : '/api/productos';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        return res.json();
    })
    .then(() => {
        alert('¡Guardado con éxito!');
        setShowForm(false);
        fetchProductos(); // Recargar lista
    })
    .catch(err => alert("Error al guardar: " + err));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Administrativo</h2>
        <div className="d-flex gap-2">
            <Link to="/" className="btn btn-outline-secondary">Ver Tienda</Link>
            <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
            <button className="btn btn-success fw-bold" onClick={handleAddNew}>+ Nuevo Plato</button>
        </div>
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
                  <th>Precio Ref.</th>
                  <th className="text-end p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.id}>
                    <td className="p-3">
                      <img 
                        src={prod.imagen || "https://via.placeholder.com/50"} 
                        alt="img" 
                        className="rounded" 
                        style={{width: '50px', height: '50px', objectFit: 'cover'}} 
                      />
                    </td>
                    <td className="fw-bold">{prod.nombre}</td>
                    <td><span className="badge bg-secondary text-light">{prod.categoria}</span></td>
                    {/* Validación para evitar error si precios es undefined */}
                    <td>${prod.precios ? Object.values(prod.precios).find(p => p > 0)?.toLocaleString() : '0'}</td>
                    <td className="text-end p-3">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(prod)}>
                        <i className="bi bi-pencil-fill"></i> Editar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}>
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Renderizado condicional del formulario */}
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