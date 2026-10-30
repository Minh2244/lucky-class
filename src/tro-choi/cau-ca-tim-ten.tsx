// Trò chơi: Câu Cá Tìm Tên (Đồ họa Đại Dương & Cá Koi/Nhiệt Đới Chân Thực, 100% True Random Tranh Mồi Kịch Tính, Không Kẹt Giao Diện)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface CauCaProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  onBatDauChoi: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface LoaiCa {
  tenLoai: string;
  thanChinh: string;
  thanPhu: string;
  bungCa: string;
  vayCa: string;
  hoaTiet: 'koi' | 'stripes' | 'clown' | 'gold' | 'angel';
}

const DANH_SACH_LOAI_CA: LoaiCa[] = [
  { tenLoai: 'Cá Koi Đỏ Trắng', thanChinh: '#f43f5e', thanPhu: '#ffffff', bungCa: '#ffe4e6', vayCa: '#fb7185', hoaTiet: 'koi' },
  { tenLoai: 'Cá Thiên Thần Xanh', thanChinh: '#0284c7', thanPhu: '#38bdf8', bungCa: '#e0f2fe', vayCa: '#7dd3fc', hoaTiet: 'angel' },
  { tenLoai: 'Cá Rồng Hoàng Kim', thanChinh: '#eab308', thanPhu: '#f59e0b', bungCa: '#fef9c3', vayCa: '#fde047', hoaTiet: 'gold' },
  { tenLoai: 'Cá Hề Đại Dương', thanChinh: '#f97316', thanPhu: '#ffffff', bungCa: '#ffedd5', vayCa: '#fb923c', hoaTiet: 'clown' },
  { tenLoai: 'Cá Đuôi Gai Ngọc Bích', thanChinh: '#059669', thanPhu: '#34d399', bungCa: '#d1fae5', vayCa: '#6ee7b7', hoaTiet: 'stripes' },
  { tenLoai: 'Cá Hồng Vũ Tím', thanChinh: '#9333ea', thanPhu: '#c084fc', bungCa: '#f3e8ff', vayCa: '#d8b4fe', hoaTiet: 'angel' },
  { tenLoai: 'Cá Bướm Ánh Hồng', thanChinh: '#db2777', thanPhu: '#f472b6', bungCa: '#fce7f3', vayCa: '#f9a8d4', hoaTiet: 'stripes' },
  { tenLoai: 'Cá Koi Vàng Đen', thanChinh: '#f59e0b', thanPhu: '#1e293b', bungCa: '#fef3c7', vayCa: '#fcd34d', hoaTiet: 'koi' }
];

interface CaBoi {
  hs: HocSinh;
  index: number;
  loai: LoaiCa;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tailPhase: number;
  finPhase: number;
  size: number;
  mouthOpen: number;
  thoughtBubble?: string;
  thoughtTimer: number;
  boostGlow: number;
}

interface MoiCau {
  active: boolean;
  x: number;
  y: number;
  targetY: number;
  isSubmerged: boolean;
  bobOffset: number;
}

interface BotNuoc {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface VongSong {
  x: number;
  y: number;
  r: number;
  alpha: number;
  color: string;
}

export const CauCaTimTen: React.FC<CauCaProps> = ({
  danhSach,
  dangChoi,
  onHoanThanh,
  onBatDauChoi,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tienDoPhanTram, setTienDoPhanTram] = useState<number>(0);

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    fishes: CaBoi[];
    bubbles: BotNuoc[];
    ripples: VongSong[];
    moiCau: MoiCau;
    rodTipX: number;
    rodTipY: number;
    animationFrameId: number | null;
    phase: 'idle' | 'dropping' | 'competing' | 'biting' | 'reeling';
    phaseTime: number;
    startTimeMs: number;
    currentLeaderIdx: number | null;
    challengerIdx: number | null;
    winnerIdx: number | null;
    nextDramaSwitchMs: number;
    dramaRound: number;
  }>({
    fishes: [],
    bubbles: [],
    ripples: [],
    moiCau: { active: false, x: 550, y: -20, targetY: 300, isSubmerged: false, bobOffset: 0 },
    rodTipX: 550,
    rodTipY: 22,
    animationFrameId: null,
    phase: 'idle',
    phaseTime: 0,
    startTimeMs: 0,
    currentLeaderIdx: null,
    challengerIdx: null,
    winnerIdx: null,
    nextDramaSwitchMs: 0,
    dramaRound: 0
  });

  const khoiTaoDanCa = useCallback(() => {
    const w = 1100;
    const h = 580;

    const fishes: CaBoi[] = danhSach.map((hs, i) => {
      const loai = DANH_SACH_LOAI_CA[i % DANH_SACH_LOAI_CA.length];
      return {
        hs,
        index: i,
        loai,
        x: 95 + Math.random() * (w - 190),
        y: 125 + Math.random() * (h - 225),
        vx: (Math.random() > 0.5 ? 1 : -1) * (1.05 + Math.random() * 0.75),
        vy: (Math.random() - 0.5) * 0.5,
        tailPhase: Math.random() * Math.PI * 2,
        finPhase: Math.random() * Math.PI * 2,
        size: 0.96 + (i % 3) * 0.06,
        mouthOpen: 0,
        thoughtTimer: 0,
        boostGlow: 0
      };
    });

    const bubbles: BotNuoc[] = [];
    for (let i = 0; i < 45; i++) {
      bubbles.push({
        x: Math.random() * w,
        y: 60 + Math.random() * (h - 60),
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.45 - Math.random() * 0.65,
        radius: 2 + Math.random() * 4.5,
        alpha: 0.25 + Math.random() * 0.45
      });
    }

    const st = stateRef.current;
    st.fishes = fishes;
    st.bubbles = bubbles;
    st.ripples = [];
    st.moiCau.active = false;
    st.moiCau.isSubmerged = false;
    st.phase = 'idle';
    st.currentLeaderIdx = null;
    st.challengerIdx = null;
    st.winnerIdx = null;
    setTienDoPhanTram(0);
  }, [danhSach]);

  useEffect(() => {
    khoiTaoDanCa();
  }, [khoiTaoDanCa]);

  // Nếu thoát chế độ đang chơi từ bên ngoài thì đảm bảo hồ cá sạch sẽ, không kẹt
  useEffect(() => {
    if (!dangChoi && stateRef.current.phase !== 'idle') {
      stateRef.current.moiCau.active = false;
      stateRef.current.phase = 'idle';
      setTienDoPhanTram(0);
    }
  }, [dangChoi]);

  const thaMoiTai = useCallback((clickX?: number, clickY?: number) => {
    const state = stateRef.current;
    if (state.fishes.length === 0) return;

    const targetX = clickX ? Math.max(180, Math.min(920, clickX)) : 450 + (Math.random() - 0.5) * 240;
    const targetY = clickY ? Math.max(190, Math.min(430, clickY)) : 280 + (Math.random() - 0.5) * 90;

    state.rodTipX = targetX;
    state.moiCau = {
      active: true,
      x: targetX,
      y: 25,
      targetY,
      isSubmerged: false,
      bobOffset: 0
    };

    state.fishes.forEach(f => {
      f.thoughtBubble = undefined;
      f.thoughtTimer = 0;
      f.boostGlow = 0;
      f.mouthOpen = 0;
    });

    // Chọn ngẫu nhiên chú cá đầu tiên phát hiện mồi (100% True Random)
    const firstLeader = Math.floor(Math.random() * state.fishes.length);
    state.currentLeaderIdx = firstLeader;
    state.challengerIdx = null;
    state.winnerIdx = null;
    state.dramaRound = 0;
    state.phase = 'dropping';
    state.phaseTime = 0;
    state.startTimeMs = performance.now();
    state.nextDramaSwitchMs = state.startTimeMs + 2800;

    setTienDoPhanTram(2);
    amThanh.phatTiengTick();
  }, []);

  useEffect(() => {
    if (dangChoi && stateRef.current.phase === 'idle') {
      thaMoiTai();
    }
  }, [dangChoi, thaMoiTai]);

  // VÒNG LẶP ĐỒ HỌA ĐẠI DƯƠNG & TRANH MỒI NGẪU NHIÊN 40 GIÂY
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Hàm vẽ chú cá nhiệt đới / Koi chân thực, mềm mại
    const veCaChanThuc = (ca: CaBoi, isHooked: boolean) => {
      ctx.save();
      ctx.translate(ca.x, ca.y);

      const facing = ca.vx >= 0 ? 1 : -1;
      // Khi đang bị kéo lên mặt nước thì đầu cá hướng lên trên
      if (isHooked) {
        ctx.rotate(-Math.PI / 2 + Math.sin(ca.tailPhase * 1.5) * 0.18);
      } else {
        const tilt = Math.max(-0.35, Math.min(0.35, ca.vy * 0.12)) * facing;
        ctx.rotate(tilt);
        ctx.scale(facing, 1);
      }

      ctx.scale(ca.size, ca.size);

      const wag = Math.sin(ca.tailPhase) * 9;
      const finWave = Math.sin(ca.finPhase) * 5;
      const { loai } = ca;

      // Hào quang bứt tốc khi cá lao vào tranh mồi
      if (ca.boostGlow > 0) {
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = `rgba(250, 204, 21, ${Math.min(0.75, ca.boostGlow)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(-2, 0, 34, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 1. VÂY ĐUÔI LỤA KÉP (Caudal Fin)
      const tailGrad = ctx.createLinearGradient(-22, 0, -48, 0);
      tailGrad.addColorStop(0, loai.thanChinh);
      tailGrad.addColorStop(0.7, loai.vayCa);
      tailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
      ctx.fillStyle = tailGrad;

      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.bezierCurveTo(-34, -14 + wag * 0.3, -46 + wag * 0.5, -20 + wag, -49 + wag, -11 + wag);
      ctx.quadraticCurveTo(-38 + wag * 0.4, 0, -49 + wag, 11 + wag);
      ctx.bezierCurveTo(-46 + wag * 0.5, 20 + wag, -34, 14 + wag * 0.3, -22, 0);
      ctx.closePath();
      ctx.fill();

      // Tia vây đuôi
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      for (let t = -2; t <= 2; t++) {
        ctx.beginPath();
        ctx.moveTo(-23, t * 1.5);
        ctx.lineTo(-43 + wag * 0.7, t * 5 + wag * 0.6);
        ctx.stroke();
      }

      // 2. VÂY LƯNG (Dorsal Fin) & VÂY BỤNG
      ctx.fillStyle = loai.vayCa;
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.quadraticCurveTo(-4, -25 - finWave * 0.4, 10, -11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Vây bụng sau
      ctx.fillStyle = loai.vayCa;
      ctx.beginPath();
      ctx.moveTo(-14, 9);
      ctx.quadraticCurveTo(-8, 20 + finWave * 0.4, -1, 11);
      ctx.closePath();
      ctx.fill();

      // 3. THÂN CÁ KHÍ ĐỘNG HỌC (Streamlined Sculpted Body)
      const bodyGrad = ctx.createLinearGradient(0, -15, 0, 15);
      bodyGrad.addColorStop(0, loai.thanChinh);
      bodyGrad.addColorStop(0.55, loai.thanPhu);
      bodyGrad.addColorStop(1, loai.bungCa);

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(27, 0); // Đầu mũi cá
      ctx.bezierCurveTo(18, -16, -8, -16, -24, -4); // Sống lưng
      ctx.lineTo(-24, 4); // Cuống đuôi
      ctx.bezierCurveTo(-8, 16, 18, 16, 27, 0); // Bụng cá
      ctx.closePath();
      ctx.fill();

      // Họa tiết đặc trưng từng loài cá
      ctx.save();
      ctx.clip(); // Cắt gọn trong thân cá
      if (loai.hoaTiet === 'clown') {
        // Sọc trắng viền đen của cá Hề Nemo
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        [-12, 2, 14].forEach(sx => {
          ctx.beginPath();
          ctx.ellipse(sx, 0, 3.8, 18, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (loai.hoaTiet === 'koi') {
        // Đốm Koi nghệ thuật
        ctx.fillStyle = loai.thanChinh;
        ctx.beginPath();
        ctx.arc(-6, -5, 8, 0, Math.PI * 2);
        ctx.arc(8, 3, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (loai.hoaTiet === 'stripes') {
        // Sọc nhiệt đới
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2.2;
        for (let sx = -14; sx <= 10; sx += 6) {
          ctx.beginPath();
          ctx.moveTo(sx, -15);
          ctx.quadraticCurveTo(sx + 3, 0, sx, 15);
          ctx.stroke();
        }
      }

      // Vảy cá lấp lánh (Shimmering Scales)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1;
      for (let row = -1; row <= 1; row++) {
        for (let col = -14; col <= 8; col += 6) {
          ctx.beginPath();
          ctx.arc(col + (row % 2) * 3, row * 5, 3.2, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();
        }
      }

      // Bóng sáng 3D trên lưng cá
      const shineGrad = ctx.createLinearGradient(0, -14, 0, -2);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.ellipse(2, -8, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Viền thân cá sắc nét
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.bezierCurveTo(18, -16, -8, -16, -24, -4);
      ctx.lineTo(-24, 4);
      ctx.bezierCurveTo(-8, 16, 18, 16, 27, 0);
      ctx.stroke();

      // Đường mang cá (Gill cover)
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(11, 0, 8.5, -Math.PI * 0.4, Math.PI * 0.45);
      ctx.stroke();

      // 4. VÂY NGỰC (Pectoral Fin) vẫy mềm mại
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.quadraticCurveTo(1, 13 + finWave, -4, 7 + finWave * 0.6);
      ctx.quadraticCurveTo(2, 3, 8, 4);
      ctx.fill();

      // 5. MẮT CÁ 3D LONG LANH
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(17, -3.5, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(18, -3.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(18.8, -4.5, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // 6. MIỆNG CÁ (Há miệng khi sắp đớp mồi)
      if (ca.mouthOpen > 0.1) {
        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.arc(25.5, 1.5, 2.8 * ca.mouthOpen, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(24.5, 1.5, 2.5, 0.15, Math.PI * 0.75);
        ctx.stroke();
      }

      ctx.restore();

      // 7. NHÃN TÊN HỌC SINH TRÊN LƯNG CÁ (Không hiển thị chữ nổi rườm rà)
      ctx.save();
      ctx.font = 'bold 11.5px "Segoe UI", system-ui, sans-serif';
      const nameW = ctx.measureText(ca.hs.ten).width;
      const pillW = nameW + 16;
      const pillH = 20;
      const pillX = ca.x - pillW / 2;
      const pillY = ca.y - 34;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = ca.boostGlow > 0.2 ? '#facc15' : loai.thanChinh;
      ctx.lineWidth = ca.boostGlow > 0.2 ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ca.hs.ten, ca.x, pillY + pillH / 2);

      ctx.restore();
    };

    const render = () => {
      if (!running) return;

      const state = stateRef.current;
      const { fishes, bubbles, ripples, moiCau } = state;
      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();

      state.phaseTime++;

      // ============================================================================
      // 1. CƠ CHẾ CÂU CÁ 100% TRUE RANDOM VỚI KỊCH TÍNH TRANH MỒI & VƯỢT MẶT (20 GIÂY)
      // ============================================================================
      if (moiCau.active && fishes.length > 0) {
        const elapsedMs = now - state.startTimeMs;
        const pct = Math.min(99, Math.floor((elapsedMs / 20000) * 100));
        setTienDoPhanTram(pct);

        // Phát sóng hương thơm thu hút cá định kỳ
        if (state.phaseTime % 34 === 0 && state.phase !== 'reeling') {
          ripples.push({
            x: moiCau.x,
            y: moiCau.y + 6,
            r: 6,
            alpha: 0.75,
            color: '#fef08a'
          });
        }

        // Giai đoạn 1: Mồi chìm xuống nước (0 - 1.8s)
        if (state.phase === 'dropping') {
          if (moiCau.y < moiCau.targetY) {
            moiCau.y += 4.5;
          } else {
            state.phase = 'competing';
            state.nextDramaSwitchMs = now + 2400 + Math.random() * 900;
          }
        }

        // Giai đoạn 2: Đàn cá tranh giành mồi ngẫu nhiên & húc vượt mặt nhau (1.8s - 16.0s)
        else if (state.phase === 'competing') {
          moiCau.bobOffset = Math.sin(state.phaseTime * 0.09) * 3.5;
          const hookX = moiCau.x;
          const hookY = moiCau.y + moiCau.bobOffset;

          // Kiểm tra xem đã đến lúc xảy ra pha "Tranh mồi / Vượt mặt" ngẫu nhiên chưa
          if (now >= state.nextDramaSwitchMs && elapsedMs < 15200) {
            state.dramaRound++;
            state.nextDramaSwitchMs = now + 2500 + Math.random() * 1100;

            const oldLeaderIdx = state.currentLeaderIdx;
            const pool = fishes.map((_, idx) => idx).filter(idx => idx !== oldLeaderIdx);
            const newLeaderIdx = pool.length > 0
              ? pool[Math.floor(Math.random() * pool.length)]
              : (oldLeaderIdx ?? 0);

            if (oldLeaderIdx !== null && fishes[oldLeaderIdx] && newLeaderIdx !== oldLeaderIdx) {
              const oldFish = fishes[oldLeaderIdx];
              const newFish = fishes[newLeaderIdx];

              const pushAngle = Math.random() * Math.PI * 2;
              oldFish.vx = Math.cos(pushAngle) * 4.2;
              oldFish.vy = Math.sin(pushAngle) * 3.0;
              oldFish.mouthOpen = 0;
              oldFish.boostGlow = 0;

              newFish.boostGlow = 1.0;
              state.currentLeaderIdx = newLeaderIdx;
              amThanh.plinkoNay();

              ripples.push({
                x: hookX,
                y: hookY,
                r: 8,
                alpha: 0.95,
                color: '#38bdf8'
              });
            }
          }

          // Điều khiển chú cá đang dẫn đầu tiếp cận sát lưỡi câu và nhấp nhử
          if (state.currentLeaderIdx !== null && fishes[state.currentLeaderIdx]) {
            const leader = fishes[state.currentLeaderIdx];
            const dx = hookX - leader.x;
            const dy = hookY - leader.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            if (dist > 34) {
              const speed = leader.boostGlow > 0.2 ? 3.8 : 2.5;
              leader.vx += ((dx / dist) * speed - leader.vx) * 0.14;
              leader.vy += ((dy / dist) * speed - leader.vy) * 0.14;
              leader.mouthOpen = Math.min(1, 45 / dist);
            } else {
              leader.vx = Math.cos(state.phaseTime * 0.10) * 1.5 + (dx * 0.03);
              leader.vy = Math.sin(state.phaseTime * 0.12) * 1.2 + (dy * 0.03);
              leader.mouthOpen = 0.7 + Math.sin(state.phaseTime * 0.25) * 0.3;
            }
          }

          // Cho 2-3 chú cá phụ bơi vây quanh khu vực mồi tạo cảnh đàn cá tụ tập tranh giành
          fishes.forEach((f, idx) => {
            if (idx === state.currentLeaderIdx) return;
            const dx = hookX - f.x;
            const dy = hookY - f.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 220 && dist > 65 && idx % 3 === state.dramaRound % 3) {
              f.vx += (dx / dist) * 0.07;
              f.vy += (dy / dist) * 0.07;
            }
          });

          // Đến giây thứ 16.0: Quyết định cú đớp mồi cuối cùng (100% True Random!)
          if (elapsedMs >= 16000) {
            let finalWinnerIdx = state.currentLeaderIdx ?? Math.floor(Math.random() * fishes.length);
            if (Math.random() < 0.6 && fishes.length > 1) {
              const others = fishes.map((_, idx) => idx).filter(idx => idx !== finalWinnerIdx);
              finalWinnerIdx = others[Math.floor(Math.random() * others.length)];
            }

            state.winnerIdx = finalWinnerIdx;
            state.phase = 'biting';
            state.phaseTime = 0;
            const winFish = fishes[finalWinnerIdx];
            if (winFish) {
              winFish.boostGlow = 1.2;
              winFish.mouthOpen = 1.0;
            }
          }
        }

        // Giai đoạn 3: Cá lao thẳng vào ngậm chặt lưỡi câu (16.0s - 17.2s)
        else if (state.phase === 'biting') {
          const winIdx = state.winnerIdx ?? 0;
          const winFish = fishes[winIdx];
          if (winFish) {
            const dx = moiCau.x - winFish.x;
            const dy = moiCau.y - winFish.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            winFish.vx = (dx / dist) * 5.8;
            winFish.vy = (dy / dist) * 4.8;
            winFish.mouthOpen = 1.0;

            if (dist < 22 || state.phaseTime > 65) {
              moiCau.isSubmerged = true;
              state.phase = 'reeling';
              state.phaseTime = 0;
              amThanh.plinkoNay();

              fishes.forEach((f, idx) => {
                if (idx !== winIdx) {
                  const angle = Math.atan2(f.y - moiCau.y, f.x - moiCau.x);
                  f.vx = Math.cos(angle) * (2.6 + Math.random() * 1.5);
                  f.vy = Math.sin(angle) * (1.8 + Math.random() * 1.2);
                }
              });
            }
          }
        }

        // Giai đoạn 4: Kéo cá lên mặt nước & hoàn thành (17.2s - 20s)
        else if (state.phase === 'reeling') {
          const winIdx = state.winnerIdx ?? 0;
          const winFish = fishes[winIdx];
          if (winFish) {
            moiCau.y -= 3.5;
            const struggleX = Math.sin(state.phaseTime * 0.45) * 9;
            winFish.x = moiCau.x + struggleX;
            winFish.y = moiCau.y + 18;
            winFish.tailPhase += 0.75;

            if (state.phaseTime % 10 === 0) {
              ripples.push({
                x: winFish.x,
                y: winFish.y,
                r: 5,
                alpha: 0.8,
                color: '#ffffff'
              });
            }

            if (moiCau.y <= 58) {
              const winnerHs = winFish.hs;
              moiCau.active = false;
              moiCau.isSubmerged = false;
              state.phase = 'idle';
              winFish.boostGlow = 0;
              winFish.mouthOpen = 0;
              winFish.y = 160;
              setTienDoPhanTram(100);
              amThanh.chienThang();
              onHoanThanhRef.current(winnerHs);
            }
          }
        }
      }

      // ============================================================================
      // 2. CẬP NHẬT CHUYỂN ĐỘNG TỰ NHIÊN CỦA ĐÀN CÁ
      // ============================================================================
      fishes.forEach((ca, idx) => {
        const speedMag = Math.hypot(ca.vx, ca.vy);
        ca.tailPhase += 0.14 + speedMag * 0.06;
        ca.finPhase += 0.12 + speedMag * 0.04;

        if (ca.thoughtTimer > 0) {
          ca.thoughtTimer--;
          if (ca.thoughtTimer <= 0) ca.thoughtBubble = undefined;
        }
        if (ca.boostGlow > 0) {
          ca.boostGlow = Math.max(0, ca.boostGlow - 0.012);
        }

        const isBeingReeled = state.phase === 'reeling' && idx === state.winnerIdx;
        if (!isBeingReeled) {
          ca.x += ca.vx;
          ca.y += ca.vy;

          // Giới hạn tốc độ tối đa khi bơi bình thường
          const maxSpd = (moiCau.active && (idx === state.currentLeaderIdx || idx === state.winnerIdx)) ? 4.8 : 2.2;
          if (speedMag > maxSpd) {
            ca.vx = (ca.vx / speedMag) * maxSpd;
            ca.vy = (ca.vy / speedMag) * maxSpd;
          } else if (speedMag < 0.75 && state.phase === 'idle') {
            ca.vx = (ca.vx >= 0 ? 1 : -1) * 1.1;
          }

          if (ca.x < 68) {
            ca.x = 68;
            ca.vx = Math.abs(ca.vx);
          } else if (ca.x > w - 68) {
            ca.x = w - 68;
            ca.vx = -Math.abs(ca.vx);
          }

          if (ca.y < 105) {
            ca.y = 105;
            ca.vy = Math.abs(ca.vy) * 0.8;
          } else if (ca.y > h - 85) {
            ca.y = h - 85;
            ca.vy = -Math.abs(ca.vy) * 0.8;
          }

          if (Math.random() < 0.016) {
            ca.vy += (Math.random() - 0.5) * 0.45;
          }
        }
      });

      // Cập nhật bọt nước
      bubbles.forEach(b => {
        b.x += b.vx + Math.sin(state.phaseTime * 0.03 + b.y * 0.05) * 0.15;
        b.y += b.vy;
        if (b.y < 58) {
          b.y = h - 25;
          b.x = Math.random() * w;
        }
      });

      // Cập nhật vòng sóng nước
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 1.35;
        ripples[i].alpha -= 0.016;
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
      }

      // ============================================================================
      // 3. VẼ KHUNG CẢNH ĐẠI DƯƠNG & THỦY CUNG SỐNG ĐỘNG
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // Bầu trời phía trên mặt nước (0 - 52px)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 56);
      skyGrad.addColorStop(0, '#0ea5e9');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 56);

      // Lòng hồ / Đại dương xanh thẫm chuyển sắc
      const waterGrad = ctx.createLinearGradient(0, 48, 0, h);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.28, '#0369a1');
      waterGrad.addColorStop(0.68, '#075985');
      waterGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 48, w, h - 48);

      // Tia nắng mặt trời chiếu xuyên mặt nước (Underwater Sunbeams)
      ctx.save();
      for (let ray = 0; ray < 5; ray++) {
        const rx = 160 + ray * 210 + Math.sin(state.phaseTime * 0.015 + ray) * 25;
        const rayGrad = ctx.createLinearGradient(rx, 50, rx + 70, h - 80);
        rayGrad.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
        rayGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rx - 30, 50);
        ctx.lineTo(rx + 35, 50);
        ctx.lineTo(rx + 130, h - 40);
        ctx.lineTo(rx - 85, h - 40);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Đáy cát & rạn san hô, đá ngầm
      const sandGrad = ctx.createLinearGradient(0, h - 55, 0, h);
      sandGrad.addColorStop(0, '#0f3f5c');
      sandGrad.addColorStop(1, '#062032');
      ctx.fillStyle = sandGrad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w; sx += 110) {
        ctx.quadraticCurveTo(sx + 55, h - 48 - (sx % 20), sx + 110, h - 32);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // San hô & Rong biển đung đưa dưới đáy
      for (let gx = 55; gx < w; gx += 95) {
        const sway = Math.sin(state.phaseTime * 0.035 + gx * 0.05) * 14;
        ctx.strokeStyle = gx % 190 === 0 ? '#10b981' : '#059669';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(gx, h - 18);
        ctx.quadraticCurveTo(gx + sway, h - 65, gx - sway * 0.7, h - 115 - (gx % 35));
        ctx.stroke();

        // Nhánh rong phụ
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(gx + sway * 0.3, h - 55);
        ctx.quadraticCurveTo(gx + 18 + sway, h - 80, gx + 12 + sway * 0.8, h - 98);
        ctx.stroke();
      }

      // Sóng gợn lăn tăn trên mặt nước
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let sx = 0; sx <= w; sx += 20) {
        const sy = 50 + Math.sin(sx * 0.025 + state.phaseTime * 0.05) * 4.5;
        if (sx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Vẽ bọt khí đại dương
      bubbles.forEach(b => {
        ctx.fillStyle = `rgba(224, 242, 254, ${b.alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Vẽ vòng sóng hương thơm quanh mồi câu
      ripples.forEach(rp => {
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = Math.max(0, rp.alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Vẽ đàn cá
      fishes.forEach((ca, idx) => {
        const isHooked = state.phase === 'reeling' && idx === state.winnerIdx;
        veCaChanThuc(ca, isHooked);
      });

      // ============================================================================
      // 4. VẼ CẦN CÂU, DÂY CƯỚC, PHAO CÂU & MỒI CÂU PHÁT SÁNG
      // ============================================================================
      if (moiCau.active) {
        const hookX = moiCau.x;
        const hookY = moiCau.y + moiCau.bobOffset;

        // Cần câu cong đàn hồi khi kéo cá
        const rodBend = state.phase === 'reeling' ? 14 + Math.sin(state.phaseTime * 0.5) * 5 : 4;
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(state.rodTipX - 130, -5);
        ctx.quadraticCurveTo(state.rodTipX - 45, 4, state.rodTipX, state.rodTipY + rodBend);
        ctx.stroke();

        // Dây câu mảnh ánh bạc
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(state.rodTipX, state.rodTipY + rodBend);
        ctx.lineTo(hookX, hookY);
        ctx.stroke();

        // Phao câu đỏ - trắng nổi trên mặt nước
        const floatY = Math.min(hookY - 12, 50 + Math.sin(state.phaseTime * 0.08) * 3.5 + (moiCau.isSubmerged ? 14 : 0));
        ctx.save();
        ctx.translate(hookX, floatY);
        // Anten phao
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -7);
        ctx.stroke();
        // Nửa trên đỏ
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, Math.PI, 0);
        ctx.fill();
        // Nửa dưới trắng
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI);
        ctx.fill();
        ctx.restore();

        // Lưỡi câu vàng & Mồi câu phát sáng (nếu chưa đang kéo cá)
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(hookX, hookY - 6);
        ctx.lineTo(hookX, hookY + 4);
        ctx.arc(hookX + 4.5, hookY + 4, 4.5, Math.PI, 0, true);
        ctx.stroke();

        if (state.phase !== 'reeling') {
          // Viên mồi thơm phát sáng thu hút cá
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(hookX + 4.5, hookY + 7.5, 5.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(hookX + 3, hookY + 6, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      state.animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dangChoi) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    onBatDauChoi();
    thaMoiTai(clickX, clickY);
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
      {/* KHUNG HỒ CÂU ĐẠI DƯƠNG FULL Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 90px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
          border: '2px solid #0284c7',
          background: '#070b14',
          cursor: dangChoi ? 'default' : 'crosshair'
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

        {/* THANH TRẠNG THÁI TRÊN HỒ CÂU */}
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
            gap: '12px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <button
              onClick={khoiTaoDanCa}
              disabled={dangChoi}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#f8fafc',
                border: '1px solid #475569',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: dangChoi ? 'not-allowed' : 'pointer',
                opacity: dangChoi ? 0.5 : 1,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            >
              🔄 Thả Đàn Cá Mới
            </button>
          </div>

          {dangChoi && (
            <div
              style={{
                flex: 1,
                maxWidth: '260px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '6px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>
                <span>🎣 Tiến độ câu cá</span>
                <span style={{ color: '#38bdf8' }}>{tienDoPhanTram}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${tienDoPhanTram}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8, #facc15)',
                    borderRadius: '4px',
                    transition: 'width 0.2s linear'
                  }}
                />
              </div>
            </div>
          )}

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
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #475569',
                  padding: '6px 12px',
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

      {/* NÚT THẢ MỒI CÂU Ở DƯỚI */}
      <div style={{ marginTop: '14px' }}>
        <button
          className="game-action-btn"
          onClick={() => {
            onBatDauChoi();
            thaMoiTai();
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 38px',
            borderRadius: '30px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 20px rgba(2, 132, 199, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🎣 Cá đang tranh nhau đớp mồi...' : '🎣 THẢ MỒI CÂU NGAY'}</span>
        </button>
      </div>
    </div>
  );
};
