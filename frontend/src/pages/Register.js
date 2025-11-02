// src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const [form, setForm] = useState({ email: '', address: '', name: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/register', form);
      setMessage('Đăng ký thành công! Mật khẩu đã được gửi về email. Vui lòng đổi mật khẩu khi đăng nhập lần đầu.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-5">
              <h3 className="text-center mb-4">Chào mừng bạn đến với PC Shop</h3>
              <h5 className="text-center mb-4">Đăng ký</h5>

              {message && <div className="alert alert-success text-center">{message}</div>}
              {error && <div className="alert alert-danger text-center">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input name="email" type="email" className="form-control" onChange={handleChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Địa chỉ</label>
                  <input name="address" type="text" className="form-control" onChange={handleChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Họ tên</label>
                  <input name="name" type="text" className="form-control" onChange={handleChange} required />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Đăng ký
                </button>
              </form>

              <div className="text-center mt-3">
                <button className="btn btn-danger w-100">
                  Tiếp tục với Google
                </button>
              </div>

              <div className="text-center mt-3">
                <Link to="/login" className="text-decoration-none">
                  Đã có tài khoản? Đăng nhập tại đây
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;