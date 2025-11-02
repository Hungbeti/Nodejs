// src/routes/AdminRoute.js
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'admin') {
      return children;
    }
    return <Navigate to="/" />;
  } catch (err) {
    localStorage.removeItem('token');
    return <Navigate to="/login" />;
  }
};

export default AdminRoute;
