// Dịch vụ sao lưu và khôi phục dữ liệu (JSON & Excel)
import * as XLSX from 'xlsx';
import type { LopHoc } from './quan-ly-danh-sach';
import type { LichSuBocTham } from './luu-tru';
import { layDanhSachLopHoc, layLichSuBocTham, luuLopHoc, luuLichSuBocTham } from './luu-tru';

export interface DuLieuSaoLuu {
  phienBan: string;
  ngaySaoLuu: string;
  danhSachLop: LopHoc[];
  lichSu: LichSuBocTham[];
}

// Xuất toàn bộ dữ liệu ra tệp JSON
export async function xuatTepSaoLuuJSON(): Promise<void> {
  const danhSachLop = await layDanhSachLopHoc();
  const lichSu = await layLichSuBocTham();

  const duLieu: DuLieuSaoLuu = {
    phienBan: '1.0',
    ngaySaoLuu: new Date().toISOString(),
    danhSachLop,
    lichSu
  };

  const jsonStr = JSON.stringify(duLieu, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const thoiGianStr = new Date().toISOString().slice(0, 10);
  a.download = `LopHocMayMan_SaoLuu_${thoiGianStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Khôi phục dữ liệu từ tệp JSON
export async function nhapTepSaoLuuJSON(file: File): Promise<{ soLop: number; soLichSu: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const duLieu = JSON.parse(text) as DuLieuSaoLuu;

        if (!duLieu || !Array.isArray(duLieu.danhSachLop)) {
          throw new Error('Định dạng tệp sao lưu JSON không hợp lệ');
        }

        // Lưu các lớp học vào IndexedDB
        for (const lop of duLieu.danhSachLop) {
          await luuLopHoc(lop);
        }

        // Lưu lịch sử nếu có
        let soLichSu = 0;
        if (Array.isArray(duLieu.lichSu)) {
          for (const item of duLieu.lichSu) {
            await luuLichSuBocTham(item);
            soLichSu++;
          }
        }

        resolve({
          soLop: duLieu.danhSachLop.length,
          soLichSu
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Xuất lịch sử bốc thăm ra tệp Excel
export async function xuatLichSuRaExcel(): Promise<void> {
  const lichSu = await layLichSuBocTham();
  if (lichSu.length === 0) {
    throw new Error('Chưa có lịch sử bốc thăm để xuất Excel');
  }

  const rows = lichSu.map((ls, idx) => ({
    'STT': idx + 1,
    'Thời gian': new Date(ls.thoiGian).toLocaleString('vi-VN'),
    'Lớp học': ls.tenLop,
    'Trò chơi': ls.tenTroChoi,
    'Người trúng': ls.danhSachChon.join(', ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch sử bốc thăm');

  XLSX.writeFile(workbook, `LichSu_BocTham_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Xuất danh sách học sinh của một lớp ra Excel
export function xuatDanhSachHocSinhRaExcel(tenLop: string, danhSach: { ten: string }[]): void {
  const rows = danhSach.map((hs, idx) => ({
    'STT': idx + 1,
    'Họ và tên': hs.ten
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, tenLop || 'Danh sách');

  XLSX.writeFile(workbook, `DanhSach_${(tenLop || 'Lop').replace(/\s+/g, '_')}.xlsx`);
}
