// Dịch vụ phân tích và đọc tệp Excel thông minh hỗ trợ nhiều sheet, xem trước và ghép cột
import * as XLSX from 'xlsx';
import type { HocSinh } from './quan-ly-danh-sach';
import { taoId } from './quan-ly-danh-sach';

export interface ThongTinFileExcel {
  tenFile: string;
  sheetNames: string[];
  workbook: XLSX.WorkBook;
}

export interface CauHinhNhapExcel {
  sheetName: string;
  dongTieuDe: number; // Chỉ số dòng tiêu đề (bắt đầu từ 0)
  cheDoChonCot: 'mot_cot' | 'ghep_hai_cot';
  cotHoTen?: number; // Chỉ số cột chứa họ tên đầy đủ
  cotHo?: number;    // Chỉ số cột Họ (hoặc Họ và tên đệm)
  cotTen?: number;   // Chỉ số cột Tên
}

/**
 * Đọc sơ bộ file Excel để lấy danh sách Sheet và nạp workbook vào bộ nhớ
 */
export async function phanTichFileExcel(file: File): Promise<ThongTinFileExcel> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });

  return {
    tenFile: file.name,
    sheetNames: workbook.SheetNames,
    workbook
  };
}

/**
 * Lấy toàn bộ dữ liệu dạng ma trận (mảng 2 chiều các ô) từ 1 sheet cụ thể
 */
export function layDuLieuSheet(workbook: XLSX.WorkBook, sheetName: string): (string | number)[][] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  const raw = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  return raw;
}

/**
 * Thuật toán thông minh tự động nhận diện dòng tiêu đề và các cột chứa Họ & Tên
 */
export function tuDongDoanCauHinh(rows: (string | number)[][]): CauHinhNhapExcel {
  let dongTieuDe = 0;
  let cheDoChonCot: 'mot_cot' | 'ghep_hai_cot' = 'mot_cot';
  let cotHoTen: number | undefined = undefined;
  let cotHo: number | undefined = undefined;
  let cotTen: number | undefined = undefined;

  // Quét 12 dòng đầu tiên để tìm dòng tiêu đề phù hợp nhất
  const maxDongQuet = Math.min(rows.length, 12);
  for (let r = 0; r < maxDongQuet; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toLowerCase();
      if (!val) continue;

      // 1. Nhận diện cột Họ và Tên gộp chung
      if (
        /họ và tên|ho va ten|họ tên|ho ten|họ & tên|tên học sinh|ten hoc sinh|họ và tên học sinh|thí sinh|học viên|full name|student name/i.test(
          val
        )
      ) {
        dongTieuDe = r;
        cheDoChonCot = 'mot_cot';
        cotHoTen = c;
        break;
      }

      // 2. Nhận diện cột Họ riêng biệt
      if (/^họ$|^ho$|họ đệm|ho dem|họ lót|ho lot|họ và tên đệm|ho va ten dem|họ và chữ lót|last name|surname/i.test(val)) {
        cotHo = c;
        dongTieuDe = r;
      }

      // 3. Nhận diện cột Tên riêng biệt
      if (/^tên$|^ten$|tên chính|first name/i.test(val)) {
        cotTen = c;
        dongTieuDe = r;
      }
    }

    if (cotHoTen !== undefined) break;
    if (cotHo !== undefined && cotTen !== undefined) {
      cheDoChonCot = 'ghep_hai_cot';
      break;
    }
  }

  // Nếu không tìm thấy cột phù hợp qua tiêu đề, tìm cột đầu tiên có dữ liệu chuỗi ở dòng kế tiếp
  if (cotHoTen === undefined && (cotHo === undefined || cotTen === undefined)) {
    cotHoTen = 0;
    dongTieuDe = 0;
    for (let c = 0; c < (rows[1] || []).length; c++) {
      const testVal = String(rows[1]?.[c] || '').trim();
      // Nếu ô có chữ cái và không phải chỉ là số thứ tự
      if (testVal.length > 2 && isNaN(Number(testVal))) {
        cotHoTen = c;
        break;
      }
    }
  }

  return {
    sheetName: '',
    dongTieuDe,
    cheDoChonCot,
    cotHoTen,
    cotHo,
    cotTen
  };
}

/**
 * Trích xuất danh sách học sinh từ ma trận dữ liệu theo cấu hình người dùng đã chọn
 */
export function chuyenDoiThanhHocSinh(
  rows: (string | number)[][],
  config: CauHinhNhapExcel
): HocSinh[] {
  const ketQua: HocSinh[] = [];
  const startRow = config.dongTieuDe + 1;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let tenDayDu = '';

    if (config.cheDoChonCot === 'mot_cot' && config.cotHoTen !== undefined) {
      tenDayDu = String(row[config.cotHoTen] || '').trim();
    } else if (config.cheDoChonCot === 'ghep_hai_cot') {
      const ho = config.cotHo !== undefined ? String(row[config.cotHo] || '').trim() : '';
      const ten = config.cotTen !== undefined ? String(row[config.cotTen] || '').trim() : '';
      if (ho || ten) {
        tenDayDu = `${ho} ${ten}`.replace(/\s+/g, ' ').trim();
      }
    }

    // Lọc bỏ dòng trống, dòng chỉ có số thứ tự hoặc tiêu đề bảng bị lặp lại
    if (
      tenDayDu.length > 0 &&
      !/^(stt|họ và tên|họ tên|họ|tên|ghi chú|tổng cộng|tt)$/i.test(tenDayDu) &&
      isNaN(Number(tenDayDu))
    ) {
      ketQua.push({
        id: taoId('hs-excel'),
        ten: tenDayDu,
        daDuocChon: false
      });
    }
  }

  return ketQua;
}

/**
 * Đọc nhanh file Excel trực tiếp (Tự động nhận diện và trả về danh sách học sinh ngay lập tức)
 */
export async function docFileExcel(file: File): Promise<HocSinh[]> {
  const thongTin = await phanTichFileExcel(file);
  const sheetDau = thongTin.sheetNames[0];
  if (!sheetDau) return [];

  const rows = layDuLieuSheet(thongTin.workbook, sheetDau);
  const cauHinh = tuDongDoanCauHinh(rows);
  cauHinh.sheetName = sheetDau;

  return chuyenDoiThanhHocSinh(rows, cauHinh);
}
