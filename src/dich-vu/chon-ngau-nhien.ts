// Dịch vụ chọn ngẫu nhiên độc lập với hoạt ảnh giao diện
import type { HocSinh } from './quan-ly-danh-sach';

export interface KetQuaBocTham {
  danhSachChon: HocSinh[];
  loiChuc: string;
}

// Danh sách các lời chúc mừng thân thiện, khích lệ tinh thần học tập
const DANH_SACH_LOI_CHUC = [
  'Bạn đã được chọn! Chúc bạn thật tự tin và hoàn thành thật tốt nhé! 🌟',
  'Chúc mừng bạn! Cả lớp cùng cổ vũ bạn nào! 👏',
  'Xin chúc mừng! Chúc bạn bình tĩnh, tự tin và tỏa sáng rực rỡ! ✨',
  'Bạn là ngôi sao may mắn của lượt này! Cố lên nhé! 🎯',
  'Tuyệt vời! Hãy cho cả lớp thấy phong độ tuyệt đỉnh của bạn! 🚀',
  'Khoảnh khắc tỏa sáng đã đến! Chúc bạn làm bài thật xuất sắc! 💡'
];

export function layLoiChucNgauNhien(tenHocSinh: string): string {
  const index = Math.floor(Math.random() * DANH_SACH_LOI_CHUC.length);
  void tenHocSinh;
  return DANH_SACH_LOI_CHUC[index];
}

// Hàm chọn ngẫu nhiên chỉ số bảo đảm tính công bằng
function layChiSoNgauNhien(max: number): number {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// Xáo trộn mảng theo thuật toán Fisher-Yates
export function xaoTronMang<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = layChiSoNgauNhien(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Thực hiện bốc thăm theo quy tắc (Mặc định chọn trong toàn bộ danh sách mỗi lượt)
export function thucHienBocTham(
  danhSach: HocSinh[],
  soLuongChon: number = 1,
  coHoanLai: boolean = true
): KetQuaBocTham {
  if (danhSach.length === 0) {
    throw new Error('Danh sách học sinh đang trống');
  }

  // Lọc các học sinh đủ điều kiện
  let ungVien = coHoanLai ? [...danhSach] : danhSach.filter(hs => !hs.daDuocChon);

  if (ungVien.length === 0) {
    ungVien = [...danhSach]; // Nếu tất cả đã bốc, tự động dùng lại toàn bộ danh sách
  }

  // Xáo trộn ứng viên
  ungVien = xaoTronMang(ungVien);

  // Chọn số lượng cần lấy
  const slCanLay = Math.min(soLuongChon, ungVien.length);
  const danhSachChon = ungVien.slice(0, slCanLay);

  const tenHienThi = danhSachChon.map(hs => hs.ten).join(', ');
  const loiChuc = layLoiChucNgauNhien(tenHienThi);

  return {
    danhSachChon,
    loiChuc
  };
}
