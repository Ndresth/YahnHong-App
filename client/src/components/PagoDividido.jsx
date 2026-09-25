import { METODOS_PAGO } from '../config';
import { money } from '../utils/format';
import { partesCompletas } from '../utils/pagos';

const MAX_PARTES = 4;

/**
 * Editor de pago dividido: el cliente paga con varios métodos.
 * Se escriben los montos de todas las partes menos la última, que se calcula sola (lo que falta).
 */
export default function PagoDividido({ total, partes, onChange }) {
  const completas = partesCompletas(partes, total);
  const resto = completas[completas.length - 1].monto;
  const usados = new Set(partes.map(p => p.metodo));

  const set = (i, cambios) => onChange(partes.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  const agregar = () => {
    const libre = METODOS_PAGO.find(m => !usados.has(m.id));
    if (libre) onChange([...partes.slice(0, -1), { ...partes[partes.length - 1], monto: '' }, { metodo: libre.id, monto: '' }]);
  };
  const quitar = (i) => onChange(partes.filter((_, j) => j !== i));

  return (
    <div className="pago-dividido">
      {partes.map((p, i) => {
        const ultima = i === partes.length - 1;
        return (
          <div key={i} className="d-flex align-items-center gap-1 mb-1">
            <select className="form-select form-select-sm" style={{ maxWidth: 140 }} value={p.metodo} aria-label={`Método ${i + 1}`}
              onChange={e => set(i, { metodo: e.target.value })}>
              {METODOS_PAGO.map(m => <option key={m.id} value={m.id} disabled={m.id !== p.metodo && usados.has(m.id)}>{m.id}</option>)}
            </select>
            {ultima ? (
              <div className={`form-control form-control-sm fw-bold ${resto <= 0 ? 'text-danger' : ''}`} title="Se calcula solo: lo que falta para el total">
                {resto <= 0 ? `Sobra ${money(-resto)}` : money(resto)}
              </div>
            ) : (
              <input type="number" inputMode="numeric" min={1} step={100} className="form-control form-control-sm" placeholder="Monto"
                value={p.monto} onChange={e => set(i, { monto: e.target.value })} aria-label={`Monto ${p.metodo}`} />
            )}
            {partes.length > 2 && (
              <button type="button" className="btn btn-sm btn-link text-danger p-0 px-1" onClick={() => quitar(i)} aria-label="Quitar"><i className="bi bi-x-circle"></i></button>
            )}
          </div>
        );
      })}
      {partes.length < MAX_PARTES && (
        <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none" onClick={agregar}><i className="bi bi-plus-circle me-1"></i>Otro método</button>
      )}
    </div>
  );
}
