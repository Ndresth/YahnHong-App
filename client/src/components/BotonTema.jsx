import { useTema } from '../hooks/useTema';

/** Botón sol/luna para cambiar entre modo claro y oscuro. */
export default function BotonTema({ className = 'btn btn-sm btn-outline-light' }) {
  const { oscuro, alternar } = useTema();
  const texto = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  return (
    <button type="button" className={className} onClick={alternar} title={texto} aria-label={texto}>
      <i className={`bi ${oscuro ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
    </button>
  );
}
