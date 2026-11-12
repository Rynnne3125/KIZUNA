import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { isNativeApp } from '../utils/platform';

const STORAGE_KEY_WIFI_ONLY = 'kizuna_wifi_only_required';
const STORAGE_KEY_CELLULAR_BYPASS = 'kizuna_cellular_bypassed_session';
const STORAGE_KEY_SIMULATED_TYPE = 'kizuna_simulated_network_type';

export interface ExtendedNetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
  isWifi: boolean;
  isCellular: boolean;
  isOffline: boolean;
}

class NetworkService {
  private simulatedType: ConnectionType | null = null;

  constructor() {
    // Khởi tạo trạng thái giả lập từ session nếu có
    if (typeof window !== 'undefined') {
      const savedSim = sessionStorage.getItem(STORAGE_KEY_SIMULATED_TYPE);
      if (savedSim && ['wifi', 'cellular', 'none', 'unknown'].includes(savedSim)) {
        this.simulatedType = savedSim as ConnectionType;
      }
    }
  }

  /**
   * Lấy trạng thái mạng hiện tại từ Capacitor Network hoặc Web APIs
   */
  public async getStatus(): Promise<ExtendedNetworkStatus> {
    // 1. Nếu đang có chế độ giả lập (cho mục đích test/review giao diện)
    if (this.simulatedType) {
      const isConnected = this.simulatedType !== 'none';
      return {
        connected: isConnected,
        connectionType: this.simulatedType,
        isWifi: this.simulatedType === 'wifi',
        isCellular: this.simulatedType === 'cellular',
        isOffline: !isConnected
      };
    }

    try {
      // 2. Thử lấy thông qua plugin Capacitor Network chính thống
      const status: ConnectionStatus = await Network.getStatus();
      let connType: ConnectionType = status.connectionType;

      // 3. Nếu đang ở môi trường trình duyệt Web (loại mạng là 'unknown' hoặc trình duyệt hỗ trợ NetworkInformation)
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        const nav = navigator as any;
        const navConnection = nav.connection || nav.mozConnection || nav.webkitConnection;

        if (navConnection && navConnection.type) {
          // Trình duyệt hỗ trợ thuộc tính type (Android Chrome, Chromium)
          if (navConnection.type === 'wifi') {
            connType = 'wifi';
          } else if (navConnection.type === 'cellular') {
            connType = 'cellular';
          } else if (navConnection.type === 'none') {
            connType = 'none';
          }
        } else if (!isNativeApp() && status.connected) {
          // Nếu chạy trên Web desktop/laptop có Internet nhưng browser không cung cấp type:
          // Mặc định coi là đường truyền băng thông rộng / Wi-Fi khả dụng
          if (connType === 'unknown') {
            connType = 'wifi';
          }
        }

        // Kiểm tra navigator.onLine dự phòng
        if (navigator.onLine === false) {
          return {
            connected: false,
            connectionType: 'none',
            isWifi: false,
            isCellular: false,
            isOffline: true
          };
        }
      }

      const connected = status.connected;
      const isWifi = connected && connType === 'wifi';
      const isCellular = connected && connType === 'cellular';
      const isOffline = !connected || connType === 'none';

      return {
        connected,
        connectionType: connType,
        isWifi,
        isCellular,
        isOffline
      };
    } catch (err) {
      console.warn('[NetworkService] Lỗi khi kiểm tra mạng qua Capacitor, dùng Web fallback:', err);
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      return {
        connected: isOnline,
        connectionType: isOnline ? 'wifi' : 'none',
        isWifi: isOnline,
        isCellular: false,
        isOffline: !isOnline
      };
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện thay đổi kết nối mạng
   */
  public addStatusListener(callback: (status: ExtendedNetworkStatus) => void): () => void {
    let removeCapacitorListener: (() => void) | null = null;

    const handleUpdate = async () => {
      const fresh = await this.getStatus();
      callback(fresh);
    };

    // Lắng nghe qua Capacitor
    Network.addListener('networkStatusChange', () => {
      handleUpdate();
    }).then(handle => {
      removeCapacitorListener = () => handle.remove();
    }).catch(err => {
      console.warn('[NetworkService] Không thể gán Capacitor listener:', err);
    });

    // Lắng nghe qua Window events dự phòng
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleUpdate);
      window.addEventListener('offline', handleUpdate);

      const nav = navigator as any;
      const navConnection = nav.connection || nav.mozConnection || nav.webkitConnection;
      if (navConnection && navConnection.addEventListener) {
        navConnection.addEventListener('change', handleUpdate);
      }
    }

    return () => {
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleUpdate);
        window.removeEventListener('offline', handleUpdate);
        const nav = navigator as any;
        const navConnection = nav.connection || nav.mozConnection || nav.webkitConnection;
        if (navConnection && navConnection.removeEventListener) {
          navConnection.removeEventListener('change', handleUpdate);
        }
      }
    };
  }

  /**
   * Cấu hình: Ứng dụng có bắt buộc dùng Wi-Fi không (Mặc định: true)
   */
  public isWifiOnlyRequired(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEY_WIFI_ONLY);
    // Mặc định luôn là true để thỏa mãn yêu cầu wifi của app
    return val === null ? true : val === 'true';
  }

  public setWifiOnlyRequired(required: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WIFI_ONLY, String(required));
      window.dispatchEvent(new CustomEvent('kizuna_network_config_changed'));
    }
  }

  /**
   * Người dùng đã xác nhận bỏ qua và tiếp tục dùng 4G cho phiên làm việc này chưa
   */
  public isCellularBypassed(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY_CELLULAR_BYPASS) === 'true';
  }

  public setCellularBypassed(bypassed: boolean): void {
    if (typeof sessionStorage !== 'undefined') {
      if (bypassed) {
        sessionStorage.setItem(STORAGE_KEY_CELLULAR_BYPASS, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CELLULAR_BYPASS);
      }
      window.dispatchEvent(new CustomEvent('kizuna_network_config_changed'));
    }
  }

  /**
   * Trình giả lập loại mạng (cho mục đích demo / test chức năng)
   */
  public getSimulatedType(): ConnectionType | null {
    return this.simulatedType;
  }

  public setSimulatedType(type: ConnectionType | null): void {
    this.simulatedType = type;
    if (typeof sessionStorage !== 'undefined') {
      if (type) {
        sessionStorage.setItem(STORAGE_KEY_SIMULATED_TYPE, type);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_SIMULATED_TYPE);
      }
    }
    window.dispatchEvent(new CustomEvent('kizuna_network_config_changed'));
  }
}

export const networkService = new NetworkService();
