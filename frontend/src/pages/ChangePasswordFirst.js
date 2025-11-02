// src/pages/ChangePasswordFirst.js
const ChangePasswordFirst = () => {
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirm) return alert('Mật khẩu không khớp');
    await api.post('/auth/change-password-first', { newPassword: newPass });
    alert('Đổi mật khẩu thành công!');
    navigate('/');
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card">
            <div className="card-body p-5">
              <h4 className="text-center">Đổi mật khẩu lần đầu</h4>
              <form onSubmit={handleSubmit}>
                <input className="form-control mb-3" placeholder="Mật khẩu mới" type="password" onChange={e => setNewPass(e.target.value)} required />
                <input className="form-control mb-3" placeholder="Xác nhận mật khẩu" type="password" onChange={e => setConfirm(e.target.value)} required />
                <button className="btn btn-success w-100">Xác nhận</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};