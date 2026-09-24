import { useState } from 'react';
import { CATEGORIAS, PLACEHOLDER_IMG, TAMANO_LABEL } from '../config';

const VACIO = { nombre: '', categoria: CATEGORIAS[0], descripcion: '', imagen: '', disponible: true, precios: { familiar: 0, mediano: 0, personal: 0, unico: 0 } };

export default function ProductForm({ productToEdit, onClose, onSave }) {
  const [formData, setFormData] = useState(() => productToEdit
    ? { ...VACIO, ...productToEdit, precios: { ...VACIO.precios, ...productToEdit.precios } }
    : VACIO);
  const [guardando, setGuardando] = useState(false);

  const p = formData.precios;
  const hasSizes = p.familiar > 0 || p.mediano > 0 || p.personal > 0;
  const hasUnique = p.unico > 0;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePriceChange = (e) => setFormData({ ...formData, precios: { ...p, [e.target.name]: Math.max(0, Number(e.target.value) || 0) } });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const { nombre, categoria, descripcion, imagen, disponible, precios } = formData;
    await onSave({ nombre, categoria, descripcion, imagen, disponible, precios });
    setGuardando(false);
  };

  const categorias = CATEGORIAS.includes(formData.categoria) ? CATEGORIAS : [...CATEGORIAS, formData.categoria];

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title"><i className="bi bi-box-seam me-2"></i>{productToEdit ? 'Editar producto' : 'Nuevo producto'}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
            </div>

            <div className="modal-body">
              <form id="productForm" onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold" htmlFor="pf-nombre">Nombre del plato</label>
                    <input id="pf-nombre" name="nombre" className="form-control" required maxLength={80} value={formData.nombre} onChange={handleChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold" htmlFor="pf-cat">Categoría</label>
                    <select id="pf-cat" name="categoria" className="form-select" value={formData.categoria} onChange={handleChange}>
                      {categorias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="pf-desc">Descripción / ingredientes</label>
                    <textarea id="pf-desc" name="descripcion" className="form-control" rows="2" maxLength={300} value={formData.descripcion || ''} onChange={handleChange}></textarea>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold" htmlFor="pf-img">Imagen</label>
                    <div className="d-flex gap-2 align-items-center">
                      <img src={formData.imagen || PLACEHOLDER_IMG} alt="" className="thumb-40" onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
                      <input id="pf-img" name="imagen" className="form-control" placeholder="Ruta o URL de la imagen" maxLength={300} value={formData.imagen || ''} onChange={handleChange} />
                    </div>
                    <div className="form-text">Use imágenes livianas (menos de 100 KB, 600 px de ancho).</div>
                  </div>

                  <div className="col-12"><hr className="my-1" /><h6 className="fw-bold text-secondary mb-0"><i className="bi bi-tag-fill me-2"></i>Precios</h6>
                    <div className="form-text">Use tamaños (familiar/mediano/personal) <b>o</b> precio único, no ambos.</div>
                  </div>
                  {['familiar', 'mediano', 'personal', 'unico'].map(t => (
                    <div key={t} className="col-6 col-md-3">
                      <label className={`form-label small ${t === 'unico' ? 'fw-bold text-primary' : ''}`} htmlFor={`pf-${t}`}>{TAMANO_LABEL[t]}</label>
                      <input id={`pf-${t}`} type="number" inputMode="numeric" min="0" step="100" name={t} className="form-control"
                        value={p[t] || ''} placeholder="0" onChange={handlePriceChange}
                        disabled={t === 'unico' ? hasSizes : hasUnique} />
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" form="productForm" className="btn btn-success fw-bold px-4" disabled={guardando || (!hasSizes && !hasUnique)}>
                {guardando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
