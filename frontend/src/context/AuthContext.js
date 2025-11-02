import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // {email, role}
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  //Khi app khởi động → kiểm tra token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser(payload);
        setIsLoggedIn(true);
        setIsAdmin(payload.role === "admin");
      } catch (err) {
        console.error("Token không hợp lệ:", err);
        logout();
      }
    }
  }, []);

  //Đăng nhập
  const login = (token) => {
    localStorage.setItem("token", token);
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser(payload);
    setIsLoggedIn(true);
    setIsAdmin(payload.role === "admin");
  };

  //Đăng xuất
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

// Hook tiện dùng ở mọi component
export const useAuth = () => useContext(AuthContext);
