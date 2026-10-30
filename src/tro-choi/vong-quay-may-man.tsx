// Trò chơi: Vòng Quay May Mắn (Canvas 2D sắc nét, tự co giãn theo mọi màn hình, âm thanh tick & pháo hoa chúc mừng)
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface VongQuayMayManProps {
  danhSach: HocSinh[];
  dangQuay: boolean;
  mucTieuIndex: number | null; // Vị trí người thắng đã được xác định trước
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  onBatDauQuay: () => void;
}

const BANG_MAU = [
  '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#d946ef', '#3b82f6'
];

export const VongQuayMayMan: React.FC<VongQuayMayManProps> = ({
  danhSach,
  dangQuay,
  mucTieuIndex,
  onHoanThanh,
  onBatDauQuay
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gocHienTaiRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);
  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  // Độ phân giải vẽ canvas nội bộ sắc nét
  const CANVAS_SIZE = 520;

  // Lọc các học sinh tham gia (dùng useMemo tránh tạo mảng mới mỗi lần cha re-render)
  const ungVien = useMemo<HocSinh[]>(
    () => (danhSach.length > 0 ? danhSach : [{ id: 'empty', ten: 'Chưa có dữ liệu' }]),
    [danhSach]
  );
  const ungVienRef = useRef<HocSinh[]>(ungVien);
  useEffect(() => {
    ungVienRef.current = ungVien;
  }, [ungVien]);

  // Vẽ toàn bộ vòng quay
  const veVongQuay = useCallback((gocXoay: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = CANVAS_SIZE;
    const center = size / 2;
    const radius = center - 26;

    ctx.clearRect(0, 0, size, size);

    const tongSo = ungVien.length;
    const gocPhan = (Math.PI * 2) / tongSo;

    // 1. Vẽ bóng đổ viền ngoài
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    ctx.restore();

    // 2. Vẽ vành đai viền ngoài
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.restore();

    // 3. Vẽ từng nan quạt
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(gocXoay);

    for (let i = 0; i < tongSo; i++) {
      const batDauGoc = i * gocPhan;
      const ketThucGoc = batDauGoc + gocPhan;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, batDauGoc, ketThucGoc);
      ctx.closePath();

      ctx.fillStyle = BANG_MAU[i % BANG_MAU.length];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Vẽ tên học sinh trên nan quạt
      ctx.save();
      ctx.rotate(batDauGoc + gocPhan / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, Math.min(18, 300 / Math.max(1, Math.sqrt(tongSo))))}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;

      const ten = ungVien[i].ten;
      const tenRutGon = ten.length > 18 ? ten.slice(0, 16) + '...' : ten;
      ctx.fillText(tenRutGon, radius - 22, 0);
      ctx.restore();
    }

    ctx.restore();

    // 4. Vẽ các đinh ốc trang trí xung quanh vành
    const soDinhOc = Math.min(36, Math.max(12, tongSo));
    for (let i = 0; i < soDinhOc; i++) {
      const gocDinh = (i * (Math.PI * 2)) / soDinhOc + gocXoay;
      const ox = center + (radius + 4) * Math.cos(gocDinh);
      const oy = center + (radius + 4) * Math.sin(gocDinh);
      ctx.beginPath();
      ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    }

    // 5. Vẽ trục tâm trung tâm
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();

    // 6. Vẽ kim chỉ ở góc trên cùng
    ctx.save();
    ctx.translate(center, center - radius + 12);
    ctx.beginPath();
    ctx.moveTo(-16, -24);
    ctx.lineTo(16, -24);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.restore();
  }, [ungVien]);

  const veVongQuayRef = useRef(veVongQuay);
  useEffect(() => {
    veVongQuayRef.current = veVongQuay;
  }, [veVongQuay]);

  // Vẽ lần đầu hoặc khi danh sách thay đổi (khi không đang quay)
  useEffect(() => {
    if (!dangQuay) {
      veVongQuay(gocHienTaiRef.current);
    }
  }, [veVongQuay, dangQuay]);

  // Xử lý hiệu ứng quay khi dangQuay = true và có mucTieuIndex
  // Chỉ phụ thuộc vào [dangQuay, mucTieuIndex] để khi mở menu trò chơi bên ngoài KHÔNG bao giờ làm quay lại từ đầu
  useEffect(() => {
    const ds = ungVienRef.current;
    if (!dangQuay || mucTieuIndex === null || ds.length === 0) return;

    const tongSo = ds.length;
    const gocPhan = (Math.PI * 2) / tongSo;

    const gocNanMucTieu = mucTieuIndex * gocPhan + gocPhan / 2;
    const gocDichKim = (Math.PI * 3) / 2;

    const soVong = 10 + Math.floor(Math.random() * 3);
    const gocBatDau = gocHienTaiRef.current % (Math.PI * 2);
    let gocDich = (gocDichKim - gocNanMucTieu) % (Math.PI * 2);
    if (gocDich < 0) gocDich += Math.PI * 2;

    const tongGocQuay = soVong * Math.PI * 2 + (gocDich - gocBatDau + Math.PI * 2) % (Math.PI * 2);
    const thoiGianQuayMs = 15000;
    const startTime = performance.now();

    const animateSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / thoiGianQuayMs);

      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      const gocHienTai = gocBatDau + tongGocQuay * easeOut;
      gocHienTaiRef.current = gocHienTai;

      const currentSlice = Math.floor((gocHienTai / gocPhan) % tongSo);
      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
        amThanh.phatTiengTick();
      }

      veVongQuayRef.current(gocHienTai);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateSpin);
      } else {
        amThanh.phatTiengChucMung();
        onHoanThanhRef.current(ds[mucTieuIndex]);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateSpin);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [dangQuay, mucTieuIndex]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        aspectRatio: '1 / 1',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: dangQuay ? 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.45))' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
        transition: 'filter 0.3s ease'
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain'
          }}
        />
      </div>

      <div style={{ marginTop: '1.2rem' }}>
        <button
          onClick={onBatDauQuay}
          disabled={dangQuay || danhSach.length === 0}
          style={{
            background: dangQuay
              ? '#64748b'
              : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 42px',
            fontSize: '1.15rem',
            fontWeight: 800,
            borderRadius: '30px',
            cursor: (dangQuay || danhSach.length === 0) ? 'not-allowed' : 'pointer',
            boxShadow: dangQuay ? 'none' : '0 6px 20px rgba(245, 158, 11, 0.45)',
            transform: dangQuay ? 'scale(0.96)' : 'scale(1)',
            transition: 'all 0.2s',
            letterSpacing: '0.04em'
          }}
        >
          {dangQuay ? 'Đang quay...' : 'QUAY NGAY 🎯'}
        </button>
      </div>
    </div>
  );
};
