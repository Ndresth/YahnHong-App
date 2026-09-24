import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../../utils/swalConfig';
import { api } from '../../utils/api';
import { money, precioDesde } from '../../utils/format';
import { PLACEHOLDER_IMG } from '../../config';
import ProductForm from '../ProductForm';

/** Inventario: admin edita todo; caja sólo marca productos agotados. */
export default function Inventario({ productos, setProductos, reload, isAdmin }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = cerrado, null = nuevo

  const visibles = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? productos.filter(p => `${p.nombre} ${p.categoria}`.toLowerCase().includes(s)) : productos;
  }, [productos, q]);

  const toggleDisponible = async (p) => {
    const disponible = p.disponible === false;
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, disponible } : x)); // Optimista
    try {
      await api(`/api/productos/${p.id}/disponible`, { method: 'PATCH', body: { disponible } });
      toast.success(`${p.nombre}: ${disponible ? 'disponible' : 'AGOTADO'}`);
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };

  const handleDelete = async (p) => {
    const r = await swalBootstrap.fire({
      title: '¿Eliminar producto?', text: `${p.nombre} se borrará del menú.`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    try {
      await api(`/api/productos/${p.id}`, { method: 'DELETE' });
      toast.success('Producto eliminado');
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const handleSave = async (formData) => {
    try {
      if (editing) await api(`/api/productos/${editing.id}`, { method: 'PUT', body: formData });
      else await api('/api/productos', { method: 'POST', body: formData });
      toast.success('Producto guardado');
      setEditing(undefined);
      reload();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="card-soft">
      <div className="p-3 d-flex flex-wrap gap-2 align-items-center border-bottom">
        <h6 className="fw-bold m-0 me-auto"><i className="bi bi-box-seam me-2"></i>Productos ({productos.length})</h6>
        <input type="search" className="form-control form-control-sm" style={{ maxWidth: 220 }} placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        {isAdmin && (
          <button className="btn btn-success btn-sm fw-bold" onClick={() => setEditing(null)}>
            <i className="bi bi-plus-circle me-1"></i>Nuevo
          </button>
        )}
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 table-sm-touch">
          <thead className="table-light small">
            <tr><th className="ps-3"></th><th>Nombre</th><th>Categoría</th><th>Desde</th><th>Disponible</th>{isAdmin && <th className="text-end pe-3">Acciones</th>}</tr>
          </thead>
          <tbody>
            {visibles.map(p => (
              <tr key={p.id} className={p.disponible === false ? 'opacity-50' : ''}>
                <td className="ps-3"><img src={p.imagen || PLACEHOLDER_IMG} alt="" className="thumb-40" loading="lazy" onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} /></td>
                <td className="fw-semibold">{p.nombre}</td>
                <td><span className="badge bg-secondary-subtle text-secondary-emphasis">{p.categoria}</span></td>
                <td>{money(precioDesde(p))}</td>
                <td>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" role="switch" checked={p.disponible !== false}
                      onChange={() => toggleDisponible(p)} aria-label={`Disponible ${p.nombre}`} />
                  </div>
                </td>
                {isAdmin && (
                  <td className="text-end pe-3 text-nowrap">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditing(p)} aria-label="Editar"><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p)} aria-label="Eliminar"><i className="bi bi-trash"></i></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <ProductForm productToEdit={editing} onClose={() => setEditing(undefined)} onSave={handleSave} />}
    </div>
  );
}
