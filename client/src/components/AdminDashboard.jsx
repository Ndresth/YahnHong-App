import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // IMPORTAR
import { swalBootstrap } from '../utils/swalConfig'; // IMPORTAR
import ProductForm from './ProductForm';
import Reportes from './Reportes';

/**
 * Panel de Control Administrativo.
 */
export default function AdminDashboard() {
  // ... (estados y hooks iguales) ...
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

  // ASYNC para SweetAlert
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

  // --- REPORTES EXCEL ---
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
            const a = document.createElement('a'); a.href = url; a.download = `Cierre_Parcial.xlsx`; document.body.appendChild(a); a.click(); a.remove();
        }
    } catch (error) { console.error(error); } 
    finally { setCargandoExcel(false); }
  };

  // --- GESTIÓN FINANCIERA ---
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

  // ASYNC para SweetAlert de borrado
  const handleBorrarGasto = async (id) => { 
      const result = await swalBootstrap.fire({
          title: '¿Eliminar Gasto?',
          text: "Esta acción no se puede deshacer.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          confirmButtonColor: '#dc3545' // Rojo
      });

      if(result.isConfirmed) {
          await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
          toast.success("Registro eliminado.");
          cargarDatos();
      }
  };

  // EL CAMBIO MÁS GRANDE: Reemplazo de PROMPT por Modal con Input
  const handleCerrarCaja = async () => {
    // 1. Modal con Input para el efectivo
    const { value: inputEfectivo } = await swalBootstrap.fire({
        title: 'Arqueo de Caja',
        input: 'text',
        inputLabel: 'Ingrese el efectivo físico total contado en caja:',
        inputPlaceholder: 'Ej: 150000',
        showCancelButton: true,
        confirmButtonText: 'Verificar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || isNaN(Number(value))) {
              return '¡Debe ingresar un valor numérico válido!';
            }
        }
    });

    if (!inputEfectivo) return; // Si canceló

    const efectivoReal = Number(inputEfectivo);

    // 2. Modal de confirmación con resumen
    const msgHtml = `
        <div class="text-start bg-light p-3 rounded">
            <p class="mb-1 text-success"><i class="bi bi-plus-lg me-2"></i>Ventas: <b>$${finanzas.totalVentas.toLocaleString()}</b></p>
            <p class="mb-1 text-danger"><i class="bi bi-dash-lg me-2"></i>Gastos: <b>$${finanzas.totalGastos.toLocaleString()}</b></p>
            <hr class="my-2"/>
            <p class="mb-3 fs-5">Saldo Teórico: <b>$${finanzas.totalCaja.toLocaleString()}</b></p>
            <p class="mb-0 fs-5 text-primary">Efectivo Declarado: <b>$${efectivoReal.toLocaleString()}</b></p>
        </div>
    `;

    const confirmResult = await swalBootstrap.fire({
        title: '¿Confirmar Cierre?',
        html: msgHtml,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Cerrar Turno',
        cancelButtonText: 'Volver'
    });

    if (!confirmResult.isConfirmed) return;

    // 3. Proceso de cierre
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
                let icono = '✅';
                let estado = "Balance Correcto";
                if (rep.diferencia > 0) { icono = '🤑'; estado = `Excedente: $${rep.diferencia.toLocaleString()}`; }
                if (rep.diferencia < 0) { icono = '⚠️'; estado = `Faltante: $${Math.abs(rep.diferencia).toLocaleString()}`; }
                
                // Modal final con el resultado
                swalBootstrap.fire({
                    title: '¡Turno Cerrado!',
                    html: `<h3 class="mt-3">${icono}</h3><p class="fs-4">${estado}</p>`,
                    icon: rep.diferencia === 0 ? 'success' : 'warning'
                });
                cargarDatos();
                return 'Cierre completado';
            },
            error: (err) => `Error: ${err.message}`
        }
    );
  };

  // --- GESTIÓN INVENTARIO ---
  const handleDelete = async (id) => { 
      if(!isAdmin) return;
      
      const result = await swalBootstrap.fire({
          title: '¿Eliminar Producto?',
          text: "Se borrará permanentemente del inventario.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          confirmButtonColor: '#dc3545'
      });

      if(result.isConfirmed) {
          fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
          .then(() => {
              toast.success("Producto eliminado.");
              cargarDatos();
          });
      }
  };
  
  // ... (handleSave y el return del componente son visualmente iguales a la versión anterior)
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
        { loading: 'Guardando...', success: 'Producto guardado', error: 'Error al guardar' }
    ).then(() => { setShowForm(false); cargarDatos(); });
  };

  return (
    // ... (Todo el JSX del return es idéntico al paso anterior, cópialo de allá)
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">
            <i className="bi bi-speedometer2 me-2"></i>
            {isAdmin ? 'Panel Administrativo' : 'Control de Caja'}
        </h2>
        
        <div className="d-flex gap-2">
            <button className={`btn ${vista === 'dashboard' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('dashboard')}>
                <i className="bi bi-grid-1x2-fill me-2"></i>Control
            </button>
            
            {isAdmin && (
                <>
                    <button className={`btn ${vista === 'reportes' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('reportes')}>
                        <i className="bi bi-bar-chart-fill me-2"></i>Reportes
                    </button>
                    <button className="btn btn-success" onClick={handleDescargarExcel} disabled={cargandoExcel}>
                        {cargandoExcel ? '...' : <><i className="bi bi-file-earmark-excel-fill me-2"></i>Excel</>}
                    </button>
                </>
            )}

            <button className="btn btn-danger ms-2" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>Salir
            </button>
        </div>
      </div>

      {vista === 'reportes' && isAdmin ? <Reportes /> : (
          <>
            <div className="row mb-4">
                <div className="col-md-7 mb-3">
                    <div className="card bg-dark text-white shadow h-100 border-0">
                        <div className="card-body p-4 d-flex flex-column justify-content-center">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-success fw-bold"><i className="bi bi-arrow-up-circle me-2"></i>Ingresos:</span>
                                <span className="text-success fw-bold">${finanzas.totalVentas?.toLocaleString()}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-2">
                                <span className="text-danger fw-bold"><i className="bi bi-arrow-down-circle me-2"></i>Egresos:</span>
                                <span className="text-danger fw-bold">${finanzas.totalGastos?.toLocaleString()}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-end">
                                <div>
                                    <h5 className="text-white-50 mb-0">Saldo Teórico:</h5>
                                    <h1 className="display-4 fw-bold text-warning mb-0">${finanzas.totalCaja?.toLocaleString()}</h1>
                                </div>
                                <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold py-2 px-4 shadow">
                                    <i className="bi bi-lock-fill me-2"></i> ARQUEO DE CAJA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-5 mb-3">
                    <div className="card shadow h-100 border-danger">
                        <div className="card-header bg-danger text-white fw-bold">
                            <i className="bi bi-wallet2 me-2"></i> Registrar Salida de Efectivo
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control" placeholder="Concepto (ej. Proveedor)" 
                                    value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                                <input type="number" className="form-control" placeholder="$" style={{width:'100px'}} 
                                    value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                                <button type="submit" className="btn btn-outline-danger"><i className="bi bi-plus-lg"></i></button>
                            </form>
                            <div className="overflow-auto" style={{maxHeight: '150px'}}>
                                <ul className="list-group list-group-flush small">
                                    {gastos.map(g => (
                                        <li key={g._id} className="list-group-item d-flex justify-content-between px-0 py-1">
                                            <span>{g.descripcion}</span>
                                            <span>
                                                <span className="badge bg-light text-danger border me-2">-${g.monto.toLocaleString()}</span>
                                                <i className="bi bi-trash text-muted" style={{cursor:'pointer'}} onClick={() => handleBorrarGasto(g._id)} title="Eliminar registro"></i>
                                            </span>
                                        </li>
                                    ))}
                                    {gastos.length === 0 && <li className="text-center text-muted fst-italic">Sin movimientos registrados</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
                        <h4 className="fw-bold"><i className="bi bi-list-check me-2"></i>Inventario</h4>
                        <button className="btn btn-success fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}>
                            <i className="bi bi-plus-circle me-2"></i>Nuevo Producto
                        </button>
                    </div>

                    <div className="card shadow-sm border-0">
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="p-3">Item</th>
                                            <th>Nombre</th>
                                            <th>Categoría</th>
                                            <th>Precio Base</th>
                                            <th className="text-end p-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productos.map((prod) => (
                                        <tr key={prod.id}>
                                            <td className="p-3"><img src={prod.imagen || "https://via.placeholder.com/50"} alt="img" className="rounded border" style={{width: '40px', height:'40px', objectFit:'cover'}} /></td>
                                            <td className="fw-bold">{prod.nombre}</td>
                                            <td><span className="badge bg-secondary">{prod.categoria}</span></td>
                                            <td>${prod.precios ? Object.values(prod.precios).find(p => p > 0)?.toLocaleString() : '0'}</td>
                                            <td className="text-end p-3">
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}><i className="bi bi-trash"></i></button>
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
          </>
      )}
    </div>
  );
}