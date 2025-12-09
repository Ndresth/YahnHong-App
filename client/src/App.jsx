import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
// IMPORTAMOS EL TOASTER
import { Toaster } from 'react-hot-toast';

import CartSidebar from './components/CartSidebar';
import ProductSidebar from './components/ProductSidebar';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/LoginT';
import PosPage from './pages/PosPage';
import OrdersPanel from './components/OrdersPanel';
import HomeContent from './components/HomeContent';

// --- CONTROL DE ACCESO (MIDDLEWARE FRONTEND) ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const location = useLocation();

  if (!token) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (location.pathname.startsWith('/pos')) {
        localStorage.clear();
        return <Navigate to="/login" />;
    }
    return <Navigate to="/pos" />;
  }

  return children;
};

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <MainLayout />
        {/* AQUÍ AGREGAMOS EL COMPONENTE TOASTER GLOBAL.
          Configuramos su posición y estilo.
        */}
        <Toaster 
            position="bottom-right"
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#333',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '10px',
                },
                success: {
                    style: { background: '#198754' }, // Verde Bootstrap
                    iconTheme: { primary: 'white', secondary: '#198754' },
                },
                error: {
                    style: { background: '#dc3545' }, // Rojo Bootstrap
                    iconTheme: { primary: 'white', secondary: '#dc3545' },
                },
            }}
        />
      </BrowserRouter>
    </CartProvider>
  )
}

function MainLayout() {
  const location = useLocation();
  
  const isSpecialPage = 
    location.pathname.startsWith('/pos') || 
    location.pathname.startsWith('/login') || 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/cocina'); 

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <>
      {!isSpecialPage && (
        <>
          <Navbar onOpenCart={() => setIsCartOpen(true)} />
          <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <ProductSidebar 
            key={selectedProduct ? selectedProduct.id : 'empty'} 
            product={selectedProduct} 
            isOpen={!!selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        </>
      )}

      <Routes>
        <Route path="/" element={<HomeContent onSelectProduct={setSelectedProduct} />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cajero']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'mesera', 'cajero']}>
              <PosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cocina" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cajero']}>
              <OrdersPanel />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

function Navbar({ onOpenCart }) {
  const { cart } = useCart();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <div className="bg-white rounded-circle d-flex justify-content-center align-items-center shadow-sm" style={{width:'50px', height:'50px', padding:'3px'}}>
             <img src="logo.png" alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
          </div>
          <div className="d-flex flex-column">
            <span className="brand-text">YAHN HONG</span>
            <span className="brand-subtext">Restaurante Oriental</span>
          </div>
        </Link>
        <button onClick={onOpenCart} className="btn btn-warning rounded-pill fw-bold shadow-sm d-flex align-items-center gap-2 px-3 border-0" style={{background: '#FFC107', color: '#212121'}}>
          <i className="bi bi-bag-check-fill"></i> 
          <span className="d-none d-sm-inline ms-2">Ver Pedido</span>
          {totalItems > 0 && (<span className="badge bg-dark text-white rounded-pill ms-2">{totalItems}</span>)}
        </button>
      </div>
    </nav>
  );
}

export default App;