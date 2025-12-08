import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../utils/swalConfig';

import ProductSidebar from '../components/ProductSidebar';
import PosCartSidebar from '../components/PosCartSidebar';
import { HomeContent } from '../App'; // Asegúrate de que esto siga importando bien

const PosNavbar = ({ onOpenCart, totalItems, onLogout }) => (
    <nav className="navbar navbar-dark bg-dark sticky-top px-3 shadow">
      <div className="d-flex align-items-center gap-3">
        <Link to="/admin" className="btn btn-outline-light btn-sm" title="Panel Administrativo">
            <i className="bi bi-gear-fill"></i>
        </Link>
        <span className="navbar-brand mb-0 h1 fw-bold d-none d-md-block">
            <i className="bi bi-terminal me-2"></i>SISTEMA POS
        </span>
      </div>

      <div className="d-flex gap-2">
          <button onClick={onOpenCart} className="btn btn-success fw-bold">
            <i className="bi bi-receipt me-2"></i>Cuenta <span className="badge bg-light text-dark ms-1">{totalItems}</span>
          </button>
          <button onClick={onLogout} className="btn btn-danger fw-bold" title="Cerrar Turno">
            <i className="bi bi-power"></i>
          </button>
      </div>
    </nav>
);

export default function PosPage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart } = useCart();
  const navigate = useNavigate();

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    const result = await swalBootstrap.fire({
        title: '¿Cerrar Sesión?',
        text: "Se cerrará el turno en este dispositivo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, Salir',
        cancelButtonText: 'Cancelar'
    });

    if(result.isConfirmed) {
        localStorage.clear();
        navigate('/login');
        toast.success("Turno cerrado.");
    }
  };

  return (
    <div style={{backgroundColor: '#f8f9fa', minHeight: '100vh'}}>
      <PosNavbar 
        onOpenCart={() => setIsCartOpen(true)} 
        totalItems={totalItems} 
        onLogout={handleLogout} 
      />
      
      <HomeContent onSelectProduct={setSelectedProduct} />

      <PosCartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
      <ProductSidebar 
        key={selectedProduct ? selectedProduct.id : 'empty'} 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
}