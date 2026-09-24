import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, saveSession } from '../utils/api';
import { HOME_BY_ROLE } from '../config';

export default function Login() {
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(() => localStorage.getItem('ultimoNombre') || '');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setError('');
    setCargando(true);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { password, nombre } });
      saveSession(data);
      localStorage.setItem('ultimoNombre', nombre);
      navigate(HOME_BY_ROLE[data.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light px-3">
      <div className="card-soft shadow-sm p-4" style={{ maxWidth: 400, width: '100%' }}>
        <div className="text-center mb-4">
          <img src="/images/logo.png" alt="Yahn Hong" width="72" height="72" className="mb-2" />
          <h4 className="fw-bold mb-0">Acceso del personal</h4>
          <p className="text-muted small">POS · Cocina · Caja</p>
        </div>

        {params.get('expirada') && !error && (
          <div className="alert alert-warning py-2 small text-center">Su sesión expiró. Ingrese de nuevo.</div>
        )}
        {error && <div className="alert alert-danger text-center py-2 small"><i className="bi bi-exclamation-octagon me-2"></i>{error}</div>}

        <form onSubmit={handleLogin}>
          <label className="form-label fw-semibold small text-secondary" htmlFor="nombre">Su nombre</label>
          <input id="nombre" className="form-control form-control-lg mb-3" maxLength={40}
            autoComplete="username" value={nombre} onChange={e => setNombre(e.target.value)} />

          <label className="form-label fw-semibold small text-secondary" htmlFor="clave">Contraseña</label>
          <div className="input-group input-group-lg mb-4">
            <input id="clave" type={verClave ? 'text' : 'password'} className="form-control" autoFocus
              autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Clave asignada" />
            <button type="button" className="btn btn-outline-secondary" onClick={() => setVerClave(v => !v)} aria-label="Mostrar clave">
              <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>

          <button type="submit" className="btn btn-brand btn-lg w-100 fw-bold" disabled={cargando || !password}>
            {cargando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-box-arrow-in-right me-2"></i>}
            Ingresar
          </button>
          <Link to="/" className="d-block text-center mt-4 text-muted text-decoration-none small">
            <i className="bi bi-arrow-left me-1"></i>Volver al menú
          </Link>
        </form>
      </div>
    </div>
  );
}
