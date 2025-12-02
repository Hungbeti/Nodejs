// src/pages/ChangePasswordFirst.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ChangePasswordFirst = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { state } = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!state || !state.token) {
        setError('Phiên làm việc không hợp lệ. Vui lòng đăng nhập lại.');
        return;
    }
    if (password !== confirm) return setError('Mật khẩu không khớp');
    if (password.length < 6) return setError('Mật khẩu ít nhất 6 ký tự');

    try {
      // Gửi token trong body, khớp với backend controller
      await api.post('/auth/change-password-first', { 
        token: state.token, 
        newPassword: password 
      });
      
      // Đổi mật khẩu thành công, lưu token và chuyển hướng
      localStorage.setItem('token', state.token);
      window.location.href = state.role === 'admin' ? '/admin' : '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card">
            <div className="card-body p-5">
              <h4 className="text-center mb-4">Đổi mật khẩu lần đầu</h4>
              <p className="text-center text-muted mb-4">
                Đây là lần đăng nhập đầu tiên, vui lòng tạo mật khẩu mới.
              </p>
              <form onSubmit={handleSubmit}>
                <input
                  type="password"
                  className="form-control mb-3"
                  placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="form-control mb-3"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
                {error && <p className="text-danger text-center">{error}</p>}
                <button className="btn btn-primary w-100">Xác nhận</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordFirst;