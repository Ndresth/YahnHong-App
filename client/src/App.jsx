import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { getSession } from './utils/api';
import { HOME_BY_ROLE } from './config';
import PublicMenu from './pages/PublicMenu';
import ErrorBoundary from './components/ErrorBoundary';

// Las vistas internas se cargan bajo demanda: el cliente del menú no descarga admin ni gráficas
const Login = lazy(() => import('./components/LoginT'));
const PosPage = lazy(() => import('./pages/PosPage'));
const KitchenPage = lazy(() => import('./pages/KitchenPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));



// --- CONTROL DE ACCESO (el servidor valida de nuevo cada petición) ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to={HOME_BY_ROLE[session.role] || '/login'} replace />;
  }
  return children;
};

const Loader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="spinner-border text-danger" role="status"><span className="visually-hidden">Cargando…</span></div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<CartProvider storageKey="cartWeb"><PublicMenu /></CartProvider>} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'cajero']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/pos" element={
              <ProtectedRoute allowedRoles={['admin', 'cajero', 'mesera']}>
                <CartProvider storageKey="cartPos"><PosPage /></CartProvider>
              </ProtectedRoute>
            } />
            <Route path="/cocina" element={
              <ProtectedRoute allowedRoles={['admin', 'cajero', 'mesera', 'cocina']}><KitchenPage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: { background: '#27272a', color: '#fff', borderRadius: '12px', fontWeight: 500 },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />
    </BrowserRouter>
  );
}
