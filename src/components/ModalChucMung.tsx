// Modal công bố kết quả bốc thăm và lời chúc mừng sinh động
import React from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';

interface ModalChucMungProps {
  danhSachNguoiThang: HocSinh[];
  loiChuc: string;
  onTiepTuc: () => void;
  onDong: () => void;
}

export const ModalChucMung: React.FC<ModalChucMungProps> = ({
  danhSachNguoiThang,
  loiChuc,
  onTiepTuc,
  onDong
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        border: '2px solid #fbbf24',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        maxWidth: '550px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 0 50px rgba(251, 191, 36, 0.35)',
        animation: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        {/* Biểu tượng cúp vàng */}
        <div style={{ fontSize: '3.6rem', marginBottom: '0.4rem', filter: 'drop-shadow(0 0 15px #f59e0b)' }}>
          🏆
        </div>

        {/* Tiêu đề thống nhất cho tất cả các trò chơi */}
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 900,
          color: '#38bdf8',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '0.6rem'
        }}>
          🎉 CHÚC MỪNG BẠN MAY MẮN... 🎉
        </div>

        {/* Tên học sinh may mắn */}
        <div style={{ marginBottom: '1.2rem' }}>
          {danhSachNguoiThang.map((hs) => (
            <div
              key={hs.id}
              style={{
                fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.02em',
                marginBottom: '6px'
              }}
            >
              {hs.ten}
            </div>
          ))}
        </div>

        {/* Lời chúc khích lệ */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1rem',
          color: '#e2e8f0',
          fontSize: '1rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-line',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {loiChuc}
        </div>

        {/* Các nút điều hướng */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onTiepTuc}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '25px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            🎯 Chọn người tiếp theo
          </button>

          <button
            onClick={onDong}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '12px 24px',
              borderRadius: '25px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Đóng lại
          </button>
        </div>

      </div>
    </div>
  );
};
