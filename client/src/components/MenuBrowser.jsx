import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIAS, PLACEHOLDER_IMG, TAMANO_CORTO, TAMANO_LABEL } from '../config';
import { money, precioDesde, preciosActivos } from '../utils/format';

const normalize = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const onImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; };

const escribiendo = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

/**
 * Buscador + categorías + listado de productos.
 * variant="public": tarjetas grandes; el botón + agrega directo si hay un solo precio, si no abre el detalle (onSelect).
 * variant="pos": cada tamaño es un botón que agrega directo (onAdd). Vista con fotos o lista compacta.
 * Teclado: "/" enfoca el buscador, Esc lo limpia y, en el POS, Enter agrega el único resultado.
 */
export default function MenuBrowser({ productos, loading, variant = 'public', onSelect, onAdd, onQuickAdd, enCarrito, compacto = false, onToggleCompacto, stickyTop, junto }) {
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const buscador = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !escribiendo(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        buscador.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const onBuscadorKey = (e) => {
    if (e.key === 'Escape') { setBusqueda(''); e.currentTarget.blur(); }
    if (e.key === 'Enter' && isPos && busqueda.trim()) {
      // Un único producto disponible con un solo precio: se agrega sin tocar la pantalla
      const disponibles = visibles.filter(p => p.disponible !== false);
      const precios = disponibles.length === 1 ? preciosActivos(disponibles[0]) : [];
      if (precios.length === 1) {
        onAdd(disponibles[0], precios[0][0], precios[0][1]);
        setBusqueda('');
      }
    }
  };

  const tocarAgregar = (e, p) => {
    e.stopPropagation();
    const precios = preciosActivos(p);
    if (precios.length === 1 && onQuickAdd) onQuickAdd(p, precios[0][0], precios[0][1]);
    else onSelect(p);
  };

  return (
    <div>
      <div className="filter-container" style={stickyTop !== undefined ? { top: stickyTop } : undefined}>
        <div className={isPos ? 'px-0' : 'container'}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="search-wrap flex-grow-1">
              <i className="bi bi-search"></i>
              <input
                ref={buscador} type="search" className="form-control search-input"
                placeholder={isPos ? 'Buscar plato o bebida…  ( / )' : 'Buscar plato o bebida…'}
                value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={onBuscadorKey} aria-label="Buscar producto"
              />
            </div>
            {isPos && onToggleCompacto && (
              <div className="segmented vista-toggle" role="group" aria-label="Vista de productos">
                <button className={!compacto ? 'active' : ''} onClick={() => compacto && onToggleCompacto()} title="Con fotos"><i className="bi bi-grid-3x3-gap"></i><span className="d-none d-xl-inline ms-1">Fotos</span></button>
                <button className={compacto ? 'active' : ''} onClick={() => !compacto && onToggleCompacto()} title="Lista compacta: caben más productos"><i className="bi bi-list"></i><span className="d-none d-xl-inline ms-1">Lista</span></button>
              </div>
            )}
            {junto}
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

      {isPos && compacto ? (
        <div className="pos-list mt-3">
          {visibles.map(p => {
            const agotado = p.disponible === false;
            return (
              <div key={p.id} className={`pos-row ${agotado ? 'agotado' : ''}`}>
                <div className="pos-row-name">{p.nombre}{agotado && <span className="badge bg-dark ms-1">AGOTADO</span>}</div>
                <div className="pos-row-sizes">
                  {preciosActivos(p).map(([size, price]) => (
                    <button key={size} className="pos-size-btn" disabled={agotado} onClick={() => onAdd(p, size, price)} title={`Agregar ${TAMANO_LABEL[size]}`}>
                      {TAMANO_CORTO[size] || '+'}<small>{money(price)}</small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : isPos ? (
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
              const cant = enCarrito?.get(p.id) || 0;
              return (
                <div key={p.id} className="col-12 col-md-6 col-xl-4">
                  <div
                    className={`product-card h-100 p-2 d-flex align-items-center gap-3 ${agotado ? 'agotado' : ''}`}
                    onClick={() => !agotado && onSelect(p)}
                  >{/* Clic en la tarjeta = atajo de mouse; con teclado se usa el botón + */}
                    <div className="product-thumb">
                      <img src={p.imagen || PLACEHOLDER_IMG} alt={p.nombre} loading="lazy" decoding="async" width="108" height="108" onError={onImgError} />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-bold lh-sm mb-1">{p.nombre}</div>
                      <small className="text-muted line-clamp-2 mb-2">{p.descripcion}</small>
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <span className="fw-bold text-primary-brand text-nowrap">
                          {varios && <small className="text-muted fw-normal me-1">desde</small>}{money(precioDesde(p))}
                        </span>
                        {agotado
                          ? <span className="badge bg-secondary">Agotado</span>
                          : (
                            <button type="button" className={`btn-add-round ${cant ? 'con-cantidad' : ''}`} onClick={e => tocarAgregar(e, p)}
                              aria-label={varios ? `Elegir tamaño de ${p.nombre}` : `Agregar ${p.nombre}`} title={varios ? 'Elegir tamaño' : 'Agregar'}>
                              {cant ? <span className="fw-bold">{cant}</span> : <i className="bi bi-plus-lg"></i>}
                            </button>
                          )}
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
