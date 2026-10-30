// Trò chơi: Hộp Quà May Mắn (Phong bì bí ẩn ✉️ ẩn tên tuyệt đối khi bỏ vào hộp -> Gom hộp vào tâm xoáy tròn ảo thuật -> Bay tỏa ra hiện số #1, #2...)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface HopBiAnProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  onBatDauChoi: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type GiaiDoanHop = 'waiting' | 'packing' | 'shuffling' | 'ready';

const BANG_MAU_HOP_3D: {
  thanChinh: string;
  thanToi: string;
  napHop: string;
  ruyBang: string;
  vienSang: string;
}[] = [
  {
    thanChinh: 'linear-gradient(145deg, #ef4444 0%, #b91c1c 100%)',
    thanToi: '#7f1d1d',
    napHop: 'linear-gradient(145deg, #f87171 0%, #dc2626 100%)',
    ruyBang: 'linear-gradient(90deg, #fde047 0%, #f59e0b 50%, #fef08a 100%)',
    vienSang: '#fca5a5'
  },
  {
    thanChinh: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)',
    thanToi: '#1e3a8a',
    napHop: 'linear-gradient(145deg, #60a5fa 0%, #2563eb 100%)',
    ruyBang: 'linear-gradient(90deg, #fef08a 0%, #eab308 50%, #ffffff 100%)',
    vienSang: '#93c5fd'
  },
  {
    thanChinh: 'linear-gradient(145deg, #8b5cf6 0%, #5b21b6 100%)',
    thanToi: '#3b0764',
    napHop: 'linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)',
    ruyBang: 'linear-gradient(90deg, #fbcfe8 0%, #f472b6 50%, #fdf2f8 100%)',
    vienSang: '#c4b5fd'
  },
  {
    thanChinh: 'linear-gradient(145deg, #10b981 0%, #047857 100%)',
    thanToi: '#064e3b',
    napHop: 'linear-gradient(145deg, #34d399 0%, #059669 100%)',
    ruyBang: 'linear-gradient(90deg, #fde047 0%, #ca8a04 50%, #fef08a 100%)',
    vienSang: '#6ee7b7'
  },
  {
    thanChinh: 'linear-gradient(145deg, #ec4899 0%, #be185d 100%)',
    thanToi: '#831843',
    napHop: 'linear-gradient(145deg, #f472b6 0%, #db2777 100%)',
    ruyBang: 'linear-gradient(90deg, #fef08a 0%, #f59e0b 50%, #ffffff 100%)',
    vienSang: '#f9a8d4'
  },
  {
    thanChinh: 'linear-gradient(145deg, #f59e0b 0%, #b45309 100%)',
    thanToi: '#78350f',
    napHop: 'linear-gradient(145deg, #fbbf24 0%, #d97706 100%)',
    ruyBang: 'linear-gradient(90deg, #ffffff 0%, #e2e8f0 50%, #ffffff 100%)',
    vienSang: '#fde68a'
  },
  {
    thanChinh: 'linear-gradient(145deg, #06b6d4 0%, #0e7490 100%)',
    thanToi: '#164e63',
    napHop: 'linear-gradient(145deg, #22d3ee 0%, #0891b2 100%)',
    ruyBang: 'linear-gradient(90deg, #fde047 0%, #eab308 50%, #fef08a 100%)',
    vienSang: '#67e8f9'
  }
];

interface HopQuaItem {
  id: string;
  soThuTu: number;
  hocSinh: HocSinh;
  mauIndex: number;
  daMo: boolean;
  dangMo: boolean;
  offsetX: number;
  offsetY: number;
  rotateDeg: number;
  scaleVal: number;
}

export const HopBiAn: React.FC<HopBiAnProps> = ({
  danhSach,
  onHoanThanh,
  onBatDauChoi,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [phase, setPhase] = useState<GiaiDoanHop>('waiting');
  const [danhSachHop, setDanhSachHop] = useState<HopQuaItem[]>([]);
  const [dangXuLyMo, setDangXuLyMo] = useState<boolean>(false);
  const [envelopeDropped, setEnvelopeDropped] = useState<boolean>(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Tạo danh sách hộp ban đầu ở trạng thái chờ (Chưa hiện số, chưa bỏ phiếu)
  const khoiTaoSanKhauCho = useCallback(() => {
    clearAllTimers();
    if (danhSach.length === 0) {
      setDanhSachHop([]);
      setPhase('waiting');
      return;
    }

    const cacHop: HopQuaItem[] = danhSach.map((hs, idx) => ({
      id: `hop-slot-${idx}`,
      soThuTu: idx + 1,
      hocSinh: hs,
      mauIndex: idx % BANG_MAU_HOP_3D.length,
      daMo: false,
      dangMo: false,
      offsetX: 0,
      offsetY: 0,
      rotateDeg: 0,
      scaleVal: 1
    }));

    setDanhSachHop(cacHop);
    setDangXuLyMo(false);
    setEnvelopeDropped(false);
    setPhase('waiting');
  }, [danhSach]);

  useEffect(() => {
    khoiTaoSanKhauCho();
  }, [khoiTaoSanKhauCho]);

  // Tính tọa độ dịch chuyển từ ô lưới về vòng xoáy trung tâm sân khấu
  const tinhToaDoXoayTam = useCallback((angleOffsetRad: number, radiusScale = 1) => {
    const gridEl = gridRef.current;
    if (!gridEl) return null;
    const gridRect = gridEl.getBoundingClientRect();
    const centerX = gridRect.left + gridRect.width / 2;
    const centerY = gridRect.top + gridRect.height / 2;
    const orbitR = Math.min(gridRect.width * 0.28, gridRect.height * 0.32, 145) * radiusScale;

    return { centerX, centerY, orbitR, angleOffsetRad };
  }, []);

  // QUY TRÌNH: PHONG BÌ BÍ ẨN BAY VÀO HỘP (ẨN TÊN) -> GOM HỘP VÀO GIỮA XOÁY TRÒN -> TỎA RA ĐỔI VỊ TRÍ -> HIỆN SỐ
  const batDauBoTenVaXaoTron = useCallback(() => {
    if (danhSach.length === 0) return;
    clearAllTimers();
    setDangXuLyMo(false);
    setEnvelopeDropped(false);

    // Xáo trộn ngẫu nhiên 100% bằng thuật toán Fisher-Yates
    const dsNgauNhien = [...danhSach];
    for (let i = dsNgauNhien.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dsNgauNhien[i], dsNgauNhien[j]] = [dsNgauNhien[j], dsNgauNhien[i]];
    }

    // Bước 1: Mở nắp các hộp và thả Phong Bì Bí Ẩn (ẩn hoàn toàn tên học sinh) vào hộp
    setPhase('packing');
    amThanh.phatTiengMoHop();

    setDanhSachHop(
      dsNgauNhien.map((hs, idx) => ({
        id: `hop-slot-${idx}`,
        soThuTu: idx + 1,
        hocSinh: hs,
        mauIndex: idx % BANG_MAU_HOP_3D.length,
        daMo: false,
        dangMo: false,
        offsetX: 0,
        offsetY: 0,
        rotateDeg: 0,
        scaleVal: 1
      }))
    );

    // Cho phong bì bí ẩn rơi lọt vào trong lòng hộp sau 120ms
    const tDrop = window.setTimeout(() => {
      setEnvelopeDropped(true);
    }, 120);
    timersRef.current.push(tDrop);

    // Bước 2: Sau 1.15s nắp hộp đóng lại -> Tất cả hộp thu gom về tâm và xoáy tròn ảo thuật!
    const tStartVortex = window.setTimeout(() => {
      setPhase('shuffling');
      amThanh.phatTiengTick();

      // Đợt 1 (0ms): Gom tất cả hộp từ lưới vào vòng tròn ở tâm sân khấu
      const applyVortexStep = (spinStep: number, radiusFactor: number) => {
        const info = tinhToaDoXoayTam(spinStep * 2.2, radiusFactor);
        if (!info) return;
        const { centerX, centerY, orbitR, angleOffsetRad } = info;

        setDanhSachHop(prev => {
          const total = Math.max(1, prev.length);
          return prev.map((h, idx) => {
            const el = boxRefs.current[idx];
            if (!el) return h;
            const rect = el.getBoundingClientRect();
            const currentBoxCenterX = rect.left + rect.width / 2 - h.offsetX;
            const currentBoxCenterY = rect.top + rect.height / 2 - h.offsetY;

            const angle = (idx / total) * Math.PI * 2 + angleOffsetRad;
            const targetX = centerX + Math.cos(angle) * orbitR;
            const targetY = centerY + Math.sin(angle) * (orbitR * 0.68);

            return {
              ...h,
              offsetX: targetX - currentBoxCenterX,
              offsetY: targetY - currentBoxCenterY,
              rotateDeg: ((spinStep % 2 === 0 ? 1 : -1) * 14) + Math.sin(angle) * 10,
              scaleVal: 0.88
            };
          });
        });
      };

      // Bắt đầu gom vào tâm
      applyVortexStep(1, 0.95);

      // Đợt 2 (520ms): Xoay vòng xoáy tại tâm lần 1
      const tSpin1 = window.setTimeout(() => {
        amThanh.phatTiengTick();
        applyVortexStep(2, 0.55);
      }, 520);
      timersRef.current.push(tSpin1);

      // Đợt 3 (1040ms): Xoay vòng xoáy mở rộng tại tâm lần 2 + Hoán đổi ngẫu nhiên danh sách bên dưới
      const tSpin2 = window.setTimeout(() => {
        amThanh.phatTiengTick();
        setDanhSachHop(prev => {
          const shuffledStudents = [...prev.map(p => p.hocSinh)];
          const shuffledColors = [...prev.map(p => p.mauIndex)];
          for (let i = shuffledStudents.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
            const k = Math.floor(Math.random() * (i + 1));
            [shuffledColors[i], shuffledColors[k]] = [shuffledColors[k], shuffledColors[i]];
          }
          return prev.map((h, idx) => ({
            ...h,
            hocSinh: shuffledStudents[idx],
            mauIndex: shuffledColors[idx]
          }));
        });
        applyVortexStep(3, 1.05);
      }, 1040);
      timersRef.current.push(tSpin2);

      // Đợt 4 (1560ms): Đảo chéo nhanh giữa các hộp trước khi bung về lưới
      const tSpin3 = window.setTimeout(() => {
        amThanh.phatTiengTick();
        applyVortexStep(4, 0.72);
      }, 1560);
      timersRef.current.push(tSpin3);

      // Đợt 5 (2100ms): Tất cả hộp bay tỏa ra về các ô trên lưới và HIỆN SỐ (#1, #2...)
      const tScatterReady = window.setTimeout(() => {
        setDanhSachHop(prev =>
          prev.map((h, idx) => ({
            ...h,
            soThuTu: idx + 1,
            offsetX: 0,
            offsetY: 0,
            rotateDeg: 0,
            scaleVal: 1
          }))
        );
        setPhase('ready');
        amThanh.phatTiengMoHop();
      }, 2100);
      timersRef.current.push(tScatterReady);
    }, 1150);

    timersRef.current.push(tStartVortex);
  }, [danhSach, tinhToaDoXoayTam]);

  // Xử lý khi người dùng bấm mở 1 hộp quà bất kỳ ở trạng thái ready
  const handleChonHop = (hop: HopQuaItem) => {
    if (phase !== 'ready' || dangXuLyMo || hop.daMo) return;

    setDangXuLyMo(true);
    amThanh.phatTiengMoHop();

    setDanhSachHop(prev =>
      prev.map(h => (h.soThuTu === hop.soThuTu ? { ...h, dangMo: true } : h))
    );

    const tOpen = window.setTimeout(() => {
      setDanhSachHop(prev =>
        prev.map(h =>
          h.soThuTu === hop.soThuTu ? { ...h, dangMo: false, daMo: true } : h
        )
      );
      amThanh.chienThang();
      setDangXuLyMo(false);
      onHoanThanh(hop.hocSinh);
    }, 700);

    timersRef.current.push(tOpen);
  };

  // Chọn ngẫu nhiên 1 hộp chưa mở
  const handleChonNgauNhien = () => {
    if (phase !== 'ready' || dangXuLyMo || danhSachHop.length === 0) return;
    const cacHopChuaMo = danhSachHop.filter(h => !h.daMo);
    if (cacHopChuaMo.length === 0) return;

    onBatDauChoi();
    const hopChon = cacHopChuaMo[Math.floor(Math.random() * cacHopChuaMo.length)];
    handleChonHop(hopChon);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {/* KHUNG SÂN KHẤU HỘP QUÀ 3D FULL Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 90px)' : '580px',
          borderRadius: '20px',
          border: '2px solid #334155',
          background: 'radial-gradient(circle at 50% 25%, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
          boxShadow: '0 14px 35px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 18px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* THANH TRẠNG THÁI & NÚT XÁO TRỘN LẠI / TOÀN MÀN HÌNH Ở ĐỈNH SÂN KHẤU */}
        <div
          className="game-hud-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px',
            zIndex: 25
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.90)',
              border: '1px solid #f59e0b',
              borderRadius: '999px',
              padding: '7px 18px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#facc15',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
            }}
          >
            {phase === 'waiting' && '🎁 Nhấn nút "BẮT ĐẦU" để bỏ phiếu bí ẩn vào hộp và xáo trộn!'}
            {phase === 'packing' && '✉️ Đang bỏ các Phong Bì Bí Ẩn vào trong hộp quà...'}
            {phase === 'shuffling' && '🌀 Đang xoáy trộn ảo thuật tất cả các hộp quà...'}
            {phase === 'ready' && '🎯 Đã trộn xong! Hãy bấm vào bất kỳ hộp quà có số nào để mở!'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {phase === 'ready' && (
              <button
                onClick={batDauBoTenVaXaoTron}
                disabled={dangXuLyMo}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0f172a',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: dangXuLyMo ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔀 Xáo trộn lại</span>
              </button>
            )}

            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.90)',
                  border: '1px solid #475569',
                  padding: '7px 13px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
              </button>
            )}
          </div>
        </div>

        {/* LƯỚI HỘP QUÀ 3D TỰ CO GIÃN */}
        <div
          ref={gridRef}
          className="gift-grid-container"
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
            gap: '20px 16px',
            overflowY: 'auto',
            padding: '14px 8px 10px',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {danhSachHop.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              Chưa có học sinh trong danh sách. Vui lòng nạp danh sách học sinh trước nhé!
            </div>
          ) : (
            danhSachHop.map((hop, idx) => {
              const mau = BANG_MAU_HOP_3D[hop.mauIndex % BANG_MAU_HOP_3D.length];
              const isLidOpen = phase === 'packing' || hop.dangMo || hop.daMo;
              const canClick = phase === 'ready' && !hop.daMo && !dangXuLyMo;

              return (
                <div
                  key={hop.id}
                  ref={el => {
                    boxRefs.current[idx] = el;
                  }}
                  onClick={() => canClick && handleChonHop(hop)}
                  style={{
                    position: 'relative',
                    height: '132px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    cursor: canClick ? 'pointer' : 'default',
                    zIndex: phase === 'shuffling' ? 15 : 2,
                    transform: `translate3d(${hop.offsetX}px, ${hop.offsetY}px, 0) rotate(${hop.rotateDeg}deg) scale(${
                      hop.dangMo ? 1.12 : hop.scaleVal
                    })`,
                    transition:
                      phase === 'shuffling'
                        ? 'transform 0.50s cubic-bezier(0.34, 1.45, 0.64, 1)'
                        : 'transform 0.35s ease',
                    userSelect: 'none'
                  }}
                >
                  {/* PHONG BÌ BÍ ẨN BAY VÀO HỘP (ẨN HOÀN TOÀN TÊN HỌC SINH) */}
                  {phase === 'packing' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: envelopeDropped ? '44px' : '-14px',
                        opacity: envelopeDropped ? 0 : 1,
                        transform: envelopeDropped ? 'scale(0.55)' : 'scale(1)',
                        transition: 'all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        zIndex: 4,
                        background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)',
                        border: '2px solid #ffffff',
                        color: '#0f172a',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        boxShadow: '0 6px 15px rgba(250, 204, 21, 0.55)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                      }}
                    >
                      ✉️ Bí ẩn ?
                    </div>
                  )}

                  {/* HÀO QUANG PHÁT SÁNG TỪ TRONG HỘP KHI MỞ */}
                  {(hop.dangMo || hop.daMo) && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '28px',
                        width: '105px',
                        height: '95px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(250,204,21,0.55) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* NƠ LỤA 3D HAI CÁNH PHỒNG TRÊN ĐỈNH NẮP HỘP */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 6,
                      width: '54px',
                      height: '20px',
                      marginBottom: '-4px',
                      transform: isLidOpen
                        ? 'translateY(-24px) rotate(-14deg) scale(0.9)'
                        : 'translateY(0) rotate(0deg)',
                      opacity: hop.daMo ? 0.35 : 1,
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '16px',
                        borderRadius: '50% 50% 0 50%',
                        background: mau.ruyBang,
                        transform: 'rotate(-18deg)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.35)'
                      }}
                    />
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        background: '#ffffff',
                        zIndex: 2,
                        margin: '0 -4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                      }}
                    />
                    <div
                      style={{
                        width: '24px',
                        height: '16px',
                        borderRadius: '50% 50% 50% 0',
                        background: mau.ruyBang,
                        transform: 'rotate(18deg)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.35)'
                      }}
                    />
                  </div>

                  {/* NẮP HỘP QUÀ 3D (TÁCH RỜI KHỎI THÂN HỘP) */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 5,
                      width: '112px',
                      height: '24px',
                      borderRadius: '8px',
                      background: hop.daMo ? 'rgba(51, 65, 85, 0.6)' : mau.napHop,
                      border: `1.5px solid ${hop.daMo ? '#475569' : mau.vienSang}`,
                      boxShadow: '0 5px 10px rgba(0, 0, 0, 0.45)',
                      transform: isLidOpen
                        ? 'translateY(-22px) rotate(-12deg)'
                        : 'translateY(0) rotate(0deg)',
                      opacity: hop.daMo ? 0.4 : 1,
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '18px',
                        background: mau.ruyBang
                      }}
                    />
                  </div>

                  {/* THÂN HỘP QUÀ 3D KHỐI NỔI */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 4,
                      width: '102px',
                      height: '82px',
                      borderRadius: '0 0 14px 14px',
                      background: hop.daMo ? 'rgba(30, 41, 59, 0.65)' : mau.thanChinh,
                      border: `1.5px solid ${hop.daMo ? '#475569' : mau.vienSang}`,
                      borderTop: 'none',
                      boxShadow: hop.daMo
                        ? 'none'
                        : `0 10px 20px rgba(0, 0, 0, 0.5), inset -8px -6px 14px rgba(0, 0, 0, 0.25), inset 6px 4px 10px rgba(255, 255, 255, 0.2)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {!hop.daMo ? (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '18px',
                            background: mau.ruyBang,
                            boxShadow: '0 0 8px rgba(0,0,0,0.25)'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '45%',
                            transform: 'translateY(-50%)',
                            height: '14px',
                            background: mau.ruyBang,
                            boxShadow: '0 0 8px rgba(0,0,0,0.25)'
                          }}
                        />

                        {/* CHỈ HIỂN THỊ CON SỐ CỦA HỘP KHI ĐÃ TRỘN XONG (PHASE === 'READY') */}
                        {phase === 'ready' && (
                          <div
                            style={{
                              position: 'relative',
                              zIndex: 10,
                              minWidth: '36px',
                              height: '36px',
                              padding: '0 8px',
                              borderRadius: '999px',
                              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                              border: '2.5px solid #facc15',
                              color: '#fef08a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.92rem',
                              fontWeight: 900,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.65)',
                              animation: 'popIn 0.3s ease-out'
                            }}
                          >
                            #{hop.soThuTu}
                          </div>
                        )}
                      </>
                    ) : (
                      /* KHI HỘP ĐÃ MỞ: HIỂN THỊ TÊN HỌC SINH BÊN TRONG HỘP */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          textAlign: 'center',
                          zIndex: 10
                        }}
                      >
                        <span style={{ fontSize: '1.15rem' }}>🌟</span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#fde047',
                            lineHeight: 1.2,
                            wordBreak: 'break-word'
                          }}
                        >
                          {hop.hocSinh.ten}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px' }}>
                          Đã mở #{hop.soThuTu}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MÀN CHẮN NÚT "BẮT ĐẦU" NỔI BẬT KHI MỚI MỞ TRÒ CHƠI (PHASE === 'WAITING') */}
        {phase === 'waiting' && danhSach.length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              background: 'rgba(7, 11, 20, 0.62)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px'
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '24px',
                padding: '28px 38px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
              }}
            >
              <div style={{ fontSize: '3.2rem', marginBottom: '6px' }}>🎁✨</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                SÂN KHẤU HỘP QUÀ BÍ ẨN
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                Có <b>{danhSach.length} học sinh</b> đang chờ được giấu vào hộp quà và xoáy trộn ngẫu nhiên!
              </p>
              <button
                onClick={() => {
                  onBatDauChoi();
                  batDauBoTenVaXaoTron();
                }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 44px',
                  borderRadius: '999px',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(245, 158, 11, 0.5)',
                  letterSpacing: '0.04em'
                }}
              >
                🎁 BẮT ĐẦU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NÚT ĐIỀU KHIỂN BÊN DƯỚI SÂN KHẤU */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
        {phase !== 'ready' ? (
          <button
            className="game-action-btn"
            onClick={() => {
              onBatDauChoi();
              batDauBoTenVaXaoTron();
            }}
            disabled={phase === 'packing' || phase === 'shuffling' || danhSach.length === 0}
            style={{
              background:
                phase === 'packing' || phase === 'shuffling'
                  ? '#475569'
                  : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#fff',
              border: 'none',
              padding: '12px 38px',
              borderRadius: '30px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor:
                phase === 'packing' || phase === 'shuffling' || danhSach.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)'
            }}
          >
            {phase === 'packing'
              ? '✉️ Đang giấu phiếu bí ẩn vào hộp...'
              : phase === 'shuffling'
              ? '🌀 Đang xoáy trộn các hộp quà...'
              : '🎁 BẮT ĐẦU TRỘN HỘP QUÀ'}
          </button>
        ) : (
          <button
            className="game-action-btn"
            onClick={handleChonNgauNhien}
            disabled={dangXuLyMo || danhSachHop.every(h => h.daMo)}
            style={{
              background: dangXuLyMo
                ? '#475569'
                : 'linear-gradient(135deg, #d946ef 0%, #9333ea 100%)',
              color: '#fff',
              border: 'none',
              padding: '12px 36px',
              borderRadius: '30px',
              fontSize: '1.02rem',
              fontWeight: 800,
              cursor: dangXuLyMo ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(217, 70, 239, 0.35)'
            }}
          >
            🎲 Mở Ngẫu Nhiên 1 Hộp Cho Tôi
          </button>
        )}
      </div>
    </div>
  );
};
