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
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        if (data.role === 'admin' || data.role === 'cajero') navigate('/admin');
        else navigate('/pos');
      } else {
        setError(data.message || 'Error de acceso');
      }
    } catch { setError('Error de conexión'); }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4 border-0" style={{maxWidth: '400px', width: '100%'}}>
        <div className="text-center mb-4">
            {/* MANTENEMOS EL LOGO DE YAHN HONG */}
            <img src="/logo.png" alt="Yahn Hong" style={{height: '80px', objectFit:'contain'}} />
            <h4 className="fw-bold mt-2 text-danger">Acceso al Sistema</h4>
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña..." />
          </div>
          <button type="submit" className="btn btn-danger w-100 fw-bold">Iniciar Sesión</button>
          <a href="/" className="d-block text-center mt-4 text-muted text-decoration-none small">← Volver al Menú Digital</a>
        </form>
      </div>
    </div>
  );
}