import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { api, downloadFile } from '../../utils/api';
import { fechaArchivo } from '../../utils/format';
import { diaLargo, sumarDias } from '../../utils/fechas';
import { HORARIO_TEXTO } from '../../config';

const ROLES = [
  { id: 'mesera', label: 'Mesera' },
  { id: 'cajero', label: 'Cajero' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'admin', label: 'Admin' }
];
const labelRol = (r) => ROLES.find(x => x.id === r)?.label || r;

/** Días especiales sin pedidos web (lo pueden usar caja y admin). */
function DiasCerrados() {
  const hoy = fechaArchivo();
  const [dias, setDias] = useState(null);
  const [dia, setDia] = useState(hoy);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { api('/api/dias-cerrados').then(setDias).catch(e => { toast.error(e.message); setDias([]); }); }, []);

  const agregar = async (d = dia, m = motivo) => {
    setGuardando(true);
    try {
      setDias(await api('/api/dias-cerrados', { method: 'POST', body: { dia: d, motivo: m } }));
      setMotivo('');
      toast.success(d === hoy ? 'Pedidos web cerrados por hoy' : `Cerrado el ${diaLargo(d)}`);
    } catch (e) { toast.error(e.message); } finally { setGuardando(false); }
  };

  const quitar = async (d) => {
    try { setDias(await api(`/api/dias-cerrados/${d}`, { method: 'DELETE' })); toast.success('Día habilitado de nuevo'); }
    catch (e) { toast.error(e.message); }
  };

  const hoyCerrado = dias?.some(d => d.dia === hoy);

  return (
    <div className="card-soft p-3 h-100">
      <h6 className="fw-bold"><i className="bi bi-calendar-x me-2"></i>Días sin pedidos web</h6>
      <p className="small text-muted mb-2">Horario normal: {HORARIO_TEXTO}<br />Aquí se cierran días especiales (24 y 31 de diciembre, imprevistos). El POS sigue funcionando.</p>

      <button className={`btn w-100 mb-3 fw-bold ${hoyCerrado ? 'btn-outline-success' : 'btn-outline-danger'}`}
        disabled={guardando || dias === null}
        onClick={() => (hoyCerrado ? quitar(hoy) : agregar(hoy, 'Cerrado hoy'))}>
        <i className={`bi ${hoyCerrado ? 'bi-door-open' : 'bi-door-closed'} me-2`}></i>
        {hoyCerrado ? 'Volver a abrir pedidos web hoy' : 'Cerrar pedidos web por hoy'}
      </button>

      <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={e => { e.preventDefault(); agregar(); }}>
        <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={dia} min={hoy} max={sumarDias(hoy, 366)}
          onChange={e => setDia(e.target.value)} aria-label="Día" required />
        <input className="form-control form-control-sm flex-grow-1" style={{ minWidth: 140 }} placeholder="Motivo (ej. Nochebuena)" maxLength={60}
          value={motivo} onChange={e => setMotivo(e.target.value)} />
        <button className="btn btn-sm btn-dark" disabled={guardando}><i className="bi bi-plus-lg me-1"></i>Cerrar día</button>
      </form>

      {dias === null ? <div className="spinner-border spinner-border-sm text-danger"></div> : dias.length === 0
        ? <div className="small text-muted">No hay días cerrados programados.</div>
        : (
          <ul className="list-group list-group-flush small">
            {dias.map(d => (
              <li key={d.dia} className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><strong>{d.dia === hoy ? 'Hoy' : diaLargo(d.dia)}</strong>{d.motivo && <span className="text-muted"> · {d.motivo}</span>}</span>
                <button className="btn btn-sm btn-link text-danger p-0" onClick={() => quitar(d.dia)} title="Quitar"><i className="bi bi-x-circle"></i></button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

/** Usuarios individuales del personal (solo admin). */
function Usuarios() {
  const [datos, setDatos] = useState(null);
  const [nuevo, setNuevo] = useState({ nombre: '', rol: 'mesera', clave: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => api('/api/usuarios').then(setDatos).catch(e => { toast.error(e.message); setDatos({ usuarios: [], soloIndividuales: false }); }), []);
  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api('/api/usuarios', { method: 'POST', body: nuevo });
      toast.success(`Usuario ${nuevo.nombre} creado`);
      setNuevo({ nombre: '', rol: nuevo.rol, clave: '' });
      cargar();
    } catch (err) { toast.error(err.message); } finally { setGuardando(false); }
  };

  const cambiar = async (u, body, ok) => {
    try { await api(`/api/usuarios/${u._id}`, { method: 'PATCH', body }); toast.success(ok); cargar(); }
    catch (e) { toast.error(e.message); }
  };

  const nuevaClave = async (u) => {
    const { value } = await Swal.fire({
      title: `Nueva clave para ${u.nombre}`, input: 'password', inputPlaceholder: 'Mínimo 6 caracteres',
      inputAttributes: { autocomplete: 'new-password' }, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v || v.length < 6 ? 'Mínimo 6 caracteres' : undefined)
    });
    if (value) cambiar(u, { clave: value }, 'Clave cambiada. Sus sesiones abiertas se cerraron.');
  };

  const eliminar = async (u) => {
    const r = await Swal.fire({ title: `¿Eliminar a ${u.nombre}?`, text: 'Sus pedidos y registros conservan el nombre.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc3545' });
    if (!r.isConfirmed) return;
    try { await api(`/api/usuarios/${u._id}`, { method: 'DELETE' }); toast.success('Usuario eliminado'); cargar(); }
    catch (e) { toast.error(e.message); }
  };

  const toggleSolo = async (valor) => {
    try {
      const r = await api('/api/usuarios/solo-individuales', { method: 'PUT', body: { valor } });
      setDatos(d => ({ ...d, ...r }));
    }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="card-soft p-3">
      <h6 className="fw-bold"><i className="bi bi-people me-2"></i>Usuarios del personal</h6>
      <p className="small text-muted mb-3">Cada persona entra con <strong>su nombre y su clave</strong>, así queda registrado quién tomó, cobró o anuló cada pedido. Desactivar a alguien o cambiarle la clave cierra sus sesiones de inmediato.</p>

      <form className="row g-2 mb-3" onSubmit={crear}>
        <div className="col-12 col-md-4"><input className="form-control form-control-sm" placeholder="Nombre (con el que entra)" maxLength={40} required
          value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} autoComplete="off" /></div>
        <div className="col-5 col-md-2"><select className="form-select form-select-sm" value={nuevo.rol} onChange={e => setNuevo(n => ({ ...n, rol: e.target.value }))} aria-label="Rol">
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select></div>
        <div className="col-7 col-md-3"><input type="password" className="form-control form-control-sm" placeholder="Clave (mín. 6)" minLength={6} maxLength={72} required
          value={nuevo.clave} onChange={e => setNuevo(n => ({ ...n, clave: e.target.value }))} autoComplete="new-password" /></div>
        <div className="col-12 col-md-3"><button className="btn btn-sm btn-dark w-100" disabled={guardando}><i className="bi bi-person-plus me-1"></i>Crear usuario</button></div>
      </form>

      {datos === null ? <div className="spinner-border spinner-border-sm text-danger"></div> : (
        <>
          <div className="table-responsive">
            <table className="table table-sm align-middle small mb-2">
              <thead className="table-light"><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
              <tbody>
                {datos.usuarios.map(u => (
                  <tr key={u._id} className={u.activo ? '' : 'text-muted'}>
                    <td className="fw-semibold">{u.nombre}</td>
                    <td>
                      <select className="form-select form-select-sm" style={{ maxWidth: 120 }} value={u.rol} aria-label={`Rol de ${u.nombre}`}
                        onChange={e => cambiar(u, { rol: e.target.value }, `${u.nombre} ahora es ${labelRol(e.target.value)}`)}>
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </td>
                    <td>{u.activo ? <span className="badge bg-success">Activo</span> : <span className="badge bg-secondary">Inactivo</span>}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => nuevaClave(u)} title="Cambiar clave"><i className="bi bi-key"></i></button>
                      <button className={`btn btn-sm me-1 ${u.activo ? 'btn-outline-warning' : 'btn-outline-success'}`} title={u.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => cambiar(u, { activo: !u.activo }, u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`)}>
                        <i className={`bi ${u.activo ? 'bi-person-slash' : 'bi-person-check'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(u)} title="Eliminar"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {datos.usuarios.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">Aún no hay usuarios individuales. Mientras tanto se usan las claves compartidas por rol.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" role="switch" id="soloInd" checked={datos.soloIndividuales}
              onChange={e => toggleSolo(e.target.checked)} disabled={!datos.usuarios.length && !datos.soloIndividuales} />
            <label className="form-check-label small" htmlFor="soloInd">
              <strong>Solo usuarios individuales:</strong> las claves compartidas por rol dejan de servir (excepto la del admin, para no quedar por fuera).
            </label>
          </div>
        </>
      )}
    </div>
  );
}

/** Descarga de respaldo completo (solo admin). */
function Respaldo() {
  const [descargando, setDescargando] = useState(false);
  const descargar = async () => {
    setDescargando(true);
    try {
      await downloadFile('/api/respaldo', `Respaldo_YahnHong_${fechaArchivo()}.json`);
      toast.success('Respaldo descargado. Guárdelo en un lugar seguro (tiene datos de clientes).');
    } catch (e) { toast.error(e.message || 'No se pudo descargar'); } finally { setDescargando(false); }
  };
  return (
    <div className="card-soft p-3 h-100">
      <h6 className="fw-bold"><i className="bi bi-cloud-arrow-down me-2"></i>Respaldo de la base de datos</h6>
      <p className="small text-muted mb-3">
        El plan gratuito de Atlas <strong>no hace copias de seguridad</strong>. Descargue un respaldo completo (menú, pedidos, cierres, gastos, usuarios) al menos una vez por semana y guárdelo en Drive o en un USB. Contiene nombres, teléfonos y direcciones de clientes: no lo comparta.
      </p>
      <button className="btn btn-success w-100 fw-bold" onClick={descargar} disabled={descargando}>
        {descargando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-download me-2"></i>}
        Descargar respaldo completo
      </button>
    </div>
  );
}

export default function Ajustes({ isAdmin }) {
  return (
    <div className="d-grid gap-3">
      <div className="row g-3">
        <div className={isAdmin ? 'col-lg-6' : 'col-12'}><DiasCerrados /></div>
        {isAdmin && <div className="col-lg-6"><Respaldo /></div>}
      </div>
      {isAdmin && <Usuarios />}
    </div>
  );
}
