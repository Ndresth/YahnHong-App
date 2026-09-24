import { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { CATEGORIA_BEBIDAS } from '../config';

const CartContext = createContext();

const lineKey = (id, size) => `${id}:${size}`;

const load = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

/**
 * Proveedor de Estado del Carrito.
 * Se guarda en localStorage (storageKey) para que una recarga no borre el pedido.
 * El precio guardado es sólo para mostrar: el servidor recalcula el total real.
 */
export const CartProvider = ({ children, storageKey = 'cart' }) => {
  const [cart, setCart] = useState(() => load(storageKey));

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* cuota llena */ }
  }, [cart, storageKey]);

  const addToCart = useCallback((product, size, price, quantity = 1) => {
    const key = lineKey(product.id, size);
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) return prev.map(i => i.key === key ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i);
      return [...prev, {
        key, id: product.id, nombre: product.nombre, imagen: product.imagen, categoria: product.categoria,
        selectedSize: size, selectedPrice: price, quantity, nota: ''
      }];
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setCart(prev => quantity <= 0
      ? prev.filter(i => i.key !== key)
      : prev.map(i => i.key === key ? { ...i, quantity: Math.min(99, quantity) } : i));
  }, []);

  const updateItemNote = useCallback((key, nota) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, nota } : i));
  }, []);

  const removeFromCart = useCallback((key) => setCart(prev => prev.filter(i => i.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(() => ({
    cart,
    addToCart, updateQuantity, updateItemNote, removeFromCart, clearCart,
    total: cart.reduce((acc, i) => acc + i.selectedPrice * i.quantity, 0),
    totalItems: cart.reduce((acc, i) => acc + i.quantity, 0),
    tieneBebida: cart.some(i => i.categoria === CATEGORIA_BEBIDAS),
    /** Formato que espera el servidor: sin precios. */
    toOrderItems: () => cart.map(i => ({ productoId: i.id, tamaño: i.selectedSize, cantidad: i.quantity, nota: i.nota || '' }))
  }), [cart, addToCart, updateQuantity, updateItemNote, removeFromCart, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
