// Dịch vụ lưu trữ cục bộ sử dụng IndexedDB
import type { LopHoc } from './quan-ly-danh-sach';

export interface LichSuBocTham {
  id: string;
  lopHocId: string;
  tenLop: string;
  tenTroChoi: string;
  danhSachChon: string[];
  thoiGian: number;
}

const DB_NAME = 'LopHocMayManDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function moDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Bảng lưu danh sách các lớp học
      if (!db.objectStoreNames.contains('lopHoc')) {
        db.createObjectStore('lopHoc', { keyPath: 'id' });
      }

      // Bảng lưu cài đặt ứng dụng
      if (!db.objectStoreNames.contains('caiDat')) {
        db.createObjectStore('caiDat', { keyPath: 'key' });
      }

      // Bảng lưu lịch sử bốc thăm
      if (!db.objectStoreNames.contains('lichSu')) {
        const store = db.createObjectStore('lichSu', { keyPath: 'id' });
        store.createIndex('lopHocId', 'lopHocId', { unique: false });
        store.createIndex('thoiGian', 'thoiGian', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };

    request.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// Lấy danh sách tất cả các lớp học
export async function layDanhSachLopHoc(): Promise<LopHoc[]> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lopHoc', 'readonly');
    const store = tx.objectStore('lopHoc');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Lưu hoặc cập nhật lớp học
export async function luuLopHoc(lop: LopHoc): Promise<void> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lopHoc', 'readwrite');
    const store = tx.objectStore('lopHoc');
    const req = store.put(lop);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Xóa lớp học
export async function xoaLopHoc(id: string): Promise<void> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lopHoc', 'readwrite');
    const store = tx.objectStore('lopHoc');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Lưu cài đặt tùy biến (key-value)
export async function luuCaiDat<T>(key: string, value: T): Promise<void> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('caiDat', 'readwrite');
    const store = tx.objectStore('caiDat');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Đọc cài đặt tùy biến
export async function docCaiDat<T>(key: string, macDinh: T): Promise<T> {
  const db = await moDB();
  return new Promise((resolve) => {
    const tx = db.transaction('caiDat', 'readonly');
    const store = tx.objectStore('caiDat');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result && req.result.value !== undefined) {
        resolve(req.result.value as T);
      } else {
        resolve(macDinh);
      }
    };
    req.onerror = () => resolve(macDinh);
  });
}

// Lưu kết quả bốc thăm vào lịch sử
export async function luuLichSuBocTham(item: LichSuBocTham): Promise<void> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lichSu', 'readwrite');
    const store = tx.objectStore('lichSu');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Lấy toàn bộ lịch sử
export async function layLichSuBocTham(): Promise<LichSuBocTham[]> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lichSu', 'readonly');
    const store = tx.objectStore('lichSu');
    const req = store.getAll();
    req.onsuccess = () => {
      const ketQua = (req.result || []) as LichSuBocTham[];
      // Sắp xếp mới nhất trước
      ketQua.sort((a, b) => b.thoiGian - a.thoiGian);
      resolve(ketQua);
    };
    req.onerror = () => reject(req.error);
  });
}

// Xóa lịch sử
export async function xoaLichSuBocTham(): Promise<void> {
  const db = await moDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lichSu', 'readwrite');
    const store = tx.objectStore('lichSu');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
