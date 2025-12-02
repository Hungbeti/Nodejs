// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // URL API cho Google Auth (Giả sử backend chạy trên port 5000)
  const googleAuthUrl = (api.defaults.baseURL || 'http://localhost:5000/api') + '/auth/google';
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      
      const { token, requiresPasswordChange, role } = res.data;

      if (requiresPasswordChange) {
        // Chuyển hướng đến trang đổi mật khẩu LẦN ĐẦU
        // Gửi token và role qua state để trang sau sử dụng
        navigate('/change-password-first', { 
          state: { token: token, role: role } 
        });
      } else {
        // Đăng nhập bình thường
        localStorage.setItem('token', token);
        // Tải lại trang để cập nhật trạng thái auth ở header
        navigate(role === 'admin' ? '/admin' : '/');
        window.location.reload(); 
      }
      
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-5">
              <h3 className="text-center mb-4">Chào mừng bạn đến với PC Shop</h3>
              <h5 className="text-center mb-4">Đăng nhập</h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-danger text-center">{error}</p>}
                <button type="submit" className="btn btn-primary w-100">
                  Đăng nhập
                </button>
              </form>

              <div className="text-center mt-3">
                {/* Đã đổi thành thẻ <a> để gọi API */}
                <a href={googleAuthUrl} className="btn btn-danger w-100">
                  <i className="bi bi-google"></i> Tiếp tục với Google
                </a>
              </div>

              <div className="text-center mt-3">
                <Link to="/forgot-password" className="text-decoration-none">
                  Quên mật khẩu?
                </Link>{' '}
                |{' '}
                <Link to="/register" className="text-decoration-none">
                  Chưa có tài khoản? Đăng ký tại đây
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;