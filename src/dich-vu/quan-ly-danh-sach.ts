// Dịch vụ quản lý danh sách học sinh và các lớp học

export interface HocSinh {
  id: string;
  ten: string;
  daDuocChon?: boolean; // Đánh dấu đã được chọn trong phiên hiện tại (chế độ không hoàn lại)
}

export interface LopHoc {
  id: string;
  tenLop: string;
  danhSach: HocSinh[];
  ngayTao: number;
}

// Tạo mã định danh ngẫu nhiên
export function taoId(tienTo: string = 'id'): string {
  return `${tienTo}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

// Tạo danh sách mặc định theo số lượng (Ví dụ: Học sinh 1, Học sinh 2,...)
export function taoDanhSachTheoSoLuong(soLuong: number): HocSinh[] {
  const danhSach: HocSinh[] = [];
  const sl = Math.max(1, Math.min(soLuong, 2000));
  for (let i = 1; i <= sl; i++) {
    danhSach.push({
      id: taoId('hs-sl'),
      ten: `Học sinh ${i}`,
      daDuocChon: false
    });
  }
  return danhSach;
}

// Xử lý dán danh sách tên từ văn bản (tách theo dòng, bỏ dòng trống và khoảng trắng thừa)
export function xuLyDanDanhSach(vanBan: string): HocSinh[] {
  const dongs = vanBan.split(/\r?\n/);
  const danhSach: HocSinh[] = [];

  dongs.forEach(dong => {
    const tenSach = dong.trim();
    if (tenSach.length > 0) {
      danhSach.push({
        id: taoId('hs-dan'),
        ten: tenSach,
        daDuocChon: false
      });
    }
  });

  return danhSach;
}

// Kiểm tra tên trùng lặp để cảnh báo người dùng (không tự động xóa)
export function timTenTrungLap(danhSach: HocSinh[]): string[] {
  const demTen: Record<string, number> = {};
  danhSach.forEach(hs => {
    const t = hs.ten.trim().toLowerCase();
    demTen[t] = (demTen[t] || 0) + 1;
  });

  const trung: string[] = [];
  danhSach.forEach(hs => {
    const t = hs.ten.trim().toLowerCase();
    if (demTen[t] > 1 && !trung.includes(hs.ten.trim())) {
      trung.push(hs.ten.trim());
    }
  });

  return trung;
}

// Tạo lớp học mới mặc định
export function taoLopHocMoi(tenLop: string, danhSach: HocSinh[] = []): LopHoc {
  return {
    id: taoId('lop'),
    tenLop: tenLop.trim() || 'Lớp mới',
    danhSach,
    ngayTao: Date.now()
  };
}
