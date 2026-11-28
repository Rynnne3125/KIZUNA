import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { isNativeApp } from '../utils/platform';

const STORAGE_KEY_SIMULATED_TYPE = 'kizuna_simulated_network_type';

export type NetworkQuality = 'online' | 'weak' | 'offline';

export interface ExtendedNetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
  isWifi: boolean;
  isCellular: boolean;
  isOffline: boolean;
  isWeak: boolean;
  quality: NetworkQuality;
  lastLatencyMs?: number;
}

export interface NetworkProbeResult {
  ok: boolean;
  latencyMs: number;
}

const PROBE_TIMEOUT_MS = 5000;
const FALLBACK_PROBE_TIMEOUT_MS = 4000;
const WEAK_LATENCY_THRESHOLD_MS = 2500;
const CONSECUTIVE_FAILURE_THRESHOLD = 2;

function getEffectiveConnectionType(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return typeof conn?.effectiveType === 'string' ? conn.effectiveType.toLowerCase() : undefined;
}

function isBrowserNavigatorWeak(): boolean {
  const effectiveType = getEffectiveConnectionType();
  return effectiveType === 'slow-2g' || effectiveType === '2g';
}

class NetworkService {
  private simulatedType: ConnectionType | null = null;
  private lastProbeTime = 0;
  private lastProbeResult: NetworkProbeResult = { ok: true, latencyMs: 0 };
  private consecutiveProbeFailures = 0;
  private lastStatus: ExtendedNetworkStatus = {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: typeof navigator !== 'undefined' && !navigator.onLine ? 'none' : 'wifi',
    isWifi: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isCellular: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    isWeak: false,
    quality: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSim = sessionStorage.getItem(STORAGE_KEY_SIMULATED_TYPE);
      if (savedSim && ['wifi', 'cellular', 'none', 'unknown'].includes(savedSim)) {
        this.simulatedType = savedSim as ConnectionType;
      }
    }
  }

  public isCurrentlyOffline(): boolean {
    if (this.simulatedType) {
      return this.simulatedType === 'none';
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return true;
    }
    return this.lastStatus.isOffline;
  }

  /**
   * Thăm dò kết nối Internet với ngưỡng timeout 5s và fallback để tránh báo mất mạng giả khi mạng chỉ yếu.
   */
  public async probeInternetDetailed(force = false): Promise<NetworkProbeResult> {
    if (typeof window === 'undefined') return { ok: true, latencyMs: 0 };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.consecutiveProbeFailures = CONSECUTIVE_FAILURE_THRESHOLD;
      this.lastProbeResult = { ok: false, latencyMs: 0 };
      return this.lastProbeResult;
    }

    const now = Date.now();
    if (!force && now - this.lastProbeTime < 1500) {
      return this.lastProbeResult;
    }
    this.lastProbeTime = now;

    const tryHead = async (path: string, timeoutMs: number): Promise<NetworkProbeResult> => {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const probeUrl = `${window.location.origin}${path}?_t=${Date.now()}`;
        const response = await fetch(probeUrl, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;
        const ok = response.ok || response.status === 304;
        return { ok, latencyMs };
      } catch {
        clearTimeout(timeoutId);
        return { ok: false, latencyMs: Date.now() - start };
      }
    };

    let result = await tryHead('/manifest.json', PROBE_TIMEOUT_MS);
    if (!result.ok && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      result = await tryHead('/version.json', FALLBACK_PROBE_TIMEOUT_MS);
    }

    if (result.ok) {
      this.consecutiveProbeFailures = 0;
    } else {
      this.consecutiveProbeFailures += 1;
    }

    this.lastProbeResult = result;
    return result;
  }

  public async probeInternet(force = false): Promise<boolean> {
    const res = await this.probeInternetDetailed(force);
    return res.ok;
  }

  /**
   * Lấy trạng thái mạng hiện tại với phân biệt 3 mức: online / weak / offline.
   * Mạng yếu (latency cao hoặc rớt 1 gói tin trong khi navigator.onLine vẫn true) KHÔNG bị coi là mất Internet.
   */
  public async getStatus(forceProbe = false): Promise<ExtendedNetworkStatus> {
    if (this.simulatedType) {
      const isConnected = this.simulatedType !== 'none';
      const simStatus: ExtendedNetworkStatus = {
        connected: isConnected,
        connectionType: this.simulatedType,
        isWifi: this.simulatedType === 'wifi',
        isCellular: this.simulatedType === 'cellular',
        isOffline: !isConnected,
        isWeak: false,
        quality: isConnected ? 'online' : 'offline'
      };
      this.lastStatus = simStatus;
      return simStatus;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.consecutiveProbeFailures = CONSECUTIVE_FAILURE_THRESHOLD;
      const offlineStatus: ExtendedNetworkStatus = {
        connected: false,
        connectionType: 'none',
        isWifi: false,
        isCellular: false,
        isOffline: true,
        isWeak: false,
        quality: 'offline'
      };
      this.lastStatus = offlineStatus;
      return offlineStatus;
    }

    if (!isNativeApp() && typeof window !== 'undefined') {
      const probe = await this.probeInternetDetailed(forceProbe);

      if (probe.ok) {
        const weak = probe.latencyMs >= WEAK_LATENCY_THRESHOLD_MS || isBrowserNavigatorWeak();
        const status: ExtendedNetworkStatus = {
          connected: true,
          connectionType: 'wifi',
          isWifi: true,
          isCellular: false,
          isOffline: false,
          isWeak: weak,
          quality: weak ? 'weak' : 'online',
          lastLatencyMs: probe.latencyMs
        };
        this.lastStatus = status;
        return status;
      }

      // Nếu mới thất bại 1 lần và trình duyệt vẫn còn kết nối mạng -> coi là mạng yếu, chưa báo mất Internet ngay
      if (this.consecutiveProbeFailures < CONSECUTIVE_FAILURE_THRESHOLD) {
        const weakStatus: ExtendedNetworkStatus = {
          connected: true,
          connectionType: 'wifi',
          isWifi: true,
          isCellular: false,
          isOffline: false,
          isWeak: true,
          quality: 'weak',
          lastLatencyMs: probe.latencyMs
        };
        this.lastStatus = weakStatus;
        return weakStatus;
      }

      const offlineStatus: ExtendedNetworkStatus = {
        connected: false,
        connectionType: 'none',
        isWifi: false,
        isCellular: false,
        isOffline: true,
        isWeak: false,
        quality: 'offline',
        lastLatencyMs: probe.latencyMs
      };
      this.lastStatus = offlineStatus;
      return offlineStatus;
    }

    // Môi trường Ứng dụng Di động Native (Capacitor)
    try {
      const status: ConnectionStatus = await Network.getStatus();
      const connType: ConnectionType = status.connectionType;
      const connected = status.connected && connType !== 'none';
      const isWifi = connected && connType === 'wifi';
      const isCellular = connected && connType === 'cellular';
      const isOffline = !connected;
      const isWeak = connected && isBrowserNavigatorWeak();

      const nativeStatus: ExtendedNetworkStatus = {
        connected,
        connectionType: connType,
        isWifi,
        isCellular,
        isOffline,
        isWeak,
        quality: isOffline ? 'offline' : (isWeak ? 'weak' : 'online')
      };
      this.lastStatus = nativeStatus;
      return nativeStatus;
    } catch {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const fallbackStatus: ExtendedNetworkStatus = {
        connected: isOnline,
        connectionType: isOnline ? 'wifi' : 'none',
        isWifi: isOnline,
        isCellular: false,
        isOffline: !isOnline,
        isWeak: false,
        quality: isOnline ? 'online' : 'offline'
      };
      this.lastStatus = fallbackStatus;
      return fallbackStatus;
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện thay đổi kết nối mạng
   */
  public addStatusListener(callback: (status: ExtendedNetworkStatus) => void): () => void {
    let removeCapacitorListener: (() => void) | null = null;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryVerifyTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const scheduleNextPoll = (current: ExtendedNetworkStatus) => {
      if (disposed || isNativeApp()) return;
      if (pollTimeout) clearTimeout(pollTimeout);
      const delay = current.isOffline ? 8000 : (current.isWeak ? 6000 : 15000);
      pollTimeout = setTimeout(() => {
        void handleUpdate(false);
      }, delay);
    };

    const handleUpdate = async (forceProbe = false) => {
      if (disposed) return;
      const fresh = await this.getStatus(forceProbe);
      if (disposed) return;
      callback(fresh);

      // Nếu vừa gặp 1 lần timeout (nghi ngờ mạng yếu hoặc vừa rớt mạng), xác minh lại 1 lần sau 2.5s
      if (!isNativeApp() && fresh.isWeak && this.consecutiveProbeFailures === 1) {
        if (retryVerifyTimeout) clearTimeout(retryVerifyTimeout);
        retryVerifyTimeout = setTimeout(() => {
          void handleUpdate(true);
        }, 2500);
      }

      scheduleNextPoll(fresh);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void handleUpdate(true);
      }
    };

    const handleOnlineEvent = () => {
      this.consecutiveProbeFailures = 0;
      void handleUpdate(true);
    };

    const handleOfflineEvent = () => {
      void handleUpdate(false);
    };

    Network.addListener('networkStatusChange', () => {
      void handleUpdate(true);
    }).then(handle => {
      removeCapacitorListener = () => handle.remove();
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineEvent);
      window.addEventListener('offline', handleOfflineEvent);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      if (!isNativeApp()) {
        scheduleNextPoll(this.lastStatus);
      }
    }

    return () => {
      disposed = true;
      if (removeCapacitorListener) removeCapacitorListener();
      if (pollTimeout) clearTimeout(pollTimeout);
      if (retryVerifyTimeout) clearTimeout(retryVerifyTimeout);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnlineEvent);
        window.removeEventListener('offline', handleOfflineEvent);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kizuna_network_config_changed'));
    }
  }

  public getSimulatedType(): ConnectionType | null {
    return this.simulatedType;
  }
}

export const networkService = new NetworkService();
