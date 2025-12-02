// src/components/Navbar.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Navbar = () => {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');
  const isProductsPage = location.pathname.startsWith('/products');

  // TẢI DANH MỤC
  useEffect(() => {
    if (isAdminPage) return;
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Không thể tải danh mục:', err);
      }
    };
    fetchCategories();
  }, [isAdminPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = search.trim();
    if (keyword) {
      navigate(`/products?search=${encodeURIComponent(keyword)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isAdminPage) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm sticky-top" style={{ zIndex: 1030 }}>
      <div className="container">
        {/* LOGO */}
        <Link className="navbar-brand fw-bold fs-4" to="/">
          PC Shop
        </Link>

        {/* DROPDOWN DANH MỤC */}
        <div className="nav-item dropdown d-none d-lg-block me-3">
          <a
            className="nav-link dropdown-toggle text-white fw-medium"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Danh mục sản phẩm
          </a>
          <ul className="dropdown-menu border-0 shadow-sm">
            {categories.map(cat => (
              <Link
                key={cat._id}
                className="dropdown-item"
                to={`/products?category=${encodeURIComponent(cat.name)}`}
              >
                {cat.name}
              </Link>
            ))}
          </ul>
        </div>

        {/* TÌM KIẾM */}
        <form className="d-flex flex-grow-1 mx-lg-3" onSubmit={handleSearch}>
          <input
            className="form-control me-2"
            type="search"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-light" type="submit">
            Search
          </button>
        </form>

        {/* MOBILE TOGGLE */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* NAVBAR CONTENT */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {/* GIỎ HÀNG */}
            <li className="nav-item">
              <Link className="nav-link text-white position-relative px-3" to="/cart">
                <i className="bi bi-cart-fill fs-5"></i>
                {cartCount > 0 && (
                  <span className="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">
                    {cartCount}
                  </span>
                )}
                <span className="d-none d-lg-inline ms-1">Giỏ hàng</span>
              </Link>
            </li>

            {/* PROFILE / ĐĂNG NHẬP */}
            {isLoggedIn ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-white px-3" to="/my-orders">
                    <i className="bi bi-box-seam fs-5"></i>
                    <span className="d-none d-lg-inline ms-1">Đơn hàng</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white px-3" to="/profile">
                    <i className="bi bi-person-circle fs-5"></i>
                    <span className="d-none d-lg-inline ms-1">Hồ sơ</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm px-3"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i> Đăng xuất
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-white px-3" to="/login">
                    <i className="bi bi-box-arrow-in-right fs-5"></i>
                    <span className="d-none d-lg-inline ms-1">Đăng nhập</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-outline-light btn-sm px-3" to="/register">
                    <i className="bi bi-person-plus"></i> Đăng ký
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;