import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavbarAdmin = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
  <nav
  className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm w-100"
  style={{
    borderRadius: 0,
    margin: 0,
    padding: 0,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1050,
  }}
>
  <div
    className="container-fluid px-4 d-flex justify-content-between align-items-center"
    style={{ height: '60px', margin: 0 }}
  >
    <Link className="navbar-brand fw-bold text-white" to="/admin">
      PC Shop
    </Link>
    <div className="d-flex align-items-center gap-3">
      <span className="text-white">
        <i className="bi bi-person-circle"></i> Admin
      </span>
      <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
        Đăng xuất
      </button>
    </div>
  </div>
</nav>
);

};

export default NavbarAdmin;