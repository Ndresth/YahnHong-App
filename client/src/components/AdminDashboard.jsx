import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import StaffNav from './StaffNav';
import CajaView from './admin/CajaView';
import OrdenesTurno from './admin/OrdenesTurno';
import Inventario from './admin/Inventario';
import PrintSettings from './admin/PrintSettings';
import Ajustes from './admin/Ajustes';
import ErrorBoundary from './ErrorBoundary';
import { useLiveEvents, useVisibleInterval } from '../hooks/useLiveEvents';
import { useProducts } from '../hooks/useProducts';
import { api, downloadFile, getSession } from '../utils/api';

const Reportes = lazy(() => import('./admin/Reportes')); // recharts sólo se descarga si se abre

const FINANZAS_VACIAS = { totalVentas: 0, totalGastos: 0, totalCaja: 0, ventasPorMetodo: {}, cantidadPedidos: 0, pendientes: 0, cancelados: 0, ticketPromedio: 0 };

/** Panel de Caja / Administración. */
export default function AdminDashboard() {
  const isAdmin = getSession()?.role === 'admin';
  const [vista, setVista] = useState('caja');
  const [finanzas, setFinanzas] = useState(FINANZAS_VACIAS);
  const [gastos, setGastos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const { productos, setProductos, reload: reloadProductos } = useProducts();

  const cargarDatos = useCallback(() => {
    api('/api/ventas/hoy').then(setFinanzas).catch(e => toast.error(e.message, { id: 'fin-err' }));
    api('/api/gastos/hoy').then(setGastos).catch(() => {});
    api('/api/orders/turno').then(setOrdenes).catch(() => {});
  }, []);

  // Agrupa ráfagas de eventos en una sola recarga
  const debounce = useRef();
  const recargarPronto = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(cargarDatos, 400);
  }, [cargarDatos]);

  useEffect(() => { cargarDatos(); return () => clearTimeout(debounce.current); }, [cargarDatos]);

  const live = useLiveEvents((type) => {
    if (type === 'conectado' || type.startsWith('orden:') || type.startsWith('caja:')) recargarPronto();
  });
  useVisibleInterval(cargarDatos, 60000);

  const handleExcel = () => toast.promise(
    downloadFile('/api/ventas/excel/actual', `Cierre_Parcial_${new Date().toISOString().slice(0, 10)}.xlsx`),
    { loading: 'Generando Excel…', success: 'Reporte descargado', error: 'Error al descargar' }
  );

  const tabs = [
    { id: 'caja', label: 'Caja', icon: 'bi-cash-stack' },
    { id: 'ordenes', label: `Órdenes${ordenes.length ? ` (${ordenes.length})` : ''}`, icon: 'bi-list-ul' },
    { id: 'inventario', label: isAdmin ? 'Inventario' : 'Agotados', icon: 'bi-box-seam' },
    ...(isAdmin ? [{ id: 'reportes', label: 'Reportes', icon: 'bi-bar-chart-fill' }] : []),
    { id: 'impresion', label: 'Impresora', icon: 'bi-printer' },
    { id: 'ajustes', label: 'Ajustes', icon: 'bi-gear' }
  ];

  return (
    <div>
      <StaffNav live={live} />
      <div className="container-xl py-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="segmented flex-grow-1" style={{ maxWidth: 820 }}>
            {tabs.map(t => (
              <button key={t.id} className={vista === t.id ? 'active' : ''} onClick={() => setVista(t.id)}>
                <i className={`bi ${t.icon} me-1`}></i><span className="d-none d-sm-inline">{t.label}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-outline-success btn-sm ms-auto" onClick={handleExcel}>
            <i className="bi bi-file-earmark-excel me-1"></i>Excel parcial
          </button>
        </div>

        {vista === 'caja' && <CajaView finanzas={finanzas} gastos={gastos} ordenes={ordenes} onChange={cargarDatos} />}
        {vista === 'ordenes' && <OrdenesTurno ordenes={ordenes} onChange={cargarDatos} />}
        {vista === 'inventario' && <Inventario productos={productos} setProductos={setProductos} reload={reloadProductos} isAdmin={isAdmin} />}
        {vista === 'reportes' && isAdmin && (
          <ErrorBoundary>
            <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-danger"></div></div>}><Reportes /></Suspense>
          </ErrorBoundary>
        )}
        {vista === 'impresion' && <PrintSettings />}
        {vista === 'ajustes' && <Ajustes isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
