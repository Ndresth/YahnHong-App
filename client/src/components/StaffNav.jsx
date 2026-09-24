import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../utils/swalConfig';
import { clearSession, getSession } from '../utils/api';

const LINKS = [
  { to: '/pos', label: 'POS', icon: 'bi-grid-3x3-gap-fill', roles: ['admin', 'cajero', 'mesera'] },
  { to: '/cocina', label: 'Cocina', icon: 'bi-fire', roles: ['admin', 'cajero', 'mesera', 'cocina'] },
  { to: '/admin', label: 'Caja', icon: 'bi-speedometer2', roles: ['admin', 'cajero'] }
];

/** Barra superior común para POS, Cocina y Caja. */
export default function StaffNav({ live, children }) {
  const navigate = useNavigate();
  const session = getSession();
  const links = LINKS.filter(l => l.roles.includes(session?.role));

  const logout = async () => {
    const r = await swalBootstrap.fire({
      title: '¿Cerrar sesión?', icon: 'question', showCancelButton: true,
      confirmButtonText: 'Salir', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    clearSession();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return (
    <nav className="staff-nav d-flex align-items-center px-2 px-md-3 gap-2">
      <img src="/images/logo.png" alt="" width="32" height="32" className="rounded-circle bg-white p-1 d-none d-sm-block" />
      <div className="d-flex gap-1 overflow-auto">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <i className={`bi ${l.icon} me-1`}></i>{l.label}
          </NavLink>
        ))}
      </div>
      <div className="ms-auto d-flex align-items-center gap-2">
        {children}
        {live !== undefined && (
          <span className="small text-white-50 d-flex align-items-center gap-1" title={live ? 'Conectado en tiempo real' : 'Reconectando…'}>
            <span className={`live-dot ${live ? 'on' : ''}`}></span>
            <span className="d-none d-md-inline">{live ? 'En vivo' : 'Reconectando'}</span>
          </span>
        )}
        <span className="small text-white-50 d-none d-lg-inline"><i className="bi bi-person-circle me-1"></i>{session?.nombre}</span>
        <button className="btn btn-sm btn-outline-light" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </nav>
  );
}
