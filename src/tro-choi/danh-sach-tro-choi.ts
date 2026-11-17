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
    thoiLuong: '25 giây',
    moTa: 'Đếm ngược 3-2-1 cất cánh xuyên qua tầng mây lên vũ trụ, vượt thiên thạch và cắm cờ chiến thắng trên Mặt Trăng!',
    sanSang: true
  },
  {
    id: 'dua-vit',
    ten: 'Đua Vịt Qua Sông',
    icon: '🦆🏁',
    thoiLuong: '30 giây',
    moTa: 'Đàn vịt cao su đủ màu sắc có số đeo trên cánh bơi đua rượt đuổi dọc bờ sông và chạm mỏ qua vạch đích ca-rô nghiêng!',
    sanSang: true
  },
  {
    id: 'may-gap-thu',
    ten: 'Máy Gắp Thú Bông',
    icon: '🕹️🧸',
    thoiLuong: 'Tối đa 25 giây',
    moTa: 'Tủ máy gắp thú bông Kawaii Hồng-Xanh Neon: Sau 5 giây càng gắp bắt đầu gắp ngẫu nhiên hên xui (có thể trúng sớm hoặc tuột càng gắp lại trong tối đa 25 giây)!',
    sanSang: true
  },
  {
    id: 'chuyen-bom',
    ten: 'Bom Hẹn Giờ',
    icon: '💣⏱️',
    thoiLuong: '30 giây',
    moTa: 'Vòng tròn học sinh nhìn từ trên cao truyền tay nhau quả bom hẹn giờ theo chiều kim đồng hồ cực kỳ hồi hộp!',
    sanSang: true
  }
];

export const DANH_SACH_9_TRO_CHOI = DANH_SACH_6_TRO_CHOI;
