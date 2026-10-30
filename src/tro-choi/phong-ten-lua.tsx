// Trò chơi: Phóng Tên Lửa (Đồ họa Vũ Trụ & Tàu Vũ Trụ 3D hiện đại, Chướng Ngại Vật Thiên Thạch / Bão Từ Trường / UFO / Cổng Tăng Tốc, 100% True Random Vượt Mặt Kịch Tính)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface PhongTenLuaProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  onBatDauChoi: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface TenLua {
  hs: HocSinh;
  index: number;
  x: number;
  baseX: number;
  y: number;         // Độ cao (0 ở mặt đất -> MOON_ALTITUDE ở Mặt Trăng)
  vx: number;
  speed: number;
  wobblePhase: number;
  color: string;
  secondaryColor: string;
  boostTimer: number;
  slowTimer: number;
  daHaCanh: boolean;
  boosterDetached: boolean;
  statusText?: string;
  statusTimer: number;
}

interface ChuongNgaiVuTru {
  id: number;
  loai: 'storm' | 'asteroid' | 'ufo' | 'warp_ring';
  x: number;
  y: number;
  vx: number;
  radius: number;
  angle: number;
  vAngle: number;
  cooldownMap: Record<number, number>;
}

interface HatKhoi {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

const BANG_MAU_TEN_LUA = [
  { main: '#ef4444', sec: '#fca5a5' },
  { main: '#3b82f6', sec: '#93c5fd' },
  { main: '#10b981', sec: '#6ee7b7' },
  { main: '#f59e0b', sec: '#fcd34d' },
  { main: '#8b5cf6', sec: '#c4b5fd' },
  { main: '#ec4899', sec: '#f9a8d4' },
  { main: '#06b6d4', sec: '#67e8f9' },
  { main: '#eab308', sec: '#fef08a' },
  { main: '#a855f7', sec: '#d8b4fe' },
  { main: '#f97316', sec: '#fdba74' },
  { main: '#14b8a6', sec: '#5eead4' },
  { main: '#84cc16', sec: '#bef264' }
];

export const PhongTenLua: React.FC<PhongTenLuaProps> = ({
  danhSach,
  dangChoi,
  onHoanThanh,
  onBatDauChoi,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [demNguoc, setDemNguoc] = useState<number | null>(null);
  const [nguoiDanDau, setNguoiDanDau] = useState<string>('');
  const [giaiDoanHienTai, setGiaiDoanHienTai] = useState<string>('Bệ Phóng Mặt Đất');
  const [tienDoPhanTram, setTienDoPhanTram] = useState<number>(0);

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  // Độ cao hành trình chuẩn 25 giây (2.5s đếm ngược + ~22.5s bay vượt chướng ngại vật)
  const TOTAL_ALTITUDE = 5400;
  const MOON_ALTITUDE = 5000;

  const stateRef = useRef<{
    rockets: TenLua[];
    obstacles: ChuongNgaiVuTru[];
    particles: HatKhoi[];
    cameraAltitude: number;
    animationFrameId: number | null;
    phase: 'idle' | 'countdown' | 'flying';
    daKetThuc: boolean;
    frameCount: number;
  }>({
    rockets: [],
    obstacles: [],
    particles: [],
    cameraAltitude: 0,
    animationFrameId: null,
    phase: 'idle',
    daKetThuc: false,
    frameCount: 0
  });

  // Tạo hệ thống chướng ngại vật vũ trụ và vòng tăng tốc ngẫu nhiên dọc đường bay
  const taoChuongNgaiVuTru = useCallback((w: number): ChuongNgaiVuTru[] => {
    const list: ChuongNgaiVuTru[] = [];
    let idCounter = 1;

    // 1. Tầng Khí Quyển (500m - 1700m): Mây bão từ trường sấm sét + Cổng tăng tốc
    for (let alt = 550; alt <= 1650; alt += 220) {
      const isWarp = Math.floor(alt / 220) % 3 === 0;
      list.push({
        id: idCounter++,
        loai: isWarp ? 'warp_ring' : 'storm',
        x: 140 + Math.random() * (w - 280),
        y: alt,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.1),
        radius: isWarp ? 44 : 52,
        angle: 0,
        vAngle: 0.02,
        cooldownMap: {}
      });
    }

    // 2. Vành Đai Thiên Thạch (1800m - 3500m): Thiên thạch xoay tròn bay ngang + Cổng tăng tốc
    for (let alt = 1850; alt <= 3500; alt += 190) {
      const mod = Math.floor(alt / 190) % 4;
      const loai = mod === 0 ? 'warp_ring' : 'asteroid';
      list.push({
        id: idCounter++,
        loai,
        x: 120 + Math.random() * (w - 240),
        y: alt,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1.6 + Math.random() * 1.6),
        radius: loai === 'warp_ring' ? 45 : 32 + (alt % 14),
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.08,
        cooldownMap: {}
      });
    }

    // 3. Quỹ Đạo Sâu & Đĩa Bay UFO (3600m - 4700m): Đĩa bay UFO tuần tra + Thiên thạch + Cổng tăng tốc
    for (let alt = 3650; alt <= 4700; alt += 200) {
      const mod = Math.floor(alt / 200) % 3;
      const loai = mod === 0 ? 'ufo' : mod === 1 ? 'warp_ring' : 'asteroid';
      list.push({
        id: idCounter++,
        loai,
        x: 130 + Math.random() * (w - 260),
        y: alt,
        vx: (Math.random() > 0.5 ? 1 : -1) * (2.0 + Math.random() * 1.8),
        radius: loai === 'ufo' ? 48 : loai === 'warp_ring' ? 46 : 34,
        angle: 0,
        vAngle: 0.04,
        cooldownMap: {}
      });
    }

    return list;
  }, []);

  // Khởi tạo các tên lửa trên bệ phóng
  const khoiTaoBePhong = useCallback(() => {
    const w = 1100;
    const tongSo = Math.max(1, danhSach.length);
    const spacing = Math.min(76, (w - 170) / Math.max(1, tongSo - 1 || 1));
    const startX = tongSo === 1 ? w / 2 : (w - spacing * (tongSo - 1)) / 2;

    const rockets: TenLua[] = danhSach.map((hs, i) => {
      const palette = BANG_MAU_TEN_LUA[i % BANG_MAU_TEN_LUA.length];
      const bx = startX + i * spacing;
      return {
        hs,
        index: i,
        x: bx,
        baseX: bx,
        y: 44,
        vx: 0,
        speed: 3.68 + (Math.random() - 0.5) * 0.30,
        wobblePhase: Math.random() * Math.PI * 2,
        color: palette.main,
        secondaryColor: palette.sec,
        boostTimer: 0,
        slowTimer: 0,
        daHaCanh: false,
        boosterDetached: false,
        statusTimer: 0
      };
    });

    stateRef.current.rockets = rockets;
    stateRef.current.obstacles = taoChuongNgaiVuTru(w);
    stateRef.current.particles = [];
    stateRef.current.cameraAltitude = 0;
    stateRef.current.phase = 'idle';
    stateRef.current.daKetThuc = false;
    stateRef.current.frameCount = 0;
    setDemNguoc(null);
    setTienDoPhanTram(0);
    setNguoiDanDau('');
    setGiaiDoanHienTai('Bệ Phóng Mặt Đất');
  }, [danhSach, taoChuongNgaiVuTru]);

  useEffect(() => {
    khoiTaoBePhong();
  }, [khoiTaoBePhong]);

  // Đảm bảo nếu thoát chế độ chơi từ ngoài thì reset sạch sẽ
  useEffect(() => {
    if (!dangChoi && stateRef.current.phase !== 'idle') {
      khoiTaoBePhong();
    }
  }, [dangChoi, khoiTaoBePhong]);

  // Tiến trình đếm ngược 3-2-1 trước khi phóng (~2.4s)
  const batDauDemNguoc = useCallback(() => {
    stateRef.current.phase = 'countdown';
    setDemNguoc(3);
    amThanh.phatTiengTick();

    const t1 = setTimeout(() => {
      setDemNguoc(2);
      amThanh.phatTiengTick();
    }, 800);

    const t2 = setTimeout(() => {
      setDemNguoc(1);
      amThanh.phatTiengTick();
    }, 1600);

    const t3 = setTimeout(() => {
      setDemNguoc(0); // PHÓNG!
      amThanh.phatTiengMoHop();
      stateRef.current.phase = 'flying';
    }, 2400);

    const t4 = setTimeout(() => {
      setDemNguoc(null);
    }, 3100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    if (dangChoi && stateRef.current.phase === 'idle') {
      batDauDemNguoc();
    }
  }, [dangChoi, batDauDemNguoc]);

  // VÒNG LẶP ĐỒ HỌA VŨ TRỤ & VẬT LÝ CHƯỚNG NGẠI VẬT (100% TRUE RANDOM)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // ============================================================================
    // HÀM VẼ CHƯỚNG NGẠI VẬT VŨ TRỤ & CỔNG TĂNG TỐC
    // ============================================================================
    const veChuongNgaiVat = (obs: ChuongNgaiVuTru, frameCount: number) => {
      ctx.save();
      ctx.translate(obs.x, -obs.y);

      if (obs.loai === 'storm') {
        // Đám mây bão từ trường sấm sét
        ctx.fillStyle = 'rgba(51, 65, 85, 0.92)';
        ctx.beginPath();
        ctx.arc(-22, 0, 26, 0, Math.PI * 2);
        ctx.arc(0, -10, 32, 0, Math.PI * 2);
        ctx.arc(24, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tia sét phóng điện nhấp nháy
        if (Math.floor(frameCount / 8 + obs.id) % 2 === 0) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-4, 12);
          ctx.lineTo(-12, 26);
          ctx.lineTo(2, 26);
          ctx.lineTo(-6, 44);
          ctx.stroke();
        }
      } else if (obs.loai === 'asteroid') {
        // Thiên thạch xoay tròn có hố va chạm và đuôi lửa nhẹ
        ctx.rotate(obs.angle);
        const astGrad = ctx.createRadialGradient(-8, -8, 4, 0, 0, obs.radius);
        astGrad.addColorStop(0, '#d97706');
        astGrad.addColorStop(0.55, '#78350f');
        astGrad.addColorStop(1, '#271206');
        ctx.fillStyle = astGrad;

        ctx.beginPath();
        const sides = 9;
        for (let s = 0; s < sides; s++) {
          const ang = (s / sides) * Math.PI * 2;
          const rMod = obs.radius * (0.84 + ((s * 7 + obs.id) % 4) * 0.06);
          const px = Math.cos(ang) * rMod;
          const py = Math.sin(ang) * rMod;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Hố thiên thạch
        ctx.fillStyle = 'rgba(24, 10, 3, 0.65)';
        ctx.beginPath();
        ctx.arc(-obs.radius * 0.28, -obs.radius * 0.2, obs.radius * 0.22, 0, Math.PI * 2);
        ctx.arc(obs.radius * 0.25, obs.radius * 0.18, obs.radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.loai === 'ufo') {
        // Đĩa bay UFO người ngoài hành tinh phát chùm tia từ trường
        const hoverY = Math.sin(frameCount * 0.08 + obs.id) * 5;
        ctx.translate(0, hoverY);

        // Chùm tia hút năng lượng bên dưới
        const beamGrad = ctx.createLinearGradient(0, 10, 0, 62);
        beamGrad.addColorStop(0, 'rgba(168, 85, 247, 0.55)');
        beamGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-16, 10);
        ctx.lineTo(16, 10);
        ctx.lineTo(36, 62);
        ctx.lineTo(-36, 62);
        ctx.closePath();
        ctx.fill();

        // Vòm kính buồng lái UFO
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -4, 18, Math.PI, 0);
        ctx.fill();

        // Thân đĩa bay kim loại
        const saucerGrad = ctx.createLinearGradient(-38, 0, 38, 0);
        saucerGrad.addColorStop(0, '#475569');
        saucerGrad.addColorStop(0.5, '#e2e8f0');
        saucerGrad.addColorStop(1, '#334155');
        ctx.fillStyle = saucerGrad;
        ctx.beginPath();
        ctx.ellipse(0, 2, 38, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Đèn LED nhấp nháy quanh đĩa bay
        for (let lx = -24; lx <= 24; lx += 12) {
          ctx.fillStyle = (Math.floor(frameCount / 6) + lx) % 2 === 0 ? '#facc15' : '#ec4899';
          ctx.beginPath();
          ctx.arc(lx, 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.loai === 'warp_ring') {
        // Cổng tăng tốc Lượng Tử (Warp Boost Ring)
        const pulse = 1 + Math.sin(frameCount * 0.1 + obs.id) * 0.08;
        ctx.scale(pulse, pulse);

        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.radius, 15, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.radius * 0.72, 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ BOOST ⚡', 0, 4);
      }

      ctx.restore();
    };

    // ============================================================================
    // HÀM VẼ TÀU VŨ TRỤ / TÊN LỬA ĐA TẦNG HIỆN ĐẠI
    // ============================================================================
    const veTenLuaHienDai = (r: TenLua, screenX: number, screenY: number) => {
      ctx.save();
      ctx.translate(screenX, screenY);

      const wobble = Math.sin(r.wobblePhase) * (r.slowTimer > 0 ? 7.5 : 2.2) + r.vx * 2.5;
      ctx.rotate((wobble * Math.PI) / 180);

      const isBoosting = r.boostTimer > 0;
      const isSlowed = r.slowTimer > 0;

      // 1. NGỌN LỬA ĐỘNG CƠ PHẢN LỰC (Lửa xanh Plasma khi Siêu Tốc / Lửa cam vàng chuẩn)
      if (stateRef.current.phase === 'flying' || stateRef.current.phase === 'countdown') {
        const baseLen = stateRef.current.phase === 'countdown' ? 12 : 28;
        const fireLen = baseLen + Math.random() * 18 + (isBoosting ? 28 : 0) - (isSlowed ? 12 : 0);
        const fireGrad = ctx.createLinearGradient(0, 22, 0, 22 + Math.max(10, fireLen));

        if (isBoosting) {
          fireGrad.addColorStop(0, '#ffffff');
          fireGrad.addColorStop(0.3, '#38bdf8');
          fireGrad.addColorStop(0.7, '#6366f1');
          fireGrad.addColorStop(1, 'transparent');
        } else {
          fireGrad.addColorStop(0, '#ffffff');
          fireGrad.addColorStop(0.28, '#fef08a');
          fireGrad.addColorStop(0.68, '#f97316');
          fireGrad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(-9, 22);
        ctx.lineTo(9, 22);
        ctx.lineTo(0, 22 + Math.max(10, fireLen));
        ctx.closePath();
        ctx.fill();
      }

      // 2. BÌNH NHIÊN LIỆU ĐẨY PHỤ 2 BÊN (Nếu chưa tách tầng)
      if (!r.boosterDetached) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        // Bình trái
        ctx.beginPath();
        ctx.roundRect(-17, -2, 6, 23, 3);
        ctx.fill();
        ctx.stroke();
        // Bình phải
        ctx.beginPath();
        ctx.roundRect(11, -2, 6, 23, 3);
        ctx.fill();
        ctx.stroke();
      }

      // 3. CÁNH TÊN LỬA KHÍ ĐỘNG HỌC (Delta Fins)
      ctx.fillStyle = r.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.lineTo(-22, 24);
      ctx.lineTo(-10, 21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, 6);
      ctx.lineTo(22, 24);
      ctx.lineTo(10, 21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. THÂN CHÍNH TÀU VŨ TRỤ 3D KIM LOẠI
      const bodyGrad = ctx.createLinearGradient(-12, 0, 12, 0);
      bodyGrad.addColorStop(0, '#f8fafc');
      bodyGrad.addColorStop(0.35, r.secondaryColor);
      bodyGrad.addColorStop(0.7, r.color);
      bodyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bodyGrad;

      ctx.beginPath();
      ctx.moveTo(0, -34); // Mũi tàu nhọn khí động học
      ctx.bezierCurveTo(13, -16, 12, 8, 10, 22);
      ctx.lineTo(-10, 22);
      ctx.bezierCurveTo(-12, 8, -13, -16, 0, -34);
      ctx.closePath();
      ctx.fill();

      // Chóp mũi tên lửa sơn màu nổi bật
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.quadraticCurveTo(7, -23, 8.5, -15);
      ctx.lineTo(-8.5, -15);
      ctx.quadraticCurveTo(-7, -23, 0, -34);
      ctx.closePath();
      ctx.fill();

      // Viền thân tàu
      ctx.strokeStyle = isBoosting ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = isBoosting ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.bezierCurveTo(13, -16, 12, 8, 10, 22);
      ctx.lineTo(-10, 22);
      ctx.bezierCurveTo(-12, 8, -13, -16, 0, -34);
      ctx.stroke();

      // Vòm cửa sổ buồng lái phi hành gia
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, -3, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(-2, -5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Họng xả động cơ dưới đáy
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6, 22, 12, 4);

      ctx.restore();

      // 5. NHÃN TÊN HỌC SINH RÕ RÀNG (Không hiển thị chữ thông báo nổi trên đầu)
      ctx.save();
      ctx.font = 'bold 11.5px "Segoe UI", system-ui, sans-serif';
      const nameW = ctx.measureText(r.hs.ten).width;
      const tagW = nameW + 16;
      const tagH = 20;
      const tagX = screenX - tagW / 2;
      const tagY = screenY - 56;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isBoosting ? '#38bdf8' : isSlowed ? '#ef4444' : r.color;
      ctx.lineWidth = isBoosting ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.hs.ten, screenX, tagY + tagH / 2);

      ctx.restore();
    };

    const render = () => {
      if (!running) return;

      const state = stateRef.current;
      const { rockets, obstacles, particles } = state;
      const w = canvas.width;
      const h = canvas.height;

      state.frameCount++;

      // Cập nhật chuyển động ngang của các chướng ngại vật vũ trụ
      obstacles.forEach(obs => {
        obs.x += obs.vx;
        obs.angle += obs.vAngle;
        if (obs.x < 90) {
          obs.x = 90;
          obs.vx = Math.abs(obs.vx);
        } else if (obs.x > w - 90) {
          obs.x = w - 90;
          obs.vx = -Math.abs(obs.vx);
        }
      });

      // ============================================================================
      // 1. CẬP NHẬT VẬT LÝ ĐUA TÊN LỬA & VA CHẠM CHƯỚNG NGẠI VẬT (100% TRUE RANDOM)
      // ============================================================================
      if (state.phase === 'flying' && !state.daKetThuc && rockets.length > 0) {
        let currentMaxY = 0;
        rockets.forEach(r => {
          if (r.y > currentMaxY) currentMaxY = r.y;
        });

        let maxAlt = 0;
        let leadName = '';
        let winnerRocket: TenLua | null = null;

        rockets.forEach(r => {
          if (r.daHaCanh) return;

          r.wobblePhase += 0.1;
          if (r.boostTimer > 0) r.boostTimer--;
          if (r.slowTimer > 0) r.slowTimer--;

          // Chuyển động lượn ngang nhẹ tự nhiên để né hoặc va chướng ngại vật
          const targetX = r.baseX + Math.sin(state.frameCount * 0.022 + r.index * 1.7) * 32;
          r.vx += (targetX - r.x) * 0.03;
          r.vx *= 0.86;
          r.x = Math.max(70, Math.min(w - 70, r.x + r.vx));

          // Kiểm tra va chạm với Chướng ngại vật & Cổng Tăng Tốc Lượng Tử
          obstacles.forEach(obs => {
            const lastHit = obs.cooldownMap[r.index] || 0;
            if (state.frameCount - lastHit < 80) return;

            const dx = r.x - obs.x;
            const dy = r.y - obs.y;
            const dist = Math.hypot(dx, dy);

            if (dist < obs.radius + 18) {
              obs.cooldownMap[r.index] = state.frameCount;

              if (obs.loai === 'warp_ring') {
                r.boostTimer = 95;
                r.slowTimer = 0;
                amThanh.plinkoNay();
              } else {
                const isNearLead = currentMaxY - r.y < 180;
                if (isNearLead || Math.random() < 0.65) {
                  r.slowTimer = 75;
                  r.boostTimer = 0;
                  r.y = Math.max(44, r.y - 34);
                  r.vx = (r.x >= obs.x ? 1 : -1) * 4.5;

                  for (let sp = 0; sp < 8; sp++) {
                    particles.push({
                      x: r.x,
                      y: r.y,
                      vx: (Math.random() - 0.5) * 5,
                      vy: (Math.random() - 0.5) * 5,
                      radius: 4,
                      alpha: 1,
                      color: '#facc15'
                    });
                  }
                }
              }
            }
          });

          // Yếu tố 100% True Random: Đột biến động cơ ngẫu nhiên
          const gapFromLead = currentMaxY - r.y;
          if (r.boostTimer === 0 && r.slowTimer === 0) {
            if (gapFromLead > 100 && gapFromLead < 550 && Math.random() < 0.008) {
              r.boostTimer = 85;
            } else if (gapFromLead < 30 && currentMaxY > 900 && Math.random() < 0.0055) {
              r.slowTimer = 55;
            }
          }

          let curSpeed = r.speed + Math.sin(state.frameCount * 0.035 + r.index * 1.3) * 0.35;
          if (r.boostTimer > 0) curSpeed += 2.35;
          if (r.slowTimer > 0) curSpeed *= 0.48;

          // Tách tầng đẩy phụ ở độ cao 2,000m
          if (r.y > 2000 && !r.boosterDetached) {
            r.boosterDetached = true;
            for (let b = 0; b < 8; b++) {
              particles.push({
                x: r.x + (Math.random() - 0.5) * 20,
                y: r.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -3 - Math.random() * 2,
                radius: 4,
                alpha: 1,
                color: '#facc15'
              });
            }
          }

          r.y += curSpeed;

          if (Math.random() < 0.6) {
            particles.push({
              x: r.x + (Math.random() - 0.5) * 10,
              y: r.y - 24,
              vx: (Math.random() - 0.5) * 0.9,
              vy: -2.6 - Math.random() * 2,
              radius: 4.5 + Math.random() * 6,
              alpha: 0.85,
              color: r.boostTimer > 0 ? '#38bdf8' : Math.random() > 0.45 ? '#f97316' : '#cbd5e1'
            });
          }

          if (r.y > maxAlt) {
            maxAlt = r.y;
            leadName = r.hs.ten;
          }

          if (r.y >= MOON_ALTITUDE && !winnerRocket) {
            r.daHaCanh = true;
            winnerRocket = r;
          }
        });

        if (leadName) {
          setNguoiDanDau(leadName);
        }

        const pct = Math.min(100, Math.round((maxAlt / MOON_ALTITUDE) * 100));
        setTienDoPhanTram(pct);

        if (maxAlt < 900) {
          setGiaiDoanHienTai('Tầng Đối Lưu & Bệ Phóng');
        } else if (maxAlt < 1800) {
          setGiaiDoanHienTai('Tầng Khí Quyển & Bão Từ Trường');
        } else if (maxAlt < 3500) {
          setGiaiDoanHienTai('Vành Đai Thiên Thạch Vũ Trụ');
        } else if (maxAlt < 4500) {
          setGiaiDoanHienTai('Quỹ Đạo Sâu & Trạm Tuần Tra UFO');
        } else {
          setGiaiDoanHienTai('Nước Rút Đổ Bộ Mặt Trăng');
        }

        // CAMERA LUÔN KHÓA THEO TÊN LỬA DẪN ĐẦU (#1)
        const targetCamAlt = Math.max(0, maxAlt - h * 0.42);
        state.cameraAltitude += (targetCamAlt - state.cameraAltitude) * 0.08;

        // Nếu có người chạm Mặt Trăng đầu tiên -> Hoàn thành & gọi ModalChucMung thống nhất!
        if (winnerRocket) {
          const winHs = (winnerRocket as TenLua).hs;
          state.daKetThuc = true;
          state.phase = 'idle';
          amThanh.chienThang();
          onHoanThanhRef.current(winHs);
        }
      }

      // Cập nhật hạt khói lửa
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.radius += 0.18;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      // ============================================================================
      // 2. VẼ BẦU TRỜI ĐA TẦNG VŨ TRỤ, TINH VÂN & HÀNH TINH
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      const camY = state.cameraAltitude;
      const altRatio = Math.min(1, camY / TOTAL_ALTITUDE);

      const bgGrad = ctx.createLinearGradient(0, h, 0, 0);
      if (altRatio < 0.22) {
        bgGrad.addColorStop(0, '#0284c7');
        bgGrad.addColorStop(0.5, '#1e3a8a');
        bgGrad.addColorStop(1, '#090d16');
      } else if (altRatio < 0.55) {
        bgGrad.addColorStop(0, '#1e1b4b');
        bgGrad.addColorStop(0.5, '#311042');
        bgGrad.addColorStop(1, '#030712');
      } else {
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#020617');
        bgGrad.addColorStop(1, '#000000');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Tinh vân vũ trụ (Cosmic Nebula) ở tầng không gian sâu
      if (altRatio > 0.2) {
        ctx.save();
        const nebGrad1 = ctx.createRadialGradient(w * 0.25, h * 0.35, 10, w * 0.25, h * 0.35, 260);
        nebGrad1.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
        nebGrad1.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = nebGrad1;
        ctx.fillRect(0, 0, w, h);

        const nebGrad2 = ctx.createRadialGradient(w * 0.75, h * 0.6, 10, w * 0.75, h * 0.6, 280);
        nebGrad2.addColorStop(0, 'rgba(6, 182, 212, 0.16)');
        nebGrad2.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = nebGrad2;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Các vì sao lấp lánh
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 80; s++) {
        const sx = (s * 163) % w;
        const sy = (s * 97 + camY * 0.22) % h;
        const sSize = s % 4 === 0 ? 2.4 : 1.3;
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(state.frameCount * 0.03 + s));
        ctx.fillRect(sx, sy, sSize, sSize);
      }
      ctx.globalAlpha = 1;

      // DỊCH CHUYỂN HỆ TỌA ĐỘ THEO CAMERA ĐỘ CAO
      ctx.save();
      ctx.translate(0, camY + h - 120);

      // 1. TRUNG TÂM VŨ TRỤ & BỆ PHÓNG MẶT ĐẤT (Y = 0)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 26, w, 100);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 16, w, 12);

      // Vạch cảnh báo vàng đen trên bệ phóng
      for (let sx = 0; sx < w; sx += 40) {
        ctx.fillStyle = (sx / 40) % 2 === 0 ? '#facc15' : '#0f172a';
        ctx.fillRect(sx, 16, 20, 6);
      }

      // Tháp phóng giàn thép kỹ thuật
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      for (let tx = 45; tx < w; tx += 150) {
        ctx.strokeRect(tx, -75, 26, 91);
        ctx.beginPath();
        ctx.moveTo(tx, -75);
        ctx.lineTo(tx + 26, 16);
        ctx.moveTo(tx + 26, -75);
        ctx.lineTo(tx, 16);
        ctx.stroke();
      }

      // Hành tinh trang trí xa xa trong vũ trụ (Sao Thổ có vành đai ở 2800m)
      ctx.save();
      ctx.translate(160, -2800);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 95, 22, -0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. VẼ TOÀN BỘ CHƯỚNG NGẠI VẬT VŨ TRỤ & CỔNG TĂNG TỐC (Trong tầm nhìn Camera)
      obstacles.forEach(obs => {
        if (Math.abs(obs.y - camY) < h + 300) {
          veChuongNgaiVat(obs, state.frameCount);
        }
      });

      // 3. MẶT TRĂNG & ĐÍCH ĐẾN KHỔNG LỒ (MOON_ALTITUDE)
      const moonCenterY = -MOON_ALTITUDE;
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = 'rgba(254, 240, 138, 0.65)';
      ctx.shadowBlur = 45;
      ctx.beginPath();
      ctx.arc(w / 2, moonCenterY - 380, 580, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Các miệng hố Mặt Trăng
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(w / 2 - 150, moonCenterY + 40, 34, 0, Math.PI * 2);
      ctx.arc(w / 2 + 175, moonCenterY + 65, 42, 0, Math.PI * 2);
      ctx.arc(w / 2 + 25, moonCenterY + 115, 26, 0, Math.PI * 2);
      ctx.fill();

      // Cột cờ vinh quang trên Mặt Trăng
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 4, moonCenterY - 85, 8, 105);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(w / 2 + 4, moonCenterY - 85);
      ctx.lineTo(w / 2 + 74, moonCenterY - 62);
      ctx.lineTo(w / 2 + 4, moonCenterY - 40);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌕 ĐÍCH ĐẾN: TRẠM MẶT TRĂNG 🌕', w / 2, moonCenterY + 175);
      ctx.restore();

      // 4. VẼ HẠT KHÓI LỬA PHẢN LỰC
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, -p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 5. VẼ TẤT CẢ TÊN LỬA VÀ TÊN HỌC SINH
      rockets.forEach(r => {
        veTenLuaHienDai(r, r.x, -r.y);
      });

      ctx.restore();
      ctx.restore();

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
      {/* KHUNG VŨ TRỤ FULL Ô HOÀN TOÀN */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 90px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65)',
          border: '2px solid #1e293b',
          background: '#030712'
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

        {/* HUD TRỰC TIẾP TRÊN CANVAS: NGƯỜI DẪN ĐẦU, ĐỘ CAO & TOÀN MÀN HÌNH */}
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
          {/* Tên lửa dẫn đầu (#1 Camera đang khóa theo) */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #38bdf8',
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#38bdf8',
              backdropFilter: 'blur(8px)'
            }}
          >
            🚀 Dẫn đầu (#1): <span style={{ color: '#facc15' }}>{nguoiDanDau || 'Chuẩn bị...'}</span>
          </div>

          {/* Thanh đo tiến độ độ cao vũ trụ */}
          <div
            style={{
              flex: 1,
              maxWidth: '300px',
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
              <span>🌌 {giaiDoanHienTai}</span>
              <span style={{ color: '#facc15' }}>{tienDoPhanTram}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${tienDoPhanTram}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #f59e0b, #38bdf8)',
                  borderRadius: '4px',
                  transition: 'width 0.2s linear'
                }}
              />
            </div>
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

        {/* Màn hình đếm ngược khổng lồ 3-2-1 */}
        {demNguoc !== null && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 15
            }}
          >
            <div
              style={{
                fontSize: demNguoc === 0 ? '4.8rem' : '7.5rem',
                fontWeight: 900,
                color: demNguoc === 0 ? '#facc15' : '#ffffff',
                textShadow: '0 0 35px rgba(250, 204, 21, 0.85), 0 0 10px rgba(0,0,0,0.8)',
                animation: 'scaleUp 0.6s ease-out'
              }}
            >
              {demNguoc === 0 ? '🚀 PHÓNG!' : demNguoc}
            </div>
            <div style={{ fontSize: '1.1rem', color: '#38bdf8', fontWeight: 700, marginTop: '8px' }}>
              Chuẩn bị khai hỏa động cơ tên lửa...
            </div>
          </div>
        )}
      </div>

      {/* Nút bấm khởi động phóng tên lửa */}
      <div style={{ marginTop: '14px' }}>
        <button
          className="game-action-btn"
          onClick={() => {
            khoiTaoBePhong();
            onBatDauChoi();
            batDauDemNguoc();
          }}
          disabled={dangChoi || danhSach.length === 0 || demNguoc !== null}
          style={{
            background: dangChoi || demNguoc !== null
              ? '#475569'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 38px',
            borderRadius: '30px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 || demNguoc !== null ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🚀 Tên lửa đang vượt chướng ngại vật vũ trụ...' : '🚀 ĐẾM NGƯỢC & PHÓNG TÊN LỬA'}</span>
        </button>
      </div>
    </div>
  );
};
