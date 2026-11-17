import { useState, useEffect, useCallback } from 'react';
import { ConnectionType } from '@capacitor/network';
import { networkService, ExtendedNetworkStatus } from '../services/networkService';

export interface UseNetworkStatusReturn {
  status: ExtendedNetworkStatus;
  isChecking: boolean;
  wifiOnlyRequired: boolean;
  isCellularBypassed: boolean;
  isBlockedByWifiRequirement: boolean;
  recheck: () => Promise<ExtendedNetworkStatus>;
  setWifiOnlyRequired: (required: boolean) => void;
  bypassCellular: () => void;
  resetBypass: () => void;
  simulatedType: ConnectionType | null;
  setSimulatedType: (type: ConnectionType | null) => void;
}

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [status, setStatus] = useState<ExtendedNetworkStatus>({
    connected: true,
    connectionType: 'wifi',
    isWifi: true,
    isCellular: false,
    isOffline: false
  });

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [wifiOnlyRequired, setWifiOnlyRequiredState] = useState<boolean>(() => networkService.isWifiOnlyRequired());
  const [isCellularBypassed, setIsCellularBypassedState] = useState<boolean>(() => networkService.isCellularBypassed());
  const [simulatedType, setSimulatedTypeState] = useState<ConnectionType | null>(() => networkService.getSimulatedType());

  const fetchStatus = useCallback(async () => {
    setIsChecking(true);
    try {
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

    // 2. Đăng ký lắng nghe thay đổi mạng từ hệ thống
    const unsubscribe = networkService.addStatusListener((updatedStatus) => {
      setStatus(updatedStatus);
      setIsChecking(false);
    });

    // 3. Lắng nghe thay đổi cấu hình nội bộ
    const handleConfigChange = () => {
      setWifiOnlyRequiredState(networkService.isWifiOnlyRequired());
      setIsCellularBypassedState(networkService.isCellularBypassed());
      setSimulatedTypeState(networkService.getSimulatedType());
      fetchStatus();
    };

    window.addEventListener('kizuna_network_config_changed', handleConfigChange);

    return () => {
      unsubscribe();
      window.removeEventListener('kizuna_network_config_changed', handleConfigChange);
    };
  }, [fetchStatus]);

  // Kiểm tra xem ứng dụng có đang bị chặn bởi yêu cầu Wi-Fi hay không:
  // - Nếu mất mạng (Offline / none): Luôn bị chặn
  // - Nếu đang dùng mạng di động (Cellular 4G/5G) và chế độ yêu cầu Wi-Fi đang bật và chưa được người dùng bấm tiếp tục: Bị chặn
  const isBlockedByWifiRequirement =
    status.isOffline ||
    (status.isCellular && wifiOnlyRequired && !isCellularBypassed);

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
    fetchStatus();
  };

  return {
    status,
    isChecking,
    wifiOnlyRequired,
    isCellularBypassed,
    isBlockedByWifiRequirement,
    recheck: fetchStatus,
    setWifiOnlyRequired,
    bypassCellular,
    resetBypass,
    simulatedType,
    setSimulatedType
  };
};
