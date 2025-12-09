import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { Toaster } from 'react-hot-toast';

import CartSidebar from './components/CartSidebar';
import ProductSidebar from './components/ProductSidebar';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/LoginT';
import PosPage from './pages/PosPage';
import OrdersPanel from './components/OrdersPanel';
import HomeContent from './components/HomeContent';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/pos" />;
  return children;
};

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <MainLayout />
        <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
      </BrowserRouter>
    </CartProvider>
  )
}

function MainLayout() {
  const location = useLocation();
  const isSpecialPage = ['/pos', '/login', '/admin', '/cocina'].some(path => location.pathname.startsWith(path));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <>
      {!isSpecialPage && (
        <>
          <Navbar onOpenCart={() => setIsCartOpen(true)} />
          <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <ProductSidebar key={selectedProduct ? selectedProduct.id : 'empty'} product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
        </>
      )}

      <Routes>
        <Route path="/" element={<HomeContent onSelectProduct={setSelectedProduct} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'cajero']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'mesera', 'cajero']}><PosPage /></ProtectedRoute>} />
        <Route path="/cocina" element={<ProtectedRoute allowedRoles={['admin', 'cajero']}><OrdersPanel /></ProtectedRoute>} />
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
          <img src="/logo.png" alt="Logo" style={{width:'50px', height:'50px', background:'white', borderRadius:'50%', padding:'2px'}} />
          <div className="d-flex flex-column">
            <span className="brand-text">YAHN HONG</span>
            <span className="brand-subtext">Restaurante Oriental</span>
          </div>
        </Link>
        <button onClick={onOpenCart} className="btn btn-light rounded-pill fw-bold shadow-sm d-flex align-items-center gap-2 px-3">
          <i className="bi bi-bag-check-fill text-warning"></i> 
          <span className="d-none d-sm-inline">Ver Pedido</span>
          {totalItems > 0 && (<span className="badge bg-danger rounded-pill ms-2">{totalItems}</span>)}
        </button>
      </div>
    </nav>
  );
}

export default App;