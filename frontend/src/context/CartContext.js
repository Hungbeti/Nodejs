// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// ===============================================
// === HELPER FUNCTIONS CHO GIỎ HÀNG CỦA KHÁCH ===
// ===============================================
const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  return cart ? JSON.parse(cart) : [];
};

const saveGuestCart = (items) => {
  localStorage.setItem('guestCart', JSON.stringify(items));
};

const getCartCount = (items) => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

// ===============================================

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const { isLoggedIn } = useAuth();

  const fetchCartCount = async () => {
    if (isLoggedIn) {
      try {
        const res = await api.get('/cart');
        const count = getCartCount(res.data.items || []);
        setCartCount(count);
      } catch (err) {
        setCartCount(0);
      }
    } else {
      const items = getGuestCart();
      setCartCount(getCartCount(items));
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [isLoggedIn]);


  const addToCart = async (item, quantity = 1) => {
    if (isLoggedIn) {
      // ========= USER ĐÃ ĐĂNG NHẬP =========
      await api.post('/cart/add', {
        productId: item.product._id,
        variantId: item.variantId,
        variantName: item.variantName,
        price: item.price,
        quantity
      });

      await fetchCartCount();
      return;
    }

    // ========= KHÁCH — DÙNG localStorage =========
    let items = getGuestCart();

    // Tìm item theo _id (đã gồm product + variant)
    const existing = items.find(x => x._id === item._id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        _id: item._id,            // productId-variantId
        product: {
          _id: item.product._id,
          name: item.product.name,
          images: item.product.images,
          price: item.product.price
        },
        price: item.price,         // giá biến thể
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: quantity
      });
    }

    saveGuestCart(items);
    setCartCount(getCartCount(items));
  };

  const updateGuestItem = (itemId, quantity) => {
    let items = getGuestCart();
    const item = items.find(x => x._id === itemId);
    if (item) {
      item.quantity = quantity;
      saveGuestCart(items);
      setCartCount(getCartCount(items)); // Cập nhật ngay lập tức
    }
  };

  // --- THÊM MỚI: HÀM REMOVE CHO GUEST ---
  const removeGuestItem = (itemId) => {
    let items = getGuestCart();
    items = items.filter(x => x._id !== itemId);
    saveGuestCart(items);
    setCartCount(getCartCount(items)); // Cập nhật ngay lập tức
  };

  // ===============================================

  return (
    <CartContext.Provider value={{ 
        cartCount, 
        fetchCartCount, 
        addToCart, 
        updateGuestItem, // Export hàm này
        removeGuestItem  // Export hàm này
    }}>
      {children}
    </CartContext.Provider>
  );
};
