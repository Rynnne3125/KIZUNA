/**
 * Firestore Quota & Circuit Breaker Guard
 * Tự động phát hiện khi Firestore chạm ngưỡng giới hạn đọc (50,000 reads/ngày trên gói Spark),
 * ngắt kết nối tạm thời và chuyển toàn bộ hệ thống sang Chế độ Dữ liệu Cục bộ (Local/Offline Cache)
 * nhằm ngăn chặn đóng băng giao diện (UI Freeze) và lỗi 15s timeout lặp lại.
 */

const FS_QUOTA_STORAGE_KEY = 'kizuna_firestore_quota_exhausted';
const FS_QUOTA_EXPIRY_KEY = 'kizuna_firestore_quota_expiry';
const QUOTA_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 giờ tạm ngắt gọi server để bảo vệ

let memoryQuotaExhausted = false;

export function isFirestoreQuotaExhausted(): boolean {
  if (memoryQuotaExhausted) return true;

  if (typeof window === 'undefined') return false;

  try {
    const isExhausted = sessionStorage.getItem(FS_QUOTA_STORAGE_KEY);
    const expiry = Number(sessionStorage.getItem(FS_QUOTA_EXPIRY_KEY) || 0);

    if (isExhausted === 'true') {
      if (Date.now() < expiry) {
        memoryQuotaExhausted = true;
        return true;
      }
      // Hết thời gian chờ, thử mở lại để thăm dò
      sessionStorage.removeItem(FS_QUOTA_STORAGE_KEY);
      sessionStorage.removeItem(FS_QUOTA_EXPIRY_KEY);
      memoryQuotaExhausted = false;
      return false;
    }
  } catch {
    // ignore
  }

  return false;
}

export function markFirestoreQuotaExhausted(reason?: string) {
  memoryQuotaExhausted = true;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FS_QUOTA_STORAGE_KEY, 'true');
      sessionStorage.setItem(FS_QUOTA_EXPIRY_KEY, String(Date.now() + QUOTA_COOLDOWN_MS));
    } catch {
      // ignore
    }
  }
  console.warn(
    `[FirestoreGuard] 🔥 CẢNH BÁO QUOTA: Firestore đã đạt giới hạn đọc trong ngày (50,000 reads/ngày). ` +
    `Hệ thống tự động kích hoạt Chế độ Cache & Dữ liệu Cục bộ (Local Fallback Mode) cho cả User & Admin. Lý do:`,
    reason || 'Resource exhausted'
  );
}

export function handleFirestoreError(error: any): boolean {
  if (!error) return false;
  const errMsg = String(error?.message || error || '').toLowerCase();
  const errCode = String(error?.code || '').toLowerCase();

  const isQuota =
    errCode.includes('resource-exhausted') ||
    errMsg.includes('quota exceeded') ||
    errMsg.includes('resource exhausted') ||
    errMsg.includes('resource-exhausted');

  if (isQuota) {
    markFirestoreQuotaExhausted(errMsg);
    return true;
  }
  return false;
}

export function shouldSkipFirestore(): boolean {
  return isFirestoreQuotaExhausted();
}

export function resetFirestoreQuotaGuard() {
  memoryQuotaExhausted = false;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(FS_QUOTA_STORAGE_KEY);
      sessionStorage.removeItem(FS_QUOTA_EXPIRY_KEY);
    } catch {}
  }
  console.info('[FirestoreGuard] Đã thiết lập lại trạng thái kiểm tra Firestore.');
}
