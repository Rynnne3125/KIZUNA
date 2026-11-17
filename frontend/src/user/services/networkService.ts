import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { isNativeApp } from '../utils/platform';

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
  private lastProbeTime = 0;
  private lastProbeResult = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSim = sessionStorage.getItem(STORAGE_KEY_SIMULATED_TYPE);
      if (savedSim && ['wifi', 'cellular', 'none', 'unknown'].includes(savedSim)) {
        this.simulatedType = savedSim as ConnectionType;
      }
    }
  }

  /**
   * Kiểm tra kết nối Internet thực tế bằng request probe siêu nhẹ (HEAD)
   * Giúp phát hiện mất mạng ngay lập tức trên Website kể cả khi card mạng ảo (WSL/Docker/LAN)
   * khiến navigator.onLine trên trình duyệt vẫn trả về true.
   */
  public async probeInternet(force = false): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    // Nếu navigator.onLine là false thì chắc chắn mất mạng
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.lastProbeResult = false;
      return false;
    }

    // Rate-limit probe tối đa 1 lần mỗi 1000ms nếu không yêu cầu force
    const now = Date.now();
    if (!force && now - this.lastProbeTime < 1000) {
      return this.lastProbeResult;
    }
    this.lastProbeTime = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const probeUrl = `${window.location.origin}/manifest.json?_t=${now}`;
      const response = await fetch(probeUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const isOk = response.ok || response.status === 304;
      this.lastProbeResult = isOk;
      return isOk;
    } catch {
      this.lastProbeResult = false;
      return false;
    }
  }

  /**
   * Lấy trạng thái mạng hiện tại từ Capacitor Network hoặc Web APIs + Real Probe
   */
  public async getStatus(): Promise<ExtendedNetworkStatus> {
    // 1. Chế độ giả lập (cho review/test)
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

    // 2. Môi trường Website (Browser Desktop/Laptop)
    if (!isNativeApp() && typeof window !== 'undefined') {
      // Kiểm tra navigator.onLine
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
          connected: false,
          connectionType: 'none',
          isWifi: false,
          isCellular: false,
          isOffline: true
        };
      }

      // Kiểm tra probe thực tế
      const isOnline = await this.probeInternet();
      return {
        connected: isOnline,
        connectionType: isOnline ? 'wifi' : 'none',
        isWifi: isOnline,
        isCellular: false,
        isOffline: !isOnline
      };
    }

    // 3. Môi trường Ứng dụng Di động Native (Capacitor)
    try {
      const status: ConnectionStatus = await Network.getStatus();
      let connType: ConnectionType = status.connectionType;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
          connected: false,
          connectionType: 'none',
          isWifi: false,
          isCellular: false,
          isOffline: true
        };
      }

      const connected = status.connected && connType !== 'none';
      const isWifi = connected && connType === 'wifi';
      const isCellular = connected && connType === 'cellular';
      const isOffline = !connected;

      return {
        connected,
        connectionType: connType,
        isWifi,
        isCellular,
        isOffline
      };
    } catch {
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
    let pollInterval: any = null;

    const handleUpdate = async () => {
      const fresh = await this.getStatus();
      callback(fresh);
    };

    // Lắng nghe qua Capacitor Network
    Network.addListener('networkStatusChange', () => {
      handleUpdate();
    }).then(handle => {
      removeCapacitorListener = () => handle.remove();
    }).catch(() => {});

    // Lắng nghe qua Window events & Visibility & Periodic Probe cho Website
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleUpdate);
      window.addEventListener('offline', handleUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') handleUpdate();
      });

      // Đối với Website: Polling probe nhẹ mỗi 3.5s để bắt kịp việc ngắt mạng
      if (!isNativeApp()) {
        pollInterval = setInterval(handleUpdate, 3500);
      }
    }

    return () => {
      if (removeCapacitorListener) removeCapacitorListener();
      if (pollInterval) clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleUpdate);
        window.removeEventListener('offline', handleUpdate);
      }
    };
  }

  public isWifiOnlyRequired(): boolean {
    return false;
  }

  public setWifiOnlyRequired(_required: boolean): void {}

  public isCellularBypassed(): boolean {
    return false;
  }

  public setCellularBypassed(_bypassed: boolean): void {}

  public setSimulatedType(type: ConnectionType | null): void {
    this.simulatedType = type;
    if (typeof sessionStorage !== 'undefined') {
      if (type) sessionStorage.setItem(STORAGE_KEY_SIMULATED_TYPE, type);
      else sessionStorage.removeItem(STORAGE_KEY_SIMULATED_TYPE);
    }
    window.dispatchEvent(new CustomEvent('kizuna_network_config_changed'));
  }

  public getSimulatedType(): ConnectionType | null {
    return this.simulatedType;
  }
}

export const networkService = new NetworkService();
