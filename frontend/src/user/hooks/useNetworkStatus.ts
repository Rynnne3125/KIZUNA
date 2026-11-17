import { useState, useEffect, useCallback } from 'react';
import { ConnectionType } from '@capacitor/network';
import { networkService, ExtendedNetworkStatus } from '../services/networkService';

export interface UseNetworkStatusReturn {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  wifiOnlyRequired: boolean;
  isCellularBypassed: boolean;
  isBlockedByNoInternet: boolean;
  isBlockedByWifiRequirement: boolean;
  recheck: () => Promise<ExtendedNetworkStatus>;
  setWifiOnlyRequired: (required: boolean) => void;
  bypassCellular: () => void;
  resetBypass: () => void;
  simulatedType: ConnectionType | null;
  setSimulatedType: (type: ConnectionType | null) => void;
}

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [status, setStatus] = useState<ExtendedNetworkStatus>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      connected: isOnline,
      connectionType: isOnline ? 'wifi' : 'none',
      isWifi: isOnline,
      isCellular: false,
      isOffline: !isOnline
    };
  });

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [wifiOnlyRequired, setWifiOnlyRequiredState] = useState<boolean>(() => networkService.isWifiOnlyRequired());
  const [isCellularBypassed, setIsCellularBypassedState] = useState<boolean>(() => networkService.isCellularBypassed());
  const [simulatedType, setSimulatedTypeState] = useState<ConnectionType | null>(() => networkService.getSimulatedType());

  const fetchStatus = useCallback(async (force = false) => {
    setIsChecking(true);
    try {
      if (force) {
        await networkService.probeInternet(true);
      }
      const fresh = await networkService.getStatus();
      setStatus(fresh);
      return fresh;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // 1. Kiểm tra trạng thái mạng ngay khi nạp hook
    fetchStatus();

    // 2. Lắng nghe trực tiếp sự kiện online/offline của trình duyệt để phản hồi tức thì
    const handleBrowserOffline = () => {
      setStatus(prev => ({
        ...prev,
        connected: false,
        connectionType: 'none',
        isWifi: false,
        isCellular: false,
        isOffline: true
      }));
    };
    const handleBrowserOnline = () => {
      fetchStatus(true);
    };
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    // 3. Đăng ký lắng nghe thay đổi mạng từ hệ thống (Capacitor Network + Probe)
    const unsubscribe = networkService.addStatusListener((updatedStatus) => {
      setStatus(updatedStatus);
      setIsChecking(false);
    });

    // 4. Lắng nghe thay đổi cấu hình nội bộ
    const handleConfigChange = () => {
      setWifiOnlyRequiredState(networkService.isWifiOnlyRequired());
      setIsCellularBypassedState(networkService.isCellularBypassed());
      setSimulatedTypeState(networkService.getSimulatedType());
      fetchStatus(true);
    };

    window.addEventListener('kizuna_network_config_changed', handleConfigChange);

    return () => {
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      unsubscribe();
      window.removeEventListener('kizuna_network_config_changed', handleConfigChange);
    };
  }, [fetchStatus]);

  // Kiểm tra xem ứng dụng có đang bị chặn do không có kết nối Internet hay không:
  // - Nếu mất mạng (Offline / none / !connected / !navigator.onLine): Hiển thị trang 404 No Internet
  // - Nếu có kết nối Wi-Fi HOẶC Dữ liệu di động (Cellular 4G/5G): Cho phép truy cập bình thường!
  const isBlockedByNoInternet = status.isOffline || !status.connected || (typeof navigator !== 'undefined' && !navigator.onLine);
  const isBlockedByWifiRequirement = isBlockedByNoInternet;

  const setWifiOnlyRequired = (required: boolean) => {
    networkService.setWifiOnlyRequired(required);
    setWifiOnlyRequiredState(required);
  };

  const bypassCellular = () => {
    networkService.setCellularBypassed(true);
    setIsCellularBypassedState(true);
  };

  const resetBypass = () => {
    networkService.setCellularBypassed(false);
    setIsCellularBypassedState(false);
  };

  const setSimulatedType = (type: ConnectionType | null) => {
    networkService.setSimulatedType(type);
    setSimulatedTypeState(type);
    fetchStatus(true);
  };

  const recheck = useCallback(async () => {
    return await fetchStatus(true);
  }, [fetchStatus]);

  return {
    status,
    isChecking,
    wifiOnlyRequired,
    isCellularBypassed,
    isBlockedByNoInternet,
    isBlockedByWifiRequirement,
    recheck,
    setWifiOnlyRequired,
    bypassCellular,
    resetBypass,
    simulatedType,
    setSimulatedType
  };
};
