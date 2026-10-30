// Modal xem trước và cấu hình ghép cột dữ liệu Excel thông minh
import React, { useState, useEffect } from 'react';
import type { ThongTinFileExcel, CauHinhNhapExcel } from '../dich-vu/nhap-excel';
import { layDuLieuSheet, tuDongDoanCauHinh, chuyenDoiThanhHocSinh } from '../dich-vu/nhap-excel';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';

interface ModalXemTruocExcelProps {
  thongTin: ThongTinFileExcel;
  onDong: () => void;
  onXacNhan: (danhSach: HocSinh[]) => void;
}

export const ModalXemTruocExcel: React.FC<ModalXemTruocExcelProps> = ({
  thongTin,
  onDong,
  onXacNhan
}) => {
  const [sheetHienTai, setSheetHienTai] = useState<string>(thongTin.sheetNames[0] || '');
  const [bangDuLieu, setBangDuLieu] = useState<(string | number)[][]>([]);
  const [cauHinh, setCauHinh] = useState<CauHinhNhapExcel>({
    sheetName: thongTin.sheetNames[0] || '',
    dongTieuDe: 0,
    cheDoChonCot: 'mot_cot',
    cotHoTen: 0
  });

  // Khi đổi sheet hoặc load lần đầu, đọc dữ liệu và đoán cấu hình
  useEffect(() => {
    if (!sheetHienTai) return;
    const rows = layDuLieuSheet(thongTin.workbook, sheetHienTai);
    setBangDuLieu(rows);
    const doan = tuDongDoanCauHinh(rows);
    setCauHinh({
      ...doan,
      sheetName: sheetHienTai
    });
  }, [sheetHienTai, thongTin]);

  // Lấy các cột từ dòng tiêu đề để hiển thị dropdown
  const tieuDeRow = bangDuLieu[cauHinh.dongTieuDe] || [];
  const soCotToiDa = Math.max(
    ...bangDuLieu.slice(0, 10).map(r => (r ? r.length : 0)),
    tieuDeRow.length,
    1
  );

  const danhSachCot = Array.from({ length: soCotToiDa }, (_, idx) => {
    const val = tieuDeRow[idx];
    const chuCaiCot = String.fromCharCode(65 + (idx % 26));
    const nhan = val ? `${chuCaiCot} - ${String(val).trim()}` : `Cột ${chuCaiCot}`;
    return { idx, nhan };
  });

  // Danh sách học sinh xem trước
  const danhSachXemTruoc = chuyenDoiThanhHocSinh(bangDuLieu, cauHinh);

  const handleXacNhan = () => {
    if (danhSachXemTruoc.length === 0) {
      alert('Không tìm thấy dòng học sinh hợp lệ nào theo cấu hình đã chọn!');
      return;
    }
    onXacNhan(danhSachXemTruoc);
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
        maxWidth: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Tiêu đề Modal */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#38bdf8' }}>
              📊 Xem trước & Cấu hình nhập Excel
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Tệp: <b>{thongTin.tenFile}</b>
            </p>
          </div>
          <button
            onClick={onDong}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung cấu hình */}
        <div style={{ padding: '1.2rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Chọn Sheet & Dòng tiêu đề */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                1. Chọn Trang tính (Sheet):
              </label>
              <select
                value={sheetHienTai}
                onChange={(e) => setSheetHienTai(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #475569'
                }}
              >
                {thongTin.sheetNames.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                2. Dòng chứa Tiêu đề cột:
              </label>
              <select
                value={cauHinh.dongTieuDe}
                onChange={(e) => setCauHinh({ ...cauHinh, dongTieuDe: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #475569'
                }}
              >
                {Array.from({ length: Math.min(10, bangDuLieu.length) }, (_, i) => (
                  <option key={i} value={i}>Dòng {i + 1} {i === 0 ? '(Mặc định)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cách thức lấy họ tên */}
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '10px', border: '1px solid #334155' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#38bdf8', marginBottom: '8px', fontWeight: 700 }}>
              3. Cách nhận diện Họ & Tên học sinh:
            </label>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="cheDoChonCot"
                  checked={cauHinh.cheDoChonCot === 'mot_cot'}
                  onChange={() => setCauHinh({ ...cauHinh, cheDoChonCot: 'mot_cot' })}
                />
                Dùng 1 cột "Họ và Tên" đầy đủ
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="cheDoChonCot"
                  checked={cauHinh.cheDoChonCot === 'ghep_hai_cot'}
                  onChange={() => setCauHinh({
                    ...cauHinh,
                    cheDoChonCot: 'ghep_hai_cot',
                    cotHo: cauHinh.cotHo ?? 0,
                    cotTen: cauHinh.cotTen ?? (danhSachCot.length > 1 ? 1 : 0)
                  })}
                />
                Ghép 2 cột riêng (Cột Họ + Cột Tên)
              </label>
            </div>

            {cauHinh.cheDoChonCot === 'mot_cot' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Chọn cột Họ và Tên:
                </label>
                <select
                  value={cauHinh.cotHoTen ?? 0}
                  onChange={(e) => setCauHinh({ ...cauHinh, cotHoTen: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #475569'
                  }}
                >
                  {danhSachCot.map(col => (
                    <option key={col.idx} value={col.idx}>{col.nhan}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Chọn Cột Họ (Họ đệm):
                  </label>
                  <select
                    value={cauHinh.cotHo ?? 0}
                    onChange={(e) => setCauHinh({ ...cauHinh, cotHo: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #475569'
                    }}
                  >
                    {danhSachCot.map(col => (
                      <option key={col.idx} value={col.idx}>{col.nhan}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Chọn Cột Tên:
                  </label>
                  <select
                    value={cauHinh.cotTen ?? (danhSachCot.length > 1 ? 1 : 0)}
                    onChange={(e) => setCauHinh({ ...cauHinh, cotTen: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #475569'
                    }}
                  >
                    {danhSachCot.map(col => (
                      <option key={col.idx} value={col.idx}>{col.nhan}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bảng xem trước dữ liệu mẫu trích xuất được */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                👁️ Xem trước kết quả ({danhSachXemTruoc.length} học sinh tìm thấy):
              </span>
            </div>
            <div style={{
              background: '#020617',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
              maxHeight: '160px',
              overflowY: 'auto'
            }}>
              {danhSachXemTruoc.length === 0 ? (
                <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem', padding: '8px 0' }}>
                  Chưa trích xuất được học sinh nào. Vui lòng kiểm tra lại cột đã chọn!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                  {danhSachXemTruoc.slice(0, 30).map((hs, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>#{i + 1}.</span> {hs.ten}
                    </div>
                  ))}
                  {danhSachXemTruoc.length > 30 && (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      ...và còn {danhSachXemTruoc.length - 30} học sinh khác
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer nút hành động */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#090d16'
        }}>
          <button
            onClick={onDong}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleXacNhan}
            disabled={danhSachXemTruoc.length === 0}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              background: danhSachXemTruoc.length === 0
                ? '#475569'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: danhSachXemTruoc.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            Xác nhận nhập ({danhSachXemTruoc.length} học sinh)
          </button>
        </div>

      </div>
    </div>
  );
};
