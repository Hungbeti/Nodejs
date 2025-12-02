// src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

// ... (Giữ nguyên ChangePasswordForm) ...
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
      const { data } = await api.put('/profile/password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      setMessage(data.msg);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' }); 
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
  
  const [editName, setEditName] = useState('');
  
  // State dùng chung cho Thêm và Sửa
  const [addressForm, setAddressForm] = useState({ fullName: '', phone: '', addressLine: '' });
  const [editingAddressId, setEditingAddressId] = useState(null); // ID đang sửa (null = thêm mới)

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setProfile(data);
      setEditName(data.name);
    } catch (err) {
      console.error('Lỗi tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    try {
      await api.put('/profile', { name: editName });
      toast.success('Cập nhật tên thành công!');
      fetchProfile();
    } catch (err) {
      toast.error('Lỗi cập nhật tên');
    }
  };

  // === HÀM: CHUẨN BỊ SỬA ===
  const handleEditClick = (addr) => {
    setAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine: addr.addressLine
    });
    setEditingAddressId(addr._id); // Chuyển sang chế độ sửa
    // Cuộn xuống form (UX)
    const formElement = document.getElementById('address-form-anchor');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  // === HÀM: HỦY SỬA ===
  const handleCancelEdit = () => {
    setAddressForm({ fullName: '', phone: '', addressLine: '' });
    setEditingAddressId(null);
  };

  // === HÀM: XỬ LÝ SUBMIT (THÊM HOẶC SỬA) ===
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddressId) {
        // API PUT (Cập nhật)
        await api.put(`/profile/address/${editingAddressId}`, addressForm);
        toast.success('Cập nhật địa chỉ thành công!');
      } else {
        // API POST (Thêm mới)
        await api.post('/profile/address', addressForm);
        toast.success('Thêm địa chỉ thành công!');
      }
      handleCancelEdit(); // Reset form
      fetchProfile(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Lỗi xử lý địa chỉ');
    }
  };

  // === HÀM: ĐẶT LÀM MẶC ĐỊNH ===
  const handleSetDefault = async (addr) => {
    try {
      // Gọi API update với isDefault = true
      // Backend sẽ tự động set false cho các địa chỉ còn lại
      await api.put(`/profile/address/${addr._id}`, { 
        ...addr, // Giữ nguyên thông tin cũ
        isDefault: true 
      });
      toast.success('Đã đặt làm địa chỉ mặc định');
      fetchProfile();
    } catch (err) {
      toast.error('Lỗi cập nhật mặc định');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      try {
        await api.delete(`/profile/address/${addressId}`);
        toast.success('Xóa thành công!');
        fetchProfile();
      } catch (err) {
        toast.error('Lỗi xóa địa chỉ');
      }
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="container mt-4">
      <div className="row">
        {/* CỘT TRÁI */}
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
              <small>(Tương đương {(profile.loyaltyPoints * 1000).toLocaleString()} VND)</small>
            </div>
          </div>
          <ChangePasswordForm />
        </div>

        {/* CỘT PHẢI */}
        <div className="col-md-8">
          {/* THÔNG TIN TÀI KHOẢN */}
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

          {/* SỔ ĐỊA CHỈ */}
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Sổ địa chỉ</h4>
                {/* Nút tắt nhanh để nhảy xuống form thêm mới */}
                <button className="btn btn-sm btn-outline-primary" onClick={() => {
                    handleCancelEdit();
                    document.getElementById('address-form-anchor').scrollIntoView({ behavior: 'smooth' });
                }}>
                    + Thêm mới
                </button>
              </div>
              <hr />
              
              {/* DANH SÁCH */}
              {profile.addresses.map((addr) => (
                <div key={addr._id} className={`card p-3 mb-3 ${addr.isDefault ? 'border-success' : 'bg-light'}`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{addr.fullName}</strong> | {addr.phone}
                      <p className="mb-1 text-muted">{addr.addressLine}</p>
                      
                      {addr.isDefault ? (
                        <span className="badge bg-success">Mặc định</span>
                      ) : (
                        <button 
                            className="btn btn-link p-0 text-decoration-none small"
                            onClick={() => handleSetDefault(addr)}
                        >
                            Đặt làm mặc định
                        </button>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditClick(addr)}
                      >
                        <i className="bi bi-pencil"></i> Sửa
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteAddress(addr._id)}
                      >
                        <i className="bi bi-trash"></i> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* FORM NHẬP LIỆU */}
              <div id="address-form-anchor" className="mt-4 pt-3 border-top">
                <h5>{editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h5>
                <form onSubmit={handleAddressSubmit}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Họ tên người nhận</label>
                            <input 
                              className="form-control" 
                              value={addressForm.fullName} 
                              onChange={(e) => setAddressForm({...addressForm, fullName: e.target.value})} 
                              required 
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Số điện thoại</label>
                            <input 
                              className="form-control" 
                              value={addressForm.phone} 
                              onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} 
                              required 
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Địa chỉ chi tiết</label>
                        <textarea 
                          className="form-control" 
                          rows="2"
                          value={addressForm.addressLine} 
                          onChange={(e) => setAddressForm({...addressForm, addressLine: e.target.value})} 
                          required 
                        />
                    </div>
                    
                    <div className="d-flex gap-2">
                        <button type="submit" className={`btn ${editingAddressId ? 'btn-warning' : 'btn-success'}`}>
                            {editingAddressId ? 'Lưu cập nhật' : 'Thêm địa chỉ'}
                        </button>
                        {editingAddressId && (
                            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                                Hủy bỏ
                            </button>
                        )}
                    </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;