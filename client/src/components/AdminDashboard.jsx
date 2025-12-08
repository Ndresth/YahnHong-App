import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../utils/swalConfig';
import ProductForm from './ProductForm';
import Reportes from './Reportes'; // Asegúrate de crear este archivo (ver paso 2)

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  // Ahora finanzas incluye gastos y saldo teórico
  const [finanzas, setFinanzas] = useState({ totalVentas: 0, totalGastos: 0, totalCaja: 0, cantidadPedidos: 0 });
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [vista, setVista] = useState('dashboard'); // 'dashboard' | 'reportes'

  const navigate = useNavigate();
  // Validamos si hay token para las peticiones seguras
  const getToken = () => localStorage.getItem('token'); 

  // --- LOGOUT SEGURO ---
  const handleLogout = async () => {
    const result = await swalBootstrap.fire({
        title: '¿Cerrar Sesión?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Salir',
        cancelButtonText: 'Cancelar'
    });
    if(result.isConfirmed) {
        localStorage.clear();
        navigate('/login');
        toast.success("Sesión cerrada.");
    }
  };

  // --- CARGA DE DATOS ---
  const cargarDatos = useCallback(() => {
    // 1. Productos
    fetch('/api/productos').then(res => res.json()).then(setProductos);
    // 2. Finanzas del día (Ventas - Gastos)
    fetch('/api/ventas/hoy').then(res => res.json()).then(setFinanzas);
    // 3. Gastos del día
    fetch('/api/gastos/hoy').then(res => res.json()).then(setGastos);
  }, []);

  useEffect(() => {
    if (vista === 'dashboard') {
        cargarDatos();
        // Auto-refresh cada 10 segundos para ver ventas en tiempo real
        const interval = setInterval(cargarDatos, 10000);
        return () => clearInterval(interval);
    }
  }, [vista, cargarDatos]);

  // --- 1. DESCARGAR EXCEL (DÍA ACTUAL) ---
  const handleDescargarExcel = async () => {
    setCargandoExcel(true);
    // Usamos toast.promise para feedback visual
    const promise = fetch('/api/ventas/excel/actual', { 
        headers: { 'Authorization': `Bearer ${getToken()}` } 
    });
    
    toast.promise(promise, {
        loading: 'Generando reporte...',
        success: 'Descarga iniciada',
        error: 'Error al descargar'
    });

    try {
        const response = await promise;
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `Cierre_Parcial_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`; 
            document.body.appendChild(a); 
            a.click(); 
            a.remove();
        }
    } catch (error) { console.error(error); } 
    finally { setCargandoExcel(false); }
  };

  // --- 2. GESTIÓN DE GASTOS (NUEVO) ---
  const handleRegistrarGasto = async (e) => {
      e.preventDefault();
      if (!nuevoGasto.descripcion || !nuevoGasto.monto) {
          return toast.error("Completa descripción y monto");
      }
      
      const promise = fetch('/api/gastos', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
          body: JSON.stringify(nuevoGasto) 
      });

      toast.promise(promise, { loading: 'Guardando...', success: 'Gasto registrado', error: 'Error' })
        .then(() => {
            setNuevoGasto({ descripcion: '', monto: '' }); 
            cargarDatos();
        });
  };

  const handleBorrarGasto = async (id) => { 
      const result = await swalBootstrap.fire({
          title: '¿Borrar Gasto?',
          text: "Se sumará de nuevo a la caja.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, borrar',
          confirmButtonColor: '#dc3545'
      });

      if(result.isConfirmed) {
          await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
          cargarDatos();
          toast.success("Gasto eliminado");
      }
  };

  // --- 3. CIERRE DE CAJA PROFESIONAL (ARQUEO) ---
  const handleCerrarCaja = async () => {
    // Paso A: Preguntar cuánto efectivo hay realmente
    const { value: inputEfectivo } = await swalBootstrap.fire({
        title: 'Arqueo de Caja',
        input: 'text',
        inputLabel: `El sistema calcula: $${finanzas.totalCaja.toLocaleString()}`,
        inputPlaceholder: 'Ingrese el efectivo real contado...',
        showCancelButton: true,
        confirmButtonText: 'Verificar y Cerrar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || isNaN(Number(value))) return 'Ingrese un número válido';
        }
    });

    if (!inputEfectivo) return;

    const efectivoReal = Number(inputEfectivo);

    // Paso B: Enviar al backend para guardar el historial y limpiar contadores
    toast.promise(
        fetch('/api/ventas/cerrar', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
            body: JSON.stringify({ efectivoReal }) 
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            return data;
        }),
        {
            loading: 'Cerrando turno...',
            success: (data) => {
                const rep = data.reporte;
                let mensaje = `Cuadre perfecto.`;
                let icono = 'success';
                
                if (rep.diferencia > 0) { mensaje = `¡Sobra dinero! (+$${rep.diferencia.toLocaleString()})`; icono = 'info'; }
                if (rep.diferencia < 0) { mensaje = `¡Falta dinero! ($${rep.diferencia.toLocaleString()})`; icono = 'warning'; }
                
                swalBootstrap.fire({ title: 'Turno Cerrado', text: mensaje, icon: icono });
                cargarDatos(); // Refresca todo a 0
                return 'Caja cerrada';
            },
            error: 'Error al cerrar caja'
        }
    );
  };

  // --- 4. GESTIÓN INVENTARIO ---
  const handleDelete = async (id) => { 
      const result = await swalBootstrap.fire({
          title: '¿Eliminar Plato?',
          text: "No podrás recuperarlo.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          confirmButtonColor: '#dc3545'
      });

      if(result.isConfirmed) {
          fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
          .then(() => { toast.success("Eliminado"); cargarDatos(); });
      }
  };
  
  const handleSave = (formData) => { 
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';
    
    fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
        body: JSON.stringify(formData) 
    }).then(() => { 
        setShowForm(false); 
        cargarDatos(); 
        toast.success(editingProduct ? "Actualizado" : "Creado");
    });
  };

  return (
    <div className="container py-5">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark"><i className="bi bi-shield-lock-fill me-2"></i>Administración</h2>
        <div className="d-flex gap-2">
            <button className={`btn ${vista === 'dashboard' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('dashboard')}>
                <i className="bi bi-speedometer2 me-2"></i>Control
            </button>
            <button className={`btn ${vista === 'reportes' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('reportes')}>
                <i className="bi bi-bar-chart-fill me-2"></i>Historial
            </button>
            <button className="btn btn-danger ms-2" onClick={handleLogout}><i className="bi bi-power"></i></button>
        </div>
      </div>

      {/* VISTA REPORTES (HISTORIAL) */}
      {vista === 'reportes' ? <Reportes /> : (
          <>
            {/* VISTA DASHBOARD (CAJA Y GASTOS) */}
            <div className="row mb-4">
                {/* CAJA PRINCIPAL */}
                <div className="col-md-7 mb-3">
                    <div className="card bg-dark text-white shadow h-100 border-0">
                        <div className="card-header border-secondary">
                            <span className="badge bg-warning text-dark"><i className="bi bi-cash-coin me-1"></i>Caja Actual</span>
                            <button className="btn btn-sm btn-outline-light float-end" onClick={handleDescargarExcel} disabled={cargandoExcel}>
                                <i className="bi bi-download me-1"></i> {cargandoExcel ? '...' : 'Excel Parcial'}
                            </button>
                        </div>
                        <div className="card-body p-4 d-flex flex-column justify-content-center">
                            <div className="d-flex justify-content-between mb-2 fs-5">
                                <span className="text-success"><i className="bi bi-arrow-up-circle me-2"></i>Ventas:</span>
                                <span className="fw-bold">${finanzas.totalVentas?.toLocaleString()}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-3 fs-5">
                                <span className="text-danger"><i className="bi bi-arrow-down-circle me-2"></i>Gastos:</span>
                                <span className="fw-bold">-${finanzas.totalGastos?.toLocaleString()}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-end">
                                <div>
                                    <h6 className="text-white-50 mb-0 text-uppercase small">Saldo Teórico</h6>
                                    <h1 className="display-4 fw-bold text-warning mb-0">${finanzas.totalCaja?.toLocaleString()}</h1>
                                </div>
                                <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold py-3 px-4 shadow rounded-pill">
                                    <i className="bi bi-lock-fill me-2"></i> CERRAR TURNO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* REGISTRO DE GASTOS */}
                <div className="col-md-5 mb-3">
                    <div className="card shadow h-100 border-danger">
                        <div className="card-header bg-danger text-white fw-bold">
                            <i className="bi bi-wallet2 me-2"></i> Registrar Salida / Gasto
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control" placeholder="Motivo (ej. Pollo, Gas)" 
                                    value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                                <input type="number" className="form-control" placeholder="$" style={{width:'100px'}} 
                                    value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                                <button type="submit" className="btn btn-outline-danger"><i className="bi bi-plus-lg"></i></button>
                            </form>
                            <div className="overflow-auto" style={{maxHeight: '180px'}}>
                                {gastos.length === 0 ? (
                                    <p className="text-center text-muted small mt-4">No hay gastos registrados hoy.</p>
                                ) : (
                                    <ul className="list-group list-group-flush small">
                                        {gastos.map(g => (
                                            <li key={g._id} className="list-group-item d-flex justify-content-between align-items-center px-2">
                                                <span>{g.descripcion}</span>
                                                <div>
                                                    <span className="badge bg-light text-danger border me-2">-${g.monto.toLocaleString()}</span>
                                                    <button className="btn btn-link text-muted p-0" onClick={() => handleBorrarGasto(g._id)}>
                                                        <i className="bi bi-x-circle-fill"></i>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GESTIÓN DE MENÚ */}
            <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
                <h4 className="fw-bold text-secondary"><i className="bi bi-journal-bookmark-fill me-2"></i>Inventario de Platos</h4>
                <button className="btn btn-success fw-bold rounded-pill px-4" onClick={() => { setEditingProduct(null); setShowForm(true); }}>
                    <i className="bi bi-plus-lg me-2"></i>Nuevo Plato
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="p-3 ps-4">Foto</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Precio Base</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map((prod) => (
                                <tr key={prod.id}>
                                    <td className="p-3 ps-4">
                                        <div className="rounded border bg-light d-flex align-items-center justify-content-center" style={{width:'45px', height:'45px', overflow:'hidden'}}>
                                            <img src={prod.imagen || "/logo.png"} alt="img" style={{width:'100%', height:'100%', objectFit:'cover'}} 
                                                 onError={(e) => e.target.src = "https://via.placeholder.com/50?text=..."} />
                                        </div>
                                    </td>
                                    <td className="fw-bold text-dark">{prod.nombre}</td>
                                    <td><span className="badge bg-secondary opacity-75 rounded-pill fw-normal">{prod.categoria}</span></td>
                                    <td className="fw-bold text-success">${prod.precios ? (Object.values(prod.precios).find(p => p > 0) || 0).toLocaleString() : '0'}</td>
                                    <td className="text-end pe-4">
                                        <button className="btn btn-sm btn-outline-primary me-2 rounded-circle" onClick={() => { setEditingProduct(prod); setShowForm(true); }}><i className="bi bi-pencil-fill"></i></button>
                                        <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => handleDelete(prod.id)}><i className="bi bi-trash-fill"></i></button>
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