// Danh mục 6 trò chơi bốc thăm học sinh theo thiết kế nâng cấp Lucky Class

export interface ThongTinTroChoi {
  id: string;
  ten: string;
  icon: string;
  thoiLuong: string;
  moTa: string;
  sanSang: boolean;
}

export const DANH_SACH_6_TRO_CHOI: ThongTinTroChoi[] = [
  {
    id: 'vong-quay-may-man',
    ten: 'Vòng Quay May Mắn',
    icon: '🎯',
    thoiLuong: '15 giây',
    moTa: 'Vòng quay nhiều màu sắc, kim chỉ hồi hộp với hiệu ứng giảm tốc mượt mà.',
    sanSang: true
  },
  {
    id: 'bi-lien-hoan',
    ten: 'Bi Liên Hoàn',
    icon: '🌀',
    thoiLuong: '45 giây',
    moTa: 'Máng trượt bi ve liên hoàn: Dốc zíc zắc, quạt gió, rừng đinh Plinko, bánh xe quay và phễu dồn về đích!',
    sanSang: true
  },
  {
    id: 'dua-dong-vat',
    ten: 'Đua Động Vật',
    icon: '🏃🐾',
    thoiLuong: '45 giây',
    moTa: 'Các nhân vật thú cưng siêu đáng yêu (mèo, chó, thỏ, sư tử, cáo...) nhún nhảy chạy đua và vượt rào cản.',
    sanSang: true
  },
  {
    id: 'hop-bi-an',
    ten: 'Hộp Quà May Mắn',
    icon: '🎁',
    thoiLuong: 'Tự do bấm chọn',
    moTa: 'Học sinh ẩn giấu trong các hộp quà bí ẩn. Thầy cô hoặc học sinh tự bấm chọn hộp mình thích để mở!',
    sanSang: true
  },
  {
    id: 'cau-ca-tim-ten',
    ten: 'Câu Cá Tìm Tên',
    icon: '🎣🐟',
    thoiLuong: '40 giây',
    moTa: 'Thả mồi câu xuống mặt hồ gợn sóng, cá bơi lội tò mò vờn mồi trước khi chú cá may mắn cắn câu giật lên.',
    sanSang: true
  },
  {
    id: 'phong-ten-lua',
    ten: 'Phóng Tên Lửa',
    icon: '🚀',
    thoiLuong: '45 giây',
    moTa: 'Đếm ngược 3-2-1 cất cánh xuyên qua tầng mây lên vũ trụ, vượt thiên thạch và cắm cờ chiến thắng trên Mặt Trăng!',
    sanSang: true
  }
];

export const DANH_SACH_9_TRO_CHOI = DANH_SACH_6_TRO_CHOI;
