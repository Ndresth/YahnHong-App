import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, downloadFile } from '../../utils/api';
import { fechaArchivo, money } from '../../utils/format';
import { printCierre } from '../../utils/printReceipt';
import { COLOR_METODO } from '../../config';
import { PENDIENTE_KEY } from '../../utils/cierre';


const PASOS = ['Resumen', 'Efectivo', 'Confirmar', 'Excel'];

const Diferencia = ({ valor, grande }) => {
  const cls = valor === 0 ? 'text-success' : valor > 0 ? 'text-primary' : 'text-danger';
  const icon = valor === 0 ? 'bi-check-circle-fill' : valor > 0 ? 'bi-arrow-up-circle-fill' : 'bi-exclamation-triangle-fill';
  const txt = valor === 0 ? 'Cuadra' : valor > 0 ? 'Sobrante' : 'Faltante';
  return (
    <div className={`d-flex justify-content-between align-items-center ${cls} ${grande ? 'fs-4 fw-bold' : 'fw-semibold'}`}>
      <span><i className={`bi ${icon} me-2`}></i>{txt}</span><span>{money(Math.abs(valor))}</span>
    </div>
  );
};


/**
 * Asistente de arqueo y cierre de turno.
 * El último paso obliga a descargar el Excel del cierre: el modal no se puede cerrar
 * hasta que la descarga termine. Si se recarga la página a mitad, se retoma aquí.
 */
export default function CierreCajaModal({ finanzas, pendiente, onClose, onClosed }) {
  const [paso, setPaso] = useState(pendiente ? 3 : 0);
  const [manual, setManual] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reporte, setReporte] = useState(pendiente || null);
  const [descargado, setDescargado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const autoIntento = useRef(false);

  const contado = Number(manual) || 0;
  const diferencia = contado - finanzas.totalCaja;
  const metodos = Object.entries(finanzas.ventasPorMetodo || {});

  const descargarExcel = async (cierre = reporte) => {
    if (!cierre) return;
    setDescargando(true);
    try {
      await downloadFile(`/api/ventas/excel/${cierre._id}`, `Cierre_${fechaArchivo(cierre.fechaFin)}.xlsx`);
      setDescargado(true);
      localStorage.removeItem(PENDIENTE_KEY);
      toast.success('Excel del cierre descargado');
    } catch (e) {
      toast.error(`No se pudo descargar: ${e.message}. Intente de nuevo.`);
    } finally {
      setDescargando(false);
    }
  };

  // Al llegar al paso Excel se intenta la descarga automáticamente una vez
  useEffect(() => {
    if (paso === 3 && reporte && !descargado && !autoIntento.current) {
      autoIntento.current = true;
      descargarExcel(reporte);
    }
  }, [paso, reporte]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrarTurno = async () => {
    setEnviando(true);
    try {
      const { reporte: r } = await api('/api/ventas/cerrar', { method: 'POST', body: { efectivoReal: contado } });
      const plano = { ...r, ventasPorMetodo: r.ventasPorMetodo || {} };
      localStorage.setItem(PENDIENTE_KEY, JSON.stringify(plano));
      setReporte(plano);
      setPaso(3);
      onClosed?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const bloqueado = paso === 3; // Ya se cerró: no se puede salir sin el Excel

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} role="dialog" aria-modal="true" aria-labelledby="cierre-title">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: 560 }}>
          <div className="modal-content border-0 rounded-4 overflow-hidden">
            <div className="modal-header bg-dark text-white border-0">
              <h5 className="modal-title fw-bold" id="cierre-title"><i className="bi bi-safe2 me-2"></i>Arqueo y cierre de turno</h5>
              {!bloqueado && <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>}
            </div>

            <ol className="cierre-steps">
              {PASOS.map((p, i) => (
                <li key={p} className={i < paso ? 'done' : i === paso ? 'active' : ''}>
                  <span>{i < paso ? <i className="bi bi-check-lg"></i> : i + 1}</span>{p}
                </li>
              ))}
            </ol>

            <div className="modal-body pt-2">
              {paso === 0 && (
                <>
                  {finanzas.pendientes > 0 && (
                    <div className="alert alert-warning d-flex gap-2 small">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <div><b>{finanzas.pendientes} orden(es) siguen en cocina.</b> Si cierra ahora quedarán incluidas en este cierre.</div>
                    </div>
                  )}
                  <div className="cierre-resumen">
                    {metodos.length === 0 && <div className="text-muted small">Sin ventas en este turno.</div>}
                    {metodos.map(([m, v]) => (
                      <div key={m} className="d-flex justify-content-between">
                        <span><span className="dot" style={{ background: COLOR_METODO[m] || '#888' }}></span>{m}</span><b>{money(v)}</b>
                      </div>
                    ))}
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between"><span>Total ventas ({finanzas.cantidadPedidos} pedidos)</span><b>{money(finanzas.totalVentas)}</b></div>
                    <div className="d-flex justify-content-between text-danger"><span>Gastos en efectivo</span><b>-{money(finanzas.totalGastos)}</b></div>
                    <div className="d-flex justify-content-between fs-5 mt-2 pt-2 border-top"><span className="fw-semibold">Efectivo esperado</span><b>{money(finanzas.totalCaja)}</b></div>
                  </div>
                </>
              )}

              {paso === 1 && (
                <>
                  <label className="form-label fw-semibold" htmlFor="efectivo-contado">Efectivo total en la caja</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text">$</span>
                    <input id="efectivo-contado" type="number" inputMode="numeric" min="0" autoFocus className="form-control fs-3 text-end"
                      value={manual} onChange={e => setManual(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && manual !== '') setPaso(2); }} />
                  </div>
                  <div className="cierre-total mt-3">
                    <div className="d-flex justify-content-between"><span>Contado</span><b className="fs-4">{money(contado)}</b></div>
                    <div className="d-flex justify-content-between text-muted small"><span>Esperado</span><span>{money(finanzas.totalCaja)}</span></div>
                    <div className="mt-1"><Diferencia valor={diferencia} /></div>
                  </div>
                </>
              )}

              {paso === 2 && (
                <div className="cierre-resumen">
                  <div className="d-flex justify-content-between"><span>Total ventas</span><b>{money(finanzas.totalVentas)}</b></div>
                  <div className="d-flex justify-content-between"><span>Efectivo esperado</span><b>{money(finanzas.totalCaja)}</b></div>
                  <div className="d-flex justify-content-between"><span>Efectivo contado</span><b>{money(contado)}</b></div>
                  <hr className="my-2" />
                  <Diferencia valor={diferencia} grande />
                  <div className="alert alert-light border small mt-3 mb-0">
                    <i className="bi bi-info-circle me-1"></i>Al confirmar se cierra el turno, los contadores vuelven a cero y se <b>descargará el Excel obligatorio</b> del día.
                  </div>
                </div>
              )}

              {paso === 3 && reporte && (
                <div className="text-center py-2">
                  <div className={`cierre-icon ${descargado ? 'ok' : ''}`}>
                    <i className={`bi ${descargado ? 'bi-check-lg' : 'bi-file-earmark-excel'}`}></i>
                  </div>
                  <h5 className="fw-bold mt-3 mb-1">{descargado ? '¡Turno cerrado y respaldado!' : 'Turno cerrado — falta el Excel'}</h5>
                  <p className="text-muted small mb-3">
                    {descargado
                      ? 'Guarde el archivo en su carpeta de cierres.'
                      : 'Debe descargar el Excel del cierre para terminar. Si la descarga no empezó sola, use el botón.'}
                  </p>
                  <div className="cierre-resumen text-start mb-3">
                    <div className="d-flex justify-content-between"><span>Ventas</span><b>{money(reporte.totalVentasSistema)}</b></div>
                    <div className="d-flex justify-content-between"><span>Contado / esperado</span><b>{money(reporte.totalEfectivoReal)} / {money(reporte.totalCajaTeorico)}</b></div>
                    <Diferencia valor={reporte.diferencia} />
                  </div>
                  <button className={`btn ${descargado ? 'btn-outline-success' : 'btn-success'} btn-lg w-100 fw-bold`} onClick={() => descargarExcel()} disabled={descargando}>
                    {descargando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-download me-2"></i>}
                    {descargado ? 'Descargar otra copia' : `Descargar Cierre_${fechaArchivo(reporte.fechaFin)}.xlsx`}
                  </button>
                  <button className="btn btn-outline-dark w-100 mt-2" onClick={() => printCierre(reporte)}>
                    <i className="bi bi-printer me-2"></i>Imprimir resumen del cierre
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer bg-light border-0">
              {paso > 0 && paso < 3 && (
                <button className="btn btn-outline-secondary me-auto" onClick={() => setPaso(p => p - 1)} disabled={enviando}>
                  <i className="bi bi-arrow-left me-1"></i>Atrás
                </button>
              )}
              {paso === 0 && <button className="btn btn-dark fw-bold px-4" onClick={() => setPaso(1)}>Ingresar efectivo <i className="bi bi-arrow-right ms-1"></i></button>}
              {paso === 1 && <button className="btn btn-dark fw-bold px-4" onClick={() => setPaso(2)} disabled={manual === '' || Number(manual) < 0}>Revisar <i className="bi bi-arrow-right ms-1"></i></button>}
              {paso === 2 && (
                <button className="btn btn-warning fw-bold px-4" onClick={cerrarTurno} disabled={enviando}>
                  {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-lock-fill me-2"></i>}Cerrar turno
                </button>
              )}
              {paso === 3 && (
                <button className="btn btn-dark fw-bold px-4 w-100" onClick={onClose} disabled={!descargado}
                  title={descargado ? '' : 'Primero descargue el Excel'}>
                  {descargado ? 'Finalizar' : <><i className="bi bi-lock me-1"></i>Descargue el Excel para finalizar</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
