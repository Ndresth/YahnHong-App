import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        // Almacenamos credenciales
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        
        // Lógica de Redirección por Rol
        if (data.role === 'admin' || data.role === 'cajero') {
            // Admin y Cajero van al panel de control
            navigate('/admin');
        } else {
            // Meseras van directo al punto de venta
            navigate('/pos');
        }
      } else {
        setError(data.message || 'Credenciales inválidas');
      }
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4 border-0" style={{maxWidth: '400px', width: '100%'}}>
        <div className="text-center mb-4">
            <i className="bi bi-person-lock text-danger" style={{fontSize: '3rem'}}></i>
            <h4 className="fw-bold mt-2 text-dark">Acceso al Sistema</h4>
            <p className="text-muted small">Plataforma de Gestión</p>
        </div>
        
        {error && <div className="alert alert-danger text-center py-2 small"><i className="bi bi-exclamation-octagon me-2"></i>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="form-label fw-bold small text-uppercase text-secondary">Contraseña</label>
            <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-key-fill"></i></span>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su clave asignada"
                />
            </div>
          </div>
          <button type="submit" className="btn btn-danger w-100 fw-bold py-2">
            <i className="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión
          </button>
          <a href="/" className="d-block text-center mt-4 text-muted text-decoration-none small">
            <i className="bi bi-arrow-left me-1"></i> Volver al Catálogo
          </a>
        </form>
      </div>
    </div>
  );
}