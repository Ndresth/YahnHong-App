/**
 * Cliente HTTP central: agrega el token, parsea JSON y maneja sesión expirada.
 */
const SESSION_KEYS = ['token', 'role', 'nombre'];

const decodeExp = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
};

export const getSession = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const exp = decodeExp(token);
  if (exp && exp < Date.now()) { clearSession(); return null; }
  return { token, role: localStorage.getItem('role'), nombre: localStorage.getItem('nombre') || '' };
};

export const saveSession = ({ token, role, nombre }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('nombre', nombre || '');
};

export const clearSession = () => SESSION_KEYS.forEach(k => localStorage.removeItem(k));

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', body, raw = false, signal } = {}) {
  const headers = {};
  const session = getSession();
  if (session) headers.Authorization = `Bearer ${session.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, 'Sin conexión con el servidor');
  }

  if (res.status === 401 && session) {
    clearSession();
    if (!location.pathname.startsWith('/login')) location.assign('/login?expirada=1');
  }
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, 'Error al descargar');
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message || `Error ${res.status}`);
  return data;
}

/** Descarga un archivo protegido (ej. Excel) respetando el token. */
export async function downloadFile(path, filename) {
  const res = await api(path, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
