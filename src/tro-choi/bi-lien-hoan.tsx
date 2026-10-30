// Trò chơi: Bi Liên Hoàn (Vật lý bi lăn đầm bám máng dốc cơ học, không hiệu ứng chớp nháy, Bi 3D bóng mượt, Camera khóa bi #1, hỗ trợ Toàn màn hình)
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface BiLienHoanProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type TrangThaiDua = 'IDLE' | 'COUNTDOWN' | 'RACING';

interface VienBi {
  id: string;
  hs: HocSinh;
  name: string;
  hue: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  progress: number;
  finished: boolean;
  rank: number;
  rollFactor: number;
}

// Kích thước thế giới chuẩn hóa: x từ 0..1 (Trải rộng hết 100% khung), y từ 0..WORLD_HEIGHT
const WORLD_HEIGHT = 7.6;
const FINISH_Y = 7.35;
const MARBLE_R = 0.021;

// ============================================================================
// THIẾT KẾ ĐƯỜNG ĐUA CƠ HỌC THUẦN TÚY (MÁNG DỐC + PHỄU + CHONG CHÓNG + ĐINH PLINKO)
// ============================================================================
interface ThanhMang {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const TRACK_RAMPS: ThanhMang[] = [
  // Tường biên 2 bên sát mép khung
  { x1: 0.02, y1: 0, x2: 0.02, y2: 7.45 },
  { x1: 0.98, y1: 0, x2: 0.98, y2: 7.45 },

  // CHẶNG 1: Máng dốc hội tụ đầu tiên (y: 0.45 -> 1.35)
  { x1: 0.02, y1: 0.52, x2: 0.36, y2: 0.78 },
  { x1: 0.98, y1: 0.52, x2: 0.64, y2: 0.78 },
  // Máng chia đôi dòng chảy
  { x1: 0.50, y1: 0.92, x2: 0.24, y2: 1.16 },
  { x1: 0.50, y1: 0.92, x2: 0.76, y2: 1.16 },

  // CHẶNG 2: Đường trượt Zíc-Zắc liên hoàn (y: 1.55 -> 3.05)
  { x1: 0.02, y1: 1.55, x2: 0.66, y2: 1.88 },
  { x1: 0.98, y1: 2.02, x2: 0.34, y2: 2.35 },
  { x1: 0.02, y1: 2.50, x2: 0.66, y2: 2.82 },

  // CHẶNG 3: Phễu lớn giữa sân & Máng phân luồng 2 bên (y: 3.15 -> 4.45)
  { x1: 0.98, y1: 3.10, x2: 0.58, y2: 3.42 },
  { x1: 0.02, y1: 3.18, x2: 0.42, y2: 3.42 },
  // Vách nón chia 2 làn dưới phễu
  { x1: 0.50, y1: 3.72, x2: 0.30, y2: 3.96 },
  { x1: 0.50, y1: 3.72, x2: 0.70, y2: 3.96 },
  { x1: 0.02, y1: 4.12, x2: 0.34, y2: 4.36 },
  { x1: 0.98, y1: 4.12, x2: 0.66, y2: 4.36 },

  // CHẶNG 4: Đinh Plinko & Máng dốc chéo đôi (y: 4.60 -> 6.10)
  { x1: 0.22, y1: 5.38, x2: 0.50, y2: 5.18 },
  { x1: 0.78, y1: 5.38, x2: 0.50, y2: 5.18 },
  { x1: 0.02, y1: 5.62, x2: 0.38, y2: 5.92 },
  { x1: 0.98, y1: 5.62, x2: 0.62, y2: 5.92 },

  // CHẶNG 5: Phễu Chung Kết về Đích (y: 6.20 -> 7.35)
  { x1: 0.02, y1: 6.85, x2: 0.41, y2: 7.35 },
  { x1: 0.98, y1: 6.85, x2: 0.59, y2: 7.35 },
  { x1: 0.02, y1: 7.35, x2: 0.41, y2: 7.35 },
  { x1: 0.59, y1: 7.35, x2: 0.98, y2: 7.35 }
];

// Đinh ghim Plinko xếp đều đặn
function taoHangDinhPlinko(startY: number, rows: number): { x: number; y: number; r: number }[] {
  const pegs: { x: number; y: number; r: number }[] = [];
  for (let row = 0; row < rows; row++) {
    const y = startY + row * 0.16;
    const xs =
      row % 2 === 0
        ? [0.14, 0.28, 0.42, 0.58, 0.72, 0.86]
        : [0.08, 0.21, 0.35, 0.50, 0.65, 0.79, 0.92];
    for (const x of xs) {
      pegs.push({ x, y, r: 0.015 });
    }
  }
  return pegs;
}

const PLINKO_PEGS = [
  ...taoHangDinhPlinko(1.22, 2),
  ...taoHangDinhPlinko(4.52, 4),
  ...taoHangDinhPlinko(6.18, 4)
];

// Chong chóng cơ học quay đều (Windmills)
interface ChongChong {
  x: number;
  y: number;
  radius: number;
  speed: number;
  blades: number;
  phase: number;
}

const WINDMILLS: ChongChong[] = [
  { x: 0.50, y: 0.80, radius: 0.085, speed: 2.8, blades: 3, phase: 0.0 },
  { x: 0.24, y: 1.18, radius: 0.085, speed: -3.1, blades: 4, phase: 0.5 },
  { x: 0.76, y: 1.18, radius: 0.085, speed: 3.1, blades: 4, phase: 1.2 },
  { x: 0.74, y: 1.92, radius: 0.090, speed: -3.4, blades: 3, phase: 0.8 },
  { x: 0.26, y: 2.38, radius: 0.090, speed: 3.4, blades: 3, phase: 1.6 },
  { x: 0.74, y: 2.86, radius: 0.090, speed: -3.2, blades: 3, phase: 2.1 },
  { x: 0.50, y: 3.50, radius: 0.092, speed: 3.6, blades: 4, phase: 0.4 },
  { x: 0.26, y: 4.02, radius: 0.085, speed: -3.2, blades: 3, phase: 1.1 },
  { x: 0.74, y: 4.02, radius: 0.085, speed: 3.2, blades: 3, phase: 2.4 },
  { x: 0.50, y: 5.96, radius: 0.095, speed: -3.5, blades: 4, phase: 0.7 },
  { x: 0.36, y: 6.82, radius: 0.082, speed: 3.3, blades: 3, phase: 1.5 },
  { x: 0.64, y: 6.82, radius: 0.082, speed: -3.3, blades: 3, phase: 0.2 }
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function closestPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return { x: x1 + t * dx, y: y1 + t * dy };
}

// ============================================================================
// HÀM VẬT LÝ BI LĂN ĐẦM BÁM MÁNG (KHÔNG NẢY BAY LOẠN XẠ)
// ============================================================================
function collideCircleWithPoint(
  ball: VienBi,
  px: number,
  py: number,
  obstacleRadius: number,
  restitution = 0.24,
  extraVx = 0,
  extraVy = 0
) {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist = Math.hypot(dx, dy);
  const minDist = MARBLE_R + obstacleRadius;
  if (dist === 0 || dist >= minDist) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const rvx = ball.vx - extraVx;
  const rvy = ball.vy - extraVy;
  const vn = rvx * nx + rvy * ny;

  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
  }

  // Nếu va vào mặt trên của máng dốc thì hỗ trợ bi lăn xuôi theo chiều nghiêng
  if (ny < -0.25 && Math.abs(nx) > 0.1) {
    ball.vx += Math.sign(nx) * 0.015;
  }

  ball.vx += extraVx * 0.25;
  ball.vy += extraVy * 0.20;
  return true;
}

function collideWithSegment(
  ball: VienBi,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness = 0.012,
  restitution = 0.20,
  extraVx = 0,
  extraVy = 0
) {
  const nearest = closestPointOnSegment(ball.x, ball.y, x1, y1, x2, y2);
  return collideCircleWithPoint(ball, nearest.x, nearest.y, thickness, restitution, extraVx, extraVy);
}

// ============================================================================
// HÀM VẼ VIÊN BI 3D MÀU ĐẶC BÓNG MƯỢT (SOLID GLOSSY 3D SPHERE)
// ============================================================================
function veVienBi3DBongMuot(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  mr: number,
  hue: number,
  isLeader: boolean
) {
  ctx.save();

  // 1. Bóng đổ nhẹ dưới viên bi
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(mx + 2, my + 3, mr * 0.95, mr * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Khối cầu 3D màu đặc bóng mượt
  const sphereGrad = ctx.createRadialGradient(
    mx - mr * 0.32,
    my - mr * 0.35,
    mr * 0.08,
    mx,
    my,
    mr
  );
  sphereGrad.addColorStop(0, `hsl(${hue}, 95%, 78%)`);
  sphereGrad.addColorStop(0.45, `hsl(${hue}, 86%, 52%)`);
  sphereGrad.addColorStop(0.85, `hsl(${hue}, 88%, 36%)`);
  sphereGrad.addColorStop(1, `hsl(${hue}, 90%, 24%)`);

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  // 3. Điểm phản quang trắng bóng (Specular Highlight)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(mx - mr * 0.32, my - mr * 0.34, mr * 0.28, mr * 0.16, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 4. Viền ngoài sắc nét (Vàng kim cho bi #1, trắng mảnh cho các bi khác)
  ctx.lineWidth = isLeader ? 2.5 : 1.4;
  ctx.strokeStyle = isLeader ? '#facc15' : 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export const BiLienHoan: React.FC<BiLienHoanProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [raceState, setRaceState] = useState<TrangThaiDua>('IDLE');
  const [countdown, setCountdown] = useState<number>(0);
  const [liveMarbles, setLiveMarbles] = useState<VienBi[]>([]);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);

  const raceStateRef = useRef<TrangThaiDua>('IDLE');
  const marblesRef = useRef<VienBi[]>([]);
  const cameraYRef = useRef<number>(0);
  const simTimeRef = useRef<number>(0);
  const lastSoundTimeRef = useRef<number>(0);
  const onHoanThanhRef = useRef(onHoanThanh);

  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const setRaceStatus = useCallback((next: TrangThaiDua) => {
    raceStateRef.current = next;
    setRaceState(next);
  }, []);

  // Danh sách học sinh đã xáo trộn vị trí xuất phát
  const danhSachXuatPhat = useMemo(() => {
    if (shuffleOrder.length !== danhSach.length) return danhSach;
    return shuffleOrder.map(idx => danhSach[idx]).filter(Boolean);
  }, [danhSach, shuffleOrder]);

  // Khởi tạo các viên bi ở khu vực cổng xuất phát
  const taoDanhSachBi = useCallback((ds: HocSinh[]): VienBi[] => {
    const count = Math.max(ds.length, 1);
    const maxPerRow = Math.min(count, 10);

    // Xáo trộn ngẫu nhiên tốc độ lăn vi mô để 100% True Random
    const indices = Array.from({ length: count }, (_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return ds.map((hs, index) => {
      const row = Math.floor(index / maxPerRow);
      const col = index % maxPerRow;
      const itemsInRow = row === Math.floor((count - 1) / maxPerRow) ? ((count - 1) % maxPerRow) + 1 : maxPerRow;
      const spacing = itemsInRow > 1 ? 0.80 / (itemsInRow - 1) : 0;
      const baseX = itemsInRow === 1 ? 0.5 : 0.10 + col * spacing;
      const jitter = (Math.random() - 0.5) * 0.015;

      return {
        id: `${hs.id}-${index}`,
        hs,
        name: hs.ten,
        hue: Math.round((index * 360) / Math.max(count, 1)),
        x: clamp(baseX + jitter, 0.07, 0.93),
        y: 0.14 + row * 0.055 + (col % 2) * 0.012,
        vx: (Math.random() - 0.5) * 0.06,
        vy: 0,
        progress: 0,
        finished: false,
        rank: index + 1,
        rollFactor: 0.96 + (indices[index] / Math.max(1, count)) * 0.08
      };
    });
  }, []);

  // Làm mới vị trí xuất phát khi danh sách thay đổi và đang ở trạng thái chờ
  useEffect(() => {
    if (raceStateRef.current !== 'IDLE') return;
    const initial = taoDanhSachBi(danhSachXuatPhat);
    marblesRef.current = initial;
    cameraYRef.current = 0;
    simTimeRef.current = 0;
    setLiveMarbles(initial.map(item => ({ ...item })));
  }, [danhSachXuatPhat, taoDanhSachBi]);

  // Nếu cha tắt dangChoi từ bên ngoài thì đưa sân đua về IDLE sạch sẽ
  useEffect(() => {
    if (!dangChoi && raceStateRef.current !== 'IDLE') {
      setRaceStatus('IDLE');
      setCountdown(0);
      const resetMarbles = taoDanhSachBi(danhSachXuatPhat);
      marblesRef.current = resetMarbles;
      cameraYRef.current = 0;
      simTimeRef.current = 0;
      setLiveMarbles(resetMarbles.map(item => ({ ...item })));
    }
  }, [dangChoi, danhSachXuatPhat, setRaceStatus, taoDanhSachBi]);

  const handleXaoTron = () => {
    if (raceStateRef.current !== 'IDLE' || danhSach.length < 2) return;
    const indices = danhSach.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffleOrder(indices);
    amThanh.phatTiengTick();
  };

  const handleKhaiCuoc = useCallback(() => {
    if (danhSach.length === 0) return;
    if (raceStateRef.current === 'COUNTDOWN' || raceStateRef.current === 'RACING') return;

    onBatDauChoi();

    // Xáo trộn vị trí xuất phát ngẫu nhiên mỗi lượt chơi để đảm bảo 100% công bằng
    const shuffled = [...danhSach];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const freshMarbles = taoDanhSachBi(shuffled);
    marblesRef.current = freshMarbles;
    cameraYRef.current = 0;
    simTimeRef.current = 0;
    setLiveMarbles(freshMarbles.map(item => ({ ...item })));
    setCountdown(3);
    setRaceStatus('COUNTDOWN');
    amThanh.phatTiengTick();
  }, [danhSach, onBatDauChoi, setRaceStatus, taoDanhSachBi]);

  // Đồng bộ khi bấm nút từ ngoài
  useEffect(() => {
    if (dangChoi && raceStateRef.current === 'IDLE' && danhSach.length > 0) {
      const timer = window.setTimeout(() => {
        handleKhaiCuoc();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [dangChoi, danhSach.length, handleKhaiCuoc]);

  // Đếm ngược 3 - 2 - 1
  useEffect(() => {
    if (raceState !== 'COUNTDOWN') return;
    if (countdown <= 0) {
      const startTimer = window.setTimeout(() => {
        amThanh.phatTiengMoHop();
        setRaceStatus('RACING');
      }, 80);
      return () => window.clearTimeout(startTimer);
    }

    const timer = window.setTimeout(() => {
      setCountdown(prev => {
        const next = prev - 1;
        if (next > 0) amThanh.phatTiengTick();
        return next;
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [countdown, raceState, setRaceStatus]);

  // ============================================================================
  // VÒNG LẶP VẬT LÝ BI LĂN ĐẦM & VẼ CANVAS (KHÔNG CHỚP NHÁY)
  // ============================================================================
  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();
    let uiTimer = 0;

    const playSoftClack = () => {
      const now = performance.now();
      if (now - lastSoundTimeRef.current > 120) {
        lastSoundTimeRef.current = now;
        amThanh.phatTiengTick();
      }
    };

    const stepPhysics = (dt: number) => {
      const marbles = marblesRef.current;
      if (!marbles.length) return;

      simTimeRef.current += dt;
      const t = simTimeRef.current;

      const subSteps = 4;
      const subDt = dt / subSteps;

      for (let step = 0; step < subSteps; step++) {
        for (const ball of marbles) {
          if (ball.finished) continue;

          // Ngẫu nhiên tăng/giảm nhịp lăn nhẹ để các viên bi phía sau có cơ hội vượt mặt tự nhiên
          if (Math.random() < 0.006) {
            ball.rollFactor = 0.94 + Math.random() * 0.14;
          }

          // Trọng lực đầm chắc + lực đẩy nhẹ về trung tâm khi ở gần phễu cuối
          const gravity = 0.72 * ball.rollFactor;
          ball.vy += gravity * subDt;

          // Ma sát không khí giữ tốc độ rơi ổn định, không bao giờ văng quá nhanh
          ball.vx *= 0.994;
          ball.vy = clamp(ball.vy, -0.22, 0.36);
          ball.vx = clamp(ball.vx, -0.38, 0.38);

          ball.x += ball.vx * subDt;
          ball.y += ball.vy * subDt;

          // Giữ trong biên ngang
          if (ball.x < 0.02 + MARBLE_R) {
            ball.x = 0.02 + MARBLE_R;
            ball.vx = Math.abs(ball.vx) * 0.35;
          } else if (ball.x > 0.98 - MARBLE_R) {
            ball.x = 0.98 - MARBLE_R;
            ball.vx = -Math.abs(ball.vx) * 0.35;
          }

          // 1. Va chạm và lăn dọc theo các thanh Máng Dốc (TRACK_RAMPS)
          for (const seg of TRACK_RAMPS) {
            collideWithSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2, 0.012, 0.18);
          }

          // 2. Va chạm với Đinh Plinko (PLINKO_PEGS) - độ nảy thấp, lăn êm
          for (const peg of PLINKO_PEGS) {
            if (Math.abs(ball.y - peg.y) > 0.08) continue;
            if (collideCircleWithPoint(ball, peg.x, peg.y, peg.r, 0.28)) {
              // Thêm độ lệch ngang cực nhẹ để bi không bao giờ kẹt thẳng đứng trên đỉnh đinh
              if (Math.abs(ball.vx) < 0.03) {
                ball.vx += (Math.random() > 0.5 ? 1 : -1) * 0.05;
              }
              playSoftClack();
            }
          }

          // 3. Va chạm với Chong chóng cơ học (WINDMILLS)
          for (const wm of WINDMILLS) {
            if (Math.abs(ball.y - wm.y) > wm.radius + 0.05) continue;
            const baseAngle = t * wm.speed + wm.phase;
            for (let b = 0; b < wm.blades; b++) {
              const ang = baseAngle + (b * Math.PI * 2) / wm.blades;
              const x2 = wm.x + Math.cos(ang) * wm.radius;
              const y2 = wm.y + Math.sin(ang) * wm.radius;
              const pushVx = -Math.sin(ang) * wm.speed * 0.022;
              const pushVy = Math.cos(ang) * wm.speed * 0.015;
              collideWithSegment(ball, wm.x, wm.y, x2, y2, 0.010, 0.22, pushVx, pushVy);
            }
            // Trục tâm chong chóng
            collideCircleWithPoint(ball, wm.x, wm.y, 0.018, 0.2);
          }

          // Chống kẹt: Nếu viên bi bị đứng yên trên dốc thì đẩy nhẹ cho lăn tiếp
          if (Math.hypot(ball.vx, ball.vy) < 0.035) {
            ball.vx += (Math.random() - 0.5) * 0.08;
            ball.vy += 0.06;
          }

          // Kiểm tra chạm vạch đích cuối phễu
          if (ball.y >= FINISH_Y) {
            ball.y = FINISH_Y;
            ball.vx = 0;
            ball.vy = 0;
            ball.finished = true;
            ball.progress = 1;
            ball.rank = 1;

            // Dừng cuộc đua ngay khi viên bi #1 chạm đích và hiển thị bảng chúc mừng chung
            setRaceStatus('IDLE');
            amThanh.chienThang();
            onHoanThanhRef.current(ball.hs);
            return;
          }

          ball.progress = clamp(ball.y / FINISH_Y, 0, 0.999);
        }

        // 4. Va chạm đàn hồi nhẹ giữa các viên bi với nhau (tạo cảnh chen lấn ở cửa phễu)
        for (let i = 0; i < marbles.length; i++) {
          const a = marbles[i];
          if (a.finished) continue;
          for (let j = i + 1; j < marbles.length; j++) {
            const b = marbles[j];
            if (b.finished) continue;
            if (Math.abs(a.y - b.y) > MARBLE_R * 2.2) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minDist = MARBLE_R * 2;
            if (dist === 0 || dist >= minDist) continue;

            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const impulse = -0.65 * vn;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
            }
          }
        }
      }

      // Xếp hạng trực tiếp theo độ sâu y
      const sorted = [...marbles].sort((a, b) => b.y - a.y);
      sorted.forEach((item, idx) => {
        item.rank = idx + 1;
      });
    };

    const drawScene = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const viewWorldHeight = height / width;

      // CAMERA LUÔN BÁM THEO VIÊN BI DẪN ĐẦU (#1)
      const marbles = marblesRef.current;
      const leaderY = marbles.reduce((best, item) => Math.max(best, item.y), 0.16);
      const targetCam =
        raceStateRef.current === 'IDLE' || raceStateRef.current === 'COUNTDOWN'
          ? 0
          : clamp(leaderY - viewWorldHeight * 0.42, 0, Math.max(0, WORLD_HEIGHT - viewWorldHeight));
      cameraYRef.current += (targetCam - cameraYRef.current) * 0.10;

      const camY = cameraYRef.current;
      const toPxX = (wx: number) => wx * width;
      const toPxY = (wy: number) => (wy - camY) * width;
      const toPxR = (wr: number) => wr * width;

      // 1. NỀN SÂN ĐUA SÁNG SẠCH, DỄ NHÌN (Không hiệu ứng chớp nháy)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Lưới chấm bi tinh tế trên mặt bàn gỗ/nhựa
      const dotSpacing = Math.max(30, width * 0.04);
      const offsetY = (camY * width) % dotSpacing;
      ctx.fillStyle = '#e2e8f0';
      for (let gx = dotSpacing * 0.5; gx < width; gx += dotSpacing) {
        for (let gy = -offsetY; gy < height; gy += dotSpacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. VẠCH ĐÍCH CARO Ở CUỐI ĐƯỜNG ĐUA
      const finishPy = toPxY(FINISH_Y);
      if (finishPy > -60 && finishPy < height + 80) {
        const flagX = toPxX(0.38);
        const flagW = toPxX(0.62) - flagX;
        const flagH = 26;
        const cols = 12;
        const cellW = flagW / cols;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#ffffff';
            ctx.fillRect(flagX + c * cellW, finishPy + r * (flagH / 2), cellW, flagH / 2);
          }
        }
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 3;
        ctx.strokeRect(flagX, finishPy, flagW, flagH);

        ctx.fillStyle = '#15803d';
        ctx.font = '900 13px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏁 VẠCH ĐÍCH CHIẾN THẮNG 🏁', width * 0.5, finishPy + 45);
      }

      // 3. VẼ HỆ THỐNG MÁNG DỐC & PHỄU (TRACK_RAMPS)
      ctx.lineCap = 'round';
      for (const seg of TRACK_RAMPS) {
        const x1 = toPxX(seg.x1);
        const y1 = toPxY(seg.y1);
        const x2 = toPxX(seg.x2);
        const y2 = toPxY(seg.y2);
        if (Math.max(y1, y2) < -40 || Math.min(y1, y2) > height + 40) continue;

        // Bóng đổ thanh máng
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.lineWidth = Math.max(12, toPxR(0.022));
        ctx.beginPath();
        ctx.moveTo(x1, y1 + 3);
        ctx.lineTo(x2, y2 + 3);
        ctx.stroke();

        // Thân thanh máng gỗ/thép tối màu
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = Math.max(10, toPxR(0.020));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Đường viền sáng trên mặt máng
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(3, toPxR(0.006));
        ctx.beginPath();
        ctx.moveTo(x1, y1 - 2);
        ctx.lineTo(x2, y2 - 2);
        ctx.stroke();
      }

      // 4. VẼ ĐINH GHIM PLINKO (PLINKO_PEGS)
      for (const peg of PLINKO_PEGS) {
        const px = toPxX(peg.x);
        const py = toPxY(peg.y);
        if (py < -25 || py > height + 25) continue;
        const pr = Math.max(6, toPxR(peg.r));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.beginPath();
        ctx.arc(px + 1, py + 2, pr, 0, Math.PI * 2);
        ctx.fill();

        const pegGrad = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 1, px, py, pr);
        pegGrad.addColorStop(0, '#f8fafc');
        pegGrad.addColorStop(0.5, '#0284c7');
        pegGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = pegGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 5. VẼ CHONG CHÓNG CƠ HỌC QUAY ĐỀU (WINDMILLS)
      const t = simTimeRef.current;
      for (const wm of WINDMILLS) {
        const cx = toPxX(wm.x);
        const cy = toPxY(wm.y);
        if (cy < -90 || cy > height + 90) continue;

        const baseAngle = t * wm.speed + wm.phase;
        const bladeLen = toPxR(wm.radius);

        // Cánh chong chóng
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = Math.max(9, toPxR(0.017));
        ctx.lineCap = 'round';
        for (let b = 0; b < wm.blades; b++) {
          const ang = baseAngle + (b * Math.PI * 2) / wm.blades;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * bladeLen, cy + Math.sin(ang) * bladeLen);
          ctx.stroke();
        }

        // Trục tâm kim loại
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(8, toPxR(0.016)), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(3.5, toPxR(0.007)), 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. VẼ CÁC VIÊN BI 3D BÓNG MƯỢT & NHÃN TÊN HỌC SINH
      const sortedDraw = [...marbles].sort((a, b) => a.y - b.y);
      for (const ball of sortedDraw) {
        const mx = toPxX(ball.x);
        const my = toPxY(ball.y);
        if (my < -60 || my > height + 60) continue;
        const mr = Math.max(11, toPxR(MARBLE_R));
        const isLeader = ball.rank === 1 && raceStateRef.current === 'RACING';

        veVienBi3DBongMuot(ctx, mx, my, mr, ball.hue, isLeader);

        // Nhãn tên học sinh rõ nét phía trên viên bi
        const label = ball.name.length > 16 ? `${ball.name.slice(0, 15)}…` : ball.name;
        ctx.font = '800 11px "Segoe UI", system-ui, sans-serif';
        const textW = ctx.measureText(label).width;
        const padX = 7;
        const boxW = textW + padX * 2;
        const boxH = 19;
        const bx = clamp(mx - boxW / 2, 6, width - boxW - 6);
        const by = my - mr - boxH - 5;

        ctx.fillStyle = isLeader ? '#fef08a' : 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = isLeader ? '#ca8a04' : `hsl(${ball.hue}, 85%, 55%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isLeader ? '#0f172a' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + boxW / 2, by + boxH / 2);
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      if (raceStateRef.current === 'RACING') {
        stepPhysics(dt);
      }

      drawScene();

      uiTimer += dt;
      if (uiTimer >= 0.12) {
        uiTimer = 0;
        setLiveMarbles(marblesRef.current.map(item => ({ ...item })));
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [setRaceStatus]);

  const biDanDau = useMemo(() => {
    if (!liveMarbles.length) return null;
    return [...liveMarbles].sort((a, b) => a.rank - b.rank)[0] || null;
  }, [liveMarbles]);

  const phanTramDanDau = biDanDau ? Math.round(biDanDau.progress * 100) : 0;

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
      {/* KHUNG CANVAS FULL 100% Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 90px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.45)',
          border: '2px solid #cbd5e1',
          background: '#f8fafc'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* THANH HUD TRÊN CÙNG: XÁO TRỘN + DẪN ĐẦU #1 + NÚT TOÀN MÀN HÌNH */}
        <div
          className="game-hud-bar"
          style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            right: '14px',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}
        >
          {/* Bên trái: Xáo trộn */}
          <div style={{ pointerEvents: 'auto', minWidth: '110px' }}>
            {raceState === 'IDLE' && (
              <button
                type="button"
                onClick={handleXaoTron}
                disabled={danhSach.length < 2}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '999px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  cursor: danhSach.length < 2 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
              >
                <span>🔀 Xáo trộn</span>
              </button>
            )}
          </div>

          {/* Chính giữa: Theo dõi viên bi dẫn đầu #1 */}
          <div
            style={{
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '20px',
              border: '1px solid #334155',
              background: 'rgba(15, 23, 42, 0.9)',
              padding: '6px 18px',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
            }}
          >
            {raceState === 'IDLE' ? (
              <span>🔮 Sẵn sàng: <strong style={{ color: '#38bdf8' }}>{danhSach.length} viên bi</strong></span>
            ) : (
              <span>
                👑 Dẫn đầu (#1): <strong style={{ color: '#facc15' }}>{biDanDau?.name || 'Đang lăn...'}</strong> ({phanTramDanDau}%)
              </span>
            )}
          </div>

          {/* Bên phải: Nút Phóng to Toàn Màn Hình */}
          <div style={{ pointerEvents: 'auto', minWidth: '110px', display: 'flex', justifyContent: 'flex-end' }}>
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
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #475569',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)'
                }}
              >
                <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
              </button>
            )}
          </div>
        </div>

        {/* MÀN HÌNH ĐẾM NGƯỢC 3 - 2 - 1 GIỮA SÂN */}
        {raceState === 'COUNTDOWN' && countdown > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.28)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <span
              style={{
                fontSize: '7.5rem',
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 8px 30px rgba(15, 23, 42, 0.55)'
              }}
            >
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* NÚT BẤM KHỞI ĐỘNG LỚN DƯỚI SÂN ĐUA */}
      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          className="game-action-btn"
          onClick={handleKhaiCuoc}
          disabled={raceState === 'COUNTDOWN' || raceState === 'RACING' || danhSach.length === 0}
          style={{
            background:
              raceState === 'COUNTDOWN' || raceState === 'RACING'
                ? '#64748b'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 38px',
            borderRadius: '30px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor:
              raceState === 'COUNTDOWN' || raceState === 'RACING' || danhSach.length === 0
                ? 'not-allowed'
                : 'pointer',
            boxShadow:
              raceState === 'COUNTDOWN' || raceState === 'RACING'
                ? 'none'
                : '0 6px 20px rgba(22, 163, 74, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>
            {raceState === 'COUNTDOWN'
              ? '⏳ Đang đếm ngược xuất phát...'
              : raceState === 'RACING'
              ? '🔮 Các viên bi đang lăn qua chướng ngại vật...'
              : '🚀 BẮT ĐẦU ĐUA BI LIÊN HOÀN'}
          </span>
        </button>
      </div>
    </div>
  );
};
