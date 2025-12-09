import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

/**
 * Proveedor de Estado Global del Carrito.
 * Gestiona la adición, eliminación y actualización de items en la orden actual.
 */
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  /**
   * Agrega un producto al carrito o incrementa su cantidad si ya existe.
   * @param {Object} product - Objeto del producto
   * @param {string} size - Tamaño seleccionado (Familiar, Personal, etc.)
   * @param {number} price - Precio unitario
   * @param {number} quantity - Cantidad a agregar
   */
  const addToCart = (product, size, price, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id && item.selectedSize === size);
      if (existingItem) {
        return prevCart.map(item => 
          (item.id === product.id && item.selectedSize === size)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { ...product, selectedSize: size, selectedPrice: price, quantity: quantity, nota: '' }];
      }
    });
  };

  /**
   * Actualiza la nota/observación de un item específico.
   */
  const updateItemNote = (productId, size, note) => {
    setCart(prevCart => prevCart.map(item => 
        (item.id === productId && item.selectedSize === size)
          ? { ...item, nota: note }
          : item
    ));
  };

  const removeFromCart = (productId, size) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => acc + (item.selectedPrice * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, updateItemNote, total }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);