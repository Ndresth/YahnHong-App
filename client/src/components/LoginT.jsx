import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // AQUÍ CAMBIAS LA CONTRASEÑA DEL DUEÑO
    if (password === 'Yami1') {
      localStorage.setItem('isAdmin', 'true'); // Guardamos la llave en el navegador
      navigate('/admin'); // Lo mandamos al dashboard
    } else {
      alert('Contraseña incorrecta');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4" style={{maxWidth: '400px', width: '100%'}}>
        <h3 className="text-center mb-4 fw-bold text-danger">Acceso Administrativo</h3>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la clave..."
            />
          </div>
          <button type="submit" className="btn btn-danger w-100 fw-bold">Entrar</button>
          <a href="/" className="d-block text-center mt-3 text-muted text-decoration-none">← Volver a la tienda</a>
        </form>
      </div>
    </div>
  );
}