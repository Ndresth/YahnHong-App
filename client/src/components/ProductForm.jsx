import React, { useState } from 'react';

export default function ProductForm({ productToEdit, onClose, onSave }) {
  const [formData, setFormData] = useState(() => {
    if (productToEdit) return { ...productToEdit };
    return {
      id: Date.now(),
      nombre: '',
      categoria: 'Arroz Frito',
      descripcion: '',
      imagen: '',
      precios: { familiar: 0, mediano: 0, personal: 0, unico: 0 }
    };
  });

  const hasSizes = formData.precios.familiar > 0 || formData.precios.mediano > 0 || formData.precios.personal > 0;
  const hasUnique = formData.precios.unico > 0;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePriceChange = (e) => {
    setFormData({
      ...formData,
      precios: { ...formData.precios, [e.target.name]: Number(e.target.value) }
    });
  };

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <>
      <div className="modal-backdrop fade show" style={{zIndex: 1050}}></div>
      <div className="modal fade show d-block" style={{zIndex: 1060}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title"><i className="bi bi-box-seam me-2"></i>{productToEdit ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            
            <div className="modal-body">
              <form id="productForm" onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Nombre del Plato</label>
                    <input type="text" name="nombre" className="form-control" required value={formData.nombre} onChange={handleChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Categoría</label>
                    <select name="categoria" className="form-select" value={formData.categoria} onChange={handleChange}>
                        <option>Arroz Frito</option>
                        <option>Chop Suey</option>
                        <option>Espaguetes</option>
                        <option>Agridulce</option>
                        <option>Platos Especiales</option>
                        <option>Comidas Corrientes</option>
                        <option>Porciones</option>
                        <option>Bebidas</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Descripción / Ingredientes</label>
                    <textarea name="descripcion" className="form-control" rows="2" value={formData.descripcion} onChange={handleChange}></textarea>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold">URL de Imagen</label>
                    <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-link"></i></span>
                        <input type="text" name="imagen" className="form-control" placeholder="https://..." value={formData.imagen} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="col-12"><hr/><h6 className="fw-bold text-secondary"><i className="bi bi-tag-fill me-2"></i>Lista de Precios</h6></div>
                  
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Familiar</label>
                    <input type="number" name="familiar" className="form-control" value={formData.precios.familiar || 0} onChange={handlePriceChange} disabled={hasUnique} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Mediano</label>
                    <input type="number" name="mediano" className="form-control" value={formData.precios.mediano || 0} onChange={handlePriceChange} disabled={hasUnique} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Personal</label>
                    <input type="number" name="personal" className="form-control" value={formData.precios.personal || 0} onChange={handlePriceChange} disabled={hasUnique} />
                  </div>
                  <div className="col-6 col-md-3 bg-light border rounded p-2">
                    <label className="form-label small fw-bold text-primary">Precio Único</label>
                    <input type="number" name="unico" className="form-control border-primary" value={formData.precios.unico || 0} onChange={handlePriceChange} disabled={hasSizes} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" form="productForm" className="btn btn-success fw-bold px-4"><i className="bi bi-save me-2"></i>Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}