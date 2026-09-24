import { Component } from 'react';

const RECARGA_KEY = 'recargaPorChunk';

/** Errores de "archivo JS viejo" tras un deploy: se arreglan recargando la página. */
const esErrorDeCarga = (e) => /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(e?.message || '');

/**
 * Evita la pantalla en blanco: si un módulo no carga (pestaña abierta antes de un deploy)
 * recarga una vez; si es otro error, muestra el mensaje y un botón para reintentar.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error);
    if (esErrorDeCarga(error)) {
      let yaRecargo = false;
      try { yaRecargo = sessionStorage.getItem(RECARGA_KEY) === '1'; sessionStorage.setItem(RECARGA_KEY, '1'); } catch { /* sin storage */ }
      if (!yaRecargo) window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card-soft p-4 text-center my-3">
        <i className="bi bi-exclamation-triangle fs-1 text-warning d-block mb-2"></i>
        <h6 className="fw-bold">No se pudo mostrar esta sección</h6>
        <p className="text-muted small mb-3">{this.state.error.message}</p>
        <button className="btn btn-outline-danger btn-sm" onClick={() => window.location.reload()}>
          <i className="bi bi-arrow-clockwise me-1"></i>Recargar
        </button>
      </div>
    );
  }
}
