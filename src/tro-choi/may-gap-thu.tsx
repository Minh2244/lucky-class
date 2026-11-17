// Trò chơi thứ 8: Máy Gắp Thú Bông (Thiết kế chuẩn mẫu Tủ Arcade Hồng-Xanh Neon, Cần gạt 3D, Nút vàng Bắt đầu, Đồng hồ LED đỏ, Hố kính Nhận Thú & 8 loài Gấu Bông Kawaii nguyên con ôm bảng tên học sinh, 18 giây có pha tuột càng kịch tính)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface MayGapThuProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type LoaiThuBong = 'teddy_brown' | 'panda' | 'bunny_pink' | 'shiba' | 'calico_cat' | 'fox' | 'koala_grey' | 'koala_pink';

interface MauThuBong {
  loai: LoaiThuBong;
  cLight: string;
  cMain: string;
  cDark: string;
  belly: string;
  earInner: string;
  collar: string;
}

// 8 Mẫu Thú Bông Kawaii chuẩn theo đúng bức ảnh mẫu Máy Gắp Thú Bông
const BO_MAU_THU_BONG: MauThuBong[] = [
  { loai: 'teddy_brown', cLight: '#f59e0b', cMain: '#d97706', cDark: '#92400e', belly: '#fef3c7', earInner: '#fde68a', collar: '#ef4444' },
  { loai: 'panda', cLight: '#ffffff', cMain: '#f8fafc', cDark: '#cbd5e1', belly: '#ffffff', earInner: '#1e293b', collar: '#ec4899' },
  { loai: 'bunny_pink', cLight: '#fdf2f8', cMain: '#fbcfe8', cDark: '#f472b6', belly: '#ffffff', earInner: '#f472b6', collar: '#38bdf8' },
  { loai: 'shiba', cLight: '#fdba74', cMain: '#f97316', cDark: '#c2410c', belly: '#ffedd5', earInner: '#fef3c7', collar: '#10b981' },
  { loai: 'calico_cat', cLight: '#ffffff', cMain: '#f1f5f9', cDark: '#94a3b8', belly: '#ffffff', earInner: '#fda4af', collar: '#3b82f6' },
  { loai: 'fox', cLight: '#fb923c', cMain: '#ea580c', cDark: '#9a3412', belly: '#ffedd5', earInner: '#fef3c7', collar: '#a855f7' },
  { loai: 'koala_grey', cLight: '#cbd5e1', cMain: '#94a3b8', cDark: '#475569', belly: '#f1f5f9', earInner: '#fda4af', collar: '#06b6d4' },
  { loai: 'koala_pink', cLight: '#fbcfe8', cMain: '#f472b6', cDark: '#db2777', belly: '#fdf2f8', earInner: '#fef08a', collar: '#eab308' }
];

interface ThuBongItem {
  hs: HocSinh;
  mau: MauThuBong;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vy: number;
  row: number;
  bobPhase: number;
  isGrabbed: boolean;
  isWinner: boolean;
}

interface LuotGap {
  targetIdx: number;
  startMs: number;
  dropDoneMs: number;
  liftDoneMs: number;
  endMs: number;
  isWinAttempt: boolean;
  slipHeightRatio: number; // Tỷ lệ độ cao trước khi bị tuột (0.35 -> 0.92: lúc tuột thấp, lúc lên gần đỉnh mới tuột!)
  soundPlayedGrab: boolean;
  soundPlayedSlip: boolean;
}

const MAX_CLAW_MS = 25000;

export const MayGapThu: React.FC<MayGapThuProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trangThaiText, setTrangThaiText] = useState<string>('Sẵn sàng gắp thú bông!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    plushies: ThuBongItem[];
    clawX: number;
    clawY: number;
    clawOpenAngle: number;
    joystickTilt: number;
    startTime: number;
    attempts: LuotGap[];
    winnerIndex: number;
    daHoanThanh: boolean;
    winPauseTimer: number;
    ledSeconds: number;
    animationFrameId: number;
  }>({
    plushies: [],
    clawX: 560,
    clawY: 145,
    clawOpenAngle: 0.25,
    joystickTilt: 0,
    startTime: 0,
    attempts: [],
    winnerIndex: 0,
    daHoanThanh: false,
    winPauseTimer: 0,
    ledSeconds: 25,
    animationFrameId: 0
  });

  // Khởi tạo đàn thú bông & kịch bản Gắp Hên Xui (Tối đa 25 giây, sau 5s bắt đầu gắp ngẫu nhiên có thể trúng sớm hoặc hụt 1-2 lần!)
  const khoiTaoThuBong = useCallback((xaoTron: boolean = false) => {
    const ds = [...danhSach];
    if (xaoTron) {
      for (let i = ds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ds[i], ds[j]] = [ds[j], ds[i]];
      }
    }

    const total = Math.max(1, ds.length);
    const minX = 395;
    const maxX = 865;
    const numRows = total <= 7 ? 1 : total <= 16 ? 2 : 3;

    const items: ThuBongItem[] = ds.map((hs, idx) => {
      const row = idx % numRows;
      const colInRow = Math.floor(idx / numRows);
      const totalColsInRow = Math.ceil((total - row) / numRows);
      const ratioX = totalColsInRow <= 1 ? 0.5 : colInRow / (totalColsInRow - 1);
      const rowOffset = (row % 2) * 18;
      const bx = minX + ratioX * (maxX - minX - 20) + rowOffset;
      const by = 412 - (numRows - 1 - row) * 44;

      return {
        hs,
        mau: BO_MAU_THU_BONG[idx % BO_MAU_THU_BONG.length],
        baseX: bx,
        baseY: by,
        x: bx,
        y: by,
        vy: 0,
        row,
        bobPhase: Math.random() * Math.PI * 2,
        isGrabbed: false,
        isWinner: false
      };
    });

    // Quyết định ngẫu nhiên số lần gắp từ 1 đến 4 lần (random thật sự bằng crypto.getRandomValues) kể từ sau giây 5.0 cho tới tối đa 25.0s!
    // - Lần 1 dính luôn (~18%)
    // - Gắp 2 lần mới dính (~27%)
    // - Gắp 3 lần mới dính (~28%)
    // - Gắp 4 lần mới dính (~27%)
    const randBuf = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randBuf);
    } else {
      randBuf[0] = Math.floor(Math.random() * 10000);
    }
    const randRoll = (randBuf[0] % 1000) / 1000;
    const numAttempts = randRoll < 0.18 ? 1 : randRoll < 0.45 ? 2 : randRoll < 0.73 ? 3 : 4;

    const chosenIndices: number[] = [];
    for (let a = 0; a < numAttempts; a++) {
      let pick = Math.floor(Math.random() * total);
      if (total > 1 && chosenIndices.length > 0 && pick === chosenIndices[chosenIndices.length - 1]) {
        pick = (pick + 1 + Math.floor(Math.random() * (total - 1))) % total;
      }
      chosenIndices.push(pick);
    }

    const attempts: LuotGap[] = [];
    let curMs = 5000; // Đúng sau 5 giây đầu tiên bắt đầu lao xuống gắp!
    for (let a = 0; a < numAttempts; a++) {
      const isWin = a === numAttempts - 1;
      const seekAndDropDuration = 1650;
      const liftDuration = isWin ? 1950 : 1450 + Math.floor(Math.random() * 550);
      const tailDuration = isWin ? 2150 : 950; // Nếu trúng: đưa sang hố nhận quà (2.15s); nếu tuột: rơi xuống (0.95s)

      const dropDoneMs = curMs + seekAndDropDuration;
      const liftDoneMs = dropDoneMs + liftDuration;
      const endMs = liftDoneMs + tailDuration;

      attempts.push({
        targetIdx: chosenIndices[a],
        startMs: curMs,
        dropDoneMs,
        liftDoneMs,
        endMs,
        isWinAttempt: isWin,
        slipHeightRatio: 0.42 + Math.random() * 0.50,
        soundPlayedGrab: false,
        soundPlayedSlip: false
      });

      curMs = endMs;
    }

    const finalWinIdx = chosenIndices[chosenIndices.length - 1] ?? 0;

    stateRef.current.plushies = items;
    stateRef.current.clawX = 560;
    stateRef.current.clawY = 148;
    stateRef.current.clawOpenAngle = 0.25;
    stateRef.current.joystickTilt = 0;
    stateRef.current.startTime = performance.now();
    stateRef.current.attempts = attempts;
    stateRef.current.winnerIndex = finalWinIdx;
    stateRef.current.daHoanThanh = false;
    stateRef.current.winPauseTimer = 0;
    stateRef.current.ledSeconds = 25;
    setTrangThaiText('Sẵn sàng gắp thú bông!');
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoThuBong(false);
    }
  }, [danhSach, dangChoi, khoiTaoThuBong]);

  // Xử lý bấm trực tiếp vào nút vàng "BẮT ĐẦU GẮP THÚ" trên mặt bàn điều khiển tủ máy
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dangChoi || danhSach.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    // Vùng nút tròn vàng BẮT ĐẦU GẮP THÚ ở trung tâm bàn điều khiển (x: 535, y: 515)
    if (Math.hypot(cx - 535, cy - 515) <= 58) {
      khoiTaoThuBong(true);
      amThanh.phatTiengCangGap();
      onBatDauChoi();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Hàm vẽ Thú Bông Kawaii nguyên con chuẩn theo ảnh mẫu (Gấu Teddy, Panda, Thỏ hồng, Shiba, Mèo tam thể, Cáo, Koala)
    const veGauBongKawaii = (item: ThuBongItem, scale: number, timeSec: number) => {
      const p = item.mau;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(scale, scale);

      if (item.isGrabbed) {
        ctx.rotate(Math.sin(timeSec * 6.5) * 0.08);
      }

      const swing = item.isGrabbed ? Math.sin(timeSec * 9) * 3.5 : 0;

      // Hào quang phát sáng lấp lánh + tia điện xanh khi thú bông đang được càng gắp nhấc lên (y hệt Panda Khánh An trong ảnh!)
      if (item.isGrabbed) {
        const glow = ctx.createRadialGradient(0, -4, 8, 0, -4, 68);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        glow.addColorStop(0.55, 'rgba(250, 204, 21, 0.35)');
        glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, -4, 68, 0, Math.PI * 2);
        ctx.fill();

        // Tia chớp xanh-vàng lấp lánh quanh thú bông đang được gắp
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        [-1, 1].forEach(dir => {
          const lx = dir * (40 + Math.sin(timeSec * 20) * 4);
          ctx.beginPath();
          ctx.moveTo(dir * 26, -18);
          ctx.lineTo(lx, -26);
          ctx.lineTo(dir * 34, -8);
          ctx.lineTo(lx + dir * 8, -12);
          ctx.stroke();
        });
      }

      const makeGrad = (gx: number, gy: number, r: number) => {
        const g = ctx.createRadialGradient(gx - r * 0.25, gy - r * 0.3, r * 0.1, gx, gy, r);
        g.addColorStop(0, p.cLight);
        g.addColorStop(0.68, p.cMain);
        g.addColorStop(1, p.cDark);
        return g;
      };

      const outlineCol = '#3b1d0e';
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 1. VẼ ĐÔI TAI THEO TỪNG LOÀI THÚ BÔNG
      if (p.loai === 'bunny_pink') {
        [-1, 1].forEach(dir => {
          ctx.save();
          ctx.translate(dir * 12, -38);
          ctx.rotate(dir * 0.16);
          ctx.fillStyle = makeGrad(0, 0, 18);
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 17, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = p.earInner;
          ctx.beginPath();
          ctx.ellipse(0, 1, 3.6, 11.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (p.loai === 'shiba' || p.loai === 'calico_cat' || p.loai === 'fox') {
        [-1, 1].forEach(dir => {
          ctx.fillStyle = p.loai === 'calico_cat' && dir === 1 ? '#fb923c' : p.loai === 'calico_cat' && dir === -1 ? '#64748b' : makeGrad(dir * 14, -26, 14);
          ctx.beginPath();
          ctx.moveTo(dir * 21, -14);
          ctx.quadraticCurveTo(dir * 20, -37, dir * 13, -36);
          ctx.quadraticCurveTo(dir * 5, -31, dir * 3, -21);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = p.earInner;
          ctx.beginPath();
          ctx.moveTo(dir * 17, -17);
          ctx.lineTo(dir * 13, -30);
          ctx.lineTo(dir * 7, -21);
          ctx.closePath();
          ctx.fill();
        });
      } else if (p.loai === 'koala_grey' || p.loai === 'koala_pink') {
        // Tai Koala to tròn xù 2 bên
        [-1, 1].forEach(dir => {
          ctx.fillStyle = makeGrad(dir * 21, -18, 13);
          ctx.beginPath();
          ctx.arc(dir * 21, -18, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = p.earInner;
          ctx.beginPath();
          ctx.arc(dir * 21, -18, 6.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // Tai Gấu Teddy / Gấu Trúc Panda tròn xinh
        [-1, 1].forEach(dir => {
          ctx.fillStyle = p.loai === 'panda' ? '#1e293b' : makeGrad(dir * 16, -26, 11);
          ctx.beginPath();
          ctx.arc(dir * 16, -26, 9.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (p.loai !== 'panda') {
            ctx.fillStyle = p.earInner;
            ctx.beginPath();
            ctx.arc(dir * 16, -26, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // 2. THÂN THÚ BÔNG NGỒI MŨM MĨM
      ctx.fillStyle = makeGrad(0, 14, 22);
      ctx.beginPath();
      ctx.ellipse(0, 14, 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bụng trắng kem
      ctx.fillStyle = p.belly;
      ctx.beginPath();
      ctx.ellipse(0, 15, 13, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. ĐẦU THÚ BÔNG TRÒN PHÚNG PHÍNH
      ctx.fillStyle = makeGrad(0, -11, 24);
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.bezierCurveTo(18, -28, 24, -15, 22, -4);
      ctx.bezierCurveTo(20, 5, 10, 7, 0, 7);
      ctx.bezierCurveTo(-10, 7, -20, 5, -22, -4);
      ctx.bezierCurveTo(-24, -15, -18, -28, 0, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mảng lông màu trên trán cho Mèo Tam Thể hoặc Chó Shiba
      if (p.loai === 'calico_cat') {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(14, -22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(-14, -22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.loai === 'shiba') {
        // Hai chấm lông mày tròn trắng kem đặc trưng của Shiba
        ctx.fillStyle = '#fef3c7';
        [-1, 1].forEach(dir => {
          ctx.beginPath();
          ctx.ellipse(dir * 6.5, -16.5, 2.8, 1.8, dir * -0.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Vòng mắt đen cho Gấu Trúc Panda
      if (p.loai === 'panda') {
        [-1, 1].forEach(dir => {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.ellipse(dir * 8, -10, 5.5, 4.4, dir * 0.25, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Má hồng Kawaii
      [-1, 1].forEach(dir => {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.42)';
        ctx.beginPath();
        ctx.ellipse(dir * 13, -5.5, 4.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Đôi mắt đen tròn long lanh
      [-1, 1].forEach(dir => {
        const ex = dir * 7.8;
        const ey = -10.5;
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1.0, ey - 1.1, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 1.0, ey + 1.0, 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mõm & Mũi theo loài (Koala có mũi bầu dục đứng màu đen; Gấu/Thỏ/Mèo có mõm trắng kem)
      if (p.loai === 'koala_grey' || p.loai === 'koala_pink') {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, -6.5, 3.8, 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -5.5, 7.2, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.loai === 'bunny_pink' ? '#ec4899' : '#3b1d0e';
        ctx.beginPath();
        ctx.ellipse(0, -7.4, 2.6, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3b1d0e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2.3, -4.6, 2.3, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(2.3, -4.6, 2.3, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      // Nơ đỏ đeo cổ (cho Gấu Teddy) hoặc Vòng cổ xinh xắn
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 1.6;
      if (p.loai === 'teddy_brown') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(-6, 5, 5.5, 3.4, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(6, 5, 5.5, 3.4, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 5, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 4. HAI TAY THÚ BÔNG ÔM BẢNG TÊN TRƯỚC NGỰC (Giống hệt Panda Khánh An trong ảnh!)
      [-1, 1].forEach(dir => {
        ctx.save();
        ctx.translate(dir * 18, 11 + dir * swing * 0.4);
        ctx.rotate(dir * -0.45);
        ctx.fillStyle = p.loai === 'panda' ? '#1e293b' : makeGrad(0, 0, 10);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.2, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // 5. HAI BÀN CHÂN TRÒN PHÍA TRƯỚC CÓ ĐỆM THỊT HỒNG
      [-1, 1].forEach(dir => {
        const fx = dir * 13.5;
        const fy = 26 + dir * swing * 0.6;
        ctx.fillStyle = p.loai === 'panda' ? '#1e293b' : makeGrad(fx, fy, 9);
        ctx.beginPath();
        ctx.ellipse(fx, fy, 8.2, 6.8, dir * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.ellipse(fx, fy + 1.2, 3.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        [-3, 0, 3].forEach((tx, ti) => {
          ctx.beginPath();
          ctx.arc(fx + tx, fy - 2.4 + (ti === 1 ? -0.7 : 0), 1.2, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // 6. BẢNG TÊN HỌC SINH TRẮNG ĐẶT NGAY TRƯỚC BỤNG THÚ BÔNG (Chuẩn 100% ảnh mẫu!)
      ctx.font = '800 10.5px "Segoe UI", system-ui, sans-serif';
      const textW = ctx.measureText(item.hs.ten).width;
      const cardW = Math.max(48, textW + 14);
      const cardH = 19;
      ctx.fillStyle = item.isGrabbed ? '#fef9c3' : '#ffffff';
      ctx.strokeStyle = item.isGrabbed ? '#eab308' : '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-cardW / 2, 7, cardW, cardH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.hs.ten, 0, 16.5);

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const state = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const timeSec = now / 1000;

      // ============================================================================
      // 1. CẬP NHẬT CHUYỂN ĐỘNG CÀNG GẮP HÊN XUI (TỐI ĐA 25 GIÂY - SAU 5S BẮT ĐẦU GẮP NGẪU NHIÊN)
      // ============================================================================
      if (dangChoi && state.plushies.length > 0) {
        if (!state.daHoanThanh) {
          const elapsed = now - state.startTime;
          const remainMs = Math.max(0, MAX_CLAW_MS - elapsed);
          state.ledSeconds = Math.ceil(remainMs / 1000);

          // Cho các thú bông từng bị tuột rơi tự do về lại vị trí gốc
          state.plushies.forEach(p => {
            if (!p.isGrabbed && p.y < p.baseY) {
              p.vy += 0.65;
              p.y = Math.min(p.baseY, p.y + p.vy);
              p.x += (p.baseX - p.x) * 0.1;
            }
          });

          if (elapsed < 5000) {
            // 5 GIÂY ĐẦU TIÊN (0s -> 5.0s): Càng gắp đảo qua đảo lại ngắm mục tiêu
            const targetX = 625 + Math.sin(timeSec * 2.8) * 215;
            const prevClawX = state.clawX;
            state.clawX += (targetX - state.clawX) * 0.085;
            state.clawY = 148;
            state.clawOpenAngle = 0.34;
            state.joystickTilt = Math.max(-14, Math.min(14, (state.clawX - prevClawX) * 3.5));
          } else {
            // SAU 5 GIÂY: Chạy theo chuỗi Lượt Gắp Hên Xui (có thể trúng ngay lượt 1, hoặc tuột rồi trúng ở lượt 2 / lượt 3!)
            const activeAttempt =
              state.attempts.find(att => elapsed >= att.startMs && elapsed <= att.endMs) ||
              state.attempts[state.attempts.length - 1];

            if (activeAttempt) {
              const targetPlush = state.plushies[activeAttempt.targetIdx] || state.plushies[0];
              const seekEndMs = activeAttempt.startMs + 1000;

              if (elapsed < seekEndMs) {
                // Pha A: Lướt ngang tới thẳng đầu thú bông mục tiêu
                const prevClawX = state.clawX;
                state.clawX += (targetPlush.baseX - state.clawX) * 0.15;
                state.clawY += (148 - state.clawY) * 0.18;
                state.clawOpenAngle = 0.38;
                state.joystickTilt = Math.max(-14, Math.min(14, (state.clawX - prevClawX) * 3.5));
                setTrangThaiText('🎯 Đang ngắm mục tiêu và hạ càng gắp...');
              } else if (elapsed < activeAttempt.dropDoneMs) {
                // Pha B: Hạ cáp lao xuống ôm lấy thú bông
                state.clawX += (targetPlush.baseX - state.clawX) * 0.22;
                const dropRatio = Math.min(1, (elapsed - seekEndMs) / (activeAttempt.dropDoneMs - seekEndMs));
                state.clawY = 148 + dropRatio * (targetPlush.baseY - 26 - 148);
                state.clawOpenAngle = 0.38 - dropRatio * 0.30;
                state.joystickTilt = 0;
              } else if (elapsed < activeAttempt.liftDoneMs) {
                // Pha C: Kẹp thú bông nhấc lên cao (Hồi hộp không biết có bị tuột hay không!)
                if (!activeAttempt.soundPlayedGrab) {
                  activeAttempt.soundPlayedGrab = true;
                  amThanh.phatTiengCangGap();
                  setTrangThaiText(`✨ Đang kẹp nhấc "${targetPlush.hs.ten}" lên... Liệu có dính không?`);
                }
                targetPlush.isGrabbed = true;
                const liftRatio = Math.min(
                  1,
                  (elapsed - activeAttempt.dropDoneMs) / (activeAttempt.liftDoneMs - activeAttempt.dropDoneMs)
                );
                const maxLiftDist = (targetPlush.baseY - 26 - 162) * (activeAttempt.isWinAttempt ? 1 : activeAttempt.slipHeightRatio);
                state.clawY = (targetPlush.baseY - 26) - liftRatio * maxLiftDist;

                // Nếu là lượt sắp bị tuột càng: càng gắp bắt đầu rung lắc ở cuối nhịp nâng!
                const isShakingBeforeSlip = !activeAttempt.isWinAttempt && liftRatio > 0.72;
                state.clawOpenAngle = 0.06 + (isShakingBeforeSlip ? Math.sin(timeSec * 45) * 0.08 : 0);
                targetPlush.x = state.clawX + (isShakingBeforeSlip ? Math.sin(timeSec * 50) * 3.5 : 0);
                targetPlush.y = state.clawY + 26;
              } else {
                // Pha D: Kết quả lượt gắp này — HOẶC TUỘT CÀNG RƠI LẠI, HOẶC ĐƯA VỀ HỐ NHẬN THÚ CHIẾN THẮNG!
                if (!activeAttempt.isWinAttempt) {
                  if (!activeAttempt.soundPlayedSlip) {
                    activeAttempt.soundPlayedSlip = true;
                    targetPlush.isGrabbed = false;
                    targetPlush.vy = 2.2;
                    amThanh.phatTiengTuotCang();
                    setTrangThaiText(`😱 Ối! "${targetPlush.hs.ten}" bị tuột càng rơi lại rồi! Đang gắp tiếp...`);
                  }
                  state.clawOpenAngle = 0.42;
                  state.clawY += (148 - state.clawY) * 0.14;
                } else {
                  // Lượt gắp TRÚNG THẬT SỰ! Đưa thẳng sang Hố Nhận Thú (x = 275) và thả xuống!
                  targetPlush.isWinner = true;
                  const winTailProgress = Math.min(
                    1,
                    (elapsed - activeAttempt.liftDoneMs) / (activeAttempt.endMs - activeAttempt.liftDoneMs)
                  );

                  if (winTailProgress < 0.72) {
                    setTrangThaiText(`🎉 Kẹp dính chặt "${targetPlush.hs.ten}" rồi! Đang đưa vào Hố Nhận Thú!`);
                    const chuteTargetX = 275;
                    const prevClawX = state.clawX;
                    state.clawX += (chuteTargetX - state.clawX) * 0.12;
                    state.joystickTilt = Math.max(-14, Math.min(14, (state.clawX - prevClawX) * 3.5));
                    targetPlush.x = state.clawX;
                    targetPlush.y = state.clawY + 26;
                  } else {
                    state.clawOpenAngle = 0.42;
                    state.joystickTilt = 0;
                    targetPlush.y = Math.min(395, targetPlush.y + 8.0);
                    if (winTailProgress >= 0.98 && !state.daHoanThanh) {
                      state.daHoanThanh = true;
                      state.winPauseTimer = 42;
                      amThanh.chienThang();
                    }
                  }
                }
              }
            }
          }
        } else {
          state.winPauseTimer--;
          if (state.winPauseTimer <= 0) {
            const winItem = state.plushies[state.winnerIndex] || state.plushies[0];
            state.daHoanThanh = false;
            if (winItem) {
              onHoanThanhRef.current(winItem.hs);
            }
          }
        }
      }

      // ============================================================================
      // 2. VẼ BỐI CẢNH LỚP HỌC & TỦ MÁY GẮP THÚ BÔNG HỒNG-XANH NEON CHUẨN ẢNH MẪU
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // A. Phông nền lớp học buổi tối mờ ảo bên ngoài tủ máy
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.55, '#2e1065');
      bgGrad.addColorStop(1, '#17153b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Khung cửa sổ lớp học mờ hai bên
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(20, 75, 115, 210);
      ctx.fillRect(w - 135, 75, 115, 210);

      // B. KHUNG TỦ MÁY GẮP THÚ BÔNG CHÍNH GIỮA (x: 155 -> 945)
      const cabL = 155;
      const cabR = 945;
      const cabW = cabR - cabL;
      const glassL = 192;
      const glassR = 908;
      const glassT = 92;
      const glassB = 452;

      // Viền đèn ống Neon Xanh Cyan phát sáng dọc 2 bên sườn tủ máy (y hệt ảnh mẫu!)
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(cabL - 3, 52, cabW + 6, h - 56, 22);
      ctx.stroke();
      ctx.restore();

      // Thân vỏ tủ máy màu Hồng Dâu (Pink Arcade Body)
      const pinkBodyGrad = ctx.createLinearGradient(cabL, 52, cabR, 52);
      pinkBodyGrad.addColorStop(0, '#db2777');
      pinkBodyGrad.addColorStop(0.15, '#f472b6');
      pinkBodyGrad.addColorStop(0.5, '#ec4899');
      pinkBodyGrad.addColorStop(0.85, '#f472b6');
      pinkBodyGrad.addColorStop(1, '#be185d');
      ctx.fillStyle = pinkBodyGrad;
      ctx.beginPath();
      ctx.roundRect(cabL, 52, cabW, h - 54, 20);
      ctx.fill();

      // C. LỒNG KÍNH BÊN TRONG TỦ MÁY
      const interiorGrad = ctx.createLinearGradient(0, glassT, 0, glassB);
      interiorGrad.addColorStop(0, '#fbcfe8');
      interiorGrad.addColorStop(0.14, '#a855f7');
      interiorGrad.addColorStop(0.45, '#4c1d95');
      interiorGrad.addColorStop(1, '#2e1065');
      ctx.fillStyle = interiorGrad;
      ctx.beginPath();
      ctx.roundRect(glassL, glassT, glassR - glassL, glassB - glassT, 14);
      ctx.fill();

      // Đèn trần phát sáng trên nóc lồng kính
      const ceilingLight = ctx.createLinearGradient(0, glassT, 0, glassT + 36);
      ceilingLight.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      ceilingLight.addColorStop(1, 'rgba(244, 114, 182, 0)');
      ctx.fillStyle = ceilingLight;
      ctx.fillRect(glassL + 20, glassT, glassR - glassL - 40, 36);

      // Sàn gỗ hồng bên trong đáy tủ kính
      ctx.fillStyle = '#be185d';
      ctx.fillRect(glassL, glassB - 38, glassR - glassL, 38);

      // D. THANH RAY CƠ KHÍ INOX & DÂY CÁP XOẮN TRÊN NÓC TỦ (Chuẩn ảnh mẫu!)
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(glassL + 18, glassT + 22, glassR - glassL - 36, 9);
      ctx.strokeRect(glassL + 18, glassT + 22, glassR - glassL - 36, 9);

      // Dây cáp điện uốn võng từ góc trái sang hộp mô-tơ càng gắp
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(glassL + 75, glassT + 28);
      ctx.quadraticCurveTo((glassL + 75 + state.clawX) / 2, glassT + 68, state.clawX - 18, glassT + 28);
      ctx.stroke();

      // Cụm hộp mô-tơ hồng trượt trên thanh ray
      ctx.fillStyle = '#f472b6';
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(state.clawX - 24, glassT + 8, 48, 32, 7);
      ctx.fill();
      ctx.stroke();

      // Trục cáp thả càng gắp xuống
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#1e293b';
      ctx.fillRect(state.clawX - 6, glassT + 40, 12, Math.max(8, state.clawY - (glassT + 40) - 24));
      ctx.strokeRect(state.clawX - 6, glassT + 40, 12, Math.max(8, state.clawY - (glassT + 40) - 24));

      // E. VẼ ĐÀN THÚ BÔNG KAWAII XẾP TẦNG TRONG TỦ KÍNH
      const plushScale = state.plushies.length <= 10 ? 1.05 : state.plushies.length <= 18 ? 0.92 : 0.80;
      const sortedPlushies = [...state.plushies].sort((a, b) => a.row - b.row);

      // Vẽ các thú bông đang ngồi ở dưới trước
      sortedPlushies.forEach(item => {
        if (!item.isGrabbed) {
          const gentleBob = dangChoi ? Math.sin(timeSec * 4 + item.bobPhase) * 1.5 : 0;
          veGauBongKawaii({ ...item, y: item.y + gentleBob }, plushScale, timeSec);
        }
      });

      // Vẽ thú bông đang được càng gắp kẹp nhấc lên trên không trung
      const grabbedPlush = state.plushies.find(p => p.isGrabbed);
      if (grabbedPlush) {
        veGauBongKawaii(grabbedPlush, plushScale * 1.08, timeSec);
      }

      // F. VẼ CÀNG GẮP THÉP 3 CHẤU CÓ KHỚP ĐINH TÁN OAI VỆ
      const cx = state.clawX;
      const cy = state.clawY;
      const openAng = state.clawOpenAngle;

      // Đầu khớp nối hình thang bằng thép bạc
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 26);
      ctx.lineTo(cx + 12, cy - 26);
      ctx.lineTo(cx + 18, cy - 8);
      ctx.lineTo(cx - 18, cy - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hai gọng kẹp thép cong ôm hai bên thú bông
      [-1, 1].forEach(dir => {
        ctx.save();
        ctx.translate(cx + dir * 14, cy - 10);
        ctx.rotate(dir * openAng);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * 26, 20);
        ctx.lineTo(dir * 16, 48);
        ctx.stroke();

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * 26, 20);
        ctx.lineTo(dir * 16, 48);
        ctx.stroke();

        // Đinh tán tròn ở khớp gọng kẹp
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.arc(dir * 26, 20, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // G. HỐ KÍNH NHẬN THÚ TRONG SUỐT VIỀN XANH NEON Ở GÓC TRÁI ĐÁY TỦ (Chuẩn ảnh mẫu!)
      const chuteL = glassL + 16;
      const chuteR = 342;
      const chuteT = 348;
      const chuteB = glassB - 6;

      // Lòng hố tối bên dưới
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(chuteL + 12, chuteB);
      ctx.lineTo(chuteL + 38, chuteB - 36);
      ctx.lineTo(chuteR - 8, chuteB - 36);
      ctx.lineTo(chuteR - 22, chuteB);
      ctx.closePath();
      ctx.fill();

      // Vách kính 3D trong suốt có viền xanh ánh kim
      ctx.fillStyle = 'rgba(186, 230, 253, 0.18)';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(chuteL, chuteT, chuteR - chuteL - 22, chuteB - chuteT, 6);
      ctx.fill();
      ctx.stroke();

      // Mặt kính vát chéo 3D bên phải hố nhận thú
      ctx.beginPath();
      ctx.moveTo(chuteR - 22, chuteT);
      ctx.lineTo(chuteR, chuteT - 18);
      ctx.lineTo(chuteR, chuteB - 36);
      ctx.lineTo(chuteR - 22, chuteB);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Viền khung lồng kính
      ctx.strokeStyle = '#9d174d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(glassL, glassT, glassR - glassL, glassB - glassT, 14);
      ctx.stroke();

      // H. BẢNG HIỆU ĐÈN LED TRÊN NÓC TỦ: "MÁY GẮP THÚ BÔNG" KÈM NGÔI SAO VÀNG (Chuẩn 100% ảnh mẫu!)
      const signL = 315;
      const signR = 785;
      const signT = 12;
      const signH = 74;

      // Ngôi sao vàng 3D phóng ra hai bên bảng hiệu
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      [-1, 1].forEach(dir => {
        const sx = dir === -1 ? signL - 12 : signR + 12;
        ctx.beginPath();
        ctx.arc(sx, signT + 38, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Khung viền xanh biển đậm của bảng hiệu
      const signGrad = ctx.createLinearGradient(0, signT, 0, signT + signH);
      signGrad.addColorStop(0, '#0284c7');
      signGrad.addColorStop(0.5, '#1e3a8a');
      signGrad.addColorStop(1, '#172554');
      ctx.fillStyle = signGrad;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(signL, signT, signR - signL, signH, 18);
      ctx.fill();
      ctx.stroke();

      // Dàn bóng đèn tròn vàng ấm chạy quanh viền bảng hiệu
      const bulbCols = 13;
      for (let i = 0; i < bulbCols; i++) {
        const bx = signL + 22 + i * ((signR - signL - 44) / (bulbCols - 1));
        const isLit = (Math.floor(timeSec * 5) + i) % 2 === 0;
        ctx.fillStyle = isLit ? '#fef08a' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(bx, signT + 10, 4.5, 0, Math.PI * 2);
        ctx.arc(bx, signT + signH - 10, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chữ 3D "MÁY GẮP THÚ BÔNG" nổi bật ở giữa bảng hiệu
      ctx.font = '900 30px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#9d174d';
      ctx.lineWidth = 6;
      ctx.strokeText('MÁY GẮP THÚ BÔNG', (signL + signR) / 2, signT + signH / 2 + 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillText('MÁY GẮP THÚ BÔNG', (signL + signR) / 2, signT + signH / 2);

      // I. BÀN ĐIỀU KHIỂN PHÍA DƯỚI: CỬA "NHẬN THÚ", CẦN GẠT ĐỎ, NÚT VÀNG "BẮT ĐẦU GẮP THÚ" & ĐỒNG HỒ LED ĐỎ
      // 1. Cửa হố "NHẬN THÚ" bên góc trái dưới
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NHẬN THÚ', 252, 482);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(244, 492);
      ctx.lineTo(260, 492);
      ctx.lineTo(252, 502);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#3b0764';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(202, 504, 100, 68, 12);
      ctx.fill();
      ctx.stroke();

      // 2. Bàn điều khiển trung tâm màu xanh dương Neon (x: 345 -> 735)
      const consoleGrad = ctx.createLinearGradient(0, 474, 0, 568);
      consoleGrad.addColorStop(0, '#3b82f6');
      consoleGrad.addColorStop(0.5, '#2563eb');
      consoleGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = consoleGrad;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(345, 474, 390, 92, 18);
      ctx.fill();
      ctx.stroke();

      // 3. Cần gạt Joystick Đỏ 3D bên trái bàn điều khiển (x: 418, y: 522)
      const joyX = 418;
      const joyY = 524;
      ctx.fillStyle = '#831843';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(joyX, joyY, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(joyX, joyY - 3);
      ctx.lineTo(joyX + state.joystickTilt, joyY - 34);
      ctx.stroke();

      const knobGrad = ctx.createRadialGradient(
        joyX + state.joystickTilt - 5,
        joyY - 42,
        2,
        joyX + state.joystickTilt,
        joyY - 38,
        16
      );
      knobGrad.addColorStop(0, '#fca5a5');
      knobGrad.addColorStop(0.35, '#ef4444');
      knobGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = knobGrad;
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joyX + state.joystickTilt, joyY - 38, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Nút tròn vàng 3D "BẮT ĐẦU GẮP THÚ" ở chính giữa bàn điều khiển (x: 535, y: 515)
      const btnX = 535;
      const btnY = 516;
      // Đế bạc của nút bấm
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(btnX, btnY + 6, 48, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thân nút vàng 3D
      const btnPress = dangChoi ? 4 : 0;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(btnX, btnY + 2, 42, 23, 0, 0, Math.PI * 2);
      ctx.fill();

      const btnTopGrad = ctx.createRadialGradient(btnX - 10, btnY - 8 + btnPress, 4, btnX, btnY + btnPress, 42);
      btnTopGrad.addColorStop(0, '#fef08a');
      btnTopGrad.addColorStop(0.6, '#facc15');
      btnTopGrad.addColorStop(1, '#eab308');
      ctx.fillStyle = btnTopGrad;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(btnX, btnY - 4 + btnPress, 41, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = '900 10.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dangChoi ? 'ĐANG' : 'BẮT ĐẦU', btnX, btnY - 9 + btnPress);
      ctx.fillText('GẮP THÚ', btnX, btnY + 3 + btnPress);

      // 5. Đồng hồ LED đỏ điện tử bên phải nút vàng (x: 618, y: 500)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(615, 496, 92, 42, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.font = '900 23px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`00:${String(state.ledSeconds).padStart(2, '0')}`, 661, 518);
      ctx.shadowBlur = 0;

      // 6. Ổ nhét xu bạc góc phải dưới (x: 775)
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(775, 504, 110, 68, 10);
      ctx.fill();
      ctx.stroke();

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
      {/* KHUNG SÂN CHƠI MÁY GẮP THÚ BÔNG FULL Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 78px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
          border: '2px solid #ec4899',
          background: '#1e1b4b',
          cursor: dangChoi ? 'default' : 'pointer'
        }}
      >
        <canvas
          ref={canvasRef}
          width={1100}
          height={580}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* THANH HUD TRÊN CÙNG: TRẠNG THÁI / ĐẢO THÚ + NÚT TOÀN MÀN HÌNH */}
        <div
          className="game-hud-bar"
          style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            right: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            {!dangChoi ? (
              <button
                type="button"
                onClick={() => {
                  amThanh.phatTiengCangGap();
                  khoiTaoThuBong(true);
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  border: '1px solid #f472b6',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                }}
              >
                🔀 Đảo vị trí Thú Bông
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.90)',
                  border: '1px solid #facc15',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#fef08a'
                }}
              >
                🕹️ {trangThaiText}
              </div>
            )}
          </div>

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
                  boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                }}
              >
                <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NÚT BẤM BẮT ĐẦU GẮP THÚ Ở DƯỚI */}
      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="game-action-btn"
          onClick={() => {
            if (!dangChoi) {
              khoiTaoThuBong(true);
              amThanh.phatTiengCangGap();
              onBatDauChoi();
            }
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '11px 36px',
            borderRadius: '30px',
            fontSize: '1.02rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 20px rgba(236, 72, 153, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>
            {dangChoi ? '🕹️ Càng gắp đang tìm thú bông may mắn...' : '🕹️ BẮT ĐẦU GẮP THÚ BÔNG'}
          </span>
        </button>
      </div>
    </div>
  );
};
