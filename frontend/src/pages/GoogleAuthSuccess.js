// src/pages/GoogleAuthSuccess.js
import { useEffect } from 'react';
// Chỉ cần import useSearchParams
import { useSearchParams } from 'react-router-dom'; 

/**
 * Hàm giải mã payload của JWT một cách an toàn (xử lý Base64URL)
 */
const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      throw new Error('Invalid token: Missing payload');
    }
    
    // 1. Thay thế ký tự Base64URL bằng ký tự Base64 chuẩn
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // 2. Thêm đệm '=' nếu cần
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // 3. Giải mã
    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};


const GoogleAuthSuccess = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      try {
        const payload = decodeJwtPayload(token);
        
        if (payload && payload.role) {
          // 1. Lưu token
          localStorage.setItem('token', token);
          
          // 2. Điều hướng và tải lại trang
          window.location.href = payload.role === 'admin' ? '/admin' : '/';

        } else {
          // Payload không hợp lệ hoặc không có role
          window.location.href = '/login?error=invalid_token';
        }
      } catch (error) {
        // Lỗi trong quá trình xử lý
        console.error('Google auth processing error:', error);
        
        // SỬA LỖI Ở ĐÂY:
        // Thay thế: navigate('/login?error=processing_failed');
        // Bằng:
        window.location.href = '/login?error=processing_failed';
      }
    } else {
      // Không tìm thấy token trên URL
      window.location.href = '/login?error=failed';
    }
  }, [searchParams]); // Xóa navigate khỏi dependency array

  return <div>Đang xử lý đăng nhập Google...</div>;
};

export default GoogleAuthSuccess;