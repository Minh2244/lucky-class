// Trò chơi thứ 9: Bom Hẹn Giờ (Hỗ trợ cả lớp ít <= 16 người nhìn trọn 1 vòng tròn lẫn lớp đông 30–100+ người với Sân Cỏ Công Viên Rộng + Camera Bám Theo Quả Bom + Mini-Map + Nhịp 5 Giây Cuối Chậm/Nhanh Bất Ngờ!)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface ChuyenBomProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface TrangPhucHocSinh {
  shirtMain: string;
  shirtAccent: string;
  pantsColor: string;
  isStriped: boolean;
}

const BO_TRANG_PHUC: TrangPhucHocSinh[] = [
  { shirtMain: '#ffffff', shirtAccent: '#ef4444', pantsColor: '#1d4ed8', isStriped: false },
  { shirtMain: '#3b82f6', shirtAccent: '#dbeafe', pantsColor: '#1e293b', isStriped: true },
  { shirtMain: '#ec4899', shirtAccent: '#fce7f3', pantsColor: '#1e3a8a', isStriped: false },
  { shirtMain: '#1e293b', shirtAccent: '#ffffff', pantsColor: '#2563eb', isStriped: false },
  { shirtMain: '#a855f7', shirtAccent: '#f3e8ff', pantsColor: '#f8fafc', isStriped: false },
  { shirtMain: '#10b981', shirtAccent: '#d1fae5', pantsColor: '#1e3a8a', isStriped: true },
  { shirtMain: '#f97316', shirtAccent: '#ffedd5', pantsColor: '#334155', isStriped: false },
  { shirtMain: '#eab308', shirtAccent: '#fef9c3', pantsColor: '#1d4ed8', isStriped: false }
];

const BANG_MAU_TOC = ['#1e1b4b', '#451a03', '#27272a', '#78350f', '#3f2314', '#5c2d16'];

interface HocSinhDungVongTron {
  hs: HocSinh;
  isGirl: boolean;
  hairColor: string;
  hairStyle: number;
  outfit: TrangPhucHocSinh;
  angle: number;
  x: number; // Tọa độ thế giới (World X, tâm vòng tròn là 0)
  y: number; // Tọa độ thế giới (World Y, tâm vòng tròn là 0)
}

interface ParkProp {
  x: number;
  y: number;
  kind: 'tree' | 'bench' | 'flowerbed';
  flip: number;
  tilt: number;
}

// Thời lượng ván chơi: 30 giây (30,000ms)
const BOMB_RACE_DURATION_MS = 30000;
const FINAL_SURPRISE_WINDOW_MS = 5000;

function doanGioiTinhNu(ten: string, idx: number): boolean {
  const lower = ten.toLowerCase();
  const tuKhoaNu = ['thị', 'ngọc', 'linh', 'anh', 'vy', 'lan', 'thảo', 'hân', 'trâm', 'my', 'nhi', 'châu', 'thư', 'ý', 'hà', 'mai', 'hương'];
  const tuKhoaNam = ['văn', 'minh', 'đức', 'quân', 'huy', 'nam', 'tuấn', 'kiệt', 'bách', 'trọng', 'khôi', 'đăng', 'bảo', 'toàn', 'hoàng'];
  for (const k of tuKhoaNu) {
    if (lower.includes(k)) return true;
  }
  for (const k of tuKhoaNam) {
    if (lower.includes(k)) return false;
  }
  return idx % 2 === 1;
}

export const ChuyenBom: React.FC<ChuyenBomProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nguoiDangCamBom, setNguoiDangCamBom] = useState<string>('');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    students: HocSinhDungVongTron[];
    props: ParkProp[];
    isLargeCircle: boolean;
    rx: number;
    ry: number;
    camX: number;
    camY: number;
    holderIdx: number;
    receiverIdx: number;
    passProgress: number;
    currentStepDurationMs: number;
    stepStartTimeMs: number;
    stepsRemainingInPace: number;
    enteredFinal5s: boolean;
    startTime: number;
    lastTickMs: number;
    daPhatNo: boolean;
    explodeTimer: number;
    animationFrameId: number;
  }>({
    students: [],
    props: [],
    isLargeCircle: false,
    rx: 355,
    ry: 188,
    camX: 0,
    camY: 0,
    holderIdx: 0,
    receiverIdx: 1,
    passProgress: 0,
    currentStepDurationMs: 520,
    stepStartTimeMs: 0,
    stepsRemainingInPace: 3,
    enteredFinal5s: false,
    startTime: 0,
    lastTickMs: 0,
    daPhatNo: false,
    explodeTimer: 0,
    animationFrameId: 0
  });

  // Chọn tốc độ truyền cho đợt tiếp theo tùy theo giai đoạn (0-2.5s khởi động | 2.5-25s tăng tốc đi hết vòng | 25-30s chậm nhanh bất ngờ!)
  const chonNhipTocDoMoi = (elapsedMs: number, totalStudents: number) => {
    const isCrowd = totalStudents > 16;
    const midPhaseEndMs = BOMB_RACE_DURATION_MS - FINAL_SURPRISE_WINDOW_MS;

    if (elapsedMs < 2500) {
      // Khởi động 2.5s đầu: nhìn rõ người xuất phát và hướng truyền
      return {
        durationMs: isCrowd ? 340 + Math.floor(Math.random() * 120) : 520 + Math.floor(Math.random() * 140),
        steps: 3
      };
    }

    if (elapsedMs < midPhaseEndMs) {
      // Đoạn giữa (2.5s -> 25.0s): Với lớp đông (30-100+ người), tự đẩy tốc độ cao giúp bom đi hết trọn 1.5 - 2 vòng tròn!
      if (isCrowd) {
        const midDurationMs = midPhaseEndMs - 2500;
        const targetStepsInMid = Math.max(40, totalStudents * 1.6);
        const avgMidMs = midDurationMs / targetStepsInMid;
        const fastMs = Math.max(75, Math.round(avgMidMs * 0.72));
        const mediumMs = Math.max(150, Math.round(avgMidMs * 1.45));

        const r = Math.random();
        if (r < 0.72) {
          return {
            durationMs: fastMs + Math.floor(Math.random() * 35),
            steps: 6 + Math.floor(Math.random() * 8)
          };
        }
        return {
          durationMs: mediumMs + Math.floor(Math.random() * 80),
          steps: 2 + Math.floor(Math.random() * 3)
        };
      }

      // Lớp <= 16 bạn ở đoạn giữa
      const rSmall = Math.random();
      if (rSmall < 0.35) {
        return { durationMs: 280 + Math.floor(Math.random() * 90), steps: 3 + Math.floor(Math.random() * 3) };
      }
      if (rSmall < 0.72) {
        return { durationMs: 460 + Math.floor(Math.random() * 140), steps: 2 + Math.floor(Math.random() * 3) };
      }
      return { durationMs: 680 + Math.floor(Math.random() * 160), steps: 2 };
    }

    // 5 GIÂY CUỐI (25.0s -> 30.0s): CHẬM - NHANH BẤT NGỜ KHÔNG AI ĐOÁN TRƯỚC ĐƯỢC!
    const randBuf = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randBuf);
    } else {
      randBuf[0] = Math.floor(Math.random() * 10000);
    }
    const rFinal = (randBuf[0] % 1000) / 1000;

    if (rFinal < 0.38) {
      // Chậm rì thót tim (0.68s - 0.92s cho 1-2 người)
      return {
        durationMs: 680 + Math.floor(Math.random() * 240),
        steps: 1 + Math.floor(Math.random() * 2)
      };
    }
    if (rFinal < 0.74) {
      // Vụt nhanh bất ngờ qua 3-6 người làm cả lớp giật mình!
      return {
        durationMs: (isCrowd ? 145 : 190) + Math.floor(Math.random() * 85),
        steps: 3 + Math.floor(Math.random() * 4)
      };
    }
    // Nhịp vừa ngập ngừng
    return {
      durationMs: 380 + Math.floor(Math.random() * 120),
      steps: 1 + Math.floor(Math.random() * 2)
    };
  };

  // Khởi tạo Vòng Tròn Học Sinh (Giữ Toàn Cảnh <= 30 học sinh; > 30 học sinh bật Sân Cỏ Rộng + Camera bám theo bom)
  const khoiTaoVongTronCoXanh = useCallback((xaoTronThuTu: boolean = true) => {
    const ds = [...danhSach];
    if (xaoTronThuTu && ds.length > 1) {
      for (let i = ds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ds[i], ds[j]] = [ds[j], ds[i]];
      }
    }

    const total = Math.max(1, ds.length);
    const isLargeCircle = total > 30;

    // <= 16 người: vòng gọn đẹp; 17–30 người: nới rộng vòng toàn cảnh vừa khít màn hình; > 30 người: công viên rộng kèm Camera
    let rx = total <= 16 ? 355 : 415;
    let ry = total <= 16 ? 188 : 186;
    if (isLargeCircle) {
      const avgR = Math.max(460, (total * 130) / (2 * Math.PI));
      rx = Math.round(avgR * 1.15);
      ry = Math.round(avgR * 0.85);
    }

    const chars: HocSinhDungVongTron[] = ds.map((hs, idx) => {
      const ang = (idx / total) * Math.PI * 2 - Math.PI / 2;
      return {
        hs,
        isGirl: doanGioiTinhNu(hs.ten, idx),
        hairColor: BANG_MAU_TOC[idx % BANG_MAU_TOC.length],
        hairStyle: idx % 3,
        outfit: BO_TRANG_PHUC[idx % BO_TRANG_PHUC.length],
        angle: ang,
        x: Math.cos(ang) * rx,
        y: Math.sin(ang) * ry
      };
    });

    // Sinh các tiểu cảnh công viên quanh vòng tròn lớn (cây xanh, ghế gỗ, bồn hoa)
    const props: ParkProp[] = [];
    if (isLargeCircle) {
      const numOuterProps = Math.max(8, Math.round(total / 3));
      for (let i = 0; i < numOuterProps; i++) {
        const ang = (i / numOuterProps) * Math.PI * 2 + 0.15;
        const kind: ParkProp['kind'] = i % 3 === 0 ? 'tree' : i % 3 === 1 ? 'bench' : 'flowerbed';
        props.push({
          x: Math.cos(ang) * (rx + 175),
          y: Math.sin(ang) * (ry + 165),
          kind,
          flip: i % 2 === 0 ? 1 : -1,
          tilt: Math.sin(ang) * 0.18
        });
      }
      // Thêm vài tiểu cảnh ở phía trong lòng công viên
      const numInnerProps = Math.max(4, Math.round(total / 8));
      for (let i = 0; i < numInnerProps; i++) {
        const ang = (i / numInnerProps) * Math.PI * 2 + 0.4;
        props.push({
          x: Math.cos(ang) * (rx * 0.52),
          y: Math.sin(ang) * (ry * 0.52),
          kind: i % 2 === 0 ? 'flowerbed' : 'bench',
          flip: 1,
          tilt: 0
        });
      }
    }

    const startIdx = chars.length > 0 ? Math.floor(Math.random() * chars.length) : 0;
    const nextIdx = chars.length > 1 ? (startIdx + 1) % chars.length : 0;
    const now = performance.now();

    const startChar = chars[startIdx];
    const initCamX = isLargeCircle && startChar ? startChar.x * 0.92 : 0;
    const initCamY = isLargeCircle && startChar ? startChar.y * 0.92 : 0;

    stateRef.current.students = chars;
    stateRef.current.props = props;
    stateRef.current.isLargeCircle = isLargeCircle;
    stateRef.current.rx = rx;
    stateRef.current.ry = ry;
    stateRef.current.camX = initCamX;
    stateRef.current.camY = initCamY;
    stateRef.current.holderIdx = startIdx;
    stateRef.current.receiverIdx = nextIdx;
    stateRef.current.passProgress = 0;
    stateRef.current.currentStepDurationMs = isLargeCircle ? 360 : 560;
    stateRef.current.stepStartTimeMs = now;
    stateRef.current.stepsRemainingInPace = 3;
    stateRef.current.enteredFinal5s = false;
    stateRef.current.startTime = now;
    stateRef.current.lastTickMs = 0;
    stateRef.current.daPhatNo = false;
    stateRef.current.explodeTimer = 0;
    setNguoiDangCamBom(startChar?.hs.ten || '');
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoVongTronCoXanh(true);
    }
  }, [danhSach, dangChoi, khoiTaoVongTronCoXanh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const veBuiCayHoa = (gx: number, gy: number, flip: number) => {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(flip, 1);

      ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
      ctx.beginPath();
      ctx.ellipse(25, 18, 55, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.arc(32, -8, 30, 0, Math.PI * 2);
      ctx.arc(22, 16, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(4, -6, 24, 0, Math.PI * 2);
      ctx.arc(28, -12, 18, 0, Math.PI * 2);
      ctx.fill();

      ['#f472b6', '#fef08a', '#fb7185'].forEach((hc, hi) => {
        ctx.fillStyle = hc;
        ctx.beginPath();
        ctx.arc(10 + hi * 12, -2 + (hi % 2) * 8, 4.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const veGheCongVien = (bx: number, by: number, tilt: number) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt);
      ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.6;
      ctx.fillRect(-24, -4, 4, 18);
      ctx.fillRect(20, -4, 4, 18);

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-28, -10, 56, 7, 2);
      ctx.roundRect(-28, 0, 56, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    // Vẽ mô hình Học Sinh Nam / Nữ đứng nguyên người trên thảm cỏ
    const veMoHinhHocSinhDung = (
      st: HocSinhDungVongTron,
      idx: number,
      totalCount: number,
      isCrowdOverview: boolean,
      prevSt: HocSinhDungVongTron,
      nextSt: HocSinhDungVongTron,
      isSender: boolean,
      isReceiver: boolean,
      passT: number,
      scale: number,
      timeSec: number
    ) => {
      const leanX = isSender && dangChoi && passT > 0.3
        ? (nextSt.x - st.x) * 0.06 * Math.sin(((passT - 0.3) / 0.7) * Math.PI)
        : 0;
      const leanY = isSender && dangChoi && passT > 0.3
        ? (nextSt.y - st.y) * 0.06 * Math.sin(((passT - 0.3) / 0.7) * Math.PI)
        : 0;
      const panicBounce = isSender && dangChoi ? Math.abs(Math.sin(timeSec * 18)) * -4 : 0;

      const px = st.x + leanX;
      const py = st.y + leanY + panicBounce;

      ctx.save();
      ctx.translate(px, py);

      // 1. Bóng đổ trên cỏ
      ctx.save();
      ctx.scale(scale, scale);
      if (isSender) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(0, 32, 32, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(20, 83, 45, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 32, 22, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const outline = '#1e293b';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 2. Tóc dài sau lưng cho Nữ sinh
      if (st.isGirl) {
        ctx.fillStyle = st.hairColor;
        ctx.beginPath();
        ctx.ellipse(0, -24, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-13, -15, 6, 12, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(13, -15, 6, 12, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 3. Chân & Giày
      ctx.fillStyle = st.outfit.pantsColor;
      ctx.beginPath();
      ctx.roundRect(-11, 10, 8, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(3, 10, 8, 20, 3);
      ctx.fill();
      ctx.stroke();

      if (st.isGirl) {
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(12, 8);
        ctx.lineTo(16, 19);
        ctx.lineTo(-16, 19);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(-8, 30, 6, 3.5, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(8, 30, 6, 3.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Áo học sinh
      ctx.fillStyle = st.outfit.shirtMain;
      ctx.beginPath();
      ctx.moveTo(-12, -11);
      ctx.lineTo(12, -11);
      ctx.lineTo(13, 11);
      ctx.lineTo(-13, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (st.outfit.isStriped) {
        ctx.fillStyle = st.outfit.shirtAccent;
        ctx.fillRect(-11, -5, 22, 3.5);
        ctx.fillRect(-11, 2, 22, 3.5);
      } else {
        ctx.fillStyle = st.outfit.shirtAccent;
        ctx.beginPath();
        ctx.moveTo(-3.5, -10);
        ctx.lineTo(3.5, -10);
        ctx.lineTo(2.5, 4);
        ctx.lineTo(0, 7);
        ctx.lineTo(-2.5, 4);
        ctx.closePath();
        ctx.fill();
      }

      // 5. Hai cánh tay dang nối vòng tròn & động tác trao bom tận tay theo chiều kim đồng hồ
      const dxPrev = prevSt.x - st.x;
      const dyPrev = prevSt.y - st.y;
      const lenPrev = Math.max(1, Math.hypot(dxPrev, dyPrev));
      const uxPrev = dxPrev / lenPrev;
      const uyPrev = dyPrev / lenPrev;

      const dxNext = nextSt.x - st.x;
      const dyNext = nextSt.y - st.y;
      const lenNext = Math.max(1, Math.hypot(dxNext, dyNext));
      const uxNext = dxNext / lenNext;
      const uyNext = dyNext / lenNext;

      const inX = -Math.cos(st.angle);
      const inY = -Math.sin(st.angle);

      let leftHandX = uxPrev * 24;
      let leftHandY = uyPrev * 20 - 2;
      let rightHandX = uxNext * 24;
      let rightHandY = uyNext * 20 - 2;

      if (isSender && (!dangChoi || passT < 0.35)) {
        leftHandX = inX * 22 - inY * 7;
        leftHandY = inY * 14 + inX * 7 + 4;
        rightHandX = inX * 22 + inY * 7;
        rightHandY = inY * 14 - inX * 7 + 4;
      } else if (isSender && dangChoi) {
        const reachRatio = (passT - 0.35) / 0.65;
        const reachDist = 16 + reachRatio * 22;
        rightHandX = uxNext * reachDist + inX * 10;
        rightHandY = uyNext * reachDist + inY * 6;
        leftHandX = uxNext * (reachDist - 7) + inX * 10;
        leftHandY = uyNext * (reachDist - 7) + inY * 6 + 3;
      } else if (isReceiver && dangChoi && passT > 0.35) {
        leftHandX = uxPrev * 28 + inX * 8;
        leftHandY = uyPrev * 22 + inY * 6;
      }

      ctx.strokeStyle = st.outfit.shirtMain;
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(-10, -7);
      ctx.lineTo(leftHandX, leftHandY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, -7);
      ctx.lineTo(rightHandX, rightHandY);
      ctx.stroke();

      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(leftHandX, leftHandY, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightHandX, rightHandY, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 6. Đầu & Mái tóc dày đẹp
      ctx.fillStyle = st.hairColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -29, 15.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -26, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = st.hairColor;
      ctx.beginPath();
      if (st.isGirl) {
        ctx.arc(0, -28, 14.5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.quadraticCurveTo(6, -30, 0, -28);
        ctx.quadraticCurveTo(-7, -30, -14, -27);
      } else {
        ctx.arc(0, -28.5, 14.8, Math.PI * 1.02, Math.PI * 1.98);
        ctx.lineTo(14, -28);
        ctx.lineTo(7, -25);
        ctx.lineTo(2, -28);
        ctx.lineTo(-5, -25);
        ctx.lineTo(-14, -28);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (st.isGirl) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(11, -35, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 7. Biểu cảm khuôn mặt
      if (isSender && dangChoi) {
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(-4.8, -24.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(4.8, -24.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4.8, -24.5, 1.3, 0, Math.PI * 2);
        ctx.arc(4.8, -24.5, 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(0, -18.5, 3.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(11.5, -28, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4.8, -24.5, 2.0, 0, Math.PI * 2);
        ctx.arc(4.8, -24.5, 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -20.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();

      // 8. Bảng tên học sinh (Với lớp toàn cảnh 17–30 bạn: tự xếp so le trong/ngoài để 30 bảng tên KHÔNG BAO GIỜ đè nhau!)
      let tagX = Math.cos(st.angle) * (54 * scale);
      let tagY = Math.sin(st.angle) * (48 * scale) + (Math.sin(st.angle) >= 0 ? 18 : -22);
      let fontSize = 11.5;
      let padW = 14;
      let boxH = 22;

      if (isCrowdOverview && totalCount > 16) {
        fontSize = 10;
        padW = 10;
        boxH = 19;
        const absCos = Math.abs(Math.cos(st.angle));
        if (absCos >= 0.72) {
          // Hai bên sườn 3h & 9h: đẩy hẳn bảng tên ra ngoài theo chiều ngang
          tagX = Math.cos(st.angle) * 70;
          tagY = Math.sin(st.angle) * 18;
        } else {
          // Vùng trên (12h) & dưới (6h): xếp so le 2 tầng (bạn chẵn phía ngoài, bạn lẻ phía trong vòng tròn)
          const isInnerSlot = idx % 2 === 1;
          if (isInnerSlot) {
            tagX = -Math.cos(st.angle) * 44;
            tagY = Math.sin(st.angle) < 0 ? 44 : -48;
          } else {
            tagX = Math.cos(st.angle) * 44;
            tagY = Math.sin(st.angle) < 0 ? -46 : 44;
          }
        }
      }

      // Nét nối mảnh khi xếp so le ở lớp 17–30 người để dễ nhìn bảng tên của từng bạn
      if (isCrowdOverview && totalCount > 16) {
        ctx.strokeStyle = isSender ? '#fef08a' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tagX * 0.65, tagY * 0.65);
        ctx.stroke();
      }

      ctx.font = `800 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
      const label = `${idx + 1}. ${st.hs.ten}`;
      const tw = ctx.measureText(label).width;
      const bw = tw + padW;

      ctx.fillStyle = isSender ? '#fef08a' : 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isSender ? '#ef4444' : isReceiver && dangChoi ? '#facc15' : '#ffffff';
      ctx.lineWidth = isSender ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX - bw / 2, tagY - boxH / 2, bw, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSender ? '#0f172a' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tagX, tagY + 0.5);

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const state = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const timeSec = now / 1000;
      const screenCx = w / 2;
      const screenCy = state.isLargeCircle ? h / 2 + 12 : 305;

      let remainSecFloat = BOMB_RACE_DURATION_MS / 1000;

      // ============================================================================
      // 1. CẬP NHẬT TRUYỀN TAY THEO CHIỀU KIM ĐỒNG HỒ ↻ (30 GIÂY - 5S CUỐI CHẬM/NHANH BẤT NGỜ)
      // ============================================================================
      if (dangChoi && state.students.length > 0) {
        if (!state.daPhatNo) {
          const elapsed = now - state.startTime;
          const remainMs = Math.max(0, BOMB_RACE_DURATION_MS - elapsed);
          remainSecFloat = remainMs / 1000;

          const stepElapsed = now - state.stepStartTimeMs;
          state.passProgress = Math.min(1, stepElapsed / state.currentStepDurationMs);

          // Âm thanh tích tắc khớp nhịp bước
          const tickInterval = Math.max(120, state.currentStepDurationMs * 0.85);
          if (now - state.lastTickMs > tickInterval) {
            state.lastTickMs = now;
            amThanh.phatTiengBomTick(remainSecFloat <= 5);
          }

          // Khi truyền tới bạn kế tiếp theo chiều kim đồng hồ
          if (state.passProgress >= 1) {
            state.passProgress = 0;
            state.stepStartTimeMs = now;
            state.holderIdx = state.receiverIdx;
            const total = state.students.length;
            state.receiverIdx = (state.holderIdx + 1) % total;
            setNguoiDangCamBom(state.students[state.holderIdx]?.hs.ten || '');

            state.stepsRemainingInPace--;
            const justEnteredFinal5s =
              elapsed >= BOMB_RACE_DURATION_MS - FINAL_SURPRISE_WINDOW_MS && !state.enteredFinal5s;
            if (justEnteredFinal5s) {
              state.enteredFinal5s = true;
            }

            if (state.stepsRemainingInPace <= 0 || justEnteredFinal5s) {
              const nextPace = chonNhipTocDoMoi(elapsed, total);
              state.currentStepDurationMs = nextPace.durationMs;
              state.stepsRemainingInPace = nextPace.steps;
            }
          }

          if (elapsed >= BOMB_RACE_DURATION_MS && !state.daPhatNo) {
            state.daPhatNo = true;
            state.explodeTimer = 62;
            remainSecFloat = 0;
            amThanh.phatTiengBomNo();
            amThanh.chienThang();
          }
        } else {
          remainSecFloat = 0;
          state.explodeTimer--;
          if (state.explodeTimer <= 0) {
            const victim = state.students[state.holderIdx] || state.students[0];
            state.daPhatNo = false;
            if (victim) {
              onHoanThanhRef.current(victim.hs);
            }
          }
        }
      }

      const allStudents = state.students;
      const total = allStudents.length;
      const charScale = state.isLargeCircle ? 1.02 : total <= 12 ? 1.05 : total <= 18 ? 0.86 : 0.72;

      // Tính tọa độ quả bom ở vành trong tay học sinh
      let bombWorldX = 0;
      let bombWorldY = 0;
      if (total > 0) {
        const sender = allStudents[state.holderIdx] || allStudents[0];
        const receiver = allStudents[state.receiverIdx] || sender;

        const senderHoldX = sender.x - Math.cos(sender.angle) * (28 * charScale);
        const senderHoldY = sender.y - Math.sin(sender.angle) * (16 * charScale) + 4;
        const receiverHoldX = receiver.x - Math.cos(receiver.angle) * (28 * charScale);
        const receiverHoldY = receiver.y - Math.sin(receiver.angle) * (16 * charScale) + 4;

        const handMoveRatio = !dangChoi
          ? 0
          : state.passProgress < 0.35
          ? 0
          : (state.passProgress - 0.35) / 0.65;

        bombWorldX = senderHoldX + (receiverHoldX - senderHoldX) * handMoveRatio;
        bombWorldY = senderHoldY + (receiverHoldY - senderHoldY) * handMoveRatio - Math.sin(handMoveRatio * Math.PI) * 8;
      }

      // Cập nhật Camera bám theo quả bom nếu là vòng tròn lớn (> 30 người)
      if (state.isLargeCircle && total > 0) {
        const targetCamX = bombWorldX * 0.92;
        const targetCamY = bombWorldY * 0.92;
        state.camX += (targetCamX - state.camX) * 0.14;
        state.camY += (targetCamY - state.camY) * 0.14;
      } else {
        state.camX = 0;
        state.camY = 0;
      }

      const camX = state.camX;
      const camY = state.camY;

      // ============================================================================
      // 2. VẼ SÂN CỎ CÔNG VIÊN (THEO HỆ TỌA ĐỘ CAMERA)
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // A. Nền thảm cỏ xanh tươi mát
      const lawnGrad = ctx.createRadialGradient(screenCx, screenCy, 40, screenCx, screenCy, w * 0.72);
      lawnGrad.addColorStop(0, '#84cc16');
      lawnGrad.addColorStop(0.55, '#4d7c0f');
      lawnGrad.addColorStop(1, '#2d4a10');
      ctx.fillStyle = lawnGrad;
      ctx.fillRect(0, 0, w, h);

      // Dải sọc cỏ cắt chéo trôi mượt theo Camera
      ctx.save();
      ctx.fillStyle = 'rgba(190, 242, 100, 0.08)';
      const stripeW = 110;
      const stripeShift = (((camX + camY * 0.35) % stripeW) + stripeW) % stripeW;
      for (let sx = -h - stripeShift - stripeW; sx < w + h + stripeW; sx += stripeW) {
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 55, 0);
        ctx.lineTo(sx + 55 - h * 0.35, h);
        ctx.lineTo(sx - h * 0.35, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Vùng nhìn thấy trong World Space
      const worldMinX = camX - screenCx - 160;
      const worldMaxX = camX + screenCx + 160;
      const worldMinY = camY - screenCy - 160;
      const worldMaxY = camY + screenCy + 160;

      // Đưa toàn bộ khung cảnh sân cỏ & nhân vật vào không gian Camera
      ctx.save();
      ctx.translate(screenCx - camX, screenCy - camY);

      // B. Sinh khóm cỏ non & hoa dại nhiều màu trên các ô lưới trong tầm nhìn Camera
      const cell = 135;
      const startCol = Math.floor(worldMinX / cell);
      const endCol = Math.ceil(worldMaxX / cell);
      const startRow = Math.floor(worldMinY / cell);
      const endRow = Math.ceil(worldMaxY / cell);
      const flowerPalette = ['#ffffff', '#fef08a', '#f9a8d4', '#fbcfe8'];

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const hash = Math.abs(c * 73856093 ^ r * 19349663);
          const gx = c * cell + (hash % 75) + 20;
          const gy = r * cell + ((hash >> 4) % 75) + 20;

          ctx.strokeStyle = 'rgba(132, 204, 22, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 3, gy - 7);
          ctx.moveTo(gx + 3, gy);
          ctx.lineTo(gx + 5, gy - 8);
          ctx.moveTo(gx + 6, gy);
          ctx.lineTo(gx + 9, gy - 6);
          ctx.stroke();

          if (hash % 3 === 0) {
            ctx.fillStyle = flowerPalette[hash % flowerPalette.length];
            ctx.beginPath();
            ctx.arc(gx + 15, gy - 3, 3.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(gx + 15, gy - 3, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // C. Vòng phấn trắng & Vòng dẫn hướng chiều kim đồng hồ dưới chân các học sinh
      ctx.fillStyle = 'rgba(190, 242, 100, 0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 16, state.rx - 14, state.ry - 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 16, state.rx + 8, state.ry + 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.58)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 12]);
      ctx.lineDashOffset = -timeSec * 36;
      ctx.beginPath();
      ctx.ellipse(0, 16, state.rx - 10, state.ry - 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // D. Vẽ tiểu cảnh công viên nếu là Vòng Tròn Lớn (> 16 người) trong vùng nhìn thấy
      if (state.isLargeCircle) {
        state.props.forEach(pr => {
          if (pr.x < worldMinX || pr.x > worldMaxX || pr.y < worldMinY || pr.y > worldMaxY) return;
          if (pr.kind === 'tree') {
            veBuiCayHoa(pr.x, pr.y, pr.flip);
          } else if (pr.kind === 'bench') {
            veGheCongVien(pr.x, pr.y, pr.tilt);
          } else {
            // Bồn hoa công viên
            ctx.save();
            ctx.translate(pr.x, pr.y);
            ctx.fillStyle = '#15803d';
            ctx.strokeStyle = '#052e16';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ['#f472b6', '#fef08a', '#ffffff', '#fb7185'].forEach((fc, fi) => {
              ctx.fillStyle = fc;
              ctx.beginPath();
              ctx.arc(-14 + fi * 9, (fi % 2 === 0 ? -4 : 4), 4, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }
        });
      }

      // E. Vẽ những học sinh nằm trong tầm nhìn Camera (giảm tải 100% khi lớp 60–100+ người!)
      const visibleStudents = allStudents
        .map((st, idx) => ({ st, idx }))
        .filter(({ st }) => st.x >= worldMinX && st.x <= worldMaxX && st.y >= worldMinY && st.y <= worldMaxY);

      visibleStudents.sort((a, b) => a.st.y - b.st.y);

      visibleStudents.forEach(({ st, idx }) => {
        const prevSt = allStudents[(idx - 1 + total) % total] || st;
        const nextSt = allStudents[(idx + 1) % total] || st;
        const isSender = idx === state.holderIdx;
        const isReceiver = idx === state.receiverIdx;

        veMoHinhHocSinhDung(
          st,
          idx,
          total,
          !state.isLargeCircle,
          prevSt,
          nextSt,
          isSender,
          isReceiver,
          state.passProgress,
          charScale,
          timeSec
        );
      });

      // F. Vẽ Quả Bom Hẹn Giờ ở vành trong tay học sinh
      const isUrgent = remainSecFloat <= 5 && dangChoi;
      if (total > 0) {
        ctx.save();
        ctx.translate(bombWorldX, bombWorldY);

        if (state.daPhatNo) {
          const boomScale = 1 + Math.sin(timeSec * 30) * 0.14;
          ctx.scale(boomScale, boomScale);
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            const r = i % 2 === 0 ? 64 : 34;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.font = '900 22px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥 BÙM!', 0, 0);
        } else {
          const pulse = 1 + (isUrgent ? Math.sin(timeSec * 28) * 0.12 : Math.sin(timeSec * 14) * 0.05);
          ctx.scale(pulse, pulse);

          const bGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 19);
          bGrad.addColorStop(0, '#ef4444');
          bGrad.addColorStop(0.45, '#1e293b');
          bGrad.addColorStop(1, '#020617');
          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.font = '900 8.5px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BOMB', 0, 1);

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.quadraticCurveTo(8, -28, 14, -23);
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(14, -23, 5 + Math.sin(timeSec * 30) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore(); // Kết thúc không gian Camera

      // ============================================================================
      // 3. LỚP TRANG TRÍ GÓC MÀN HÌNH + ĐỒNG HỒ BẤM GIỜ + MINI-MAP TOÀN CẢNH
      // ============================================================================
      // Khi <= 16 người: trang trí cố định 4 góc sân cỏ như công viên; khi > 16 người vẫn giữ dây cờ lễ hội 2 góc trên
      if (!state.isLargeCircle) {
        veBuiCayHoa(26, h - 22, 1);
        veBuiCayHoa(w - 26, h - 22, -1);
        veBuiCayHoa(20, 96, 1);
        veBuiCayHoa(w - 20, 96, -1);
        veGheCongVien(102, h - 38, -0.18);
        veGheCongVien(w - 102, h - 38, 0.18);

        [
          { bx: 84, by: 235, col: '#fef08a', phase: 0 },
          { bx: w - 84, by: 255, col: '#f9a8d4', phase: 2.1 }
        ].forEach(bf => {
          const flyX = bf.bx + Math.sin(timeSec * 1.8 + bf.phase) * 18;
          const flyY = bf.by + Math.cos(timeSec * 2.5 + bf.phase) * 14;
          const wing = 4 + Math.abs(Math.sin(timeSec * 12 + bf.phase)) * 4;
          ctx.save();
          ctx.translate(flyX, flyY);
          ctx.fillStyle = bf.col;
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(-3, 0, wing, 3.5, -0.3, 0, Math.PI * 2);
          ctx.ellipse(3, 0, wing, 3.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      // Dây cờ tam giác lễ hội ở 2 góc trên
      const flagColors = ['#ef4444', '#facc15', '#38bdf8', '#f472b6', '#22c55e'];
      const veDayCoGoc = (startX: number, startY: number, endX: number, endY: number) => {
        ctx.save();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, (startY + endY) / 2 + 22, endX, endY);
        ctx.stroke();

        const steps = 6;
        for (let i = 1; i < steps; i++) {
          const ft = i / steps;
          const fx = startX + (endX - startX) * ft;
          const fy = startY + (endY - startY) * ft + Math.sin(ft * Math.PI) * 14;
          ctx.fillStyle = flagColors[i % flagColors.length];
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(fx - 7, fy);
          ctx.lineTo(fx + 7, fy);
          ctx.lineTo(fx, fy + 14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      };
      veDayCoGoc(0, 62, 225, 16);
      veDayCoGoc(w, 62, w - 225, 16);

      // Đồng hồ bấm giờ thể thao (Ở tâm màn hình nếu <= 16 bạn, hoặc ghim đỉnh giữa nếu > 16 bạn để không che nhân vật)
      const clockX = w / 2;
      const clockY = state.isLargeCircle ? 78 : screenCy;
      const clockRadius = state.isLargeCircle ? 42 : 56;
      const timerRatio = Math.max(0, Math.min(1, remainSecFloat / (BOMB_RACE_DURATION_MS / 1000)));
      const ringColor = isUrgent ? '#ef4444' : remainSecFloat <= 10 && dangChoi ? '#facc15' : '#4ade80';

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(clockX, clockY + 6, clockRadius * 1.35, clockRadius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(clockX, clockY - clockRadius - 6, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isUrgent ? '#ef4444' : '#f59e0b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(clockX - 10, clockY - clockRadius - 3, 20, 9, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(clockX, clockY, clockRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(clockX, clockY, clockRadius - 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(clockX, clockY, clockRadius - 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
      ctx.stroke();

      ctx.fillStyle = isUrgent ? '#f87171' : '#ffffff';
      ctx.font = `900 ${state.isLargeCircle ? 20 : 25}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${remainSecFloat.toFixed(1)}s`, clockX, clockY + 1);
      ctx.restore();

      // BẢN ĐỒ THU NHỎ (MINI-MAP) Ở GÓC DƯỚI PHẢI KHI LỚP ĐÔNG (> 16 BẠN)
      if (state.isLargeCircle && total > 0) {
        const mapCx = w - 92;
        const mapCy = h - 78;
        const mapRx = 58;
        const mapRy = 44;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(mapCx - 76, mapCy - 60, 152, 114, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 9.5px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`TOÀN CẢNH (${total} HS)`, mapCx, mapCy - 46);

        // Vành tròn mini
        ctx.strokeStyle = 'rgba(132, 204, 22, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(mapCx, mapCy + 6, mapRx, mapRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Các chấm đại diện cho toàn bộ học sinh
        allStudents.forEach((st, idx) => {
          const mx = mapCx + (st.x / state.rx) * mapRx;
          const my = mapCy + 6 + (st.y / state.ry) * mapRy;
          ctx.fillStyle = idx === state.holderIdx ? '#ef4444' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(mx, my, idx === state.holderIdx ? 4.5 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Chấm vàng sáng vị trí quả bom trên bản đồ
        const bmX = mapCx + (bombWorldX / state.rx) * mapRx;
        const bmY = mapCy + 6 + (bombWorldY / state.ry) * mapRy;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bmX, bmY, 6 + Math.sin(timeSec * 14) * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

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
      {/* KHUNG SÂN CỎ XANH VÒNG TRÒN HỌC SINH CHƠI BOM HẸN GIỜ */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 78px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.55)',
          border: '2px solid #4d7c0f',
          background: '#365314'
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

        {/* THANH HUD TRÊN CÙNG: XÁO TRỘN VỊ TRÍ ĐỨNG NGẪU NHIÊN + NÚT TOÀN MÀN HÌNH */}
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
                  amThanh.phatTiengTick();
                  khoiTaoVongTronCoXanh(true);
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.90)',
                  color: '#ffffff',
                  border: '2px solid #facc15',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                }}
              >
                🔀 Xếp lại vị trí đứng ngẫu nhiên
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '2px solid #facc15',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}
              >
                💣 Đang cầm bom: <span style={{ color: '#fef08a' }}>{nguoiDangCamBom}</span>
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

      {/* NÚT BẤM BẮT ĐẦU BOM HẸN GIỜ Ở DƯỚI */}
      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="game-action-btn"
          onClick={() => {
            if (!dangChoi) {
              khoiTaoVongTronCoXanh(true);
              amThanh.phatTiengBomTick(false);
              onBatDauChoi();
            }
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '11px 36px',
            borderRadius: '30px',
            fontSize: '1.02rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 20px rgba(239, 68, 68, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>
            {dangChoi ? '💣 Bom hẹn giờ đang truyền theo chiều kim đồng hồ...' : '💣 BẮT ĐẦU BOM HẸN GIỜ'}
          </span>
        </button>
      </div>
    </div>
  );
};
