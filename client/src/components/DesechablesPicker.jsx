import { money } from '../utils/format';
import { desechablesDisponibles } from '../utils/desechables';

/** Selector de cucharas y platos dentro del carrito (POS y web). */
export default function DesechablesPicker({ value, onChange, tieneBebida = false, compact = false }) {
  const set = (d, v) => onChange({ ...value, [d.key]: Math.max(0, Math.min(d.max, v)) });

  return (
    <div className={`desech-box ${compact ? 'compact' : ''}`}>
      <div className="desech-title"><i className="bi bi-bag-plus me-1"></i>Desechables</div>
      {desechablesDisponibles(tieneBebida).map(d => (
        <div key={d.key} className="desech-row">
          <div className="lh-sm">
            <span className="fw-semibold">{d.nombre}</span>
            <span className="small text-muted ms-1">{d.precio ? `${money(d.precio)} c/u` : 'gratis'} · máx {d.max}</span>
          </div>
          <div className="qty-control bg-white">
            <button type="button" onClick={() => set(d, value[d.key] - 1)} disabled={value[d.key] === 0} aria-label={`Menos ${d.nombre}`}>−</button>
            <span aria-live="polite">{value[d.key]}</span>
            <button type="button" onClick={() => set(d, value[d.key] + 1)} disabled={value[d.key] >= d.max} aria-label={`Más ${d.nombre}`}>+</button>
          </div>
        </div>
      ))}
    </div>
  );
}
