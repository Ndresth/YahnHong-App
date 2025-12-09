import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import { swalBootstrap } from '../utils/swalConfig'; 
import ProductForm from './ProductForm';
import Reportes from './Reportes';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [finanzas, setFinanzas] = useState({ totalVentas: 0, totalGastos: 0, totalCaja: 0, cantidadPedidos: 0 });
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [vista, setVista] = useState('dashboard'); 

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const isAdmin = userRole === 'admin'; 

  // --- LOGOUT ---
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

  const cargarDatos = useCallback(() => {
    if (isAdmin) fetch('/api/productos').then(res => res.json()).then(setProductos);
    fetch('/api/ventas/hoy').then(res => res.json()).then(setFinanzas);
    fetch('/api/gastos/hoy').then(res => res.json()).then(setGastos);
  }, [isAdmin]);

  useEffect(() => {
    if (vista === 'dashboard') {
        cargarDatos();
        const interval = setInterval(cargarDatos, 5000);
        return () => clearInterval(interval);
    }
  }, [vista, cargarDatos]);

  // --- EXCEL (Mantenemos el nombre YahnHong) ---
  const handleDescargarExcel = async () => {
    setCargandoExcel(true);
    const promise = fetch('/api/ventas/excel/actual', { headers: { 'Authorization': `Bearer ${getToken()}` } });
    
    toast.promise(promise, {
        loading: 'Generando Excel...',
        success: 'Reporte descargado',
        error: 'Error al descargar'
    });

    try {
        const response = await promise;
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Cierre_Parcial_YahnHong.xlsx`; document.body.appendChild(a); a.click(); a.remove();
        }
    } catch (error) { console.error(error); } 
    finally { setCargandoExcel(false); }
  };

  // --- GASTOS (Mejorado con Toast Promise) ---
  const handleRegistrarGasto = async (e) => {
      e.preventDefault();
      if (!nuevoGasto.descripcion || !nuevoGasto.monto) {
          toast.error("Complete descripción y monto.");
          return;
      }
      
      toast.promise(
          fetch('/api/gastos', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
              body: JSON.stringify(nuevoGasto) 
          }),
          { loading: 'Registrando...', success: 'Gasto registrado', error: 'Error al registrar' }
      ).then(() => {
          setNuevoGasto({ descripcion: '', monto: '' }); 
          cargarDatos();
      });
  };

  // --- BORRAR GASTO (Nueva funcionalidad agregada) ---
  const handleBorrarGasto = async (id) => { 
      const result = await swalBootstrap.fire({
          title: '¿Eliminar Gasto?',
          text: "Esta acción no se puede deshacer.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          confirmButtonColor: '#dc3545'
      });

      if(result.isConfirmed) {
          await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
          toast.success("Gasto eliminado.");
          cargarDatos();
      }
  };

  // --- CIERRE DE CAJA (Lógica completa nueva con el estilo viejo) ---
  const handleCerrarCaja = async () => {
    // 1. Modal con Input validado
    const { value: inputEfectivo } = await swalBootstrap.fire({
        title: 'Arqueo de Caja',
        input: 'text',
        inputLabel: 'Ingrese el efectivo físico total:',
        inputPlaceholder: 'Ej: 150000',
        showCancelButton: true,
        confirmButtonText: 'Verificar',
        inputValidator: (value) => {
            if (!value || isNaN(Number(value))) {
              return '¡Debe ingresar un valor numérico válido!';
            }
        }
    });

    if (!inputEfectivo) return;
    const efectivoReal = Number(inputEfectivo);

    // 2. Resumen HTML antes de enviar
    const msgHtml = `
        <div class="text-start bg-light p-3 rounded">
            <p class="mb-1 text-success">Ventas: <b>$${finanzas.totalVentas.toLocaleString()}</b></p>
            <p class="mb-1 text-danger">Gastos: <b>$${finanzas.totalGastos.toLocaleString()}</b></p>
            <hr class="my-2"/>
            <p class="mb-0 fs-5">Teórico: <b>$${finanzas.totalCaja.toLocaleString()}</b></p>
            <p class="mb-0 fs-5 text-primary">Real: <b>$${efectivoReal.toLocaleString()}</b></p>
        </div>
    `;

    const confirmResult = await swalBootstrap.fire({
        title: '¿Confirmar Cierre?',
        html: msgHtml,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Cerrar Turno'
    });

    if (!confirmResult.isConfirmed) return;

    // 3. Envío y cálculo de diferencia (Backend responde)
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
                const rep = data.reporte; // Asumiendo que el backend devuelve esto
                let icono = '✅';
                let estado = "Balance Correcto";
                if (rep && rep.diferencia > 0) { icono = '🤑'; estado = `Excedente: $${rep.diferencia.toLocaleString()}`; }
                if (rep && rep.diferencia < 0) { icono = '⚠️'; estado = `Faltante: $${Math.abs(rep.diferencia).toLocaleString()}`; }
                
                // Modal final con resultado visual
                swalBootstrap.fire({
                    title: '¡Turno Cerrado!',
                    html: `<h3 class="mt-3">${icono}</h3><p class="fs-4">${estado}</p>`,
                    icon: (rep && rep.diferencia === 0) ? 'success' : 'warning'
                });
                cargarDatos();
                return 'Cierre completado';
            },
            error: (err) => `Error: ${err.message}`
        }
    );
  };

  // --- INVENTARIO ---
  const handleDelete = async (id) => { 
      if(!isAdmin) return;
      const result = await swalBootstrap.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí' });
      if(result.isConfirmed) {
          fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
          .then(() => { toast.success("Eliminado"); cargarDatos(); });
      }
  };
  
  const handleSave = (formData) => { 
    if(!isAdmin) return;
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';
    
    toast.promise(
        fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
            body: JSON.stringify(formData) 
        }),
        { loading: 'Guardando...', success: 'Guardado correctamente', error: 'Error al guardar' }
    ).then(() => { setShowForm(false); cargarDatos(); });
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark"><i className="bi bi-speedometer2 me-2"></i>Panel Yahn Hong</h2>
        <div className="d-flex gap-2">
            <button className={`btn ${vista === 'dashboard' ? 'btn-warning' : 'btn-outline-dark'}`} onClick={() => setVista('dashboard')}>Control</button>
            {isAdmin && <button className={`btn ${vista === 'reportes' ? 'btn-warning' : 'btn-outline-dark'}`} onClick={() => setVista('reportes')}>Reportes</button>}
            {isAdmin && <button className="btn btn-success" onClick={handleDescargarExcel} disabled={cargandoExcel}><i className="bi bi-file-earmark-excel-fill"></i></button>}
            <button className="btn btn-danger" onClick={handleLogout}><i className="bi bi-power"></i></button>
        </div>
      </div>

      {vista === 'reportes' && isAdmin ? <Reportes /> : (
          <>
            <div className="row mb-4">
                <div className="col-md-7 mb-3">
                    <div className="card bg-dark text-white shadow h-100 border-0">
                        <div className="card-body p-4 text-center">
                            <h5 className="text-white-50">Saldo en Caja (Teórico)</h5>
                            <h1 className="display-4 fw-bold text-warning">${finanzas.totalCaja?.toLocaleString()}</h1>
                            <div className="d-flex justify-content-center gap-4 mt-3">
                                <span className="text-success"><i className="bi bi-arrow-up"></i> ${finanzas.totalVentas?.toLocaleString()}</span>
                                <span className="text-danger"><i className="bi bi-arrow-down"></i> ${finanzas.totalGastos?.toLocaleString()}</span>
                            </div>
                            <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold mt-3 px-4">ARQUEO DE CAJA</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-5 mb-3">
                    <div className="card shadow h-100 border-warning">
                        <div className="card-header bg-warning text-dark fw-bold">Registrar Gasto</div>
                        <div className="card-body">
                            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control" placeholder="Concepto" value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                                <input type="number" className="form-control" placeholder="$" style={{width:'100px'}} value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                                <button type="submit" className="btn btn-danger"><i className="bi bi-plus-lg"></i></button>
                            </form>
                            <div className="overflow-auto" style={{maxHeight: '150px'}}>
                                <ul className="list-group list-group-flush small">
                                    {gastos.map(g => (
                                        <li key={g._id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{g.descripcion}</span>
                                            <span>
                                                <span className="text-danger fw-bold me-2">-${g.monto.toLocaleString()}</span>
                                                {/* Agregué el botón de eliminar aquí manteniendo el estilo */}
                                                <i className="bi bi-trash text-muted" style={{cursor:'pointer'}} onClick={() => handleBorrarGasto(g._id)} title="Borrar gasto"></i>
                                            </span>
                                        </li>
                                    ))}
                                    {gastos.length === 0 && <li className="text-center text-muted fst-italic mt-2">No hay gastos hoy</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
                        <h4 className="fw-bold">Inventario</h4>
                        <button className="btn btn-warning fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}>+ Nuevo Plato</button>
                    </div>
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light"><tr><th>Foto</th><th>Nombre</th><th>Categoría</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {productos.map((prod) => (
                                    <tr key={prod.id}>
                                        <td><img src={prod.imagen || "https://via.placeholder.com/40"} alt="img" style={{width: '40px', height:'40px', objectFit:'cover', borderRadius:'5px'}} /></td>
                                        <td className="fw-bold">{prod.nombre}</td>
                                        <td><span className="badge bg-secondary">{prod.categoria}</span></td>
                                        <td>
                                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}><i className="bi bi-pencil"></i></button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {showForm && <ProductForm productToEdit={editingProduct} onClose={() => setShowForm(false)} onSave={handleSave} />}
                </>
            )}
          </>
      )}
    </div>
  );
}