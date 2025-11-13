// src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';

// === TẠO COMPONENT MỚI CHO ĐỔI MẬT KHẨU ===
const ChangePasswordForm = () => {
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError('Mật khẩu mới không khớp');
    }
    if (passwords.newPassword.length < 6) {
      return setError('Mật khẩu mới ít nhất 6 ký tự');
    }

    try {
      // (API này đã tồn tại trong userRoutes.js)
      const { data } = await api.put('/profile/password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      setMessage(data.msg);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' }); // Reset form
    } catch (err) {
      setError(err.response?.data?.msg || 'Lỗi cập nhật');
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-body">
        <h4>Thay đổi mật khẩu</h4>
        <hr />
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Mật khẩu cũ</label>
            <input 
              type="password"
              name="oldPassword"
              className="form-control"
              value={passwords.oldPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Mật khẩu mới</label>
            <input 
              type="password"
              name="newPassword"
              className="form-control"
              value={passwords.newPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Xác nhận mật khẩu mới</label>
            <input 
              type="password"
              name="confirmPassword"
              className="form-control"
              value={passwords.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Lưu mật khẩu mới</button>
        </form>
      </div>
    </div>
  );
};

const Profile = () => {
  const [profile, setProfile] = useState({ name: '', email: '', addresses: [], loyaltyPoints: 0 });
  const [loading, setLoading] = useState(true);
  
  // State cho việc chỉnh sửa
  const [editName, setEditName] = useState('');
  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', addressLine: '' });

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setProfile(data);
      setEditName(data.name); // Đặt tên ban đầu
    } catch (err) {
      console.error('Lỗi tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // HÀM: Cập nhật tên
  const handleUpdateName = async (e) => {
    e.preventDefault();
    try {
      await api.put('/profile', { name: editName });
      alert('Cập nhật tên thành công!');
      fetchProfile(); // Tải lại
    } catch (err) {
      alert('Lỗi cập nhật tên');
    }
  };

  // HÀM: Thêm địa chỉ
  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await api.post('/profile/address', newAddress);
      alert('Thêm địa chỉ thành công!');
      setNewAddress({ fullName: '', phone: '', addressLine: '' }); // Reset form
      fetchProfile(); // Tải lại
    } catch (err) {
      alert('Lỗi thêm địa chỉ');
    }
  };

  // HÀM: Xóa địa chỉ
  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      try {
        await api.delete(`/profile/address/${addressId}`);
        alert('Xóa thành công!');
        fetchProfile(); // Tải lại
      } catch (err) {
        alert('Lỗi xóa địa chỉ');
      }
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="container mt-4">
      <div className="row">
        {/* === CỘT TRÁI (THÔNG TIN) === */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <i className="bi bi-person-circle display-1 text-primary"></i>
              <h4 className="mt-3">{profile.name}</h4>
              <p className="text-muted">{profile.email}</p>
            </div>
          </div>
          <div className="card mt-4">
            <div className="card-body text-center">
              <h5 className="text-muted">Điểm thân thiết</h5>
              <h3 className="text-success fw-bold">{profile.loyaltyPoints.toLocaleString()} điểm</h3>
              {/* SỬA LỖI TÍNH ĐIỂM: 1 điểm = 1000đ */}
              <small>(Tương đương {(profile.loyaltyPoints * 1000).toLocaleString()} VND)</small>
            </div>
          </div>
          {/* === THÊM CARD ĐỔI MẬT KHẨU === */}
          <ChangePasswordForm />
        </div>

        {/* === CỘT PHẢI (QUẢN LÝ) === */}
        <div className="col-md-8">
          {/* CẬP NHẬT HỌ TÊN */}
          <div className="card mb-4">
            <div className="card-body">
              <h4>Thông tin tài khoản</h4>
              <hr />
              <form onSubmit={handleUpdateName}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={profile.email} readOnly disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label">Họ tên</label>
                  <input 
                    className="form-control" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-primary">Lưu thay đổi tên</button>
              </form>
            </div>
          </div>

          {/* QUẢN LÝ ĐỊA CHỈ */}
          <div className="card">
            <div className="card-body">
              <h4>Sổ địa chỉ</h4>
              <hr />
              {/* DANH SÁCH ĐỊA CHỈ */}
              {profile.addresses.map((addr) => (
                <div key={addr._id} className="card bg-light p-3 mb-2">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{addr.fullName}</strong> | {addr.phone}
                      <p className="mb-0 text-muted">{addr.addressLine}</p>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteAddress(addr._id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
              
              {/* THÊM ĐỊA CHỈ MỚI */}
              <h5 className="mt-4">Thêm địa chỉ mới</h5>
              <form onSubmit={handleAddAddress}>
                <input 
                  className="form-control mb-2" 
                  placeholder="Họ tên" 
                  value={newAddress.fullName} 
                  onChange={(e) => setNewAddress({...newAddress, fullName: e.target.value})} 
                  required 
                />
                <input 
                  className="form-control mb-2" 
                  placeholder="Số điện thoại" 
                  value={newAddress.phone} 
                  onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} 
                  required 
                />
                <textarea 
                  className="form-control mb-2" 
                  placeholder="Địa chỉ chi tiết" 
                  value={newAddress.addressLine} 
                  onChange={(e) => setNewAddress({...newAddress, addressLine: e.target.value})} 
                  required 
                />
                <button type="submit" className="btn btn-success">Thêm địa chỉ</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;