// src/pages/admin/Users.js
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Users = () => {
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users');
        
        // 3. LỌC BỎ CHÍNH ADMIN RA KHỎI DANH SÁCH
        const filteredUsers = res.data.users.filter(
          u => u._id !== user._id 
        );
        setUsers(filteredUsers);
        
      } catch (err) {
        console.error("Lỗi tải users:", err);
      }
    };
    
    // Chỉ fetch khi 'user' đã được tải
    if (user && user._id) {
      fetchUsers();
    }
  }, [user]); // Thêm 'user' vào dependency

  const toggleBan = async (id, isActive) => {
    // (logic toggleBan giữ nguyên)
    await api.put(`/admin/users/${id}/ban`, { isActive: !isActive });
    setUsers(users.map(u => u._id === id ? { ...u, isActive: !isActive } : u));
  };

  return (
    <div className="p-4">
      <h3>Quản lý người dùng</h3>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u._id.slice(-6)}</td>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>{u.isActive ? 'Hoạt động' : 'Bị cấm'}</td>
                <td>
                  <button
                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => toggleBan(u._id, u.isActive)}
                  >
                    {u.isActive ? 'Cấm' : 'Mở'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;