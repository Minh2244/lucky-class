// Modal quản lý danh sách nhiều lớp học
import React, { useState } from 'react';
import type { LopHoc } from '../dich-vu/quan-ly-danh-sach';
import { taoLopHocMoi } from '../dich-vu/quan-ly-danh-sach';
import { xuatDanhSachHocSinhRaExcel } from '../dich-vu/sao-luu-du-lieu';

interface ModalQuanLyLopProps {
  danhSachLop: LopHoc[];
  lopHienTaiId: string;
  onChonLop: (id: string) => void;
  onThemLop: (lopMoi: LopHoc) => void;
  onXoaLop: (id: string) => void;
  onDoiTenLop: (id: string, tenMoi: string) => void;
  onDong: () => void;
}

export const ModalQuanLyLop: React.FC<ModalQuanLyLopProps> = ({
  danhSachLop,
  lopHienTaiId,
  onChonLop,
  onThemLop,
  onXoaLop,
  onDoiTenLop,
  onDong
}) => {
  const [tenLopMoi, setTenLopMoi] = useState<string>('');
  const [dangSuaId, setDangSuaId] = useState<string | null>(null);
  const [tenSua, setTenSua] = useState<string>('');

  const handleThemLop = () => {
    if (!tenLopMoi.trim()) return;
    const lop = taoLopHocMoi(tenLopMoi.trim());
    onThemLop(lop);
    setTenLopMoi('');
  };

  const handleLuuDoiTen = (id: string) => {
    if (!tenSua.trim()) return;
    onDoiTenLop(id, tenSua.trim());
    setDangSuaId(null);
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
        maxWidth: '650px',
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
              🏫 Quản Lý Các Lớp Học
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Thêm mới, đổi tên hoặc chuyển đổi lớp học đang giảng dạy
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

        {/* Thêm lớp mới */}
        <div style={{ padding: '1.2rem 1.5rem 0.5rem 1.5rem', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Nhập tên lớp học mới (VD: Lớp 10A1, Lớp 12 Tin)..."
            value={tenLopMoi}
            onChange={(e) => setTenLopMoi(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleThemLop(); }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          />
          <button
            onClick={handleThemLop}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            + Thêm lớp
          </button>
        </div>

        {/* Danh sách lớp */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danhSachLop.map((lop) => {
              const isCurrent = lop.id === lopHienTaiId;
              const isEditing = dangSuaId === lop.id;

              return (
                <div
                  key={lop.id}
                  style={{
                    background: isCurrent ? '#1e293b' : '#090d16',
                    border: isCurrent ? '2px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={tenSua}
                          onChange={(e) => setTenSua(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: '#0f172a',
                            color: '#fff',
                            border: '1px solid #38bdf8',
                            borderRadius: '6px'
                          }}
                        />
                        <button
                          onClick={() => handleLuuDoiTen(lop.id)}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setDangSuaId(null)}
                          style={{
                            background: '#475569',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: isCurrent ? '#38bdf8' : '#e2e8f0' }}>
                          {lop.tenLop}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#334155', padding: '2px 8px', borderRadius: '12px' }}>
                          {lop.danhSach.length} học sinh
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                            (Đang chọn)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onChonLop(lop.id);
                          onDong();
                        }}
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        Chọn lớp này
                      </button>
                    )}

                    <button
                      title="Xuất danh sách ra Excel"
                      onClick={() => xuatDanhSachHocSinhRaExcel(lop.tenLop, lop.danhSach)}
                      style={{
                        background: 'transparent',
                        color: '#10b981',
                        border: '1px solid #10b981',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      📊 Xuất Excel
                    </button>

                    <button
                      title="Đổi tên lớp"
                      onClick={() => {
                        setDangSuaId(lop.id);
                        setTenSua(lop.tenLop);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#94a3b8',
                        border: '1px solid #475569',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✏️
                    </button>

                    {danhSachLop.length > 1 && (
                      <button
                        title="Xóa lớp học"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa "${lop.tenLop}" không?`)) {
                            onXoaLop(lop.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#090d16'
        }}>
          <button
            onClick={onDong}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#334155',
              color: '#ffffff',
              border: 'none',
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
  );
};
