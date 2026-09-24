import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { useLiveEvents, useVisibleInterval } from '../hooks/useLiveEvents';
import { api } from '../utils/api';
import { money } from '../utils/format';
import { TAMANO_CORTO } from '../config';
import StaffNav from '../components/StaffNav';
import MenuBrowser from '../components/MenuBrowser';
import PosOrderPanel from '../components/PosOrderPanel';

export default function PosPage() {
  const { productos, loading, reload } = useProducts();
  const { addToCart, totalItems, total } = useCart();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activas, setActivas] = useState([]);

  const cargarActivas = useCallback(() => {
    api('/api/orders').then(setActivas).catch(() => {});
  }, []);

  const live = useLiveEvents((type) => {
    if (type === 'conectado' || type.startsWith('orden:') || type === 'caja:cerrada') cargarActivas();
  });
  useVisibleInterval(() => { cargarActivas(); reload(); }, 60000);

  const mesasOcupadas = useMemo(
    () => new Set(activas.filter(o => o.tipo === 'Mesa').map(o => String(o.numeroMesa))),
    [activas]
  );

  const handleAdd = (p, size, price) => {
    addToCart(p, size, price, 1);
    toast.success(`${p.nombre} ${TAMANO_CORTO[size] ? `(${TAMANO_CORTO[size]})` : ''}`, { id: 'pos-add', duration: 900 });
  };

  return (
    <div>
      <StaffNav live={live} />
      <div className="pos-layout">
        <div className="pos-menu">
          <MenuBrowser productos={productos} loading={loading} variant="pos" onAdd={handleAdd} />
        </div>
        <PosOrderPanel open={panelOpen} onClose={() => setPanelOpen(false)} mesasOcupadas={mesasOcupadas} onSent={cargarActivas} />
      </div>

      <div className="pos-bottom-bar">
        <button className="btn btn-success w-100 py-3 fw-bold d-flex justify-content-between align-items-center rounded-3" onClick={() => setPanelOpen(true)}>
          <span><i className="bi bi-receipt me-2"></i>Ver cuenta <span className="badge bg-light text-success ms-1">{totalItems}</span></span>
          <span>{money(total)}</span>
        </button>
      </div>
    </div>
  );
}
