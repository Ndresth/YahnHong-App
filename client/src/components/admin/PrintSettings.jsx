import { useState } from 'react';
import toast from 'react-hot-toast';
import { getPrintSettings, medidasImpresion, printOrder, setPrintSettings } from '../../utils/printReceipt';

const PRUEBA = {
  numero: 0, fecha: new Date(), tipo: 'Mesa', numeroMesa: '5', usuario: 'Prueba',
  cliente: { nombre: 'Mesa 5', metodoPago: 'Efectivo' },
  items: [
    { cantidad: 2, nombre: 'Arroz Especial', tamaño: 'mediano', precio: 26000, nota: 'Sin cebolla' },
    { cantidad: 1, nombre: 'Coca-Cola 400ml', tamaño: 'unico', precio: 4000, nota: '' }
  ],
  total: 56000
};

/** Configuración de impresión (se guarda en ESTE equipo). */
export default function PrintSettings() {
  const [s, setS] = useState(getPrintSettings);
  const update = (patch) => { setS(setPrintSettings(patch)); toast.success('Guardado en este equipo', { id: 'print-cfg' }); };
  const { area, margen } = medidasImpresion(s);
  const ajustar = (campo, valor, min, max) => update({ [campo]: Math.min(max, Math.max(min, valor)) });

  return (
    <div className="card-soft p-3 p-md-4" style={{ maxWidth: 640 }}>
      <h6 className="fw-bold"><i className="bi bi-printer me-2"></i>Impresora de este equipo</h6>
      <p className="small text-muted">Esta configuración se guarda en el navegador de cada equipo (caja, cocina, tablet).</p>

      <label className="form-label fw-semibold small">Ancho del papel</label>
      <div className="segmented mb-3" style={{ maxWidth: 320 }}>
        {[58, 80].map(a => (
          <button key={a} className={Number(s.ancho) === a ? 'active' : ''} onClick={() => update({ ancho: a, areaMm: null, margenMm: null })}>{a} mm</button>
        ))}
      </div>

      <label className="form-label fw-semibold small mb-1">Si el ticket sale cortado a la derecha</label>
      <p className="small text-muted mb-2">Baje el <b>ancho útil</b> o el <b>margen izquierdo</b> de a 1 mm y use “Probar factura” hasta que se vea completo.</p>
      <div className="d-flex flex-wrap gap-3 mb-3">
        {[['areaMm', 'Ancho útil', area, 30, Number(s.ancho) - 2], ['margenMm', 'Margen izquierdo', margen, 0, 12]].map(([campo, etiqueta, valor, min, max]) => (
          <div key={campo}>
            <div className="small fw-semibold mb-1">{etiqueta}</div>
            <div className="input-group input-group-sm" style={{ width: 150 }}>
              <button className="btn btn-outline-secondary" onClick={() => ajustar(campo, valor - 1, min, max)} disabled={valor <= min} aria-label={`Menos ${etiqueta}`}>−</button>
              <span className="form-control text-center fw-bold">{valor} mm</span>
              <button className="btn btn-outline-secondary" onClick={() => ajustar(campo, valor + 1, min, max)} disabled={valor >= max} aria-label={`Más ${etiqueta}`}>+</button>
            </div>
          </div>
        ))}
        {(s.areaMm != null || s.margenMm != null) && (
          <button className="btn btn-sm btn-link align-self-end text-decoration-none" onClick={() => update({ areaMm: null, margenMm: null })}>Restablecer</button>
        )}
      </div>

      <label className="form-label fw-semibold small" htmlFor="copias">Copias de comanda</label>
      <select id="copias" className="form-select mb-3" style={{ maxWidth: 160 }} value={s.copiasCocina} onChange={e => update({ copiasCocina: Number(e.target.value) })}>
        {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <div className="form-check form-switch mb-2">
        <input className="form-check-input" type="checkbox" id="autoPos" checked={s.autoComandaPos} onChange={e => update({ autoComandaPos: e.target.checked })} />
        <label className="form-check-label" htmlFor="autoPos">Imprimir comanda al enviar desde el POS (valor por defecto)</label>
      </div>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" id="autoKds" checked={s.autoComandaCocina} onChange={e => update({ autoComandaCocina: e.target.checked })} />
        <label className="form-check-label" htmlFor="autoKds">Imprimir automáticamente cada orden nueva en la pantalla de Cocina</label>
      </div>

      <div className="d-flex gap-2 mb-4">
        <button className="btn btn-outline-dark" onClick={() => printOrder(PRUEBA, 'cliente')}><i className="bi bi-receipt me-1"></i>Probar factura</button>
        <button className="btn btn-outline-dark" onClick={() => printOrder(PRUEBA, 'cocina')}><i className="bi bi-printer me-1"></i>Probar comanda</button>
      </div>

      <div className="alert alert-light border small mb-0">
        <b>Si el ticket sale cortado, en blanco o con márgenes:</b>
        <ol className="mb-0 ps-3 mt-1">
          <li>En el cuadro de impresión elija la impresora térmica, <b>Márgenes: Ninguno</b>, <b>Escala: Personalizada 100</b> (no “Predeterminada” ni “Ajustar”) y desactive <b>Encabezados y pies de página</b>.</li>
          <li>En el driver de Windows, el tamaño de papel debe ser el del rollo (80 × 297 mm o 58 × 297 mm), no “Carta”.</li>
          <li>Para imprimir <b>sin el cuadro de diálogo</b> (ideal en cocina): cree un acceso directo de Chrome con <code>--kiosk-printing</code> y deje la térmica como impresora predeterminada.</li>
        </ol>
      </div>
    </div>
  );
}
