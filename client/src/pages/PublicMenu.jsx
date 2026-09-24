import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { useHorario } from '../hooks/useHorario';
import { NEGOCIO, HORARIO_TEXTO } from '../config';
import { money } from '../utils/format';
import MenuBrowser from '../components/MenuBrowser';
import ProductSidebar from '../components/ProductSidebar';
import CartSidebar from '../components/CartSidebar';

export default function PublicMenu() {
  const { productos, loading } = useProducts();
  const { totalItems, total } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const horario = useHorario();

  return (
    <>
      <nav className="navbar navbar-light navbar-custom">
        <div className="container d-flex flex-nowrap justify-content-between align-items-center gap-2">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2 m-0 min-w-0">
            <img src="/images/logo.png" alt="Logo" className="brand-logo" width="46" height="46" />
            <span className="d-flex flex-column min-w-0">
              <span className="brand-text">{NEGOCIO.nombre}</span>
              <span className="brand-subtext">{NEGOCIO.subtitulo}</span>
            </span>
          </Link>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            {horario && (
              <span className={`estado-local ${horario.abierto ? 'abierto' : 'cerrado'}`} title={horario.texto}>
                <span className="estado-dot"></span>
                <span className="fw-bold">{horario.abierto ? 'Abierto' : 'Cerrado'}</span>
                <span className="d-none d-md-inline fw-normal">{horario.texto.replace(/^(Abierto|Cerrado) · /, ' · ')}</span>
              </span>
            )}
            <button onClick={() => setIsCartOpen(true)} className="btn btn-dark rounded-pill fw-bold d-flex align-items-center gap-2 px-3 border-0">
              <i className="bi bi-bag-check-fill"></i>
              <span className="d-none d-sm-inline">Ver pedido</span>
              {totalItems > 0 && <span className="badge bg-warning text-dark rounded-pill">{totalItems}</span>}
            </button>
          </div>
        </div>
      </nav>

      {horario && !horario.abierto && (
        <div className="aviso-cerrado">
          <i className="bi bi-moon-stars me-2"></i>
          <strong>{horario.texto}</strong>{' — '}
          {horario.antesDeAbrir ? 'ya puedes programar tu pedido para hoy.' : 'puedes ver el menú; los pedidos se reciben en horario de atención.'}
          <div className="small opacity-75">{HORARIO_TEXTO}</div>
        </div>
      )}

      <main style={{ paddingBottom: totalItems > 0 ? 90 : 20 }}>
        <MenuBrowser productos={productos} loading={loading} onSelect={setSelected} />
      </main>

      {totalItems > 0 && !isCartOpen && (
        <button className="btn btn-success fab-cart fw-bold d-flex justify-content-between align-items-center d-md-none" onClick={() => setIsCartOpen(true)}>
          <span><span className="badge bg-light text-success me-2">{totalItems}</span>Ver pedido</span>
          <span>{money(total)}</span>
        </button>
      )}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} horario={horario} />
      <ProductSidebar key={selected?.id ?? 'none'} product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
