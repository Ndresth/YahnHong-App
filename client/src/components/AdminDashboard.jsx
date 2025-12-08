import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import { swalBootstrap } from '../utils/swalConfig'; 
import ProductForm from './ProductForm';
import Reportes from './Reportes'; // (Crearemos este archivo abajo)

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [finanzas, setFinanzas] = useState({ totalVentas: 0, totalGastos: 0, totalCaja: 0, cantidadPedidos: 0 });
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [vista, setVista] = useState('dashboard'); 

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const isAdmin = localStorage.getItem('role') === 'admin'; 

  const handleLogout = async () => {
    const result = await swalBootstrap.fire({ title: '¿Cerrar Sesión?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Salir' });
    if(result.isConfirmed) { localStorage.clear(); navigate('/login'); }
  };

  const cargarDatos = useCallback(() => {
    fetch('/api/productos').then(res => res.json()).then(setProductos);
    fetch('/api/ventas/hoy').then(res => res.json()).then(setFinanzas);
    fetch('/api/gastos/hoy').then(res => res.json()).then(setGastos);
  }, []);

  useEffect(() => { cargarDatos(); const interval = setInterval(cargarDatos, 10000); return () => clearInterval(interval); }, [cargarDatos]);

  const handleRegistrarGasto = async (e) => {
      e.preventDefault();
      if (!nuevoGasto.descripcion || !nuevoGasto.monto) return toast.error("Datos incompletos");
      await fetch('/api/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(nuevoGasto) });
      setNuevoGasto({ descripcion: '', monto: '' }); cargarDatos(); toast.success("Gasto registrado");
  };

  const handleBorrarGasto = async (id) => {
      if((await swalBootstrap.fire({ title: '¿Borrar gasto?', icon: 'warning', showCancelButton: true })).isConfirmed) {
          await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); cargarDatos();
      }
  };

  const handleCerrarCaja = async () => {
    const { value: inputEfectivo } = await swalBootstrap.fire({ title: 'Arqueo de Caja', input: 'text', inputLabel: 'Efectivo en caja:', inputPlaceholder: 'Ej: 150000', showCancelButton: true, confirmButtonText: 'Cerrar Turno' });
    if (!inputEfectivo) return;

    toast.promise(fetch('/api/ventas/cerrar', { 
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
        body: JSON.stringify({ efectivoReal: inputEfectivo }) 
    }).then(async res => {
        const data = await res.json();
        swalBootstrap.fire({ title: 'Turno Cerrado', text: `Diferencia: $${data.reporte.diferencia.toLocaleString()}`, icon: data.reporte.diferencia === 0 ? 'success' : 'warning' });
        cargarDatos();
    }), { loading: 'Cerrando...', success: 'Listo', error: 'Error' });
  };

  const handleDelete = async (id) => { 
      if((await swalBootstrap.fire({ title: '¿Eliminar plato?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545' })).isConfirmed) {
          await fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); cargarDatos();
      }
  };
  
  const handleSave = (formData) => { 
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';
    fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(formData) })
    .then(() => { setShowForm(false); cargarDatos(); toast.success("Guardado"); });
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Yahn Hong</h2>
        <div className="d-flex gap-2">
            <button className={`btn ${vista === 'dashboard' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('dashboard')}>Control</button>
            {isAdmin && <button className={`btn ${vista === 'reportes' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('reportes')}>Reportes</button>}
            <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
        </div>
      </div>

      {vista === 'reportes' && isAdmin ? <Reportes /> : (
          <>
            <div className="row mb-4">
                <div className="col-md-7 mb-3">
                    <div className="card bg-dark text-white shadow h-100 border-0">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between mb-2"><span className="text-success fw-bold">Ventas:</span><span className="text-success fw-bold">${finanzas.totalVentas?.toLocaleString()}</span></div>
                            <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-2"><span className="text-danger fw-bold">Gastos:</span><span className="text-danger fw-bold">${finanzas.totalGastos?.toLocaleString()}</span></div>
                            <div className="d-flex justify-content-between align-items-end">
                                <div><h5 className="text-white-50 mb-0">En Caja:</h5><h1 className="display-4 fw-bold text-warning mb-0">${finanzas.totalCaja?.toLocaleString()}</h1></div>
                                <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold py-2 px-4 shadow">ARQUEO DE CAJA</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-5 mb-3">
                    <div className="card shadow h-100 border-danger">
                        <div className="card-header bg-danger text-white fw-bold">Registrar Gasto</div>
                        <div className="card-body">
                            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control" placeholder="Concepto" value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                                <input type="number" className="form-control" placeholder="$" style={{width:'100px'}} value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                                <button type="submit" className="btn btn-outline-danger">+</button>
                            </form>
                            <ul className="list-group list-group-flush small overflow-auto" style={{maxHeight: '150px'}}>
                                {gastos.map(g => (
                                    <li key={g._id} className="list-group-item d-flex justify-content-between px-0 py-1">
                                        <span>{g.descripcion}</span><span><span className="text-danger me-2">-${g.monto.toLocaleString()}</span><i className="bi bi-trash text-muted" style={{cursor:'pointer'}} onClick={() => handleBorrarGasto(g._id)}></i></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
                <h4 className="fw-bold">Menú</h4>
                <button className="btn btn-success fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}>+ Nuevo Plato</button>
            </div>
            {/* TABLA DE PRODUCTOS (IGUAL A LA QUE TENÍAS PERO CON ESTILO) */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light"><tr><th className="p-3">Img</th><th>Nombre</th><th>Precio Base</th><th className="text-end p-3">Acciones</th></tr></thead>
                            <tbody>
                                {productos.map((prod) => (
                                <tr key={prod.id}>
                                    <td className="p-3"><img src={prod.imagen} alt="img" className="rounded" style={{width: '40px', height:'40px', objectFit:'cover'}} /></td>
                                    <td className="fw-bold">{prod.nombre}</td>
                                    <td>${prod.precios ? Object.values(prod.precios).find(p => p > 0)?.toLocaleString() : '0'}</td>
                                    <td className="text-end p-3">
                                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}>Editar</button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}>Borrar</button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {showForm && <ProductForm productToEdit={editingProduct} onClose={() => setShowForm(false)} onSave={handleSave} />}
          </>
      )}
    </div>
  );
}