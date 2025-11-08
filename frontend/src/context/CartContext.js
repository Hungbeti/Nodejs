// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
// Giả định bạn có AuthContext như thế này:
import { useAuth } from './AuthContext'; 

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// === HELPER FUNCTIONS CHO GIỎ HÀNG CỦA KHÁCH ===
const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  // Trả về một mảng các { product, quantity }
  return cart ? JSON.parse(cart) : []; 
};

const saveGuestCart = (items) => {
  localStorage.setItem('guestCart', JSON.stringify(items));
};

// Hàm tính toán số lượng
const getCartCount = (items) => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};
// ===============================================

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  // Lấy trạng thái đăng nhập từ AuthContext
  const { isLoggedIn } = useAuth(); 

  /**
   * Tải số lượng trong giỏ hàng.
   * Sẽ tự động gọi API (nếu đã đăng nhập) hoặc đọc localStorage (nếu là khách).
   */
  const fetchCartCount = async () => {
    if (isLoggedIn) {
      // Người dùng đã đăng nhập -> Gọi API (đã được bảo vệ)
      try {
        const res = await api.get('/cart');
        const count = getCartCount(res.data.items || []);
        setCartCount(count);
      } catch (err) {
        setCartCount(0);
      }
    } else {
      // Khách -> Đọc từ localStorage
      const items = getGuestCart();
      const count = getCartCount(items);
      setCartCount(count);
    }
  };

  // Tải số lượng khi component mount VÀ khi trạng thái đăng nhập thay đổi
  useEffect(() => {
    fetchCartCount();
  }, [isLoggedIn]);

  /**
   * Hàm "thông minh" để thêm sản phẩm.
   * Tự động quyết định gọi API hay dùng localStorage.
   */
  const addToCart = async (product, quantity = 1) => {
    if (isLoggedIn) {
      // NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP: Gọi API
      await api.post('/cart/add', { productId: product._id, quantity });
      // Tải lại số lượng từ CSDL sau khi thêm
      await fetchCartCount(); 
    } else {
      // KHÁCH: Dùng localStorage
      const items = getGuestCart();
      const existingItem = items.find(i => i.product._id === product._id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // Lưu ý: Chúng ta lưu đối tượng product rút gọn để checkout
        const productData = {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images
        };
        items.push({ product: productData, quantity, productId: product._id });
      }
      saveGuestCart(items);
      // Cập nhật state số lượng
      setCartCount(getCartCount(items));
    }
  };

  // Cung cấp các hàm mới cho toàn bộ ứng dụng
  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount, addToCart }}>
      {children}
    </CartContext.Provider>
  );
};