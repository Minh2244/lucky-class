import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import type { HocSinh, LopHoc } from './dich-vu/quan-ly-danh-sach';
import {
  taoDanhSachTheoSoLuong,
  xuLyDanDanhSach,
  taoLopHocMoi,
  timTenTrungLap,
  taoId
} from './dich-vu/quan-ly-danh-sach';
import {
  layDanhSachLopHoc,
  luuLopHoc,
  xoaLopHoc,
  docCaiDat,
  luuCaiDat,
  luuLichSuBocTham,
  layLichSuBocTham,
  xoaLichSuBocTham
} from './dich-vu/luu-tru';
import type { LichSuBocTham } from './dich-vu/luu-tru';
import { phanTichFileExcel } from './dich-vu/nhap-excel';
import type { ThongTinFileExcel } from './dich-vu/nhap-excel';
import { xuatTepSaoLuuJSON, nhapTepSaoLuuJSON } from './dich-vu/sao-luu-du-lieu';
import { thucHienBocTham, layLoiChucNgauNhien } from './dich-vu/chon-ngau-nhien';
import type { KetQuaBocTham } from './dich-vu/chon-ngau-nhien';
import { amThanh } from './dich-vu/am-thanh';
import { banPhaoHoa } from './dich-vu/phao-hoa';
// Nạp danh sách và đầy đủ 6 trò chơi bốc thăm chính thức từ thư mục tro-choi
import {
  DANH_SACH_6_TRO_CHOI,
  VongQuayMayMan,
  HopBiAn,
  BiLienHoan,
  DuaDongVat,
  CauCaTimTen,
  PhongTenLua
} from './tro-choi';

// Các cửa sổ Modal
import { ModalXemTruocExcel } from './components/ModalXemTruocExcel';
import { ModalChucMung } from './components/ModalChucMung';
import { ModalLichSu } from './components/ModalLichSu';
import { ModalQuanLyLop } from './components/ModalQuanLyLop';

function App() {
  // Trạng thái giao diện & Thu phóng màn hình
  const [isBright, setIsBright] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Quản lý lớp học & Học sinh
  const [danhSachLop, setDanhSachLop] = useState<LopHoc[]>([]);
  const [lopHienTaiId, setLopHienTaiId] = useState<string>('');
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState<string>('');
  const [soLuongInput, setSoLuongInput] = useState<number>(15);
  const [textDan, setTextDan] = useState<string>('');

  // 1. Ô bấm sổ danh sách trò chơi (Bên trái)
  const [troChoiId, setTroChoiId] = useState<string>('vong-quay-may-man');
  const [dropdownTroChoiMo, setDropdownTroChoiMo] = useState<boolean>(false);

  // 2. Ô bấm sổ công cụ nhập danh sách (Bên phải - theo yêu cầu của bạn)
  const [dropdownNhapLieuMo, setDropdownNhapLieuMo] = useState<boolean>(false);
  const [tabNhapLieu, setTabNhapLieu] = useState<'so_luong' | 'dan_ten' | 'excel' | 'sao_luu'>('so_luong');

  // Trạng thái tiến trình chơi
  const [dangChoi, setDangChoi] = useState<boolean>(false);
  const [mucTieuIndex, setMucTieuIndex] = useState<number | null>(null);
  const [ketQuaHienTai, setKetQuaHienTai] = useState<KetQuaBocTham | null>(null);
  const [isFullscreenGame, setIsFullscreenGame] = useState<boolean>(false);

  // Lịch sử & các cửa sổ Modal
  const [lichSu, setLichSu] = useState<LichSuBocTham[]>([]);
  const [excelPreview, setExcelPreview] = useState<ThongTinFileExcel | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // Canvas pháo hoa giấy Confetti
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropdownTroChoiRef = useRef<HTMLDivElement | null>(null);
  const dropdownNhapLieuRef = useRef<HTMLDivElement | null>(null);

  // Lấy lớp học hiện tại
  const lopHienTai = danhSachLop.find(l => l.id === lopHienTaiId) || danhSachLop[0] || null;
  const danhSachHocSinh = lopHienTai ? lopHienTai.danhSach : [];
  const troChoiHienTai = DANH_SACH_6_TRO_CHOI.find(t => t.id === troChoiId) || DANH_SACH_6_TRO_CHOI[0];

  // Đóng các dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownTroChoiRef.current && !dropdownTroChoiRef.current.contains(event.target as Node)) {
        setDropdownTroChoiMo(false);
      }
      if (dropdownNhapLieuRef.current && !dropdownNhapLieuRef.current.contains(event.target as Node)) {
        setDropdownNhapLieuMo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lắng nghe sự kiện thoát toàn màn hình (ESC hoặc Fullscreen API)
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenGame(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenGame(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreenGame = async () => {
    const nextState = !isFullscreenGame;
    setIsFullscreenGame(nextState);
    try {
      if (nextState && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (!nextState && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Nếu trình duyệt chặn Fullscreen API vẫn giữ chế độ phóng to toàn khung nhìn CSS
    }
  };

  // Khởi động ứng dụng: Tải dữ liệu từ IndexedDB
  useEffect(() => {
    async function khoiTaoDuLieu() {
      try {
        const [savedBright, savedSound, savedZoom] = await Promise.all([
          docCaiDat<boolean>('isBright', false),
          docCaiDat<boolean>('soundEnabled', true),
          docCaiDat<number>('zoomScale', 100)
        ]);

        setIsBright(savedBright);
        setSoundEnabled(savedSound);
        amThanh.datTrangThaiAmThanh(savedSound);
        setZoomScale(savedZoom);

        let classes = await layDanhSachLopHoc();
        if (classes.length === 0) {
          const lopMacDinh = taoLopHocMoi('Lớp 10A1', taoDanhSachTheoSoLuong(15));
          await luuLopHoc(lopMacDinh);
          classes = [lopMacDinh];
        }
        setDanhSachLop(classes);

        const savedLopId = await docCaiDat<string>('lopHienTaiId', classes[0].id);
        const validId = classes.some(c => c.id === savedLopId) ? savedLopId : classes[0].id;
        setLopHienTaiId(validId);

        const history = await layLichSuBocTham();
        setLichSu(history);
      } catch (err) {
        console.error('Lỗi nạp IndexedDB:', err);
      }
    }
    khoiTaoDuLieu();
  }, []);

  // Cập nhật lớp học
  const capNhatLopHoc = async (lopMoi: LopHoc) => {
    const moi = danhSachLop.map(l => (l.id === lopMoi.id ? lopMoi : l));
    setDanhSachLop(moi);
    await luuLopHoc(lopMoi);
  };

  // Tính năng bóng đèn chọn giao diện Sáng / Tối
  const handleToggleLightbulb = async () => {
    const nextVal = !isBright;
    setIsBright(nextVal);
    await luuCaiDat('isBright', nextVal);
  };

  // Bật / tắt âm thanh
  const handleToggleSound = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    amThanh.datTrangThaiAmThanh(nextVal);
    await luuCaiDat('soundEnabled', nextVal);
  };

  // Điều khiển thu phóng giao diện màn hình
  const handleZoomChange = async (delta: number) => {
    const newZoom = Math.min(150, Math.max(70, zoomScale + delta));
    setZoomScale(newZoom);
    await luuCaiDat('zoomScale', newZoom);
  };

  const handleResetZoom = async () => {
    setZoomScale(100);
    await luuCaiDat('zoomScale', 100);
  };

  // Chọn lớp học khác
  const handleChonLop = async (id: string) => {
    setLopHienTaiId(id);
    await luuCaiDat('lopHienTaiId', id);
    setDangChoi(false);
    setMucTieuIndex(null);
  };

  // Thêm lớp mới
  const handleThemLop = async (lopMoi: LopHoc) => {
    const moi = [...danhSachLop, lopMoi];
    setDanhSachLop(moi);
    await luuLopHoc(lopMoi);
    await handleChonLop(lopMoi.id);
  };

  // Xóa lớp
  const handleXoaLop = async (id: string) => {
    const conLai = danhSachLop.filter(l => l.id !== id);
    setDanhSachLop(conLai);
    await xoaLopHoc(id);
    if (conLai.length > 0) {
      await handleChonLop(conLai[0].id);
    }
  };

  // Đổi tên lớp
  const handleDoiTenLop = async (id: string, tenMoi: string) => {
    const lop = danhSachLop.find(l => l.id === id);
    if (!lop) return;
    const capNhat = { ...lop, tenLop: tenMoi };
    await capNhatLopHoc(capNhat);
  };

  // Tạo danh sách theo số lượng
  const handleTaoTheoSoLuong = async () => {
    if (!lopHienTai) return;
    const sl = Math.max(1, soLuongInput);
    const moi: LopHoc = {
      ...lopHienTai,
      danhSach: taoDanhSachTheoSoLuong(sl)
    };
    await capNhatLopHoc(moi);
    setDropdownNhapLieuMo(false);
  };

  // Dán danh sách tên học sinh
  const handleDanTen = async () => {
    if (!lopHienTai || !textDan.trim()) return;
    const danhSachDan = xuLyDanDanhSach(textDan);
    if (danhSachDan.length === 0) {
      alert('Vui lòng dán danh sách tên học sinh hợp lệ!');
      return;
    }
    const moi: LopHoc = {
      ...lopHienTai,
      danhSach: danhSachDan
    };
    await capNhatLopHoc(moi);
    setTextDan('');
    setDropdownNhapLieuMo(false);
    alert(`Đã thêm thành công ${danhSachDan.length} học sinh!`);
  };

  // Tải file Excel và mở Modal xem trước
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const thongTin = await phanTichFileExcel(files[0]);
      setExcelPreview(thongTin);
      setDropdownNhapLieuMo(false);
    } catch {
      alert('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng tệp .xlsx hoặc .xls!');
    }
    e.target.value = '';
  };

  // Xác nhận nhập từ Modal Excel
  const handleXacNhanNhapExcel = async (danhSachMoi: HocSinh[]) => {
    if (!lopHienTai) return;
    const moi: LopHoc = {
      ...lopHienTai,
      danhSach: danhSachMoi
    };
    await capNhatLopHoc(moi);
    setExcelPreview(null);
    alert(`Đã nhập thành công ${danhSachMoi.length} học sinh vào "${lopHienTai.tenLop}"!`);
  };

  // Xóa 1 học sinh
  const handleXoaHocSinh = async (hsId: string) => {
    if (!lopHienTai) return;
    const moi: LopHoc = {
      ...lopHienTai,
      danhSach: lopHienTai.danhSach.filter(hs => hs.id !== hsId)
    };
    await capNhatLopHoc(moi);
  };

  // Thêm 1 học sinh đơn lẻ
  const handleThemHocSinhNhanh = async () => {
    const ten = prompt('Nhập họ và tên học sinh cần thêm:');
    if (!ten || !ten.trim() || !lopHienTai) return;
    const hsMoi: HocSinh = {
      id: taoId('hs-them'),
      ten: ten.trim(),
      daDuocChon: false
    };
    const moi: LopHoc = {
      ...lopHienTai,
      danhSach: [...lopHienTai.danhSach, hsMoi]
    };
    await capNhatLopHoc(moi);
  };

  // Xuất file sao lưu JSON
  const handleXuatSaoLuu = async () => {
    try {
      await xuatTepSaoLuuJSON();
      setDropdownNhapLieuMo(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Có lỗi khi xuất tệp sao lưu');
    }
  };

  // Khôi phục từ file JSON
  const handleNhapSaoLuu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const res = await nhapTepSaoLuuJSON(files[0]);
      const dsLop = await layDanhSachLopHoc();
      setDanhSachLop(dsLop);
      if (dsLop.length > 0) {
        setLopHienTaiId(dsLop[0].id);
      }
      const ls = await layLichSuBocTham();
      setLichSu(ls);
      setDropdownNhapLieuMo(false);
      alert(`Khôi phục thành công ${res.soLop} lớp học và ${res.soLichSu} lượt lịch sử!`);
    } catch (err: unknown) {
      alert('Tệp sao lưu không hợp lệ: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  // Xóa toàn bộ lịch sử
  const handleXoaTatCaLichSu = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử bốc thăm?')) {
      await xoaLichSuBocTham();
      setLichSu([]);
    }
  };

  // Bắt đầu một lượt bốc thăm (Toàn bộ học sinh luôn sẵn sàng tham gia mỗi lượt)
  const handleBatDauLuotChoi = () => {
    if (!lopHienTai || lopHienTai.danhSach.length === 0) {
      alert('Lớp học chưa có học sinh. Vui lòng thêm học sinh trước khi quay nhé!');
      return;
    }

    try {
      // Bốc 1 người, chế độ có hoàn lại (mọi bạn đều có cơ hội mỗi lượt)
      const ketQua = thucHienBocTham(lopHienTai.danhSach, 1, true);
      setKetQuaHienTai(ketQua);

      const nguoiThangDau = ketQua.danhSachChon[0];
      const targetIdx = lopHienTai.danhSach.findIndex(hs => hs.id === nguoiThangDau.id);

      setMucTieuIndex(targetIdx >= 0 ? targetIdx : 0);
      setDangChoi(true);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Khi trò chơi chạy xong hoạt ảnh
  const handleHoanThanhTroChoi = async (nguoiThangTuTroChoi?: HocSinh) => {
    setDangChoi(false);
    if (!lopHienTai) return;

    const danhSachChonCuoi = nguoiThangTuTroChoi
      ? [nguoiThangTuTroChoi]
      : (ketQuaHienTai ? ketQuaHienTai.danhSachChon : []);

    if (danhSachChonCuoi.length === 0) return;

    if (nguoiThangTuTroChoi) {
      setKetQuaHienTai({
        danhSachChon: [nguoiThangTuTroChoi],
        loiChuc: layLoiChucNgauNhien(nguoiThangTuTroChoi.ten)
      });
    }

    if (confettiCanvasRef.current) {
      banPhaoHoa(confettiCanvasRef.current, 3500);
    }

    const lichSuItem: LichSuBocTham = {
      id: taoId('ls'),
      lopHocId: lopHienTai.id,
      tenLop: lopHienTai.tenLop,
      tenTroChoi: troChoiHienTai.ten,
      danhSachChon: danhSachChonCuoi.map(hs => hs.ten),
      thoiGian: Date.now()
    };

    await luuLichSuBocTham(lichSuItem);
    setLichSu(prev => [lichSuItem, ...prev]);

    setShowCelebrationModal(true);
  };

  // Bảng màu giao diện Sáng / Tối
  const theme = {
    bg: isBright ? '#f8fafc' : '#070b14',
    cardBg: isBright ? '#ffffff' : '#0f172a',
    cardSubBg: isBright ? '#f1f5f9' : '#090d16',
    textMain: isBright ? '#0f172a' : '#f8fafc',
    textSub: isBright ? '#475569' : '#94a3b8',
    border: isBright ? '#cbd5e1' : '#1e293b',
    inputBg: isBright ? '#ffffff' : '#030712',
    inputBorder: isBright ? '#94a3b8' : '#334155',
    accent: '#38bdf8'
  };

  const danhSachHienThi = danhSachHocSinh.filter(hs =>
    hs.ten.toLowerCase().includes(tuKhoaTimKiem.toLowerCase())
  );

  const cacTenTrung = timTenTrungLap(danhSachHocSinh);

  return (
    <div
      className="app-container"
      style={{
        backgroundColor: theme.bg,
        color: theme.textMain
      }}
    >
      {/* Canvas pháo hoa giấy Confetti toàn màn hình */}
      <canvas
        ref={confettiCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9998
        }}
      />

      {/* STICKY HEADER LUÔN CỐ ĐỊNH Ở ĐỈNH MÀN HÌNH */}
      <header
        className="sticky-header"
        style={{
          background: isBright ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.94)',
          borderBottomColor: theme.border
        }}
      >
        {/* Logo & Tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '1.6rem',
            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(56, 189, 248, 0.3)'
          }}>
            🎲
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              margin: 0,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1
            }}>
              LUCKY PICK ✨
            </h1>
            <p style={{ margin: 0, fontSize: '0.72rem', color: theme.textSub }}>
              Bốc thăm học sinh tương tác trực quan
            </p>
          </div>
        </div>

        {/* Thanh công cụ: Chọn lớp, Lịch sử, BỘ ĐIỀU KHIỂN THU PHÓNG, Âm thanh, BÓNG ĐÈN SÁNG TỐI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Nút chọn lớp học */}
          <button
            onClick={() => setShowClassModal(true)}
            style={{
              background: isBright ? '#e0f2fe' : '#0369a1',
              color: isBright ? '#0369a1' : '#ffffff',
              border: `1px solid ${isBright ? '#7dd3fc' : '#0284c7'}`,
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🏫 {lopHienTai ? lopHienTai.tenLop : 'Chọn lớp'} ({danhSachHocSinh.length}) ▾
          </button>

          {/* Nút xem lịch sử */}
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: isBright ? '#f1f5f9' : '#1e293b',
              color: theme.textMain,
              border: `1px solid ${theme.border}`,
              padding: '6px 10px',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            📜 Lịch sử ({lichSu.length})
          </button>

          {/* BỘ ĐIỀU KHIỂN THU PHÓNG MÀN HÌNH */}
          <div
            className="zoom-controls"
            style={{
              background: isBright ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${theme.border}`,
              color: theme.textMain
            }}
          >
            <span style={{ fontSize: '0.75rem', color: theme.textSub, marginRight: '4px' }}>Thu phóng:</span>
            <button
              onClick={() => handleZoomChange(-10)}
              title="Thu nhỏ giao diện"
              className="zoom-btn"
              style={{ color: theme.textMain }}
            >
              -
            </button>
            <button
              onClick={handleResetZoom}
              title="Bấm để đặt lại 100%"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#38bdf8',
                padding: '0 4px'
              }}
            >
              {zoomScale}%
            </button>
            <button
              onClick={() => handleZoomChange(10)}
              title="Phóng to giao diện"
              className="zoom-btn"
              style={{ color: theme.textMain }}
            >
              +
            </button>
          </div>

          {/* Nút bật/tắt âm thanh */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            style={{
              background: soundEnabled ? (isBright ? '#dcfce7' : '#166534') : (isBright ? '#f1f5f9' : '#1e293b'),
              color: soundEnabled ? (isBright ? '#15803d' : '#4ade80') : theme.textSub,
              border: `1px solid ${soundEnabled ? '#22c55e' : theme.border}`,
              padding: '6px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}
          >
            {soundEnabled ? '🔊 Bật' : '🔇 Tắt'}
          </button>

          {/* TÍNH NĂNG BÓNG ĐÈN CHỌN GIAO DIỆN SÁNG TỐI */}
          <button
            onClick={handleToggleLightbulb}
            className="lightbulb-btn"
            title={isBright ? 'Chuyển sang Chế độ Tối' : 'Chuyển sang Chế độ Sáng'}
            style={{
              background: isBright
                ? 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: isBright ? '#854d0e' : '#fef08a',
              border: isBright ? '2px solid #eab308' : '2px solid #f59e0b',
              boxShadow: isBright
                ? '0 0 14px rgba(234, 179, 8, 0.45)'
                : '0 0 10px rgba(245, 158, 11, 0.35)'
            }}
          >
            <span
              className="lightbulb-icon"
              style={{
                filter: isBright ? 'drop-shadow(0 0 6px #ca8a04)' : 'none'
              }}
            >
              💡
            </span>
            <span>{isBright ? 'Đèn Sáng' : 'Bật Đèn'}</span>
          </button>
        </div>
      </header>

      {/* VÙNG NỘI DUNG CHÍNH (ÁP DỤNG THU PHÓNG ZOOM SCALE) */}
      <main
        style={{
          padding: '1rem 1.5vw',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          zoom: `${zoomScale}%`,
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div className="main-layout">

          {/* CỘT TRÁI: QUẢN LÝ DANH SÁCH HỌC SINH */}
          <div
            className="student-sidebar-card"
            style={{
              background: theme.cardBg,
              padding: '1rem',
              borderRadius: '16px',
              border: `1px solid ${theme.border}`,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              height: 'calc(100vh - 90px)',
              maxHeight: '780px',
              boxSizing: 'border-box'
            }}>
            {/* Header danh sách */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: theme.textMain }}>
                  📋 Học Sinh ({danhSachHocSinh.length})
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleThemHocSinhNhanh}
                  title="Thêm học sinh mới"
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  + Thêm
                </button>
                {danhSachHocSinh.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xóa toàn bộ học sinh lớp này?')) {
                        if (lopHienTai) capNhatLopHoc({ ...lopHienTai, danhSach: [] });
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Xóa hết
                  </button>
                )}
              </div>
            </div>

            {/* Cảnh báo tên trùng */}
            {cacTenTrung.length > 0 && (
              <div style={{
                background: isBright ? '#fef3c7' : '#451a03',
                color: isBright ? '#92400e' : '#fcd34d',
                padding: '6px 8px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                marginBottom: '8px',
                border: '1px solid #f59e0b'
              }}>
                ⚠️ Có {cacTenTrung.length} tên trùng. Hệ thống vẫn giữ nguyên các bạn.
              </div>
            )}

            {/* Ô tìm kiếm */}
            {danhSachHocSinh.length > 0 && (
              <input
                type="text"
                placeholder="🔍 Tìm kiếm tên học sinh..."
                value={tuKhoaTimKiem}
                onChange={(e) => setTuKhoaTimKiem(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textMain,
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
            )}

            {/* Danh sách học sinh cuộn dọc */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {danhSachHocSinh.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: theme.textSub, fontStyle: 'italic', fontSize: '0.82rem' }}>
                  Lớp này chưa có học sinh. Hãy bấm ô <b>"📥 Nạp Danh Sách"</b> ở trên để thêm nhé!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {danhSachHienThi.map((hs) => {
                    const viTriGoc = danhSachHocSinh.findIndex(h => h.id === hs.id) + 1;
                    return (
                      <div
                        key={hs.id}
                        style={{
                          padding: '7px 10px',
                          background: isBright ? '#f8fafc' : '#030712',
                          borderRadius: '8px',
                          border: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.78rem', minWidth: '22px' }}>
                            #{viTriGoc}
                          </span>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: theme.textMain,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {hs.ten}
                          </span>
                        </div>

                        <button
                          title="Xóa học sinh này"
                          onClick={() => handleXoaHocSinh(hs.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px',
                            fontSize: '0.85rem'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHU VỰC TRÒ CHƠI & THANH CÔNG CỤ DROPDOWN TRÊN ĐỈNH */}
          <div className="game-area-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, width: '100%' }}>

            {/* THANH ĐIỀU HƯỚNG TRÊN ĐỈNH SÂN CHƠI: 
                - BÊN TRÁI: Ô BẤM SỔ 9 TRÒ CHƠI
                - BÊN PHẢI: Ô BẤM SỔ CÁC CÔNG CỤ NHẬP LIỆU (THEO YÊU CẦU CỦA BẠN) */}
            <div
              className="top-game-toolbar"
              style={{
                background: theme.cardBg,
                padding: '0.75rem 1.2rem',
                borderRadius: '16px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
              }}>
              {/* 🎯 BÊN TRÁI: Ô BẤM SỔ RA 9 TRÒ CHƠI */}
              <div ref={dropdownTroChoiRef} className="toolbar-dropdown-wrapper" style={{ position: 'relative' }}>
                <button
                  className="toolbar-dropdown-btn"
                  onClick={() => {
                    setDropdownTroChoiMo(!dropdownTroChoiMo);
                    setDropdownNhapLieuMo(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: isBright ? '#ffffff' : '#1e293b',
                    border: `2px solid ${isBright ? '#38bdf8' : '#0284c7'}`,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    color: theme.textMain,
                    fontWeight: 800,
                    fontSize: '0.95rem'
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{troChoiHienTai.icon}</span>
                  <span style={{ color: '#38bdf8' }}>{troChoiHienTai.ten}</span>
                  <span style={{
                    background: '#10b981',
                    color: '#fff',
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}>
                    SẴN SÀNG
                  </span>
                  <span style={{ marginLeft: '4px', fontSize: '0.8rem', color: theme.textSub }}>▾ Đổi trò chơi</span>
                </button>

                {/* Danh sách 6 trò chơi sổ ra khi bấm */}
                {dropdownTroChoiMo && (
                  <div
                    className="game-selector-dropdown"
                    style={{
                      background: isBright ? '#ffffff' : '#0f172a',
                      border: `1px solid ${theme.border}`,
                      padding: '8px'
                    }}
                  >
                    <div style={{
                      padding: '4px 8px 8px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: theme.textSub,
                      textTransform: 'uppercase',
                      borderBottom: `1px solid ${theme.border}`
                    }}>
                      Chọn 1 trong 6 trò chơi bốc thăm:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {DANH_SACH_6_TRO_CHOI.map((tc) => (
                        <div
                          key={tc.id}
                          onClick={() => {
                            setTroChoiId(tc.id);
                            setDropdownTroChoiMo(false);
                            setDangChoi(false);
                            setMucTieuIndex(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: tc.id === troChoiId
                              ? (isBright ? '#e0f2fe' : '#1e293b')
                              : 'transparent',
                            border: tc.id === troChoiId ? '1px solid #38bdf8' : '1px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{tc.icon}</span>
                            <div>
                              <div style={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: tc.id === troChoiId ? '#0284c7' : theme.textMain
                              }}>
                                {tc.ten}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            background: '#10b981',
                            color: '#fff',
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}>
                            CHƠI NGAY
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 📥 BÊN PHẢI: Ô BẤM SỔ CÁC CÔNG CỤ NHẬP LIỆU (THEO YÊU CẦU CỦA BẠN) */}
              <div ref={dropdownNhapLieuRef} className="toolbar-dropdown-wrapper" style={{ position: 'relative' }}>
                <button
                  className="toolbar-dropdown-btn"
                  onClick={() => {
                    setDropdownNhapLieuMo(!dropdownNhapLieuMo);
                    setDropdownTroChoiMo(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isBright ? '#f0fdf4' : '#14532d',
                    border: '2px solid #22c55e',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
                    color: isBright ? '#15803d' : '#86efac',
                    fontWeight: 800,
                    fontSize: '0.92rem'
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>📥</span>
                  <span>Nạp Danh Sách Học Sinh</span>
                  <span style={{ fontSize: '0.8rem' }}>▾</span>
                </button>

                {/* Menu sổ ra của công cụ nhập liệu */}
                {dropdownNhapLieuMo && (
                  <div
                    className="import-selector-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      zIndex: 1000,
                      borderRadius: '14px',
                      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                      width: '380px',
                      maxWidth: '90vw',
                      background: isBright ? '#ffffff' : '#0f172a',
                      border: `1px solid ${theme.border}`,
                      padding: '12px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      paddingBottom: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: theme.textSub,
                      textTransform: 'uppercase',
                      borderBottom: `1px solid ${theme.border}`,
                      marginBottom: '10px'
                    }}>
                      Chọn phương thức thêm học sinh:
                    </div>

                    {/* 4 Tabs phương thức */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
                      <button
                        onClick={() => setTabNhapLieu('so_luong')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: tabNhapLieu === 'so_luong' ? '#0284c7' : (isBright ? '#f1f5f9' : '#1e293b'),
                          color: tabNhapLieu === 'so_luong' ? '#fff' : theme.textMain,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🔢 Số lượng
                      </button>
                      <button
                        onClick={() => setTabNhapLieu('dan_ten')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: tabNhapLieu === 'dan_ten' ? '#16a34a' : (isBright ? '#f1f5f9' : '#1e293b'),
                          color: tabNhapLieu === 'dan_ten' ? '#fff' : theme.textMain,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        📝 Dán tên
                      </button>
                      <button
                        onClick={() => setTabNhapLieu('excel')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: tabNhapLieu === 'excel' ? '#9333ea' : (isBright ? '#f1f5f9' : '#1e293b'),
                          color: tabNhapLieu === 'excel' ? '#fff' : theme.textMain,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        📊 Nhập Excel
                      </button>
                      <button
                        onClick={() => setTabNhapLieu('sao_luu')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: tabNhapLieu === 'sao_luu' ? '#475569' : (isBright ? '#f1f5f9' : '#1e293b'),
                          color: tabNhapLieu === 'sao_luu' ? '#fff' : theme.textMain,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        💾 Sao lưu JSON
                      </button>
                    </div>

                    {/* Nội dung Tab 1: Số lượng */}
                    {tabNhapLieu === 'so_luong' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={soLuongInput}
                          onChange={(e) => setSoLuongInput(Number(e.target.value))}
                          style={{
                            width: '70px',
                            padding: '7px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.inputBorder}`,
                            background: theme.inputBg,
                            color: theme.textMain,
                            textAlign: 'center',
                            fontWeight: 700
                          }}
                        />
                        <button
                          onClick={handleTaoTheoSoLuong}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          Tạo danh sách
                        </button>
                      </div>
                    )}

                    {/* Nội dung Tab 2: Dán tên */}
                    {tabNhapLieu === 'dan_ten' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          rows={3}
                          value={textDan}
                          onChange={(e) => setTextDan(e.target.value)}
                          placeholder="Mỗi học sinh một dòng&#10;Nguyễn Văn An&#10;Trần Thị Bình"
                          style={{
                            width: '100%',
                            padding: '7px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.inputBorder}`,
                            background: theme.inputBg,
                            color: theme.textMain,
                            fontSize: '0.82rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          onClick={handleDanTen}
                          style={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '7px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          Nhập danh sách vừa dán
                        </button>
                      </div>
                    )}

                    {/* Nội dung Tab 3: Excel */}
                    {tabNhapLieu === 'excel' && (
                      <div style={{ textAlign: 'center' }}>
                        <label style={{
                          display: 'block',
                          background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                          color: '#fff',
                          padding: '9px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}>
                          📁 Chọn tệp Excel (.xlsx)
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}

                    {/* Nội dung Tab 4: Sao lưu */}
                    {tabNhapLieu === 'sao_luu' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleXuatSaoLuu}
                          style={{
                            flex: 1,
                            background: '#334155',
                            color: '#f8fafc',
                            border: 'none',
                            padding: '7px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          📥 Xuất JSON
                        </button>
                        <label style={{
                          flex: 1,
                          textAlign: 'center',
                          background: '#334155',
                          color: '#f8fafc',
                          padding: '7px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.78rem'
                        }}>
                          📤 Nhập JSON
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleNhapSaoLuu}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

            {/* KHU VỰC SÂN CHƠI CHÍNH (FULL Ô GIAO DIỆN / HỖ TRỢ PHÓNG TO TOÀN MÀN HÌNH) */}
            <div
              className={`arena-card ${isFullscreenGame && troChoiId !== 'vong-quay-may-man' ? 'arena-fullscreen' : ''}`}
              style={
                isFullscreenGame && troChoiId !== 'vong-quay-may-man'
                  ? {
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 950,
                    background: '#050814',
                    padding: '10px 16px',
                    borderRadius: 0,
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    overflowY: 'auto'
                  }
                  : {
                    background: theme.cardBg,
                    padding: '0.75rem',
                    borderRadius: '20px',
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.15)',
                    minHeight: '620px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
              }
            >
              {/* 1. Vòng quay may mắn */}
              {troChoiId === 'vong-quay-may-man' && (
                <VongQuayMayMan
                  danhSach={danhSachHocSinh}
                  dangQuay={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauQuay={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                />
              )}

              {/* 2. Bi liên hoàn */}
              {troChoiId === 'bi-lien-hoan' && (
                <BiLienHoan
                  danhSach={danhSachHocSinh}
                  dangChoi={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauChoi={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                  isFullscreen={isFullscreenGame}
                  onToggleFullscreen={toggleFullscreenGame}
                />
              )}

              {/* 3. Đua động vật */}
              {troChoiId === 'dua-dong-vat' && (
                <DuaDongVat
                  danhSach={danhSachHocSinh}
                  dangChoi={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauChoi={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                  isFullscreen={isFullscreenGame}
                  onToggleFullscreen={toggleFullscreenGame}
                />
              )}

              {/* 4. Hộp quà may mắn */}
              {troChoiId === 'hop-bi-an' && (
                <HopBiAn
                  danhSach={danhSachHocSinh}
                  dangChoi={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauChoi={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                  isFullscreen={isFullscreenGame}
                  onToggleFullscreen={toggleFullscreenGame}
                />
              )}

              {/* 5. Câu cá tìm tên */}
              {troChoiId === 'cau-ca-tim-ten' && (
                <CauCaTimTen
                  danhSach={danhSachHocSinh}
                  dangChoi={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauChoi={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                  isFullscreen={isFullscreenGame}
                  onToggleFullscreen={toggleFullscreenGame}
                />
              )}

              {/* 6. Phóng tên lửa */}
              {troChoiId === 'phong-ten-lua' && (
                <PhongTenLua
                  danhSach={danhSachHocSinh}
                  dangChoi={dangChoi}
                  mucTieuIndex={mucTieuIndex}
                  onBatDauChoi={handleBatDauLuotChoi}
                  onHoanThanh={handleHoanThanhTroChoi}
                  isFullscreen={isFullscreenGame}
                  onToggleFullscreen={toggleFullscreenGame}
                />
              )}
            </div>

          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer style={{
        padding: '0.5rem 1.5vw',
        borderTop: `1px solid ${theme.border}`,
        textAlign: 'center',
        fontSize: '0.72rem',
        color: theme.textSub,
        background: theme.cardBg
      }}>
        LUCKY PICK ✨ © {new Date().getFullYear()} • Dữ liệu lưu an toàn trong trình duyệt của bạn
      </footer>

      {/* CÁC CỬA SỔ MODAL HIỂN THỊ KHI CẦN */}
      {/* 1. Modal xem trước Excel */}
      {excelPreview && (
        <ModalXemTruocExcel
          thongTin={excelPreview}
          onDong={() => setExcelPreview(null)}
          onXacNhan={handleXacNhanNhapExcel}
        />
      )}

      {/* 2. Modal Chúc Mừng Người Thắng */}
      {showCelebrationModal && ketQuaHienTai && (
        <ModalChucMung
          danhSachNguoiThang={ketQuaHienTai.danhSachChon}
          loiChuc={ketQuaHienTai.loiChuc}
          onTiepTuc={() => {
            setShowCelebrationModal(false);
            handleBatDauLuotChoi();
          }}
          onDong={() => setShowCelebrationModal(false)}
        />
      )}

      {/* 3. Modal Lịch Sử Bốc Thăm */}
      {showHistoryModal && (
        <ModalLichSu
          lichSu={lichSu}
          onDong={() => setShowHistoryModal(false)}
          onXoaLichSu={handleXoaTatCaLichSu}
        />
      )}

      {/* 4. Modal Quản Lý Các Lớp Học */}
      {showClassModal && (
        <ModalQuanLyLop
          danhSachLop={danhSachLop}
          lopHienTaiId={lopHienTaiId}
          onChonLop={handleChonLop}
          onThemLop={handleThemLop}
          onXoaLop={handleXoaLop}
          onDoiTenLop={handleDoiTenLop}
          onDong={() => setShowClassModal(false)}
        />
      )}

    </div>
  );
}

export default App;
