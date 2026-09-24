import { useMemo, useState } from 'react';
import { CATEGORIAS, PLACEHOLDER_IMG, TAMANO_CORTO, TAMANO_LABEL } from '../config';
import { money, precioDesde, preciosActivos } from '../utils/format';

const normalize = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const onImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; };

/**
 * Buscador + categorías + listado de productos.
 * variant="public": tarjetas grandes, al tocar abre el detalle (onSelect).
 * variant="pos": cuadrícula compacta, cada tamaño es un botón que agrega directo (onAdd).
 */
export default function MenuBrowser({ productos, loading, variant = 'public', onSelect, onAdd, stickyTop }) {
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const categorias = useMemo(() => {
    const extra = [...new Set(productos.map(p => p.categoria))].filter(c => !CATEGORIAS.includes(c));
    return ['Todos', ...CATEGORIAS.filter(c => productos.some(p => p.categoria === c)), ...extra];
  }, [productos]);

  const visibles = useMemo(() => {
    const q = normalize(busqueda.trim());
    const orden = (c) => { const i = CATEGORIAS.indexOf(c); return i === -1 ? 999 : i; };
    return productos
      .filter(p => (filtro === 'Todos' || p.categoria === filtro))
      .filter(p => !q || normalize(`${p.nombre} ${p.descripcion} ${p.categoria}`).includes(q))
      .sort((a, b) => orden(a.categoria) - orden(b.categoria) || a.id - b.id);
  }, [productos, filtro, busqueda]);

  const isPos = variant === 'pos';

  return (
    <div>
      <div className="filter-container" style={stickyTop !== undefined ? { top: stickyTop } : undefined}>
        <div className={isPos ? 'px-0' : 'container'}>
          <div className="search-wrap mb-2">
            <i className="bi bi-search"></i>
            <input
              type="search" className="form-control search-input" placeholder="Buscar plato o bebida…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar producto"
            />
          </div>
          <div className="filter-scroll">
            {categorias.map(cat => (
              <button key={cat} className={`filter-btn ${filtro === cat ? 'active' : ''}`} onClick={() => setFiltro(cat)}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && productos.length === 0 && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border text-danger mb-3" role="status"></div>
          <div>Cargando menú… <br /><small>(si el servidor estaba en reposo puede tardar unos segundos)</small></div>
        </div>
      )}

      {!loading && visibles.length === 0 && (
        <div className="text-center text-muted py-5"><i className="bi bi-emoji-frown fs-1 d-block mb-2"></i>No hay productos que coincidan.</div>
      )}

      {isPos ? (
        <div className="pos-grid mt-3">
          {visibles.map(p => {
            const agotado = p.disponible === false;
            return (
              <div key={p.id} className={`pos-tile ${agotado ? 'agotado' : ''}`}>
                <div className="pos-tile-img">
                  <img src={p.imagen || PLACEHOLDER_IMG} alt="" loading="lazy" decoding="async" onError={onImgError} />
                  {agotado && <span className="badge bg-dark badge-agotado">AGOTADO</span>}
                </div>
                <div className="pos-tile-name">{p.nombre}</div>
                <div className="pos-sizes">
                  {preciosActivos(p).map(([size, price]) => (
                    <button
                      key={size} className="pos-size-btn" disabled={agotado}
                      onClick={() => onAdd(p, size, price)} title={`Agregar ${TAMANO_LABEL[size]}`}
                    >
                      {TAMANO_CORTO[size] || 'Agregar'}
                      <small>{money(price)}</small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="container py-3">
          <div className="row g-3">
            {visibles.map(p => {
              const agotado = p.disponible === false;
              const varios = preciosActivos(p).length > 1;
              return (
                <div key={p.id} className="col-12 col-md-6 col-xl-4">
                  <div
                    className={`product-card h-100 p-2 d-flex align-items-center gap-3 ${agotado ? 'agotado' : ''}`}
                    onClick={() => !agotado && onSelect(p)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' && !agotado) onSelect(p); }}
                  >
                    <div className="product-thumb">
                      <img src={p.imagen || PLACEHOLDER_IMG} alt={p.nombre} loading="lazy" decoding="async" width="108" height="108" onError={onImgError} />
                    </div>
                    <div className="flex-grow-1 min-w-0 pe-1">
                      <div className="fw-bold lh-sm mb-1">{p.nombre}</div>
                      <small className="text-muted line-clamp-2 mb-2">{p.descripcion}</small>
                      <div className="d-flex justify-content-between align-items-end">
                        <span className="fw-bold text-primary-brand">
                          {varios && <small className="text-muted fw-normal me-1">desde</small>}{money(precioDesde(p))}
                        </span>
                        {agotado
                          ? <span className="badge bg-secondary">Agotado</span>
                          : <span className="btn btn-sm btn-add"><i className="bi bi-plus-lg me-1"></i>Agregar</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
