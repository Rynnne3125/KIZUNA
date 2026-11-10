import { Capacitor } from '@capacitor/core';

/**
 * Kiểm tra xem người dùng có đang sử dụng Kizuna trong ứng dụng di động (Android APK qua Capacitor)
 * hoặc chế độ cài đặt Standalone (PWA) hay không.
 * 
 * - Trả về `true`: Đang chạy trong APK / App -> Ẩn các nút "Tải APK", "Tải ứng dụng", modal tải app.
 * - Trả về `false`: Đang chạy trên trình duyệt Web thông thường (Chrome, Safari, Edge,...) -> Hiển thị nút tải app bình thường.
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Kiểm tra chính thống qua Capacitor Native Platform (Android / iOS app)
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    // 2. Kiểm tra bridge Capacitor trên window
    const win = window as any;
    if (win.Capacitor && typeof win.Capacitor.isNativePlatform === 'function') {
      if (win.Capacitor.isNativePlatform()) return true;
    }

    // 3. Kiểm tra User Agent chứa ký hiệu ứng dụng được cấu hình (KIZUNA_APP)
    const ua = navigator.userAgent || '';
    if (/KIZUNA_APP/i.test(ua)) {
      return true;
    }

    // 4. Kiểm tra chế độ PWA Standalone (đã cài đặt ứng dụng trên máy)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    if ((window.navigator as any)?.standalone === true) {
      return true;
    }
  } catch (err) {
    console.warn('[Platform] Lỗi khi nhận diện môi trường ứng dụng:', err);
  }

  return false;
};
