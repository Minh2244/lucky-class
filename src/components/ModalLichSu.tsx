// Modal xem lại và quản lý lịch sử bốc thăm
import React from 'react';
import type { LichSuBocTham } from '../dich-vu/luu-tru';
import { xuatLichSuRaExcel } from '../dich-vu/sao-luu-du-lieu';

interface ModalLichSuProps {
  lichSu: LichSuBocTham[];
  onDong: () => void;
  onXoaLichSu: () => void;
}

export const ModalLichSu: React.FC<ModalLichSuProps> = ({
  lichSu,
  onDong,
  onXoaLichSu
}) => {
  const handleXuatExcel = async () => {
    try {
      await xuatLichSuRaExcel();
    } catch (err: unknown) {
      alert((err as Error).message || 'Có lỗi khi xuất Excel');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #334155',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#38bdf8' }}>
              📜 Lịch Sử Bốc Thăm ({lichSu.length} lượt)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Ghi nhận các lượt bốc thăm học sinh đã diễn ra
            </p>
          </div>
          <button
            onClick={onDong}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung danh sách lịch sử */}
        <div style={{ padding: '1.2rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {lichSu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontStyle: 'italic' }}>
              Chưa có lượt bốc thăm nào được ghi lại trong phiên làm việc.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lichSu.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: '#1e293b',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    border: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        background: '#0284c7',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {item.tenTroChoi}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {item.tenLop} • {new Date(item.thoiGian).toLocaleTimeString('vi-VN')} {new Date(item.thoiGian).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fef08a' }}>
                      🎉 {item.danhSachChon.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#090d16'
        }}>
          {lichSu.length > 0 ? (
            <button
              onClick={onXoaLichSu}
              style={{
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              🗑️ Xóa tất cả lịch sử
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            {lichSu.length > 0 && (
              <button
                onClick={handleXuatExcel}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                📥 Xuất Excel (.xlsx)
              </button>
            )}
            <button
              onClick={onDong}
              style={{
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
