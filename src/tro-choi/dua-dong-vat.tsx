// Trò chơi: Đua Động Vật (Đồ họa Vector giải phẫu chân thực có khớp chân phi nước đại, 100% Random kịch tính vượt mặt)
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface DuaDongVatProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export type LoaiDongVat =
  | 'ngua'     // 1. Ngựa Đua
  | 'baogam'   // 2. Báo Gấm
  | 'sutu'     // 3. Sư Tử
  | 'ho'       // 4. Hổ Vằn
  | 'chosoi'   // 5. Chó Sói Husky
  | 'huousao'  // 6. Hươu Sao
  | 'caodo'    // 7. Cáo Đỏ
  | 'thorung'; // 8. Thỏ Rừng

interface ThongTinLoaiDV {
  loai: LoaiDongVat;
  tenLoai: string;
  bodyColor: string;
  bellyColor: string;
  darkColor: string;
  scale: number;
}

const DANH_SACH_LOAI_DV: ThongTinLoaiDV[] = [
  { loai: 'ngua', tenLoai: 'Ngựa Chiến', bodyColor: '#9a3412', bellyColor: '#7c2d12', darkColor: '#1c1917', scale: 1.08 },
  { loai: 'baogam', tenLoai: 'Báo Gấm', bodyColor: '#f59e0b', bellyColor: '#fef3c7', darkColor: '#1e293b', scale: 1.0 },
  { loai: 'sutu', tenLoai: 'Sư Tử', bodyColor: '#d97706', bellyColor: '#fde68a', darkColor: '#78350f', scale: 1.05 },
  { loai: 'ho', tenLoai: 'Hổ Đông Dương', bodyColor: '#ea580c', bellyColor: '#ffedd5', darkColor: '#0f172a', scale: 1.04 },
  { loai: 'chosoi', tenLoai: 'Sói Tuyết', bodyColor: '#64748b', bellyColor: '#f8fafc', darkColor: '#1e293b', scale: 0.98 },
  { loai: 'huousao', tenLoai: 'Hươu Sao', bodyColor: '#b45309', bellyColor: '#fef3c7', darkColor: '#451a03', scale: 1.05 },
  { loai: 'caodo', tenLoai: 'Cáo Đỏ', bodyColor: '#dc2626', bellyColor: '#ffffff', darkColor: '#1e293b', scale: 0.92 },
  { loai: 'thorung', tenLoai: 'Thỏ Rừng', bodyColor: '#a8a29e', bellyColor: '#f5f5f4', darkColor: '#44403c', scale: 0.86 }
];

interface ConVatChay {
  id: string;
  hs: HocSinh;
  ten: string;
  index: number;
  info: ThongTinLoaiDV;
  x: number;
  laneY: number;
  laneIndex: number;
  jumpY: number;
  vy: number;
  baseSpeed: number;
  speedMultiplier: number;
  eventTimer: number;
  statusText: string;
  statusColor: string;
  stridePhase: number;
  isJumping: boolean;
  daVeDich: boolean;
}

export const DuaDongVat: React.FC<DuaDongVatProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nguoiDanDau, setNguoiDanDau] = useState<string>('');
  const [tienDoPhanTram, setTienDoPhanTram] = useState<number>(0);

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  // Đường đua chuẩn ~45 giây
  const TRACK_LENGTH = 7800;
  const FINISH_LINE = 7400;
  const CHUONG_NGAI_VAT = [1150, 2350, 3550, 4750, 5950, 6850];

  const stateRef = useRef<{
    conVats: ConVatChay[];
    dustPuffs: { x: number; y: number; vx: number; vy: number; r: number; a: number; color: string }[];
    cameraX: number;
    animationFrameId: number | null;
    daKetThuc: boolean;
    frameCount: number;
  }>({
    conVats: [],
    dustPuffs: [],
    cameraX: 0,
    animationFrameId: null,
    daKetThuc: false,
    frameCount: 0
  });

  // Khởi tạo cuộc đua 100% Ngẫu Nhiên
  const khoiTaoCuocDua = useCallback(() => {
    const tongLanes = 6;
    const shuffledTypes = [...DANH_SACH_LOAI_DV].sort(() => Math.random() - 0.5);

    const conVats: ConVatChay[] = danhSach.map((hs, i) => {
      const info = shuffledTypes[i % shuffledTypes.length];
      const lane = i % tongLanes;
      const staggerX = (i % 3) * 24 + Math.random() * 14;

      return {
        id: hs.id,
        hs,
        ten: hs.ten,
        index: i,
        info,
        x: 75 + staggerX,
        laneY: 195 + lane * 58,
        laneIndex: lane,
        jumpY: 0,
        vy: 0,
        baseSpeed: 2.68 + Math.random() * 0.28,
        speedMultiplier: 1.0,
        eventTimer: 90 + Math.floor(Math.random() * 120),
        statusText: '',
        statusColor: '#facc15',
        stridePhase: Math.random() * Math.PI * 2,
        isJumping: false,
        daVeDich: false
      };
    });

    stateRef.current.conVats = conVats;
    stateRef.current.dustPuffs = [];
    stateRef.current.cameraX = 0;
    stateRef.current.daKetThuc = false;
    stateRef.current.frameCount = 0;
    setTienDoPhanTram(0);
    setNguoiDanDau('');
  }, [danhSach]);

  useEffect(() => {
    khoiTaoCuocDua();
  }, [khoiTaoCuocDua]);

  // VÒNG LẶP RENDER ĐỒ HỌA ĐỘNG VẬT CHÂN THỰC & VẬT LÝ ĐUA 100% RANDOM
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Hàm vẽ 1 chân có 2 khớp (Đùi -> Đầu gối -> Cẳng chân -> Bàn chân/Móng)
    const veChanCoKhop = (
      hipX: number,
      hipY: number,
      upperLen: number,
      lowerLen: number,
      phase: number,
      isFront: boolean,
      color: string,
      pawColor: string,
      thickness: number
    ) => {
      const swing = Math.sin(phase);
      const lift = Math.max(0, -Math.cos(phase));

      const hipAngle = isFront
        ? 0.15 + swing * 0.65
        : -0.15 + swing * 0.68;

      const kneeBend = isFront
        ? -lift * 0.85
        : lift * 0.9;

      const kneeX = hipX + Math.sin(hipAngle) * upperLen;
      const kneeY = hipY + Math.cos(hipAngle) * upperLen;

      const lowerAngle = hipAngle + kneeBend;
      const footX = kneeX + Math.sin(lowerAngle) * lowerLen;
      const footY = kneeY + Math.cos(lowerAngle) * lowerLen;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Đùi trên
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.stroke();

      // Cẳng chân dưới
      ctx.lineWidth = thickness * 0.72;
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Bàn chân / Móng guốc
      ctx.fillStyle = pawColor;
      ctx.beginPath();
      ctx.ellipse(footX + 2, footY, thickness * 0.55, thickness * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // HÀM VẼ ĐỘNG VẬT GIẢI PHẪU CHÂN THỰC (NGỰA, BÁO GẤM, SƯ TỬ, HỔ, SÓI, HƯƠU SAO, CÁO, THỎ RỪNG)
    const veDongVatChanThuc = (cv: ConVatChay, renderX: number, renderY: number) => {
      const { loai, bodyColor, bellyColor, darkColor, scale } = cv.info;
      const phase = cv.stridePhase;
      const gallopCycle = Math.sin(phase);
      const pitchAngle = cv.isJumping ? -0.18 : gallopCycle * 0.08;
      const bodyLift = cv.isJumping ? 0 : Math.abs(gallopCycle) * 4;

      ctx.save();
      ctx.translate(renderX, renderY - cv.jumpY);

      // 1. Bóng đổ mặt đất theo sải chân
      const shadowScale = Math.max(0.4, 1 - cv.jumpY / 110) * scale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
      ctx.beginPath();
      ctx.ellipse(0, 22 + cv.jumpY, 30 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hiệu ứng luồng gió vàng khi đang Bứt Tốc Nitro
      if (cv.speedMultiplier > 1.25) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.lineWidth = 2.5;
        for (let w = 0; w < 3; w++) {
          const wy = -12 + w * 10;
          ctx.beginPath();
          ctx.moveTo(-36 - w * 8, wy);
          ctx.lineTo(-58 - w * 12, wy);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(0, -bodyLift);
      ctx.rotate(pitchAngle);

      const upperLeg = loai === 'thorung' ? 11 : loai === 'ngua' || loai === 'huousao' ? 15 : 13;
      const lowerLeg = loai === 'thorung' ? 11 : loai === 'ngua' || loai === 'huousao' ? 15 : 13;
      const legThick = loai === 'ngua' || loai === 'sutu' || loai === 'ho' ? 6.5 : 5.5;

      // 2. HAI CHÂN BÊN XA (LỚP SAU TỐI MÀU HƠN)
      veChanCoKhop(-16, 2, upperLeg, lowerLeg, phase + Math.PI, false, darkColor, '#0f172a', legThick * 0.85);
      veChanCoKhop(16, 1, upperLeg, lowerLeg, phase + Math.PI + 0.55, true, darkColor, '#0f172a', legThick * 0.85);

      // 3. ĐUÔI ĐỘNG VẬT BAY THEO NHỊP PHI
      ctx.save();
      const tailWave = Math.sin(phase * 1.2) * 6;
      if (loai === 'ngua') {
        // Đuôi ngựa dài dày tung bay
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, -6);
        ctx.quadraticCurveTo(-38, -10 + tailWave * 0.5, -46, 4 + tailWave);
        ctx.stroke();
      } else if (loai === 'caodo' || loai === 'chosoi') {
        // Đuôi cáo/sói xù to có chóp trắng
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-20, -4);
        ctx.quadraticCurveTo(-36, -12 + tailWave * 0.6, -42, -6 + tailWave);
        ctx.stroke();
        if (loai === 'caodo') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 8.5;
          ctx.beginPath();
          ctx.moveTo(-38, -9 + tailWave * 0.7);
          ctx.lineTo(-43, -6 + tailWave);
          ctx.stroke();
        }
      } else if (loai === 'baogam' || loai === 'sutu' || loai === 'ho') {
        // Đuôi loài mèo dài giữ thăng bằng
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, -5);
        ctx.bezierCurveTo(-34, -4, -40, -14 + tailWave, -46, -10 + tailWave);
        ctx.stroke();
        // Túm lông đuôi sư tử hoặc chóp đuôi đen báo/hổ
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(-46, -10 + tailWave, loai === 'sutu' ? 5 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (loai === 'thorung' || loai === 'huousao') {
        // Đuôi bông trắng vểnh lên
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-22, -7, 6, 4.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. THÂN CƠ BẮP GIẢI PHẪU (Ngực nở, eo thon, mông săn chắc)
      ctx.save();
      const bodyGrad = ctx.createLinearGradient(0, -14, 0, 10);
      bodyGrad.addColorStop(0, bodyColor);
      bodyGrad.addColorStop(0.75, bodyColor);
      bodyGrad.addColorStop(1, bellyColor);
      ctx.fillStyle = bodyGrad;

      ctx.beginPath();
      // Lưng uốn cong tự nhiên từ vai đến hông
      ctx.moveTo(-22, -4);
      ctx.bezierCurveTo(-14, -13, 6, -12, 20, -9);
      // Ngực trước săn chắc
      ctx.bezierCurveTo(26, -6, 26, 5, 16, 7);
      // Bụng thon gọn
      ctx.bezierCurveTo(4, 8, -6, 4, -16, 6);
      // Đùi sau tròn khỏe
      ctx.bezierCurveTo(-24, 6, -26, -1, -22, -4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // HỌA TIẾT ĐẶC TRƯNG TRÊN LÔNG TỪNG LOÀI
      if (loai === 'baogam') {
        // Đốm đen Báo Gấm
        ctx.fillStyle = '#1e293b';
        const spots = [[-14, -5], [-8, -2], [-3, -6], [3, -3], [9, -6], [13, -1], [-11, 2], [1, 1]];
        spots.forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (loai === 'ho') {
        // Vằn đen Hổ Đông Dương
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        for (let sx = -14; sx <= 12; sx += 6) {
          ctx.beginPath();
          ctx.moveTo(sx, -10);
          ctx.lineTo(sx - 2, 1);
          ctx.stroke();
        }
      } else if (loai === 'huousao') {
        // Đốm sao trắng Hươu Sao
        ctx.fillStyle = '#ffffff';
        const stars = [[-13, -5], [-6, -3], [0, -6], [6, -2], [-9, 1], [3, 1]];
        stars.forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();

      // 5. HAI CHÂN BÊN GẦN (LỚP TRƯỚC NỔI BẬT)
      const pawCol = loai === 'caodo' || loai === 'ngua' || loai === 'huousao' ? '#1c1917' : bodyColor;
      veChanCoKhop(-14, 3, upperLeg, lowerLeg, phase, false, bodyColor, pawCol, legThick);
      veChanCoKhop(17, 2, upperLeg, lowerLeg, phase + 0.55, true, bodyColor, pawCol, legThick);

      // 6. CỔ, BỜM, ĐẦU, MÕM, TAI & SỪNG THEO TỪNG LOÀI THẬT
      ctx.save();
      const headBob = Math.cos(phase) * 2.5;
      const neckTopX = loai === 'ngua' || loai === 'huousao' ? 28 : 24;
      const neckTopY = (loai === 'ngua' || loai === 'huousao' ? -20 : -15) + headBob;

      // Vẽ Cổ vươn về phía trước
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(13, -9);
      ctx.lineTo(neckTopX - 5, neckTopY);
      ctx.lineTo(neckTopX + 4, neckTopY + 6);
      ctx.lineTo(19, 3);
      ctx.closePath();
      ctx.fill();

      // Bờm Ngựa hoặc Bờm Sư Tử
      if (loai === 'ngua') {
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(12, -10);
        ctx.quadraticCurveTo(18, -20, neckTopX - 4, neckTopY - 2);
        ctx.lineTo(neckTopX - 2, neckTopY + 3);
        ctx.closePath();
        ctx.fill();
      } else if (loai === 'sutu') {
        // Bờm Sư Tử dày phủ quanh cổ và vai
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(21, -11 + headBob * 0.6, 13, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(22, -11 + headBob * 0.6, 10, 9.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Di chuyển tới vị trí Đầu
      ctx.translate(neckTopX, neckTopY);

      // Cặp sừng nhánh cho Hươu Sao
      if (loai === 'huousao') {
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2, -5);
        ctx.lineTo(-10, -18);
        ctx.moveTo(-6, -12);
        ctx.lineTo(-2, -17);
        ctx.moveTo(-8, -15);
        ctx.lineTo(-14, -15);
        ctx.stroke();
      }

      // Tai động vật theo đúng giải phẫu từng loài
      if (loai === 'thorung') {
        // Tai thỏ rừng dài vểnh về phía sau có chóp đen
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(-7, -9, 11, 3.8, -0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(-15, -13, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (loai === 'chosoi' || loai === 'caodo' || loai === 'ngua' || loai === 'huousao') {
        // Tai nhọn dựng đứng
        ctx.fillStyle = loai === 'caodo' ? '#1c1917' : bodyColor;
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.lineTo(-1, -14);
        ctx.lineTo(4, -5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Tai tròn khỏe của Sư tử / Báo / Hổ
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(-2, -6, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hộp sọ & Mõm (Snout/Muzzle) giải phẫu nhìn nghiêng
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      if (loai === 'ngua' || loai === 'huousao') {
        // Đầu ngựa / hươu thon dài
        ctx.moveTo(-4, -5);
        ctx.lineTo(8, -4);
        ctx.lineTo(17, 1);
        ctx.lineTo(15, 6);
        ctx.lineTo(3, 6);
        ctx.lineTo(-4, 3);
      } else if (loai === 'caodo' || loai === 'chosoi') {
        // Đầu sói / cáo mõm nhọn
        ctx.moveTo(-5, -5);
        ctx.lineTo(6, -5);
        ctx.lineTo(16, 1);
        ctx.lineTo(14, 5);
        ctx.lineTo(2, 6);
        ctx.lineTo(-5, 3);
      } else {
        // Đầu Báo / Sư tử / Hổ / Thỏ
        ctx.ellipse(2, 0, 8, 6.5, 0.1, 0, Math.PI * 2);
        ctx.ellipse(9, 2, 5.5, 4, 0.1, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();

      // Má trắng cho Cáo / Sói / Hổ
      if (loai === 'caodo' || loai === 'chosoi' || loai === 'ho') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(6, 3.5, 6, 2.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mắt sắc nét có hồn
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(4.5, -1.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5.1, -1.8, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Vệt nước mắt đen đặc trưng của Báo Gấm
      if (loai === 'baogam') {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(9, 4);
        ctx.stroke();
      }

      // Chóp mũi
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(loai === 'ngua' || loai === 'huousao' || loai === 'chosoi' || loai === 'caodo' ? 15 : 13.5, 1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Kết thúc Đầu
      ctx.restore(); // Kết thúc Scale/Pitch

      // 7. NHÃN TÊN HỌC SINH RÕ RÀNG (Không hiển thị chữ thông báo rối mắt trên đầu)
      ctx.save();
      ctx.font = '800 12px system-ui, sans-serif';
      const nameW = ctx.measureText(cv.ten).width;
      const tagW = nameW + 16;
      const tagH = 20;
      const tagY = -48 * scale - bodyLift;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = cv.speedMultiplier > 1.2 ? '#facc15' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-tagW / 2 + 4, tagY, tagW, tagH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cv.ten, 4, tagY + tagH / 2);

      ctx.restore();
      ctx.restore();
    };

    const render = () => {
      if (!running) return;

      const state = stateRef.current;
      const { conVats, dustPuffs } = state;
      const w = canvas.width;
      const h = canvas.height;

      state.frameCount++;

      // 1. CẬP NHẬT VẬT LÝ ĐUA 100% RANDOM VỚI CÁC PHA LẬT KÈO VƯỢT MẶT TỰ NHIÊN
      if (dangChoi && !state.daKetThuc && conVats.length > 0) {
        // Xác định thứ hạng hiện tại của từng con vật
        const sortedRanks = [...conVats].sort((a, b) => b.x - a.x);
        const currentLeader = sortedRanks[0];

        conVats.forEach(cv => {
          if (cv.daVeDich) return;

          const myRank = sortedRanks.findIndex(item => item.id === cv.id) + 1;

          // Hệ thống biến thiên tốc độ tự nhiên (100% True Random)
          cv.eventTimer--;
          if (cv.eventTimer <= 0) {
            cv.eventTimer = 95 + Math.floor(Math.random() * 130);
            const roll = Math.random();

            if (myRank === 1 && currentLeader.x > 1200 && roll < 0.42) {
              cv.speedMultiplier = 0.56 + Math.random() * 0.14;
            } else if (myRank > 1 && myRank <= 6 && roll < 0.48) {
              cv.speedMultiplier = 1.48 + Math.random() * 0.25;
            } else if (roll < 0.22) {
              cv.speedMultiplier = 1.32;
            } else {
              cv.speedMultiplier = 0.92 + Math.random() * 0.22;
            }
          }

          // Tốc độ thực tế = baseSpeed * speedMultiplier + dao động tự nhiên
          const naturalWave = Math.sin(state.frameCount * 0.04 + cv.index * 1.7) * 0.28;
          const curSpeed = Math.max(1.2, cv.baseSpeed * cv.speedMultiplier + naturalWave);

          cv.stridePhase += 0.22 + curSpeed * 0.065;

          // Tạo bụi cỏ/đất dưới chân
          if (!cv.isJumping && Math.random() < 0.3) {
            dustPuffs.push({
              x: cv.x - 18,
              y: cv.laneY + 20,
              vx: -1.2 - Math.random(),
              vy: -0.3 - Math.random() * 0.5,
              r: 3 + Math.random() * 4,
              a: 0.65,
              color: cv.speedMultiplier > 1.25 ? '#fde047' : '#fed7aa'
            });
          }

          // Nhảy vượt rào chắn thể thao
          CHUONG_NGAI_VAT.forEach(hurdleX => {
            const dist = hurdleX - cv.x;
            if (dist > 0 && dist < 72 && !cv.isJumping) {
              cv.isJumping = true;
              // Đôi khi nhảy hơi thấp sẽ bị vấp rào nhẹ tạo kịch tính
              if (Math.random() < 0.18) {
                cv.vy = 6.8;
                cv.speedMultiplier = 0.68;
                cv.statusText = '💥 Vấp rào!';
                cv.statusColor = '#fca5a5';
              } else {
                cv.vy = 8.8;
              }
              if (Math.random() < 0.25) amThanh.dongVatNhay();
            }
          });

          if (cv.isJumping) {
            cv.jumpY += cv.vy;
            cv.vy -= 0.62;
            if (cv.jumpY <= 0) {
              cv.jumpY = 0;
              cv.isJumping = false;
              cv.vy = 0;
            }
          }

          cv.x += curSpeed;

          // Kiểm tra cán đích đầu tiên (100% Random Thật)
          if (cv.x >= FINISH_LINE && !cv.daVeDich) {
            cv.daVeDich = true;
            state.daKetThuc = true;
            amThanh.chienThang();

            const winnerHs = cv.hs;
            khoiTaoCuocDua();
            onHoanThanhRef.current(winnerHs);
          }
        });

        // Cập nhật người đang dẫn đầu & Camera luôn khóa theo con vật dẫn đầu #1
        const newSorted = [...conVats].sort((a, b) => b.x - a.x);
        const top1 = newSorted[0];
        if (top1) {
          setNguoiDanDau(`${top1.ten} (${top1.info.tenLoai})`);
          setTienDoPhanTram(Math.min(100, Math.round((top1.x / FINISH_LINE) * 100)));

          const targetCamX = Math.max(0, Math.min(TRACK_LENGTH - w, top1.x - w * 0.42));
          state.cameraX += (targetCamX - state.cameraX) * 0.085;
        }

        // Cập nhật hạt bụi
        for (let i = dustPuffs.length - 1; i >= 0; i--) {
          const p = dustPuffs[i];
          p.x += p.vx;
          p.y += p.vy;
          p.r += 0.15;
          p.a -= 0.03;
          if (p.a <= 0) dustPuffs.splice(i, 1);
        }
      }

      // 2. VẼ SÂN VẬN ĐỘNG ĐUA THÚ HOÀNH TRÁNG
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      const camX = state.cameraX;

      // Bầu trời sáng trong
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.35);

      // Núi trùng điệp Parallax
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      for (let mx = -240; mx < w + 480; mx += 240) {
        const mX = mx - ((camX * 0.18) % 240);
        ctx.lineTo(mX, h * 0.35);
        ctx.lineTo(mX + 120, h * 0.16);
        ctx.lineTo(mX + 240, h * 0.35);
      }
      ctx.fill();

      // Khán đài & Thảm cỏ xanh ven đường đua
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, h * 0.34, w, 28);

      // Hàng rào gỗ trắng dọc trường đua
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.34 + 8);
      ctx.lineTo(w, h * 0.34 + 8);
      ctx.moveTo(0, h * 0.34 + 18);
      ctx.lineTo(w, h * 0.34 + 18);
      ctx.stroke();

      for (let fx = -60; fx < w + 120; fx += 50) {
        const postX = fx - ((camX * 0.6) % 50);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(postX, h * 0.34 + 2, 5, 22);
      }

      // Mặt đường chạy Điền Kinh Tartan Đỏ Cam xen lẫn Làn Cỏ
      const trackTop = 165;
      const trackGrad = ctx.createLinearGradient(0, trackTop, 0, h);
      trackGrad.addColorStop(0, '#b91c1c');
      trackGrad.addColorStop(0.5, '#991b1b');
      trackGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = trackGrad;
      ctx.fillRect(0, trackTop, w, h - trackTop);

      // Kẻ 6 làn đua rõ nét
      for (let lane = 0; lane < 6; lane++) {
        const lY = trackTop + lane * 58;
        if (lane % 2 === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(0, lY, w, 58);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, lY);
        ctx.lineTo(w, lY);
        ctx.stroke();
      }

      // VẼ THEO CAMERA ĐƯỜNG ĐUA
      ctx.save();
      ctx.translate(-camX, 0);

      // Cột mốc cự ly
      for (let dist = 500; dist < TRACK_LENGTH; dist += 500) {
        if (Math.abs(dist - FINISH_LINE) < 200) continue;
        ctx.fillStyle = '#fef08a';
        ctx.font = '800 14px system-ui';
        ctx.fillText(`🚩 ${dist}m`, dist - 20, trackTop - 8);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(dist, trackTop);
        ctx.lineTo(dist, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // RÀO CHẮN VƯỢT CHƯỚNG NGẠI VẬT
      CHUONG_NGAI_VAT.forEach(hurdleX => {
        for (let lane = 0; lane < 6; lane++) {
          const ry = trackTop + lane * 58;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(hurdleX - 3, ry + 14, 6, 32);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(hurdleX - 7, ry + 14, 14, 9);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hurdleX - 7, ry + 23, 14, 6);
        }
      });

      // VẠCH ĐÍCH CA-RÔ
      const boxSize = 18;
      for (let cy = trackTop; cy < h; cy += boxSize) {
        for (let cx = 0; cx < 3; cx++) {
          const isWhite = (Math.floor(cy / boxSize) + cx) % 2 === 0;
          ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
          ctx.fillRect(FINISH_LINE + cx * boxSize, cy, boxSize, boxSize);
        }
      }

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(FINISH_LINE - 8, 95, 12, h - 95);
      ctx.fillRect(FINISH_LINE + 48, 95, 12, h - 95);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(FINISH_LINE - 24, 68, 96, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 FINISH', FINISH_LINE + 24, 90);

      // VẼ HẠT BỤI ĐƯỜNG ĐUA
      dustPuffs.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // VẼ TẤT CẢ ĐỘNG VẬT THEO THỨ TỰ CHIỀU SÂU Y
      const sortedByY = [...conVats].sort((a, b) => a.laneY - b.laneY);
      sortedByY.forEach(cv => {
        veDongVatChanThuc(cv, cv.x, cv.laneY);
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
  }, [dangChoi, khoiTaoCuocDua]);

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
      {/* KHUNG CANVAS FULL Ô */}
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 90px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.55)',
          border: '2px solid #1e293b',
          background: '#070b14',
          display: 'flex'
        }}
      >
        <canvas
          ref={canvasRef}
          width={1100}
          height={580}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* HUD TRỰC TIẾP TRÊN CANVAS: DẪN ĐẦU, TIẾN ĐỘ & TOÀN MÀN HÌNH */}
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
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.90)',
              border: '1px solid #16a34a',
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#4ade80'
            }}
          >
            🐾 Dẫn đầu: <span style={{ color: '#facc15' }}>{nguoiDanDau || 'Sẵn sàng...'}</span>
          </div>

          <div
            style={{
              minWidth: '220px',
              background: 'rgba(15, 23, 42, 0.90)',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>
              <span>🏇 Chặng Đua Thú</span>
              <span style={{ color: '#4ade80' }}>{tienDoPhanTram}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${tienDoPhanTram}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #16a34a, #eab308, #f97316)',
                  borderRadius: '4px',
                  transition: 'width 0.15s linear'
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
                  background: 'rgba(15, 23, 42, 0.90)',
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

      {/* NÚT BẤM KHỞI ĐỘNG */}
      <div style={{ marginTop: '14px' }}>
        <button
          className="game-action-btn"
          onClick={() => {
            if (!dangChoi) {
              khoiTaoCuocDua();
              onBatDauChoi();
            }
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 38px',
            borderRadius: '30px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 20px rgba(22, 163, 74, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🏇 Các thú cưng đang rượt đuổi kịch tính...' : '🏁 BẮT ĐẦU ĐUA ĐỘNG VẬT'}</span>
        </button>
      </div>
    </div>
  );
};
