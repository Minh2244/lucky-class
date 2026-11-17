// Trò chơi thứ 7: Đua Vịt Qua Sông (Chuẩn cơ chế duckrace-game.com: Đàn vịt bơi rượt đuổi ở vùng Trái -> Giữa màn hình 140px-540px, trải rộng không dồn cục, cảnh sông & bờ cỏ trôi mượt, vạch đích ca-rô nghiêng trôi từ phải vào ở cuối chặng)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface DuaVitProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface MauVit {
  tenMau: string;
  thanChinh: string;
  thanBong: string;
  mauDom: string | null;
}

// Bảng 18 màu sắc & họa tiết vịt cao su rực rỡ
const BANG_MAU_VIT: MauVit[] = [
  { tenMau: 'Vàng Cổ Điển', thanChinh: '#eab308', thanBong: '#a16207', mauDom: null },
  { tenMau: 'Hồng Phấn', thanChinh: '#f472b6', thanBong: '#db2777', mauDom: '#fdf2f8' },
  { tenMau: 'Đỏ Tươi', thanChinh: '#ef4444', thanBong: '#b91c1c', mauDom: null },
  { tenMau: 'Xanh Lá Tươi', thanChinh: '#22c55e', thanBong: '#15803d', mauDom: null },
  { tenMau: 'Tím Hồng', thanChinh: '#d946ef', thanBong: '#a21caf', mauDom: null },
  { tenMau: 'Xanh Dương Biển', thanChinh: '#3b82f6', thanBong: '#1d4ed8', mauDom: null },
  { tenMau: 'Cam Rực Rỡ', thanChinh: '#f97316', thanBong: '#c2410c', mauDom: null },
  { tenMau: 'Tím Hoàng Gia', thanChinh: '#9333ea', thanBong: '#6b21a8', mauDom: null },
  { tenMau: 'Xanh Ngọc Bích', thanChinh: '#06b6d4', thanBong: '#0e7490', mauDom: null },
  { tenMau: 'Xanh Lá Đốm Vàng', thanChinh: '#16a34a', thanBong: '#14532d', mauDom: '#facc15' },
  { tenMau: 'Vàng Tươi', thanChinh: '#facc15', thanBong: '#ca8a04', mauDom: null },
  { tenMau: 'Vàng Đốm Cam', thanChinh: '#fde047', thanBong: '#ca8a04', mauDom: '#ea580c' },
  { tenMau: 'Hồng Cánh Sen', thanChinh: '#ec4899', thanBong: '#9d174d', mauDom: null },
  { tenMau: 'Xanh Chuối', thanChinh: '#84cc16', thanBong: '#4d7c0f', mauDom: null },
  { tenMau: 'Tím Đốm Vàng', thanChinh: '#a855f7', thanBong: '#6b21a8', mauDom: '#fef08a' },
  { tenMau: 'Xanh Biển Đốm Trắng', thanChinh: '#0284c7', thanBong: '#075985', mauDom: '#e0f2fe' },
  { tenMau: 'Đỏ Đốm Vàng', thanChinh: '#dc2626', thanBong: '#7f1d1d', mauDom: '#fde047' },
  { tenMau: 'Xanh Bạc Hà', thanChinh: '#10b981', thanBong: '#047857', mauDom: null }
];

interface ChuVit {
  hs: HocSinh;
  soThuTu: number;
  mau: MauVit;
  screenX: number;       // Vị trí ngang trên màn hình (luôn nằm trong vùng Trái -> Giữa màn hình: 130px .. 540px)
  targetScreenX: number; // Điểm đích tạm thời trên màn hình trong mỗi nhịp bứt tốc/tụt lại
  laneY: number;
  vx: number;
  changeTimer: number;
  bobPhase: number;
  paddlePhase: number;
  boostTimer: number;
  quackTimer: number;
  isWinner: boolean;
}

// Thời lượng cuộc đua: 20 giây (20,000ms)
const RACE_DURATION_MS = 20000;
const RIVER_TOP_Y = 106;

export const DuaVit: React.FC<DuaVitProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nguoiDanDau, setNguoiDanDau] = useState<string>('');
  const [dongHoDienTu, setDongHoDienTu] = useState<string>('00:20:00');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    vits: ChuVit[];
    scrollOffset: number;
    startLineCenterX: number;
    finishLineCenterX: number;
    startTime: number;
    daCoNguoiThang: boolean;
    winnerPauseTimer: number;
    winnerDuck: ChuVit | null;
    lastQuackSoundMs: number;
    animationFrameId: number;
  }>({
    vits: [],
    scrollOffset: 0,
    startLineCenterX: 255,
    finishLineCenterX: 1450,
    startTime: 0,
    daCoNguoiThang: false,
    winnerPauseTimer: 0,
    winnerDuck: null,
    lastQuackSoundMs: 0,
    animationFrameId: 0
  });

  // Định dạng đồng hồ điện tử MM:SS:CC
  const formatDongHo = (remainMs: number): string => {
    const clamped = Math.max(0, remainMs);
    const totalSec = Math.floor(clamped / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const centis = Math.floor((clamped % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(centis).padStart(2, '0')}`;
  };

  // Tính tọa độ X của vạch kẻ ca-rô nghiêng chéo tại độ sâu Y
  const layToaDoXVachNghieng = (centerScreenX: number, y: number): number => {
    const t = (y - RIVER_TOP_Y) / (580 - RIVER_TOP_Y);
    // Nghiêng từ phải-trên xuống trái-dưới chuẩn mẫu Duck Race
    return centerScreenX + 68 - t * 136;
  };

  // Hàm phân bổ mục tiêu ngang (targetScreenX) trải đều từ Trái (155px) tới Giữa màn hình (535px)
  // giúp đàn vịt LUÔN TÁCH ĐÀN RỘNG RÃI ở nửa trái-giữa màn hình giống hệt duckrace-game.com!
  const phanBoViTriGiuaManHinh = (soLuong: number, isFinalSprint: boolean = false): number[] => {
    const minX = isFinalSprint ? 210 : 155;
    const maxX = isFinalSprint ? 565 : 530; // Chỉ tới GIỮA màn hình (~530px / 1100px), tuyệt đối không dạt sát mép phải!
    const slots: number[] = [];

    for (let i = 0; i < soLuong; i++) {
      const ratio = soLuong === 1 ? 0.85 : i / (soLuong - 1);
      // Phân bố trải đều từ minX đến maxX kèm độ lệch ngẫu nhiên nhỏ
      const baseSlot = minX + ratio * (maxX - minX) + (Math.random() - 0.5) * 28;
      slots.push(Math.max(140, Math.min(575, baseSlot)));
    }

    // Xáo trộn ngẫu nhiên 100% (Fisher-Yates) để bất kỳ chú vịt nào cũng có thể bứt lên dẫn đầu ở giữa màn hình hoặc tụt lại phía sau!
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return slots;
  };

  // Khởi tạo đàn vịt xếp hàng sau vạch xuất phát nghiêng bên trái
  const khoiTaoDanVit = useCallback((xaoTronMau: boolean = false) => {
    const total = Math.max(1, danhSach.length);
    const minY = RIVER_TOP_Y + 48;
    const maxY = 536;
    const usableH = maxY - minY;

    const colorIndices = Array.from({ length: total }, (_, i) => i);
    if (xaoTronMau) {
      for (let i = colorIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colorIndices[i], colorIndices[j]] = [colorIndices[j], colorIndices[i]];
      }
    }

    const initialTargets = phanBoViTriGiuaManHinh(total, false);

    const vits: ChuVit[] = danhSach.map((hs, idx) => {
      const ratioY = total === 1 ? 0.5 : idx / (total - 1);
      const laneY = minY + ratioY * usableH;
      const startLineXAtLane = layToaDoXVachNghieng(255, laneY);
      const staggerBack = total > 8 ? (idx % 3) * 30 : (idx % 2) * 18;
      const startScreenX = Math.max(115, startLineXAtLane - 50 - staggerBack);

      return {
        hs,
        soThuTu: idx + 1,
        mau: BANG_MAU_VIT[colorIndices[idx] % BANG_MAU_VIT.length],
        screenX: startScreenX,
        targetScreenX: initialTargets[idx],
        laneY,
        vx: 0,
        changeTimer: 35 + Math.floor(Math.random() * 50),
        bobPhase: Math.random() * Math.PI * 2,
        paddlePhase: Math.random() * Math.PI * 2,
        boostTimer: 0,
        quackTimer: 0,
        isWinner: false
      };
    });

    stateRef.current.vits = vits;
    stateRef.current.scrollOffset = 0;
    stateRef.current.startLineCenterX = 255;
    stateRef.current.finishLineCenterX = 1450;
    stateRef.current.startTime = performance.now();
    stateRef.current.daCoNguoiThang = false;
    stateRef.current.winnerPauseTimer = 0;
    stateRef.current.winnerDuck = null;
    setNguoiDanDau('');
    setDongHoDienTu('00:20:00');
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoDanVit(false);
    }
  }, [danhSach, dangChoi, khoiTaoDanVit]);

  // Vòng lặp hoạt ảnh & vật lý Đua Vịt 60fps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTimerUpdate = 0;
    let lastPackShuffleTime = 0;

    // Vẽ dải băng kẻ ô ca-rô đen trắng nghiêng chéo
    const veVachCaRoNghieng = (
      centerScreenX: number,
      h: number,
      hienSoLan: boolean,
      vits: ChuVit[]
    ) => {
      if (centerScreenX < -160 || centerScreenX > canvas.width + 160) return;

      const topX = layToaDoXVachNghieng(centerScreenX, RIVER_TOP_Y);
      const botX = layToaDoXVachNghieng(centerScreenX, h);
      const dxLine = botX - topX;
      const dyLine = h - RIVER_TOP_Y;
      const lineLen = Math.hypot(dxLine, dyLine);
      const angle = Math.atan2(dyLine, dxLine);

      ctx.save();
      ctx.translate(topX, RIVER_TOP_Y);
      ctx.rotate(angle);

      const cellSize = 19;
      const numRows = Math.ceil(lineLen / cellSize);
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < 2; c++) {
          const isBlack = (r + c) % 2 === 0;
          ctx.fillStyle = isBlack ? '#0f172a' : '#ffffff';
          ctx.fillRect(r * cellSize, (c - 1) * cellSize, cellSize + 0.6, cellSize + 0.6);
        }
      }

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, -cellSize, numRows * cellSize, cellSize * 2);
      ctx.restore();

      if (hienSoLan && vits.length <= 12) {
        ctx.save();
        ctx.font = 'italic 900 24px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        vits.forEach(v => {
          const lx = layToaDoXVachNghieng(centerScreenX, v.laneY) + 26;
          ctx.fillText(String(v.soThuTu), lx, v.laneY + 4);
        });
        ctx.restore();
      }
    };

    // Vẽ chú vịt cao su chuẩn mẫu duckrace-game.com (To đẹp, cánh trắng đeo số, bóng thoại tên có mũi nhọn chỉ vào đầu vịt)
    const veChuVitCaoSu = (vit: ChuVit, timeSec: number, scaleVit: number) => {
      const screenX = vit.screenX;
      const isSwimming = dangChoi && !stateRef.current.daCoNguoiThang;
      const swimCycle = timeSec * (isSwimming ? (vit.boostTimer > 0 ? 14.0 : 9.5) : 3.0) + vit.paddlePhase;

      // Nhấp nhô nhẹ nhàng trên sóng nước
      const bobY = isSwimming
        ? Math.sin(swimCycle) * 3.2
        : Math.sin(swimCycle) * 1.8;

      // Nghiêng nhẹ khi rướn bơi về trước
      const pitchRad = isSwimming
        ? Math.sin(swimCycle - 0.5) * 0.045 + (vit.vx > 0.4 ? 0.035 : 0)
        : Math.sin(swimCycle) * 0.015;

      // Đầu & cổ rướn nhẹ theo nhịp bơi
      const hx = isSwimming ? Math.sin(swimCycle) * 2.4 + (vit.vx > 0.4 ? 1.8 : 0) : 0;
      const hy = isSwimming ? -Math.abs(Math.cos(swimCycle)) * 1.6 : 0;

      const dy = vit.laneY + bobY;

      ctx.save();
      ctx.translate(screenX, dy);

      ctx.save();
      ctx.scale(scaleVit, scaleVit);

      // 1. Vòng gợn sóng nước phẳng dưới bụng vịt (sạch gọn y hệt duckrace-game.com)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(-2, 16, 34 + Math.sin(swimCycle) * 3, 6.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Thân vịt + Đầu tròn + Mỏ cam cười + Mắt to + Cánh trắng đeo số
      ctx.save();
      ctx.rotate(pitchRad);

      if (vit.isWinner) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 22;
      }

      ctx.fillStyle = vit.mau.thanChinh;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(22 + hx * 0.3, 2);
      ctx.bezierCurveTo(25, 13, 16, 18, -5, 18);
      ctx.bezierCurveTo(-22, 18, -32, 15, -35, 6);
      // Đuôi vịt vểnh cao
      ctx.bezierCurveTo(-39, 0, -37, -10, -31, -12);
      ctx.bezierCurveTo(-28, -9, -25, -7, -21, -6);
      // Lưng vịt nối lên cổ & đầu tròn
      ctx.bezierCurveTo(-13, -5, -6 + hx * 0.4, -6 + hy * 0.4, -3 + hx * 0.7, -12 + hy * 0.7);
      ctx.bezierCurveTo(-7 + hx, -23 + hy, -1 + hx, -36 + hy, 11 + hx, -36 + hy);
      ctx.bezierCurveTo(23 + hx, -36 + hy, 27 + hx, -24 + hy, 19 + hx * 0.8, -13 + hy * 0.8);
      ctx.bezierCurveTo(18 + hx * 0.4, -7, 21 + hx * 0.3, -3, 22 + hx * 0.3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bóng bụng vịt & họa tiết chấm đốm (nếu có)
      ctx.save();
      ctx.clip();
      ctx.fillStyle = vit.mau.thanBong;
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      ctx.ellipse(-4, 17, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (vit.mau.mauDom) {
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = vit.mau.mauDom;
        const spots = [
          { sx: -24, sy: 4, sr: 3.4 },
          { sx: -16, sy: 11, sr: 2.8 },
          { sx: 12, sy: 8, sr: 3.2 },
          { sx: 4 + hx, sy: -26 + hy, sr: 2.8 },
          { sx: -2 + hx * 0.8, sy: -18 + hy * 0.8, sr: 2.5 },
          { sx: 14, sy: -3, sr: 2.6 },
          { sx: -28, sy: -3, sr: 2.5 }
        ];
        spots.forEach(sp => {
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, sp.sr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();

      // 3. Mỏ vịt màu cam tươi cười
      const mouthOpen = vit.quackTimer > 0 ? 2.8 : 0.4;
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(21 + hx, -25 + hy);
      ctx.bezierCurveTo(28 + hx, -26 + hy, 33 + hx, -24 + hy, 35 + hx, -20 + hy);
      ctx.bezierCurveTo(35 + hx, -17 + hy, 29 + hx, -16 + hy, 20 + hx, -17 + hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(20 + hx, -17 + hy);
      ctx.lineTo(32 + hx, -16 + hy + mouthOpen);
      ctx.bezierCurveTo(30 + hx, -12 + hy + mouthOpen, 23 + hx, -12 + hy + mouthOpen, 19 + hx, -15 + hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(20 + hx, -18 + hy, 2.5, 0.2, Math.PI * 0.85);
      ctx.stroke();

      // 4. Mắt vịt to tròn long lanh + mí mắt cong
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(14.5 + hx, -24.5 + hy, 3.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(15.6 + hx, -25.8 + hy, 1.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(14.5 + hx, -25.5 + hy, 5.8, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();

      // 5. Cánh vịt màu trắng hình giọt nước mang SỐ THỨ TỰ ở giữa
      const wingFlapY = isSwimming ? Math.sin(swimCycle) * 1.6 : 0;
      ctx.save();
      ctx.translate(-7, 5 + wingFlapY);
      ctx.rotate(-0.05);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.bezierCurveTo(15, 7.5, 4, 10, -12, 8);
      ctx.bezierCurveTo(-18, 6.5, -19, 1, -15, -4);
      ctx.bezierCurveTo(-9, -9, 15, -8, 15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 11.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(vit.soThuTu), -1, 0.5);
      ctx.restore();

      if (vit.isWinner) {
        ctx.font = '20px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('👑', 10 + hx, -44 + hy);
      }

      ctx.restore();
      ctx.restore();

      // 6. BẢNG TÊN HỌC SINH DẠNG BÓNG THOẠI (CÓ MŨI NHỌN CHỈ VÀO ĐẦU VỊT GIỐNG HỆT DUCKRACE-GAME.COM!)
      ctx.save();
      ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
      const textWidth = ctx.measureText(vit.hs.ten).width;
      const padX = 10;
      const boxW = textWidth + padX * 2;
      const boxH = 25;
      const boxX = -boxW - 2 * scaleVit;
      const boxY = -47 * scaleVit;
      const r = 7;

      ctx.fillStyle = vit.isWinner ? '#fef08a' : '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;

      // Vẽ khung bóng thoại bo góc kèm mũi nhọn ở góc dưới-phải chỉ về phía đầu vịt
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxW - r, boxY);
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
      ctx.lineTo(boxX + boxW, boxY + boxH - r);
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
      // Mũi nhọn chỉ xuống đầu vịt
      ctx.lineTo(boxX + boxW - 6, boxY + boxH);
      ctx.lineTo(boxX + boxW + 2, boxY + boxH + 7);
      ctx.lineTo(boxX + boxW - 15, boxY + boxH);
      ctx.lineTo(boxX + r, boxY + boxH);
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
      ctx.lineTo(boxX, boxY + r);
      ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vit.hs.ten, boxX + boxW / 2, boxY + boxH / 2 + 0.5);
      ctx.restore();

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;

      const state = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const timeSec = now / 1000;

      const scaleVit = state.vits.length <= 10 ? 1.36 : state.vits.length <= 20 ? 1.22 : 1.1;

      // ============================================================================
      // 1. CẬP NHẬT CHUYỂN ĐỘNG ĐÀN VỊT (GIỮ Ở VÙNG TRÁI -> GIỮA MÀN HÌNH 140px - 540px!)
      // ============================================================================
      if (dangChoi && state.vits.length > 0) {
        if (!state.daCoNguoiThang) {
          const elapsed = now - state.startTime;
          const remainMs = Math.max(0, RACE_DURATION_MS - elapsed);
          const progress = Math.min(1, elapsed / RACE_DURATION_MS);

          if (now - lastTimerUpdate > 45) {
            lastTimerUpdate = now;
            setDongHoDienTu(formatDongHo(remainMs));
          }

          // Dòng sông & bờ cỏ trôi liên tục từ phải sang trái tạo cảm giác đàn vịt đang bơi tiến về phía trước!
          const riverScrollSpeed = 5.4;
          state.scrollOffset += riverScrollSpeed;

          // Vạch xuất phát trôi lùi về bên trái và biến mất khi bắt đầu bơi
          if (state.startLineCenterX > -200) {
            state.startLineCenterX -= riverScrollSpeed;
          }

          // Tiếng vịt kêu "Cạp! Cạp!" ngẫu nhiên
          if (now - state.lastQuackSoundMs > 1700 + Math.random() * 1200) {
            state.lastQuackSoundMs = now;
            amThanh.phatTiengVitKeu();
            const randomVit = state.vits[Math.floor(Math.random() * state.vits.length)];
            if (randomVit) randomVit.quackTimer = 18;
          }

          // Cứ mỗi 2.2 giây: Đảo lại các vị trí đích (targetScreenX) trong khoảng 150px -> 540px (Giữa màn hình)
          // để các chú vịt liên tục bơi vượt mặt nhau ở vùng giữa màn hình và trải rộng đẹp mắt!
          if (now - lastPackShuffleTime > 2200) {
            lastPackShuffleTime = now;
            const isFinal = progress > 0.78;
            const newTargets = phanBoViTriGiuaManHinh(state.vits.length, isFinal);
            state.vits.forEach((v, idx) => {
              if (newTargets[idx] > v.screenX + 55) {
                v.boostTimer = 45;
              }
              v.targetScreenX = newTargets[idx];
            });
          }

          // Vạch đích ca-rô nghiêng bắt đầu trôi từ mép phải (x = 1220) vào GIỮA MÀN HÌNH (x = 540) ở 3.2 giây cuối!
          if (progress >= 0.84) {
            const finishRatio = (progress - 0.84) / 0.16;
            state.finishLineCenterX = 1180 - finishRatio * 680;
          } else {
            state.finishLineCenterX = 1450;
          }

          let leaderVit: ChuVit | null = null;
          let bestLeadScore = -Infinity;

          state.vits.forEach(vit => {
            if (vit.boostTimer > 0) vit.boostTimer--;
            if (vit.quackTimer > 0) vit.quackTimer--;

            // Di chuyển mượt mà về vị trí targetScreenX của chú vịt (nằm gọn trong vùng 140px .. 560px giữa màn hình!)
            const diffX = vit.targetScreenX - vit.screenX;
            const desiredVx = Math.max(-2.1, Math.min(2.6, diffX * 0.032));
            vit.vx = vit.vx * 0.88 + desiredVx * 0.12;

            // Thêm nhịp nhích nhẹ theo từng cú quạt nước nhưng luôn khóa trong vùng Trái -> Giữa màn hình (130px .. 575px)
            const gentleSwimOsc = Math.sin(timeSec * 3.2 + vit.bobPhase) * 0.35;
            vit.screenX = Math.max(130, Math.min(575, vit.screenX + vit.vx + gentleSwimOsc));

            // Tính khoảng cách từ mỏ vịt tới đường nghiêng của Vạch Đích tại làn Y của chú vịt
            const finishXAtLane = layToaDoXVachNghieng(state.finishLineCenterX, vit.laneY);
            const beakTipScreenX = vit.screenX + 35 * scaleVit;
            const leadScore = beakTipScreenX - finishXAtLane;

            if (leadScore > bestLeadScore) {
              bestLeadScore = leadScore;
              leaderVit = vit;
            }

            // Khi vạch đích ca-rô nghiêng trôi vào giữa màn hình và chạm mỏ chú vịt dẫn đầu!
            if (beakTipScreenX >= finishXAtLane && !state.daCoNguoiThang) {
              state.daCoNguoiThang = true;
              state.winnerDuck = vit;
              state.winnerPauseTimer = 60; // Dừng 1 giây tại vạch đích để cả lớp nhìn rõ chú vịt chiến thắng
              vit.isWinner = true;
              setDongHoDienTu('00:00:00');
              amThanh.phatTiengVitKeu();
              amThanh.chienThang();
            }
          });

          if (leaderVit) {
            setNguoiDanDau(`${(leaderVit as ChuVit).hs.ten} (#${(leaderVit as ChuVit).soThuTu})`);
          }
        } else {
          state.winnerPauseTimer--;
          if (state.winnerPauseTimer <= 0 && state.winnerDuck) {
            const winHs = state.winnerDuck.hs;
            state.winnerDuck = null;
            onHoanThanhRef.current(winHs);
          }
        }
      }

      const camX = state.scrollOffset;

      // ============================================================================
      // 2. VẼ BỐI CẢNH DÒNG SÔNG ĐA SẮC & 6 TIỂU CẢNH ĐÔI BỜ ĐẸP LẠ, SINH ĐỘNG
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // A. DẢI ĐỒI XA & THẢM CỎ XANH BỜ SÔNG PHÍA TRÊN (0 -> RIVER_TOP_Y)
      const grassGrad = ctx.createLinearGradient(0, 0, 0, RIVER_TOP_Y);
      grassGrad.addColorStop(0, '#4ade80');
      grassGrad.addColorStop(0.45, '#22c55e');
      grassGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, w, RIVER_TOP_Y);

      // Đồi cỏ xanh đậm uốn lượn phía xa (Parallax chuyển động chậm 0.35x)
      ctx.fillStyle = 'rgba(21, 128, 61, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, RIVER_TOP_Y);
      for (let x = 0; x <= w + 40; x += 40) {
        const hillY = 42 + Math.sin((x + camX * 0.35) * 0.012) * 18 + Math.cos((x + camX * 0.2) * 0.025) * 8;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(w, RIVER_TOP_Y);
      ctx.closePath();
      ctx.fill();

      // 6 Kiểu tiểu cảnh ven sông luân phiên nhau nối tiếp dọc bờ cỏ
      const propSpacing = 250;
      const startPropIdx = Math.floor(camX / propSpacing) - 1;
      const endPropIdx = Math.ceil((camX + w) / propSpacing) + 1;

      for (let idx = startPropIdx; idx <= endPropIdx; idx++) {
        const sx = idx * propSpacing - camX;
        const sceneType = ((idx % 6) + 6) % 6;

        // Thảm cỏ nhỏ & đá cuội nền chung
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.6;
        for (let g = 0; g < 3; g++) {
          const gx = sx + 18 + g * 12;
          ctx.beginPath();
          ctx.moveTo(gx, 86);
          ctx.lineTo(gx - 3, 77);
          ctx.moveTo(gx + 3, 86);
          ctx.lineTo(gx + 6, 78);
          ctx.stroke();
        }

        if (sceneType === 0) {
          // KIỂU 1: CỐI XAY GIÓ HÀ LAN & KHÓM HOA TULIP ĐỦ MÀU
          // Thân tháp cối xay gió
          ctx.fillStyle = '#b45309';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx + 85, 92);
          ctx.lineTo(sx + 94, 34);
          ctx.lineTo(sx + 114, 34);
          ctx.lineTo(sx + 123, 92);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mái vòm cối xay
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(sx + 104, 34, 11, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cánh quạt cối xay gió đang quay tròn
          ctx.save();
          ctx.translate(sx + 104, 40);
          ctx.rotate(timeSec * 1.4 + idx);
          for (let blade = 0; blade < 4; blade++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#fef08a';
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-2, 0, 4, 28);
            ctx.fillRect(0, 8, 9, 18);
            ctx.strokeRect(0, 8, 9, 18);
          }
          ctx.restore();

          // Khóm hoa Tulip rực rỡ bên cạnh cối xay gió
          const tulipColors = ['#ef4444', '#facc15', '#ec4899', '#a855f7'];
          for (let t = 0; t < 5; t++) {
            const tx = sx + 145 + t * 14;
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx, 92);
            ctx.lineTo(tx, 75);
            ctx.stroke();
            ctx.fillStyle = tulipColors[(idx + t) % tulipColors.length];
            ctx.beginPath();
            ctx.arc(tx, 73, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (sceneType === 1) {
          // KIỂU 2: NGÔI NHÀ GỖ VEN SÔNG & HÀNG RÀO GỖ TRẮNG
          // Hàng rào gỗ trắng
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.4;
          ctx.fillRect(sx + 25, 74, 58, 4);
          ctx.fillRect(sx + 25, 83, 58, 4);
          for (let p = 0; p < 4; p++) {
            ctx.fillRect(sx + 28 + p * 16, 67, 6, 25);
            ctx.strokeRect(sx + 28 + p * 16, 67, 6, 25);
          }

          // Ngôi nhà gỗ nhỏ ấm áp
          ctx.fillStyle = '#fef3c7';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.fillRect(sx + 105, 52, 54, 40);
          ctx.strokeRect(sx + 105, 52, 54, 40);

          // Mái ngói đỏ
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(sx + 97, 54);
          ctx.lineTo(sx + 132, 26);
          ctx.lineTo(sx + 167, 54);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cửa sổ vàng ấm & cửa chính
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 116, 68, 12, 24);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(sx + 136, 62, 14, 14);
          ctx.strokeRect(sx + 136, 62, 14, 14);
        } else if (sceneType === 2) {
          // KIỂU 3: RỪNG CÂY PHONG LÁ THU CAM ĐỎ & CÂY TÙNG XANH
          // Cây phong lá cam đỏ
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 76, 64, 8, 28);
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx + 68, 56, 18, 0, Math.PI * 2);
          ctx.arc(sx + 82, 46, 22, 0, Math.PI * 2);
          ctx.arc(sx + 96, 58, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cây thông/tùng xanh nhọn bên cạnh
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 148, 72, 7, 20);
          ctx.fillStyle = '#0d9488';
          ctx.strokeStyle = '#115e59';
          for (let tier = 0; tier < 3; tier++) {
            const ty = 74 - tier * 15;
            const tw = 24 - tier * 4;
            ctx.beginPath();
            ctx.moveTo(sx + 151.5 - tw, ty);
            ctx.lineTo(sx + 151.5, ty - 22);
            ctx.lineTo(sx + 151.5 + tw, ty);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (sceneType === 3) {
          // KIỂU 4: BẾN CẦU GỖ VEN SÔNG & CỘT ĐÈN LỒNG VÀNG
          // Bụi cây hoa hồng phấn
          ctx.fillStyle = '#15803d';
          ctx.strokeStyle = '#052e16';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx + 65, 72, 19, 0, Math.PI * 2);
          ctx.arc(sx + 88, 65, 23, 0, Math.PI * 2);
          ctx.arc(sx + 110, 73, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          for (let fl = 0; fl < 4; fl++) {
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(sx + 66 + fl * 14, 66 + (fl % 2) * 7, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Cột đèn lồng gỗ ven sông
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 158, 42, 5, 50);
          ctx.fillRect(sx + 158, 42, 18, 4);
          // Đèn lồng phát sáng
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(sx + 173, 52, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (sceneType === 4) {
          // KIỂU 5: KHÓM TRÚC XANH, LAU SẬY ĐUNG ĐƯA & ĐÀN BƯỚM BAY
          const sway = Math.sin(timeSec * 3.2 + idx) * 3.5;
          // Khóm trúc xanh
          ctx.strokeStyle = '#14532d';
          ctx.lineWidth = 3;
          for (let b = 0; b < 4; b++) {
            const bx = sx + 68 + b * 12;
            ctx.beginPath();
            ctx.moveTo(bx, 92);
            ctx.quadraticCurveTo(bx + sway, 60, bx + sway * 1.4, 34 + (b % 2) * 8);
            ctx.stroke();
          }

          // Khóm lau sậy bông nâu
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 2.2;
          for (let r = -2; r <= 2; r++) {
            ctx.beginPath();
            ctx.moveTo(sx + 155 + r * 7, 92);
            ctx.quadraticCurveTo(sx + 155 + r * 9 + sway, 72, sx + 155 + r * 11 + sway, 56);
            ctx.stroke();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(sx + 155 + r * 11 + sway, 58, 2.6, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Chú bướm vàng bay lượn trên cỏ
          const bxFly = sx + 118 + Math.sin(timeSec * 4 + idx) * 12;
          const byFly = 48 + Math.cos(timeSec * 6 + idx) * 7;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(bxFly - 3, byFly, 3.5, 0, Math.PI * 2);
          ctx.arc(bxFly + 3, byFly, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // KIỂU 6: VƯỜN HOA HƯỚNG DƯƠNG & TẢNG ĐÁ CUỘI RÊU PHONG
          // Tảng đá cuội xám ven bờ
          ctx.fillStyle = '#94a3b8';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(sx + 68, 84, 22, 12, 0, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(sx + 88, 86, 15, 9, 0, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 3 bông hoa Hướng Dương to rực rỡ
          for (let s = 0; s < 3; s++) {
            const sunX = sx + 132 + s * 26;
            const sunY = 56 + (s % 2) * 8;
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sunX, 92);
            ctx.lineTo(sunX, sunY);
            ctx.stroke();

            // Cánh hoa vàng
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(sunX, sunY, 9.5, 0, Math.PI * 2);
            ctx.fill();
            // Nhụy nâu
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(sunX, sunY, 4.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Bờ kè đất nâu xen lẫn đá cuội tự nhiên ngăn cách bờ cỏ và mặt nước sông
      ctx.fillStyle = '#7c3f09';
      ctx.strokeStyle = '#4d2604';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, RIVER_TOP_Y - 12);
      ctx.lineTo(w, RIVER_TOP_Y - 12);
      for (let x = w; x >= 0; x -= 28) {
        const bankWave = Math.sin((x + camX) * 0.045) * 3.5;
        ctx.lineTo(x, RIVER_TOP_Y + bankWave);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // B. MẶT NƯỚC SÔNG XANH NGỌC BÍCH CHUYỂN SẮC & CÁC DẢI SÓNG LƯỢN TẦNG LỚP
      const riverGrad = ctx.createLinearGradient(0, RIVER_TOP_Y, 0, h);
      riverGrad.addColorStop(0, '#2b8cb6');
      riverGrad.addColorStop(0.5, '#227296');
      riverGrad.addColorStop(1, '#1a5a78');
      ctx.fillStyle = riverGrad;
      ctx.fillRect(0, RIVER_TOP_Y, w, h - RIVER_TOP_Y);

      const numBands = 6;
      const bandSpacing = (h - RIVER_TOP_Y) / numBands;
      ctx.fillStyle = 'rgba(20, 75, 102, 0.45)';
      for (let b = 0; b < numBands; b++) {
        const baseY = RIVER_TOP_Y + b * bandSpacing + 18;
        const bandH = bandSpacing * 0.44;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= w + 40; x += 36) {
          const waveY = baseY + Math.sin((x + camX) * 0.032 + b) * 4.5;
          ctx.lineTo(x, waveY);
        }
        for (let x = w + 40; x >= 0; x -= 36) {
          const waveY = baseY + bandH + Math.sin((x + camX) * 0.032 + b + 1.4) * 4.5;
          ctx.lineTo(x, waveY);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Tiểu cảnh trên mặt nước sát rìa bờ sông (Lá súng xanh & Hoa sen hồng nở rộ trôi qua)
      const lilySpacing = 310;
      const startLilyIdx = Math.floor(camX / lilySpacing) - 1;
      const endLilyIdx = Math.ceil((camX + w) / lilySpacing) + 1;
      for (let lIdx = startLilyIdx; lIdx <= endLilyIdx; lIdx++) {
        const lx = lIdx * lilySpacing - camX;
        const isTopEdge = lIdx % 2 === 0;
        const ly = isTopEdge ? RIVER_TOP_Y + 20 : h - 18;

        // Lá súng xanh tròn có khía chữ V
        ctx.fillStyle = '#16a34a';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx, ly, 12, 0.25, Math.PI * 1.85);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lá súng thứ hai nhỏ hơn
        ctx.beginPath();
        ctx.arc(lx + 22, ly + (isTopEdge ? 4 : -4), 9, 0.4, Math.PI * 1.9);
        ctx.lineTo(lx + 22, ly + (isTopEdge ? 4 : -4));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bông hoa súng/hoa sen hồng phấn nở trên lá
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(lx - 2, ly - 3, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx - 2, ly - 3, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. VẠCH XUẤT PHÁT CA-RÔ NGHIÊNG & VẠCH ĐÍCH CA-RÔ NGHIÊNG
      veVachCaRoNghieng(state.startLineCenterX, h, true, state.vits);
      veVachCaRoNghieng(state.finishLineCenterX, h, false, state.vits);

      // D. VẼ ĐÀN VỊT THEO THỨ TỰ CHIỀU SÂU Y
      const sortedVits = [...state.vits].sort((a, b) => a.laneY - b.laneY);
      sortedVits.forEach(vit => {
        veChuVitCaoSu(vit, timeSec, scaleVit);
      });

      stateRef.current.animationFrameId = requestAnimationFrame(render);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(render);
    return () => {
      running = false;
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
    };
  }, [dangChoi]);

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
      {/* KHUNG SÂN CHƠI ĐUA VỊT FULL Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 78px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.55)',
          border: '2px solid #1e293b',
          background: '#286a88'
        }}
      >
        <canvas
          ref={canvasRef}
          width={1100}
          height={580}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* THANH HUD TRÊN BỜ CỎ: ĐỔI MÀU VỊT / DẪN ĐẦU + ĐỒNG HỒ ĐIỆN TỬ LỚN + NÚT TOÀN MÀN HÌNH */}
        <div
          className="game-hud-bar"
          style={{
            position: 'absolute',
            top: '8px',
            left: '14px',
            right: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {/* Bên trái: Nút Đổi màu & Xáo trộn vịt hoặc Hiển thị vịt dẫn đầu */}
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!dangChoi ? (
              <button
                type="button"
                onClick={() => {
                  amThanh.phatTiengVitKeu();
                  khoiTaoDanVit(true);
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  border: '2px solid #facc15',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                🎨 Đổi màu & Xếp lại vịt
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.90)',
                  border: '2px solid #facc15',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                🦆 Dẫn đầu: <span style={{ color: '#facc15' }}>{nguoiDanDau || 'Đang bơi...'}</span>
              </div>
            )}
          </div>

          {/* Chính giữa trên bờ cỏ: BẢNG ĐỒNG HỒ ĐIỆN TỬ TRẮNG VIỀN ĐEN CHUẨN DUCKRACE-GAME.COM */}
          <div
            style={{
              background: '#e2e8f0',
              border: '3px solid #1e293b',
              borderRadius: '10px',
              padding: '3px 24px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.8)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 'clamp(1.35rem, 2.8vw, 2.1rem)',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.06em',
              lineHeight: 1.15
            }}
          >
            {dongHoDienTu}
          </div>

          {/* Bên phải: Nút Phóng to Toàn Màn Hình */}
          <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
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
      </div>

      {/* NÚT BẤM BẮT ĐẦU ĐUA VỊT Ở DƯỚI */}
      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="game-action-btn"
          onClick={() => {
            if (!dangChoi) {
              khoiTaoDanVit(false);
              amThanh.phatTiengVitKeu();
              onBatDauChoi();
            }
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #eab308 0%, #ea580c 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '11px 36px',
            borderRadius: '30px',
            fontSize: '1.02rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 20px rgba(234, 179, 8, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>
            {dangChoi ? '🦆 Đàn vịt đang bơi đua về vạch đích...' : '🦆 BẮT ĐẦU ĐUA VỊT'}
          </span>
        </button>
      </div>
    </div>
  );
};
