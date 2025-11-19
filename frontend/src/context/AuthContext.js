// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * Hàm giải mã payload của JWT một cách an toàn (xử lý Base64URL)
 */
const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      throw new Error('Invalid token: Missing payload');
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Sửa: User state sẽ lưu đầy đủ _id, email, role
  const [user, setUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // SỬA LỖI: Dùng hàm giải mã an toàn
        const payload = decodeJwtPayload(token);
        
        // Kiểm tra xem token còn hạn không (nếu có 'exp')
        if (payload && (!payload.exp || payload.exp * 1000 > Date.now())) {
          setUser(payload); // payload bây giờ chứa { _id, email, role }
          setIsLoggedIn(true);
          setIsAdmin(payload.role === "admin");
        } else {
          // Token hết hạn
          logout();
        }
      } catch (err) {
        console.error("Token không hợp lệ:", err);
        logout();
      }
    }
  }, []); // Chỉ chạy 1 lần khi app khởi động

  const login = (token) => {
    localStorage.setItem("token", token);
    // SỬA LỖI: Dùng hàm giải mã an toàn
    const payload = decodeJwtPayload(token);
    
    if (payload) {
      setUser(payload); // payload bây giờ chứa { _id, email, role }
      setIsLoggedIn(true);
      setIsAdmin(payload.role === "admin");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);